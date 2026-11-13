import type { Bot, WidgetSource } from './botModel';

export interface Routine {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  lastRunAt?: number;
  lastResult?: string;
}

export type TableAction = 'handle' | 'ignore' | 'delegate' | 'review';
export interface ActionRow {
  id: string;
  title: string;
  detail: string;
  actions: readonly TableAction[];
}

const riskActions = ['handle', 'ignore', 'delegate'] as const;
const actionRows: Partial<Record<WidgetSource, readonly ActionRow[]>> = {
  'skill:risk': [
    { id: 'risk-supplier-delay', title: '华东二号供应商交付延期 5 天', detail: '高风险 · 采购 · 周宁', actions: riskActions },
    { id: 'risk-aluminum', title: '铝材单价环比上涨 12%', detail: '中风险 · 采购 · 周宁', actions: riskActions },
    { id: 'risk-certificates', title: '两家备选供应商资质待更新', detail: '低风险 · 质量 · 胡蓉', actions: riskActions },
  ],
  'mcp:github': [
    { id: 'github-pr-482', title: '#482 feat: 专家工作台 Spec 渲染', detail: 'PR · 待评审 · 2 条评论', actions: ['review', 'ignore'] },
    { id: 'github-issue-477', title: '#477 连接器凭证轮换后连接失败', detail: 'Issue · 高优先级 · 3 天前', actions: ['handle', 'delegate'] },
    { id: 'github-pr-471', title: '#471 fix: 记忆导出编码问题', detail: 'PR · 已通过 · 待合并', actions: ['review', 'ignore'] },
  ],
};

export const tableRows = (source: WidgetSource): readonly ActionRow[] => actionRows[source] ?? [];
export const tableActionLabel = (action: TableAction) => ({ handle: '处理', ignore: '忽略', delegate: '交给智能体', review: '请求评审' })[action];
export const tableActionStatus = (action: TableAction) => ({ handle: '已处理', ignore: '已忽略', delegate: '已交给智能体', review: '已请求评审' })[action];

const demoRoutines: Record<string, readonly Routine[]> = {
  research: [
    { id: 'research-digest', name: '每日竞品简报', trigger: '每天 09:00', enabled: true, lastRunAt: Date.parse('2026-11-11T09:00:00-08:00'), lastResult: '已完成' },
    { id: 'research-pr', name: '整理开源项目 PR 更新', trigger: 'GitHub 新 PR', enabled: true },
  ],
  data: [
    { id: 'data-morning-inspection', name: '关键数据表巡检', trigger: '每天 09:00', enabled: true, lastRunAt: Date.parse('2026-11-11T09:00:00-08:00'), lastResult: '发现 3 项异常' },
    { id: 'data-feishu', name: '汇总异常反馈', trigger: '飞书新消息', enabled: false },
  ],
};

export const seedRoutines = (botId: string): Routine[] => (demoRoutines[botId] ?? []).map(routine => ({ ...routine }));

function scheduledTrigger(request: string, cadence: string): string | undefined {
  const time = request.match(/(上午|早上|中午|下午|晚上)?\s*(\d{1,2})(?:[:：](\d{2})|\s*[点时](半|\s*\d{1,2}\s*分)?)\s*/);
  const period = time?.[1] ?? request.match(/早上|上午|中午|下午|晚上/)?.[0];
  let hour = time ? Number(time[2]) : { 中午: 12, 下午: 15, 晚上: 19 }[period ?? ''] ?? 9;
  const minutes = time?.[3] ? Number(time[3]) : time?.[4] === '半' ? 30 : Number(time?.[4]?.match(/\d+/)?.[0] ?? 0);
  if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
  if (hour > 23 || minutes > 59) return undefined;
  return `${cadence} ${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function routineFromRequest(request: string, id: string): Routine | undefined {
  const cadence = request.match(/每天|每日|每周[一二三四五六日天]?|每星期[一二三四五六日天]?/)?.[0];
  const event = /GitHub.*(?:新\s*PR|新建.*拉取请求)/i.test(request) ? 'GitHub 新 PR'
    : /飞书.*(?:新消息|收到.*消息)/.test(request) ? '飞书新消息' : undefined;
  const command = request.match(/给我(?:一份|一条)?|发给我|发一份|发一条|发送|提醒(?:一下)?我?|生成|制作|整理|汇总|检查|巡检|更新|发(?=简报|日报|周报|竞品)/);
  if ((!cadence && !event) || !command || /[？?]$/.test(request.trim())) return undefined;
  const trigger = cadence ? scheduledTrigger(request, cadence.replace('每日', '每天').replace('每星期', '每周')) : event;
  if (!trigger) return undefined;
  const task = request.slice((command.index ?? 0) + command[0].length).replace(/^(一份|一条|一个|一遍)\s*/, '').replace(/[，。！？,.!?].*$/, '').trim().slice(0, 36);
  const name = task === '简报' && trigger.startsWith('每天') ? '每日简报' : task || (command[0].startsWith('提醒') ? '事件提醒' : '定期任务');
  return { id, name, trigger, enabled: true };
}

export interface WorkspaceFile {
  id: string;
  name: string;
  folder: 'artifacts' | 'uploads' | 'logs';
  kind: 'presentation' | 'document' | 'web';
  at?: number;
  time?: string;
  author?: string;
  body?: string;
}

export function runRoutine(routine: Routine, at: number, runId: string) {
  const date = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short' }).format(at);
  const artifact: WorkspaceFile = {
    id: runId, name: `${routine.name.replace(/[\\/:*?"<>|]/g, '-')} ${date}.md`, folder: 'artifacts', kind: 'document', at,
    body: `# ${routine.name}\n\n本次运行已完成。已整理相关事项与后续跟进建议。\n\n触发方式：手动运行\n\n已配置的触发条件：${routine.trigger}`,
  };
  const log: WorkspaceFile = {
    id: `${runId}:log`, name: `routine-${date}-${runId.slice(-8)}.log`, folder: 'logs', kind: 'document', at,
    body: `[${new Date(at).toISOString()}] ${routine.name}\n触发方式：手动运行\n状态：已完成\n成果：${artifact.name}`,
  };
  return { routine: { ...routine, lastRunAt: at, lastResult: '已完成' }, artifact, log, text: `Routine「${routine.name}」已完成，成果已保存到工作区。` };
}

const demoFiles: Record<string, readonly WorkspaceFile[]> = {
  work: [
    { id: 'work-brand-brief', name: '品牌升级素材说明.md', folder: 'uploads', kind: 'document', time: '11-06 09:30',
      body: '# 品牌升级素材说明\n\n本轮需要准备产品介绍网页和项目周会资料。\n\n主张：让复杂工作，变得清晰。\n\n网站首屏突出统一工作空间、长期职责和团队协作。' },
  ],
  data: [
    { id: 'data-inspection-log', name: '数据巡检运行日志.log', folder: 'logs', kind: 'document', time: '11-12 08:00',
      body: '[08:00:01] 检查 48 张数据表\n[08:00:04] 发现 3 项异常\n[08:00:06] 已保存巡检报告' },
  ],
};

export const seedWorkspaceFiles = (botId: string): WorkspaceFile[] => (demoFiles[botId] ?? []).map(file => ({ ...file }));

function fileKind(name: string): WorkspaceFile['kind'] {
  if (/\.pptx?$/i.test(name)) return 'presentation';
  if (/\.html?$/i.test(name)) return 'web';
  return 'document';
}

const sampleDocuments: Record<string, string> = {
  '项目总结示例.md': '# 项目总结\n\n品牌升级完成了主张收敛和网页初稿，已将两项方向提交评审。\n\n下周安排\n\n核对产品案例、确认页面文案，并在项目周会上评审演示稿。',
  '供应链风险评估报告.md': '# 供应链风险评估报告\n\n华东二号供应商交付预计延期 5 天。采购需确认备选供应商交期。\n\n铝材单价环比上涨 12%，建议复核近期采购批次与报价差异。',
  '数据巡检专家报告.md': '# 数据巡检报告\n\n已检查 48 张表，发现 3 项异常。\n\ndw_orders.amount 有 0.4% 负值，已定位到上游退款同步。建议复核退款记录后再决定是否回滚。',
  'Grok 专家动态整理.md': '# Grok 专家动态\n\n团队记忆与个人记忆分开保存。技能与工具在账号级共享。\n\n关注项\n\n比较能力授权、智能体隔离和长期职责的差异。',
};

export function workspaceFiles(bot: Pick<Bot, 'name' | 'messages' | 'files'>): WorkspaceFile[] {
  const saved = bot.files ?? [];
  const knownIds = new Set(saved.map(file => file.id));
  const messages = bot.messages.slice().reverse().flatMap(message => {
    const { attachment, id, time, text, name } = message;
    if (!attachment || knownIds.has(id)) return [];
    return [{
      id, name: attachment, folder: 'artifacts' as const, kind: fileKind(attachment),
      at: message.at, time, author: name || bot.name, body: sampleDocuments[attachment] ?? text,
    }];
  });
  return [...saved.map(file => ({ ...file, author: file.author ?? bot.name })), ...messages].sort(newestFileFirst);
}

export const newestFileFirst = (a: WorkspaceFile, b: WorkspaceFile) => (b.at ?? 0) - (a.at ?? 0);

export const samplePresentation = [
  { title: '品牌升级提案', body: '让复杂工作，变得清晰' },
  { title: '品牌定位', body: '把重复性的企业工作交给长期存在、承担明确职责的智能体。' },
  { title: '下一步', body: '确认产品案例和首页文案，再邀请项目团队评审。' },
] as const;

export function webSample(file: WorkspaceFile) {
  const title = file.name.replace(/\.html?$/i, '');
  if (title === '品牌产品介绍') return { title, headline: '让复杂工作，变得清晰', body: '把企业的方法沉淀到智能体工作空间。' };
  return { title, headline: title, body: file.body || '这个智能体生成的网页样例。' };
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);

interface TextDownload { name: string; mime: string; text: string }
interface AssetDownload { name: string; url: string; bytes: number }

export function fileDownload(file: WorkspaceFile): TextDownload | AssetDownload {
  if (file.kind === 'presentation') {
    return { name: file.name.replace(/\.ppt$/i, '.pptx'), url: '/samples/brand-proposal.pptx', bytes: 24662 };
  }
  if (file.kind === 'web') {
    const sample = webSample(file);
    return { name: file.name, mime: 'text/html;charset=utf-8',
      text: `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(sample.title)}</title><style>body{font:18px system-ui;color:#222d45;background:#faf8f4;margin:10vh auto;padding:0 24px;max-width:44rem}h1{font-size:clamp(2rem,8vw,4rem);line-height:1.15}p{line-height:1.6}</style><main><p>${escapeHtml(sample.title)}</p><h1>${escapeHtml(sample.headline)}</h1><p>${escapeHtml(sample.body)}</p></main></html>` };
  }
  return { name: file.name, mime: 'text/plain;charset=utf-8', text: file.body ?? file.name };
}
