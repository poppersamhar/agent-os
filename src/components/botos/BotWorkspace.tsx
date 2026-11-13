import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUp, Bell, FileText, Hexagon, Moon, Plus, Store, Sun } from 'lucide-react';
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
import { useChatSplit } from './useChatSplit';
import './BotWorkspace.css';

type Theme = 'light' | 'dark';
const THEME_KEY = 'agentos-theme-v1';
const SIDE_KEY = 'agentos-side-v1';
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
  if (/^(你好|hi|hello|你是谁|你能做什么)[？?！!。\s]*$/i.test(text)) return '我是企业效能管理智能体。我汇总所有智能体的进展，也能回答智能体、技能、连接器的使用情况。具体工作交给左侧的智能体，或用「+」新建一个。';
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

function ChatPanelIcon() {
  return <svg className="bos-chat-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="18" rx="4.5" />
    <path d="M6.5 7.5v9" />
  </svg>;
}

function Conversation({ bot, state, recentlyDone, active, onCollapse, onAnswer, onOther, children }: { bot: Bot; state: BotosState; recentlyDone: string[]; active: boolean; onCollapse: () => void; onAnswer: (messageId: string, answer: string) => void; onOther: () => void; children?: ReactNode }) {
  const end = useRef<HTMLDivElement>(null);
  const working = pendingCount(state, bot.id) > 0;
  useEffect(() => { if (active) end.current?.scrollIntoView({ block: 'end' }); }, [bot.id, bot.messages.length, working, active]);
  return <section className="bos-chat" aria-label={`${bot.name} 对话`}>
    <header className="bos-chat-head">
      <span className="bos-row-name"><BotAvatar bot={bot} size={24} state={faceStateOf(state, bot, recentlyDone)} members={memberBots(state, bot)} /><span className="bos-chat-title">{bot.name}</span></span>
      <button type="button" className="bos-icon bos-icon--dark bos-chat-collapse" aria-label="收起对话" title="收起对话" onClick={onCollapse}>
        <ChatPanelIcon />
      </button>
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
    {children}
  </section>;
}

type Tip = { text: string; top: number; left: number } | null;

/**
 * 左侧侧栏里的一个智能体。
 * 展开时：头像 + 名字 + 进行中的任务数；收起时只有头像，悬停或聚焦立刻弹出名字。
 * 选中时有一圈主色描边。
 */
function RailItem({ bot, name, label, selected, face, badge, members, expanded, onTip, onClick }: { bot: Bot; name: string; label: string; selected: boolean; face: FaceState; badge?: number; members?: Bot[]; expanded: boolean; onTip: (tip: Tip) => void; onClick: () => void }) {
  const show = (el: HTMLElement) => {
    if (expanded) return;
    const r = el.getBoundingClientRect();
    onTip({ text: label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  return <button type="button" className={`bos-side-item${selected ? ' is-selected' : ''}`} aria-label={label} aria-current={selected ? 'true' : undefined} onClick={onClick}
    onMouseEnter={e => show(e.currentTarget)} onMouseLeave={() => onTip(null)} onFocus={e => show(e.currentTarget)} onBlur={() => onTip(null)}>
    <span className="bos-side-avatar"><BotAvatar bot={bot} size={26} state={face} members={members} />{badge && !expanded ? <span className="bos-badge">{badge}</span> : null}</span>
    {expanded ? <><span className="bos-side-name">{name}</span>{badge ? <span className="bos-side-count">{badge}</span> : null}</> : null}
  </button>;
}

export default function BotWorkspace() {
  const [state, dispatch] = useReducer(botosReducer, null, () => { try { return restoreBotos(localStorage.getItem(BOTOS_STORAGE_KEY), seedBotos); } catch { return seedBotos(); } });
  const [draft, setDraft] = useState('');
  const { panelRef, paneRef, separatorRef, chatOpen, resizing, settling, setChatOpen, separatorProps } = useChatSplit();
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
  const [sideOpen, setSideOpen] = useState(() => { try { return localStorage.getItem(SIDE_KEY) !== 'closed'; } catch { return true; } });
  const toggleSide = () => setSideOpen(v => {
    try { localStorage.setItem(SIDE_KEY, v ? 'closed' : 'open'); } catch { /* 仅本次生效 */ }
    return !v;
  });
  const [tip, setTip] = useState<Tip>(null);
  const railProps = { expanded: sideOpen, onTip: setTip };
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
  const agents = useMemo(() => state.order.map(id => state.bots.find(b => b.id === id)).filter((b): b is Bot => !!b && isAgent(b)), [state.order, state.bots]);
  const lastMessage = current.messages[current.messages.length - 1];
  const mainBot = state.bots.find(b => b.id === MAIN_BOT_ID) ?? state.bots[0];
  const onMain = current.kind === 'main';
  const sysRole = current.kind === 'system' ? current.role : undefined;
  // 竖栏里的顺序：技能、连接器、专家
  const systemAgents = (['skills', 'connectors', 'experts'] as const).map(role => SYSTEM_AGENTS.find(sys => sys.role === role)).map(sys => state.bots.find(b => b.id === sys?.id)).filter((b): b is Bot => !!b);

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

  return <div className={`bos-shell kdx-theme${sideOpen ? ' has-side-open' : ''}`} data-theme={theme}>
    {state.pending.map(task => <TaskRunner key={task.id} task={task} state={state} dispatch={dispatch} onDone={markDone} />)}
    {/* 左侧竖栏：上面是首页、技能、连接器、专家、新建和用户的智能体；下面是我的、通知、亮暗切换 */}
    <aside className={`bos-side${sideOpen ? ' is-open' : ''}`} aria-label="智能体">
      <div className="bos-side-top">
        {/* 展开时：左边是 Agent OS 标识，右边是收起按钮；收起时只留按钮 */}
        <div className="bos-side-head">
          {sideOpen ? <button type="button" className="bos-side-brand" onClick={() => selectBot(MAIN_BOT_ID)} aria-label="Agent OS，回到首页"><Hexagon size={20} fill="currentColor" strokeWidth={1.4} /><span>Agent OS</span></button> : null}
          <button type="button" className="bos-side-toggle" onClick={toggleSide} aria-expanded={sideOpen} aria-label={sideOpen ? '收起侧栏' : '展开侧栏'} title={sideOpen ? '收起侧栏' : '展开侧栏'}>
            <ChatPanelIcon />
          </button>
        </div>
        <RailItem bot={mainBot} name="首页" label={`首页：${mainBot.name}`} selected={onMain} face={faceStateOf(state, mainBot, recentlyDone)} {...railProps} onClick={() => selectBot(MAIN_BOT_ID)} />
        <div className="bos-side-group" role="group" aria-label="技能、连接器、专家">
          {systemAgents.map(sys => <RailItem key={sys.id} bot={sys} name={sys.name} label={sys.name} selected={current.id === sys.id} face={faceStateOf(state, sys, recentlyDone)} {...railProps}
            onClick={() => selectBot(current.id === sys.id ? MAIN_BOT_ID : sys.id)} />)}
        </div>
        <button type="button" className="bos-side-new" aria-label="新建智能体" title={sideOpen ? undefined : '新建智能体'} onClick={() => setCreating(true)}><span className="bos-add" aria-hidden="true"><Plus size={15} strokeWidth={2.2} /></span>{sideOpen ? <span className="bos-side-name">新建智能体</span> : null}</button>
        <div className="bos-side-list">
          {agents.map(b => {
            const n = pendingCount(state, b.id);
            const face = faceStateOf(state, b, recentlyDone);
            const status = { working: `，${n} 项进行中`, done: '，刚完成', needs: '，需要你处理', idle: '' }[face];
            return <RailItem key={b.id} bot={b} name={b.name} label={`${b.name}（${agentLabel(b)}）${status}`} selected={current.id === b.id} face={face} badge={n} members={memberBots(state, b)} {...railProps} onClick={() => selectBot(b.id)} />;
          })}
        </div>
      </div>
      <div className="bos-side-bottom">
        <button type="button" className="bos-side-me" aria-label="我的" title={sideOpen ? undefined : '我的'} aria-expanded={accountOpen} onClick={() => { setAccountOpen(v => !v); setNoticesOpen(false); }}><span className="bos-me" aria-hidden="true">S</span>{sideOpen ? <span className="bos-side-name">我的</span> : null}</button>
        <button type="button" className="bos-rail-button" aria-label={`通知${unread ? `，${unread} 条未读` : ''}`} aria-expanded={noticesOpen} title="通知" onClick={() => { setNoticesOpen(v => !v); setAccountOpen(false); }}>
          <Bell size={13} />{unread ? <span className="bos-rail-dot" aria-hidden="true" /> : null}
        </button>
        <button type="button" className="bos-rail-button" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换到亮色' : '切换到深色'} title={theme === 'dark' ? '切换到亮色' : '切换到深色'}>
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        {accountOpen ? <div className="bos-popover" role="menu">
          <strong>Samhar</strong><p>交互原型 · 数据保存在本地，智能体回复为模拟。</p>
          <a role="menuitem" className="bos-menu-market" href="?view=market"><Store size={15} /><span><strong>市场</strong><small>Agent Market · 专家、专家团、技能、连接器</small></span></a>
          <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'reset', state: seedBotos() }); setAccountOpen(false); }}>重置演示数据</button>
          <a role="menuitem" href="?view=avatars">智能体头像样稿</a>
        </div> : null}
        {noticesOpen ? <NoticePanel notices={notices} onChange={setNotices} onClose={() => setNoticesOpen(false)} /> : null}
      </div>
    </aside>
    {tip ? <div className="bos-side-tip" role="tooltip" style={{ top: tip.top, left: tip.left }}>{tip.text}</div> : null}

    <main ref={panelRef} className={`bos-panel${chatOpen ? '' : ' is-wide'}${resizing ? ' is-resizing' : ''}${settling ? ' is-settling' : ''}`}>
      <div ref={paneRef} id="bos-conversation" className="bos-chat-pane" inert={!chatOpen && !resizing} aria-hidden={!chatOpen && !resizing}>
        <Conversation bot={current} state={state} recentlyDone={recentlyDone} active={chatOpen || resizing} onCollapse={() => setChatOpen(false)}
          onAnswer={(messageId, answer) => { dispatch({ type: 'answer', botId: current.id, messageId, answer }); send(answer); }}
          onOther={() => inputRef.current?.focus()}>
          {/* 输入框放在对话面板底部 */}
          <div className="bos-input">
            <textarea ref={inputRef} rows={1} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKeyDown}
              placeholder={current.kind === 'main' ? '问企业效能管理智能体：哪些智能体在工作？' : `告诉 ${current.name} 你想要做什么…`} aria-label={`发送给 ${current.name}`} />
            <button type="button" className="bos-send" aria-label="发送" disabled={!draft.trim()} onClick={() => send()}><ArrowUp size={17} strokeWidth={2.2} /></button>
          </div>
        </Conversation>
      </div>
      <div ref={separatorRef} className="bos-chat-resizer" role="separator" tabIndex={0} aria-label="调整对话宽度" aria-orientation="vertical"
        aria-controls="bos-conversation" aria-valuemin={0} aria-valuemax={50} {...separatorProps} />
      <div className="bos-panel-right">
        {/* 管理智能体的右侧面板就是对应的管理页 */}
        {sysRole === 'experts' ? <BotHub {...hubProps} />
          : sysRole === 'skills' ? <SkillHub {...hubProps} />
            : sysRole === 'connectors' ? <McpHub {...hubProps} />
              : <BotDashboard state={state} bot={current} recentlyDone={recentlyDone} faceState={faceStateOf(state, current, recentlyDone)} onSelectBot={selectBot} onMature={publish => mature(current, publish)} />}
      </div>
      {!chatOpen ? <button type="button" className="bos-collapsed-chat" onClick={() => setChatOpen(true)} aria-label={`展开 ${current.name} 的对话`}>
        <ChatPanelIcon /><span><strong>{current.name}</strong>{lastMessage ? <small>{lastMessage.text}</small> : null}</span>
      </button> : null}
    </main>

    {creating ? <NewExpertDialog state={state} onClose={() => setCreating(false)} onCreate={create}
      onInstall={next => { dispatch({ type: 'reset', state: next }); setCreating(false); setChatOpen(true); }} /> : null}
  </div>;
}
