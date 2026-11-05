import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type UIEvent } from 'react';
import { FileText, LoaderCircle, Pause, Play } from 'lucide-react';
import type { Artifact } from '../../data/agentosArtifacts';
import type { WorkerJob } from './workspaceModel';
import ArtifactContent from './ArtifactContent';
import './ArtifactDeck.css';

export interface ArtifactDeckProps {
  artifacts: Artifact[];
  selectedId: string | null;
  onSelect: (artifactId: string) => void;
  jobs?: WorkerJob[];
  onResume?: (job: WorkerJob) => void;
}

const phases = ['理解目标与整理上下文', '组织内容与生成成果', '检查内容与准备交付'];
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function centerCard(viewport: HTMLDivElement, card: HTMLElement, behavior: ScrollBehavior = 'instant') {
  viewport.scrollTo({ top: card.offsetTop - (viewport.clientHeight - card.offsetHeight) / 2, behavior });
}

function PendingContent({ job, onResume }: { job: WorkerJob; onResume?: (job: WorkerJob) => void }) {
  const running = job.status === 'running';
  return <div className="aos-deck-pending">
    {running ? <LoaderCircle size={31} strokeWidth={1.2} className="aos-spin" /> : <Pause size={30} strokeWidth={1.2} />}
    <h3>{running ? '正在把想法整理成成果' : '这项工作，等你继续'}</h3>
    <p>{running ? phases[Math.min(job.phase, phases.length - 1)] : '任务要求已保留，可以从这里继续。'}</p>
    {running ? <div className="aos-deck-progress" aria-label={`工作进度：${phases[Math.min(job.phase, phases.length - 1)]}`}><span style={{ width: `${(job.phase + 1) / 3 * 100}%` }} /></div>
      : onResume ? <button type="button" onClick={() => onResume(job)}><Play size={13} />继续这项工作</button> : null}
  </div>;
}

function QuietPreview({ artifact }: { artifact: Artifact }) {
  return <div className="aos-deck-quiet-preview" aria-hidden="true">
    <p>{artifact.document?.introduction ?? artifact.graph?.description ?? artifact.slides?.[0]?.title ?? artifact.summary}</p>
    {artifact.document?.sections.slice(0, 2).map(section => <div key={section.heading}><strong>{section.heading}</strong><p>{section.paragraphs[0]}</p></div>)}
    {artifact.slides?.[0]?.subtitle ? <p>{artifact.slides[0].subtitle}</p> : null}
  </div>;
}

export default function ArtifactDeck({ artifacts, selectedId, onSelect, jobs = [], onResume }: ArtifactDeckProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeFrame = useRef<number | null>(null);
  const geometrySyncing = useRef(false);
  const scrollSelection = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedId);
  const initialized = useRef(false);
  const artifactIds = artifacts.map(artifact => artifact.id).join('\u0000');
  const selectedIndex = Math.max(0, artifacts.findIndex(artifact => artifact.id === selectedId));
  const currentId = artifacts[selectedIndex]?.id ?? null;
  const cyclic = artifacts.length > 1;
  const entries = cyclic ? [artifacts[artifacts.length - 1], ...artifacts, artifacts[0]] : artifacts;

  useLayoutEffect(() => { onSelectRef.current = onSelect; selectedRef.current = currentId; }, [onSelect, currentId]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !currentId || !viewport.clientHeight) return;
    if (scrollSelection.current === currentId) { scrollSelection.current = null; return; }
    const card = Array.from(viewport.children).find(child => child instanceof HTMLElement
      && child.dataset.artifactId === currentId && child.dataset.canonical === 'true') as HTMLElement | undefined;
    if (card) centerCard(viewport, card, !initialized.current || reduceMotion() ? 'instant' : 'smooth');
    initialized.current = true;
  }, [currentId, artifactIds]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      if (settleTimer.current) { clearTimeout(settleTimer.current); settleTimer.current = null; }
      if (resizeFrame.current !== null) { cancelAnimationFrame(resizeFrame.current); resizeFrame.current = null; }
      geometrySyncing.current = true;
      if (!viewport.clientHeight) { initialized.current = false; return; }
      const card = Array.from(viewport.children).find(child => child instanceof HTMLElement
        && child.dataset.artifactId === selectedRef.current && child.dataset.canonical === 'true') as HTMLElement | undefined;
      if (card) centerCard(viewport, card);
      resizeFrame.current = requestAnimationFrame(() => {
        resizeFrame.current = requestAnimationFrame(() => { geometrySyncing.current = false; resizeFrame.current = null; });
      });
    });
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (resizeFrame.current !== null) cancelAnimationFrame(resizeFrame.current);
    };
  }, []);

  const settleSelection = (event: UIEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (settleTimer.current) { clearTimeout(settleTimer.current); settleTimer.current = null; }
    const viewport = event.currentTarget;
    if (!viewport.clientHeight || geometrySyncing.current) return;
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      if (!viewport.isConnected || !viewport.clientHeight || geometrySyncing.current) return;
      const middle = viewport.scrollTop + viewport.clientHeight / 2;
      const cards = Array.from(viewport.children).filter((child): child is HTMLElement => child instanceof HTMLElement && !!child.dataset.artifactId);
      const nearest = cards.reduce<HTMLElement | null>((best, card) => !best
        || Math.abs(card.offsetTop + card.offsetHeight / 2 - middle) < Math.abs(best.offsetTop + best.offsetHeight / 2 - middle) ? card : best, null);
      const id = nearest?.dataset.artifactId;
      if (!id) return;
      if (id !== selectedRef.current) { scrollSelection.current = id; onSelectRef.current(id); }
      if (nearest.dataset.canonical !== 'true') {
        const canonical = cards.find(card => card.dataset.artifactId === id && card.dataset.canonical === 'true');
        if (canonical) centerCard(viewport, canonical);
      }
    }, 140);
  };

  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !artifacts.length) return;
    const direction = event.key === 'ArrowDown' || event.key === 'PageDown' ? 1
      : event.key === 'ArrowUp' || event.key === 'PageUp' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    onSelect(artifacts[(selectedIndex + direction + artifacts.length) % artifacts.length].id);
  };

  if (!artifacts.length) return <div className="aos-deck-empty"><FileText size={30} strokeWidth={1} /><p>成果会在这里展开。</p></div>;

  return <div ref={viewportRef} className="aos-artifact-deck" role="region" aria-label="成果卡片流，使用上下方向键切换任务"
    tabIndex={0} onScroll={settleSelection} onKeyDown={handleKeys}>
    {entries.map((artifact, index) => {
      const clone = cyclic && (index === 0 || index === entries.length - 1);
      const active = !clone && artifact.id === currentId;
      const canonicalIndex = cyclic ? index - 1 : index;
      const near = clone || Math.abs(canonicalIndex - selectedIndex) <= 1;
      const job = jobs.find(item => item.artifactId === artifact.id);
      const pending = job && job.status !== 'completed';
      return <article key={`${clone ? `clone-${index}` : 'artifact'}-${artifact.id}`} className={`aos-deck-card${active ? ' aos-deck-card--active' : ''}`}
        data-artifact-id={artifact.id} data-canonical={!clone ? 'true' : 'false'} aria-hidden={clone || undefined} aria-current={active ? 'true' : undefined} aria-label={active ? `当前成果：${artifact.title}` : undefined}>
        <div className="aos-deck-card-reading" inert={!active} aria-hidden={!active}>
          <header className="aos-deck-card-heading"><h2>{artifact.title}</h2><p>{pending ? job.request : artifact.summary}</p></header>
          <div className="aos-deck-card-content">
            {pending ? <PendingContent job={job} onResume={active ? onResume : undefined} />
              : near ? <ArtifactContent artifact={artifact} onArtifactChange={active ? onSelect : undefined} /> : <QuietPreview artifact={artifact} />}
          </div>
        </div>
        {!active ? <button type="button" className="aos-deck-card-select" tabIndex={clone ? -1 : undefined} aria-label={`查看成果：${artifact.title}`} onClick={() => onSelect(artifact.id)} /> : null}
      </article>;
    })}
  </div>;
}
