import { memberBots, uid, type Bot, type BotosState, type WidgetSlot } from './botModel';
import { inferDashboardTemplate } from './dashboardTemplates';
import { isRecruitable, marketCatalog, type ExpertItem, type RecruitableItem, type RoutineTemplate } from './marketCatalog';

export interface ExpertPublication {
  id: string;
  botId: string;
  definition: RecruitableItem;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export const publicationStatus: Record<ExpertPublication['status'], string> = {
  draft: '已沉淀', pending: '审批中', approved: '已上架', rejected: '已退回',
};

/** 识别需要先从定义中移除的手机号和身份证号。 */
export function sensitivePromptFields(prompt: string): string[] {
  const normalized = prompt.normalize('NFKC');
  const fields: string[] = [];
  if (/(?<!\d)\d{6}[ -]?(?:18|19|20)\d{2}[ -]?\d{2}[ -]?\d{2}[ -]?\d{3}[\dXx](?!\d)/.test(normalized)) fields.push('身份证号');
  if (/(?<!\d)(?:\+?86[ -]?)?1[3-9]\d[ -]?\d{4}[ -]?\d{4}(?!\d)/.test(normalized)) fields.push('手机号');
  return fields;
}

export function availableDefinitions(state: BotosState): RecruitableItem[] {
  const latest = new Map<string, RecruitableItem>();
  for (const { definition } of state.expertPublications ?? []) {
    if (!latest.has(definition.id)) latest.set(definition.id, definition);
  }
  return [...marketCatalog.filter(isRecruitable), ...latest.values()];
}

function definitionFields(bot: Bot, prompt: string, updatedAt: string) {
  const mcpIds = [...new Set([...(bot.requiredMcpIds ?? []), ...bot.mcpIds])];
  const summary = prompt.slice(0, 90) || `${bot.name}的可复用定义。`;
  return {
    name: bot.name, summary, description: prompt || summary,
    source: 'mine' as const, owner: 'Samhar', installs: 0, updatedAt, tags: [],
    prompt, skillIds: [...bot.skillIds], mcpIds,
    dashboardTemplate: bot.dashboardTemplate ?? inferDashboardTemplate(bot.name, prompt, mcpIds),
    widgetOrder: [...(bot.widgetOrder ?? [])],
  };
}

interface CaptureOptions { prompt: string; publish: boolean; routineTemplates: RoutineTemplate[]; panelWidgets: WidgetSlot[] }

export function createPublication(state: BotosState, bot: Bot, options: CaptureOptions): ExpertPublication | undefined {
  if (bot.kind !== 'bot' && bot.kind !== 'group') return undefined;
  const prompt = options.prompt.trim();
  const members = bot.kind === 'group' ? memberBots(state, bot).filter(member => member.kind === 'bot') : [];
  if (sensitivePromptFields(prompt).length || members.some(member => sensitivePromptFields(member.prompt).length)) return undefined;

  const submittedAt = new Date().toISOString();
  const updatedAt = submittedAt.slice(0, 10);
  const revision = (state.expertPublications ?? []).filter(publication => publication.botId === bot.id).length;
  const fields = {
    ...definitionFields(bot, prompt, updatedAt), version: `1.0.${revision}`,
    widgetOrder: options.panelWidgets.map(widget => widget.id),
    routineTemplates: options.routineTemplates.map(({ name, trigger, enabled }) => ({ name, trigger, enabled })),
  };
  const memberDefinitions: ExpertItem[] = members.map(member => ({
    ...definitionFields(member, member.prompt, updatedAt), id: `expert:member-${bot.id}-${member.id}`, kind: 'expert', version: fields.version,
    face: { ...member.face },
  }));
  const definition: RecruitableItem = bot.kind === 'group'
    ? { ...fields, kind: 'team', id: `team:local-${bot.id}`, memberIds: memberDefinitions.map(member => member.id), memberDefinitions }
    : { ...fields, kind: 'expert', id: `expert:local-${bot.id}`, face: { ...bot.face } };

  return { id: uid(), botId: bot.id, definition, status: options.publish ? 'pending' : 'draft', submittedAt };
}
