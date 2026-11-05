import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { artifactTypeLabels, type Artifact, type Project } from '../../data/agentosArtifacts';
import './ConversationNavigation.css';

export interface ConversationNavigationProps {
  artifacts: Artifact[];
  projects: Project[];
  selectedId: string | null;
  onSelect: (artifactId: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  fallbackFocusRef?: RefObject<HTMLButtonElement | null>;
}

interface NavigationGroup { id: string; name: string; artifacts: Artifact[] }

export default function ConversationNavigation({ artifacts, projects, selectedId, onSelect, expanded, onExpandedChange, fallbackFocusRef }: ConversationNavigationProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [previewY, setPreviewY] = useState(0);
  const [query, setQuery] = useState('');
  const navRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previewActionRef = useRef<HTMLButtonElement>(null);
  const railButtons = useRef(new Map<string, HTMLButtonElement>());
  const lastFocusedId = useRef<string | null>(null);
  const suppressFocus = useRef(false);
  const pointerType = useRef('mouse');
  const previewId = useId();

  const groups = useMemo(() => {
    const result: NavigationGroup[] = projects.map(project => ({ id: project.id, name: project.name, artifacts: [] }));
    const byId = new Map(result.map(group => [group.id, group]));
    const personal: NavigationGroup = { id: 'personal', name: '日常工作', artifacts: [] };
    for (const artifact of artifacts) (byId.get(artifact.projectId) ?? personal).artifacts.push(artifact);
    if (personal.artifacts.length) result.push(personal);
    return result.filter(group => group.artifacts.length);
  }, [artifacts, projects]);
  const entries = groups.flatMap(group => group.artifacts.map((artifact, index) => ({ artifact, group, first: index === 0 })));
  const previewEntry = entries.find(entry => entry.artifact.id === (hoveredId ?? focusedId));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredGroups = groups.flatMap(group => {
    const matches = group.artifacts.filter(artifact => `${group.name} ${artifact.title} ${artifact.taskTitle} ${artifactTypeLabels[artifact.type]}`.toLocaleLowerCase().includes(normalizedQuery));
    return matches.length ? [{ ...group, artifacts: matches }] : [];
  });

  useEffect(() => {
    if (expanded) searchRef.current?.focus({ preventScroll: true });
  }, [expanded]);

  const positionPreview = (id: string, button: HTMLButtonElement) => {
    const nav = navRef.current;
    if (nav) setPreviewY(Math.max(0, button.getBoundingClientRect().top - nav.getBoundingClientRect().top - 18));
    lastFocusedId.current = id;
  };
  const select = (id: string) => {
    setHoveredId(null); setFocusedId(null); onExpandedChange(false); onSelect(id);
  };
  const collapse = () => {
    setHoveredId(null); setFocusedId(null); onExpandedChange(false);
    requestAnimationFrame(() => {
      suppressFocus.current = true;
      const id = lastFocusedId.current ?? selectedId ?? entries[0]?.artifact.id;
      const target = id ? railButtons.current.get(id) : undefined;
      (target?.isConnected ? target : fallbackFocusRef?.current)?.focus({ preventScroll: true });
      suppressFocus.current = false;
    });
  };
  const blurNavigation = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocusedId(null); setHoveredId(null); onExpandedChange(false);
    }
  };
  const keyboardNavigation = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); collapse(); return;
    }
    const index = entries.findIndex(entry => railButtons.current.get(entry.artifact.id) === event.target);
    if (index < 0) return;
    if (event.key === 'ArrowLeft' && previewEntry) {
      event.preventDefault(); previewActionRef.current?.focus(); return;
    }
    const next = event.key === 'ArrowDown' ? (index + 1) % entries.length
      : event.key === 'ArrowUp' ? (index - 1 + entries.length) % entries.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); railButtons.current.get(entries[next].artifact.id)?.focus(); }
  };

  return <nav ref={navRef} className={`aos-conversation-navigation${expanded ? ' aos-conversation-navigation--expanded' : ''}`}
    aria-label="项目与成果导航" onKeyDown={keyboardNavigation} onBlur={blurNavigation}
    onPointerLeave={() => setHoveredId(null)} style={{ '--aos-nav-preview-y': `${previewY}px` } as CSSProperties}>
    <div className="aos-conversation-nav-rail" aria-hidden={expanded} inert={expanded} onScroll={() => setHoveredId(null)}>
      {entries.map(({ artifact, group, first }) => <button key={artifact.id} type="button"
        ref={element => { if (element) railButtons.current.set(artifact.id, element); else railButtons.current.delete(artifact.id); }}
        className={`aos-conversation-nav-mark${first ? ' aos-conversation-nav-mark--group-start' : ''}${artifact.id === selectedId ? ' aos-conversation-nav-mark--current' : ''}${previewEntry?.artifact.id === artifact.id ? ' aos-conversation-nav-mark--preview' : ''}`}
        aria-label={`查看成果：${artifact.title}`} aria-current={artifact.id === selectedId ? 'page' : undefined}
        aria-describedby={!expanded && previewEntry?.artifact.id === artifact.id ? previewId : undefined}
        onPointerDown={event => { pointerType.current = event.pointerType; }}
        onPointerEnter={event => { if (event.pointerType !== 'touch') { positionPreview(artifact.id, event.currentTarget); setHoveredId(artifact.id); } }}
        onFocus={event => { if (!suppressFocus.current) { positionPreview(artifact.id, event.currentTarget); setFocusedId(artifact.id); } }}
        onClick={event => {
          if (event.detail !== 0 && pointerType.current === 'touch') { positionPreview(artifact.id, event.currentTarget); setHoveredId(artifact.id); }
          else select(artifact.id);
        }} data-project={group.name}><span aria-hidden="true" /></button>)}
      {!entries.length ? <span className="aos-conversation-nav-no-marks" aria-label="暂无成果" /> : null}
    </div>

    {!expanded && previewEntry ? <div id={previewId} className="aos-conversation-nav-preview" role="group" aria-label={`成果预览：${previewEntry.artifact.title}`}>
      <span className="aos-conversation-nav-project">{previewEntry.group.name}<span> / {artifactTypeLabels[previewEntry.artifact.type]}</span></span>
      <h2>{previewEntry.artifact.title}</h2>
      <p>{previewEntry.artifact.summary}</p>
      <span className="aos-conversation-nav-task">{previewEntry.artifact.taskTitle}</span>
      <footer><span>{previewEntry.artifact.version}</span><button ref={previewActionRef} type="button" onClick={() => select(previewEntry.artifact.id)}>查看成果 <ArrowUpRight size={13} /></button></footer>
    </div> : null}

    {expanded ? <div className="aos-conversation-nav-panel">
      <header><strong>项目与成果</strong><button type="button" aria-label="收起成果导航" onClick={collapse}><X size={15} /></button></header>
      <div className="aos-conversation-nav-search"><Search size={13} aria-hidden="true" /><input ref={searchRef} type="search" value={query}
        onChange={event => setQuery(event.target.value)} placeholder="搜索项目、任务或成果" aria-label="搜索项目、任务或成果" /></div>
      <div className="aos-conversation-nav-list">
        {filteredGroups.length ? filteredGroups.map(group => <section key={group.id}><h3>{group.name}<span>{group.artifacts.length}</span></h3>
          {group.artifacts.map(artifact => <button key={artifact.id} type="button" className={artifact.id === selectedId ? 'is-current' : ''}
            aria-label={`查看成果：${artifact.title}`} aria-current={artifact.id === selectedId ? 'page' : undefined} onClick={() => select(artifact.id)}>
            <strong>{artifact.title}</strong><span>{artifact.taskTitle}</span>
          </button>)}
        </section>) : <div className="aos-conversation-nav-empty" role="status">没有找到相关成果</div>}
      </div>
    </div> : null}
  </nav>;
}
