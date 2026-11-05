import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type UIEvent } from 'react';
import { FileText, GitBranch, LoaderCircle, MessageCircle, Pause, Play, UserRound } from 'lucide-react';
import type { Artifact } from '../../data/agentosArtifacts';
import type { ConversationMessage, WorkerJob } from './workspaceModel';
import ArtifactContent from './ArtifactContent';
import './SessionCanvas.css';

export interface SessionCollection {
  id: string;
  title: string;
  projectId: string;
  artifacts: Artifact[];
  job?: WorkerJob;
  requests?: ConversationMessage[];
}

export interface SessionCanvasProps {
  collections: SessionCollection[];
  selectedId: string | null;
  selectedCollectionId?: string | null;
  onSelect: (artifactId: string, collectionId: string) => void;
  onResume?: (job: WorkerJob) => void;
}

interface Selection { collectionId: string; artifactId: string }
const selectionKey = (selection: Selection) => `${selection.collectionId}\u0000${selection.artifactId}`;
const phases = ['理解目标与整理上下文', '组织内容与生成成果', '检查内容与准备交付'];

function nearestElement(parent: HTMLElement, elements: HTMLElement[]) {
  return elements.reduce<HTMLElement | null>((best, element) => {
    const distance = Math.abs(element.offsetLeft - parent.scrollLeft);
    const bestDistance = best ? Math.abs(best.offsetLeft - parent.scrollLeft) : Infinity;
    return distance < bestDistance ? element : best;
  }, null);
}

function PendingContent({ job, onResume }: { job: WorkerJob; onResume?: (job: WorkerJob) => void }) {
  const running = job.status === 'running';
  return <div className="aos-session-pending">
    {running ? <LoaderCircle size={30} strokeWidth={1.15} className="aos-spin" /> : <Pause size={28} strokeWidth={1.2} />}
    <h3>{running ? '工作正在推进' : '这项工作，等你继续'}</h3>
    <p>{running ? phases[Math.min(job.phase, phases.length - 1)] : '任务要求与已有内容都已保留。'}</p>
    {running ? <div className="aos-session-progress"><span style={{ width: `${(job.phase + 1) / 3 * 100}%` }} /></div>
      : onResume ? <button type="button" onClick={() => onResume(job)}><Play size={13} />继续任务</button> : null}
  </div>;
}

function ArtifactPreview({ artifact }: { artifact: Artifact }) {
  return <div className="aos-session-preview" aria-hidden="true">
    <p>{artifact.document?.introduction ?? artifact.graph?.description ?? artifact.slides?.[0]?.title ?? artifact.summary}</p>
    {artifact.document?.highlights.slice(0, 3).map(item => <div className="aos-session-preview-line" key={item}>{item}</div>)}
    {artifact.document?.sections.slice(0, 2).map(section => <section key={section.heading}><h3>{section.heading}</h3><p>{section.paragraphs[0]}</p></section>)}
    {artifact.slides?.[0]?.subtitle ? <p>{artifact.slides[0].subtitle}</p> : null}
    {artifact.graph ? <div className="aos-session-preview-nodes">{artifact.graph.nodes.slice(0, 4).map(node => <span key={node.id}>{node.label}</span>)}</div> : null}
  </div>;
}

function TaskRequests({ requests }: { requests: ConversationMessage[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [requests.length]);
  return <div ref={listRef} className="aos-session-requests" aria-label="任务需求与补充消息" tabIndex={0}>
    {requests.map(request => {
      const source = request.sourceKind === 'feishu' ? '飞书' : request.sourceKind === 'github' ? 'GitHub' : request.sourceKind === 'im' ? '群聊' : '';
      const sender = request.sourceName || (source ? source : 'samhar');
      const Icon = request.sourceKind === 'github' ? GitBranch : request.sourceKind ? MessageCircle : UserRound;
      return <div className="aos-session-request" key={request.id}>
        <div className="aos-session-request-source">
          {request.sourceKind === 'feishu' ? <img src="/source-icons/feishu.png" alt="" /> : <Icon size={12} aria-hidden="true" />}
          <span>{source && sender !== source ? `${source} · ${sender}` : sender}</span>
          {request.time ? <time>{request.time}</time> : null}
        </div>
        <p>{request.text}</p>
      </div>;
    })}
  </div>;
}

export default function SessionCanvas({ collections, selectedId, selectedCollectionId, onSelect, onResume }: SessionCanvasProps) {
  const available = collections.filter(collection => collection.artifacts.length);
  const selectedCollection = available.find(collection => collection.id === selectedCollectionId && collection.artifacts.some(artifact => artifact.id === selectedId))
    ?? available.find(collection => collection.id.startsWith('project:') && collection.artifacts.some(artifact => artifact.id === selectedId))
    ?? available.find(collection => collection.artifacts.some(artifact => artifact.id === selectedId)) ?? available[0];
  const selectedArtifact = selectedCollection?.artifacts.find(artifact => artifact.id === selectedId) ?? selectedCollection?.artifacts[0];
  const current: Selection | null = selectedCollection && selectedArtifact ? { collectionId: selectedCollection.id, artifactId: selectedArtifact.id } : null;
  const currentKey = current ? selectionKey(current) : '';
  const cards = available.flatMap(collection => collection.artifacts.map(artifact => ({ collection, artifact, key: selectionKey({ collectionId: collection.id, artifactId: artifact.id }) })));
  const hasCards = cards.length > 0;
  const structureKey = available.map(collection => `${collection.id}:${collection.artifacts.map(artifact => artifact.id).join(',')}`).join('|');
  const collectionIndex = available.findIndex(collection => collection.id === current?.collectionId);
  const cardIndex = cards.findIndex(card => card.key === currentKey);
  const viewportRef = useRef<HTMLDivElement>(null);
  const taskIndexRef = useRef<HTMLElement>(null);
  const pendingTaskFocus = useRef<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const currentRef = useRef(current);
  const onSelectRef = useRef(onSelect);
  const scrollNotification = useRef('');
  const lastStructure = useRef('');
  const userIntent = useRef(false);
  const remembered = useRef(new Map<string, string>());
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geometryFrame = useRef<number | null>(null);
  const syncing = useRef(false);

  useLayoutEffect(() => {
    currentRef.current = current;
    onSelectRef.current = onSelect;
    if (current) remembered.current.set(current.collectionId, current.artifactId);
  });

  const clearTimer = () => {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = null;
  };
  const syncGeometry = () => {
    const viewport = viewportRef.current;
    const selection = currentRef.current;
    clearTimer();
    userIntent.current = false;
    if (geometryFrame.current !== null) cancelAnimationFrame(geometryFrame.current);
    geometryFrame.current = null;
    syncing.current = false;
    if (!viewport?.clientHeight || !viewport.clientWidth || !selection) return;
    const card = cardRefs.current.get(selectionKey(selection));
    if (!card) return;
    syncing.current = true;
    viewport.scrollTo({ left: card.offsetLeft, top: 0, behavior: 'instant' });
    geometryFrame.current = requestAnimationFrame(() => {
      geometryFrame.current = requestAnimationFrame(() => { syncing.current = false; geometryFrame.current = null; });
    });
  };

  useLayoutEffect(() => {
    const unchangedStructure = lastStructure.current === structureKey;
    lastStructure.current = structureKey;
    if (unchangedStructure && scrollNotification.current === currentKey) { scrollNotification.current = ''; return; }
    scrollNotification.current = '';
    syncGeometry();
    // Identity and membership determine positioning; content and task phases do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, structureKey]);

  useLayoutEffect(() => {
    const rail = taskIndexRef.current;
    const selected = rail?.querySelector<HTMLButtonElement>('button[aria-current="true"]');
    if (rail && selected) rail.scrollTo({ left: selected.offsetLeft - (rail.clientWidth - selected.offsetWidth) / 2, behavior: 'instant' });
    if (selected && pendingTaskFocus.current === selected.dataset.collectionId) {
      selected.focus({ preventScroll: true });
      pendingTaskFocus.current = null;
    }
  }, [currentKey, structureKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(syncGeometry);
    observer.observe(viewport);
    let wheelAmount = 0;
    let lastWheelTurn = -Infinity;
    let lastWheelEvent = 0;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      if (event.target instanceof Element && event.target.closest('.aos-session-pagination')) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) { userIntent.current = true; return; }
      // Keep vertical wheel input inside documents and other scrollable content for reading.
      let target = event.target instanceof Element ? event.target : null;
      while (target && target !== viewport) {
        if (target instanceof HTMLElement && target.scrollHeight > target.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(target).overflowY)) return;
        target = target.parentElement;
      }
      if (!event.deltaY) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheelEvent > 180) wheelAmount = 0;
      lastWheelEvent = now;
      if (now - lastWheelTurn < 400) return;
      wheelAmount += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1);
      if (Math.abs(wheelAmount) < 30) return;
      const elements = Array.from(viewport.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
      const nearest = nearestElement(viewport, elements);
      const next = nearest && elements[elements.indexOf(nearest) + Math.sign(wheelAmount)];
      wheelAmount = 0;
      lastWheelTurn = now;
      if (!next) return;
      userIntent.current = true;
      viewport.scrollTo({ left: next.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      observer.disconnect(); clearTimer();
      viewport.removeEventListener('wheel', handleWheel);
      if (geometryFrame.current !== null) cancelAnimationFrame(geometryFrame.current);
    };
    // The observer reads current selection through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCards]);

  const notifySelection = (collectionId: string, artifactId: string) => {
    remembered.current.set(collectionId, artifactId);
    const selection = { collectionId, artifactId };
    if (currentRef.current && selectionKey(currentRef.current) === selectionKey(selection)) return;
    scrollNotification.current = selectionKey(selection);
    currentRef.current = selection;
    onSelectRef.current(artifactId, collectionId);
  };
  const settle = (event: UIEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const element = event.currentTarget;
    clearTimer();
    if (syncing.current || !element.clientHeight || !element.clientWidth || !userIntent.current) return;
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      if (syncing.current || !element.isConnected || !element.clientHeight || !element.clientWidth) return;
      const card = nearestElement(element, Array.from(cardRefs.current.values()));
      userIntent.current = false;
      if (card?.dataset.collectionId && card.dataset.artifactId) notifySelection(card.dataset.collectionId, card.dataset.artifactId);
    }, 140);
  };
  const keyboardNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !current) return;
    const nextIndex = event.key === 'ArrowRight' || event.key === 'PageDown' ? Math.min(cards.length - 1, cardIndex + 1)
      : event.key === 'ArrowLeft' || event.key === 'PageUp' ? Math.max(0, cardIndex - 1)
        : event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = cards[nextIndex];
    onSelect(next.artifact.id, next.collection.id);
  };
  const selectCollection = (index: number) => {
    const collection = available[index];
    if (!collection) return;
    const artifact = collection.artifacts.find(item => item.id === remembered.current.get(collection.id)) ?? collection.artifacts[0];
    if (currentRef.current?.collectionId === collection.id && currentRef.current.artifactId === artifact.id) return;
    pendingTaskFocus.current = collection.id;
    onSelect(artifact.id, collection.id);
  };
  const taskIndexKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const collectionId = event.target.dataset.collectionId;
    const index = available.findIndex(collection => collection.id === collectionId);
    if (index < 0) return;
    const next = event.key === 'ArrowRight' ? Math.min(available.length - 1, index + 1)
      : event.key === 'ArrowLeft' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    selectCollection(next);
  };

  if (!current || !selectedCollection || !selectedArtifact) return <div className="aos-session-canvas aos-session-empty" role="region" aria-label="任务成果展示区"><FileText size={30} strokeWidth={1} /><p>把一个任务交给我，成果会在这里展开。</p></div>;

  return <div className="aos-session-canvas" role="region" aria-label="任务成果展示区">
    <div ref={viewportRef} className="aos-session-viewport" role="group" tabIndex={0} aria-label="左右滑动切换任务和成果"
      onKeyDown={keyboardNavigation} onScroll={settle}
      onPointerDownCapture={() => { userIntent.current = true; }}>
      {cards.map(({ collection, artifact, key }, index) => {
        const active = key === currentKey;
        const pending = collection.job?.artifactId === artifact.id && collection.job.status !== 'completed' ? collection.job : undefined;
        const requests = collection.requests?.length ? collection.requests : [{ id: `request:${collection.id}:${artifact.id}`, role: 'user' as const,
          text: collection.job?.request ?? artifact.taskTitle, time: '', sourceName: collection.job?.sourceName ?? (collection.job ? 'samhar' : '示例任务'), sourceKind: collection.job?.sourceKind }];
        return <article className={`aos-session-card${active ? ' aos-session-card--active' : ''}`} key={key} data-artifact-id={artifact.id} data-collection-id={collection.id}
          ref={element => { if (element) cardRefs.current.set(key, element); else cardRefs.current.delete(key); }}
          aria-current={active ? 'true' : undefined} aria-label={active ? `当前成果：${artifact.title}` : undefined}>
          <div className="aos-session-card-reading" inert={!active} aria-hidden={!active}>
            <header className="aos-session-card-heading"><h2 className="aos-visually-hidden">{artifact.title}</h2><TaskRequests requests={requests} /></header>
            <div className="aos-session-card-content">{pending ? <PendingContent job={pending} onResume={active ? onResume : undefined} />
              : active ? <ArtifactContent artifact={artifact} onArtifactChange={id => onSelect(id, collection.id)} />
                : Math.abs(index - cardIndex) <= 1 ? <ArtifactPreview artifact={artifact} /> : <p className="aos-session-distant-preview">{artifact.summary}</p>}</div>
          </div>
          {active ? <footer className="aos-session-pagination">
            <nav ref={taskIndexRef} className="aos-session-task-index" aria-label="任务索引，左右滑动切换" onKeyDown={taskIndexKeys}
              onWheel={event => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollBy({ left: event.deltaY }); }}>
              <div className="aos-session-task-index-track">{available.map((task, taskIndex) => <button type="button" key={task.id}
                data-collection-id={task.id} className={taskIndex === collectionIndex ? 'is-current' : ''} aria-label={`切换任务：${task.title}`}
                title={task.title} aria-current={taskIndex === collectionIndex ? 'true' : undefined} onClick={() => selectCollection(taskIndex)}><span /></button>)}</div>
            </nav>
          </footer> : null}
          {!active ? <button type="button" tabIndex={-1} className="aos-session-card-open" aria-label={`查看成果：${artifact.title}`} onClick={() => onSelect(artifact.id, collection.id)} /> : null}
        </article>;
      })}
    </div>
  </div>;
}
