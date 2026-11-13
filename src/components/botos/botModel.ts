// AgentOS v0.3 · 专家化工作空间的数据模型。
// 专家是唯一的基本单元：对话、记忆、已装能力与工作台都属于专家。
// 技能 / 连接器是账号级共享能力；工作台由专家的 prompt + 已装能力组装为声明式 Spec。

import { RESERVED_FACES, faceShapes, isReservedFace, pickFace, type FaceSpec, type FaceState } from './botFaces';
import { hasGrant, revokeCapability, type CapabilityGrant } from './capabilities';
import { dashboardTemplates, type DashboardTemplate } from './dashboardTemplates';
import { applyGovernance, type GovernanceAction } from './governanceActions';
import type { Approval, AuditRecord } from './governance';
import { PERSONNEL_MCP_ID } from './personnel';
import type { PersonnelAction, PersonnelResult } from './personnel';
import type { ExpertPublication } from './expertDefinitions';
import { runRoutine, seedRoutines, seedWorkspaceFiles, tableActionLabel, tableActionStatus, tableRows, type Routine, type TableAction, type WorkspaceFile } from './workspaceWidgets';

export type WidgetKind =
  | 'waiting' | 'runs' | 'artifacts' | 'members'
  | 'feed' | 'repo' | 'sources' | 'alerts' | 'trend' | 'metrics' | 'checks'
  | 'query-form' | 'audit' | 'action-table' | 'artifact-preview' | 'routines' | 'workspace'
  | 'capabilities';

export type WidgetSource = 'core' | `skill:${string}` | `mcp:${string}`;

export interface WidgetSlot extends WidgetOffer { id: string; source: WidgetSource }
export interface DashboardSpec { headline: { title: string; subtitle: string }; widgets: WidgetSlot[] }

export interface WidgetOffer { kind: WidgetKind; title: string; span: 1 | 2 | 3; action?: 'direct' | 'agent'; tool?: string }

export interface Skill {
  id: string; name: string; description: string; category: string;
  version: string; owner: string; calls: number; failRate: number;
  widgets: WidgetOffer[]; createdByUser?: boolean;
}

export type McpKind = 'feishu' | 'github' | 'database' | 'web' | 'erp' | 'custom';
export interface Mcp {
  id: string; name: string; kind: McpKind; endpoint: string; tools: string[];
  credential: 'vault' | 'none'; enabled: boolean; owner: string; calls: number;
  credentialExpiresAt?: number;
  widgets: WidgetOffer[]; createdByUser?: boolean;
}

export type MessageAuthor = 'user' | 'bot' | 'source' | 'member';
/** 消息里附带的选择卡：专家主动问用户下一步做什么。 */
export interface BotChoices { question: string; options: string[]; answered?: string }
export interface BotMessage {
  id: string; author: MessageAuthor; name: string; text: string; time: string;
  attachment?: string;
  at?: number;
  choices?: BotChoices;
  approvalId?: string;
  needsUser?: boolean;
  execution?: ExecutionStep[];
  widgetInput?: { slotId: string; subject: string; reason: string };
}

export interface ExecutionStep { path: '连接器' | '临时沙箱' | 'KodaX CLI' | 'KodaX Space'; tool: string; durationMs: number }

export interface MemoryItem { id: string; text: string; scope: 'team' | 'personal'; createdAt: string }

export type BotKind = 'bot' | 'group';
export interface Bot {
  id: string; name: string; kind: BotKind; prompt: string; model: string;
  /** 头像：形状 × 颜色。 */
  face: FaceSpec;
  skillIds: string[]; mcpIds: string[]; memberIds: string[];
  memory: MemoryItem[]; messages: BotMessage[];
  /** 最近 56 天的每日运行数：[自动完成, 需要你介入] */
  history: [number, number][];
  createdAt: string;
  /** 从 Agent Market 添加时，记录来源条目 id（如 expert:research）。 */
  sourceId?: string;
  sourceVersion?: string;
  requiredMcpIds?: string[];
  capabilityGrants?: CapabilityGrant[];
  dashboardTemplate?: DashboardTemplate;
  widgetOrder?: string[];
  widgetUpdates?: Record<string, number>;
  dashboardUpdatedAt?: number;
  dashboardChange?: { capability: string; titles: string[]; source: WidgetSource };
  personnelResults?: Partial<Record<PersonnelAction, PersonnelResult>>;
  routines?: Routine[];
  tableActions?: Record<string, TableAction>;
  files?: WorkspaceFile[];
  /** 已沉淀为专家（bot）或专家团（group）：成熟、可复用、可发布到市场。 */
  matured?: boolean;
}

export interface PendingTask { id: string; botId: string; request: string; personnel?: PersonnelResult; slotId?: string }

export interface BotosState {
  version: 1;
  bots: Bot[];
  /** 发送后，当前智能体移到侧栏列表首位。 */
  order: string[];
  currentId: string;
  skills: Skill[];
  mcps: Mcp[];
  pending: PendingTask[];
  approvals: Approval[];
  audit: AuditRecord[];
  expertPublications?: ExpertPublication[];
}

export const HOME_PAGE_ID = 'home';
export const MARKET_PAGE_ID = 'market';
export const isAgent = (bot: { kind: unknown }) => bot.kind === 'bot' || bot.kind === 'group';
const isPage = (id: string) => id === HOME_PAGE_ID || id === MARKET_PAGE_ID;
/** 对外称呼：未沉淀叫「智能体 / 智能体群」，沉淀后叫「专家 / 专家团」。 */
export function agentLabel(bot: Pick<Bot, 'kind' | 'matured'>): string {
  if (bot.kind === 'group') return bot.matured ? '专家团' : '智能体群';
  return bot.matured ? '专家' : '智能体';
}

export const HISTORY_DAYS = 56;

// ───────────────────────── 工作台组装 ─────────────────────────

const core = (kind: WidgetKind, title: string, span: 1 | 2 | 3): WidgetSlot => ({ id: `core:${kind}`, kind, title, source: 'core', span });

function firstSentence(prompt: string): string {
  const sentence = prompt.split(/[。！？\n]/).map(s => s.trim()).find(Boolean) ?? '';
  return sentence.length > 38 ? `${sentence.slice(0, 38)}…` : sentence;
}

/** 根据专家的 prompt 与已装技能 / 连接器组装工作台 Spec。纯函数，可测试。 */
export function composeDashboard(bot: Bot, skills: Skill[], mcps: Mcp[]): DashboardSpec {
  const installedSkills = skills.filter(s => hasGrant(bot, 'skill', s.id));
  const installedMcps = mcps.filter(m => m.enabled && hasGrant(bot, 'mcp', m.id));
  const seen = new Set<string>();
  const contributed: WidgetSlot[] = [];
  const offer = (source: WidgetSource, w: WidgetOffer) => {
    const key = w.action ? `${w.kind}:${w.action}` : w.kind === 'action-table' ? `${source}:${w.kind}` : w.kind;
    if (seen.has(key)) return;
    seen.add(key);
    contributed.push({ ...w, id: `${source}:${w.kind}${w.action ? `:${w.action}` : ''}`, source });
  };
  // prompt 提到的能力优先：名称出现在 prompt 中的技能 / 连接器排在前面。
  const mentioned = <T extends { name: string }>(items: T[]) => [...items].sort((a, b) => Number(bot.prompt.includes(b.name)) - Number(bot.prompt.includes(a.name)));
  mentioned(installedSkills).forEach(s => s.widgets.forEach(w => offer(`skill:${s.id}`, w)));
  mentioned(installedMcps).forEach(m => m.widgets.forEach(w => offer(`mcp:${m.id}`, w)));
  // 查询授权失效后，智能体仍可查看脱敏的历史记录。
  if (bot.mcpIds.includes(PERSONNEL_MCP_ID) || bot.requiredMcpIds?.includes(PERSONNEL_MCP_ID)) {
    const audit = mcps.find(mcp => mcp.id === PERSONNEL_MCP_ID)?.widgets.find(widget => widget.kind === 'audit');
    if (audit) offer(`mcp:${PERSONNEL_MCP_ID}`, audit);
  }

  const widgets: WidgetSlot[] = [core('waiting', '待你处理', 1)];
  if (bot.kind === 'group') widgets.push(core('members', '成员', 2));
  widgets.push(...contributed);
  widgets.push(core('runs', '运行记录', 2), core('artifacts', '最近成果', 1), core('artifact-preview', '成果预览', 2),
    core('routines', 'Routine', 3), core('workspace', '托管工作区', 3), core('capabilities', '能力与授权', 3));
  const priority = bot.dashboardTemplate ? dashboardTemplates[bot.dashboardTemplate]?.priority ?? [] : [];
  const rank = <T,>(values: T[], key: T) => values.includes(key) ? values.indexOf(key) : values.length;
  widgets.sort((a, b) => rank(bot.widgetOrder ?? [], a.id) - rank(bot.widgetOrder ?? [], b.id)
    || rank(priority, a.kind) - rank(priority, b.kind));

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

export interface WaitingItem { botId: string; messageId: string; title: string; at?: number }
export const waitingFor = (bot: Pick<Bot, 'id' | 'messages'>): WaitingItem[] => bot.messages
  .filter(message => message.needsUser && !message.approvalId)
  .map(message => ({ botId: bot.id, messageId: message.id, title: message.text, at: message.at }));

export const memberBots = (state: BotosState, bot: Bot): Bot[] => state.bots.filter(b => bot.memberIds.includes(b.id));

/** 头像状态：工作中 > 刚完成 > 需要你 > 空闲。群聊也会汇总成员的「需要你」。 */
export function faceStateOf(state: BotosState, bot: Bot, recentlyDone: string[] = []): FaceState {
  if (pendingCount(state, bot.id) > 0) return 'working';
  if (recentlyDone.includes(bot.id)) return 'done';
  const scope = bot.kind === 'group' ? [bot, ...memberBots(state, bot)] : [bot];
  return scope.some(b => waitingFor(b).length) ? 'needs' : 'idle';
}

const validFace = (face: unknown): face is FaceSpec => !!face && typeof face === 'object'
  && (face as FaceSpec).shape in faceShapes && ['indigo', 'cinnabar', 'taupe', 'black'].includes((face as FaceSpec).color);

/** 给缺少头像的智能体按名称分配头像，避开已用组合。 */
export function assignFaces<T extends Omit<Bot, 'face'> & { face?: unknown }>(bots: T[]): Bot[] {
  const usable = (face: unknown): face is FaceSpec => validFace(face) && !isReservedFace(face);
  const taken: FaceSpec[] = [...RESERVED_FACES, ...bots.filter(b => usable(b.face)).map(b => b.face as FaceSpec)];
  return bots.map(bot => {
    if (usable(bot.face)) return bot as Bot;
    const face = pickFace(bot.name, taken);
    taken.push(face);
    return { ...bot, face };
  });
}

// ───────────────────────── Reducer ─────────────────────────

export type BotosAction =
  | GovernanceAction
  | { type: 'select'; id: string }
  | { type: 'send'; botId: string; message: BotMessage; task: PendingTask }
  | { type: 'reply'; botId: string; messages: BotMessage[] }
  | { type: 'resolve-waiting'; botId: string; messageId: string }
  | { type: 'complete'; taskId: string; messages: BotMessage[]; memory?: MemoryItem; needsYou?: boolean }
  | { type: 'create-bot'; bot: Bot }
  | { type: 'update-bot'; id: string; patch: Partial<Pick<Bot, 'name' | 'prompt' | 'model' | 'skillIds' | 'mcpIds' | 'memberIds' | 'face' | 'sourceVersion' | 'dashboardTemplate' | 'widgetOrder' | 'requiredMcpIds'>> }
  | { type: 'delete-bot'; id: string }
  | { type: 'forget'; botId: string; memoryId: string }
  | { type: 'answer'; botId: string; messageId: string; answer: string }
  | { type: 'create-skill'; skill: Skill }
  | { type: 'create-mcp'; mcp: Mcp }
  | { type: 'toggle-mcp'; id: string }
  | { type: 'revoke-capability'; botId: string; kind: CapabilityGrant['kind']; id: string }
  | { type: 'dashboard-change'; botId: string; undo?: boolean }
  | { type: 'refresh-widget'; botId: string; id: string; at: number }
  | { type: 'reorder-widgets'; botId: string; first: string; messages: BotMessage[] }
  | { type: 'routine-create'; botId: string; routine: Routine; messages: BotMessage[] }
  | { type: 'routine-toggle'; botId: string; id: string }
  | { type: 'routine-run'; botId: string; id: string; runId: string; at: number }
  | { type: 'table-action'; botId: string; source: WidgetSource; rowId: string; action: TableAction; id: string; at: number }
  | { type: 'reset'; state: BotosState }
  | { type: 'sync'; state: BotosState };

const mapBot = (state: BotosState, id: string, fn: (bot: Bot) => Bot): Bot[] => state.bots.map(bot => bot.id === id ? fn(bot) : bot);
export function botosReducer(state: BotosState, action: BotosAction): BotosState {
  switch (action.type) {
    case 'personnel-run':
    case 'personnel-complete':
    case 'request-approval':
    case 'submit-approval':
    case 'resolve-approval':
    case 'expire-approvals':
    case 'capture-expert':
      return applyGovernance(state, action);
    case 'select':
      return isPage(action.id) || state.bots.some(bot => bot.id === action.id) ? { ...state, currentId: action.id } : state;
    case 'send':
      if (!state.bots.some(bot => bot.id === action.botId) || action.task.botId !== action.botId) return state;
      return {
        ...state,
        currentId: action.botId,
        order: [action.botId, ...state.order.filter(id => id !== action.botId)],
        bots: mapBot(state, action.botId, bot => ({ ...bot, messages: [...bot.messages, action.message] })),
        pending: [...state.pending, action.task],
      };
    case 'reply':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, messages: [...bot.messages, ...action.messages] })) };
    case 'resolve-waiting':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, messages: bot.messages.map(message => message.id === action.messageId && message.needsUser ? { ...message, needsUser: false } : message) })) };
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
      return { ...state, bots: mapBot(state, action.id, bot => {
        const next = { ...bot, ...action.patch };
        for (const skill of state.skills) {
          if (next.skillIds.includes(skill.id) && !bot.skillIds.includes(skill.id)) return withDashboardChange(state, bot, next, `skill:${skill.id}`, skill.name);
        }
        for (const mcp of state.mcps) {
          if (next.mcpIds.includes(mcp.id) && !bot.mcpIds.includes(mcp.id)) return withDashboardChange(state, bot, next, `mcp:${mcp.id}`, mcp.name);
        }
        return next;
      }) };
    case 'delete-bot': {
      if (!state.bots.some(bot => bot.id === action.id)) return state;
      const bots = state.bots
        .filter(bot => bot.id !== action.id)
        .map(bot => bot.memberIds.includes(action.id) ? { ...bot, memberIds: bot.memberIds.filter(id => id !== action.id) } : bot);
      const order = state.order.filter(id => id !== action.id);
      return { ...state, bots, order, pending: state.pending.filter(task => task.botId !== action.id), currentId: state.currentId === action.id ? (order[0] ?? HOME_PAGE_ID) : state.currentId };
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
    case 'revoke-capability':
      return { ...state, bots: mapBot(state, action.botId, bot => revokeCapability(bot, action.kind, action.id)) };
    case 'dashboard-change':
      return { ...state, bots: mapBot(state, action.botId, bot => {
        if (!bot.dashboardChange) return bot;
        const next = { ...bot, dashboardChange: undefined };
        const source = bot.dashboardChange.source;
        if (!action.undo || source === 'core') return next;
        return source.startsWith('mcp:') ? revokeCapability(next, 'mcp', source.slice(4)) : revokeCapability(next, 'skill', source.slice(6));
      }) };
    case 'refresh-widget':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, widgetUpdates: { ...bot.widgetUpdates, [action.id]: action.at } })) };
    case 'reorder-widgets':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot,
        widgetOrder: [action.first, ...(bot.widgetOrder ?? []).filter(id => id !== action.first)], messages: [...bot.messages, ...action.messages],
      })) };
    case 'routine-create':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, routines: [...(bot.routines ?? []), action.routine], messages: [...bot.messages, ...action.messages] })) };
    case 'routine-toggle':
      return { ...state, bots: mapBot(state, action.botId, bot => ({ ...bot, routines: bot.routines?.map(routine => routine.id === action.id ? { ...routine, enabled: !routine.enabled } : routine) })) };
    case 'routine-run':
      return { ...state, bots: mapBot(state, action.botId, bot => {
        const routine = bot.routines?.find(item => item.id === action.id);
        if (!routine || bot.files?.some(file => file.id === action.runId)) return bot;
        const result = runRoutine(routine, action.at, action.runId);
        const time = new Date(action.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const message: BotMessage = { id: action.runId, at: action.at, attachment: result.artifact.name, author: 'bot', name: bot.name, text: result.text, time,
          execution: [{ path: '临时沙箱', tool: '生成 Routine 成果', durationMs: 780 }] };
        return { ...bot, routines: bot.routines?.map(item => item.id === routine.id ? result.routine : item),
          files: [result.artifact, result.log, ...(bot.files ?? [])], messages: [...bot.messages, message],
          history: incrementHistory(bot.history), widgetUpdates: { ...bot.widgetUpdates, 'core:routines': action.at, 'core:artifacts': action.at, 'core:workspace': action.at, 'core:runs': action.at } };
      }) };
    case 'table-action': {
      const row = tableRows(action.source).find(item => item.id === action.rowId);
      if (!row?.actions.includes(action.action)) return state;
      const time = new Date(action.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return { ...state, bots: mapBot(state, action.botId, bot => !bot.tableActions?.[row.id] && composeDashboard(bot, state.skills, state.mcps).widgets.some(widget => widget.kind === 'action-table' && widget.source === action.source) ? ({ ...bot,
        tableActions: { ...bot.tableActions, [row.id]: action.action },
        widgetUpdates: { ...bot.widgetUpdates, [`${action.source}:action-table`]: action.at },
        messages: [...bot.messages, { id: action.id, author: 'source', name: '工作台', time,
          text: `你在面板对「${row.title}」执行了「${tableActionLabel(action.action)}」。当前状态：${tableActionStatus(action.action)}。` }],
      }) : bot) };
    }
    case 'reset':
      return action.state;
    case 'sync': {
      const currentId = isPage(state.currentId) || action.state.bots.some(bot => bot.id === state.currentId) ? state.currentId : HOME_PAGE_ID;
      return { ...action.state, currentId };
    }
  }
}

export function incrementHistory(history: Bot['history'], needsYou = false): Bot['history'] {
  return history.map(([auto, needed], index) => index === history.length - 1
    ? [auto + Number(!needsYou), needed + Number(needsYou)] : [auto, needed]);
}

export function withDashboardChange(state: BotosState, previous: Bot, next: Bot, source: WidgetSource, capability: string): Bot {
  const before = new Set(composeDashboard(previous, state.skills, state.mcps).widgets.map(widget => widget.id));
  const added = composeDashboard(next, state.skills, state.mcps).widgets.filter(widget => widget.source === source && !before.has(widget.id));
  return added.length ? { ...next, dashboardChange: { capability, titles: added.map(widget => widget.title), source } } : next;
}

// ───────────────────────── 本地恢复 ─────────────────────────

export const BOTOS_STORAGE_KEY = 'agentos-botos-v1';

export function restoreBotos(raw: string | null, fallback: () => BotosState): BotosState {
  if (!raw) return fallback();
  try {
    const value = JSON.parse(raw) as Partial<BotosState>;
    if (value?.version !== 1 || !Array.isArray(value.bots) || !Array.isArray(value.order) || !Array.isArray(value.skills) || !Array.isArray(value.mcps)) return fallback();
    const retired = (id: string) => id === 'main' || id.startsWith('sys-');
    const legacy = value.bots.some(bot => bot && typeof bot.id === 'string' && (retired(bot.id) || !isAgent(bot)));
    const restored = value.bots.filter(bot => bot && typeof bot.id === 'string' && !retired(bot.id) && !isPage(bot.id)
      && isAgent(bot) && Array.isArray(bot.messages) && Array.isArray(bot.history));
    const defaults = fallback();
    const savedMcps = value.mcps;
    const seeded = defaults.bots;
    const ids = new Set(restored.map(bot => bot.id));
    const bots = assignFaces(restored.map(bot => {
      const demo = seeded.find(item => item.id === bot.id);
      const demoMessageIds = new Set(demo?.messages.filter(message => message.needsUser).map(message => message.id));
      return {
        ...bot, memberIds: (bot.memberIds ?? []).filter(id => ids.has(id)),
        messages: bot.messages.map(message => message.needsUser === undefined && demoMessageIds.has(message.id) ? { ...message, needsUser: true } : message),
        matured: bot.matured ?? (bot.sourceId || demo?.matured ? true : undefined),
        dashboardUpdatedAt: bot.dashboardUpdatedAt ?? Date.now(), routines: bot.routines ?? seedRoutines(bot.id), files: bot.files ?? seedWorkspaceFiles(bot.id),
      };
    }));
    const order = [...new Set([...value.order.filter(id => ids.has(id)), ...ids])];
    const pending = Array.isArray(value.pending) ? value.pending.filter(task => ids.has(task?.botId)) : [];
    return {
      version: 1, bots, order, pending,
      skills: value.skills.map(skill => skill.id === 'risk' && skill.widgets.some(widget => widget.kind === 'alerts')
        ? { ...skill, widgets: defaults.skills.find(item => item.id === skill.id)?.widgets ?? skill.widgets } : skill),
      mcps: [...savedMcps.map(mcp => {
        const seededMcp = defaults.mcps.find(item => item.id === mcp.id);
        if (mcp.id === 'github' && mcp.widgets.some(widget => widget.kind === 'repo')) return { ...mcp, widgets: seededMcp?.widgets ?? mcp.widgets, tools: seededMcp?.tools ?? mcp.tools };
        if (mcp.id === 'feishu' && mcp.credentialExpiresAt === undefined) return { ...mcp, credentialExpiresAt: seededMcp?.credentialExpiresAt };
        return mcp;
      }), ...defaults.mcps.filter(mcp => mcp.id === 'personnel' && !savedMcps.some(item => item.id === mcp.id))],
      approvals: Array.isArray(value.approvals) ? value.approvals : defaults.approvals,
      audit: Array.isArray(value.audit) ? value.audit : [],
      expertPublications: Array.isArray(value.expertPublications) ? value.expertPublications : [],
      currentId: !legacy && typeof value.currentId === 'string' && (isPage(value.currentId) || ids.has(value.currentId)) ? value.currentId : HOME_PAGE_ID,
    };
  } catch {
    return fallback();
  }
}
