import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import './WorkHistoryIndex.css';

interface HistoryRecord {
  id: string;
  title: string;
  sender: string;
  time: string;
}

interface WorkHistoryIndexProps {
  records: HistoryRecord[];
  scrollRef: RefObject<HTMLDivElement | null>;
  recordRefs: RefObject<Map<string, HTMLElement>>;
}

export default function WorkHistoryIndex({ records, scrollRef, recordRefs }: WorkHistoryIndexProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const navigationTargetRef = useRef<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const currentId = records.some(record => record.id === activeId) ? activeId : records[0]?.id;
  const preview = records.find(record => record.id === previewId);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    let frame = 0;
    navigationTargetRef.current = null;

    const update = () => {
      frame = 0;
      if (navigationTargetRef.current) {
        setActiveId(navigationTargetRef.current);
        return;
      }
      const viewportTop = viewport.getBoundingClientRect().top;
      const atBottom = viewport.scrollHeight > viewport.clientHeight + 2
        && viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2;
      let nextId = records[0]?.id ?? null;
      for (const record of records) {
        const element = recordRefs.current.get(record.id);
        if (!element) continue;
        if (atBottom || element.getBoundingClientRect().top <= viewportTop + 12) nextId = record.id;
        else break;
      }
      setActiveId(nextId);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onManualScroll = () => {
      navigationTargetRef.current = null;
      schedule();
    };
    const onScrollKey = (event: globalThis.KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) onManualScroll();
    };
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(viewport);
    for (const record of records) {
      const element = recordRefs.current.get(record.id);
      if (element) resizeObserver.observe(element);
    }
    viewport.addEventListener('scroll', schedule, { passive: true });
    viewport.addEventListener('wheel', onManualScroll, { passive: true });
    viewport.addEventListener('pointerdown', onManualScroll, { passive: true });
    viewport.addEventListener('touchstart', onManualScroll, { passive: true });
    viewport.addEventListener('keydown', onScrollKey);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', schedule);
      viewport.removeEventListener('wheel', onManualScroll);
      viewport.removeEventListener('pointerdown', onManualScroll);
      viewport.removeEventListener('touchstart', onManualScroll);
      viewport.removeEventListener('keydown', onScrollKey);
    };
  }, [records, scrollRef, recordRefs]);

  useEffect(() => {
    const track = trackRef.current;
    const button = currentId ? buttonRefs.current.get(currentId) : null;
    if (!track || !button) return;
    if (button.offsetTop < track.scrollTop) track.scrollTo({ top: button.offsetTop, behavior: 'instant' });
    else if (button.offsetTop + button.offsetHeight > track.scrollTop + track.clientHeight) {
      track.scrollTo({ top: button.offsetTop + button.offsetHeight - track.clientHeight, behavior: 'instant' });
    }
  }, [currentId]);

  const jumpToRecord = (id: string) => {
    const viewport = scrollRef.current;
    const target = recordRefs.current.get(id);
    if (!viewport || !target) return;
    navigationTargetRef.current = id;
    setActiveId(id);
    viewport.scrollTo({
      top: viewport.scrollTop + target.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  const navigateByKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    else if (event.key === 'ArrowDown') nextIndex = Math.min(records.length - 1, index + 1);
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = records.length - 1;
    else return;
    event.preventDefault();
    const next = records[nextIndex];
    jumpToRecord(next.id);
    buttonRefs.current.get(next.id)?.focus({ preventScroll: true });
  };

  if (!records.length) return null;
  return <nav className="aos-work-history" aria-label="历史任务索引"
    style={{ '--aos-work-history-count': records.length } as CSSProperties}
    onMouseLeave={() => setPreviewId(null)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPreviewId(null); }}>
    <div ref={trackRef} className="aos-work-history-track">
      {records.map((record, index) => <button key={record.id} type="button"
        ref={element => { if (element) buttonRefs.current.set(record.id, element); else buttonRefs.current.delete(record.id); }}
        aria-label={`跳到历史任务：${record.sender}，${record.title}，${record.time}`}
        aria-current={currentId === record.id ? 'true' : undefined}
        tabIndex={currentId === record.id ? 0 : -1}
        onMouseEnter={() => setPreviewId(record.id)} onFocus={() => setPreviewId(record.id)}
        onClick={() => jumpToRecord(record.id)} onKeyDown={event => navigateByKey(event, index)}>
        <span aria-hidden="true" />
      </button>)}
    </div>
    {preview ? <div className="aos-work-history-preview" aria-hidden="true">
      <div><strong>{preview.sender}</strong><time>{preview.time}</time></div><p>{preview.title}</p>
    </div> : null}
  </nav>;
}
