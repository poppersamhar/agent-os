/**
 * Skill 注册表（抄袭 KodaX SkillRegistry）
 *
 * 设计：
 * - Skill 存储为 Markdown 文件
 * - 自然语言触发（关键词匹配）
 * - 零外部依赖，纯函数式执行
 * - 依赖注入：Skill 声明依赖哪些工具
 */
import {
  type Skill,
  type SkillContext,
  type SkillExecutionResult,
} from '../../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/** Skill Markdown 文件解析器 */
interface SkillManifest {
  id: string;
  name: string;
  description: string;
  triggerWords: string[];
  category: string;
  inputParams: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    defaultValue?: unknown;
  }>;
  outputs: Array<{ name: string; type: string; description: string }>;
  dependencies: string[];
  graphWrite: boolean;
  version: string;
  author: string;
}

export class SkillRegistry {
  private skills = new Map<string, Skill>();
  private skillPath: string;

  constructor(skillPath = '~/.agentos/skills') {
    this.skillPath = skillPath.replace(/^~/, process.env.HOME || '');
  }

  /** 从目录发现和注册所有 Skill */
  async discover(): Promise<Skill[]> {
    const skills: Skill[] = [];
    try {
      const files = await fs.readdir(this.skillPath);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        try {
          const skill = await this.parseSkillFile(path.join(this.skillPath, file));
          skills.push(skill);
          this.skills.set(skill.id, skill);
        } catch {
          // skip invalid
        }
      }
    } catch {
      // directory doesn't exist
    }
    return skills;
  }

  /** 注册单个 Skill */
  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }

  /** 通过 ID 获取 */
  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /** 列出所有 Skill */
  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  /** 自然语言匹配：找到最匹配的 Skill */
  match(input: string): Skill | null {
    const lower = input.toLowerCase();
    let best: Skill | null = null;
    let bestScore = 0;

    for (const skill of this.skills.values()) {
      if (skill.status !== 'active') continue;
      let score = 0;
      for (const word of skill.triggerWords) {
        if (lower.includes(word.toLowerCase())) {
          score += word.length; //  longer match = higher score
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = skill;
      }
    }
    return best;
  }

  /** 执行 Skill */
  async execute(ctx: SkillContext): Promise<SkillExecutionResult> {
    const skill = this.skills.get(ctx.skillId);
    if (!skill) {
      return {
        success: false,
        output: '',
        error: `Skill not found: ${ctx.skillId}`,
        duration: 0,
        tokenUsage: 0,
      };
    }

    const start = Date.now();
    skill.stats.calls++;

    try {
      // TODO: 实际 Skill 执行逻辑
      // 这里应该根据 Skill 定义调用对应的工具链
      const result = await this.runSkillLogic(skill, ctx);

      const duration = Date.now() - start;
      skill.stats.avgDuration =
        (skill.stats.avgDuration * (skill.stats.calls - 1) + duration) /
        skill.stats.calls;
      skill.stats.successRate =
        (skill.stats.successRate * (skill.stats.calls - 1) + 1) /
        skill.stats.calls;

      return { ...result, duration, tokenUsage: 0 };
    } catch (err) {
      const duration = Date.now() - start;
      skill.stats.avgDuration =
        (skill.stats.avgDuration * (skill.stats.calls - 1) + duration) /
        skill.stats.calls;
      skill.stats.successRate =
        (skill.stats.successRate * (skill.stats.calls - 1)) /
        skill.stats.calls;

      return {
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        duration,
        tokenUsage: 0,
      };
    }
  }

  /** 解析 Markdown Skill 文件 */
  private async parseSkillFile(filePath: string): Promise<Skill> {
    const content = await fs.readFile(filePath, 'utf-8');

    // 解析 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found');
    }

    const yaml = frontmatterMatch[1];
    const manifest = this.parseYAML(yaml) as unknown as SkillManifest;

    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      sourcePath: filePath,
      triggerWords: manifest.triggerWords || [],
      category: manifest.category || 'general',
      inputParams: (manifest.inputParams || []) as import('../../types/index.js').SkillInputParam[],
      outputs: (manifest.outputs || []) as import('../../types/index.js').SkillOutput[],
      dependencies: manifest.dependencies || [],
      graphWrite: manifest.graphWrite || false,
      version: manifest.version || '0.1.0',
      author: manifest.author || 'unknown',
      status: 'active',
      stats: { calls: 0, successRate: 1, avgDuration: 0 },
    };
  }

  private parseYAML(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');
    let currentKey: string | null = null;
    let currentArray: unknown[] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const arrayMatch = line.match(/^(\w+):\s*\[([^\]]*)\]/);
      if (arrayMatch) {
        result[arrayMatch[1]] = arrayMatch[2]
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''));
        continue;
      }

      const keyMatch = line.match(/^(\w+):\s*(.*)/);
      if (keyMatch) {
        const [, key, value] = keyMatch;
        if (value) {
          result[key] = value.replace(/^["']|["']$/g, '');
        } else {
          currentKey = key;
          currentArray = [];
          result[key] = currentArray;
        }
        continue;
      }

      if (currentArray && line.startsWith('  - ')) {
        currentArray.push(line.slice(4).trim());
      }
    }

    return result;
  }

  /** 运行 Skill 逻辑（占位实现） */
  private async runSkillLogic(
    _skill: Skill,
    _ctx: SkillContext
  ): Promise<Omit<SkillExecutionResult, 'duration' | 'tokenUsage'>> {
    // TODO: 实际执行 Skill 逻辑
    return {
      success: true,
      output: 'Skill executed successfully',
    };
  }
}

/** 内置 Skill 定义 */
export const BUILTIN_SKILLS = [
  {
    id: 'webcrawler',
    name: 'WebCrawler',
    description: '网页数据采集与清洗，支持多源数据抓取和结构化提取',
    sourcePath: 'builtin://webcrawler',
    triggerWords: ['采集', '抓取', '爬虫', '数据获取', '网页'],
    category: 'data',
    inputParams: [
      { name: 'urls', type: 'array' as const, required: true, description: '目标 URL 列表' },
      { name: 'selector', type: 'string' as const, required: false, description: 'CSS 选择器' },
    ],
    outputs: [{ name: 'data', type: 'array', description: '抓取的结构化数据' }],
    dependencies: ['web_fetch', 'web_search'],
    graphWrite: true,
    version: '1.0.0',
    author: 'AgentOS',
    status: 'active',
    stats: { calls: 0, successRate: 1, avgDuration: 0 },
  },
  {
    id: 'pricecompare',
    name: 'PriceCompare',
    description: '多维度价格对比分析，支持价格趋势和性价比评估',
    sourcePath: 'builtin://pricecompare',
    triggerWords: ['价格', '对比', '比价', '成本', '报价'],
    category: 'analysis',
    inputParams: [
      { name: 'products', type: 'array' as const, required: true, description: '产品列表' },
      { name: 'dimensions', type: 'array' as const, required: false, description: '对比维度' },
    ],
    outputs: [{ name: 'report', type: 'object', description: '对比分析报告' }],
    dependencies: ['sql_query', 'chart_generate'],
    graphWrite: true,
    version: '1.0.0',
    author: 'AgentOS',
    status: 'active',
    stats: { calls: 0, successRate: 1, avgDuration: 0 },
  },
  {
    id: 'aieval',
    name: 'AIEval',
    description: 'AI 能力评估与打分，支持多维度智能评测',
    sourcePath: 'builtin://aieval',
    triggerWords: ['评估', '打分', '评分', '评测', '能力'],
    category: 'analysis',
    inputParams: [
      { name: 'target', type: 'string' as const, required: true, description: '评估目标' },
      { name: 'dimensions', type: 'array' as const, required: false, description: '评估维度' },
    ],
    outputs: [{ name: 'scorecard', type: 'object', description: '评分卡' }],
    dependencies: ['data_query', 'chart_generate'],
    graphWrite: true,
    version: '1.0.0',
    author: 'AgentOS',
    status: 'active',
    stats: { calls: 0, successRate: 1, avgDuration: 0 },
  },
  {
    id: 'reportgen',
    name: 'ReportGen',
    description: '自动生成分析报告，支持多种输出格式',
    sourcePath: 'builtin://reportgen',
    triggerWords: ['报告', '分析', '总结', '汇报', '产出'],
    category: 'output',
    inputParams: [
      { name: 'data', type: 'array' as const, required: true, description: '输入数据' },
      { name: 'format', type: 'string' as const, required: false, description: '输出格式' },
    ],
    outputs: [
      { name: 'report', type: 'string', description: '报告内容' },
      { name: 'files', type: 'array', description: '生成文件' },
    ],
    dependencies: ['file_write', 'chart_generate'],
    graphWrite: false,
    version: '1.0.0',
    author: 'AgentOS',
    status: 'active',
    stats: { calls: 0, successRate: 1, avgDuration: 0 },
  },
  {
    id: 'slidecraft',
    name: 'SlideCraft',
    description: 'PPT 幻灯片生成，支持品牌色和模板定制',
    sourcePath: 'builtin://slidecraft',
    triggerWords: ['PPT', '幻灯片', '汇报', '演示', 'deck'],
    category: 'output',
    inputParams: [
      { name: 'content', type: 'string' as const, required: true, description: '内容大纲' },
      { name: 'style', type: 'string' as const, required: false, description: '风格模板' },
    ],
    outputs: [{ name: 'slides', type: 'array', description: '幻灯片数据' }],
    dependencies: ['file_write', 'chart_generate'],
    graphWrite: false,
    version: '1.0.0',
    author: 'AgentOS',
    status: 'active',
    stats: { calls: 0, successRate: 1, avgDuration: 0 },
  },
] satisfies Skill[];
