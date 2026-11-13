// AgentOS v0.3 · 专家化工作空间的数据模型。
// 专家是唯一的基本单元：对话、记忆、已装能力与工作台都属于专家。
// 技能 / 连接器是账号级共享能力；工作台由专家的 prompt + 已装能力组装为声明式 Spec。

import { MAIN_FACE, RESERVED_FACES, SYSTEM_FACES, faceShapes, isReservedFace, pickFace, type FaceSpec, type FaceState } from './botFaces';
import { hasGrant, revokeCapability, type CapabilityGrant } from './capabilities';
import { dashboardTemplates, type DashboardTemplate } from './dashboardTemplates';
import { applyGovernance, type GovernanceAction } from './governanceActions';
import type { Approval, AuditRecord } from './governance';
import type { PersonnelAction, PersonnelResult } from './personnel';
import type { ExpertPublication } from './expertDefinitions';
import { runRoutine, seedRoutines, seedWorkspaceFiles, tableActionLabel, tableActionStatus, tableRows, type Routine, type TableAction, type WorkspaceFile } from './workspaceWidgets';

export type WidgetKind =
  | 'waiting' | 'agents' | 'done' | 'runs' | 'artifacts' | 'members'
  | 'feed' | 'repo' | 'sources' | 'alerts' | 'trend' | 'metrics' | 'checks'
  | 'query-form' | 'audit' | 'action-table' | 'artifact-preview' | 'routines' | 'workspace'
  | 'capabilities' | 'approvals' | 'health' | 'sensitive-operations';

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
  execution?: ExecutionStep[];
  widgetInput?: { slotId: string; subject: string; reason: string };
}

export interface ExecutionStep { path: '连接器' | '临时沙箱' | 'KodaX CLI' | 'KodaX Space'; tool: string; durationMs: number }

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
  /** 系统智能体负责的管理面板。 */
  role?: SystemRole;
}

export interface PendingTask { id: string; botId: string; request: string; personnel?: PersonnelResult; slotId?: string }

export interface BotosState {
  version: 1;
  bots: Bot[];
  /** 专家栏顺序（不含企业效能管理智能体）。发送后当前专家移到第一位。 */
  order: string[];
  currentId: string;
  skills: Skill[];
  mcps: Mcp[];
  pending: PendingTask[];
  approvals: Approval[];
  audit: AuditRecord[];
  expertPublications?: ExpertPublication[];
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
      widgets: [core('waiting', '待你处理', 1), core('agents', '你的智能体', 1), core('done', '完成情况', 1),
        core('approvals', '待我审批', 2), core('health', '能力健康', 1), core('sensitive-operations', '敏感操作', 3), core('runs', '运行记录', 3)],
    };
  }
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
  | GovernanceAction
  | { type: 'select'; id: string }
  | { type: 'send'; botId: string; message: BotMessage; task: PendingTask }
  | { type: 'reply'; botId: string; messages: BotMessage[] }
  | { type: 'complete'; taskId: string; messages: BotMessage[]; memory?: MemoryItem; needsYou?: boolean }
  | { type: 'create-bot'; bot: Bot }
  | { type: 'update-bot'; id: string; patch: Partial<Pick<Bot, 'name' | 'prompt' | 'model' | 'skillIds' | 'mcpIds' | 'memberIds' | 'face' | 'sourceVersion' | 'dashboardTemplate' | 'widgetOrder' | 'requiredMcpIds'>> }
  | { type: 'delete-bot'; id: string }
  | { type: 'forget'; botId: string; memoryId: string }
  | { type: 'mature'; id: string }
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
  | { type: 'reset'; state: BotosState };

const mapBot = (state: BotosState, id: string, fn: (bot: Bot) => Bot): Bot[] => state.bots.map(bot => bot.id === id ? fn(bot) : bot);
/** 智能体栏顺序：只有用户的智能体会排到第一位；首页与系统管理智能体不进智能体栏。 */
const toFront = (state: BotosState, id: string) => state.bots.some(bot => bot.id === id && isAgent(bot)) ? [id, ...state.order.filter(item => item !== id)] : state.order;

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
    const restored = value.bots.filter((bot): bot is Bot => !!bot && typeof bot.id === 'string' && Array.isArray(bot.messages) && Array.isArray(bot.history));
    if (!restored.some(bot => bot.id === MAIN_BOT_ID)) return fallback();
    // 旧数据没有系统管理智能体：从示例里补上
    const defaults = fallback();
    const savedMcps = value.mcps;
    const seeded = defaults.bots;
    SYSTEM_AGENTS.forEach(sys => { if (!restored.some(b => b.id === sys.id)) { const b = seeded.find(x => x.id === sys.id); if (b) restored.push(b); } });
    // 旧数据没有沉淀标记：从市场添加的（有来源）和示例里已沉淀的，视为专家 / 专家团
    restored.forEach((b, i) => { if (b.matured === undefined && (b.sourceId || seeded.find(x => x.id === b.id)?.matured)) restored[i] = { ...b, matured: true }; });
    const personnelBot = seeded.find(bot => bot.id === 'personnel');
    if (personnelBot && !restored.some(bot => bot.id === personnelBot.id) && !value.mcps.some(mcp => mcp.id === 'personnel')) restored.push(personnelBot);
    const bots = assignFaces(restored.map(bot => ({ ...bot, dashboardUpdatedAt: bot.dashboardUpdatedAt ?? Date.now(), routines: bot.routines ?? seedRoutines(bot.id), files: bot.files ?? seedWorkspaceFiles(bot.id) })));
    const ids = new Set(bots.map(bot => bot.id));
    const agentIds = new Set(bots.filter(isAgent).map(bot => bot.id));
    const order = value.order.filter(id => agentIds.has(id));
    bots.forEach(bot => { if (agentIds.has(bot.id) && !order.includes(bot.id)) order.push(bot.id); });
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
      currentId: typeof value.currentId === 'string' && ids.has(value.currentId) ? value.currentId : MAIN_BOT_ID,
    };
  } catch {
    return fallback();
  }
}
