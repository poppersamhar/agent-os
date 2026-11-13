// Agent Market：专家、专家团、技能、连接器的统一市场。
// 市场里上架的是「定义」（无状态、可移植）；添加到 AgentOS 后才实例化为有记忆的专家。
// 每个条目同时可以作为插件接入其他产品：远程调用（连接器）或下载插件包。

import { RESERVED_FACES, pickFace, type FaceSpec } from './botFaces';
import { botosReducer, HISTORY_DAYS, uid, type Bot, type BotosState, type Mcp, type Skill } from './botModel';
import { seedMcps, seedSkills } from './botosSeed';
import { inferDashboardTemplate, type DashboardTemplate } from './dashboardTemplates';
import { openingMessage } from './firstTask';
import type { Routine } from './workspaceWidgets';

export type MarketKind = 'expert' | 'team' | 'skill' | 'connector';
export type MarketSource = 'official' | 'org' | 'mine';

interface MarketBase {
  id: string; kind: MarketKind; name: string; summary: string; description: string;
  source: MarketSource; owner: string; version: string; installs: number; updatedAt: string; tags: string[];
  versions?: MarketVersion[];
}
export interface MarketVersion { version: string; updatedAt: string; notes: string }
export type RoutineTemplate = Pick<Routine, 'name' | 'trigger' | 'enabled'>;
interface DefinitionFields {
  prompt: string; skillIds: string[]; mcpIds: string[];
  dashboardTemplate?: DashboardTemplate; widgetOrder?: string[]; routineTemplates?: RoutineTemplate[];
}
export interface ExpertItem extends MarketBase, DefinitionFields { kind: 'expert'; face: FaceSpec }
export interface TeamItem extends MarketBase, DefinitionFields { kind: 'team'; memberIds: string[]; memberDefinitions?: ExpertItem[] }
export interface SkillItem extends MarketBase { kind: 'skill'; skill: Skill }
export interface ConnectorItem extends MarketBase { kind: 'connector'; mcp: Mcp }
export type MarketItem = ExpertItem | TeamItem | SkillItem | ConnectorItem;
export type RecruitableItem = ExpertItem | TeamItem;
export const isRecruitable = (item: MarketItem): item is RecruitableItem => item.kind === 'expert' || item.kind === 'team';

export const kindLabels: Record<MarketKind, string> = { expert: '专家', team: '专家团', skill: '技能', connector: '连接器' };
export const sourceLabels: Record<MarketSource, string> = { official: '官方', org: '企业', mine: '我的' };

// ───────────────────────── 技能 / 连接器 ─────────────────────────

const extraSkills: Skill[] = [
  { id: 'minutes', name: '会议纪要', category: '写作', version: '1.1.0', owner: '行政组', calls: 0, failRate: 0.02,
    description: '从会议录音或聊天记录中整理结论、待办与负责人。', widgets: [{ kind: 'alerts', title: '会议待办', span: 2 }] },
  { id: 'contract', name: '合同审查', category: '分析', version: '0.8.0', owner: '法务部', calls: 0, failRate: 0.06,
    description: '对照企业合同模板，标出风险条款与缺失条款，并给出修改建议。', widgets: [{ kind: 'checks', title: '条款检查', span: 1 }] },
];
const extraMcps: Mcp[] = [
  { id: 'dingtalk', name: '钉钉', kind: 'custom', endpoint: 'mcp://dingtalk.internal/v1', credential: 'vault', enabled: true, owner: 'IT', calls: 0,
    tools: ['读取群消息', '发送工作通知', '读取审批'], widgets: [{ kind: 'feed', title: '钉钉待回复', span: 1 }] },
  { id: 'contracts-db', name: '合同库', kind: 'database', endpoint: 'mcp://legal.internal/contracts', credential: 'vault', enabled: true, owner: '法务部', calls: 0,
    tools: ['检索合同', '读取合同全文', '读取合同模板'], widgets: [] },
];

const orgOwners = new Set(['供应链组', '数据中台', '品牌组', '行政组', '法务部', 'IT', '研发']);
const skillInstalls: Record<string, number> = { research: 1820, risk: 640, weekly: 2310, inspect: 410, brand: 380, slides: 1460, minutes: 970, contract: 220 };
const mcpInstalls: Record<string, number> = { feishu: 3020, github: 1290, warehouse: 330, erp: 180, websearch: 2750, dingtalk: 1640, 'contracts-db': 95 };

const skillItems: SkillItem[] = [...seedSkills, ...extraSkills].map(skill => ({
  id: `skill:${skill.id}`, kind: 'skill', name: skill.name, summary: skill.description, description: skill.description,
  source: skill.owner === 'Samhar' ? 'mine' : orgOwners.has(skill.owner) ? 'org' : 'official', owner: skill.owner, version: skill.version,
  installs: skillInstalls[skill.id] ?? 0, updatedAt: '11-02', tags: [skill.category],
  skill: { ...skill, calls: 0 },
}));

const connectorItems: ConnectorItem[] = [...seedMcps, ...extraMcps].map(mcp => ({
  id: `connector:${mcp.id}`, kind: 'connector', name: mcp.name, summary: `工具：${mcp.tools.join('、')}`,
  description: `通过 MCP 协议接入「${mcp.name}」。${mcp.credential === 'vault' ? '凭证由企业管理员在 Vault 中配置，不会交给专家或第三方。' : '无需凭证。'}`,
  source: mcp.owner === '平台' ? 'official' : 'org', owner: mcp.owner, version: '1.0.0',
  installs: mcpInstalls[mcp.id] ?? 0, updatedAt: '10-28', tags: [mcp.credential === 'vault' ? '需凭证' : '免凭证'],
  mcp: { ...mcp, calls: 0 },
}));

// ───────────────────────── 专家 / 专家团 ─────────────────────────

type ExpertSeed = Omit<ExpertItem, 'kind' | 'face' | 'description'> & { description?: string };
const expertSeeds: ExpertSeed[] = [
  { id: 'expert:research', name: '竞品调研专家', source: 'official', owner: 'AgentOS', version: '2.1.0', installs: 1340, updatedAt: '11-10', tags: ['调研'],
    summary: '持续跟踪竞品的产品更新、定价与开源动向，定期给出结论。', prompt: '持续跟踪竞品动态。用网页调研整理产品更新、定价与开源动向，每周给出结论，发现定价变化时单独提醒。', skillIds: ['research', 'weekly'], mcpIds: ['websearch', 'github'],
    versions: [{ version: '2.1.0', updatedAt: '11-10', notes: '新增定价变化提醒。' }, { version: '2.0.0', updatedAt: '11-05', notes: '支持整理产品更新、定价与开源动向。' }] },
  { id: 'expert:risk', name: '风险跟进专家', source: 'org', owner: '供应链组', version: '1.3.0', installs: 210, updatedAt: '10-30', tags: ['风控'],
    summary: '识别交付与供应商风险，跟进处理并生成风险周报。', prompt: '跟进供应链风险。用风险评估识别交付与供应商风险，每周生成风险周报。', skillIds: ['risk', 'weekly'], mcpIds: ['erp', 'feishu'] },
  { id: 'expert:data', name: '数据巡检专家', source: 'org', owner: '数据中台', version: '3.0.0', installs: 160, updatedAt: '11-01', tags: ['数据'],
    summary: '每天检查关键数据表的质量，发现异常时说明影响并给出修复建议。', prompt: '每天检查数据仓库关键表的质量。数据巡检发现异常时，说明影响范围并给出修复建议。', skillIds: ['inspect'], mcpIds: ['warehouse'] },
  { id: 'expert:brand', name: '品牌内容专家', source: 'official', owner: 'AgentOS', version: '1.5.0', installs: 880, updatedAt: '10-26', tags: ['写作'],
    summary: '按品牌语气产出文案、网页与演示稿，保持表达一致。', prompt: '按品牌语气产出文案、网页与演示稿。品牌写作保证术语与主张一致。', skillIds: ['brand', 'slides'], mcpIds: [] },
  { id: 'expert:dev', name: '研发协作专家', source: 'official', owner: 'AgentOS', version: '1.2.0', installs: 760, updatedAt: '11-03', tags: ['研发'],
    summary: '跟进代码仓库的 PR 与 Issue，在飞书提醒相关同事。', prompt: '跟进代码仓库的 PR 与 Issue，汇总进展，在飞书提醒相关同事。', skillIds: ['weekly'], mcpIds: ['github', 'feishu'] },
  { id: 'expert:minutes', name: '会议纪要专家', source: 'org', owner: '行政组', version: '1.0.0', installs: 430, updatedAt: '11-06', tags: ['办公'],
    summary: '整理会议结论与待办，自动发到对应群里并跟进。', prompt: '整理会议结论、待办与负责人。会议纪要整理后发到钉钉或飞书群，并跟进待办。', skillIds: ['minutes'], mcpIds: ['dingtalk', 'feishu'] },
  { id: 'expert:contract', name: '合同审查专家', source: 'org', owner: '法务部', version: '0.8.0', installs: 70, updatedAt: '11-07', tags: ['法务'],
    summary: '对照合同模板标出风险条款与缺失条款。', prompt: '审查合同。用合同审查对照合同库里的模板，标出风险条款与缺失条款。', skillIds: ['contract'], mcpIds: ['contracts-db'] },
  { id: 'expert:personnel', name: '人员查询专家', source: 'org', owner: 'IT', version: '1.0.0', installs: 32, updatedAt: '11-12', tags: ['查询'],
    summary: '按事由查询人员记录，支持脱敏展示、异常分析与敏感信息审批。', prompt: '通过人员信息库查询人员记录和分析异常。默认脱敏展示，查看完整信息须审批。', skillIds: [], mcpIds: ['personnel'], dashboardTemplate: 'query' },
];

// 市场里的专家头像也按名称分配，彼此不重复。
const expertItems: ExpertItem[] = (() => {
  const taken: FaceSpec[] = [...RESERVED_FACES];
  return expertSeeds.map(seed => {
    const face = pickFace(seed.name, taken);
    taken.push(face);
    return { ...seed, kind: 'expert' as const, description: seed.description ?? seed.summary, face };
  });
})();

const teamItems: TeamItem[] = [
  { id: 'team:brand', kind: 'team', name: '品牌升级专家团', source: 'official', owner: 'AgentOS', version: '1.0.0', installs: 520, updatedAt: '11-04', tags: ['品牌'],
    summary: '调研专家研究竞品，内容专家产出物料，一起完成品牌升级。', description: '由竞品调研专家和品牌内容专家组成。调研专家先整理竞品的品牌主张，内容专家据此产出文案、网页和演示稿。',
    prompt: '品牌升级专家团。竞品调研专家负责研究，品牌内容专家负责内容与物料。', memberIds: ['expert:research', 'expert:brand'], skillIds: [], mcpIds: [] },
  { id: 'team:supply', kind: 'team', name: '供应链风控专家团', source: 'org', owner: '供应链组', version: '1.1.0', installs: 90, updatedAt: '10-29', tags: ['风控'],
    summary: '风险跟进与数据巡检配合，从数据异常追到供应商风险。', description: '由风险跟进专家和数据巡检专家组成。数据巡检发现订单、交付数据异常后，交给风险跟进专家判断影响并跟进。',
    prompt: '供应链风控专家团。数据巡检专家发现异常，风险跟进专家判断影响并跟进处理。', memberIds: ['expert:risk', 'expert:data'], skillIds: ['weekly'], mcpIds: [] },
  { id: 'team:legal', kind: 'team', name: '合同协同专家团', source: 'org', owner: '法务部', version: '0.5.0', installs: 30, updatedAt: '11-07', tags: ['法务'],
    summary: '合同审查后自动整理会议纪要与待办，推动签署流程。', description: '由合同审查专家和会议纪要专家组成。审查意见讨论后，纪要专家整理结论与待办并跟进。',
    prompt: '合同协同专家团。合同审查专家给出审查意见，会议纪要专家整理讨论结论与待办。', memberIds: ['expert:contract', 'expert:minutes'], skillIds: [], mcpIds: [] },
];

export const marketCatalog: MarketItem[] = [...expertItems, ...teamItems, ...skillItems, ...connectorItems];

export function publishedDefinitions(state: BotosState): RecruitableItem[] {
  const latest = new Map<string, RecruitableItem>();
  for (const publication of state.expertPublications ?? []) {
    if (publication.status !== 'approved') continue;
    const { definition } = publication;
    const previous = latest.get(definition.id);
    if (!previous || isNewerVersion(definition.version, previous.version)) latest.set(definition.id, definition);
  }
  return [...latest.values()];
}

export const findItem = (id: string, state?: BotosState) => marketCatalog.find(item => item.id === id) ?? (state && publishedDefinitions(state).find(item => item.id === id));
export const teamMembers = (team: TeamItem): ExpertItem[] => team.memberDefinitions ?? team.memberIds.map(id => findItem(id)).filter((item): item is ExpertItem => item?.kind === 'expert');

export function versionHistory(item: MarketItem, state: BotosState): MarketVersion[] {
  if (item.versions) return item.versions;
  const versions = (state.expertPublications ?? []).filter(publication => publication.status === 'approved' && publication.definition.id === item.id && publication.definition.version !== item.version)
    .map(({ definition }) => ({ version: definition.version, updatedAt: definition.updatedAt, notes: '更新了专家定义。' }));
  return [{ version: item.version, updatedAt: item.updatedAt, notes: '定义版本。' }, ...versions]
    .sort((a, b) => isNewerVersion(a.version, b.version) ? -1 : 1);
}

function isNewerVersion(candidate: string, current: string): boolean {
  const parts = candidate.split('.').map(Number);
  const existing = current.split('.').map(Number);
  return ((parts[0] ?? 0) - (existing[0] ?? 0) || (parts[1] ?? 0) - (existing[1] ?? 0) || (parts[2] ?? 0) - (existing[2] ?? 0)) > 0;
}

export function definitionUpdate(state: BotosState, bot: Bot): RecruitableItem | undefined {
  const item = bot.sourceId ? findItem(bot.sourceId, state) : undefined;
  const current = bot.sourceVersion ?? (bot.sourceId === 'expert:research' ? '2.0.0' : item?.version);
  return item && isRecruitable(item) && current && isNewerVersion(item.version, current) ? item : undefined;
}

/** 条目依赖的全部技能 / 连接器（专家团包含成员的依赖）。 */
export function itemDeps(item: MarketItem): { skillIds: string[]; mcpIds: string[] } {
  if (item.kind === 'skill') return { skillIds: [item.skill.id], mcpIds: [] };
  if (item.kind === 'connector') return { skillIds: [], mcpIds: [item.mcp.id] };
  const parts = item.kind === 'team' ? [item, ...teamMembers(item)] : [item];
  return {
    skillIds: [...new Set(parts.flatMap(p => p.skillIds))],
    mcpIds: [...new Set(parts.flatMap(p => p.mcpIds))],
  };
}

// ───────────────────────── 添加到 AgentOS ─────────────────────────

const catalogSkill = (id: string) => skillItems.find(item => item.skill.id === id)?.skill;
const catalogMcp = (id: string) => connectorItems.find(item => item.mcp.id === id)?.mcp;

export function isInstalled(state: BotosState, item: MarketItem): boolean {
  if (item.kind === 'skill') return state.skills.some(s => s.id === item.skill.id);
  if (item.kind === 'connector') return state.mcps.some(m => m.id === item.mcp.id);
  return state.bots.some(b => b.sourceId === item.id);
}

function ensureDeps(state: BotosState, skillIds: string[], mcpIds: string[]): BotosState {
  let next = state;
  skillIds.forEach(id => {
    const skill = catalogSkill(id);
    if (skill && !next.skills.some(s => s.id === id)) next = botosReducer(next, { type: 'create-skill', skill });
  });
  mcpIds.forEach(id => {
    const mcp = catalogMcp(id);
    if (mcp && !next.mcps.some(m => m.id === id)) next = botosReducer(next, { type: 'create-mcp', mcp });
  });
  return next;
}

const emptyHistory = (): [number, number][] => Array.from({ length: HISTORY_DAYS }, () => [0, 0]);

function createBot(state: BotosState, bot: Omit<Bot, 'face' | 'memory' | 'history' | 'createdAt' | 'model'>, preferred?: FaceSpec): BotosState {
  const taken = state.bots.map(b => b.face);
  const face = preferred && !taken.some(f => f.shape === preferred.shape && f.color === preferred.color) ? preferred : pickFace(bot.name, taken);
  return botosReducer(state, { type: 'create-bot', bot: { ...bot, face, model: '系统默认', memory: [], history: emptyHistory(), createdAt: new Date().toLocaleDateString('zh-CN') } });
}

export function recruitmentName(state: BotosState, item: RecruitableItem): string {
  const names = new Set(state.bots.map(bot => bot.name));
  const count = state.bots.filter(bot => bot.sourceId === item.id).length;
  if (!count && !names.has(item.name)) return item.name;
  let suffix = Math.max(2, count + 1);
  while (names.has(`${item.name} ${suffix}`)) suffix += 1;
  return `${item.name} ${suffix}`;
}

export interface RecruitOptions { name?: string; approvedMcpIds?: string[]; groupId?: string }

export function connectorFor(state: BotosState, id: string): Mcp | undefined {
  return state.mcps.find(mcp => mcp.id === id) ?? catalogMcp(id);
}

function definitionFields(item: RecruitableItem) {
  return {
    prompt: item.prompt,
    skillIds: [...item.skillIds],
    sourceVersion: item.version,
    dashboardTemplate: item.dashboardTemplate ?? inferDashboardTemplate(item.name, item.prompt, item.mcpIds),
    widgetOrder: item.widgetOrder ? [...item.widgetOrder] : undefined,
  };
}

/** 每次招募创建新实例，专家团成员也从各自的定义重新创建。 */
export function recruitItem(state: BotosState, item: RecruitableItem, options: RecruitOptions = {}): BotosState {
  const group = state.bots.find(bot => bot.id === options.groupId && bot.kind === 'group');
  if (options.groupId && (!group || item.kind !== 'expert')) return state;
  const name = options.name?.trim() || recruitmentName(state, item);
  const deps = itemDeps(item);
  let next = ensureDeps(state, deps.skillIds, deps.mcpIds);
  const approved = new Set(options.approvedMcpIds);
  const mcpIds = item.mcpIds.filter(id => approved.has(id) && connectorFor(next, id)?.enabled);
  const memberIds: string[] = [];
  const members = item.kind === 'team' ? teamMembers(item) : [];
  for (const member of members) {
    next = recruitItem(next, member, { approvedMcpIds: options.approvedMcpIds });
    memberIds.push(next.currentId);
  }
  const id = `bot-${uid().slice(0, 8)}`;
  const prefix = `我是从「${item.name}」招募来的，记忆从空开始。${members.length ? `成员：${members.map(member => member.name).join('、')}。` : ''}`;
  next = createBot(next, {
    ...definitionFields(item), id, name, kind: item.kind === 'team' ? 'group' : 'bot', memberIds, sourceId: item.id,
    mcpIds, requiredMcpIds: [...item.mcpIds],
    matured: false, dashboardUpdatedAt: Date.now(),
    capabilityGrants: mcpIds.map(id => ({ kind: 'mcp', id, grantedBy: 'Samhar' })),
    routines: item.routineTemplates?.map(routine => ({ ...routine, id: uid() })),
    messages: [openingMessage(name, item.prompt, item.kind === 'team' ? 'member' : 'bot', prefix)],
  }, item.kind === 'expert' ? item.face : undefined);
  if (!group) return next;
  next = botosReducer(next, { type: 'update-bot', id: group.id, patch: { memberIds: [...group.memberIds, id] } });
  return botosReducer(next, { type: 'select', id: group.id });
}

export function installItem(state: BotosState, item: MarketItem): BotosState {
  if (isRecruitable(item)) return recruitItem(state, item);
  if (isInstalled(state, item)) return state;
  const deps = itemDeps(item);
  return ensureDeps(state, deps.skillIds, deps.mcpIds);
}

export function applyDefinitionUpdate(state: BotosState, bot: Bot, item: RecruitableItem): BotosState {
  const current = state.bots.find(candidate => candidate.id === bot.id);
  if (!current) return state;
  const available = definitionUpdate(state, current);
  if (available?.id !== item.id || available.version !== item.version) return state;
  const next = ensureDeps(state, available.skillIds, available.mcpIds);
  return botosReducer(next, { type: 'update-bot', id: bot.id, patch: {
    ...definitionFields(available), widgetOrder: current.widgetOrder ?? available.widgetOrder,
    requiredMcpIds: [...new Set([...available.mcpIds, ...current.mcpIds])],
  } });
}

// ───────────────────────── 作为插件接入其他产品 ─────────────────────────

export const MARKET_HOST = 'https://market.agentos.example';
const slug = (item: MarketItem) => item.id.replace(':', '/');

/** 远程调用：在任意支持 MCP 的 Agent 里接入该条目，背后由 AgentOS 托管运行（记忆、审批、审计都在 AgentOS）。 */
export function mcpConfig(item: MarketItem): string {
  return JSON.stringify({
    mcpServers: { [`agentos-${item.id.replace(':', '-')}`]: { url: `${MARKET_HOST}/mcp/${slug(item)}`, headers: { Authorization: 'Bearer <企业接入令牌>' } } },
  }, null, 2);
}

/** 整个市场作为一个连接器：第三方 Agent 可以在对话里搜索、添加市场里的内容。 */
export const marketMcpConfig = JSON.stringify({
  mcpServers: { 'agentos-market': { url: `${MARKET_HOST}/mcp`, headers: { Authorization: 'Bearer <企业接入令牌>' } } },
}, null, 2);

export const remoteTools: Record<MarketKind, string[]> = {
  expert: ['submit_task 交代任务', 'get_progress 查询进度', 'get_result 取回成果'],
  team: ['submit_task 交给专家团', 'get_progress 查询各成员进度', 'get_result 取回成果'],
  skill: ['run_skill 运行技能', 'describe 查看输入与产出'],
  connector: ['list_tools 列出工具', 'call_tool 调用工具（需企业授权）'],
};

/** 插件包：只含定义，不含记忆与对话。专家 / 专家团为 JSON 清单，技能为 SKILL.md。 */
export function pluginPackage(item: MarketItem): { filename: string; mime: string; content: string } {
  const base = item.id.replace(':', '-');
  if (item.kind === 'skill') {
    return { filename: `${base}-SKILL.md`, mime: 'text/markdown;charset=utf-8', content: `---\nname: ${item.name}\ndescription: ${item.skill.description}\nversion: ${item.version}\n---\n\n# ${item.name}\n\n${item.skill.description}\n` };
  }
  const deps = itemDeps(item);
  const manifest = item.kind === 'connector'
    ? { type: 'agentos.connector', name: item.name, version: item.version, protocol: 'mcp', url: `${MARKET_HOST}/mcp/${slug(item)}`, tools: item.mcp.tools, credential: item.mcp.credential }
    : {
      type: item.kind === 'team' ? 'agentos.team' : 'agentos.expert', name: item.name, version: item.version, role: item.prompt,
      ...(item.kind === 'team' ? { members: teamMembers(item).map(m => ({ name: m.name, role: m.prompt })) } : {}),
      requires: { skills: deps.skillIds, connectors: deps.mcpIds },
      extensions: { agentos: { face: item.kind === 'expert' ? item.face : undefined, dashboardTemplate: item.dashboardTemplate, widgetOrder: item.widgetOrder, routines: item.routineTemplates } },
    };
  return { filename: `${base}.json`, mime: 'application/json;charset=utf-8', content: JSON.stringify(manifest, null, 2) };
}
