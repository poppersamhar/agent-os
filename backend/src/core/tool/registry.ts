/**
 * 工具注册表（抄袭 KodaX 扁平工具表面）
 *
 * 设计：所有工具扁平暴露给 LLM，分为 5 大类：
 * - file: 文件读写编辑
 * - shell: 命令执行
 * - repo: 仓库智能（代码搜索、影响分析）
 * - agent: Agent 控制（子 Agent 派发、用户提问）
 * - skill: Skill 调用
 * - mcp: MCP 服务调用
 */
import {
  type Tool,
  type ToolContext,
  type ToolResult,
  type ToolDefinition,
  type ToolCategory,
} from '../../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  listByCategory(category: ToolCategory): Tool[] {
    return this.list().filter((t) => t.category === category);
  }

  /** 获取所有工具的 LLM Schema */
  getToolDefinitions(): ToolDefinition[] {
    return this.list().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    }));
  }

  /** 执行工具 */
  async execute(name: string, input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, output: '', error: `Tool not found: ${name}` };
    }

    try {
      return await tool.execute(input, context);
    } catch (err) {
      return {
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/** 安全限制：禁止的危险命令 */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  />\s*\/dev\/null/,
  /:\(\)\{\s*:\|:\&\s*\};/, // fork bomb
];

function isDangerousCommand(cmd: string): boolean {
  return DANGEROUS_PATTERNS.some((p) => p.test(cmd));
}

/** 内置工具定义 */
export function createBuiltinTools(): Tool[] {
  return [
    /* ─── File Ops ─── */
    {
      name: 'file_read',
      description: '读取文件内容。支持 offset/limit 分段读取大文件。',
      category: 'file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径（相对或绝对）' },
          offset: { type: 'number', description: '起始行号（从0开始）' },
          limit: { type: 'number', description: '读取最大行数' },
        },
        required: ['path'],
      },
      execute: async (input, _ctx) => {
        const filePath = String(input.path);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n');
          const offset = typeof input.offset === 'number' ? input.offset : 0;
          const limit = typeof input.limit === 'number' ? input.limit : lines.length;
          const sliced = lines.slice(offset, offset + limit);
          const result = sliced.join('\n');
          const truncated = lines.length > offset + limit;
          return {
            success: true,
            output: result + (truncated ? `\n\n[...truncated, ${lines.length} lines total]` : ''),
          };
        } catch (err) {
          return { success: false, output: '', error: `读取失败: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
    {
      name: 'file_write',
      description: '写入或覆盖文件。目录不存在时会自动创建。',
      category: 'file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          content: { type: 'string', description: '文件内容' },
        },
        required: ['path', 'content'],
      },
      execute: async (input, _ctx) => {
        const filePath = String(input.path);
        try {
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, String(input.content), 'utf-8');
          return { success: true, output: `已写入文件: ${filePath}` };
        } catch (err) {
          return { success: false, output: '', error: `写入失败: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
    {
      name: 'file_edit',
      description: '编辑文件内容（查找替换）。old_string 必须在文件中唯一存在。',
      category: 'file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          old_string: { type: 'string', description: '要替换的内容（必须唯一）' },
          new_string: { type: 'string', description: '新内容' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
      execute: async (input, _ctx) => {
        const filePath = String(input.path);
        const oldStr = String(input.old_string);
        const newStr = String(input.new_string);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const occurrences = content.split(oldStr).length - 1;
          if (occurrences === 0) {
            return { success: false, output: '', error: `未找到匹配内容: "${oldStr.slice(0, 80)}"` };
          }
          if (occurrences > 1) {
            return { success: false, output: '', error: `匹配内容不唯一，出现 ${occurrences} 次。请使用更长的唯一片段。` };
          }
          const updated = content.replace(oldStr, newStr);
          await fs.writeFile(filePath, updated, 'utf-8');
          return { success: true, output: `已编辑文件: ${filePath}` };
        } catch (err) {
          return { success: false, output: '', error: `编辑失败: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
    {
      name: 'multi_edit',
      description: '对同一文件执行多处编辑',
      category: 'file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          edits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                old_string: { type: 'string' },
                new_string: { type: 'string' },
              },
            },
          },
        },
        required: ['path', 'edits'],
      },
      execute: async (input, _ctx) => {
        const filePath = String(input.path);
        const edits = Array.isArray(input.edits) ? input.edits : [];
        try {
          let content = await fs.readFile(filePath, 'utf-8');
          for (const edit of edits) {
            const oldStr = String(edit.old_string || '');
            const newStr = String(edit.new_string || '');
            if (!oldStr) continue;
            const occurrences = content.split(oldStr).length - 1;
            if (occurrences !== 1) {
              return { success: false, output: '', error: `编辑失败: "${oldStr.slice(0, 60)}" 出现 ${occurrences} 次（需要唯一）` };
            }
            content = content.replace(oldStr, newStr);
          }
          await fs.writeFile(filePath, content, 'utf-8');
          return { success: true, output: `已完成 ${edits.length} 处编辑: ${filePath}` };
        } catch (err) {
          return { success: false, output: '', error: `多处编辑失败: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    },
    {
      name: 'undo',
      description: '撤销最近一次文件修改（当前版本不支持，返回提示）',
      category: 'file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径（可选）' },
        },
      },
      execute: async (_input, _ctx) => {
        return { success: true, output: '撤销功能尚未实现，建议手动恢复或使用版本控制。' };
      },
    },

    /* ─── Shell ─── */
    {
      name: 'bash',
      description: '执行 Shell 命令。支持文件操作、git、构建等。禁止执行 rm -rf / 等危险命令。',
      category: 'shell',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: '要执行的命令' },
          timeout: { type: 'number', description: '超时时间（秒，默认30）' },
        },
        required: ['command'],
      },
      execute: async (input, _ctx) => {
        const command = String(input.command);
        if (isDangerousCommand(command)) {
          return { success: false, output: '', error: '命令被安全策略拦截：包含危险操作' };
        }
        const timeout = (typeof input.timeout === 'number' ? input.timeout : 30) * 1000;
        try {
          const { stdout, stderr } = await execAsync(command, { timeout, maxBuffer: 1024 * 1024 });
          const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');
          // 截断过长输出
          const maxLen = 8000;
          const finalOutput = output.length > maxLen ? output.slice(0, maxLen) + '\n\n[输出已截断]' : output;
          return { success: true, output: finalOutput || '(无输出)' };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, output: '', error: `命令执行失败: ${message}` };
        }
      },
    },
    {
      name: 'glob',
      description: '查找匹配通配符的文件',
      category: 'shell',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: '通配符模式，如 "*.ts" 或 "src/**/*.tsx"' },
          path: { type: 'string', description: '搜索路径（默认当前目录）' },
        },
        required: ['pattern'],
      },
      execute: async (input, _ctx) => {
        const searchPath = String(input.path || '.');
        const pattern = String(input.pattern);
        try {
          const { stdout } = await execAsync(`find "${searchPath}" -type f -name "${pattern}" 2>/dev/null | head -50`);
          const files = stdout.trim().split('\n').filter(Boolean);
          return { success: true, output: files.join('\n') || '未找到匹配文件' };
        } catch {
          return { success: true, output: '未找到匹配文件' };
        }
      },
    },
    {
      name: 'grep',
      description: '在文件中搜索文本内容',
      category: 'shell',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: '搜索文本或正则' },
          path: { type: 'string', description: '搜索路径（默认当前目录）' },
          include: { type: 'string', description: '文件类型过滤，如 "*.ts"' },
        },
        required: ['pattern'],
      },
      execute: async (input, _ctx) => {
        const searchPath = String(input.path || '.');
        const pattern = String(input.pattern);
        const include = input.include ? `--include="${input.include}"` : '';
        try {
          const { stdout } = await execAsync(`grep -rn ${include} "${pattern}" "${searchPath}" 2>/dev/null | head -100`);
          return { success: true, output: stdout.trim() || '未找到匹配内容' };
        } catch {
          return { success: true, output: '未找到匹配内容' };
        }
      },
    },

    /* ─── Repo Intelligence ─── */
    {
      name: 'repo_overview',
      description: '获取仓库结构概览',
      category: 'repo',
      parameters: {
        type: 'object',
        properties: {
          depth: { type: 'number', description: '扫描深度' },
        },
      },
      execute: async (_input, _ctx) => {
        try {
          const { stdout } = await execAsync('git ls-files 2>/dev/null | head -50 || ls -la');
          return { success: true, output: `仓库文件列表:\n${stdout}` };
        } catch {
          return { success: true, output: '无法获取仓库概览' };
        }
      },
    },
    {
      name: 'module_context',
      description: '获取指定模块的上下文信息',
      category: 'repo',
      parameters: {
        type: 'object',
        properties: {
          module: { type: 'string', description: '模块路径或名称' },
        },
        required: ['module'],
      },
      execute: async (input, _ctx) => {
        const mod = String(input.module);
        try {
          const { stdout } = await execAsync(`find . -type f -name "*${mod}*" 2>/dev/null | head -20`);
          return { success: true, output: `模块 "${mod}" 相关文件:\n${stdout}` };
        } catch {
          return { success: true, output: `未找到模块 "${mod}" 的相关文件` };
        }
      },
    },
    {
      name: 'symbol_context',
      description: '获取指定符号（函数/类）的上下文',
      category: 'repo',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: '符号名称' },
        },
        required: ['symbol'],
      },
      execute: async (input, _ctx) => {
        const sym = String(input.symbol);
        try {
          const { stdout } = await execAsync(`grep -rn "${sym}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | head -30`);
          return { success: true, output: `符号 "${sym}" 出现位置:\n${stdout}` };
        } catch {
          return { success: true, output: `未找到符号 "${sym}"` };
        }
      },
    },
    {
      name: 'impact_estimate',
      description: '评估修改的影响范围',
      category: 'repo',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '修改的文件路径' },
        },
        required: ['path'],
      },
      execute: async (input, _ctx) => {
        const filePath = String(input.path);
        try {
          const { stdout } = await execAsync(`grep -rn "${path.basename(filePath)}" --include="*.ts" --include="*.js" . 2>/dev/null | head -20`);
          return { success: true, output: `引用 "${filePath}" 的位置:\n${stdout || '无直接引用'}` };
        } catch {
          return { success: true, output: '无法评估影响范围' };
        }
      },
    },

    /* ─── Skill Query ─── */
    {
      name: 'list_skills',
      description: '查询当前可用的所有 Skill 列表，包括名称、描述和触发词。在分析任务时应该先调用此工具了解有哪些技能可以使用。',
      category: 'agent',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async (_input, _ctx) => {
        return { success: true, output: 'Skill 列表由 Agent 引擎动态提供' };
      },
    },

    /* ─── Agent Control ─── */
    {
      name: 'dispatch_child_task',
      description: '派生子 Agent 执行独立任务，结果返回父 Agent',
      category: 'agent',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: '子 Agent 目标' },
          constraints: { type: 'array', description: '约束条件' },
          required_skills: { type: 'array', description: '需要的 Skill' },
          context_inheritance: {
            type: 'string',
            enum: ['full', 'summary', 'none'],
            description: '上下文继承策略',
          },
        },
        required: ['goal'],
      },
      execute: async (input, _ctx) => {
        return {
          success: true,
          output: `已派发子 Agent: ${input.goal}\n注意：子 Agent 执行在当前版本中是模拟的，实际执行仍在主 Agent 中完成。`,
        };
      },
    },
    {
      name: 'ask_user_question',
      description: '向用户提问以获取额外信息',
      category: 'agent',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: '问题内容' },
          options: { type: 'array', description: '选项（可选）' },
        },
        required: ['question'],
      },
      execute: async (input, _ctx) => {
        return {
          success: false,
          output: '',
          error: `AWAITING_USER_INPUT:${input.question}`,
        };
      },
    },
    {
      name: 'exit_plan_mode',
      description: '退出规划模式，提交最终计划等待审批',
      category: 'agent',
      parameters: {
        type: 'object',
        properties: {
          plan: { type: 'string', description: '计划内容' },
          steps: { type: 'array', description: '执行步骤' },
        },
      },
      execute: async (input, _ctx) => {
        return { success: true, output: `计划已提交: ${input.plan || ''}` };
      },
    },
    {
      name: 'emit_managed_protocol',
      description: '内部多 Agent 协调协议（scout/planner/handoff/verdict）',
      category: 'agent',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['scout', 'planner', 'handoff', 'verdict'] },
          payload: { type: 'object', description: '协议内容' },
        },
        required: ['type', 'payload'],
      },
      execute: async (input, _ctx) => {
        return {
          success: true,
          output: `协议: ${input.type} - ${JSON.stringify(input.payload)}`,
        };
      },
    },

    /* ─── Web ─── */
    {
      name: 'web_search',
      description: '搜索引擎查询，获取实时信息。返回搜索结果摘要。',
      category: 'repo',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          limit: { type: 'number', description: '结果数量（默认5）' },
        },
        required: ['query'],
      },
      execute: async (input, _ctx) => {
        const query = String(input.query);
        try {
          // 简单实现：使用 DuckDuckGo HTML 搜索（无 API key 需求）
          const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          const html = await res.text();
          // 简单提取结果
          const results: string[] = [];
          const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
          const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
          let m;
          const links: { title: string; url: string }[] = [];
          while ((m = linkRegex.exec(html)) !== null) {
            const title = m[2].replace(/<[^>]*>/g, '').trim();
            let linkUrl = m[1];
            if (linkUrl.startsWith('//')) linkUrl = 'https:' + linkUrl;
            links.push({ title, url: linkUrl });
          }
          const snippets: string[] = [];
          while ((m = snippetRegex.exec(html)) !== null) {
            snippets.push(m[1].replace(/<[^>]*>/g, '').trim());
          }
          const limit = typeof input.limit === 'number' ? input.limit : 5;
          for (let i = 0; i < Math.min(limit, links.length); i++) {
            results.push(`${i + 1}. ${links[i].title}\n   ${links[i].url}\n   ${snippets[i] || ''}`);
          }
          return {
            success: true,
            output: results.length ? results.join('\n\n') : `搜索 "${query}" 完成，但未提取到结果。`,
          };
        } catch (err) {
          return {
            success: false,
            output: '',
            error: `搜索失败: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      },
    },
    {
      name: 'web_fetch',
      description: '抓取指定 URL 的网页内容，返回 markdown 或纯文本',
      category: 'repo',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '目标 URL' },
          format: { type: 'string', enum: ['html', 'markdown', 'text'], description: '输出格式（默认text）' },
        },
        required: ['url'],
      },
      execute: async (input, _ctx) => {
        const url = String(input.url);
        const format = String(input.format || 'text');
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          if (!res.ok) {
            return { success: false, output: '', error: `HTTP ${res.status}` };
          }
          let text = await res.text();
          if (format === 'text' || format === 'markdown') {
            // 简单 HTML 到文本转换
            text = text
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
          const maxLen = 12000;
          const output = text.length > maxLen ? text.slice(0, maxLen) + '\n\n[内容已截断]' : text;
          return { success: true, output };
        } catch (err) {
          return {
            success: false,
            output: '',
            error: `抓取失败: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      },
    },
  ];
}
