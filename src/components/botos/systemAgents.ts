// 系统管理智能体的对话：专家管理 / 技能管理 / 连接器管理。
// 原型按关键词理解意图，直接修改右侧面板对应的数据；之后可以换成由模型理解并调用工具。

import { botosReducer, isAgent, uid, type BotosState, type SystemRole } from './botModel';
import { isInstalled, marketCatalog, type ExpertItem, type TeamItem } from './marketCatalog';

export interface SystemReply { text: string; state?: BotosState; openCreate?: boolean }

/** 从「新建一个『投诉分析』技能」或「接入 工单系统」里取出名字。 */
function extractName(text: string, noun: RegExp): string | null {
  const quoted = text.match(/[「『“"']([^」』”"']{1,24})[」』”"']/);
  if (quoted) return quoted[1].trim();
  const stripped = text
    .replace(/^(帮我|请|麻烦)?(新建|创建|添加|接入|沉淀|做)(一个|一下|成)?/, '')
    .replace(noun, '')
    .replace(/[，。,.!！?？：:].*$/, '')
    .trim();
  return stripped && stripped.length <= 16 && !/^(新|一个|一段|做法)$/.test(stripped) ? stripped : null;
}

function skills(state: BotosState, text: string): SystemReply {
  if (/失败|出错|质量|优化/.test(text)) {
    const worst = [...state.skills].sort((a, b) => b.failRate - a.failRate).slice(0, 3);
    return { text: `失败率最高的技能：${worst.map(s => `「${s.name}」${(s.failRate * 100).toFixed(0)}%`).join('、')}。点开右侧对应的技能，可以看到哪些智能体在用它。要我先优化哪一个？` };
  }
  if (/新建|创建|添加|沉淀|做一个/.test(text)) {
    const name = extractName(text, /技能/g);
    if (!name) return { text: '好的。这个技能叫什么、做什么用？比如：「投诉分析：从工单里归纳投诉原因和占比」。' };
    if (state.skills.some(s => s.name === name)) return { text: `已经有一个叫「${name}」的技能了，在右侧列表里可以找到。要改它，直接告诉我改什么。` };
    const next = botosReducer(state, { type: 'create-skill', skill: {
      id: `skill-${uid().slice(0, 8)}`, name, description: text.includes('：') ? text.split('：').slice(1).join('：') : `由技能智能体创建：${text}`,
      category: '通用', version: '0.1.0', owner: 'Samhar', calls: 0, failRate: 0, widgets: [], createdByUser: true,
    } });
    return { text: `已创建技能「${name}」（v0.1.0），右侧列表里可以看到。智能体需要这类能力时会自己用上它；想发布到企业市场，告诉我一声。`, state: next };
  }
  return { text: '我可以帮你新建、修改技能，或者找出需要优化的技能。比如说：「新建一个『投诉分析』技能」。' };
}

function connectors(state: BotosState, text: string): SystemReply {
  if (/停用/.test(text)) {
    const off = state.mcps.filter(m => !m.enabled);
    return { text: off.length ? `已停用的连接器：${off.map(m => `「${m.name}」`).join('、')}。点开可以重新启用。` : `${state.mcps.length} 个连接器目前都在启用状态。` };
  }
  if (/凭证|vault|密钥|权限/i.test(text)) {
    const vault = state.mcps.filter(m => m.credential === 'vault');
    return { text: `${vault.length} 个连接器的凭证托管在 Vault，智能体只能通过连接器访问，拿不到凭证本身。不需要凭证的：${state.mcps.filter(m => m.credential === 'none').map(m => `「${m.name}」`).join('、') || '无'}。` };
  }
  if (/接入|新建|添加|连接|对接/.test(text)) {
    const name = extractName(text, /(连接器|系统|一个新)/g);
    if (!name) return { text: '好的。要接入哪个系统？告诉我名字和地址就行，比如：「接入『工单系统』，地址 mcp://ticket.internal」。凭证由管理员在 Vault 里配置。' };
    const endpoint = text.match(/(mcp|https?):\/\/\S+/)?.[0] ?? `mcp://${encodeURIComponent(name)}.internal`;
    const next = botosReducer(state, { type: 'create-mcp', mcp: {
      id: `mcp-${uid().slice(0, 8)}`, name, kind: 'custom', endpoint, tools: [], credential: 'vault', enabled: true, owner: 'Samhar', calls: 0, widgets: [], createdByUser: true,
    } });
    return { text: `已登记连接器「${name}」（${endpoint}），右侧列表里可以看到。正式使用前需要管理员在 Vault 里配置凭证。`, state: next };
  }
  return { text: '我可以帮你接入新系统、启用或停用连接器、检查凭证。比如说：「接入『工单系统』」。' };
}

function experts(state: BotosState, text: string): SystemReply {
  if (/沉淀/.test(text)) {
    const candidates = state.bots.filter(b => isAgent(b) && !b.matured);
    return { text: candidates.length
      ? `这些智能体还没有沉淀：${candidates.map(b => `「${b.name}」`).join('、')}。打开它，在工作台右上角点「沉淀为专家」（智能体群是「沉淀为专家团」）。`
      : '你的智能体都已经沉淀为专家或专家团了。' };
  }
  if (/新建|创建/.test(text)) return { text: '好的，给它起个名字、选个头像就能开始。', openCreate: true };
  if (/推荐|找|有哪些|市场/.test(text)) {
    const recs = marketCatalog.filter((i): i is ExpertItem | TeamItem => (i.kind === 'expert' || i.kind === 'team') && !isInstalled(state, i))
      .sort((a, b) => b.installs - a.installs).slice(0, 3);
    return { text: recs.length
      ? `可以看看这几个：${recs.map(r => `「${r.name}」（${r.summary}）`).join('；')}。在右上角头像菜单的「市场」里可以添加，或点左下角「+」在推荐里直接添加。`
      : '市场里的专家你都添加过了。' };
  }
  return { text: '我可以帮你找专家、新建智能体，或把用得好的智能体沉淀为专家。你想做哪件？' };
}

const handlers: Record<SystemRole, (state: BotosState, text: string) => SystemReply> = { skills, connectors, experts };
export const systemReply = (role: SystemRole, state: BotosState, text: string) => handlers[role](state, text);
