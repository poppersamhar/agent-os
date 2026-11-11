// AgentOS v0.3 · 专家化工作空间的数据模型。
// 专家是唯一的基本单元：对话、记忆、已装能力与工作台都属于专家。
// 技能 / 连接器是账号级共享能力；工作台由专家的 prompt + 已装能力组装为声明式 Spec。

import { MAIN_FACE, RESERVED_FACES, SYSTEM_FACES, faceShapes, isReservedFace, pickFace, type FaceSpec, type FaceState } from './botFaces';

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
/** 消息里附带的选择卡：专家主动问用户下一步做什么。 */
export interface BotChoices { question: string; options: string[]; answered?: string }
export interface BotMessage {
  id: string; author: MessageAuthor; name: string; text: string; time: string;
  attachment?: string;
  choices?: BotChoices;
}

export interface MemoryItem { id: string; text: string; scope: 'team' | 'personal'; createdAt: string }

/** main：企业效能管理智能体（入口叫「首页」）；system：专家 / 技能 / 连接器三个系统智能体；bot / group：用户的智能体与智能体群。 */
export type BotKind = 'main' | 'bot' | 'group' | 'system';
export type SystemRole = 'experts' | 'skills' | 'connectors';
export interface Bot {
  id: string; name: string; kind: BotKind; prompt: string; model: string;
  /** 头像：形状 × 颜色。系统智能体用专用形状。 */
  face: FaceSpec;
  skillIds: string[]; mcpIds: string[]; memberIds: string[];
  memory: MemoryItem[]; messages: BotMessage[];
  /** 最近 56 天的每日运行数：[自动完成, 需要你介入] */
  history: [number, number][];
  createdAt: string;
  /** 从 Agent Market 添加时，记录来源条目 id（如 expert:research）。 */
  sourceId?: string;
  /** 已沉淀为专家（bot）或专家团（group）：成熟、可复用、可发布到市场。 */
  matured?: boolean;
  /** 系统智能体负责的管理面板。 */
  role?: SystemRole;
}

export interface PendingTask { id: string; botId: string; request: string }

export interface BotosState {
  version: 1;
  bots: Bot[];
  /** 专家栏顺序（不含企业效能管理智能体）。发送后当前专家移到第一位。 */
  order: string[];
  currentId: string;
  skills: Skill[];
  mcps: Mcp[];
  pending: PendingTask[];
}

export const MAIN_BOT_ID = 'main';

/** 用户的智能体（不含首页和系统管理智能体）。 */
export const isAgent = (bot: Pick<Bot, 'kind'>) => bot.kind === 'bot' || bot.kind === 'group';
/** 对外称呼：未沉淀叫「智能体 / 智能体群」，沉淀后叫「专家 / 专家团」。 */
export function agentLabel(bot: Pick<Bot, 'kind' | 'matured'>): string {
  if (bot.kind === 'main' || bot.kind === 'system') return '系统智能体';
  if (bot.kind === 'group') return bot.matured ? '专家团' : '智能体群';
  return bot.matured ? '专家' : '智能体';
}

/** 三个系统管理智能体：专用头像，用户不能删除。 */
export const SYSTEM_AGENTS: { id: string; role: SystemRole; name: string; face: FaceSpec; prompt: string }[] = [
  { id: 'sys-experts', role: 'experts', name: '专家', face: SYSTEM_FACES.experts, prompt: '帮你找到、创建和管理智能体、专家与专家团。' },
  { id: 'sys-skills', role: 'skills', name: '技能', face: SYSTEM_FACES.skills, prompt: '帮你创建、修改和管理技能。' },
  { id: 'sys-connectors', role: 'connectors', name: '连接器', face: SYSTEM_FACES.connectors, prompt: '帮你接入企业系统，管理连接器与凭证。' },
];
export const systemAgentId = (role: SystemRole) => SYSTEM_AGENTS.find(s => s.role === role)!.id;
/** 主 Bot 的对外名称，由系统固定，用户不能改。 */
export const MAIN_BOT_NAME = '企业效能管理智能体';
export const HISTORY_DAYS = 56;

// ───────────────────────── 工作台组装 ─────────────────────────

const core = (kind: WidgetKind, title: string, span: 1 | 2 | 3): WidgetSlot => ({ id: `core:${kind}`, kind, title, source: 'core', span });

function firstSentence(prompt: string): string {
  const sentence = prompt.split(/[。！？\n]/).map(s => s.trim()).find(Boolean) ?? '';
  return sentence.length > 38 ? `${sentence.slice(0, 38)}…` : sentence;
}

/** 根据专家的 prompt 与已装技能 / 连接器组装工作台 Spec。纯函数，可测试。 */
export function composeDashboard(bot: Bot, skills: Skill[], mcps: Mcp[]): DashboardSpec {
  if (bot.kind === 'main') {
    return {
      headline: { title: '你好，Samhar', subtitle: '企业效能管理智能体 · 汇总全部智能体的进展、待处理事项与运行记录' },
      widgets: [core('waiting', '待你处理', 1), core('agents', '你的智能体', 1), core('done', '完成情况', 1), core('runs', '运行记录', 3)],
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
  // prompt 提到的能力优先：名称出现在 prompt 中的技能 / 连接器排在前面。
  const mentioned = <T extends { name: string }>(items: T[]) => [...items].sort((a, b) => Number(bot.prompt.includes(b.name)) - Number(bot.prompt.includes(a.name)));
  mentioned(installedSkills).forEach(s => s.widgets.forEach(w => offer(`skill:${s.id}`, w)));
  mentioned(installedMcps).forEach(m => m.widgets.forEach(w => offer(`mcp:${m.id}`, w)));

  const widgets: WidgetSlot[] = [core('waiting', '待你处理', 1)];
  if (bot.kind === 'group') widgets.push(core('members', '成员', 2));
  widgets.push(...contributed);
  widgets.push(core('runs', '运行记录', 2), core('artifacts', '最近成果', 1));

  const capability = `${installedSkills.length} 个技能 · ${installedMcps.length} 个连接器`;
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

/** 确定性的伪随机，用于为专家生成稳定的演示数据。 */
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

// ───────────────────────── 待你处理（演示数据）与头像状态 ─────────────────────────

export type WaitingWhen = 'today' | 'week' | 'later';
export interface WaitingItem { botId: string; title: string; when: WaitingWhen }
const demoWaiting: Record<string, Omit<WaitingItem, 'botId'>[]> = {
  risk: [{ title: '确认华东二号供应商延期方案', when: 'today' }, { title: '核对物料单价上涨原因', when: 'today' }],
  data: [{ title: '决定 dw_orders 负值是否回滚', when: 'week' }],
  research: [{ title: '确认下期调研对象', when: 'later' }],
};
export const waitingFor = (botId: string): WaitingItem[] => (demoWaiting[botId] ?? []).map(item => ({ ...item, botId }));

export const memberBots = (state: BotosState, bot: Bot): Bot[] => state.bots.filter(b => bot.memberIds.includes(b.id));

/** 头像状态：工作中 > 刚完成 > 需要你 > 空闲。企业效能管理智能体与群聊汇总下属专家的「需要你」。 */
export function faceStateOf(state: BotosState, bot: Bot, recentlyDone: string[] = []): FaceState {
  if (pendingCount(state, bot.id) > 0) return 'working';
  if (recentlyDone.includes(bot.id)) return 'done';
  const scope = bot.kind === 'main' ? state.bots.filter(isAgent) : bot.kind === 'system' ? [] : bot.kind === 'group' ? [bot, ...memberBots(state, bot)] : [bot];
  return scope.some(b => waitingFor(b.id).length) ? 'needs' : 'idle';
}

const validFace = (face: unknown): face is FaceSpec => !!face && typeof face === 'object'
  && (face as FaceSpec).shape in faceShapes && ['indigo', 'cinnabar', 'taupe', 'black'].includes((face as FaceSpec).color);

/** 给缺少头像的专家补上：企业效能管理智能体用「圆 · 靛蓝」，其余按名称自动分配、避开已用组合。普通专家不能用企业效能管理智能体的组合。 */
export function assignFaces<T extends Omit<Bot, 'face'> & { face?: unknown }>(bots: T[]): Bot[] {
  const usable = (face: unknown): face is FaceSpec => validFace(face) && !isReservedFace(face);
  const taken: FaceSpec[] = [...RESERVED_FACES, ...bots.filter(b => isAgent(b) && usable(b.face)).map(b => b.face as FaceSpec)];
  return bots.map(bot => {
    if (bot.kind === 'main') return { ...bot, face: MAIN_FACE, name: MAIN_BOT_NAME, messages: bot.messages.map(m => m.author === 'bot' ? { ...m, name: MAIN_BOT_NAME } : m) };
    const sys = SYSTEM_AGENTS.find(s => s.id === bot.id);
    if (sys) return { ...bot, kind: 'system', role: sys.role, face: sys.face, name: sys.name };
    if (usable(bot.face)) return bot as Bot;
    const face = pickFace(bot.name, taken);
    taken.push(face);
    return { ...bot, face };
  });
}

// ───────────────────────── Reducer ─────────────────────────

export type BotosAction =
  | { type: 'select'; id: string }
  | { type: 'send'; botId: string; message: BotMessage; task: PendingTask }
  | { type: 'reply'; botId: string; messages: BotMessage[] }
  | { type: 'complete'; taskId: string; messages: BotMessage[]; memory?: MemoryItem; needsYou?: boolean }
  | { type: 'create-bot'; bot: Bot }
  | { type: 'update-bot'; id: string; patch: Partial<Pick<Bot, 'name' | 'prompt' | 'model' | 'skillIds' | 'mcpIds' | 'memberIds' | 'face'>> }
  | { type: 'delete-bot'; id: string }
  | { type: 'forget'; botId: string; memoryId: string }
  | { type: 'mature'; id: string }
  | { type: 'answer'; botId: string; messageId: string; answer: string }
  | { type: 'create-skill'; skill: Skill }
  | { type: 'create-mcp'; mcp: Mcp }
  | { type: 'toggle-mcp'; id: string }
  | { type: 'reset'; state: BotosState };

const mapBot = (state: BotosState, id: string, fn: (bot: Bot) => Bot): Bot[] => state.bots.map(bot => bot.id === id ? fn(bot) : bot);
/** 智能体栏顺序：只有用户的智能体会排到第一位；首页与系统管理智能体不进智能体栏。 */
const toFront = (state: BotosState, id: string) => state.bots.some(bot => bot.id === id && isAgent(bot)) ? [id, ...state.order.filter(item => item !== id)] : state.order;

export function botosReducer(state: BotosState, action: BotosAction): BotosState {
  switch (action.type) {
    case 'select':
      return state.bots.some(bot => bot.id === action.id) ? { ...state, currentId: action.id } : state;
    case 'send':
      return {
        ...state,
        currentId: action.botId,
        order: toFront(state, action.botId),
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
    case 'mature':
      return { ...state, bots: mapBot(state, action.id, bot => isAgent(bot) ? { ...bot, matured: true } : bot) };
    case 'delete-bot': {
      if (!state.bots.some(bot => bot.id === action.id && isAgent(bot))) return state;
      const bots = state.bots
        .filter(bot => bot.id !== action.id)
        .map(bot => bot.memberIds.includes(action.id) ? { ...bot, memberIds: bot.memberIds.filter(id => id !== action.id) } : bot);
      const order = state.order.filter(id => id !== action.id);
      return { ...state, bots, order, pending: state.pending.filter(task => task.botId !== action.id), currentId: state.currentId === action.id ? (order[0] ?? MAIN_BOT_ID) : state.currentId };
    }
    case 'answer':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, messages: bot.messages.map(m => m.id === action.messageId && m.choices ? { ...m, choices: { ...m.choices, answered: action.answer } } : m) })) };
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
    const restored = value.bots.filter((bot): bot is Bot => !!bot && typeof bot.id === 'string' && Array.isArray(bot.messages) && Array.isArray(bot.history));
    if (!restored.some(bot => bot.id === MAIN_BOT_ID)) return fallback();
    // 旧数据没有系统管理智能体：从示例里补上
    const seeded = fallback().bots;
    SYSTEM_AGENTS.forEach(sys => { if (!restored.some(b => b.id === sys.id)) { const b = seeded.find(x => x.id === sys.id); if (b) restored.push(b); } });
    // 旧数据没有沉淀标记：从市场添加的（有来源）和示例里已沉淀的，视为专家 / 专家团
    restored.forEach((b, i) => { if (b.matured === undefined && (b.sourceId || seeded.find(x => x.id === b.id)?.matured)) restored[i] = { ...b, matured: true }; });
    const bots = assignFaces(restored);
    const ids = new Set(bots.map(bot => bot.id));
    const agentIds = new Set(bots.filter(isAgent).map(bot => bot.id));
    const order = value.order.filter(id => agentIds.has(id));
    bots.forEach(bot => { if (agentIds.has(bot.id) && !order.includes(bot.id)) order.push(bot.id); });
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
