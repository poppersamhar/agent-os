import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type KeyboardEvent } from 'react';
import { ArrowUp, Bell, FileText, Hexagon, Moon, PanelLeftClose, PanelLeftOpen, Plus, Store, Sun } from 'lucide-react';
import NoticePanel from './NoticePanel';
import { useNotices } from './notices';
import { BOTOS_STORAGE_KEY, MAIN_BOT_ID, SYSTEM_AGENTS, agentLabel, botosReducer, isAgent, faceStateOf, memberBots, nowTime, pendingCount, restoreBotos, uid, type Bot, type BotMessage, type BotosAction, type BotosState, type PendingTask } from './botModel';
import { seedBotos } from './botosSeed';
import BotAvatar from './BotAvatar';
import BotDashboard from './BotDashboard';
import NewExpertDialog from './NewExpertDialog';
import ChoiceCard from './ChoiceCard';
import { openingMessage } from './firstTask';
import type { FaceState } from './botFaces';
import { draftFace, type BotDraft } from './botDraft';
import { BotHub, McpHub, SkillHub } from './HubPages';
import { systemReply } from './systemAgents';
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

/** 企业效能管理智能体直接回答的治理类问题；返回 null 表示按普通任务处理。 */
function mainBotAnswer(state: BotosState, text: string): string | null {
  if (/skill|技能/i.test(text) && /失败|出错|质量/.test(text)) {
    const worst = [...state.skills].sort((a, b) => b.failRate - a.failRate).slice(0, 2);
    return `失败率最高的技能：${worst.map(s => `「${s.name}」${(s.failRate * 100).toFixed(0)}%`).join('，')}。可以在「技能」里查看使用它们的智能体。`;
  }
  if (/mcp|连接器/i.test(text)) {
    const off = state.mcps.filter(m => !m.enabled);
    return `共接入 ${state.mcps.length} 个连接器，${off.length ? `其中「${off.map(m => m.name).join('、')}」已停用` : '全部启用'}。凭证都托管在 Vault。`;
  }
  if (/(哪些|多少|几个).*(bot|专家)|(bot|专家).*(状态|在做|进展)|在做什么/i.test(text)) {
    const bots = state.bots.filter(isAgent);
    const working = bots.filter(b => pendingCount(state, b.id) > 0);
    return `你有 ${bots.length} 个智能体，${working.length ? `「${working.map(b => b.name).join('、')}」正在工作` : '目前都空闲'}。右侧工作台有每个智能体的运行记录。`;
  }
  if (/^(你好|hi|hello|你是谁|你能做什么)[？?！!。\s]*$/i.test(text)) return '我是企业效能管理智能体。我汇总所有智能体的进展，也能回答智能体、技能、连接器的使用情况。具体工作交给下方专家栏里的专家，或用「+」新建一个。';
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

function Conversation({ bot, state, recentlyDone, onCollapse, onAnswer, onOther }: { bot: Bot; state: BotosState; recentlyDone: string[]; onCollapse: () => void; onAnswer: (messageId: string, answer: string) => void; onOther: () => void }) {
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
        {m.choices ? <ChoiceCard choices={m.choices} onPick={answer => onAnswer(m.id, answer)} onOther={onOther} /> : null}
      </article>) : <p className="bos-chat-empty">这是 {bot.name} 的第一段对话。说说你想让它做什么。</p>}
      {working ? <article className="bos-msg bos-msg--bot"><span className="bos-msg-name">{bot.name}</span><p className="bos-typing"><i /><i /><i /></p></article> : null}
      <div ref={end} />
    </div>
  </section>;
}

/**
 * 首页 / 专家 / 技能 / 连接器的按钮。
 * 未选中：头像在上、名字小字在下（像桌面应用图标），和智能体栏的左右排列区分开。
 * 选中：深色胶囊（头像 + 名字），和当前对话的智能体一致。
 */
function SysButton({ bot, label, selected, state, onClick }: { bot: Bot; label: string; selected: boolean; state: FaceState; onClick: () => void }) {
  return <button type="button" className={`bos-sys-button${selected ? ' is-selected' : ''}`} aria-label={label} aria-pressed={selected} title={bot.kind === 'main' ? bot.name : label} onClick={onClick}>
    <BotAvatar bot={bot} size={selected ? 24 : 30} state={state} /><span>{label}</span>
  </button>;
}

export default function BotWorkspace() {
  const [state, dispatch] = useReducer(botosReducer, null, () => { try { return restoreBotos(localStorage.getItem(BOTOS_STORAGE_KEY), seedBotos); } catch { return seedBotos(); } });
  const [draft, setDraft] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useNotices();
  const unread = notices.filter(n => !n.read).length;
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
  const mainBot = state.bots.find(b => b.id === MAIN_BOT_ID) ?? state.bots[0];
  const onMain = current.kind === 'main';
  const sysRole = current.kind === 'system' ? current.role : undefined;
  const systemAgents = SYSTEM_AGENTS.map(sys => state.bots.find(b => b.id === sys.id)).filter((b): b is Bot => !!b);

  const selectBot = (id: string) => { dispatch({ type: 'select', id }); setChatOpen(true); };
  const send = (preset?: string) => {
    const text = (preset ?? draft).trim();
    if (!text) return;
    const userMessage: BotMessage = { id: uid(), author: 'user', name: 'Samhar', text, time: nowTime() };
    setDraft(''); setChatOpen(true);
    if (current.kind === 'system' && current.role) {
      // 管理智能体：直接回复，并按对话修改右侧面板的数据
      const result = systemReply(current.role, state, text);
      const messages = [userMessage, reply(current, result.text)];
      if (result.state) dispatch({ type: 'reset', state: botosReducer(result.state, { type: 'reply', botId: current.id, messages }) });
      else dispatch({ type: 'reply', botId: current.id, messages });
      if (result.openCreate) window.setTimeout(() => setCreating(true), 400);
      return;
    }
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
      messages: [openingMessage(d.name.trim(), d.prompt.trim(), d.kind === 'group' ? 'member' : 'bot')] } });
    setCreating(false); setChatOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const mature = (bot: Bot, publish: boolean) => {
    const target = bot.kind === 'group' ? '专家团' : '专家';
    dispatch({ type: 'mature', id: bot.id });
    dispatch({ type: 'reply', botId: bot.id, messages: [reply(bot, `我已沉淀为${target}。以后可以在「专家」里找到我${publish ? '；发布到企业市场的申请已提交，审批结果会出现在通知里' : ''}。`)] });
    if (publish) setNotices([{ id: uid(), kind: 'submitted', title: `「${bot.name}」已提交审批`, detail: `沉淀为${target}，申请发布到企业市场，等待管理员审批。`, time: '刚刚', read: false }, ...notices]);
  };
  const hubProps = { state, dispatch, onOpenBot: selectBot, onClose: () => selectBot(MAIN_BOT_ID), onNewBot: () => setCreating(true) };

  return <div className={`bos-shell kdx-theme${onMain ? ' is-home' : ''}`} data-theme={theme}>
    {state.pending.map(task => <TaskRunner key={task.id} task={task} state={state} dispatch={dispatch} onDone={markDone} />)}
    {/* 首页（企业效能管理智能体）顶部显示 Logo 与名称；其他页面不占这一行，智能体头像放在面板左上角 */}
    {onMain ? <header className="bos-top">
      <button type="button" className="bos-brand" onClick={() => selectBot(MAIN_BOT_ID)} aria-label="回到企业效能管理智能体"><Hexagon size={24} fill="currentColor" strokeWidth={1.4} /><span>Agent OS</span></button>
    </header> : null}

    {/* 右侧窄栏：头像、亮暗切换、通知 */}
    <aside className="bos-rail" aria-label="账户与通知">
      <button type="button" className="bos-me" aria-label="账户" aria-expanded={accountOpen} onClick={() => { setAccountOpen(v => !v); setNoticesOpen(false); }}>S</button>
      <button type="button" className="bos-rail-button" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换到亮色' : '切换到深色'} title={theme === 'dark' ? '切换到亮色' : '切换到深色'}>
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      </button>
      <button type="button" className="bos-rail-button" aria-label={`通知${unread ? `，${unread} 条未读` : ''}`} aria-expanded={noticesOpen} title="通知" onClick={() => { setNoticesOpen(v => !v); setAccountOpen(false); }}>
        <Bell size={13} />{unread ? <span className="bos-rail-dot" aria-hidden="true" /> : null}
      </button>
      {accountOpen ? <div className="bos-popover" role="menu">
        <strong>Samhar</strong><p>交互原型 · 数据保存在本地，智能体回复为模拟。</p>
        <a role="menuitem" className="bos-menu-market" href="?view=market"><Store size={15} /><span><strong>市场</strong><small>Agent Market · 专家、专家团、技能、连接器</small></span></a>
        <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'reset', state: seedBotos() }); setAccountOpen(false); }}>重置演示数据</button>
        <a role="menuitem" href="?view=avatars">智能体头像样稿</a>
        <a role="menuitem" href="?view=v02">查看 v0.2 工作空间</a>
      </div> : null}
      {noticesOpen ? <NoticePanel notices={notices} onChange={setNotices} onClose={() => setNoticesOpen(false)} /> : null}
    </aside>

    <main className={`bos-panel${chatOpen ? '' : ' is-wide'}`}>
      {chatOpen ? <Conversation bot={current} state={state} recentlyDone={recentlyDone} onCollapse={() => setChatOpen(false)}
        onAnswer={(messageId, answer) => { dispatch({ type: 'answer', botId: current.id, messageId, answer }); send(answer); }}
        onOther={() => inputRef.current?.focus()} /> : null}
      <div className="bos-panel-right">
        {/* 管理智能体的右侧面板就是对应的管理页 */}
        {sysRole === 'experts' ? <BotHub {...hubProps} />
          : sysRole === 'skills' ? <SkillHub {...hubProps} />
            : sysRole === 'connectors' ? <McpHub {...hubProps} />
              : <BotDashboard state={state} bot={current} recentlyDone={recentlyDone} faceState={faceStateOf(state, current, recentlyDone)} onSelectBot={selectBot} onMature={publish => mature(current, publish)} />}
      </div>
    </main>

    <nav className="bos-botbar" aria-label="智能体栏">
      {/* 首页和管理智能体分别在左下角、右下角的按钮上体现，智能体栏只放用户的智能体 */}
      {!isAgent(current) ? null : <>
        <button type="button" className="bos-current" onClick={() => setChatOpen(true)} aria-current="true" title={`当前对话：${current.name}`}>
          <BotAvatar bot={current} size={24} state={faceStateOf(state, current, recentlyDone)} members={memberBots(state, current)} />
          <span className="bos-pill-name">{current.name}</span>{pendingCount(state, current.id) ? <span className="bos-badge">{pendingCount(state, current.id)}</span> : null}
        </button>
        <span className="bos-botbar-divider" aria-hidden="true" />
      </>}
      <button type="button" className="bos-add" aria-label="新建智能体" title="新建智能体" onClick={() => setCreating(true)}><Plus size={16} strokeWidth={2.2} /></button>
      <div className="bos-botbar-list">
        {others.map(b => {
          const n = pendingCount(state, b.id);
          const face = faceStateOf(state, b, recentlyDone);
          const status = { working: `，${n} 项进行中`, done: '，刚完成', needs: '，需要你处理', idle: '' }[face];
          return <button type="button" key={b.id} className="bos-bot-pill" onClick={() => selectBot(b.id)} aria-label={`${b.name}（${agentLabel(b)}）${status}`}>
            <BotAvatar bot={b} size={24} state={face} members={memberBots(state, b)} />
            <span className="bos-pill-name">{b.name}</span>{n ? <span className="bos-badge">{n}</span> : null}
          </button>;
        })}
      </div>
    </nav>

    <footer className="bos-inputrow">
      {!chatOpen ? <button type="button" className="bos-collapsed-chat" onClick={() => setChatOpen(true)} aria-label={`展开 ${current.name} 的对话`}>
        <PanelLeftOpen size={14} /><span><strong>{current.name}</strong>{lastMessage ? <small>{lastMessage.text}</small> : null}</span>
      </button> : null}
      <SysButton bot={mainBot} label="首页" selected={onMain} state={faceStateOf(state, mainBot, recentlyDone)} onClick={() => selectBot(MAIN_BOT_ID)} />
      <div className="bos-input">
        <textarea ref={inputRef} rows={1} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKeyDown}
          placeholder={current.kind === 'main' ? '问企业效能管理智能体：哪些智能体在工作？哪些技能失败最多？' : `告诉 ${current.name} 你想要做什么任务…`} aria-label={`发送给 ${current.name}`} />
        <button type="button" className="bos-send" aria-label="发送" disabled={!draft.trim()} onClick={() => send()}><ArrowUp size={17} strokeWidth={2.2} /></button>
      </div>
      {/* 专家 / 技能 / 连接器：和首页一样，点开后左边对话，右边是管理面板 */}
      <div className="bos-hub-buttons" role="group" aria-label="专家、技能、连接器">
        {systemAgents.map(sys => <SysButton key={sys.id} bot={sys} label={sys.name} selected={current.id === sys.id} state={faceStateOf(state, sys, recentlyDone)}
          onClick={() => selectBot(current.id === sys.id ? MAIN_BOT_ID : sys.id)} />)}
      </div>
    </footer>

    {creating ? <NewExpertDialog state={state} onClose={() => setCreating(false)} onCreate={create}
      onInstall={next => { dispatch({ type: 'reset', state: next }); setCreating(false); setChatOpen(true); }} /> : null}
  </div>;
}
