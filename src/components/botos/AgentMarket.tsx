import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, Copy, Download, ExternalLink, Plug, Plus, Search, Sparkles, X } from 'lucide-react';
import BotAvatar from './BotAvatar';
import BotFace, { BotFaceStack } from './BotFace';
import { agentLabel, botosReducer, isAgent, memberBots, type Bot, type BotosAction, type BotosState } from './botModel';
import { connectorKinds } from './capabilityDrafts';
import { grantFor } from './capabilities';
import { publicationStatus, type ExpertPublication } from './expertDefinitions';
import {
  catalogFor, installItem, isInstalled, isRecruitable, itemDeps, kindLabels, marketCapabilityIssue, marketItemAgents, marketMcpConfig, marketScenes, mcpConfig, pluginPackage, recruitItem, remoteTools, sourceLabels, teamMembers, versionHistory,
  type MarketItem, type RecruitableItem,
} from './marketCatalog';
import MarketAgentDetail from './MarketAgentDetail';
import MarketCreationDialog from './MarketCreationDialog';
import RecruitExpertForm from './RecruitExpertForm';
import './AgentMarket.css';

const tabs = ['expert', 'skill', 'connector'] as const;
type MarketTab = typeof tabs[number];
type SourceFilter = 'all' | 'org' | 'mine';
const sources: Record<SourceFilter, string> = { all: '全部', org: '企业', mine: '我的' };
const tabFor = (item: MarketItem): MarketTab => item.kind === 'team' ? 'expert' : item.kind;
export interface MarketFocus { tab: MarketTab; itemId?: string; token?: number; source?: SourceFilter }

function ItemIcon({ item, size }: { item: MarketItem; size: number }) {
  if (item.kind === 'expert') return <BotFace face={item.face} size={size} />;
  if (item.kind === 'team') return <BotFaceStack faces={teamMembers(item).map(m => m.face)} size={size} />;
  return <span className={`mk-icon mk-icon--${item.kind}`} style={{ width: size, height: size }}>{item.kind === 'skill' ? <Sparkles size={size * 0.45} /> : <Plug size={size * 0.45} />}</span>;
}

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setError(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setError(true);
    }
  };
  return <div className="mk-code">
    <button type="button" className="mk-code-copy" onClick={copy} aria-label={`复制${label}`}>{copied ? <><Check size={13} />已复制</> : <><Copy size={13} />复制</>}</button>
    <pre><code>{text}</code></pre>
    {error ? <p className="mk-hint" role="status">复制失败，请选中文本后手动复制。</p> : null}
  </div>;
}

function download(item: MarketItem) {
  const pkg = pluginPackage(item);
  const url = URL.createObjectURL(new Blob([pkg.content], { type: pkg.mime }));
  const a = document.createElement('a');
  a.href = url; a.download = pkg.filename; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Usage({ item, state, onOpenBot, onAction }: {
  item: MarketItem; state: BotosState; onOpenBot: (id: string) => void; onAction: (action: BotosAction) => void;
}) {
  const kind = item.kind === 'skill' ? 'skill' : item.kind === 'connector' ? 'mcp' : undefined;
  const id = item.kind === 'skill' ? item.skill.id : item.kind === 'connector' ? item.mcp.id : '';
  const agents = marketItemAgents(state, item);
  return <section className="mk-section">
    <h3>{kind ? '已授权的智能体' : '已招募的智能体'}</h3>
    {agents.length ? <ul className="mk-deps">{agents.map(bot => {
      const grant = kind && grantFor(bot, kind, id);
      return <li key={bot.id} className="mk-dep-row">
        <button type="button" className="mk-agent-link" onClick={() => onOpenBot(bot.id)}>
          <BotAvatar bot={bot} members={memberBots(state, bot)} size={26} />
          <span className="mk-dep-text">{bot.name}{grant ? <small>{grant.grantedBy}授权 · {grant.expiresAt ? `${new Date(grant.expiresAt).toLocaleDateString('zh-CN')} 到期` : '长期有效'}</small> : null}</span>
          <ExternalLink size={12} aria-hidden="true" />
        </button>
        {kind ? <button type="button" className="bos-secondary" aria-label={`撤销 ${bot.name} 的授权`} onClick={() => onAction({ type: 'revoke-capability', kind, id, botId: bot.id })}>撤销授权</button> : null}
      </li>;
    })}</ul> : <p className="mk-hint">{kind ? '暂无智能体获得授权。' : '暂无智能体从这个定义招募。'}</p>}
  </section>;
}

function Detail({ item, state, byId, publication, onInstall, onRecruit, onClose, onOpen, onOpenBot, onAction }: {
  item: MarketItem; state: BotosState; byId: Map<string, MarketItem>; publication?: ExpertPublication;
  onInstall: () => void; onRecruit: () => void; onClose: () => void; onOpen: (item: MarketItem) => void;
  onOpenBot: (id: string) => void; onAction: (action: BotosAction) => void;
}) {
  const [tab, setTab] = useState<'remote' | 'package'>('remote');
  const installed = isInstalled(state, item);
  const deps = itemDeps(item);
  const dependencies = [...deps.skillIds.map(id => byId.get(`skill:${id}`)), ...deps.mcpIds.map(id => byId.get(`connector:${id}`))]
    .filter((i): i is MarketItem => !!i);
  const members = item.kind === 'team' ? teamMembers(item) : [];
  const visible = !publication || publication.status === 'approved';
  const recruitable = isRecruitable(item);
  const versions = versionHistory(item, state);
  const issue = marketCapabilityIssue(item);
  return <aside className="mk-detail" aria-label={`${item.name} 详情`}>
    <header className="mk-detail-head">
      <ItemIcon item={item} size={52} />
      <div><h2>{item.name}</h2><p><span className="mk-tag">{kindLabels[item.kind]}</span><span className={`mk-tag mk-tag--${item.source}`}>{sourceLabels[item.source]}</span>{item.owner} · v{item.version}</p></div>
      <button type="button" className="bos-icon" aria-label="关闭详情" onClick={onClose}><X size={16} /></button>
    </header>
    <p className="mk-desc">{item.description}</p>

    {publication ? <p className={`mk-publication mk-publication--${publication.status}`}>{publicationStatus[publication.status]}</p> : null}
    {issue ? <p className="mk-note">{issue}</p> : null}
    <div className="mk-actions">
      {recruitable ? visible || publication?.status === 'draft' ? <button type="button" className="bos-primary" onClick={onRecruit}>招募</button> : null
        : installed ? <span className="mk-installed"><Check size={14} />已添加到能力库</span>
          : <button type="button" className="bos-primary" onClick={onInstall}>添加到能力库</button>}
      {installed && item.kind === 'connector' ? <button type="button" className="bos-secondary" onClick={() => onAction({ type: 'toggle-mcp', id: item.mcp.id })}>{item.mcp.enabled ? '停用连接器' : '启用连接器'}</button> : null}
    </div>

    {members.length ? <section className="mk-section"><h3>成员专家</h3><ul className="mk-deps">{members.map(member => <li key={member.id}><div className="mk-dep-row"><BotFace face={member.face} size={26} /><span className="mk-dep-text">{member.name}<small>{member.summary}</small></span>{byId.has(member.id) ? <button type="button" className="bos-secondary" onClick={() => onOpen(member)}>查看</button> : null}</div></li>)}</ul></section> : null}
    {recruitable && dependencies.length > 0 ? <section className="mk-section"><h3>需要的能力</h3><ul className="mk-deps">
      {dependencies.map(d => <li key={d.id}><button type="button" onClick={() => onOpen(d)}><ItemIcon item={d} size={26} /><span className="mk-dep-text">{d.name}<small>{kindLabels[d.kind]}</small></span></button></li>)}
    </ul></section> : null}
    {item.kind === 'connector' ? <section className="mk-section"><h3>连接信息</h3><dl className="mk-facts mk-facts--plain">
      <div><dt>类型</dt><dd>{connectorKinds[item.mcp.kind]}</dd></div><div><dt>状态</dt><dd>{item.mcp.enabled ? '已启用' : '已停用'}</dd></div>
      <div><dt>凭证</dt><dd>{item.mcp.credential === 'vault' ? 'Vault 托管' : '无需凭证'}</dd></div><div><dt>调用次数</dt><dd>{item.mcp.calls.toLocaleString()}</dd></div>
      <div className="mk-fact-wide"><dt>端点</dt><dd><code>{item.mcp.endpoint}</code></dd></div>
      <div className="mk-fact-wide"><dt>工具</dt><dd>{item.mcp.tools.join('、') || '尚未声明工具'}</dd></div>
    </dl></section> : null}
    {item.kind === 'skill' ? <section className="mk-section"><h3>运行情况</h3><dl className="mk-facts mk-facts--plain">
      <div><dt>调用次数</dt><dd>{item.skill.calls.toLocaleString()}</dd></div><div><dt>失败率</dt><dd>{(item.skill.failRate * 100).toFixed(1)}%</dd></div>
      <div className="mk-fact-wide"><dt>工作台组件</dt><dd>{item.skill.widgets.map(widget => widget.title).join('、') || '无'}</dd></div>
    </dl></section> : null}
    <Usage item={item} state={state} onOpenBot={onOpenBot} onAction={onAction} />

    <section className="mk-section"><h3>版本历史</h3><ol className="mk-versions">{versions.map(v => <li key={v.version}><strong>v{v.version}</strong><span>{v.notes}</span><time>{v.updatedAt}</time></li>)}</ol></section>

    {visible ? <section className="mk-section">
      <h3>接入其他产品</h3>
      <p className="mk-hint">作为插件接入任意支持 MCP 的 Agent 或产品。</p>
      <div className="bos-segment mk-tabs" role="tablist" aria-label="接入方式">
        <button type="button" role="tab" aria-selected={tab === 'remote'} aria-pressed={tab === 'remote'} onClick={() => setTab('remote')}>远程调用</button>
        <button type="button" role="tab" aria-selected={tab === 'package'} aria-pressed={tab === 'package'} onClick={() => setTab('package')}>插件包</button>
      </div>
      {tab === 'remote' ? <>
        <p className="mk-hint">由 AgentOS 托管运行：记忆、审批和调用记录都留在企业内。把下面的配置加到对方产品的 MCP 设置里。</p>
        <CopyBlock text={mcpConfig(item)} label="MCP 配置" />
        <p className="mk-hint">对方会看到这些工具：{remoteTools[item.kind].join('；')}</p>
      </> : <>
        <p className="mk-hint">{item.kind === 'skill' ? '下载 SKILL.md，放进对方产品的技能目录，用对方的模型运行。' : '下载定义文件，在对方产品里导入。只包含定义，不包含记忆和对话。'}{item.kind === 'connector' ? '连接器仍需通过 AgentOS 远程访问企业系统。' : ''}</p>
        <button type="button" className="bos-secondary" onClick={() => download(item)}><Download size={14} />下载 {pluginPackage(item).filename}</button>
      </>}
      <p className="mk-note">原型中的地址与令牌仅为示例。</p>
    </section> : null}

    <dl className="mk-facts">
      <div><dt>负责人</dt><dd>{item.owner}</dd></div><div><dt>版本</dt><dd>v{item.version}</dd></div>
      <div><dt>更新</dt><dd>{item.updatedAt}</dd></div><div><dt>添加次数</dt><dd>{item.installs.toLocaleString()}</dd></div>
    </dl>
  </aside>;
}

interface MarketEntry { id: string; item: MarketItem; publication?: ExpertPublication }
interface MarketProps {
  state: BotosState;
  onChange: (next: BotosState) => void;
  onOpenBot: (id: string) => void;
  onRequestDeletion?: (bot: Bot, memoryId?: string) => void;
  onFocusChange?: (focus: Omit<MarketFocus, 'token'>) => void;
  focus?: MarketFocus;
}

export default function AgentMarket(props: MarketProps) {
  return <MarketPage key={props.focus?.token} {...props} />;
}

function MarketPage({ state, onChange, onOpenBot, onRequestDeletion, onFocusChange, focus }: MarketProps) {
  const [tab, setTab] = useState<MarketTab>(focus?.tab ?? 'expert');
  const [source, setSource] = useState<SourceFilter>(focus?.source ?? 'all');
  const [scene, setScene] = useState('');
  const [query, setQuery] = useState('');
  const [attention, setAttention] = useState(false);
  const [sortFailure, setSortFailure] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(focus?.itemId ?? null);
  const [recruiting, setRecruiting] = useState<RecruitableItem | null>(null);
  const [creating, setCreating] = useState<'skill' | 'connector' | null>(null);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [marketMcpOpen, setMarketMcpOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const catalog = useMemo(() => catalogFor(state), [state]);
  const byId = useMemo(() => new Map(catalog.map(item => [item.id, item])), [catalog]);
  const publications = state.expertPublications ?? [];
  const local = new Set(publications.map(entry => entry.definition.id));
  const items: MarketEntry[] = catalog
    .filter(item => source === 'all' || (source === 'org' ? item.source === 'org' || isRecruitable(item) && local.has(item.id) : item.source === 'mine' && !local.has(item.id)))
    .map(item => ({ id: item.id, item }));
  if (source === 'mine' && tab === 'expert') {
    items.unshift(...publications.map(publication => ({ id: publication.id, item: publication.definition, publication })));
  }

  const q = query.trim().toLowerCase();
  const tabItems = items.filter(({ item }) => tabFor(item) === tab);
  const scenes = [...new Set(tabItems.flatMap(({ item }) => marketScenes(item)))];
  const list = tabItems.filter(({ item }) =>
    (!scene || marketScenes(item).includes(scene)) &&
    (!attention || tab === 'expert' || marketCapabilityIssue(item)) &&
    (!q || `${item.name} ${item.description} ${item.tags.join(' ')} ${item.owner} ${marketScenes(item).join(' ')}`.toLowerCase().includes(q)));
  if (tab === 'skill' && sortFailure) {
    list.sort((a, b) => (b.item.kind === 'skill' ? b.item.skill.failRate : 0) - (a.item.kind === 'skill' ? a.item.skill.failRate : 0));
  }

  const selectedPublication = publications.find(entry => entry.id === selectedId);
  const selected = selectedPublication?.definition ?? (selectedId ? byId.get(selectedId) : undefined);
  const bots = state.bots.filter(isAgent);
  const selectedBot = bots.find(bot => bot.id === agentId);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (recruiting || creating) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (marketMcpOpen) setMarketMcpOpen(false);
      else if (agentId) setAgentId(null);
      else if (agentsOpen) setAgentsOpen(false);
      else if (selectedId) dismissItem();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  });

  function changeTab(next: MarketTab) {
    if (next === tab) return;
    setTab(next);
    setScene('');
    setAttention(false);
    setSelectedId(null);
    setAgentsOpen(false);
    setAgentId(null);
    onFocusChange?.({ tab: next, source });
  }

  function navigateTabs(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const index = tabs.indexOf(tab);
    const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
      : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length]
        : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : undefined;
    if (!next) return;
    event.preventDefault();
    changeTab(next);
    document.getElementById(`market-tab-${next}`)?.focus();
  }

  function openItem(item: MarketItem) {
    const next = tabFor(item);
    if (next !== tab) {
      setTab(next);
      setScene('');
      setAttention(false);
      setSource('all');
    }
    setSelectedId(item.id);
    onFocusChange?.({ tab: next, itemId: item.id, source: next === tab ? source : 'all' });
  }

  function inspectItem(id: string) {
    setAgentsOpen(false);
    setAgentId(null);
    setSelectedId(id);
    onFocusChange?.({ tab, source, itemId: id });
  }

  function dismissItem() {
    setSelectedId(null);
    onFocusChange?.({ tab, source });
  }

  function save(next: BotosState, message: string) {
    onChange(next);
    setToast(message);
  }

  return <section className="mk-shell" aria-label="市场">
    <header className="mk-top">
      <h1>市场</h1>
      <label className="bos-search mk-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索专家、技能、连接器" aria-label="搜索市场" /></label>
      <button type="button" className="bos-secondary" onClick={() => { dismissItem(); setAgentId(null); setAgentsOpen(!agentsOpen); }} aria-pressed={agentsOpen}>管理我的智能体</button>
      <button type="button" className="bos-secondary" onClick={() => setMarketMcpOpen(!marketMcpOpen)} aria-expanded={marketMcpOpen}><Plug size={14} />接入市场</button>
    </header>

    <div className="mk-tabbar">
      <div className="mk-primary-tabs" role="tablist" aria-label="市场内容">
        {tabs.map(kind => <button type="button" key={kind} role="tab" id={`market-tab-${kind}`} aria-controls="market-results" aria-selected={tab === kind} tabIndex={tab === kind ? 0 : -1}
          onClick={() => changeTab(kind)} onKeyDown={navigateTabs}>{kindLabels[kind]}</button>)}
      </div>
      {tab !== 'expert' ? <button type="button" className="bos-primary" onClick={() => setCreating(tab)}><Plus size={15} />{tab === 'skill' ? '新建技能' : '接入连接器'}</button> : null}
    </div>

    <div className="mk-filters">
      <div className="bos-segment mk-tabs" role="group" aria-label="来源">
        {(Object.keys(sources) as SourceFilter[]).map(value => <button type="button" key={value} aria-pressed={source === value} onClick={() => {
          setSource(value); setScene(''); setSelectedId(null); onFocusChange?.({ tab, source: value });
        }}>{sources[value]}</button>)}
      </div>
      <label className="mk-filter"><span>场景</span><select aria-label="场景分类" value={scene} onChange={event => setScene(event.target.value)}>
        <option value="">全部场景</option>
        {scenes.map(value => <option key={value}>{value}</option>)}
      </select></label>
      {tab !== 'expert' ? <label className="mk-filter"><input type="checkbox" checked={attention} onChange={event => setAttention(event.target.checked)} />需要关注</label> : null}
      {tab === 'skill' ? <label className="mk-filter"><span>排序</span><select aria-label="技能排序" value={sortFailure ? 'failure' : ''} onChange={event => setSortFailure(event.target.value === 'failure')}><option value="">默认</option><option value="failure">失败率从高到低</option></select></label> : null}
    </div>

    <div className="mk-body">
      <div className="mk-main" id="market-results" role="tabpanel" aria-labelledby={`market-tab-${tab}`}>
        {list.length ? <div className="mk-grid">{list.map(({ item, publication, id }) => {
          const issue = marketCapabilityIssue(item);
          const expert = isRecruitable(item);
          const canRecruit = expert && (!publication || publication.status === 'approved' || publication.status === 'draft');
          const inUse = marketItemAgents(state, item).length;
          return <article key={id} className={`mk-card${selectedId === id ? ' is-selected' : ''}`}>
            <button type="button" className="mk-card-open" onClick={() => inspectItem(id)} aria-label={`查看 ${item.name} 详情`}>
              <ItemIcon item={item} size={42} />
              <span><strong>{item.name}</strong><small>{item.owner}{item.kind === 'team' ? ` · ${teamMembers(item).length} 位成员` : ''}</small></span>
            </button>
            <div className="mk-chips"><span className={`mk-tag mk-tag--${item.source}`}>{sourceLabels[item.source]}</span>{marketScenes(item).map(label => <span key={label} className="mk-tag">{label}</span>)}{issue ? <span className="mk-tag mk-tag--issue">{issue}</span> : null}</div>
            <p>{item.summary}</p>
            <footer>
              {publication ? <span className={`mk-publication mk-publication--${publication.status}`}>{publicationStatus[publication.status]} · v{item.version}</span>
                : expert ? <span>{item.installs.toLocaleString()} 次招募</span> : <span>{inUse} 个智能体使用</span>}
              {item.kind === 'skill' ? <span>失败率 {(item.skill.failRate * 100).toFixed(1)}%</span> : null}
              {item.kind === 'connector' ? <span>{item.mcp.enabled ? '已启用' : '已停用'}</span> : null}
              {canRecruit ? <button type="button" className="bos-secondary" onClick={() => setRecruiting(item)} aria-label={`招募 ${item.name}`}>招募</button> : null}
            </footer>
          </article>;
        })}</div> : <p className="mk-empty">{source === 'mine' && !q && !scene ? '这里会显示你创建的能力和沉淀的专家。' : '没有找到匹配的内容。'}</p>}
      </div>
      {selected ? <Detail key={selectedId} item={selected} state={state} byId={byId} publication={selectedPublication}
        onInstall={() => save(installItem(state, selected), `已添加「${selected.name}」到能力库`)}
        onRecruit={() => { if (isRecruitable(selected)) setRecruiting(selected); }}
        onClose={dismissItem} onOpen={openItem} onOpenBot={onOpenBot}
        onAction={action => onChange(botosReducer(state, action))} /> : null}
      {selectedBot ? <MarketAgentDetail state={state} bot={selectedBot} onBack={() => setAgentId(null)} onOpenBot={onOpenBot} onRequestDeletion={onRequestDeletion} />
        : agentsOpen ? <aside className="mk-detail" aria-label="我的智能体">
          <header className="mk-detail-head"><div><h2>我的智能体</h2></div><button type="button" className="bos-icon" onClick={() => setAgentsOpen(false)} aria-label="关闭智能体列表"><X size={16} /></button></header>
          <ul className="mk-deps">{bots.map(bot => <li key={bot.id}><button type="button" onClick={() => setAgentId(bot.id)}>
            <BotAvatar bot={bot} size={28} members={memberBots(state, bot)} />
            <span className="mk-dep-text">{bot.name}<small>{agentLabel(bot)} · {bot.memory.length} 条记忆</small></span>
          </button></li>)}</ul>
        </aside> : null}
    </div>

    {marketMcpOpen ? <div className="bos-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setMarketMcpOpen(false); }}>
      <div className="bos-modal mk-create-modal" role="dialog" aria-modal="true" aria-label="接入市场">
        <header><h2>接入市场</h2><button type="button" autoFocus className="bos-icon" onClick={() => setMarketMcpOpen(false)} aria-label="关闭接入配置"><X size={16} /></button></header>
        <p className="mk-hint">把市场 MCP 配置添加到其他产品，即可从那里搜索和调用市场条目。</p>
        <CopyBlock text={marketMcpConfig} label="市场 MCP 配置" />
      </div>
    </div> : null}
    {recruiting ? <div className="bos-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setRecruiting(null); }}>
      <div className="bos-modal nx-modal" role="dialog" aria-modal="true" aria-label="招募专家" onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); setRecruiting(null); }
      }}>
        <header><h2>招募{kindLabels[recruiting.kind]}</h2><button type="button" className="bos-icon" aria-label="关闭招募" onClick={() => setRecruiting(null)}><X size={16} /></button></header>
        <RecruitExpertForm key={recruiting.id} state={state} item={recruiting} onBack={() => setRecruiting(null)} onRecruit={options => {
          const next = recruitItem(state, recruiting, options);
          const name = next.bots.find(bot => bot.id === next.currentId)?.name ?? recruiting.name;
          save(next, `已招募「${name}」`);
          setRecruiting(null);
          onOpenBot(next.currentId);
        }} />
      </div>
    </div> : null}
    {creating ? <MarketCreationDialog kind={creating} onClose={() => setCreating(null)} onSave={action => {
      const skill = action.type === 'create-skill';
      const id = skill ? `skill:${action.skill.id}` : `connector:${action.mcp.id}`;
      save(botosReducer(state, action), skill ? '已保存到技能库' : '已保存到连接器库');
      setCreating(null);
      setSource('mine');
      setScene('');
      setQuery('');
      setAttention(false);
      setAgentsOpen(false);
      setAgentId(null);
      setSelectedId(id);
      onFocusChange?.({ tab, source: 'mine', itemId: id });
    }} /> : null}
    {toast ? <div className="mk-toast" role="status">{toast}</div> : null}
  </section>;
}
