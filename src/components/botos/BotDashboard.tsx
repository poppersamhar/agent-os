import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Sprout, CircleCheck, CircleDot, GitPullRequest, MessageSquare, TriangleAlert } from 'lucide-react';
import { HISTORY_DAYS, composeDashboard, faceStateOf, memberBots, pendingCount, seeded, waitingFor, type Bot, type BotosState, type WaitingItem, type WidgetSlot } from './botModel';
import BotAvatar from './BotAvatar';
import type { FaceState } from './botFaces';
import { AuditWidget, PersonnelWidget } from './PersonnelWidget';
import { type PersonnelAction, type PersonnelInput } from './personnel';
import { ActionTableWidget, ArtifactPreviewWidget, RecentArtifactsWidget, RoutinesWidget, WorkspaceWidget } from './AgentWidgets';
import { workspaceFiles, type TableAction, type WorkspaceFile } from './workspaceWidgets';
import { CapabilitiesWidget } from './GovernanceWidgets';
import { maturityFor } from './botMaturity';
import { applyDefinitionUpdate, definitionUpdate } from './marketCatalog';

// 固定的 Widget 组件库：Spec 只声明「放什么」，这里负责「怎么画」。

interface DashboardActions {
  onSelectBot: (id: string, messageId?: string) => void;
  onAsk: (slot: WidgetSlot) => void;
  onRefresh: (slot: WidgetSlot) => void;
  onDashboardChange: (undo: boolean) => void;
  onRequestConnector: (id: string) => void;
  onPersonnel: (slot: WidgetSlot, mode: PersonnelAction, input: PersonnelInput) => void;
  onReveal: (id: string) => void;
  onRoutineToggle: (id: string) => void;
  onRoutineRun: (id: string) => void;
  onTableAction: (source: WidgetSlot['source'], id: string, action: TableAction) => void;
  onGroupRecruit: () => void;
  onCapture: () => void;
  onApplyDefinition: (next: BotosState) => void;
}

interface Ctx extends DashboardActions {
  state: BotosState; bot: Bot; scope: Bot[]; recentlyDone: string[];
  preview?: WorkspaceFile;
  onPreview: (file: WorkspaceFile) => void;
}

function scopeBots(state: BotosState, bot: Bot): Bot[] {
  if (bot.kind === 'group') return [bot, ...state.bots.filter(b => bot.memberIds.includes(b.id))];
  return [bot];
}

function sumHistory(bots: Bot[]): [number, number][] {
  return Array.from({ length: HISTORY_DAYS }, (_, day) => bots.reduce<[number, number]>((acc, b) => {
    const d = b.history[day] ?? [0, 0];
    return [acc[0] + d[0], acc[1] + d[1]];
  }, [0, 0]));
}

function Waiting(ctx: Ctx) {
  const items: WaitingItem[] = ctx.scope.flatMap(waitingFor);
  const first = items[0];
  if (!first) return <p className="bos-empty-note">暂时没有需要你处理的事</p>;
  return <div className="bos-waiting">
    <p className="bos-big"><strong>{items.length}</strong><span>件待处理</span></p>
    <button type="button" className="bos-primary-action" onClick={() => ctx.onSelectBot(first.botId, first.messageId)}>去处理 <ArrowRight size={14} /></button>
  </div>;
}

function Agents(ctx: Ctx) {
  const bots = memberBots(ctx.state, ctx.bot);
  return <div className="bos-agents">
    <div className="bos-agents-grid">{bots.map(b => {
      const face = faceStateOf(ctx.state, b, ctx.recentlyDone);
      const label = { working: '工作中', done: '刚完成', needs: '需要你', idle: `${b.skillIds.length} 项技能 · ${b.mcpIds.length} 个连接器` }[face];
      return <button type="button" key={b.id} className={`bos-agent bos-agent--${face}`} onClick={() => ctx.onSelectBot(b.id)} title={`打开 ${b.name}`}>
        <BotAvatar bot={b} size={42} state={face} members={memberBots(ctx.state, b)} />
        <span>{b.name}</span>
        <small>{label}</small>
      </button>;
    })}</div>
  </div>;
}

function Runs(ctx: Ctx) {
  const [range, setRange] = useState<28 | 56>(56);
  const history = sumHistory(ctx.scope).slice(-range);
  const peak = Math.max(...history.map(d => d[0] + d[1]), 1);
  const rows = 10;
  const unit = Math.max(1, Math.ceil(peak / rows));
  const totalAuto = history.reduce((n, d) => n + d[0], 0);
  const totalNeeded = history.reduce((n, d) => n + d[1], 0);
  const labels = [0, Math.floor(history.length / 3), Math.floor((history.length * 2) / 3), history.length - 1];
  const dateOf = (i: number) => { const d = new Date(); d.setDate(d.getDate() - (history.length - 1 - i)); return `${d.getMonth() + 1}/${d.getDate()}`; };
  return <div className="bos-runs">
    <div className="bos-runs-toolbar">
      <span className="bos-chip"><i className="is-auto" />自动完成 {totalAuto}</span>
      <span className="bos-chip"><i className="is-needed" />需要你 {totalNeeded}</span>
      <div className="bos-segment" role="group" aria-label="时间范围">
        {([28, 56] as const).map(n => <button type="button" key={n} aria-pressed={range === n} onClick={() => setRange(n)}>{n} 天</button>)}
      </div>
    </div>
    <div className="bos-dots" style={{ gridTemplateColumns: `repeat(${history.length}, minmax(0, 1fr))` }} role="img" aria-label={`近 ${range} 天运行 ${totalAuto + totalNeeded} 次，其中需要你介入 ${totalNeeded} 次`}>
      {history.map(([auto, needed], day) => <div key={day} className="bos-dot-col">
        {Array.from({ length: rows }, (_, row) => {
          const level = rows - row; // 从上到下
          const filled = Math.ceil((auto + needed) / unit);
          const neededTop = needed > 0 && level === filled;
          return <i key={row} className={level <= filled ? (neededTop ? 'is-needed' : 'is-auto') : ''} />;
        })}
      </div>)}
    </div>
    <div className="bos-runs-axis">{labels.map(i => <span key={i}>{dateOf(i)}</span>)}</div>
  </div>;
}

const sampleFeed = [
  { who: '品牌升级群 · 李然', text: '首页的主视觉什么时候能定？' },
  { who: '项目周会 · 王珂', text: '@办公专家帮忙把会议纪要发一下' },
  { who: '供应商沟通群 · 陈一', text: '延期方案明天上午给到' },
];
const sampleRepo = [
  { kind: 'pr', title: '#482 feat: 专家工作台 Spec 渲染', meta: '待评审 · 2 条评论' },
  { kind: 'issue', title: '#477 连接器凭证轮换后连接失败', meta: '高优先级 · 3 天前' },
  { kind: 'pr', title: '#471 fix: 记忆导出编码问题', meta: '已通过 · 待合并' },
];
const sampleSources = [
  { title: 'Designing Grok Bot', site: 'x.ai', finding: '技能与工具放在账号级，记忆属于专家' },
  { title: 'Grok 专家团队版发布', site: 'memorylake.ai', finding: '团队记忆与个人记忆分开保存' },
  { title: 'Dify 1.9 更新说明', site: 'dify.ai', finding: '工作流支持连接器节点' },
];
const sampleAlerts = [
  { level: 'high', title: '华东二号供应商交付延期 5 天', owner: '采购 · 周宁' },
  { level: 'mid', title: '铝材单价环比上涨 12%', owner: '采购 · 周宁' },
  { level: 'low', title: '两家备选供应商资质待更新', owner: '质量 · 胡蓉' },
];
const sampleChecks = [
  { ok: true, name: '订单表主键唯一' },
  { ok: false, name: 'amount 非负' },
  { ok: true, name: '每日 6 点前入仓' },
  { ok: false, name: '客户 ID 可关联' },
];

function Feed() {
  return <ul className="bos-list">{sampleFeed.map(f => <li key={f.text}><MessageSquare size={14} /><div><strong>{f.text}</strong><small>{f.who}</small></div></li>)}</ul>;
}
function Repo() {
  return <ul className="bos-list">{sampleRepo.map(r => <li key={r.title}>{r.kind === 'pr' ? <GitPullRequest size={14} /> : <CircleDot size={14} />}<div><strong>{r.title}</strong><small>{r.meta}</small></div></li>)}</ul>;
}
function Sources() {
  return <ul className="bos-list bos-list--sources">{sampleSources.map(s => <li key={s.title}><span className="bos-site">{s.site}</span><div><strong>{s.title}</strong><small>{s.finding}</small></div></li>)}</ul>;
}
function Alerts() {
  return <ul className="bos-list">{sampleAlerts.map(a => <li key={a.title}><TriangleAlert size={14} className={`bos-level bos-level--${a.level}`} /><div><strong>{a.title}</strong><small>{a.owner}</small></div></li>)}</ul>;
}
function Checks() {
  const failed = sampleChecks.filter(c => !c.ok).length;
  return <div><p className="bos-check-summary">{sampleChecks.length - failed}/{sampleChecks.length} 通过</p><ul className="bos-checks">{sampleChecks.map(c => <li key={c.name} className={c.ok ? '' : 'is-fail'}><CircleCheck size={13} />{c.name}</li>)}</ul></div>;
}
function Trend({ bot }: Ctx) {
  const points = useMemo(() => { const r = seeded(`${bot.id}-trend`); return Array.from({ length: 24 }, (_, i) => 4 + r() * 6 + (i > 18 ? 5 : 0)); }, [bot.id]);
  const max = Math.max(...points);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${(i / (points.length - 1)) * 300},${70 - (v / max) * 62}`).join(' ');
  return <div className="bos-trend">
    <p className="bos-big"><strong>3</strong><span>项异常 · 较昨日 +2</span></p>
    <svg viewBox="0 0 300 74" preserveAspectRatio="none" aria-hidden="true"><path d={`${d} L300,74 L0,74 Z`} className="bos-trend-area" /><path d={d} className="bos-trend-line" /></svg>
  </div>;
}
function Metrics({ slot }: { slot: WidgetSlot }) {
  const values = slot.source.startsWith('mcp:')
    ? [{ v: '37', l: '在途订单' }, { v: '92%', l: '准时交付' }, { v: '2', l: '延期' }]
    : [{ v: '14', l: '完成任务' }, { v: '5', l: '新成果' }, { v: '1', l: '待跟进' }];
  return <div className="bos-metrics">{values.map(m => <div key={m.l}><strong>{m.v}</strong><span>{m.l}</span></div>)}</div>;
}

function Widget({ slot, ctx }: { slot: WidgetSlot; ctx: Ctx }) {
  switch (slot.kind) {
    case 'waiting': return <Waiting {...ctx} />;
    case 'members': return <><Agents {...ctx} /><button type="button" className="bos-secondary bos-group-recruit" onClick={ctx.onGroupRecruit}>招募专家</button></>;
    case 'runs': return <Runs {...ctx} />;
    case 'artifacts': return <RecentArtifactsWidget files={ctx.scope.flatMap(workspaceFiles)} onPreview={ctx.onPreview} />;
    case 'artifact-preview': return <ArtifactPreviewWidget key={ctx.preview?.id} file={ctx.preview} />;
    case 'workspace': return <WorkspaceWidget files={workspaceFiles(ctx.bot)} onPreview={ctx.onPreview} />;
    case 'routines': return <RoutinesWidget routines={ctx.bot.routines ?? []} onToggle={ctx.onRoutineToggle} onRun={ctx.onRoutineRun} />;
    case 'action-table': return <ActionTableWidget source={slot.source} actions={ctx.bot.tableActions ?? {}} onAction={(row, action) => ctx.onTableAction(slot.source, row.id, action)} />;
    case 'query-form': {
      const mode = slot.action ?? 'direct';
      const result = ctx.bot.personnelResults?.[mode];
      const approval = result && ctx.state.approvals.find(item => item.kind === 'reveal-personnel' && item.targetId === result.id && item.botId === ctx.bot.id);
      return <PersonnelWidget action={mode} result={result} approval={approval} working={ctx.state.pending.some(task => task.botId === ctx.bot.id && task.slotId === slot.id)}
        onRun={input => ctx.onPersonnel(slot, mode, input)} onRequestReveal={ctx.onReveal} />;
    }
    case 'audit': return <AuditWidget records={ctx.state.audit.filter(record => record.botId === ctx.bot.id && ['人员查询', '异常分析', '查看完整信息'].includes(record.action))} />;
    case 'capabilities': return <CapabilitiesWidget bot={ctx.bot} state={ctx.state} onRequest={ctx.onRequestConnector} />;
    case 'feed': return <Feed />;
    case 'repo': return <Repo />;
    case 'sources': return <Sources />;
    case 'alerts': return <Alerts />;
    case 'checks': return <Checks />;
    case 'trend': return <Trend {...ctx} />;
    case 'metrics': return <Metrics slot={slot} />;
  }
}

function WidgetCard({ slot, ctx }: { slot: WidgetSlot; ctx: Ctx }) {
  const [showSource, setShowSource] = useState(false);
  const [type, id] = slot.source.split(':');
  const capability = type === 'skill' ? ctx.state.skills.find(item => item.id === id) : ctx.state.mcps.find(item => item.id === id);
  const label = slot.source === 'core' ? '工作台' : `${type === 'skill' ? '技能' : '连接器'} · ${capability?.name ?? id}`;
  const tool = slot.tool ?? (capability && 'tools' in capability ? capability.tools.join('、') : undefined);
  const [openedAt] = useState(Date.now);
  const updatedAt = ctx.bot.widgetUpdates?.[slot.id] ?? ctx.bot.dashboardUpdatedAt ?? openedAt;
  const refreshTime = new Date(updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const closeMenu = (button: HTMLButtonElement) => { button.closest('details')?.removeAttribute('open'); };
  return <article id={slot.kind === 'artifact-preview' ? 'widget-artifact-preview' : undefined} className={`bos-card bos-card--span${slot.span}`}>
    <header><h2>{slot.title}</h2><div className="bos-widget-meta">
      <span className="bos-card-source">{label}</span>
      <time dateTime={new Date(updatedAt).toISOString()}>更新于 {refreshTime}</time>
      <button type="button" className="bos-link-button bos-widget-ask" onClick={() => ctx.onAsk(slot)} aria-label={`问问它：${slot.title}`}>问问它</button>
      <details className="bos-widget-menu"><summary aria-label={`${slot.title} 操作`}>···</summary><div>
        <button type="button" onClick={event => { ctx.onRefresh(slot); closeMenu(event.currentTarget); }}>刷新</button>
        <button type="button" onClick={event => { setShowSource(value => !value); closeMenu(event.currentTarget); }}>查看数据来源</button>
      </div></details>
    </div></header>
    {showSource ? <p className="bos-widget-source-detail">{label}{tool ? ` · 工具 ${tool}` : ''}</p> : null}
    <Widget slot={slot} ctx={ctx} />
  </article>;
}

export default function BotDashboard({ state, bot, recentlyDone = [], faceState = 'idle', ...actions }: DashboardActions & { state: BotosState; bot: Bot; recentlyDone?: string[]; faceState?: FaceState }) {
  const [preview, setPreview] = useState<WorkspaceFile>();
  const spec = useMemo(() => composeDashboard(bot, state.skills, state.mcps), [bot, state.skills, state.mcps]);
  const publishing = state.expertPublications?.some(item => item.botId === bot.id && item.status === 'pending');
  const update = definitionUpdate(state, bot);
  const canCapture = bot.matured || maturityFor(bot).eligible;
  const ctx: Ctx = { ...actions, state, bot, scope: scopeBots(state, bot), recentlyDone, preview, onPreview: file => {
    setPreview(file);
    document.getElementById('widget-artifact-preview')?.scrollIntoView({ block: 'nearest' });
  } };
  const working = ctx.scope.filter(b => pendingCount(state, b.id) > 0).length;
  return <section className="bos-dashboard" aria-label={`${bot.name} 工作台`}>
    <header className="bos-dash-head">
      {/* 非首页：面板左上角就是这个智能体的头像，充当页面 Logo */}
      <BotAvatar bot={bot} size={40} state={faceState} members={memberBots(state, bot)} />
      <div>
        <h1>{spec.headline.title}{working ? <span className="bos-live"><i />工作中</span> : null}</h1>
        <p>{spec.headline.subtitle}</p>
      </div>
      {canCapture ? <div className="bos-dash-capture">
        {bot.matured ? <span className="bos-matured"><BadgeCheck size={14} />{bot.kind === 'group' ? '专家团' : '专家'}</span> : null}
        <button type="button" className="bos-secondary" disabled={publishing} onClick={actions.onCapture}><Sprout size={14} />
          {publishing ? '发布审批中' : bot.matured ? '沉淀新版本' : `沉淀为${bot.kind === 'group' ? '专家团' : '专家'}`}
        </button>
      </div> : null}
    </header>
    {bot.dashboardChange ? <div className="bos-dashboard-change" role="status">
      <span>装上了「{bot.dashboardChange.capability}」，面板多了「{bot.dashboardChange.titles.join('、')}」。</span>
      <button type="button" className="bos-secondary" onClick={() => actions.onDashboardChange(true)}>撤销</button>
      <button type="button" className="bos-link-button" onClick={() => actions.onDashboardChange(false)}>知道了</button>
    </div> : null}
    {update ? <div className="bos-dashboard-change"><span>「{update.name}」有新版本，可更新定义，保留现有记忆。</span>
      <button type="button" className="bos-secondary" onClick={() => actions.onApplyDefinition(applyDefinitionUpdate(state, bot, update))}>更新定义</button>
    </div> : null}
    <div className="bos-dash-grid">{spec.widgets.map(slot => <WidgetCard key={slot.id} slot={slot} ctx={ctx} />)}</div>
  </section>;
}
