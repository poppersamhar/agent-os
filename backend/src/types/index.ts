/**
 * AgentOS WorkAgent — 核心类型定义（抄袭 KodaX）
 *
 * 架构分层：llm → agent → skill/tool → api
 */

/* ─── LLM Provider ─── */

export type LLMProviderType = 'openai' | 'anthropic' | 'zhipu' | 'deepseek' | 'ollama' | 'mock';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
  sessionId?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type LLMStreamChunk =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; toolCall: ToolCall }
  | { type: 'thinking'; text: string }
  | { type: 'done' };

export interface LLMProvider {
  readonly name: string;
  streamCompletion(messages: LLMMessage[], options: LLMCompletionOptions): AsyncGenerator<LLMStreamChunk>;
  estimateTokens(text: string): number;
}

/* ─── 执行模式（KodaX 风格）─── */

/** 执行模式 — 产品只保留全自动 */
export type ExecutionMode = 'auto';

export interface ExecutionModeConfig {
  mode: ExecutionMode;
  protectedPaths: string[];
}

export const MODE_CONFIGS: Record<ExecutionMode, ExecutionModeConfig> = {
  auto: {
    mode: 'auto',
    protectedPaths: ['.agentos/', '~/.agentos/'],
  },
};

/* ─── Session（KodaX JSONL + 分支树）─── */

export interface SessionBranch {
  id: string;
  name: string;
  parentBranchId?: string;
  rootMessageIndex: number; // 从此消息开始分叉
  createdAt: string;
  active: boolean;
}

export interface Session {
  id: string;
  userId: string;
  projectId: string;
  taskId: string;
  title: string;
  branches: SessionBranch[];
  activeBranchId: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  contextWindow: {
    usedTokens: number;
    maxTokens: number;
  };
  /** 是否启用自动压缩 */
  autoCompaction: boolean;
  /** 压缩策略 */
  compactionPolicy: CompactionPolicy;
}

export interface CompactionPolicy {
  thresholdRatio: number; // 默认 0.8
  keepRecent: number;     // 默认保留最近 N 条
  summaryModel?: string;
}

export interface AgentMessage {
  id: string;
  branchId: string;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'subagent';
  senderName: string;
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  /** 消息类型标识（供前端准确渲染） */
  messageType?: 'question' | 'plan' | 'completion' | 'subagent';
  /** 子 Agent 名称 */
  subAgentName?: string;
  /** 执行耗时 */
  duration?: number;
  /** Token 消耗 */
  tokenUsage?: number;
  /** 关联文件 */
  files?: string[];
  /** 执行计划步骤 */
  planSteps?: PlanStep[];
  /** 工具调用 */
  toolCall?: { name: string; input: Record<string, unknown> };
  /** 工具调用 ID（用于 OpenAI/DeepSeek 工具调用链） */
  toolCallId?: string;
  /** 工具结果 */
  toolResult?: { name: string; output: string };
  /** 报告信息 */
  report?: {
    title: string;
    summary: string;
    sections: ReportSection[];
  };
  /** 审批请求 */
  permissionRequest?: {
    type: 'bash' | 'edit' | 'dispatch';
    description: string;
    command?: string;
  };
}

export interface PlanStep {
  step: number;
  name: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  category: ToolCategory;
  result?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  charts?: ChartData[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar';
  title: string;
  data: { label: string; value: number; color?: string }[];
}

/* ─── Skill 系统 ─── */

export type ToolCategory = 'file' | 'shell' | 'repo' | 'agent' | 'skill' | 'mcp';

export interface Skill {
  id: string;
  name: string;
  description: string;
  /** Markdown 文件路径 */
  sourcePath: string;
  /** 自然语言触发词 */
  triggerWords: string[];
  /** 所属类别 */
  category: string;
  /** 输入参数定义 */
  inputParams: SkillInputParam[];
  /** 输出定义 */
  outputs: SkillOutput[];
  /** 依赖的工具 */
  dependencies: string[];
  /** 是否写入知识图谱 */
  graphWrite: boolean;
  /** 版本 */
  version: string;
  /** 作者 */
  author: string;
  /** 状态 */
  status: 'active' | 'inactive';
  /** 调用统计 */
  stats: {
    calls: number;
    successRate: number;
    avgDuration: number;
  };
}

export interface SkillInputParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

export interface SkillOutput {
  name: string;
  type: string;
  description: string;
}

export interface SkillContext {
  skillId: string;
  arguments: Record<string, unknown>;
  workingDirectory: string;
  sessionId: string;
  userId: string;
}

export interface SkillExecutionResult {
  success: boolean;
  output: string;
  files?: string[];
  dataItems?: DataItem[];
  error?: string;
  duration: number;
  tokenUsage: number;
}

export interface DataItem {
  id: string;
  type: 'chart' | 'table' | 'file' | 'text';
  title: string;
  content?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'radar';
  data?: Array<{ label: string; value: number }>;
  sourceMessageId?: string;
}

/* ─── Tool 系统 ─── */

export interface Tool {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: object;
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  sessionId: string;
  userId: string;
  projectId: string;
  workingDirectory: string;
  executionMode: ExecutionMode;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

/* ─── 子 Agent（KodaX dispatch_child_task）─── */

export interface SubAgentTask {
  id: string;
  parentSessionId: string;
  name: string;
  goal: string;
  constraints: string[];
  requiredSkills: string[];
  /** 上下文继承策略 */
  contextInheritance: 'full' | 'summary' | 'none';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  startedAt?: string;
  completedAt?: string;
}

/** 多 Agent 协调协议（KodaX emit_managed_protocol） */
export interface AgentProtocolMessage {
  type: 'scout' | 'planner' | 'handoff' | 'verdict';
  fromAgent: string;
  toAgent: string;
  payload: unknown;
  timestamp: string;
}

/* ─── WorkAgent 引擎状态 ─── */

export type WorkAgentState =
  | 'idle'
  | 'analyzing'      // 分析用户需求
  | 'questioning'    // 追问澄清
  | 'planning'       // 生成执行计划
  | 'awaiting_approval' // 等待用户确认方案
  | 'executing'      // 执行中
  | 'subagent_running' // 子 Agent 执行中
  | 'reviewing'      // 审核子 Agent 结果
  | 'completed'
  | 'failed';

export interface WorkAgentConfig {
  provider: LLMProviderType;
  model: string;
  executionMode: ExecutionMode;
  maxSubAgents: number;
  enableStreaming: boolean;
  compactionPolicy: CompactionPolicy;
  /** 是否启用 Scout-First AMA */
  enableAMA: boolean;
}

/* ─── WebSocket 事件 ─── */

export interface WSEvent {
  type: string;
  payload: unknown;
  timestamp: string;
}

export interface WSMessageEvent extends WSEvent {
  type: 'message';
  payload: {
    sessionId: string;
    message: AgentMessage;
  };
}

export interface WSStreamEvent extends WSEvent {
  type: 'stream';
  payload: {
    sessionId: string;
    chunk: string;
    done: boolean;
  };
}

export interface WSToolCallEvent extends WSEvent {
  type: 'tool_call';
  payload: {
    sessionId: string;
    toolCall: ToolCall;
  };
}

export interface WSToolResultEvent extends WSEvent {
  type: 'tool_result';
  payload: {
    sessionId: string;
    toolResult: ToolResult;
  };
}

export interface WSPermissionEvent extends WSEvent {
  type: 'permission_request';
  payload: {
    sessionId: string;
    requestId: string;
    type: 'bash' | 'edit' | 'dispatch';
    description: string;
  };
}

export interface WSStateChangeEvent extends WSEvent {
  type: 'state_change';
  payload: {
    sessionId: string;
    state: WorkAgentState;
    step?: PlanStep;
  };
}

export interface WSSubAgentEvent extends WSEvent {
  type: 'subagent';
  payload: {
    sessionId: string;
    subAgent: SubAgentTask;
  };
}

/* ─── REST API DTO ─── */

export interface CreateSessionDTO {
  userId: string;
  projectId: string;
  taskId: string;
  title: string;
}

export interface SendMessageDTO {
  sessionId: string;
  content: string;
  userId: string;
}

export interface ApprovePlanDTO {
  sessionId: string;
  approved: boolean;
}

export interface ApprovePermissionDTO {
  sessionId: string;
  requestId: string;
  approved: boolean;
  persist?: boolean; // 本次会话内持续允许
}

export interface SwitchBranchDTO {
  sessionId: string;
  branchId: string;
}

export interface CreateBranchDTO {
  sessionId: string;
  name: string;
  fromMessageIndex?: number;
}

export interface UpdateModeDTO {
  sessionId: string;
  mode: ExecutionMode;
}
