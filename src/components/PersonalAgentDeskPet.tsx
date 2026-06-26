import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Database, FileCheck2, GitBranch, MonitorUp, Plug, Send, Wrench, X } from 'lucide-react';
import type { AccountType, SpaceResultNotification } from '../App';

type PetMessage = {
  role: 'agent' | 'user';
  text: string;
};

type CommChannel = 'data' | 'task';
type PatQueueItem = {
  title: string;
  detail: string;
  route: string;
  state: string;
  icon: typeof Bell;
};

type SpriteName =
  | 'idle'
  | 'alert'
  | 'scratchSelf'
  | 'tired'
  | 'sleeping'
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

const SPRITE_SIZE = 32;
const PET_SPEED = 2.1;
const SPEECH_WIDTH = 161;
const PANEL_WIDTH = 320;
const SIDEBAR_FALLBACK_WIDTH = 240;
const TRACK_LEFT_PADDING = 48;
const TRACK_RIGHT_PADDING = 48;
const TRACK_Y_GAP = 31;
const EDGE_PAUSE_MIN_MS = 1200;
const EDGE_PAUSE_MAX_MS = 2800;
const OWNER_ATTENTION_RADIUS = 72;
const OWNER_ATTENTION_MS = 4200;
const OWNER_SLEEP_DELAY_MS = 2300;
const PATROL_DURATION_MS = 5 * 60 * 1000;
const NAP_DURATION_MS = 60 * 1000;
const MICRO_ACTION_MIN_DELAY_MS = 24 * 1000;
const MICRO_ACTION_MAX_DELAY_MS = 46 * 1000;
const MICRO_ACTION_MIN_DURATION_MS = 2600;
const MICRO_ACTION_MAX_DURATION_MS = 6800;
const FIRST_INCOMING_DELAY_MS = 90 * 1000;
const INCOMING_INTERVAL_MS = 4 * 60 * 1000;
const SPEECH_AUTO_HIDE_MS = 5000;

const dataQueue: PatQueueItem[] = [
  {
    title: '下载 MarketResearch Skill',
    detail: 'Space 需要行业数据采集能力，由技能市场授权后下载到本地。',
    route: '技能市场 -> PAT -> Space',
    state: '待确认',
    icon: Wrench,
  },
  {
    title: '连接企查查 MCP',
    detail: '项目需要供应商工商与信用信息，PAT 负责向 Space 下发连接配置。',
    route: '连接器 -> PAT -> Space',
    state: '待授权',
    icon: Plug,
  },
  {
    title: '数据仓库只读访问',
    detail: 'Space 请求经营指标查询权限，只回传摘要和证据引用。',
    route: '数据源 -> PAT -> Space',
    state: '受限',
    icon: Database,
  },
];

const taskQueue: PatQueueItem[] = [
  {
    title: '产品方案工作项',
    detail: '供应链金融风控平台负责人分发给 samhar 的产品方案任务。',
    route: 'ProjectAgent -> PAT -> Space',
    state: '已创建',
    icon: GitBranch,
  },
  {
    title: '研发评估协作消息',
    detail: 'chen 在同项目内补充接口边界，需要同步到本地任务上下文。',
    route: '成员 -> ProjectAgent -> PAT',
    state: '新消息',
    icon: Bell,
  },
  {
    title: '清洗结果回传',
    detail: 'Space 完成数据清洗任务，PAT 正在把成果送回项目页。',
    route: 'Space -> PAT -> 项目页',
    state: '回传中',
    icon: FileCheck2,
  },
];

type IdleMode = 'ownerLook' | 'sleeping' | 'scratchSelf' | null;
type BehaviorMode = 'patrol' | 'edgePause' | 'microAction' | 'watchOwner' | 'nap' | 'incoming' | 'panelOpen';

const spriteSets: Record<SpriteName, number[][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSidebarRect() {
  return document.querySelector<HTMLElement>('[data-agentos-sidebar]')?.getBoundingClientRect();
}

function getUserCardRect() {
  return document.querySelector<HTMLElement>('[data-agentos-user-card]')?.getBoundingClientRect();
}

function getUserButtonRect() {
  return document.querySelector<HTMLElement>('[data-agentos-user-card] button')?.getBoundingClientRect();
}

function getBounds() {
  const sidebarRect = getSidebarRect();
  const userCardRect = getUserCardRect();
  const userButtonRect = getUserButtonRect();
  const sidebarLeft = sidebarRect?.left ?? 0;
  const sidebarRight = sidebarRect?.right ?? SIDEBAR_FALLBACK_WIDTH;
  const anchorY = userButtonRect
    ? userButtonRect.top - TRACK_Y_GAP
    : userCardRect
      ? userCardRect.top - 22
      : window.innerHeight - 88;
  const minX = Math.min(sidebarLeft + TRACK_LEFT_PADDING, sidebarRight - TRACK_RIGHT_PADDING);
  const maxX = Math.max(sidebarLeft + TRACK_LEFT_PADDING, sidebarRight - TRACK_RIGHT_PADDING);
  const trackY = clamp(anchorY, 80, window.innerHeight - 54);

  return {
    minX,
    maxX,
    minY: trackY,
    maxY: trackY,
  };
}

function homeTarget() {
  const bounds = getBounds();
  return {
    x: clamp(bounds.minX + (bounds.maxX - bounds.minX) * 0.28, bounds.minX, bounds.maxX),
    y: bounds.minY,
  };
}

function trackTarget(direction: 1 | -1) {
  const bounds = getBounds();
  return {
    x: direction > 0 ? bounds.maxX : bounds.minX,
    y: bounds.minY,
  };
}

function clampPoint(point: { x: number; y: number }) {
  const bounds = getBounds();
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

function getDirection(diffX: number, diffY: number, distance: number): SpriteName {
  let direction = '';
  direction += diffY / distance > 0.5 ? 'N' : '';
  direction += diffY / distance < -0.5 ? 'S' : '';
  direction += diffX / distance > 0.5 ? 'W' : '';
  direction += diffX / distance < -0.5 ? 'E' : '';
  return (direction || 'idle') as SpriteName;
}

function randomEdgePause() {
  return EDGE_PAUSE_MIN_MS + Math.random() * (EDGE_PAUSE_MAX_MS - EDGE_PAUSE_MIN_MS);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomMicroActionDelay() {
  return randomBetween(MICRO_ACTION_MIN_DELAY_MS, MICRO_ACTION_MAX_DELAY_MS);
}

function randomMicroActionDuration() {
  return randomBetween(MICRO_ACTION_MIN_DURATION_MS, MICRO_ACTION_MAX_DURATION_MS);
}

function randomIdleMode(): IdleMode {
  const chance = Math.random();
  if (chance > 0.72) return 'sleeping';
  if (chance > 0.38) return 'scratchSelf';
  return 'ownerLook';
}

export default function PersonalAgentDeskPet({
  accountType,
  notification,
  onOpenNotification,
}: {
  accountType: AccountType;
  notification?: SpaceResultNotification;
  onOpenNotification?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hasIncoming, setHasIncoming] = useState(() => Boolean(notification));
  const [noticeActive, setNoticeActive] = useState(() => Boolean(notification));
  const [incomingNoticeKey, setIncomingNoticeKey] = useState(0);
  const [speechHidden, setSpeechHidden] = useState(false);
  const [draft, setDraft] = useState('');
  const [commChannel, setCommChannel] = useState<CommChannel>('task');
  const [messages, setMessages] = useState<PetMessage[]>([
    { role: 'agent', text: '我在。AgentOS 和 Space 之间的数据请求、任务分发和结果回传都会先经过我。' },
  ]);
  const [position, setPosition] = useState(() => homeTarget());
  const [sprite, setSprite] = useState({ x: -3, y: -3 });
  const [behaviorMode, setBehaviorMode] = useState<BehaviorMode>(() => (notification ? 'incoming' : 'patrol'));

  const posRef = useRef(position);
  const targetRef = useRef(position);
  const frameRef = useRef(0);
  const idleRef = useRef(0);
  const idleAnimationRef = useRef<IdleMode>(null);
  const idleAnimationFrameRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const behaviorRef = useRef<BehaviorMode>(notification ? 'incoming' : 'patrol');
  const walkDirectionRef = useRef<1 | -1>(1);
  const pauseUntilRef = useRef(0);
  const patrolCycleStartedAtRef = useRef(Date.now());
  const napUntilRef = useRef(0);
  const nextMicroActionAtRef = useRef(Date.now() + randomMicroActionDelay());
  const ownerHoverRef = useRef(false);
  const ownerAttentionStartedAtRef = useRef(0);
  const ownerAttentionUntilRef = useRef(0);
  const incomingRef = useRef(noticeActive);
  const openRef = useRef(open);
  const rafRef = useRef<number | null>(null);

  const updateBehavior = useCallback((mode: BehaviorMode) => {
    if (behaviorRef.current === mode) return;
    behaviorRef.current = mode;
    setBehaviorMode(mode);
  }, []);

  const resumePatrol = useCallback(() => {
    updateBehavior('patrol');
    idleAnimationRef.current = null;
    idleAnimationFrameRef.current = 0;
    pauseUntilRef.current = 0;
    targetRef.current = trackTarget(walkDirectionRef.current);
  }, [updateBehavior]);

  const showIncomingNotice = useCallback(() => {
    setHasIncoming(true);
    setNoticeActive(true);
    setSpeechHidden(false);
    setIncomingNoticeKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    incomingRef.current = noticeActive;
    if (noticeActive) {
      updateBehavior('incoming');
      setSpeechHidden(false);
      targetRef.current = posRef.current;
      idleAnimationRef.current = 'ownerLook';
      idleAnimationFrameRef.current = 0;

      const speechTimer = window.setTimeout(() => {
        setSpeechHidden(true);
        setNoticeActive(false);
        incomingRef.current = false;
        resumePatrol();
      }, SPEECH_AUTO_HIDE_MS);

      return () => window.clearTimeout(speechTimer);
    } else if (behaviorRef.current === 'incoming') {
      resumePatrol();
    }
  }, [noticeActive, incomingNoticeKey, resumePatrol, updateBehavior]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const applySprite = useCallback((name: SpriteName, frame: number) => {
    const nextSprite = spriteSets[name][frame % spriteSets[name].length];
    setSprite({ x: nextSprite[0], y: nextSprite[1] });
  }, []);

  const idle = useCallback((forcedMode?: IdleMode) => {
    idleRef.current += 1;
    const activeMode = forcedMode ?? idleAnimationRef.current;

    if (incomingRef.current) {
      applySprite('alert', 0);
      return;
    }

    if (activeMode === 'ownerLook') {
      applySprite(idleRef.current % 28 < 20 ? 'S' : 'idle', Math.floor(idleRef.current / 8));
      return;
    }

    if (activeMode === 'sleeping') {
      if (idleAnimationFrameRef.current < 8) {
        applySprite('tired', 0);
      } else {
        applySprite('sleeping', Math.floor(idleAnimationFrameRef.current / 4));
      }
      if (idleAnimationFrameRef.current > 120) {
        idleAnimationRef.current = null;
        idleAnimationFrameRef.current = 0;
      } else {
        idleAnimationFrameRef.current += 1;
      }
      return;
    }

    if (activeMode === 'scratchSelf') {
      applySprite('scratchSelf', idleAnimationFrameRef.current);
      if (idleAnimationFrameRef.current > 12) {
        idleAnimationRef.current = 'ownerLook';
        idleAnimationFrameRef.current = 0;
      } else {
        idleAnimationFrameRef.current += 1;
      }
      return;
    }

    applySprite('idle', 0);
  }, [applySprite]);

  useEffect(() => {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReducedMotion) return;

    targetRef.current = trackTarget(walkDirectionRef.current);

    const handleMouseMove = (event: MouseEvent) => {
      if (openRef.current) return;
      const sidebarRect = getSidebarRect();
      if (sidebarRect && (event.clientX < sidebarRect.left || event.clientX > sidebarRect.right)) return;

      const current = posRef.current;
      const distance = Math.sqrt((event.clientX - current.x) ** 2 + (event.clientY - current.y) ** 2);
      if (distance > OWNER_ATTENTION_RADIUS) return;

      const now = Date.now();
      if (ownerAttentionUntilRef.current < now) {
        ownerAttentionStartedAtRef.current = now;
        idleAnimationFrameRef.current = 0;
      }
      ownerAttentionUntilRef.current = now + OWNER_ATTENTION_MS;
      pauseUntilRef.current = 0;
      idleAnimationRef.current = 'ownerLook';
      updateBehavior('watchOwner');
    };

    const handleResize = () => {
      const nextPosition = clampPoint(posRef.current);
      const nextTarget = trackTarget(walkDirectionRef.current);
      posRef.current = nextPosition;
      targetRef.current = nextTarget;
      setPosition(nextPosition);
    };

    const incomingTimer = window.setInterval(showIncomingNotice, INCOMING_INTERVAL_MS);
    const firstIncomingTimer = notification ? undefined : window.setTimeout(showIncomingNotice, FIRST_INCOMING_DELAY_MS);

    const onFrame = (timestamp: number) => {
      if (lastTimestampRef.current == null) lastTimestampRef.current = timestamp;
      if (timestamp - lastTimestampRef.current > 100) {
        lastTimestampRef.current = timestamp;
        frameRef.current += 1;

        const current = posRef.current;
        const target = targetRef.current;
        const diffX = current.x - target.x;
        const diffY = current.y - target.y;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);
        const now = Date.now();

        if (behaviorRef.current === 'nap' && napUntilRef.current > 0 && now >= napUntilRef.current) {
          napUntilRef.current = 0;
          patrolCycleStartedAtRef.current = now;
          nextMicroActionAtRef.current = now + randomMicroActionDelay();
          resumePatrol();
        }

        if (openRef.current) {
          updateBehavior('panelOpen');
          targetRef.current = current;
          idle('ownerLook');
        } else if (incomingRef.current) {
          updateBehavior('incoming');
          targetRef.current = current;
          idle();
        } else if (ownerHoverRef.current || ownerAttentionUntilRef.current > now) {
          updateBehavior('watchOwner');
          const ownerElapsed = now - ownerAttentionStartedAtRef.current;
          idle(ownerElapsed > OWNER_SLEEP_DELAY_MS ? 'sleeping' : 'ownerLook');
        } else if (napUntilRef.current > now) {
          updateBehavior('nap');
          targetRef.current = current;
          idle('sleeping');
        } else if (now - patrolCycleStartedAtRef.current >= PATROL_DURATION_MS) {
          updateBehavior('nap');
          napUntilRef.current = now + NAP_DURATION_MS;
          idleAnimationRef.current = 'sleeping';
          idleAnimationFrameRef.current = 0;
          targetRef.current = current;
          idle('sleeping');
        } else if (pauseUntilRef.current > now) {
          idle();
        } else if (now >= nextMicroActionAtRef.current) {
          updateBehavior('microAction');
          pauseUntilRef.current = now + randomMicroActionDuration();
          nextMicroActionAtRef.current = pauseUntilRef.current + randomMicroActionDelay();
          idleAnimationRef.current = randomIdleMode();
          idleAnimationFrameRef.current = 0;
          idleRef.current = 0;
          idle();
        } else if (distance <= PET_SPEED + 0.5) {
          const bounds = getBounds();
          const settled = {
            x: clamp(target.x, bounds.minX, bounds.maxX),
            y: bounds.minY,
          };
          posRef.current = settled;
          setPosition(settled);
          walkDirectionRef.current = walkDirectionRef.current === 1 ? -1 : 1;
          targetRef.current = trackTarget(walkDirectionRef.current);
          pauseUntilRef.current = now + randomEdgePause();
          updateBehavior('edgePause');
          idleAnimationRef.current = randomIdleMode();
          idleAnimationFrameRef.current = 0;
          idleRef.current = 0;
          idle();
        } else {
          updateBehavior('patrol');
          idleAnimationRef.current = null;
          idleAnimationFrameRef.current = 0;
          idleRef.current = 0;

          const direction = getDirection(diffX, diffY, distance);
          applySprite(direction, frameRef.current);

          const bounds = getBounds();
          const next = {
            x: clamp(current.x - (diffX / distance) * PET_SPEED, bounds.minX, bounds.maxX),
            y: bounds.minY,
          };
          posRef.current = next;
          setPosition(next);
        }
      }

      rafRef.current = window.requestAnimationFrame(onFrame);
    };

    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    rafRef.current = window.requestAnimationFrame(onFrame);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.clearInterval(incomingTimer);
      if (firstIncomingTimer) window.clearTimeout(firstIncomingTimer);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [applySprite, idle, notification, resumePatrol, showIncomingNotice, updateBehavior]);

  const openAgent = () => {
    setOpen(true);
    setHasIncoming(false);
    setNoticeActive(false);
    setSpeechHidden(false);
    ownerHoverRef.current = false;
    updateBehavior('panelOpen');
    targetRef.current = posRef.current;
  };

  const closeAgent = () => {
    setOpen(false);
    resumePatrol();
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'agent', text: '收到，我会先判断它是数据请求还是任务请求，再整理成结构化消息同步给 Space。' },
    ]);
    setDraft('');
    setHasIncoming(false);
    setNoticeActive(false);
    resumePatrol();
  };

  const readPending = () => {
    setHasIncoming(false);
    setNoticeActive(false);
    setSpeechHidden(true);
    onOpenNotification?.();
  };

  const hideNotice = () => {
    setNoticeActive(false);
    setSpeechHidden(true);
    incomingRef.current = false;
    resumePatrol();
  };

  const startOwnerAttention = () => {
    const now = Date.now();
    ownerHoverRef.current = true;
    if (ownerAttentionStartedAtRef.current === 0 || ownerAttentionUntilRef.current < now) {
      ownerAttentionStartedAtRef.current = now;
      idleAnimationFrameRef.current = 0;
    }
    ownerAttentionUntilRef.current = now + OWNER_ATTENTION_MS;
    pauseUntilRef.current = 0;
    idleAnimationRef.current = 'ownerLook';
    updateBehavior('watchOwner');
  };

  const endOwnerAttention = () => {
    ownerHoverRef.current = false;
    ownerAttentionUntilRef.current = Date.now() + 1200;
  };

  const speechText = hasIncoming
    ? notification
      ? `主人，${notification.projectName} 的 Space 结果回来了。`
      : '主人，Space 有新的执行结果回来了。'
    : accountType === 'admin'
      ? '我会提醒你组织侧的审批和回传。'
      : '项目请求和数据回传都会先找我。';
  const activeQueue = commChannel === 'data' ? dataQueue : taskQueue;

  const petStyle = {
    left: `${position.x - SPRITE_SIZE / 2}px`,
    top: `${position.y - SPRITE_SIZE / 2}px`,
    backgroundPosition: `${sprite.x * SPRITE_SIZE}px ${sprite.y * SPRITE_SIZE}px`,
  };

  const sidebarRect = getSidebarRect();
  const speechMinLeft = (sidebarRect?.left ?? 0) + 12;
  const speechMaxLeft = Math.max(speechMinLeft, (sidebarRect?.right ?? window.innerWidth) - SPEECH_WIDTH - 12);
  const speechLeft = clamp(position.x - 34, speechMinLeft, speechMaxLeft);
  const speechTailX = clamp(position.x - speechLeft, 28, SPEECH_WIDTH - 18);
  const speechStyle = {
    left: `${speechLeft}px`,
    top: `${clamp(position.y - 124, 58, window.innerHeight - 226)}px`,
    '--oneko-tail-x': `${speechTailX}px`,
  } as React.CSSProperties;

  const panelStyle = {
    left: `${clamp(position.x - 22, 12, window.innerWidth - PANEL_WIDTH - 12)}px`,
    top: `${clamp(position.y - 356, 58, window.innerHeight - 378)}px`,
  };

  return (
    <>
      {noticeActive && hasIncoming && !speechHidden && !open && (
        <div className="oneko-agent-speech" style={speechStyle}>
          <div className="oneko-agent-speech__name">PAT</div>
          <p>{speechText}</p>
          <div className="oneko-agent-speech__actions">
            <button type="button" onClick={readPending}>查看结果</button>
            <button type="button" onClick={hideNotice}>收起</button>
          </div>
        </div>
      )}

      {open && (
        <div className="oneko-agent-panel" style={panelStyle}>
          <div className="oneko-agent-panel__header">
            <div>
              <div className="text-[13px] font-semibold text-text">PersonalAgent</div>
              <div className="text-[10px] text-text-muted mt-0.5">PAT 通讯层 · 数据 / 任务 · Space 回传</div>
            </div>
            <button
              type="button"
              onClick={closeAgent}
              className="p-1.5 rounded-lg text-text-muted hover:bg-primary/5 hover:text-text transition-colors"
              aria-label="关闭 PersonalAgent"
            >
              <X className="w-4 h-4" strokeWidth={1.7} />
            </button>
          </div>

          <div className="px-3 py-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold text-text">通讯队列</div>
              <div className="flex rounded-lg border border-border-light bg-zinc-50 p-0.5">
                {[
                  { key: 'task' as const, label: '任务', count: taskQueue.length, icon: MonitorUp },
                  { key: 'data' as const, label: '数据', count: dataQueue.length, icon: Database },
                ].map(item => {
                  const Icon = item.icon;
                  const active = commChannel === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCommChannel(item.key)}
                      className={`h-6 px-2 rounded-md text-[10px] flex items-center gap-1 transition-colors ${
                        active ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'
                      }`}
                    >
                      <Icon className="w-3 h-3" strokeWidth={1.7} />
                      {item.label}
                      <span>{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-[164px] overflow-y-auto space-y-2 pr-0.5">
              {activeQueue.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-xl border border-border-light bg-white/70 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white">
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-medium text-text">{item.title}</span>
                          <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-text-secondary">{item.state}</span>
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-text-secondary">{item.detail}</span>
                        <span className="mt-1 block truncate text-[10px] text-text-muted">{item.route}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="oneko-agent-panel__chat">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`oneko-agent-panel__bubble ${message.role === 'user' ? 'oneko-agent-panel__bubble--user' : ''}`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="oneko-agent-panel__input">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') sendMessage();
              }}
              placeholder="跟 PersonalAgent 说..."
              className="min-w-0 flex-1 bg-transparent outline-none text-[12px] text-text placeholder:text-text-placeholder"
            />
            <button
              type="button"
              onClick={sendMessage}
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
              aria-label="发送"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`oneko-agent ${noticeActive ? 'oneko-agent--incoming' : ''}`}
        data-behavior={behaviorMode}
        aria-label="打开 PersonalAgent"
        onClick={openAgent}
        onMouseEnter={startOwnerAttention}
        onMouseLeave={endOwnerAttention}
        style={petStyle}
      />
    </>
  );
}
