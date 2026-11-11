import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type KeyboardEvent } from 'react';
import { ArrowUp, FileText, Hexagon, Moon, PanelLeftClose, PanelLeftOpen, Plus, Sun, X } from 'lucide-react';
import { BOTOS_STORAGE_KEY, MAIN_BOT_ID, botosReducer, faceStateOf, memberBots, nowTime, pendingCount, restoreBotos, uid, type Bot, type BotMessage, type BotosAction, type BotosState, type PendingTask } from './botModel';
import { seedBotos } from './botosSeed';
import BotAvatar from './BotAvatar';
import BotDashboard from './BotDashboard';
import BotEditor from './BotEditor';
import { draftFace, emptyDraft, type BotDraft } from './botDraft';
import { BotHub, McpHub, SkillHub, type HubId } from './HubPages';
import './BotWorkspace.css';

type Theme = 'light' | 'dark';
const THEME_KEY = 'agentos-theme-v1';
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* 无法读取时跟随系统 */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const reply = (bot: Bot, text: string, extra?: Partial<BotMessage>): BotMessage => ({ id: uid(), author: bot.kind === 'group' ? 'member' : 'bot', name: bot.name, text, time: nowTime(), ...extra });

function deliverable(request: string): string {
  const topic = request.replace(/^(帮我|请|麻烦)?(生成|做|写|整理|准备|制作|分析|看一下|查一下)?(一个|一份|一下)?/, '').replace(/[，。,.!！?？].*$/, '').slice(0, 16) || '工作成果';
  const ext = /网页|页面|落地页/.test(request) ? 'html' : /演示|汇报|ppt|PPT/.test(request) ? 'pptx' : 'md';
  return `${topic}.${ext}`;
}

/** 主 Bot 直接回答的治理类问题；返回 null 表示按普通任务处理。 */
function mainBotAnswer(state: BotosState, text: string): string | null {
  if (/skill/i.test(text) && /失败|出错|质量/.test(text)) {
    const worst = [...state.skills].sort((a, b) => b.failRate - a.failRate).slice(0, 2);
    return `失败率最高的 Skill：${worst.map(s => `「${s.name}」${(s.failRate * 100).toFixed(0)}%`).join('，')}。可以在 Skill 管理里查看使用它们的 Bot。`;
  }
  if (/mcp/i.test(text)) {
    const off = state.mcps.filter(m => !m.enabled);
    return `共接入 ${state.mcps.length} 个 MCP，${off.length ? `其中「${off.map(m => m.name).join('、')}」已停用` : '全部启用'}。凭证都托管在 Vault。`;
  }
  if (/(哪些|多少|几个).*bot|bot.*(状态|在做|进展)|在做什么/i.test(text)) {
    const bots = state.bots.filter(b => b.id !== MAIN_BOT_ID);
    const working = bots.filter(b => pendingCount(state, b.id) > 0);
    return `你有 ${bots.length} 个 Bot，${working.length ? `「${working.map(b => b.name).join('、')}」正在工作` : '目前都空闲'}。右侧仪表盘有每个 Bot 的运行记录。`;
  }
  if (/^(你好|hi|hello|你是谁|你能做什么)[？?！!。\s]*$/i.test(text)) return '我是主 Bot。我汇总所有 Bot 的进展，也能回答 Bot、Skill、MCP 的使用情况。具体工作交给下方 Bot 栏里的 Bot，或用「+」新建一个。';
  return null;
}

function TaskRunner({ task, state, dispatch, onDone }: { task: PendingTask; state: BotosState; dispatch: Dispatch<BotosAction>; onDone: (botId: string) => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const s = stateRef.current;
      const bot = s.bots.find(b => b.id === task.botId);
      if (!bot) return;
      const file = deliverable(task.request);
      const skills = bot.skillIds.map(id => s.skills.find(k => k.id === id)?.name).filter(Boolean).slice(0, 2);
      const messages: BotMessage[] = bot.kind === 'group'
        ? s.bots.filter(b => bot.memberIds.includes(b.id)).slice(0, 2).map((m, i) => reply(m, i === 0 ? '资料已整理，交给下一位继续。' : `已完成「${task.request}」。`, i === 1 || bot.memberIds.length === 1 ? { attachment: file } : {}))
        : [reply(bot, `已完成「${task.request}」${skills.length ? `，用到了 ${skills.join('、')}` : ''}。`, { attachment: file })];
      dispatch({ type: 'complete', taskId: task.id, messages, needsYou: /确认|审批|发送|发布/.test(task.request),
        memory: /记住|以后|偏好/.test(task.request) ? { id: uid(), text: task.request.replace(/^(请)?记住[：:]?/, ''), scope: 'personal', createdAt: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-') } : undefined });
      onDoneRef.current(task.botId);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [task.id, task.botId, task.request, dispatch]);
  return null;
}

function Conversation({ bot, state, recentlyDone, onCollapse }: { bot: Bot; state: BotosState; recentlyDone: string[]; onCollapse: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  const working = pendingCount(state, bot.id) > 0;
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [bot.id, bot.messages.length, working]);
  return <section className="bos-chat" aria-label={`${bot.name} 对话`}>
    <header className="bos-chat-head">
      <span className="bos-row-name"><BotAvatar bot={bot} size={24} state={faceStateOf(state, bot, recentlyDone)} members={memberBots(state, bot)} />{bot.name}</span>
      <button type="button" className="bos-icon bos-icon--dark" aria-label="收起对话" title="收起对话" onClick={onCollapse}><PanelLeftClose size={15} /></button>
    </header>
    <div className="bos-chat-scroll">
      {bot.messages.length ? bot.messages.map(m => <article key={m.id} className={`bos-msg bos-msg--${m.author}`}>
        <span className="bos-msg-name">{m.author === 'source' ? <i className="bos-source-dot" /> : null}{m.name}<time>{m.time}</time></span>
        <p>{m.text}</p>
        {m.attachment ? <span className="bos-file"><FileText size={13} />{m.attachment}</span> : null}
      </article>) : <p className="bos-chat-empty">这是 {bot.name} 的第一段对话。说说你想让它做什么。</p>}
      {working ? <article className="bos-msg bos-msg--bot"><span className="bos-msg-name">{bot.name}</span><p className="bos-typing"><i /><i /><i /></p></article> : null}
      <div ref={end} />
    </div>
  </section>;
}

function NewBotDialog({ state, onClose, onCreate }: { state: BotosState; onClose: () => void; onCreate: (draft: BotDraft) => void }) {
  const [draft, setDraft] = useState<BotDraft>(emptyDraft());
  useEffect(() => { const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const valid = draft.name.trim() && (draft.kind === 'bot' || draft.memberIds.length > 0);
  return <div className="bos-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="bos-modal" role="dialog" aria-modal="true" aria-label="新建 Bot">
      <header><h2>新建{draft.kind === 'group' ? '群聊' : ' Bot'}</h2><button type="button" className="bos-icon" aria-label="关闭" onClick={onClose}><X size={16} /></button></header>
      <BotEditor draft={draft} onChange={setDraft} state={state} showTemplates />
      <footer><span className="bos-hint">{draft.kind === 'group' && !draft.memberIds.length ? '至少选择一个成员 Bot' : ''}</span>
        <button type="button" className="bos-secondary" onClick={onClose}>取消</button>
        <button type="button" className="bos-primary" disabled={!valid} onClick={() => onCreate(draft)}>创建</button></footer>
    </div>
  </div>;
}

export default function BotWorkspace() {
  const [state, dispatch] = useReducer(botosReducer, null, () => { try { return restoreBotos(localStorage.getItem(BOTOS_STORAGE_KEY), seedBotos); } catch { return seedBotos(); } });
  const [draft, setDraft] = useState('');
  const [hub, setHub] = useState<HubId | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const toggleTheme = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* 仅本次生效 */ }
    return next;
  });
  const [recentlyDone, setRecentlyDone] = useState<string[]>([]);
  // 任务完成后头像「刚完成」几秒（眯眼笑、蹦一下），再回到原来的状态。
  const markDone = useCallback((botId: string) => {
    setRecentlyDone(list => [...list.filter(id => id !== botId), botId]);
    window.setTimeout(() => setRecentlyDone(list => list.filter(id => id !== botId)), 4000);
  }, []);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { try { localStorage.setItem(BOTOS_STORAGE_KEY, JSON.stringify(state)); } catch { /* 浏览器无法保存时继续使用内存状态 */ } }, [state]);
  useEffect(() => { const el = inputRef.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; }, [draft]);

  const current = state.bots.find(b => b.id === state.currentId) ?? state.bots[0];
  const others = useMemo(() => state.order.filter(id => id !== current.id).map(id => state.bots.find(b => b.id === id)).filter((b): b is Bot => !!b), [state.order, state.bots, current.id]);
  const lastMessage = current.messages[current.messages.length - 1];

  const selectBot = (id: string) => { dispatch({ type: 'select', id }); setHub(null); };
  const openHub = (id: HubId) => setHub(h => h === id ? null : id);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const userMessage: BotMessage = { id: uid(), author: 'user', name: 'Samhar', text, time: nowTime() };
    setDraft(''); setHub(null); setChatOpen(true);
    if (current.kind === 'main') {
      const answer = mainBotAnswer(state, text);
      if (answer) {
        dispatch({ type: 'reply', botId: current.id, messages: [userMessage, reply(current, answer)] });
        return;
      }
    }
    dispatch({ type: 'send', botId: current.id, message: userMessage, task: { id: uid(), botId: current.id, request: text } });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } };
  const create = (d: BotDraft) => {
    const id = `bot-${uid().slice(0, 8)}`;
    dispatch({ type: 'create-bot', bot: { id, name: d.name.trim(), kind: d.kind, face: draftFace(d, state), prompt: d.prompt.trim(), model: d.model, skillIds: d.skillIds, mcpIds: d.mcpIds, memberIds: d.memberIds,
      memory: [], history: Array.from({ length: 56 }, () => [0, 0] as [number, number]), createdAt: new Date().toLocaleDateString('zh-CN'),
      messages: [{ id: uid(), author: d.kind === 'group' ? 'member' : 'bot', name: d.name.trim(), text: d.kind === 'group' ? `群聊已建立，成员：${d.memberIds.map(m => state.bots.find(b => b.id === m)?.name).join('、')}。` : `我是 ${d.name.trim()}。${d.prompt.trim() || '告诉我要做什么。'}`, time: nowTime() }] } });
    setCreating(false); setHub(null); setChatOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const hubProps = { state, dispatch, onOpenBot: selectBot, onClose: () => setHub(null), onNewBot: () => setCreating(true) };

  return <div className="bos-shell kdx-theme" data-theme={theme}>
    {state.pending.map(task => <TaskRunner key={task.id} task={task} state={state} dispatch={dispatch} onDone={markDone} />)}
    <header className="bos-top">
      <button type="button" className="bos-brand" onClick={() => selectBot(MAIN_BOT_ID)} aria-label="回到主 Bot"><Hexagon size={26} fill="currentColor" strokeWidth={1.4} /><span>Agent OS</span></button>
      <div className="bos-account">
        <button type="button" className="bos-me" aria-label="账户" aria-expanded={accountOpen} onClick={() => setAccountOpen(v => !v)}>S</button>
        <button type="button" className="bos-theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换到亮色' : '切换到深色'} title={theme === 'dark' ? '切换到亮色' : '切换到深色'}>
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        {accountOpen ? <div className="bos-popover" role="menu">
          <strong>Samhar</strong><p>交互原型 · 数据保存在本地，Bot 回复为模拟。</p>
          <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'reset', state: seedBotos() }); setAccountOpen(false); setHub(null); }}>重置演示数据</button>
          <a role="menuitem" href="?view=avatars">Bot 头像样稿</a>
          <a role="menuitem" href="?view=v02">查看 v0.2 工作空间</a>
        </div> : null}
      </div>
    </header>

    <main className={`bos-panel${chatOpen && !hub ? '' : ' is-wide'}`}>
      {chatOpen && !hub ? <Conversation bot={current} state={state} recentlyDone={recentlyDone} onCollapse={() => setChatOpen(false)} /> : null}
      <div className="bos-panel-right">
        {hub === 'bots' ? <BotHub {...hubProps} />
          : hub === 'skills' ? <SkillHub {...hubProps} />
            : hub === 'mcps' ? <McpHub {...hubProps} />
              : <BotDashboard state={state} bot={current} recentlyDone={recentlyDone} onSelectBot={selectBot} />}
      </div>
    </main>

    <nav className="bos-botbar" aria-label="Bot 栏">
      <button type="button" className="bos-current" onClick={() => { setHub(null); setChatOpen(true); }} aria-current="true" title={`当前对话：${current.name}`}>
        <BotAvatar bot={current} size={24} state={faceStateOf(state, current, recentlyDone)} members={memberBots(state, current)} />
        <span className="bos-pill-name">{current.name}</span>{pendingCount(state, current.id) ? <span className="bos-badge">{pendingCount(state, current.id)}</span> : null}
      </button>
      <span className="bos-botbar-divider" aria-hidden="true" />
      <button type="button" className="bos-add" aria-label="新建 Bot" title="新建 Bot 或群聊" onClick={() => setCreating(true)}><Plus size={16} strokeWidth={2.2} /></button>
      <div className="bos-botbar-list">
        {others.map(b => {
          const n = pendingCount(state, b.id);
          const face = faceStateOf(state, b, recentlyDone);
          const status = { working: `，${n} 项进行中`, done: '，刚完成', needs: '，需要你处理', idle: '' }[face];
          return <button type="button" key={b.id} className="bos-bot-pill" onClick={() => selectBot(b.id)} aria-label={`${b.name}${b.kind === 'group' ? '（群聊）' : ''}${status}`}>
            <BotAvatar bot={b} size={24} state={face} members={memberBots(state, b)} />
            <span className="bos-pill-name">{b.name}</span>{n ? <span className="bos-badge">{n}</span> : null}
          </button>;
        })}
      </div>
    </nav>

    <footer className="bos-inputrow">
      {!chatOpen && !hub ? <button type="button" className="bos-collapsed-chat" onClick={() => setChatOpen(true)} aria-label={`展开 ${current.name} 的对话`}>
        <PanelLeftOpen size={14} /><span><strong>{current.name}</strong>{lastMessage ? <small>{lastMessage.text}</small> : null}</span>
      </button> : null}
      <button type="button" className={`bos-home${current.kind === 'main' && !hub ? ' is-active' : ''}`} aria-label="主 Bot" title="主 Bot · 首页" onClick={() => selectBot(MAIN_BOT_ID)}>H</button>
      <div className="bos-input">
        <textarea ref={inputRef} rows={1} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKeyDown}
          placeholder={current.kind === 'main' ? '问主 Bot：哪些 Bot 在工作？哪些 Skill 失败最多？' : `告诉 ${current.name} 你想要做什么任务…`} aria-label={`发送给 ${current.name}`} />
        <button type="button" className="bos-send" aria-label="发送" disabled={!draft.trim()} onClick={send}><ArrowUp size={17} strokeWidth={2.2} /></button>
      </div>
      <div className="bos-hub-buttons" role="group" aria-label="管理">
        <button type="button" aria-pressed={hub === 'bots'} onClick={() => openHub('bots')}>Bot 管理</button>
        <button type="button" aria-pressed={hub === 'skills'} onClick={() => openHub('skills')}>Skill 管理</button>
        <button type="button" aria-pressed={hub === 'mcps'} onClick={() => openHub('mcps')}>MCP 管理</button>
      </div>
    </footer>

    {creating ? <NewBotDialog state={state} onClose={() => setCreating(false)} onCreate={create} /> : null}
  </div>;
}
