import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Sprout, CircleCheck, CircleDot, FileText, GitPullRequest, MessageSquare, TriangleAlert } from 'lucide-react';
import { HISTORY_DAYS, isAgent, composeDashboard, faceStateOf, memberBots, pendingCount, seeded, waitingFor, type Bot, type BotosState, type WaitingItem, type WidgetSlot } from './botModel';
import BotAvatar from './BotAvatar';
import type { FaceState } from './botFaces';

// 固定的 Widget 组件库：Spec 只声明「放什么」，这里负责「怎么画」。

const whenLabel = { today: '今天', week: '本周', later: '稍后' } as const;

interface Ctx { state: BotosState; bot: Bot; scope: Bot[]; recentlyDone: string[]; onSelectBot: (id: string) => void }

function scopeBots(state: BotosState, bot: Bot): Bot[] {
  if (bot.kind === 'main') return state.bots.filter(isAgent);
  if (bot.kind === 'group') return [bot, ...state.bots.filter(b => bot.memberIds.includes(b.id))];
  return [bot];
}

function sumHistory(bots: Bot[]): [number, number][] {
  return Array.from({ length: HISTORY_DAYS }, (_, day) => bots.reduce<[number, number]>((acc, b) => {
    const d = b.history[day] ?? [0, 0];
    return [acc[0] + d[0], acc[1] + d[1]];
  }, [0, 0]));
}

function waitingItems({ scope }: Ctx): WaitingItem[] {
  return scope.flatMap(b => waitingFor(b.id));
}

function Waiting(ctx: Ctx) {
  const items = waitingItems(ctx);
  const counts = (['today', 'week', 'later'] as const).map(when => items.filter(i => i.when === when).length);
  const total = items.length;
  const r = 34, c = 2 * Math.PI * r;
  let offset = 0;
  return <div className="bos-waiting">
    <div className="bos-waiting-body">
      <svg viewBox="0 0 84 84" className="bos-donut" aria-hidden="true">
        <circle cx="42" cy="42" r={r} fill="none" className="bos-donut-track" strokeWidth="9" />
        {total ? counts.map((n, i) => {
          const len = (n / total) * c;
          const el = <circle key={i} cx="42" cy="42" r={r} fill="none" className={`bos-donut-seg--${(['today', 'week', 'later'] as const)[i]}`} strokeWidth="9" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 42 42)" />;
          offset += len;
          return el;
        }) : null}
        <text x="42" y="44" textAnchor="middle" className="bos-donut-num">{total}</text>
        <text x="42" y="57" textAnchor="middle" className="bos-donut-label">件待处理</text>
      </svg>
      <ul className="bos-legend">{(['today', 'week', 'later'] as const).map((when, i) => <li key={when}><i className={`is-${when}`} />{whenLabel[when]}<b>{counts[i]}</b></li>)}</ul>
    </div>
    {total
      ? <button type="button" className="bos-primary-action" onClick={() => ctx.onSelectBot(items[0].botId)}>处理这 {total} 件 <ArrowRight size={14} /></button>
      : <p className="bos-empty-note">暂时没有需要你处理的事</p>}
  </div>;
}

function Agents(ctx: Ctx & { members?: boolean }) {
  const bots = ctx.members ? ctx.state.bots.filter(b => ctx.bot.memberIds.includes(b.id)) : ctx.scope;
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

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
function Done(ctx: Ctx) {
  const days = sumHistory(ctx.scope).slice(-7).map(d => d[0]);
  const max = Math.max(...days, 1);
  const today = days[days.length - 1];
  const best = today >= max;
  const start = (new Date().getDay() + 6) % 7; // 今天是周几（周一=0）
  return <div className="bos-done">
    <p className="bos-big"><strong>{today}</strong><span>今天完成{best ? ' · 本周最多' : ''}</span></p>
    <div className="bos-bars">{days.map((n, i) => {
      const label = weekdays[(start - 6 + i + 14) % 7];
      return <div key={i} className={i === days.length - 1 ? 'is-today' : ''}><span style={{ height: `${Math.max(6, (n / max) * 100)}%` }} /><small>{i === days.length - 1 ? '今天' : `周${label}`}</small></div>;
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

function Artifacts(ctx: Ctx) {
  const files = ctx.scope.flatMap(b => b.messages.filter(m => m.attachment).map(m => ({ id: m.id, name: m.attachment!, bot: b.name, time: m.time }))).reverse().slice(0, 4);
  if (!files.length) return <p className="bos-empty-note">完成第一项任务后，成果会出现在这里</p>;
  return <ul className="bos-list">{files.map(f => <li key={f.id}><FileText size={14} /><div><strong>{f.name}</strong><small>{f.bot} · {f.time}</small></div></li>)}</ul>;
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
    case 'agents': return <Agents {...ctx} />;
    case 'members': return <Agents {...ctx} members />;
    case 'done': return <Done {...ctx} />;
    case 'runs': return <Runs {...ctx} />;
    case 'artifacts': return <Artifacts {...ctx} />;
    case 'feed': return <Feed />;
    case 'repo': return <Repo />;
    case 'sources': return <Sources />;
    case 'alerts': return <Alerts />;
    case 'checks': return <Checks />;
    case 'trend': return <Trend {...ctx} />;
    case 'metrics': return <Metrics slot={slot} />;
  }
}

function sourceLabel(slot: WidgetSlot, state: BotosState): string | null {
  if (slot.source === 'core') return null;
  const [type, id] = slot.source.split(':');
  const name = type === 'skill' ? state.skills.find(s => s.id === id)?.name : state.mcps.find(m => m.id === id)?.name;
  return name ? `${type === 'skill' ? '技能' : '连接器'} · ${name}` : null;
}

/** 沉淀：把用得顺的智能体变成专家（智能体群变成专家团），可以同时提交发布到企业市场。 */
function MatureControl({ bot, onMature }: { bot: Bot; onMature: (publish: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [publish, setPublish] = useState(true);
  const target = bot.kind === 'group' ? '专家团' : '专家';
  if (bot.matured) return <span className="bos-matured"><BadgeCheck size={14} />{target}</span>;
  return <div className="bos-mature">
    <button type="button" className="bos-secondary" aria-expanded={open} onClick={() => setOpen(v => !v)}><Sprout size={14} />沉淀为{target}</button>
    {open ? <div className="bos-mature-pop" role="dialog" aria-label={`沉淀为${target}`}>
      <strong>沉淀为{target}</strong>
      <p>「{bot.name}」会成为一个成熟的{target}：保留现有的角色、技能、连接器和团队记忆，出现在「专家」里，可以被复用。</p>
      <label><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />同时提交发布到企业市场（需管理员审批）</label>
      <div className="bos-form-actions"><button type="button" className="bos-primary" onClick={() => { onMature(publish); setOpen(false); }}>确认沉淀</button><button type="button" className="bos-secondary" onClick={() => setOpen(false)}>取消</button></div>
    </div> : null}
  </div>;
}

export default function BotDashboard({ state, bot, recentlyDone = [], faceState = 'idle', onSelectBot, onMature }: { state: BotosState; bot: Bot; recentlyDone?: string[]; faceState?: FaceState; onSelectBot: (id: string) => void; onMature?: (publish: boolean) => void }) {
  const spec = useMemo(() => composeDashboard(bot, state.skills, state.mcps), [bot, state.skills, state.mcps]);
  const ctx: Ctx = { state, bot, scope: scopeBots(state, bot), recentlyDone, onSelectBot };
  const working = ctx.scope.filter(b => pendingCount(state, b.id) > 0).length;
  const waiting = waitingItems(ctx).length;
  const summary = bot.kind === 'main'
    ? `${waiting} 件事等你处理，${working} 个智能体正在工作。`
    : spec.headline.subtitle;
  return <section className="bos-dashboard" aria-label={`${bot.name} 工作台`}>
    <header className="bos-dash-head">
      {/* 非首页：面板左上角就是这个智能体的头像，充当页面 Logo */}
      {bot.kind === 'main' ? null : <BotAvatar bot={bot} size={40} state={faceState} members={memberBots(state, bot)} />}
      <div>
        <h1>{spec.headline.title}{working ? <span className="bos-live"><i />工作中</span> : null}</h1>
        <p>{summary}</p>
      </div>
      {isAgent(bot) && onMature ? <MatureControl key={bot.id} bot={bot} onMature={onMature} /> : null}
    </header>
    <div className="bos-dash-grid">
      {spec.widgets.map(slot => {
        const from = sourceLabel(slot, state);
        return <article key={slot.id} className={`bos-card bos-card--span${slot.span}`}>
          <header><h2>{slot.title}</h2>{from ? <span className="bos-card-source">{from}</span> : null}</header>
          <Widget slot={slot} ctx={ctx} />
        </article>;
      })}
    </div>
  </section>;
}
