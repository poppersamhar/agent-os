import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Download, Hexagon, Moon, Plug, Search, Sparkles, Sun, X } from 'lucide-react';
import BotFace, { BotFaceStack } from './BotFace';
import { BOTOS_STORAGE_KEY, restoreBotos, type BotosState } from './botModel';
import { seedBotos } from './botosSeed';
import { publicationStatus, type ExpertPublication } from './expertDefinitions';
import {
  findItem, installItem, isInstalled, isRecruitable, itemDeps, kindLabels, marketCatalog, marketMcpConfig, mcpConfig, pluginPackage, publishedDefinitions, recruitItem, remoteTools, sourceLabels, teamMembers, versionHistory,
  type MarketItem, type MarketKind, type MarketSource,
} from './marketCatalog';
import RecruitExpertForm from './RecruitExpertForm';
import './BotWorkspace.css';
import './AgentMarket.css';

type Theme = 'light' | 'dark';
const THEME_KEY = 'agentos-theme-v1';
function initialTheme(): Theme {
  try { const saved = localStorage.getItem(THEME_KEY); if (saved === 'light' || saved === 'dark') return saved; } catch { /* 跟随系统 */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
const loadState = (fallback = seedBotos): BotosState => { try { return restoreBotos(localStorage.getItem(BOTOS_STORAGE_KEY), fallback); } catch { return fallback(); } };

const kinds: (MarketKind | 'all')[] = ['all', 'expert', 'team', 'skill', 'connector'];
const kindIntro: Record<MarketKind | 'all', string> = {
  all: '招募专家、专家团，添加技能和连接器，或作为插件接入其他产品。',
  expert: '从专家定义创建智能体，招募时可以逐个授权连接器。',
  team: '多个专家协作完成一类工作，每次招募都会创建新的群成员。',
  skill: '可复用的工作方法。专家掌握技能后，就能用这种方法干活。',
  connector: '通过 MCP 协议接入企业系统。凭证由管理员在 Vault 中配置，不会交给专家或第三方。',
};

function ItemIcon({ item, size }: { item: MarketItem; size: number }) {
  if (item.kind === 'expert') return <BotFace face={item.face} size={size} />;
  if (item.kind === 'team') return <BotFaceStack faces={teamMembers(item).map(m => m.face)} size={size} />;
  return <span className={`mk-icon mk-icon--${item.kind}`} style={{ width: size, height: size }}>{item.kind === 'skill' ? <Sparkles size={size * 0.45} /> : <Plug size={size * 0.45} />}</span>;
}

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* 复制失败时用户仍可手动选中 */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };
  return <div className="mk-code">
    <button type="button" className="mk-code-copy" onClick={copy} aria-label={`复制${label}`}>{copied ? <><Check size={13} />已复制</> : <><Copy size={13} />复制</>}</button>
    <pre><code>{text}</code></pre>
  </div>;
}

function download(item: MarketItem) {
  const pkg = pluginPackage(item);
  const url = URL.createObjectURL(new Blob([pkg.content], { type: pkg.mime }));
  const a = document.createElement('a');
  a.href = url; a.download = pkg.filename; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Detail({ item, state, publication, onInstall, onRecruit, onClose, onOpen }: {
  item: MarketItem; state: BotosState; publication?: ExpertPublication;
  onInstall: () => void; onRecruit: () => void; onClose: () => void; onOpen: (id: string) => void;
}) {
  const [tab, setTab] = useState<'remote' | 'package'>('remote');
  const installed = isInstalled(state, item);
  const deps = itemDeps(item);
  const dependencies = [...deps.skillIds.map(id => findItem(`skill:${id}`)), ...deps.mcpIds.map(id => findItem(`connector:${id}`))]
    .filter((i): i is MarketItem => !!i);
  const members = item.kind === 'team' ? teamMembers(item) : [];
  const visible = !publication || publication.status === 'approved';
  const recruitable = isRecruitable(item);
  const versions = versionHistory(item, state);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <aside className="mk-detail" aria-label={`${item.name} 详情`}>
    <header className="mk-detail-head">
      <ItemIcon item={item} size={52} />
      <div><h2>{item.name}</h2><p><span className="mk-tag">{kindLabels[item.kind]}</span><span className={`mk-tag mk-tag--${item.source}`}>{sourceLabels[item.source]}</span>{item.owner} · v{item.version}</p></div>
      <button type="button" className="bos-icon" aria-label="关闭详情" onClick={onClose}><X size={16} /></button>
    </header>
    <p className="mk-desc">{item.description}</p>

    {publication ? <p className={`mk-publication mk-publication--${publication.status}`}>{publicationStatus[publication.status]}</p> : null}
    {visible ? <div className="mk-actions">
      {recruitable ? <button type="button" className="bos-primary" onClick={onRecruit}>招募到 AgentOS</button>
        : installed ? <a className="bos-secondary mk-installed" href="./"><Check size={14} />已添加 · 去 AgentOS 使用</a>
          : <button type="button" className="bos-primary" onClick={onInstall}>添加到 AgentOS</button>}
    </div> : null}

    {members.length ? <section className="mk-section"><h3>成员专家</h3><ul className="mk-deps">{members.map(m => <li key={m.id}><div className="mk-dep-row"><BotFace face={m.face} size={26} /><span className="mk-dep-text">{m.name}<small>{m.summary}</small></span>{findItem(m.id, state) ? <button type="button" className="bos-secondary" onClick={() => onOpen(m.id)}>查看</button> : null}</div></li>)}</ul></section> : null}
    {recruitable && dependencies.length > 0 ? <section className="mk-section"><h3>需要的能力</h3><ul className="mk-deps">
      {dependencies.map(d => <li key={d.id}><button type="button" onClick={() => onOpen(d.id)}><ItemIcon item={d} size={26} /><span className="mk-dep-text">{d.name}<small>{kindLabels[d.kind]}</small></span></button></li>)}
    </ul></section> : null}
    {item.kind === 'connector' ? <section className="mk-section"><h3>工具</h3><div className="mk-chips">{item.mcp.tools.map(t => <span key={t} className="mk-tag">{t}</span>)}</div></section> : null}

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

export default function AgentMarket() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [state, setState] = useState<BotosState>(loadState);
  const [kind, setKind] = useState<MarketKind | 'all'>(() => {
    const k = new URLSearchParams(window.location.search).get('kind');
    return k && (kinds as string[]).includes(k) ? k as MarketKind : 'all';
  });
  const [source, setSource] = useState<MarketSource | 'all'>(() => new URLSearchParams(window.location.search).get('source') === 'mine' ? 'mine' : 'all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recruiting, setRecruiting] = useState(false);
  const [marketMcpOpen, setMarketMcpOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 工作空间在别的标签页里改了数据时，这里同步刷新「已添加」状态。
  useEffect(() => { const onStorage = (e: StorageEvent) => { if (e.key === BOTOS_STORAGE_KEY) setState(loadState()); }; window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage); }, []);
  const toggleTheme = () => setTheme(t => { const next = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_KEY, next); } catch { /* 仅本次生效 */ } return next; });

  const q = query.trim().toLowerCase();
  const catalog = useMemo(() => [...marketCatalog, ...publishedDefinitions(state)], [state]);
  const publications = useMemo(() => (state.expertPublications ?? []).filter(entry => entry.status !== 'draft'), [state]);
  const matches = (item: MarketItem) => (kind === 'all' || item.kind === kind) && (!q || `${item.name}${item.summary}${item.tags.join('')}${item.owner}`.toLowerCase().includes(q));
  const list = catalog.filter(item => matches(item) && (source === 'all' || item.source === source || (source === 'org' && isRecruitable(item) && item.source === 'mine'))
    && (source !== 'mine' || !publications.some(entry => entry.definition.id === item.id)));
  const mine = source === 'mine' ? publications.filter(entry => matches(entry.definition)) : [];
  const counts = Object.fromEntries(kinds.map(k => [k, catalog.filter(i => k === 'all' || i.kind === k).length]));
  const selectedPublication = publications.find(entry => entry.id === selectedId);
  const selected = selectedPublication?.definition ?? (selectedId ? findItem(selectedId, state) : undefined);

  const save = (next: BotosState, message: string) => {
    try { localStorage.setItem(BOTOS_STORAGE_KEY, JSON.stringify(next)); } catch { /* 无法保存时只更新本页 */ }
    setState(next);
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  return <div className="mk-shell kdx-theme" data-theme={theme}>
    <header className="mk-top">
      <a className="mk-back" href="./"><ArrowLeft size={14} />返回 AgentOS</a>
      <div className="mk-brand"><Hexagon size={22} fill="currentColor" strokeWidth={1.4} /><span>Agent Market</span></div>
      <label className="bos-search mk-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索专家、专家团、技能、连接器" aria-label="搜索市场" /></label>
      <button type="button" className="bos-theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换到亮色' : '切换到深色'}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
    </header>

    <div className="mk-body">
      <nav className="mk-side" aria-label="市场分类">
        <p className="mk-side-label">分类</p>
        {kinds.map(k => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'all' ? '全部' : kindLabels[k]}<small>{counts[k]}</small></button>)}
        <p className="mk-side-label">来源</p>
        {(['all', 'official', 'org', 'mine'] as const).map(s => <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)}>{s === 'all' ? '全部来源' : sourceLabels[s]}</button>)}
        <div className="mk-plugin-card">
          <strong>把市场接入你的产品</strong>
          <p>整个 Agent Market 也是一个 MCP 插件：第三方 Agent 可以在对话里搜索、添加和调用这里的内容。</p>
          <button type="button" className="bos-secondary" onClick={() => setMarketMcpOpen(v => !v)}>{marketMcpOpen ? '收起配置' : '查看接入配置'}</button>
          {marketMcpOpen ? <CopyBlock text={marketMcpConfig} label="市场 MCP 配置" /> : null}
        </div>
      </nav>

      <main className="mk-main">
        <header className="mk-main-head"><h1>{kind === 'all' ? 'Agent Market' : kindLabels[kind]}</h1><p>{kindIntro[kind]}</p></header>
        {list.length || mine.length ? <div className="mk-grid">{[...mine.map(entry => ({ item: entry.definition, publication: entry })), ...list.map(item => ({ item, publication: undefined }))].map(({ item, publication }) => {
          const installed = !isRecruitable(item) && isInstalled(state, item);
          const id = publication?.id ?? item.id;
          return <button type="button" key={id} className={`mk-card${selectedId === id ? ' is-selected' : ''}`} onClick={() => setSelectedId(id)}>
            <header><ItemIcon item={item} size={40} /><div><strong>{item.name}</strong><span><span className="mk-tag">{kindLabels[item.kind]}</span><span className={`mk-tag mk-tag--${item.source}`}>{sourceLabels[item.source]}</span></span></div></header>
            <p>{item.summary}</p>
            <footer><span>{item.owner}</span>{publication ? <><span>v{item.version}</span><span className={`mk-publication mk-publication--${publication.status}`}>{publicationStatus[publication.status]}</span></> : <span>{item.installs.toLocaleString()} 次{isRecruitable(item) ? '招募' : '添加'}</span>}{installed ? <span className="mk-added"><Check size={12} />已添加</span> : null}</footer>
          </button>;
        })}</div> : <p className="mk-empty">{source === 'mine' ? '你还没有发布到市场的内容。之后可以在 AgentOS 里把自己的专家、技能发布到这里。' : '没有找到匹配的内容。'}</p>}
      </main>

      {selected ? <Detail key={selectedId} item={selected} state={state} publication={selectedPublication}
        onInstall={() => save(installItem(loadState(() => state), selected), `已添加「${selected.name}」到 AgentOS`)}
        onRecruit={() => setRecruiting(true)} onClose={() => setSelectedId(null)} onOpen={setSelectedId} /> : null}
    </div>
    {recruiting && selected && isRecruitable(selected) ? <div className="bos-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setRecruiting(false); }}>
      <div className="bos-modal nx-modal" role="dialog" aria-modal="true" aria-label="招募专家" onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); setRecruiting(false); }
      }}>
        <header><h2>招募专家</h2><button type="button" className="bos-icon" aria-label="关闭招募" onClick={() => setRecruiting(false)}><X size={16} /></button></header>
        <RecruitExpertForm key={selectedId} state={state} item={selected} onBack={() => setRecruiting(false)} onRecruit={options => {
          const next = recruitItem(loadState(() => state), selected, options);
          const name = next.bots.find(bot => bot.id === next.currentId)?.name ?? selected.name;
          save(next, `已招募「${name}」到 AgentOS`);
          setRecruiting(false);
        }} />
      </div>
    </div> : null}
    {toast ? <div className="mk-toast" role="status">{toast}</div> : null}
  </div>;
}
