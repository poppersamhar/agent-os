import { useState, type Dispatch, type ReactNode } from 'react';
import { ArrowLeft, KeyRound, Plus, Search, Trash2, X } from 'lucide-react';
import { MAIN_BOT_ID, uid, type Bot, type BotosAction, type BotosState, type Mcp, type McpKind, type Skill, type WidgetKind } from './botModel';
import BotAvatar from './BotAvatar';
import BotEditor from './BotEditor';
import type { BotDraft } from './botDraft';

export type HubId = 'bots' | 'skills' | 'mcps';
interface HubProps { state: BotosState; dispatch: Dispatch<BotosAction>; onOpenBot: (id: string) => void; onClose: () => void; onNewBot: () => void }

const usedBy = (state: BotosState, key: 'skillIds' | 'mcpIds', id: string) => state.bots.filter(b => b[key].includes(id));

function HubFrame({ title, subtitle, onClose, action, children }: { title: string; subtitle: string; onClose: () => void; action?: ReactNode; children: ReactNode }) {
  return <section className="bos-hub" aria-label={title}>
    <header className="bos-hub-head">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="bos-hub-actions">{action}<button type="button" className="bos-icon" aria-label="关闭" onClick={onClose}><X size={16} /></button></div>
    </header>
    {children}
  </section>;
}

function useQuery() {
  const [q, setQ] = useState('');
  const box = <label className="bos-search"><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索" aria-label="搜索" /></label>;
  return [q.trim().toLowerCase(), box] as const;
}

// ───────────────────────── Bot 管理 ─────────────────────────

function BotDetail({ bot, state, dispatch, onBack, onOpenBot }: { bot: Bot; state: BotosState; dispatch: Dispatch<BotosAction>; onBack: () => void; onOpenBot: (id: string) => void }) {
  const isMain = bot.kind === 'main';
  const [draft, setDraft] = useState<BotDraft | null>(isMain ? null : { name: bot.name, kind: bot.kind as BotDraft['kind'], prompt: bot.prompt, model: bot.model, skillIds: bot.skillIds, mcpIds: bot.mcpIds, memberIds: bot.memberIds });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = draft && (draft.name !== bot.name || draft.prompt !== bot.prompt || draft.model !== bot.model || draft.skillIds.join() !== bot.skillIds.join() || draft.mcpIds.join() !== bot.mcpIds.join() || draft.memberIds.join() !== bot.memberIds.join());
  return <div className="bos-detail">
    <button type="button" className="bos-back" onClick={onBack}><ArrowLeft size={14} />全部 Bot</button>
    <div className="bos-detail-title"><BotAvatar bot={bot} size={40} /><div><h2>{bot.name}</h2><p>{isMain ? '主 Bot · 统一管理全部 Bot 与能力' : bot.kind === 'group' ? `群聊 · ${bot.memberIds.length} 个成员` : `Bot · 创建于 ${bot.createdAt}`}</p></div>
      <button type="button" className="bos-secondary" onClick={() => onOpenBot(bot.id)}>打开对话</button></div>
    {draft ? <BotEditor draft={draft} onChange={setDraft} state={state} editingId={bot.id} /> : <p className="bos-hint">主 Bot 由系统维护，汇总全部 Bot 的状态。</p>}
    {draft ? <div className="bos-form-actions">
      <button type="button" className="bos-primary" disabled={!dirty || !draft.name.trim()} onClick={() => dispatch({ type: 'update-bot', id: bot.id, patch: { ...draft, name: draft.name.trim() } })}>保存修改</button>
      {confirmDelete
        ? <><span className="bos-warn">删除后对话与记忆无法恢复。</span><button type="button" className="bos-danger" onClick={() => { dispatch({ type: 'delete-bot', id: bot.id }); onBack(); }}>确认删除</button><button type="button" className="bos-secondary" onClick={() => setConfirmDelete(false)}>取消</button></>
        : <button type="button" className="bos-ghost-danger" onClick={() => setConfirmDelete(true)}><Trash2 size={13} />删除</button>}
    </div> : null}
    <h3 className="bos-section-title">记忆 <small>{bot.memory.length} 条 · 可逐条查看与删除</small></h3>
    {bot.memory.length ? <ul className="bos-memory">{bot.memory.map(m => <li key={m.id}>
      <span className={`bos-tag bos-tag--${m.scope}`}>{m.scope === 'team' ? '团队' : '个人'}</span><p>{m.text}</p><small>{m.createdAt}</small>
      <button type="button" className="bos-icon" aria-label={`删除记忆：${m.text}`} onClick={() => dispatch({ type: 'forget', botId: bot.id, memoryId: m.id })}><X size={13} /></button>
    </li>)}</ul> : <p className="bos-hint">还没有记忆。对话中确认过的偏好与事实会保存在这里。</p>}
  </div>;
}

export function BotHub({ state, dispatch, onOpenBot, onClose, onNewBot }: HubProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [q, search] = useQuery();
  const bot = state.bots.find(b => b.id === selected);
  const list = [state.bots.find(b => b.id === MAIN_BOT_ID)!, ...state.order.map(id => state.bots.find(b => b.id === id)).filter((b): b is Bot => !!b)]
    .filter(b => !q || b.name.toLowerCase().includes(q) || b.prompt.toLowerCase().includes(q));
  return <HubFrame title="Bot 管理" subtitle="Bot 与群聊（专家团）：身份、能力、记忆与仪表盘" onClose={onClose}
    action={<button type="button" className="bos-primary" onClick={onNewBot}><Plus size={14} />新建</button>}>
    {bot ? <BotDetail key={bot.id} bot={bot} state={state} dispatch={dispatch} onBack={() => setSelected(null)} onOpenBot={onOpenBot} /> : <>
      {search}
      <table className="bos-table">
        <thead><tr><th>Bot</th><th>类型</th><th>Skill</th><th>MCP</th><th>记忆</th><th>近 7 天运行</th></tr></thead>
        <tbody>{list.map(b => <tr key={b.id} onClick={() => setSelected(b.id)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setSelected(b.id); }}>
          <td><span className="bos-row-name"><BotAvatar bot={b} size={24} />{b.name}</span></td>
          <td>{b.kind === 'main' ? '主 Bot' : b.kind === 'group' ? `群聊 · ${b.memberIds.length} 成员` : 'Bot'}</td>
          <td>{b.skillIds.map(id => state.skills.find(s => s.id === id)?.name).filter(Boolean).join('、') || '—'}</td>
          <td>{b.mcpIds.map(id => state.mcps.find(m => m.id === id)?.name).filter(Boolean).join('、') || '—'}</td>
          <td>{b.memory.length}</td>
          <td>{b.history.slice(-7).reduce((n, d) => n + d[0] + d[1], 0)}</td>
        </tr>)}</tbody>
      </table>
    </>}
  </HubFrame>;
}

// ───────────────────────── Skill 管理 ─────────────────────────

const widgetChoices: { kind: WidgetKind; title: string }[] = [
  { kind: 'metrics', title: '指标' }, { kind: 'trend', title: '趋势' }, { kind: 'alerts', title: '事项列表' }, { kind: 'sources', title: '来源与发现' }, { kind: 'checks', title: '检查清单' },
];

function CreateSkill({ onDone, dispatch }: { onDone: () => void; dispatch: Dispatch<BotosAction> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('通用');
  const [widget, setWidget] = useState<WidgetKind | ''>('');
  return <form className="bos-create" onSubmit={e => { e.preventDefault(); if (!name.trim()) return;
    const offer = widgetChoices.find(w => w.kind === widget);
    dispatch({ type: 'create-skill', skill: { id: `skill-${uid().slice(0, 8)}`, name: name.trim(), description: description.trim() || '用户创建的 Skill', category, version: '0.1.0', owner: 'Samhar', calls: 0, failRate: 0, createdByUser: true, widgets: offer ? [{ kind: offer.kind, title: `${name.trim()} · ${offer.title}`, span: 1 }] : [] } });
    onDone(); }}>
    <h3>创建 Skill</h3>
    <p className="bos-hint">把一次做成功的方法沉淀下来，供所有 Bot 复用。下一版本支持在对话中由 Bot 提议并起草。</p>
    <label className="bos-field"><span>名称</span><input value={name} onChange={e => setName(e.target.value)} placeholder="例如：投诉分析" autoFocus /></label>
    <label className="bos-field"><span>做什么</span><textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="输入、步骤、产出" /></label>
    <label className="bos-field"><span>分类</span><select value={category} onChange={e => setCategory(e.target.value)}>{['通用', '调研', '分析', '写作', '数据'].map(c => <option key={c}>{c}</option>)}</select></label>
    <label className="bos-field"><span>为仪表盘提供组件</span><select value={widget} onChange={e => setWidget(e.target.value as WidgetKind | '')}><option value="">不提供</option>{widgetChoices.map(w => <option key={w.kind} value={w.kind}>{w.title}</option>)}</select></label>
    <div className="bos-form-actions"><button type="submit" className="bos-primary" disabled={!name.trim()}>发布到 SkillHub</button><button type="button" className="bos-secondary" onClick={onDone}>取消</button></div>
  </form>;
}

export function SkillHub({ state, dispatch, onOpenBot, onClose }: HubProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, search] = useQuery();
  const skill = state.skills.find(s => s.id === selected);
  const list = state.skills.filter(s => !q || `${s.name}${s.description}${s.category}`.toLowerCase().includes(q));
  return <HubFrame title="Skill 管理" subtitle="可复用的工作方法：版本、负责人、调用与失败率、被哪些 Bot 使用" onClose={onClose}
    action={<button type="button" className="bos-primary" onClick={() => { setCreating(true); setSelected(null); }}><Plus size={14} />创建 Skill</button>}>
    {creating ? <CreateSkill dispatch={dispatch} onDone={() => setCreating(false)} />
      : skill ? <SkillDetail skill={skill} state={state} dispatch={dispatch} onBack={() => setSelected(null)} onOpenBot={onOpenBot} />
        : <>{search}<div className="bos-cards">{list.map(s => <button type="button" key={s.id} className="bos-hub-card" onClick={() => setSelected(s.id)}>
          <header><strong>{s.name}</strong><span className="bos-tag">{s.category}</span></header>
          <p>{s.description}</p>
          <footer><span>v{s.version}</span><span>{usedBy(state, 'skillIds', s.id).length} 个 Bot 使用</span><span className={s.failRate > 0.08 ? 'is-bad' : ''}>失败率 {(s.failRate * 100).toFixed(0)}%</span></footer>
        </button>)}</div></>}
  </HubFrame>;
}

function InstallList({ bots, installed, onToggle }: { bots: Bot[]; installed: (b: Bot) => boolean; onToggle: (b: Bot) => void }) {
  return <ul className="bos-install">{bots.map(b => <li key={b.id}><span className="bos-row-name"><BotAvatar bot={b} size={22} />{b.name}</span>
    <button type="button" className={installed(b) ? 'bos-secondary' : 'bos-primary'} onClick={() => onToggle(b)}>{installed(b) ? '卸载' : '安装'}</button></li>)}</ul>;
}

function SkillDetail({ skill, state, dispatch, onBack, onOpenBot }: { skill: Skill; state: BotosState; dispatch: Dispatch<BotosAction>; onBack: () => void; onOpenBot: (id: string) => void }) {
  const bots = state.bots.filter(b => b.kind !== 'main');
  return <div className="bos-detail">
    <button type="button" className="bos-back" onClick={onBack}><ArrowLeft size={14} />全部 Skill</button>
    <div className="bos-detail-title"><div><h2>{skill.name}</h2><p>{skill.description}</p></div></div>
    <dl className="bos-facts">
      <div><dt>版本</dt><dd>v{skill.version}</dd></div><div><dt>负责人</dt><dd>{skill.owner}</dd></div>
      <div><dt>调用</dt><dd>{skill.calls}</dd></div><div><dt>失败率</dt><dd className={skill.failRate > 0.08 ? 'is-bad' : ''}>{(skill.failRate * 100).toFixed(1)}%</dd></div>
      <div><dt>仪表盘组件</dt><dd>{skill.widgets.map(w => w.title).join('、') || '无'}</dd></div>
    </dl>
    <h3 className="bos-section-title">安装到 Bot <small>安装后 Bot 的仪表盘会加入这个 Skill 提供的组件</small></h3>
    <InstallList bots={bots} installed={b => b.skillIds.includes(skill.id)} onToggle={b => dispatch({ type: 'update-bot', id: b.id, patch: { skillIds: b.skillIds.includes(skill.id) ? b.skillIds.filter(id => id !== skill.id) : [...b.skillIds, skill.id] } })} />
    <p className="bos-hint">在 Bot 中查看效果：{usedBy(state, 'skillIds', skill.id).map(b => <button type="button" key={b.id} className="bos-link" onClick={() => onOpenBot(b.id)}>{b.name}</button>)}</p>
  </div>;
}

// ───────────────────────── MCP 管理 ─────────────────────────

const mcpKinds: { kind: McpKind; label: string }[] = [
  { kind: 'feishu', label: '飞书' }, { kind: 'github', label: 'GitHub' }, { kind: 'database', label: '数据库' }, { kind: 'erp', label: '业务系统' }, { kind: 'web', label: '网页' }, { kind: 'custom', label: '自定义' },
];
const kindLabel = (k: McpKind) => mcpKinds.find(m => m.kind === k)?.label ?? k;

function CreateMcp({ onDone, dispatch }: { onDone: () => void; dispatch: Dispatch<BotosAction> }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<McpKind>('custom');
  const [endpoint, setEndpoint] = useState('');
  const [tools, setTools] = useState('');
  return <form className="bos-create" onSubmit={e => { e.preventDefault(); if (!name.trim() || !endpoint.trim()) return;
    dispatch({ type: 'create-mcp', mcp: { id: `mcp-${uid().slice(0, 8)}`, name: name.trim(), kind, endpoint: endpoint.trim(), credential: 'vault', enabled: true, owner: 'Samhar', calls: 0, createdByUser: true,
      tools: tools.split(/[,，、\n]/).map(t => t.trim()).filter(Boolean), widgets: [] } });
    onDone(); }}>
    <h3>接入 MCP</h3>
    <p className="bos-hint">原型只保存配置，不会真正连接。凭证托管在 Vault，不进入 Bot 的运行环境。</p>
    <label className="bos-field"><span>名称</span><input value={name} onChange={e => setName(e.target.value)} placeholder="例如：客服工单系统" autoFocus /></label>
    <label className="bos-field"><span>类型</span><select value={kind} onChange={e => setKind(e.target.value as McpKind)}>{mcpKinds.map(k => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select></label>
    <label className="bos-field"><span>端点</span><input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="mcp://… 或 https://…" /></label>
    <label className="bos-field"><span>工具（用逗号分隔）</span><input value={tools} onChange={e => setTools(e.target.value)} placeholder="查询工单, 更新状态" /></label>
    <div className="bos-form-actions"><button type="submit" className="bos-primary" disabled={!name.trim() || !endpoint.trim()}>保存到 MCPHub</button><button type="button" className="bos-secondary" onClick={onDone}>取消</button></div>
  </form>;
}

function McpDetail({ mcp, state, dispatch, onBack }: { mcp: Mcp; state: BotosState; dispatch: Dispatch<BotosAction>; onBack: () => void }) {
  const bots = state.bots.filter(b => b.kind !== 'main');
  return <div className="bos-detail">
    <button type="button" className="bos-back" onClick={onBack}><ArrowLeft size={14} />全部 MCP</button>
    <div className="bos-detail-title"><div><h2>{mcp.name}</h2><p>{kindLabel(mcp.kind)} · <code>{mcp.endpoint}</code></p></div>
      <button type="button" className={mcp.enabled ? 'bos-secondary' : 'bos-primary'} onClick={() => dispatch({ type: 'toggle-mcp', id: mcp.id })}>{mcp.enabled ? '停用' : '启用'}</button></div>
    <dl className="bos-facts">
      <div><dt>状态</dt><dd className={mcp.enabled ? '' : 'is-bad'}>{mcp.enabled ? '已启用' : '已停用'}</dd></div>
      <div><dt>凭证</dt><dd>{mcp.credential === 'vault' ? <><KeyRound size={12} /> Vault 托管</> : '无需凭证'}</dd></div>
      <div><dt>负责人</dt><dd>{mcp.owner}</dd></div><div><dt>调用</dt><dd>{mcp.calls}</dd></div>
      <div><dt>工具</dt><dd>{mcp.tools.join('、') || '—'}</dd></div>
    </dl>
    <h3 className="bos-section-title">授权给 Bot <small>{mcp.enabled ? '授权后 Bot 可以调用这些工具' : '停用期间，已授权的 Bot 暂时无法使用'}</small></h3>
    <InstallList bots={bots} installed={b => b.mcpIds.includes(mcp.id)} onToggle={b => dispatch({ type: 'update-bot', id: b.id, patch: { mcpIds: b.mcpIds.includes(mcp.id) ? b.mcpIds.filter(id => id !== mcp.id) : [...b.mcpIds, mcp.id] } })} />
  </div>;
}

export function McpHub({ state, dispatch, onClose }: HubProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, search] = useQuery();
  const mcp = state.mcps.find(m => m.id === selected);
  const list = state.mcps.filter(m => !q || `${m.name}${kindLabel(m.kind)}${m.tools.join('')}`.toLowerCase().includes(q));
  return <HubFrame title="MCP 管理" subtitle="外部系统与服务：飞书、GitHub、数据库与业务系统，统一授权与凭证托管" onClose={onClose}
    action={<button type="button" className="bos-primary" onClick={() => { setCreating(true); setSelected(null); }}><Plus size={14} />接入 MCP</button>}>
    {creating ? <CreateMcp dispatch={dispatch} onDone={() => setCreating(false)} />
      : mcp ? <McpDetail mcp={mcp} state={state} dispatch={dispatch} onBack={() => setSelected(null)} />
        : <>{search}<div className="bos-cards">{list.map(m => <button type="button" key={m.id} className={`bos-hub-card${m.enabled ? '' : ' is-off'}`} onClick={() => setSelected(m.id)}>
          <header><strong>{m.name}</strong><span className="bos-tag">{kindLabel(m.kind)}</span></header>
          <p>{m.tools.join(' · ') || '尚未声明工具'}</p>
          <footer><span>{m.enabled ? '已启用' : '已停用'}</span><span>{usedBy(state, 'mcpIds', m.id).length} 个 Bot 授权</span><span>{m.credential === 'vault' ? 'Vault 托管' : '无需凭证'}</span></footer>
        </button>)}</div></>}
  </HubFrame>;
}
