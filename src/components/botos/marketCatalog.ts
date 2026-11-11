// Agent Market：专家、专家团、技能、连接器的统一市场。
// 市场里上架的是「定义」（无状态、可移植）；添加到 AgentOS 后才实例化为有记忆的专家。
// 每个条目同时可以作为插件接入其他产品：远程调用（连接器）或下载插件包。

import { RESERVED_FACES, pickFace, type FaceSpec } from './botFaces';
import { botosReducer, uid, type Bot, type BotosState, type Mcp, type Skill } from './botModel';
import { seedMcps, seedSkills } from './botosSeed';
import { openingMessage } from './firstTask';

export type MarketKind = 'expert' | 'team' | 'skill' | 'connector';
export type MarketSource = 'official' | 'org' | 'mine';

interface MarketBase {
  id: string; kind: MarketKind; name: string; summary: string; description: string;
  source: MarketSource; owner: string; version: string; installs: number; updatedAt: string; tags: string[];
}
export interface ExpertItem extends MarketBase { kind: 'expert'; prompt: string; skillIds: string[]; mcpIds: string[]; face: FaceSpec }
export interface TeamItem extends MarketBase { kind: 'team'; prompt: string; memberIds: string[]; skillIds: string[]; mcpIds: string[] }
export interface SkillItem extends MarketBase { kind: 'skill'; skill: Skill }
export interface ConnectorItem extends MarketBase { kind: 'connector'; mcp: Mcp }
export type MarketItem = ExpertItem | TeamItem | SkillItem | ConnectorItem;

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
  { id: 'expert:research', name: '竞品调研专家', source: 'official', owner: 'AgentOS', version: '2.0.0', installs: 1340, updatedAt: '11-05', tags: ['调研'],
    summary: '持续跟踪竞品的产品更新、定价与开源动向，定期给出结论。', prompt: '持续跟踪竞品动态。用网页调研整理产品更新、定价与开源动向，每周给出结论。', skillIds: ['research', 'weekly'], mcpIds: ['websearch', 'github'] },
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

export const findItem = (id: string) => marketCatalog.find(item => item.id === id);
export const teamMembers = (team: TeamItem): ExpertItem[] => team.memberIds.map(findItem).filter((item): item is ExpertItem => item?.kind === 'expert');

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

const emptyHistory = (): [number, number][] => Array.from({ length: 56 }, () => [0, 0]);

function createBot(state: BotosState, bot: Omit<Bot, 'face' | 'memory' | 'history' | 'createdAt' | 'model'>, preferred?: FaceSpec): BotosState {
  const taken = state.bots.map(b => b.face);
  const face = preferred && !taken.some(f => f.shape === preferred.shape && f.color === preferred.color) ? preferred : pickFace(bot.name, taken);
  return botosReducer(state, { type: 'create-bot', bot: { ...bot, face, model: '系统默认', memory: [], history: emptyHistory(), createdAt: new Date().toLocaleDateString('zh-CN') } });
}

function ensureExpert(state: BotosState, expert: ExpertItem): [BotosState, string] {
  const existing = state.bots.find(b => b.sourceId === expert.id);
  if (existing) return [state, existing.id];
  const next = ensureDeps(state, expert.skillIds, expert.mcpIds);
  const id = `bot-${uid().slice(0, 8)}`;
  return [createBot(next, {
    id, name: expert.name, kind: 'bot', prompt: expert.prompt, skillIds: expert.skillIds, mcpIds: expert.mcpIds, memberIds: [], sourceId: expert.id,
    messages: [openingMessage(expert.name, expert.prompt)],
  }, expert.face), id];
}

/** 把市场条目添加到 AgentOS：缺的技能 / 连接器一起带上；专家团会先添加成员专家。纯函数，返回新状态。 */
export function installItem(state: BotosState, item: MarketItem): BotosState {
  if (isInstalled(state, item)) return state;
  if (item.kind === 'skill' || item.kind === 'connector') {
    const deps = itemDeps(item);
    return ensureDeps(state, deps.skillIds, deps.mcpIds);
  }
  if (item.kind === 'expert') return ensureExpert(state, item)[0];
  let next = ensureDeps(state, item.skillIds, item.mcpIds);
  const memberIds: string[] = [];
  teamMembers(item).forEach(member => {
    const [after, id] = ensureExpert(next, member);
    next = after;
    memberIds.push(id);
  });
  const id = `bot-${uid().slice(0, 8)}`;
  return createBot(next, {
    id, name: item.name, kind: 'group', prompt: item.prompt, skillIds: item.skillIds, mcpIds: item.mcpIds, memberIds, sourceId: item.id,
    messages: [openingMessage(item.name, item.prompt, 'member', `成员：${teamMembers(item).map(m => m.name).join('、')}。`)],
  });
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
      extensions: { agentos: { face: item.kind === 'expert' ? item.face : undefined } },
    };
  return { filename: `${base}.json`, mime: 'application/json;charset=utf-8', content: JSON.stringify(manifest, null, 2) };
}
