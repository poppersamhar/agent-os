import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Download, Hexagon, Moon, Plug, Search, Sparkles, Sun, X } from 'lucide-react';
import BotFace, { BotFaceStack } from './BotFace';
import { BOTOS_STORAGE_KEY, restoreBotos, type BotosState } from './botModel';
import { seedBotos } from './botosSeed';
import {
  findItem, installItem, isInstalled, itemDeps, kindLabels, marketCatalog, marketMcpConfig, mcpConfig, pluginPackage, remoteTools, sourceLabels, teamMembers,
  type MarketItem, type MarketKind, type MarketSource,
} from './marketCatalog';
import './BotWorkspace.css';
import './AgentMarket.css';

type Theme = 'light' | 'dark';
const THEME_KEY = 'agentos-theme-v1';
function initialTheme(): Theme {
  try { const saved = localStorage.getItem(THEME_KEY); if (saved === 'light' || saved === 'dark') return saved; } catch { /* 跟随系统 */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
const loadState = (): BotosState => { try { return restoreBotos(localStorage.getItem(BOTOS_STORAGE_KEY), seedBotos); } catch { return seedBotos(); } };

const kinds: (MarketKind | 'all')[] = ['all', 'expert', 'team', 'skill', 'connector'];
const kindIntro: Record<MarketKind | 'all', string> = {
  all: '专家、专家团、技能、连接器都在这里。添加到 AgentOS 即可使用，也可以作为插件接入其他产品。',
  expert: '有明确职能的专家：带着需要的技能和连接器，添加后就能直接交代工作。',
  team: '多个专家协作完成一类工作，添加时会一起添加成员专家。',
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

function Detail({ item, state, onInstall, onClose, onOpen }: { item: MarketItem; state: BotosState; onInstall: () => void; onClose: () => void; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<'remote' | 'package'>('remote');
  const installed = isInstalled(state, item);
  const deps = itemDeps(item);
  const depSkills = deps.skillIds.map(id => findItem(`skill:${id}`)).filter((i): i is MarketItem => !!i);
  const depMcps = deps.mcpIds.map(id => findItem(`connector:${id}`)).filter((i): i is MarketItem => !!i);
  const members = item.kind === 'team' ? teamMembers(item) : [];
  const needsVault = depMcps.some(m => m.kind === 'connector' && m.mcp.credential === 'vault');
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <aside className="mk-detail" aria-label={`${item.name} 详情`}>
    <header className="mk-detail-head">
      <ItemIcon item={item} size={52} />
      <div><h2>{item.name}</h2><p><span className="mk-tag">{kindLabels[item.kind]}</span><span className={`mk-tag mk-tag--${item.source}`}>{sourceLabels[item.source]}</span>{item.owner} · v{item.version}</p></div>
      <button type="button" className="bos-icon" aria-label="关闭详情" onClick={onClose}><X size={16} /></button>
    </header>
    <p className="mk-desc">{item.description}</p>

    <div className="mk-actions">
      {installed
        ? <a className="bos-secondary mk-installed" href="./"><Check size={14} />已添加 · 去 AgentOS 使用</a>
        : <button type="button" className="bos-primary" onClick={onInstall}>添加到 AgentOS</button>}
      <span className="mk-hint">{installed ? '' : item.kind === 'team' ? `会同时添加 ${members.length} 位成员专家${depSkills.length + depMcps.length ? '及所需的技能、连接器' : ''}` : depSkills.length + depMcps.length > (item.kind === 'expert' ? 0 : 1) ? '所需的技能、连接器会一起添加' : ''}</span>
    </div>
    {needsVault ? <p className="mk-note">包含需要凭证的连接器。正式使用时由企业管理员审批并配置凭证；原型里直接添加。</p> : null}

    {members.length ? <section className="mk-section"><h3>成员专家</h3><ul className="mk-deps">{members.map(m => <li key={m.id}><button type="button" onClick={() => onOpen(m.id)}><BotFace face={m.face} size={26} /><span className="mk-dep-text">{m.name}<small>{m.summary}</small></span>{isInstalled(state, m) ? <Check size={14} className="mk-ok" /> : null}</button></li>)}</ul></section> : null}
    {item.kind !== 'skill' && item.kind !== 'connector' && (depSkills.length || depMcps.length) ? <section className="mk-section"><h3>需要的能力</h3><ul className="mk-deps">
      {[...depSkills, ...depMcps].map(d => <li key={d.id}><button type="button" onClick={() => onOpen(d.id)}><ItemIcon item={d} size={26} /><span className="mk-dep-text">{d.name}<small>{kindLabels[d.kind]}</small></span>{isInstalled(state, d) ? <Check size={14} className="mk-ok" /> : <small className="mk-will">将添加</small>}</button></li>)}
    </ul></section> : null}
    {item.kind === 'connector' ? <section className="mk-section"><h3>工具</h3><div className="mk-chips">{item.mcp.tools.map(t => <span key={t} className="mk-tag">{t}</span>)}</div></section> : null}

    <section className="mk-section">
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
    </section>

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
  const [source, setSource] = useState<MarketSource | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [marketMcpOpen, setMarketMcpOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 工作空间在别的标签页里改了数据时，这里同步刷新「已添加」状态。
  useEffect(() => { const onStorage = (e: StorageEvent) => { if (e.key === BOTOS_STORAGE_KEY) setState(loadState()); }; window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage); }, []);
  const toggleTheme = () => setTheme(t => { const next = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_KEY, next); } catch { /* 仅本次生效 */ } return next; });

  const q = query.trim().toLowerCase();
  const list = useMemo(() => marketCatalog.filter(item => (kind === 'all' || item.kind === kind) && (source === 'all' || item.source === source)
    && (!q || `${item.name}${item.summary}${item.tags.join('')}${item.owner}`.toLowerCase().includes(q))), [kind, source, q]);
  const counts = useMemo(() => Object.fromEntries(kinds.map(k => [k, marketCatalog.filter(i => k === 'all' || i.kind === k).length])), []);
  const selected = selectedId ? findItem(selectedId) : undefined;

  const install = (item: MarketItem) => {
    const next = installItem(state, item);
    try { localStorage.setItem(BOTOS_STORAGE_KEY, JSON.stringify(next)); } catch { /* 无法保存时只更新本页 */ }
    setState(next);
    setToast(`已添加「${item.name}」到 AgentOS`);
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
        {list.length ? <div className="mk-grid">{list.map(item => {
          const installed = isInstalled(state, item);
          return <button type="button" key={item.id} className={`mk-card${selectedId === item.id ? ' is-selected' : ''}`} onClick={() => setSelectedId(item.id)}>
            <header><ItemIcon item={item} size={40} /><div><strong>{item.name}</strong><span><span className="mk-tag">{kindLabels[item.kind]}</span><span className={`mk-tag mk-tag--${item.source}`}>{sourceLabels[item.source]}</span></span></div></header>
            <p>{item.summary}</p>
            <footer><span>{item.owner}</span><span>{item.installs.toLocaleString()} 次添加</span>{installed ? <span className="mk-added"><Check size={12} />已添加</span> : null}</footer>
          </button>;
        })}</div> : <p className="mk-empty">{source === 'mine' ? '你还没有发布到市场的内容。之后可以在 AgentOS 里把自己的专家、技能发布到这里。' : '没有找到匹配的内容。'}</p>}
      </main>

      {selected ? <Detail key={selected.id} item={selected} state={state} onInstall={() => install(selected)} onClose={() => setSelectedId(null)} onOpen={setSelectedId} /> : null}
    </div>
    {toast ? <div className="mk-toast" role="status">{toast}</div> : null}
  </div>;
}
