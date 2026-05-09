/**
 * WorkAgent 核心引擎 — 完整产品形态
 *
 * 状态机驱动：idle → analyzing → questioning → awaiting_approval →
 *            executing → subagent_running → reviewing → completed
 *
 * 在一个 Session 内完成任务的完整链路：
 * 1. 用户发起需求 → WorkAgent 分析
 * 2. 信息不足 → 追问澄清（ask_user_question）→ 等待用户回答
 * 3. 信息充足 → 生成计划（exit_plan_mode）→ 等待用户确认
 * 4. 用户确认 → executePlan 按步执行 SubAgent
 * 5. 每步 SubAgent：running → 执行 → completed → 推送结果
 * 6. 全部完成 → 生成最终报告 → onComplete
 *
 * 核心设计原则：
 * - 所有状态转换由工具调用明确驱动，不依赖文本匹配
 * - 追问/计划/执行是三种明确的"元操作"，通过工具触发
 * - SubAgent 是 WorkAgent 的受限副本，复用相同引擎但隔离上下文
 */
import {
  type LLMProvider,
  type LLMMessage,
  type AgentMessage,
  type WorkAgentState,
  type WorkAgentConfig,
  type PlanStep,
  type SubAgentTask,
  type ExecutionMode,
  type ToolContext,
} from '../../types/index.js';
import { SessionManager } from '../session/manager.js';
import { SkillRegistry } from '../skill/registry.js';
import { ToolRegistry } from '../tool/registry.js';
import { createProvider } from '../llm/provider.js';
import { BUILTIN_SKILLS } from '../skill/registry.js';
import { createBuiltinTools } from '../tool/registry.js';
import { config as envConfig } from '../../config/env.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** 事件回调（KodaX 风格流式协议） */
export interface WorkAgentEvents {
  onTextDelta?: (text: string) => void;
  onThinkingDelta?: (text: string) => void;
  onToolCall?: (toolCall: { name: string; arguments: string }) => void;
  onToolResult?: (result: { name: string; output: string; success: boolean }) => void;
  onStateChange?: (state: WorkAgentState, step?: PlanStep) => void;
  onSubAgent?: (subAgent: SubAgentTask) => void;
  onPermissionRequest?: (request: { type: 'bash' | 'edit' | 'dispatch'; description: string }) => void;
  onMessage?: (message: AgentMessage) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/** 运行时上下文 */
interface RuntimeContext {
  sessionId: string;
  userId: string;
  projectId: string;
  taskId: string;
  workingDirectory: string;
  executionMode: ExecutionMode;
  events: WorkAgentEvents;
}

/** 执行上下文（单次 Session 生命周期） */
interface ExecutionContext {
  provider: LLMProvider;
  sessionManager: SessionManager;
  skillRegistry: SkillRegistry;
  toolRegistry: ToolRegistry;
  runtime: RuntimeContext;
  state: WorkAgentState;
  currentPlan?: PlanStep[];
}

/** 系统 Prompt — KodaX 风格：先分析、再追问、后执行 */
const SYSTEM_PROMPT = `你是 AgentOS 的 WorkAgent，一个智能任务执行 Agent。你的核心能力是先深入分析任务，必要时追问澄清，然后制定计划并一步步执行工具完成交付。

## 核心工作流（必须严格遵循）

### 阶段 1：任务分析
收到用户任务后，你必须：
1. **先调用 list_skills** 查看系统有哪些可用技能和工具
2. 分析任务类型：是信息查询、文件操作、数据分析、代码编写还是其他？
3. 评估信息是否充足：用户是否说清楚了他的真实需求？
4. 如果信息不足（缺少关键参数、目标模糊、范围不清），**必须调用 ask_user_question 追问**

### 阶段 2：追问澄清
调用 ask_user_question 时：
- question: 简洁明了的问题描述
- options: 给出 2-4 个选项让用户选择（不要开放式问题）
- 可以一次追问多个独立问题（用 questions 数组）

### 阶段 3：制定计划
信息充足后，调用 exit_plan_mode：
- plan: 详细的计划描述，包括每一步要做什么、用什么工具
- steps: 步骤名称数组，每一步对应一个具体的执行动作

### 阶段 4：执行计划
用户确认计划后，你会进入执行模式。此时：
- 按照计划逐步执行，每一步调用合适的工具
- 可用的工具包括：file_read, file_write, file_edit, bash, web_search, web_fetch, grep, glob
- **优先使用 read/grep/glob 探索文件，而不是直接写文件**
- **每次只调用一个工具**，等待结果后再决定下一步
- 遇到错误时，分析原因并调整策略，不要重复同样的错误调用

## 工具使用规范

### 文件操作
- file_read: 读取文件内容，支持 offset/limit 分段读取大文件
- file_write: 创建新文件（目录会自动创建）
- file_edit: 编辑现有文件（用 old_string + new_string 精确替换）
- **编辑前必须先读取文件**，了解当前内容
- **优先用 file_edit 修改现有文件，而不是 file_write 覆盖**

### Shell 命令
- bash: 执行命令（git, npm, python 等）
- **谨慎使用破坏性命令**（rm, mv 等）
- 优先用只读命令（ls, grep, cat）做探索

### 搜索
- web_search: 搜索引擎查询，获取实时信息
- web_fetch: 抓取指定 URL 的内容
- grep: 在项目中搜索代码/文本
- glob: 查找匹配通配符的文件

### Agent 控制
- list_skills: 查询可用技能列表
- ask_user_question: 向用户提问
- exit_plan_mode: 提交计划等待确认
- dispatch_child_task: 派发子任务

## 输出风格
- 分析阶段：展示你的思考过程（任务类型判断、信息缺口识别、技能匹配）
- 执行阶段：简明报告每一步的结果
- 完成阶段：总结关键成果和交付物
- **不要编造数据**，所有结论必须基于工具返回的真实结果
- **如果任务涉及实时信息（如股价、新闻），必须调用 web_search 获取**
`;

/** WorkAgent 核心引擎 */
export class WorkAgentEngine {
  private config: WorkAgentConfig;
  private provider: LLMProvider;
  private sessionManager: SessionManager;
  private skillRegistry: SkillRegistry;
  private toolRegistry: ToolRegistry;
  private executions = new Map<string, ExecutionContext>();

  constructor(config: WorkAgentConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
    this.sessionManager = new SessionManager();
    this.skillRegistry = new SkillRegistry();
    this.toolRegistry = new ToolRegistry();

    for (const skill of BUILTIN_SKILLS) {
      this.skillRegistry.register(skill);
    }
    for (const tool of createBuiltinTools()) {
      this.toolRegistry.register(tool);
    }
  }

  private createProvider(config: WorkAgentConfig): LLMProvider {
    const cfg = envConfig;

    const providerType = config.provider || cfg.llm.provider || 'mock';
    const model = config.model || cfg.llm.model;
    const apiKey = cfg.llm.apiKey;
    const baseURL = cfg.llm.baseURL;

    console.log(`[WorkAgentEngine] Creating provider: type=${providerType}, model=${model}, hasApiKey=${!!apiKey}`);

    if ((providerType as string) === 'mock' || !apiKey) {
      console.warn('[WorkAgentEngine] Falling back to mock provider (no API key or explicit mock mode)');
      const { MockProvider } = require('../llm/provider.js');
      return new MockProvider();
    }

    return createProvider(providerType, { apiKey, baseURL, model });
  }

  /** 创建会话 */
  async createSession(params: {
    userId: string;
    projectId: string;
    taskId: string;
    title: string;
  }) {
    return this.sessionManager.create(params);
  }

  /** 发送消息（主入口）
   *
   * 防御性设计：如果当前状态不适合接收新消息（如正在执行中），
   * 只保存用户消息到历史，不触发 agentLoop。
   */
  async sendMessage(
    sessionId: string,
    content: string,
    userId: string,
    events: WorkAgentEvents = {}
  ): Promise<void> {
    const session = await this.sessionManager.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    // 保存用户消息
    const userMsg: AgentMessage = {
      id: `msg_${Date.now()}`,
      branchId: session.activeBranchId,
      role: 'user',
      senderName: userId,
      content,
      timestamp: new Date().toISOString(),
    };
    await this.sessionManager.addMessage(sessionId, userMsg);

    // 获取或创建执行上下文
    let ctx = this.executions.get(sessionId);
    if (!ctx) {
      ctx = {
        provider: this.provider,
        sessionManager: this.sessionManager,
        skillRegistry: this.skillRegistry,
        toolRegistry: this.toolRegistry,
        runtime: {
          sessionId,
          userId,
          projectId: session.projectId,
          taskId: session.taskId,
          workingDirectory: process.cwd(),
          executionMode: this.config.executionMode,
          events,
        },
        state: 'idle',
      };
      this.executions.set(sessionId, ctx);
    }

    console.log(`[sendMessage] state=${ctx.state}, content=${content.slice(0, 50)}`);

    // 如果当前状态不适合处理新消息，静默保存后返回
    if (ctx.state === 'analyzing' || ctx.state === 'executing' || ctx.state === 'subagent_running') {
      console.log('[sendMessage] skipped: state busy');
      return;
    }

    // 如果用户是在 awaiting_approval 状态下发送"确认"类消息，自动视为计划确认
    if (ctx.state === 'awaiting_approval' && /确认|执行|开始|同意/.test(content)) {
      await this.approvePlan(sessionId, true);
      return;
    }

    console.log('[sendMessage] starting agentLoop...');
    await this.agentLoop(ctx);
    console.log('[sendMessage] agentLoop done');
  }

  /** 审批计划 */
  async approvePlan(sessionId: string, approved: boolean): Promise<void> {
    const ctx = this.executions.get(sessionId);
    if (!ctx) throw new Error('No active execution');

    if (approved) {
      await this.transitionState(ctx, 'executing');
      await this.executePlan(ctx);
    } else {
      ctx.currentPlan = undefined;
      await this.transitionState(ctx, 'idle');
      await this.addAssistantMessage(ctx, '计划已取消，请告诉我如何调整。');
    }
  }

  /** 切换执行模式（保留空方法以兼容现有调用） */
  async setExecutionMode(_sessionId: string, _mode: ExecutionMode): Promise<void> {
    // 产品只保留 auto 模式，无需切换
  }

  // ─── 核心 Agent 循环 ───

  private async agentLoop(ctx: ExecutionContext): Promise<void> {
    try {
      const session = await ctx.sessionManager.get(ctx.runtime.sessionId);
      if (!session) { console.log('[agentLoop] no session'); return; }

      const messages = await this.buildMessages(ctx, session);
      console.log(`[agentLoop] built ${messages.length} messages, calling provider...`);

      let fullResponse = '';
      let toolCallBuffer: { id: string; name: string; arguments: string } | null = null;

      await this.transitionState(ctx, 'analyzing');

      const stream = ctx.provider.streamCompletion(messages, {
        model: this.config.model,
        temperature: 0.7,
        maxTokens: 4000,
        tools: ctx.toolRegistry.getToolDefinitions(),
        stream: true,
        sessionId: ctx.runtime.sessionId,
      });
      console.log('[agentLoop] stream started');

      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          fullResponse += chunk.text;
          ctx.runtime.events.onTextDelta?.(chunk.text);
        } else if (chunk.type === 'thinking') {
          ctx.runtime.events.onThinkingDelta?.(chunk.text);
        } else if (chunk.type === 'tool_use') {
          toolCallBuffer = {
            id: chunk.toolCall.id || `call_${Date.now()}`,
            name: chunk.toolCall.function.name,
            arguments: chunk.toolCall.function.arguments,
          };
        }
      }

      // 如果有工具调用，保存 assistant 消息（含 tool_calls）后处理工具
      if (toolCallBuffer) {
        await this.addAssistantMessage(ctx, fullResponse, [
          {
            id: toolCallBuffer.id,
            type: 'function',
            function: {
              name: toolCallBuffer.name,
              arguments: toolCallBuffer.arguments,
            },
          },
        ]);
        await this.handleToolCall(ctx, toolCallBuffer);
        return;
      }

      // 纯文本回复
      if (fullResponse.trim()) {
        await this.addAssistantMessage(ctx, fullResponse);
      }

      // 纯文本回复：检查是否包含完成标记
      if (fullResponse.includes('[完成]') || fullResponse.includes('任务已完成')) {
        await this.transitionState(ctx, 'completed');
        ctx.runtime.events.onComplete?.();
        return;
      }

      // 默认回到 idle，等待用户下一条消息
      await this.transitionState(ctx, 'idle');
      console.log('[agentLoop] stream done, fullResponse length:', fullResponse.length, 'toolCall:', toolCallBuffer?.name);

      // 纯文本回复
      if (fullResponse.trim()) {
        await this.addAssistantMessage(ctx, fullResponse);
      }

      // 纯文本回复：检查是否包含完成标记
      if (fullResponse.includes('[完成]') || fullResponse.includes('任务已完成')) {
        await this.transitionState(ctx, 'completed');
        ctx.runtime.events.onComplete?.();
        return;
      }

      // 默认回到 idle，等待用户下一条消息
      await this.transitionState(ctx, 'idle');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[agentLoop] ERROR:', error.message);
      ctx.runtime.events.onError?.(error);
      await this.transitionState(ctx, 'failed');
    }
  }

  // ─── 工具调用处理 ───

  private async handleToolCall(
    ctx: ExecutionContext,
    toolCall: { id: string; name: string; arguments: string }
  ): Promise<void> {
    ctx.runtime.events.onToolCall?.(toolCall);

    let input: Record<string, unknown>;
    try {
      input = JSON.parse(toolCall.arguments);
    } catch {
      input = {};
    }

    // ── 元工具：ask_user_question → 推送追问消息，进入 questioning 状态 ──
    if (toolCall.name === 'ask_user_question') {
      const questionText = (input.question as string) || '请提供更多信息';
      const options = (input.options as string[]) || [];

      // 添加虚拟工具结果，保持消息链完整
      await this.addToolResultMessage(ctx, toolCall.id, toolCall.name, input, {
        success: true,
        output: '已向用户发起追问，等待回复。',
      });

      // 推送追问消息到前端（会被渲染为 QuestionMessage 卡片）
      const questionMsg: AgentMessage = {
        id: `question_${Date.now()}`,
        branchId: (await ctx.sessionManager.get(ctx.runtime.sessionId))!.activeBranchId,
        role: 'assistant',
        senderName: 'WorkAgent',
        content: questionText,
        timestamp: new Date().toISOString(),
        metadata: {
          messageType: 'question',
          planSteps: options.map((opt, i) => ({
            step: i + 1,
            name: opt,
            tool: '',
            status: 'pending' as const,
            category: 'skill' as import('../../types/index.js').PlanStep['category'],
          })),
        },
      };
      await ctx.sessionManager.addMessage(ctx.runtime.sessionId, questionMsg);
      ctx.runtime.events.onMessage?.(questionMsg);

      await this.transitionState(ctx, 'questioning');
      return;
    }

    // ── 元工具：exit_plan_mode → 解析计划，进入 awaiting_approval ──
    if (toolCall.name === 'exit_plan_mode') {
      await this.savePlanFromToolCall(ctx, input);
      // 添加虚拟工具结果，保持消息链完整
      await this.addToolResultMessage(ctx, toolCall.id, toolCall.name, input, {
        success: true,
        output: '计划已生成并等待用户确认。',
      });
      await this.transitionState(ctx, 'awaiting_approval');
      return;
    }

    // ── 元工具：list_skills → 查询可用技能列表 ──
    if (toolCall.name === 'list_skills') {
      const skills = ctx.skillRegistry.list();
      const skillList = skills.map(s =>
        `- ${s.name}: ${s.description} (触发词: ${s.triggerWords.join(', ')})`
      ).join('\n');
      await this.addToolResultMessage(ctx, toolCall.id, toolCall.name, input, {
        success: true,
        output: `可用技能列表:\n${skillList}`,
      });
      // 继续 Agent 循环，让 LLM 基于技能列表做决策
      await this.agentLoop(ctx);
      return;
    }

    // ── 普通工具：执行 ──
    const toolCtx: ToolContext = {
      sessionId: ctx.runtime.sessionId,
      userId: ctx.runtime.userId,
      projectId: ctx.runtime.projectId,
      workingDirectory: ctx.runtime.workingDirectory,
      executionMode: ctx.runtime.executionMode,
    };

    const result = await ctx.toolRegistry.execute(toolCall.name, input, toolCtx);

    // 检查用户输入等待（非 ask_user_question 的普通工具也可能返回）
    if (result.error?.startsWith('AWAITING_USER_INPUT')) {
      await this.transitionState(ctx, 'questioning');
      return;
    }

    // 推送工具结果
    ctx.runtime.events.onToolResult?.({
      name: toolCall.name,
      output: result.output || result.error || '',
      success: result.success,
    });

    // 保存工具结果到消息历史（携带 tool_call_id）
    await this.addToolResultMessage(ctx, toolCall.id, toolCall.name, input, result);

    // 继续 Agent 循环
    await this.agentLoop(ctx);
  }

  // ─── 计划解析与保存 ───

  private async savePlanFromToolCall(
    ctx: ExecutionContext,
    input: Record<string, unknown>
  ): Promise<void> {
    const stepNames = (input.steps as string[]) || [];
    const planText = (input.plan as string) || '';

    ctx.currentPlan = stepNames.map((name, i) => ({
      step: i + 1,
      name,
      tool: 'dispatch_child_task',
      status: 'pending' as const,
      category: 'skill' as PlanStep['category'],
    }));

    // 推送计划消息到前端（前端会渲染为 PlanConfirmCard）
    const planMsg: AgentMessage = {
      id: `plan_${Date.now()}`,
      branchId: (await ctx.sessionManager.get(ctx.runtime.sessionId))!.activeBranchId,
      role: 'assistant',
      senderName: 'WorkAgent',
      content: planText || `已生成 ${stepNames.length} 步执行计划，请确认后开始执行。`,
      timestamp: new Date().toISOString(),
      metadata: {
        messageType: 'plan',
        planSteps: ctx.currentPlan,
      },
    };
    await ctx.sessionManager.addMessage(ctx.runtime.sessionId, planMsg);
    ctx.runtime.events.onMessage?.(planMsg);
  }

  // ─── 计划执行 ───

  private async executePlan(ctx: ExecutionContext): Promise<void> {
    const session = await ctx.sessionManager.get(ctx.runtime.sessionId);
    if (!session) return;

    const plan = ctx.currentPlan;
    if (!plan || plan.length === 0) {
      await this.addAssistantMessage(ctx, '没有可执行的计划。');
      await this.transitionState(ctx, 'idle');
      return;
    }

    // 推送执行开始消息
    const startMsg: AgentMessage = {
      id: `exec_${Date.now()}`,
      branchId: session.activeBranchId,
      role: 'system',
      senderName: 'System',
      content: `开始执行计划 · 共 ${plan.length} 步`,
      timestamp: new Date().toISOString(),
    };
    await ctx.sessionManager.addMessage(ctx.runtime.sessionId, startMsg);
    ctx.runtime.events.onMessage?.(startMsg);

    // 真正执行：让 LLM 自主调用工具完成每一步
    // 通过注入执行指令到消息历史，引导 LLM 进入执行模式
    const execInstruction: AgentMessage = {
      id: `execinstr_${Date.now()}`,
      branchId: session.activeBranchId,
      role: 'user',
      senderName: 'System',
      content: `计划已确认，请开始执行。当前计划：\n${plan.map((s) => `${s.step}. ${s.name} (${s.tool})`).join('\n')}\n\n请按步骤执行，每完成一步调用合适的工具，所有步骤完成后总结成果。`,
      timestamp: new Date().toISOString(),
    };
    await ctx.sessionManager.addMessage(ctx.runtime.sessionId, execInstruction);

    // 进入执行循环（最多 20 轮工具调用防止无限循环）
    await this.transitionState(ctx, 'executing');
    let iterations = 0;
    const MAX_ITERATIONS = 20;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const done = await this.executionLoop(ctx);
      if (done) break;
    }

    if (iterations >= MAX_ITERATIONS) {
      await this.addAssistantMessage(ctx, '执行轮次达到上限，任务可能尚未完全完成。');
    }

    await this.transitionState(ctx, 'completed');
    ctx.runtime.events.onComplete?.();
  }

  /** 执行循环单轮 — 调用 LLM，处理 tool call，返回是否完成 */
  private async executionLoop(ctx: ExecutionContext): Promise<boolean> {
    const session = await ctx.sessionManager.get(ctx.runtime.sessionId);
    if (!session) return true;

    const messages = await this.buildMessages(ctx, session);

    let fullResponse = '';
    let toolCallBuffer: { id: string; name: string; arguments: string } | null = null;

    const stream = ctx.provider.streamCompletion(messages, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 4000,
      tools: ctx.toolRegistry.getToolDefinitions(),
      stream: true,
      sessionId: ctx.runtime.sessionId,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        fullResponse += chunk.text;
        ctx.runtime.events.onTextDelta?.(chunk.text);
      } else if (chunk.type === 'thinking') {
        ctx.runtime.events.onThinkingDelta?.(chunk.text);
      } else if (chunk.type === 'tool_use') {
        toolCallBuffer = {
          id: chunk.toolCall.id || `call_${Date.now()}`,
          name: chunk.toolCall.function.name,
          arguments: chunk.toolCall.function.arguments,
        };
      }
    }

    if (toolCallBuffer) {
      await this.addAssistantMessage(ctx, fullResponse, [
        {
          id: toolCallBuffer.id,
          type: 'function',
          function: {
            name: toolCallBuffer.name,
            arguments: toolCallBuffer.arguments,
          },
        },
      ]);
      await this.handleToolCall(ctx, toolCallBuffer);
      return false; // 工具调用后需要继续循环
    }

    // 纯文本回复，保存并检查是否完成
    if (fullResponse.trim()) {
      await this.addAssistantMessage(ctx, fullResponse);
    }

    // 如果回复包含完成标记，结束执行
    if (fullResponse.includes('[完成]') || fullResponse.includes('任务已完成') || fullResponse.includes('全部完成')) {
      return true;
    }

    // 如果回复比较短且没有工具调用，可能是总结，视为完成
    if (fullResponse.trim().length > 20 && !fullResponse.includes('下一步')) {
      return true;
    }

    return true; // 默认结束，避免死循环
  }

  // ─── 辅助方法 ───

  private async buildMessages(
    ctx: ExecutionContext,
    session: import('../../types/index.js').Session
  ): Promise<LLMMessage[]> {
    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    const branchMessages = ctx.sessionManager.getBranchMessages(session);
    const recent = branchMessages.slice(-20);

    for (const msg of recent) {
      const role = msg.role === 'subagent' ? 'assistant' : msg.role;
      const llmMsg: LLMMessage = { role, content: msg.content };

      // Assistant message with tool call
      if (role === 'assistant' && msg.metadata?.toolCall) {
        llmMsg.tool_calls = [
          {
            id: msg.metadata.toolCallId || `call_${msg.id}`,
            type: 'function',
            function: {
              name: msg.metadata.toolCall.name,
              arguments: JSON.stringify(msg.metadata.toolCall.input || {}),
            },
          },
        ];
      }

      // Tool result message
      if (role === 'tool' && msg.metadata?.toolCallId) {
        llmMsg.tool_call_id = msg.metadata.toolCallId;
        llmMsg.name = msg.metadata.toolCall?.name;
      }

      messages.push(llmMsg);
    }

    return messages;
  }

  private async addAssistantMessage(
    ctx: ExecutionContext,
    content: string,
    toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  ): Promise<void> {
    const session = await ctx.sessionManager.get(ctx.runtime.sessionId);
    if (!session) return;

    const msg: AgentMessage = {
      id: `assistant_${Date.now()}`,
      branchId: session.activeBranchId,
      role: 'assistant',
      senderName: 'WorkAgent',
      content,
      timestamp: new Date().toISOString(),
      metadata: toolCalls
        ? {
            toolCall: {
              name: toolCalls[0].function.name,
              input: (() => {
                const args = (toolCalls[0].function.arguments || '{}').trim();
                try {
                  return JSON.parse(args);
                } catch {
                  return {};
                }
              })(),
            },
            toolCallId: toolCalls[0].id,
          }
        : undefined,
    };
    await ctx.sessionManager.addMessage(ctx.runtime.sessionId, msg);
    // 空内容的工具调用载体消息不推送到前端（避免渲染空白消息）
    if (content.trim()) {
      ctx.runtime.events.onMessage?.(msg);
    }
  }

  private async addToolResultMessage(
    ctx: ExecutionContext,
    toolCallId: string,
    toolName: string,
    input: Record<string, unknown>,
    result: { success: boolean; output: string; error?: string }
  ): Promise<void> {
    const session = await ctx.sessionManager.get(ctx.runtime.sessionId);
    if (!session) return;

    const msg: AgentMessage = {
      id: `tool_${Date.now()}`,
      branchId: session.activeBranchId,
      role: 'tool',
      senderName: toolName,
      content: result.output || result.error || '',
      timestamp: new Date().toISOString(),
      metadata: {
        toolCall: { name: toolName, input },
        toolResult: { name: toolName, output: result.output || result.error || '' },
        toolCallId,
      },
    };
    await ctx.sessionManager.addMessage(ctx.runtime.sessionId, msg);
  }

  private async transitionState(
    ctx: ExecutionContext,
    newState: WorkAgentState,
    step?: PlanStep
  ): Promise<void> {
    ctx.state = newState;
    ctx.runtime.events.onStateChange?.(newState, step);
  }

  getState(sessionId: string): WorkAgentState {
    return this.executions.get(sessionId)?.state || 'idle';
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getSkillRegistry(): SkillRegistry {
    return this.skillRegistry;
  }

}
