import { seeded, waitingFor, type Bot, type BotosState } from './botModel';
import { maturityFor, runTotals } from './botMaturity';
import { hasGrant } from './capabilities';
import { catalogFor, findItem, isRecruitable, versionHistory, type ConnectorItem, type RecruitableItem, type SkillItem } from './marketCatalog';
import { workspaceFiles } from './workspaceWidgets';

export type RecommendationFilter = 'popular' | 'department' | 'new';

export function personalHome(state: BotosState) {
  const bots = [...state.bots];
  const order = new Map(state.order.map((id, index) => [id, index]));
  bots.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));

  const pending = new Map(state.pending.map(task => [task.botId, task]));
  const agents = bots.map(bot => {
    const waiting = waitingFor(bot).reverse();
    const task = pending.get(bot.id);
    const status = task ? 'working' as const : waiting.length ? 'needs' as const : 'idle' as const;
    const latestArtifact = workspaceFiles(bot).find(file => file.folder === 'artifacts');
    return { bot, waiting, status, latestArtifact, currentTask: task?.request ?? waiting[0]?.title, maturity: maturityFor(bot) };
  });
  const waiting = agents.flatMap(({ bot, waiting }) => waiting.map(item => ({ ...item, bot })))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  return { agents, waiting, working: agents.filter(agent => agent.status === 'working').length };
}

function catalogRunHistory(item: RecruitableItem): Bot['history'] {
  const random = seeded(item.id);
  return Array.from({ length: 7 }, () => {
    const completed = Math.round((item.installs / 65 + 4) * (.8 + random() * .4));
    return [completed, Math.round(completed * random() * .2)];
  });
}

export function expertUsage(state: BotosState, item: RecruitableItem) {
  const sourceId = state.expertPublications?.find(publication => publication.definition.id === item.id)?.botId;
  const matching = state.bots.filter(bot => bot.sourceId === item.id || bot.id === sourceId);
  const liveHistory = matching.flatMap(bot => bot.history);
  const live = runTotals(liveHistory);
  const mockHistory = item.installs ? catalogRunHistory(item) : [];
  const weeklyRuns = runTotals([...mockHistory, ...matching.flatMap(bot => bot.history.slice(-7))]).totalRuns;
  const recruitments = item.installs + state.bots.filter(bot => bot.sourceId === item.id && bot.id !== sourceId).length;
  return { successRate: live.successRate ?? runTotals(mockHistory).successRate, weeklyRuns, recruitments };
}

export function agentRecruitments(state: BotosState, bot: Bot) {
  const published = state.expertPublications?.find(publication => publication.botId === bot.id && publication.status === 'approved');
  if (published) return { count: expertUsage(state, published.definition).recruitments, catalog: false };
  const item = bot.sourceId ? findItem(bot.sourceId, state) : undefined;
  return { count: item && isRecruitable(item) ? item.installs : 0, catalog: !!item };
}

function listingDate(state: BotosState, item: RecruitableItem) {
  // The static catalog uses MM-DD; user submissions use full ISO dates.
  const date = versionHistory(item, state).at(-1)?.updatedAt ?? item.updatedAt;
  return date.length === 5 ? `2026-${date}` : date;
}

export function recommendedExperts(state: BotosState, filter: RecommendationFilter, catalog = catalogFor(state)) {
  const available = catalog.filter(isRecruitable);
  if (filter === 'new') {
    return available.map(item => ({ item, listedAt: listingDate(state, item) }))
      .sort((a, b) => b.listedAt.localeCompare(a.listedAt)).slice(0, 4)
      .map(({ item }) => ({ item, ...expertUsage(state, item) }));
  }
  const departmentAgents = state.bots.find(bot => bot.id === 'brand-team')?.memberIds ?? [];
  const departmentSources = new Set(state.bots.filter(bot => departmentAgents.includes(bot.id)).map(bot => bot.sourceId));
  return available.filter(item => filter !== 'department' || item.owner === '品牌组' || item.tags.includes('品牌') || departmentSources.has(item.id))
    .map(item => ({ item, ...expertUsage(state, item) }))
    .sort((a, b) => b.weeklyRuns - a.weeklyRuns || b.recruitments - a.recruitments).slice(0, 4);
}

const relevantWork: Record<string, RegExp> = {
  'skill:weekly': /周报|报告|简报|总结|汇报/,
  'skill:research': /调研|竞品|研究/,
  'skill:risk': /供应链|风险|采购/,
  'skill:inspect': /巡检|数据|异常/,
  'skill:brand': /品牌|文案|内容/,
  'skill:slides': /演示稿|提案|汇报|PPT/i,
  'skill:minutes': /纪要|会议|办公|周会/,
  'skill:contract': /合同|法务|条款/,
  'connector:feishu': /飞书|群聊|文档|群/,
  'connector:github': /代码|研发|PR|Issue|开源/i,
  'connector:warehouse': /数据仓库|巡检|数据表/,
  'connector:erp': /采购|供应商|供应链/,
  'connector:websearch': /调研|竞品|公开资料/,
  'connector:dingtalk': /群聊|通知|办公|会议/,
  'connector:contracts-db': /合同|法务/,
  'connector:personnel': /人员查询|人事|人员记录/,
};

export function recommendedCapabilities(state: BotosState, catalog = catalogFor(state)) {
  const agents = state.bots;
  const taskByBot = new Map(state.pending.map(task => [task.botId, task.request]));
  const suggestions = catalog.filter((item): item is SkillItem | ConnectorItem => item.kind === 'skill' || item.kind === 'connector')
    .flatMap(item => {
      const connector = item.kind === 'connector';
      const capability = connector ? item.mcp : item.skill;
      const match = relevantWork[item.id];
      if (!match || (item.kind === 'connector' && !item.mcp.enabled)) return [];
      const candidate = agents.find(bot => !hasGrant(bot, connector ? 'mcp' : 'skill', capability.id) &&
        match.test([bot.name, bot.prompt, taskByBot.get(bot.id), ...bot.messages.slice(-3).map(message => message.text)].join(' ')));
      if (!candidate) return [];
      const usedBy = agents.filter(bot => hasGrant(bot, connector ? 'mcp' : 'skill', capability.id)).length;
      return [{ item, reason: `「${candidate.name}」用得上${usedBy ? ` · ${usedBy} 个智能体在用` : ''}`, usedBy }];
    })
    .sort((a, b) => b.usedBy - a.usedBy || b.item.installs - a.item.installs);

  return ['skill', 'connector'].flatMap(kind => suggestions.filter(entry => entry.item.kind === kind).slice(0, 2));
}
