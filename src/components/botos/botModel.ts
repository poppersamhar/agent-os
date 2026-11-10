// AgentOS v0.3 · Bot 化工作空间的数据模型。
// Bot 是唯一的基本单元：对话、记忆、已装能力与仪表盘都属于 Bot。
// Skill / MCP 是账号级共享能力；仪表盘由 Bot 的 prompt + 已装能力组装为声明式 Spec。

export type WidgetKind =
  | 'waiting' | 'agents' | 'done' | 'runs' | 'artifacts' | 'members'
  | 'feed' | 'repo' | 'sources' | 'alerts' | 'trend' | 'metrics' | 'checks';

export type WidgetSource = 'core' | `skill:${string}` | `mcp:${string}`;

export interface WidgetSlot { id: string; kind: WidgetKind; title: string; source: WidgetSource; span: 1 | 2 | 3 }
export interface DashboardSpec { headline: { title: string; subtitle: string }; widgets: WidgetSlot[] }

export interface WidgetOffer { kind: WidgetKind; title: string; span: 1 | 2 | 3 }

export interface Skill {
  id: string; name: string; description: string; category: string;
  version: string; owner: string; calls: number; failRate: number;
  widgets: WidgetOffer[]; createdByUser?: boolean;
}

export type McpKind = 'feishu' | 'github' | 'database' | 'web' | 'erp' | 'custom';
export interface Mcp {
  id: string; name: string; kind: McpKind; endpoint: string; tools: string[];
  credential: 'vault' | 'none'; enabled: boolean; owner: string; calls: number;
  widgets: WidgetOffer[]; createdByUser?: boolean;
}

export type MessageAuthor = 'user' | 'bot' | 'source' | 'member';
export interface BotMessage {
  id: string; author: MessageAuthor; name: string; text: string; time: string;
  attachment?: string;
}

export interface MemoryItem { id: string; text: string; scope: 'team' | 'personal'; createdAt: string }

export type BotKind = 'main' | 'bot' | 'group';
export interface Bot {
  id: string; name: string; kind: BotKind; prompt: string; model: string;
  skillIds: string[]; mcpIds: string[]; memberIds: string[];
  memory: MemoryItem[]; messages: BotMessage[];
  /** 最近 56 天的每日运行数：[自动完成, 需要你介入] */
  history: [number, number][];
  createdAt: string;
}

export interface PendingTask { id: string; botId: string; request: string }

export interface BotosState {
  version: 1;
  bots: Bot[];
  /** Bot 栏顺序（不含主 Bot）。发送后当前 Bot 移到第一位。 */
  order: string[];
  currentId: string;
  skills: Skill[];
  mcps: Mcp[];
  pending: PendingTask[];
}

export const MAIN_BOT_ID = 'main';
export const HISTORY_DAYS = 56;

// ───────────────────────── 仪表盘组装 ─────────────────────────

const core = (kind: WidgetKind, title: string, span: 1 | 2 | 3): WidgetSlot => ({ id: `core:${kind}`, kind, title, source: 'core', span });

function firstSentence(prompt: string): string {
  const sentence = prompt.split(/[。！？\n]/).map(s => s.trim()).find(Boolean) ?? '';
  return sentence.length > 38 ? `${sentence.slice(0, 38)}…` : sentence;
}

/** 根据 Bot 的 prompt 与已装 Skill / MCP 组装仪表盘 Spec。纯函数，可测试。 */
export function composeDashboard(bot: Bot, skills: Skill[], mcps: Mcp[]): DashboardSpec {
  if (bot.kind === 'main') {
    return {
      headline: { title: '你好，Samhar', subtitle: '主 Bot · 汇总全部 Bot 的进展、待处理事项与运行记录' },
      widgets: [core('waiting', '待你处理', 1), core('agents', '你的 Bot', 1), core('done', '完成情况', 1), core('runs', '运行记录', 3)],
    };
  }
  const installedSkills = bot.skillIds.map(id => skills.find(s => s.id === id)).filter((s): s is Skill => !!s);
  const installedMcps = bot.mcpIds.map(id => mcps.find(m => m.id === id)).filter((m): m is Mcp => !!m && m.enabled);
  const seen = new Set<WidgetKind>();
  const contributed: WidgetSlot[] = [];
  const offer = (source: WidgetSource, w: WidgetOffer) => {
    if (seen.has(w.kind)) return;
    seen.add(w.kind);
    contributed.push({ id: `${source}:${w.kind}`, kind: w.kind, title: w.title, source, span: w.span });
  };
  // prompt 提到的能力优先：名称出现在 prompt 中的 Skill / MCP 排在前面。
  const mentioned = <T extends { name: string }>(items: T[]) => [...items].sort((a, b) => Number(bot.prompt.includes(b.name)) - Number(bot.prompt.includes(a.name)));
  mentioned(installedSkills).forEach(s => s.widgets.forEach(w => offer(`skill:${s.id}`, w)));
  mentioned(installedMcps).forEach(m => m.widgets.forEach(w => offer(`mcp:${m.id}`, w)));

  const widgets: WidgetSlot[] = [core('waiting', '待你处理', 1)];
  if (bot.kind === 'group') widgets.push(core('members', '群聊成员', 2));
  widgets.push(...contributed);
  widgets.push(core('runs', '运行记录', 2), core('artifacts', '最近成果', 1));

  const capability = `${installedSkills.length} 个 Skill · ${installedMcps.length} 个 MCP`;
  const role = firstSentence(bot.prompt);
  return {
    headline: { title: bot.name, subtitle: [role, capability].filter(Boolean).join(' ｜ ') },
    widgets: fillRows(widgets),
  };
}

/** 让最后一行占满三列：把最后一个组件拉宽到行尾。 */
function fillRows(widgets: WidgetSlot[]): WidgetSlot[] {
  let used = 0;
  const result = widgets.map(w => ({ ...w }));
  result.forEach(w => {
    if (used + w.span > 3) used = 0;
    used = (used + w.span) % 3;
  });
  if (used !== 0 && result.length) {
    const last = result[result.length - 1];
    last.span = Math.min(3, last.span + (3 - used)) as 1 | 2 | 3;
  }
  return result;
}

// ───────────────────────── 工具函数 ─────────────────────────

export const nowTime = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
export const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`);

/** 确定性的伪随机，用于为 Bot 生成稳定的演示数据。 */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

export function seedHistory(seed: string, scale = 1): [number, number][] {
  const rand = seeded(seed);
  return Array.from({ length: HISTORY_DAYS }, (_, day) => {
    const weekend = day % 7 === 5 || day % 7 === 6;
    const auto = Math.round((weekend ? 1 : 3 + rand() * 5) * scale);
    const needed = rand() > 0.86 ? 1 : 0;
    return [auto, needed];
  });
}

export function pendingCount(state: BotosState, botId: string): number {
  return state.pending.filter(task => task.botId === botId).length;
}

// ───────────────────────── Reducer ─────────────────────────

export type BotosAction =
  | { type: 'select'; id: string }
  | { type: 'send'; botId: string; message: BotMessage; task: PendingTask }
  | { type: 'reply'; botId: string; messages: BotMessage[] }
  | { type: 'complete'; taskId: string; messages: BotMessage[]; memory?: MemoryItem; needsYou?: boolean }
  | { type: 'create-bot'; bot: Bot }
  | { type: 'update-bot'; id: string; patch: Partial<Pick<Bot, 'name' | 'prompt' | 'model' | 'skillIds' | 'mcpIds' | 'memberIds'>> }
  | { type: 'delete-bot'; id: string }
  | { type: 'forget'; botId: string; memoryId: string }
  | { type: 'create-skill'; skill: Skill }
  | { type: 'create-mcp'; mcp: Mcp }
  | { type: 'toggle-mcp'; id: string }
  | { type: 'reset'; state: BotosState };

const mapBot = (state: BotosState, id: string, fn: (bot: Bot) => Bot): Bot[] => state.bots.map(bot => bot.id === id ? fn(bot) : bot);
const toFront = (order: string[], id: string) => id === MAIN_BOT_ID ? order : [id, ...order.filter(item => item !== id)];

export function botosReducer(state: BotosState, action: BotosAction): BotosState {
  switch (action.type) {
    case 'select':
      return state.bots.some(bot => bot.id === action.id) ? { ...state, currentId: action.id } : state;
    case 'send':
      return {
        ...state,
        currentId: action.botId,
        order: toFront(state.order, action.botId),
        bots: mapBot(state, action.botId, bot => ({ ...bot, messages: [...bot.messages, action.message] })),
        pending: [...state.pending, action.task],
      };
    case 'reply':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, messages: [...bot.messages, ...action.messages] })) };
    case 'complete': {
      const task = state.pending.find(item => item.id === action.taskId);
      if (!task) return state;
      return {
        ...state,
        pending: state.pending.filter(item => item.id !== action.taskId),
        bots: mapBot(state, task.botId, bot => {
          const history = bot.history.map(day => [...day] as [number, number]);
          const today = history[history.length - 1];
          if (today) today[action.needsYou ? 1 : 0] += 1;
          return {
            ...bot, history,
            messages: [...bot.messages, ...action.messages],
            memory: action.memory ? [action.memory, ...bot.memory] : bot.memory,
          };
        }),
      };
    }
    case 'create-bot':
      return { ...state, bots: [...state.bots, action.bot], order: [action.bot.id, ...state.order], currentId: action.bot.id };
    case 'update-bot':
      return { ...state, bots: mapBot(state, action.id, bot => ({ ...bot, ...action.patch })) };
    case 'delete-bot': {
      if (action.id === MAIN_BOT_ID) return state;
      const bots = state.bots
        .filter(bot => bot.id !== action.id)
        .map(bot => bot.memberIds.includes(action.id) ? { ...bot, memberIds: bot.memberIds.filter(id => id !== action.id) } : bot);
      const order = state.order.filter(id => id !== action.id);
      return { ...state, bots, order, pending: state.pending.filter(task => task.botId !== action.id), currentId: state.currentId === action.id ? (order[0] ?? MAIN_BOT_ID) : state.currentId };
    }
    case 'forget':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, memory: bot.memory.filter(item => item.id !== action.memoryId) })) };
    case 'create-skill':
      return { ...state, skills: [...state.skills, action.skill] };
    case 'create-mcp':
      return { ...state, mcps: [...state.mcps, action.mcp] };
    case 'toggle-mcp':
      return { ...state, mcps: state.mcps.map(mcp => mcp.id === action.id ? { ...mcp, enabled: !mcp.enabled } : mcp) };
    case 'reset':
      return action.state;
  }
}

// ───────────────────────── 本地恢复 ─────────────────────────

export const BOTOS_STORAGE_KEY = 'agentos-botos-v1';

export function restoreBotos(raw: string | null, fallback: () => BotosState): BotosState {
  if (!raw) return fallback();
  try {
    const value = JSON.parse(raw) as Partial<BotosState>;
    if (value?.version !== 1 || !Array.isArray(value.bots) || !Array.isArray(value.order) || !Array.isArray(value.skills) || !Array.isArray(value.mcps)) return fallback();
    const bots = value.bots.filter((bot): bot is Bot => !!bot && typeof bot.id === 'string' && Array.isArray(bot.messages) && Array.isArray(bot.history));
    if (!bots.some(bot => bot.id === MAIN_BOT_ID)) return fallback();
    const ids = new Set(bots.map(bot => bot.id));
    const order = value.order.filter(id => ids.has(id) && id !== MAIN_BOT_ID);
    bots.forEach(bot => { if (bot.id !== MAIN_BOT_ID && !order.includes(bot.id)) order.push(bot.id); });
    const pending = Array.isArray(value.pending) ? value.pending.filter(task => ids.has(task?.botId)) : [];
    return {
      version: 1, bots, order, pending,
      skills: value.skills, mcps: value.mcps,
      currentId: typeof value.currentId === 'string' && ids.has(value.currentId) ? value.currentId : MAIN_BOT_ID,
    };
  } catch {
    return fallback();
  }
}
