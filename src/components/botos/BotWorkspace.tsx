import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type Dispatch, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUp, Bell, FileText, Hexagon, House, Moon, Plus, Store, Sun } from 'lucide-react';
import NoticePanel from './NoticePanel';
import { useNotices } from './notices';
import { BOTOS_STORAGE_KEY, HOME_PAGE_ID, MARKET_PAGE_ID, agentLabel, botosReducer, composeDashboard, faceStateOf, memberBots, nowTime, pendingCount, restoreBotos, uid, type Bot, type BotMessage, type BotosAction, type BotosState, type PendingTask, type WidgetSlot } from './botModel';
import { seedBotos } from './botosSeed';
import BotAvatar from './BotAvatar';
import BotDashboard from './BotDashboard';
import NewExpertDialog from './NewExpertDialog';
import ChoiceCard from './ChoiceCard';
import { openingMessage } from './firstTask';
import type { FaceState } from './botFaces';
import { draftFace, type BotDraft } from './botDraft';
import AgentMarket, { type MarketFocus } from './AgentMarket';
import HomePage from './HomePage';
import CaptureExpertDialog from './CaptureExpertDialog';
import { maturityFor } from './botMaturity';
import { makeSkill, parseSkillRequest } from './capabilityDrafts';
import type { RecruitableItem } from './marketCatalog';
import { useChatSplit } from './useChatSplit';
import ApprovalCard from './ApprovalCard';
import { approvalStatus, createApproval, type ApprovalDecision } from './governance';
import { canUseConnector, hasGrant } from './capabilities';
import { PERSONNEL_MCP_ID, personnelApproval } from './personnel';
import { inferDashboardTemplate } from './dashboardTemplates';
import { routineFromRequest, tableRows } from './workspaceWidgets';
import { ExecutionSteps } from './AgentWidgets';
import type { ExpertPublication } from './expertDefinitions';
import './BotWorkspace.css';

type Theme = 'light' | 'dark';
const THEME_KEY = 'agentos-theme-v1';
const SIDE_KEY = 'agentos-side-v1';
const TAB_SELECTION_KEY = 'agentos-tab-selection-v1';
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* 无法读取时跟随系统 */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const reply = (bot: Bot, text: string, extra?: Partial<BotMessage>): BotMessage => ({ id: uid(), author: bot.kind === 'group' ? 'member' : 'bot', name: bot.name, text, time: nowTime(), at: Date.now(), ...extra });

function deliverable(request: string): string {
  const topic = request.replace(/^(帮我|请|麻烦)?(生成|做|写|整理|准备|制作|分析|看一下|查一下)?(一个|一份|一下)?/, '').replace(/[，。,.!！?？].*$/, '').slice(0, 16) || '工作成果';
  const ext = /网页|页面|落地页/.test(request) ? 'html' : /演示|汇报|ppt|PPT/.test(request) ? 'pptx' : 'md';
  return `${topic}.${ext}`;
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
      if (task.personnel) {
        dispatch({ type: 'personnel-complete', taskId: task.id, at: Date.now() });
        onDoneRef.current(task.botId);
        return;
      }
      const file = deliverable(task.request);
      const connector = s.mcps.find(mcp => canUseConnector(s, bot, mcp.id));
      const execution: BotMessage['execution'] = connector
        ? [{ path: '连接器', tool: connector.tools[0] ?? connector.name, durationMs: 380 }]
        : [];
      if (/本地|员工电脑/.test(task.request)) execution.push({ path: 'KodaX Space', tool: '预览本地处理流程', durationMs: 670 });
      else if (/代码|运维|修复|构建/.test(task.request)) execution.push({ path: 'KodaX CLI', tool: '生成实现方案', durationMs: 880 });
      else execution.push({ path: '临时沙箱', tool: '生成工作成果', durationMs: 740 });
      const skills = bot.skillIds.filter(id => hasGrant(bot, 'skill', id)).map(id => s.skills.find(k => k.id === id)?.name).filter(Boolean).slice(0, 2);
      const needsUser = /确认|决定|重试/.test(task.request);
      const finalText = `已整理「${task.request}」${skills.length ? `，用到了 ${skills.join('、')}` : ''}。${needsUser ? '请确认是否按成果中的方案继续。' : ''}`;
      const messages: BotMessage[] = bot.kind === 'group' && bot.memberIds.length > 0
        ? s.bots.filter(b => bot.memberIds.includes(b.id)).slice(0, 2).map((m, i) => i === 1 || bot.memberIds.length === 1
          ? reply(m, finalText, { author: 'member', attachment: file, execution, needsUser })
          : reply(m, '资料已整理，交给下一位继续。', { author: 'member' }))
        : [reply(bot, finalText, { attachment: file, execution, needsUser })];
      dispatch({ type: 'complete', taskId: task.id, messages, needsYou: needsUser,
        memory: /记住|以后|偏好/.test(task.request) ? { id: uid(), text: task.request.replace(/^(请)?记住[：:]?/, ''), scope: 'personal', createdAt: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-') } : undefined });
      onDoneRef.current(task.botId);
    }, task.personnel ? 650 : 3200);
    return () => window.clearTimeout(timer);
  }, [task.id, task.botId, task.request, task.personnel, dispatch]);
  return null;
}

function ChatPanelIcon() {
  return <svg className="bos-chat-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="18" rx="4.5" />
    <path d="M6.5 7.5v9" />
  </svg>;
}

function Conversation({ bot, state, recentlyDone, active, onCollapse, onAnswer, onOther, onDecide, onSubmitApproval, targetMessage, onResolveWaiting, children }: { bot: Bot; state: BotosState; recentlyDone: string[]; active: boolean; onCollapse: () => void; onAnswer: (messageId: string, answer: string) => void; onOther: () => void; onDecide: (id: string, decision: ApprovalDecision) => void; onSubmitApproval: (id: string) => void; targetMessage?: { id: string }; onResolveWaiting: (id: string) => void; children?: ReactNode }) {
  const end = useRef<HTMLDivElement>(null);
  const focusedMessage = useRef<HTMLElement>(null);
  const handledTarget = useRef<{ id: string } | undefined>(undefined);
  const working = pendingCount(state, bot.id) > 0;
  useLayoutEffect(() => {
    if (!active) return;
    if (targetMessage && targetMessage !== handledTarget.current && focusedMessage.current) {
      focusedMessage.current.scrollIntoView({ block: 'center' });
      focusedMessage.current.focus({ preventScroll: true });
      handledTarget.current = targetMessage;
      return;
    }
    end.current?.scrollIntoView({ block: 'end' });
  }, [bot.id, bot.messages.length, working, active, targetMessage]);
  return <section className="bos-chat" aria-label={`${bot.name} 对话`}>
    <header className="bos-chat-head">
      <span className="bos-row-name"><BotAvatar bot={bot} size={24} state={faceStateOf(state, bot, recentlyDone)} members={memberBots(state, bot)} /><span className="bos-chat-title">{bot.name}</span></span>
      <button type="button" className="bos-icon bos-icon--dark bos-chat-collapse" aria-label="收起对话" title="收起对话" onClick={onCollapse}>
        <ChatPanelIcon />
      </button>
    </header>
    <div className="bos-chat-scroll">
      {bot.messages.length ? bot.messages.map(message => {
        const approval = message.approvalId ? state.approvals.find(item => item.id === message.approvalId) : undefined;
        const targeted = message.id === targetMessage?.id;
        return <article key={message.id} ref={targeted ? focusedMessage : undefined} tabIndex={targeted ? -1 : undefined}
          className={`bos-msg bos-msg--${message.author}${targeted ? ' is-targeted' : ''}`}>
          <span className="bos-msg-name">{message.author === 'source' ? <i className="bos-source-dot" /> : null}{message.name}<time>{message.time}</time></span>
          {message.execution?.length ? <ExecutionSteps steps={message.execution} /> : null}
          {message.text ? <p>{message.text}</p> : null}
          {approval ? <ApprovalCard approval={approval} onDecide={onDecide} onSubmit={onSubmitApproval} /> : null}
          {message.attachment ? <span className="bos-file"><FileText size={13} />{message.attachment}</span> : null}
          {message.choices ? <ChoiceCard choices={message.choices} onPick={answer => onAnswer(message.id, answer)} onOther={onOther} /> : null}
          {message.needsUser ? <button type="button" className="bos-secondary bos-resolve-waiting" onClick={() => onResolveWaiting(message.id)}>标记已处理</button> : null}
        </article>;
      }) : <p className="bos-chat-empty">这是 {bot.name} 的第一段对话。说说你想让它做什么。</p>}
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

function initialWorkspace(): BotosState {
  let state: BotosState;
  try { state = restoreBotos(localStorage.getItem(BOTOS_STORAGE_KEY), seedBotos); }
  catch { state = seedBotos(); }
  if (new URLSearchParams(window.location.search).get('view') === MARKET_PAGE_ID) return { ...state, currentId: MARKET_PAGE_ID };
  try {
    const selected = sessionStorage.getItem(TAB_SELECTION_KEY);
    if (selected && selected !== MARKET_PAGE_ID) return botosReducer(state, { type: 'select', id: selected });
  } catch { /* 浏览器不允许读取会话选中项。 */ }
  return state;
}

function marketFocusFromUrl(): MarketFocus {
  const params = new URLSearchParams(window.location.search);
  const kind = params.get('kind');
  const tab = kind === 'skill' || kind === 'connector' ? kind : 'expert';
  const source = params.get('source');
  return { tab, itemId: params.get('item') ?? undefined, source: source === 'org' || source === 'mine' ? source : 'all' };
}

export default function BotWorkspace() {
  const [state, dispatch] = useReducer(botosReducer, null, initialWorkspace);
  const [draft, setDraft] = useState('');
  const current = state.bots.find(bot => bot.id === state.currentId);
  const { panelRef, paneRef, separatorRef, chatOpen, resizing, settling, setChatOpen, separatorProps } = useChatSplit(!!current);
  const [creating, setCreating] = useState(false);
  const [recruitGroup, setRecruitGroup] = useState<string>();
  const [recommendedExpert, setRecommendedExpert] = useState<RecruitableItem>();
  const [captureId, setCaptureId] = useState<string>();
  const [targetMessage, setTargetMessage] = useState<{ id: string }>();
  const [marketFocus, setMarketFocus] = useState(marketFocusFromUrl);
  const [accountOpen, setAccountOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useNotices();
  const unread = notices.filter(n => !n.read).length + state.approvals.filter(item => item.submittedAt !== undefined && approvalStatus(item) === 'pending').length;
  useEffect(() => {
    const deadlines = state.approvals.filter(item => item.submittedAt !== undefined && item.status === 'pending').map(item => item.expiresAt);
    if (!deadlines.length) return;
    const timer = window.setTimeout(() => dispatch({ type: 'expire-approvals', at: Date.now() }), Math.min(2147483647, Math.max(0, Math.min(...deadlines) - Date.now())));
    return () => window.clearTimeout(timer);
  }, [state.approvals]);
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
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== BOTOS_STORAGE_KEY || !event.newValue || event.newValue !== localStorage.getItem(BOTOS_STORAGE_KEY)) return;
      dispatch({ type: 'sync', state: restoreBotos(event.newValue, seedBotos) });
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    try {
      const value = JSON.stringify(state);
      const saved = localStorage.getItem(BOTOS_STORAGE_KEY);
      if (saved === value) return;
      // Selection is local to each open tab. A synced snapshot may differ only by selection.
      const savedState = saved ? JSON.parse(saved) as Partial<BotosState> : undefined;
      if (!savedState || JSON.stringify({ ...savedState, currentId: state.currentId }) !== value) localStorage.setItem(BOTOS_STORAGE_KEY, value);
    } catch {
      try { localStorage.setItem(BOTOS_STORAGE_KEY, JSON.stringify(state)); } catch { /* 浏览器无法保存时继续使用内存状态 */ }
    }
  }, [state]);
  useEffect(() => {
    try { sessionStorage.setItem(TAB_SELECTION_KEY, state.currentId); } catch { /* 仅保留当前页面状态。 */ }
  }, [state.currentId]);
  useEffect(() => { const el = inputRef.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; }, [draft, current?.id]);

  const agents = useMemo(() => state.order.flatMap(id => {
    const bot = state.bots.find(item => item.id === id);
    return bot ? [bot] : [];
  }), [state.order, state.bots]);
  const lastMessage = current?.messages.at(-1);
  const onHome = state.currentId === HOME_PAGE_ID;
  const onMarket = state.currentId === MARKET_PAGE_ID;
  const capturing = state.bots.find(bot => bot.id === captureId);

  const selectBot = (id: string, messageId?: string) => {
    if (id !== state.currentId) setDraft('');
    setTargetMessage(messageId ? { id: messageId } : undefined);
    dispatch({ type: 'select', id });
    setChatOpen(true);
  };
  const openMarket = (tab: MarketFocus['tab'] = 'expert', itemId?: string) => {
    setMarketFocus(previous => ({ tab, itemId, token: (previous.token ?? 0) + 1 }));
    selectBot(MARKET_PAGE_ID);
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    if (onMarket) {
      url.searchParams.set('view', MARKET_PAGE_ID);
      if (marketFocus.tab === 'expert') url.searchParams.delete('kind');
      else url.searchParams.set('kind', marketFocus.tab);
      if (marketFocus.itemId) url.searchParams.set('item', marketFocus.itemId);
      else url.searchParams.delete('item');
      if (marketFocus.source && marketFocus.source !== 'all') url.searchParams.set('source', marketFocus.source);
      else url.searchParams.delete('source');
    } else {
      for (const key of ['view', 'kind', 'item', 'source']) url.searchParams.delete(key);
    }
    if (url.href !== window.location.href) window.history.replaceState(null, '', url);
  }, [onMarket, marketFocus]);
  const onDecide = (id: string, decision: ApprovalDecision) => dispatch({ type: 'resolve-approval', id, decision, at: Date.now() });
  const onSubmitApproval = (id: string) => dispatch({ type: 'submit-approval', id, at: Date.now() });
  const requestConnector = (id: string, reason: string, message?: BotMessage) => {
    const connector = state.mcps.find(item => item.id === id);
    if (!current || !connector || !connector.enabled || canUseConnector(state, current, id)) return;
    setChatOpen(true);
    const approval = createApproval({ id: uid(), botId: current.id, botName: current.name, kind: 'connector-access', targetId: id,
      title: `申请「${connector.name}」只读权限`, detail: reason, impact: `仅授予 ${current.name}，有效期 30 天` });
    dispatch({ type: 'request-approval', approval, messages: message ? [message] : undefined });
  };
  const askWidget = (slot: WidgetSlot) => {
    setDraft(`解释一下『${slot.title}』里的${slot.kind === 'metrics' || slot.kind === 'trend' ? '数字' : '内容'}`);
    setChatOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const send = (preset?: string) => {
    const text = (preset ?? draft).trim();
    if (!text || !current) return;
    setTargetMessage(undefined);
    const userMessage: BotMessage = { id: uid(), author: 'user', name: 'Samhar', text, time: nowTime() };
    setDraft(''); setChatOpen(true);
    const spec = composeDashboard(current, state.skills, state.mcps);
    if (/放到最上面|移到顶部|放在最上面|置顶/.test(text)) {
      const widget = spec.widgets.find(slot => text.includes(slot.title));
      if (widget) {
        dispatch({ type: 'reorder-widgets', botId: current.id, first: widget.id, messages: [userMessage, reply(current, `已把「${widget.title}」移到工作台顶部。`)] });
        return;
      }
    }
    const routine = routineFromRequest(text, uid());
    if (routine) {
      dispatch({ type: 'routine-create', botId: current.id, routine, messages: [userMessage, reply(current, `已创建 Routine：${routine.name}。`)] });
      return;
    }
    if (/^(?:帮我|请)?(?:新建|创建|新增|沉淀).*技能/.test(text)) {
      const skillDraft = parseSkillRequest(text);
      if (!skillDraft.name) {
        dispatch({ type: 'reply', botId: current.id, messages: [userMessage, reply(current, '这个技能叫什么、做什么用？例如「新建一个投诉分析技能：归纳投诉原因和占比」。')] });
      } else if (state.skills.some(item => item.name === skillDraft.name)) {
        dispatch({ type: 'reply', botId: current.id, messages: [userMessage, reply(current, `技能「${skillDraft.name}」已存在，可以在市场查看。`)] });
      } else {
        const skill = makeSkill(skillDraft);
        dispatch({ type: 'create-skill', skill });
        dispatch({ type: 'update-bot', id: current.id, patch: { skillIds: [...current.skillIds, skill.id] } });
        dispatch({ type: 'reply', botId: current.id, messages: [userMessage, reply(current, `已创建并装上「${skill.name}」。可以在市场的「我的」里查看。`)] });
      }
      return;
    }
    const skill = state.skills.find(item => text.includes(item.name) && /安装|装上|添加|启用/.test(text));
    if (skill) {
      if (!hasGrant(current, 'skill', skill.id)) dispatch({ type: 'update-bot', id: current.id, patch: { skillIds: [...new Set([...current.skillIds, skill.id])] } });
      dispatch({ type: 'reply', botId: current.id, messages: [userMessage, reply(current, `「${skill.name}」已在当前智能体的能力清单中。`)] });
      return;
    }
    const connector = state.mcps.find(item => text.includes(item.name) && /权限|授权|申请|使用|接入|查询/.test(text))
      ?? (/人员|身份证/.test(text) ? state.mcps.find(item => item.id === PERSONNEL_MCP_ID) : undefined);
    if (connector && !canUseConnector(state, current, connector.id)) {
      if (connector.enabled) requestConnector(connector.id, `完成当前任务需要读取「${connector.name}」。`, { ...userMessage, text: text.replace(/\d{17}[\dXx]/g, '[身份证号已隐藏]') });
      else dispatch({ type: 'reply', botId: current.id, messages: [reply(current, `「${connector.name}」已停用。可以在市场的「连接器」标签中查看。`)] });
      return;
    }
    if (connector?.id === PERSONNEL_MCP_ID) {
      dispatch({ type: 'reply', botId: current.id, messages: [reply(current, '请在右侧「人员查询」填写模拟身份证号和查询事由。结果会脱敏，并写入查询记录。')] });
      return;
    }
    if (/发到|发给|发送|发群|发一下|发.*到|发.*群/.test(text) && /群|飞书|钉钉|纪要/.test(text)) {
      const preferred = /钉钉/.test(text) || (!/飞书/.test(text) && !canUseConnector(state, current, 'feishu') && canUseConnector(state, current, 'dingtalk')) ? 'dingtalk' : 'feishu';
      const channel = preferred === 'dingtalk' ? '钉钉' : '飞书';
      if (!canUseConnector(state, current, preferred)) requestConnector(preferred, `发送群聊消息需要先申请${channel}连接器。`, userMessage);
      else dispatch({ type: 'request-approval', approval: createApproval({ id: uid(), botId: current.id, botName: current.name, kind: 'send-external', targetId: preferred,
        title: `发送内容到${channel}群聊`, detail: text, impact: '群聊成员可见 · 模拟发送' }), messages: [userMessage] });
      return;
    }
    if (/删除.*(智能体|我自己)|删除自己/.test(text)) {
      dispatch({ type: 'request-approval', approval: createApproval({ id: uid(), botId: current.id, botName: current.name, kind: 'delete',
        targetId: current.id, title: `删除「${current.name}」`, detail: '移除这个智能体及其工作区。', impact: '对话、记忆和工作区将被移除' }), messages: [userMessage] });
      return;
    }
    dispatch({ type: 'send', botId: current.id, message: userMessage, task: { id: uid(), botId: current.id, request: text } });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } };
  const create = (d: BotDraft) => {
    const id = `bot-${uid().slice(0, 8)}`;
    dispatch({ type: 'create-bot', bot: { id, name: d.name.trim(), kind: d.kind, face: draftFace(d, state), prompt: d.prompt.trim(), model: d.model, skillIds: d.skillIds, mcpIds: d.mcpIds, memberIds: d.memberIds,
      dashboardTemplate: inferDashboardTemplate(d.name, d.prompt, d.mcpIds), dashboardUpdatedAt: Date.now(),
      memory: [], history: Array.from({ length: 56 }, () => [0, 0] as [number, number]), createdAt: new Date().toLocaleDateString('zh-CN'),
      messages: [openingMessage(d.name.trim(), d.prompt.trim(), d.kind === 'group' ? 'member' : 'bot')] } });
    setCreating(false); setTargetMessage(undefined); setChatOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const capture = (bot: Bot, publication: ExpertPublication, prompt: string) => {
    const target = bot.kind === 'group' ? '专家团' : '专家';
    const pending = publication.status === 'pending';
    const approval = pending ? createApproval({ id: uid(), botId: bot.id, botName: bot.name, kind: 'publish', targetId: publication.id,
      title: `发布${target}「${bot.name}」`, detail: `申请将「${bot.name}」的定义发布到企业市场。`, impact: '企业成员可以招募该定义' }) : undefined;
    dispatch({ type: 'capture-expert', publication, prompt, approval,
      message: reply(bot, `我已沉淀为${target}。${pending ? '发布申请已提交，可在通知中查看审批进度。' : '你可以在「招募专家」中复用这个定义。'}`) });
    setCaptureId(undefined);
  };
  const openCapture = (id: string) => {
    const bot = state.bots.find(item => item.id === id);
    if (bot && (bot.matured || maturityFor(bot).eligible)) setCaptureId(id);
  };
  const closeCreate = () => { setCreating(false); setRecruitGroup(undefined); setRecommendedExpert(undefined); };
  const requestDeletion = (bot: Bot, memoryId?: string) => {
    const approval = createApproval({ id: uid(), botId: bot.id, botName: bot.name,
      kind: memoryId ? 'delete-memory' : 'delete', targetId: memoryId ?? bot.id,
      title: memoryId ? '删除一条记忆' : `删除「${bot.name}」`, detail: memoryId ? '移除选中的记忆。' : '移除这个智能体。',
      impact: memoryId ? '这条记忆将被永久移除' : '对话、记忆和工作区将被移除' });
    const existing = state.approvals.find(item => item.botId === bot.id && item.kind === approval.kind && item.targetId === approval.targetId && approvalStatus(item) === 'pending');
    dispatch({ type: 'request-approval', approval });
    selectBot(bot.id, existing?.id ?? approval.id);
  };

  return <div className={`bos-shell kdx-theme${sideOpen ? ' has-side-open' : ''}`} data-theme={theme}>
    {state.pending.map(task => <TaskRunner key={task.id} task={task} state={state} dispatch={dispatch} onDone={markDone} />)}
    <aside className={`bos-side${sideOpen ? ' is-open' : ''}`} aria-label="智能体">
      <div className="bos-side-top">
        {/* 展开时：左边是 Agent OS 标识，右边是收起按钮；收起时只留按钮 */}
        <div className="bos-side-head">
          {sideOpen ? <button type="button" className="bos-side-brand" onClick={() => selectBot(HOME_PAGE_ID)} aria-label="Agent OS，回到首页"><Hexagon size={20} fill="currentColor" strokeWidth={1.4} /><span>Agent OS</span></button> : null}
          <button type="button" className="bos-side-toggle" onClick={toggleSide} aria-expanded={sideOpen} aria-label={sideOpen ? '收起侧栏' : '展开侧栏'} title={sideOpen ? '收起侧栏' : '展开侧栏'}>
            <ChatPanelIcon />
          </button>
        </div>
        <nav className="bos-side-group" aria-label="页面">
          <button type="button" className={`bos-side-item${onHome ? ' is-selected' : ''}`} aria-label="首页" aria-current={onHome ? 'page' : undefined} title={sideOpen ? undefined : '首页'} onClick={() => selectBot(HOME_PAGE_ID)}>
            <span className="bos-side-avatar"><House size={20} strokeWidth={1.7} /></span>{sideOpen ? <span className="bos-side-name">首页</span> : null}
          </button>
          <button type="button" className={`bos-side-item${onMarket ? ' is-selected' : ''}`} aria-label="市场" aria-current={onMarket ? 'page' : undefined} title={sideOpen ? undefined : '市场'} onClick={() => selectBot(MARKET_PAGE_ID)}>
            <span className="bos-side-avatar"><Store size={20} strokeWidth={1.7} /></span>{sideOpen ? <span className="bos-side-name">市场</span> : null}
          </button>
        </nav>
        <button type="button" className="bos-side-new" aria-label="新建智能体" title={sideOpen ? undefined : '新建智能体'} onClick={() => setCreating(true)}><span className="bos-add" aria-hidden="true"><Plus size={15} strokeWidth={2.2} /></span>{sideOpen ? <span className="bos-side-name">新建智能体</span> : null}</button>
        <div className="bos-side-list">
          {agents.map(b => {
            const n = pendingCount(state, b.id);
            const face = faceStateOf(state, b, recentlyDone);
            const status = { working: `，${n} 项进行中`, done: '，刚完成', needs: '，需要你处理', idle: '' }[face];
            return <RailItem key={b.id} bot={b} name={b.name} label={`${b.name}（${agentLabel(b)}）${status}`} selected={current?.id === b.id} face={face} badge={n} members={memberBots(state, b)} {...railProps} onClick={() => selectBot(b.id)} />;
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
          <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'reset', state: { ...seedBotos(), audit: state.audit } }); setAccountOpen(false); }}>重置演示数据</button>
          <a role="menuitem" href="?view=avatars">智能体头像样稿</a>
        </div> : null}
        {noticesOpen ? <NoticePanel notices={notices} approvals={state.approvals} onDecide={onDecide} onChange={setNotices} onClose={() => setNoticesOpen(false)} /> : null}
      </div>
    </aside>
    {tip ? <div className="bos-side-tip" role="tooltip" style={{ top: tip.top, left: tip.left }}>{tip.text}</div> : null}

    {current ? <main ref={panelRef} className={`bos-panel${chatOpen ? '' : ' is-wide'}${resizing ? ' is-resizing' : ''}${settling ? ' is-settling' : ''}`}>
      <div ref={paneRef} id="bos-conversation" className="bos-chat-pane" inert={!chatOpen && !resizing} aria-hidden={!chatOpen && !resizing}>
        <Conversation bot={current} state={state} recentlyDone={recentlyDone} active={chatOpen || resizing} onCollapse={() => setChatOpen(false)}
          onAnswer={(messageId, answer) => { dispatch({ type: 'answer', botId: current.id, messageId, answer }); send(answer); }}
          onOther={() => inputRef.current?.focus()} onDecide={onDecide} onSubmitApproval={onSubmitApproval} targetMessage={targetMessage}
          onResolveWaiting={id => dispatch({ type: 'resolve-waiting', botId: current.id, messageId: id })}>
          {/* 输入框放在对话面板底部 */}
          <div className="bos-input">
            <textarea ref={inputRef} rows={1} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKeyDown}
              placeholder={`告诉 ${current.name} 你想要做什么…`} aria-label={`发送给 ${current.name}`} />
            <button type="button" className="bos-send" aria-label="发送" disabled={!draft.trim()} onClick={() => send()}><ArrowUp size={17} strokeWidth={2.2} /></button>
          </div>
        </Conversation>
      </div>
      <div ref={separatorRef} className="bos-chat-resizer" role="separator" tabIndex={0} aria-label="调整对话宽度" aria-orientation="vertical"
        aria-controls="bos-conversation" aria-valuemin={0} aria-valuemax={50} {...separatorProps} />
      <div className="bos-panel-right">
        <BotDashboard key={current.id} state={state} bot={current} recentlyDone={recentlyDone} faceState={faceStateOf(state, current, recentlyDone)} onSelectBot={selectBot}
                onAsk={askWidget} onRefresh={slot => dispatch({ type: 'refresh-widget', botId: current.id, id: slot.id, at: Date.now() })}
                onDashboardChange={undo => dispatch({ type: 'dashboard-change', botId: current.id, undo })}
                onRequestConnector={id => requestConnector(id, '使用工作台能力需要读取该连接器的数据。')}
                onPersonnel={(slot, mode, input) => {
                  setChatOpen(true);
                  dispatch({ type: 'personnel-run', botId: current.id, mode, input, id: uid(), slotId: slot.id, at: Date.now() });
                }}
                onReveal={id => {
                  const result = Object.values(current.personnelResults ?? {}).find(item => item.id === id);
                  if (!result || !canUseConnector(state, current, PERSONNEL_MCP_ID)) return;
                  const approval = personnelApproval(result, current, uid());
                  if (!approval) return;
                  setChatOpen(true);
                  dispatch({ type: 'request-approval', approval });
                }}
                onRoutineToggle={id => dispatch({ type: 'routine-toggle', botId: current.id, id })}
                onRoutineRun={id => { setChatOpen(true); dispatch({ type: 'routine-run', botId: current.id, id, runId: uid(), at: Date.now() }); }}
                onTableAction={(source, rowId, action) => {
                  setChatOpen(true);
                  dispatch({ type: 'table-action', botId: current.id, source, rowId, action, id: uid(), at: Date.now() });
                  const row = tableRows(source).find(item => item.id === rowId);
                  if (row && action === 'delegate') send(`请跟进「${row.title}」并给出建议`);
                }}
                onGroupRecruit={() => { setRecruitGroup(current.id); setCreating(true); }}
                onCapture={() => openCapture(current.id)} onApplyDefinition={next => dispatch({ type: 'reset', state: next })} />
      </div>
      {!chatOpen ? <button type="button" className="bos-collapsed-chat" onClick={() => setChatOpen(true)} aria-label={`展开 ${current.name} 的对话`}>
        <ChatPanelIcon /><span><strong>{current.name}</strong>{lastMessage ? <small>{(lastMessage.text || (lastMessage.approvalId ? '审批卡' : ''))}</small> : null}</span>
      </button> : null}
    </main> : <main className="bos-page" key={onMarket ? MARKET_PAGE_ID : HOME_PAGE_ID}>
      {onMarket
        ? <AgentMarket state={state} onChange={next => {
          dispatch({ type: 'reset', state: next });
          if (next.currentId !== state.currentId) { setTargetMessage(undefined); setChatOpen(true); }
        }} onOpenBot={selectBot} focus={marketFocus} onFocusChange={next => setMarketFocus(previous => ({ ...next, token: previous.token }))}
          onRequestDeletion={requestDeletion} />
        : <HomePage state={state} onOpenBot={selectBot} onRecruit={item => { setRecommendedExpert(item); setCreating(true); }}
          onCapture={openCapture} onOpenMarket={openMarket} />}
    </main>}

    {creating ? <NewExpertDialog state={state} groupId={recruitGroup} initialExpert={recommendedExpert} onClose={closeCreate} onCreate={create}
      onInstall={next => { dispatch({ type: 'reset', state: next }); closeCreate(); setTargetMessage(undefined); setChatOpen(true); }} /> : null}
    {capturing ? <CaptureExpertDialog key={capturing.id} state={state} bot={capturing} panelWidgets={composeDashboard(capturing, state.skills, state.mcps).widgets}
      onClose={() => setCaptureId(undefined)} onSave={(publication, prompt) => capture(capturing, publication, prompt)} /> : null}
  </div>;
}
