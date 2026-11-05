import { useState, type KeyboardEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, FileText, Link2, Monitor, Smartphone } from 'lucide-react';
import { getArtifactWebPreview, projectForArtifact, type Artifact, type Slide } from '../../data/agentosArtifacts';
import './ArtifactContent.css';

export interface ArtifactContentProps {
  artifact: Artifact;
  onArtifactChange?: (artifactId: string) => void;
}

function DocumentContent({ artifact }: ArtifactContentProps) {
  const document = artifact.document;
  if (!document) return <EmptyContent />;
  const project = projectForArtifact(artifact);
  return (
    <div className="aos-artifact-document-scroll">
      <article className="aos-artifact-paper">
        <div className="aos-artifact-eyebrow"><span>{document.eyebrow}</span><span>{artifact.version}</span></div>
        <h1>{artifact.title}</h1>
        <div className="aos-artifact-document-meta"><span>{project?.name}</span><span aria-hidden="true">·</span><span>{artifact.updatedAt}</span></div>
        <p className="aos-artifact-introduction">{document.introduction}</p>
        <aside className="aos-artifact-takeaways" aria-label="核心要点">
          <span className="aos-artifact-takeaways-label">核心要点</span>
          {document.highlights.map((item) => <p key={item}><Check size={14} strokeWidth={1.5} /><span>{item}</span></p>)}
        </aside>
        {document.sections.map((section) => (
          <section className="aos-artifact-document-section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          </section>
        ))}
        <footer className="aos-artifact-document-sources"><div><Link2 size={13} /><span>参考资料</span></div>{document.sources.map((source, index) => <span key={source}>{String(index + 1).padStart(2, '0')} · {source}</span>)}</footer>
        <div className="aos-artifact-paper-footer"><span>AGENTOS / {project?.name}</span><span>持续更新的项目成果</span></div>
      </article>
    </div>
  );
}

function SlidePage({ slide, number, total, compact = false }: { slide: Slide; number: number; total: number; compact?: boolean }) {
  return (
    <div className={`aos-artifact-slide aos-artifact-slide--${slide.layout || 'content'}${compact ? ' aos-artifact-slide--compact' : ''}`}>
      <div className="aos-artifact-slide-top"><span>{slide.eyebrow}</span><span>AGENTOS</span></div>
      <div className="aos-artifact-slide-body">
        <h2>{slide.title}</h2>
        {slide.subtitle && <p className="aos-artifact-slide-subtitle">{slide.subtitle}</p>}
        {slide.points && <ol>{slide.points.map((point, index) => <li key={point}><span>{String(index + 1).padStart(2, '0')}</span>{point}</li>)}</ol>}
        {slide.metrics && <div className="aos-artifact-slide-metrics">{slide.metrics.map((metric) => <div key={metric.value}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}</div>}
      </div>
      <div className="aos-artifact-slide-bottom"><span>{slide.note || '清晰的目标，可见的成果。'}</span><span>{String(number).padStart(2, '0')} / {String(total).padStart(2, '0')}</span></div>
    </div>
  );
}

function SlidesContent({ artifact }: ArtifactContentProps) {
  const [page, setPage] = useState(0);
  const slides = artifact.slides || [];
  if (!slides.length) return <EmptyContent />;
  const current = Math.min(page, slides.length - 1);
  const move = (direction: number) => setPage((value) => Math.max(0, Math.min(slides.length - 1, value + direction)));
  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setPage(event.key === 'Home' ? 0 : slides.length - 1); }
  };
  return (
    <div className="aos-artifact-slides-viewer" onKeyDown={handleKeys} tabIndex={0} role="region" aria-label={`${artifact.title}，使用左右方向键切换页面`}>
      <div className="aos-artifact-slides-stage"><SlidePage slide={slides[current]} number={current + 1} total={slides.length} /></div>
      <div className="aos-artifact-slides-controls">
        <span className="aos-artifact-slide-key-hint">使用 ← → 切换页面</span>
        <div><button type="button" onClick={() => move(-1)} disabled={current === 0} aria-label="上一页"><ChevronLeft size={17} /></button><span aria-live="polite">{current + 1}<span> / {slides.length}</span></span><button type="button" onClick={() => move(1)} disabled={current === slides.length - 1} aria-label="下一页"><ChevronRight size={17} /></button></div>
      </div>
      <div className="aos-artifact-slide-thumbnails" aria-label="演示文稿页面">
        {slides.map((slide, index) => <button type="button" key={slide.eyebrow} className={current === index ? 'aos-artifact-thumbnail aos-artifact-thumbnail--active' : 'aos-artifact-thumbnail'} onClick={() => setPage(index)} aria-label={`第 ${index + 1} 页：${slide.title.replace(/\n/g, '')}`} aria-current={current === index ? 'page' : undefined}><span className="aos-artifact-thumbnail-number">{String(index + 1).padStart(2, '0')}</span><span className="aos-artifact-thumbnail-title">{slide.title.replace(/\n/g, '')}</span></button>)}
      </div>
    </div>
  );
}

function WebContent({ artifact }: ArtifactContentProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  if (!artifact.web) return <EmptyContent />;
  return (
    <div className="aos-artifact-web-viewer">
      <div className="aos-artifact-browser-bar"><div className="aos-artifact-browser-dots" aria-hidden="true"><i /><i /><i /></div><span>{artifact.web.address}</span><div className="aos-artifact-device-switch"><button type="button" aria-label="桌面预览" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor size={14} /></button><button type="button" aria-label="移动端预览" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}><Smartphone size={14} /></button></div></div>
      <div className="aos-artifact-web-canvas"><iframe className={`aos-artifact-web-frame aos-artifact-web-frame--${device}`} title={artifact.web.label} sandbox="" referrerPolicy="no-referrer" srcDoc={getArtifactWebPreview(artifact.web.kind)} /></div>
      <div className="aos-artifact-web-footer"><span>{device === 'desktop' ? '桌面预览' : '移动端预览 · 375 px'}</span><span>页面预览 · {artifact.version}</span></div>
    </div>
  );
}

function GraphContent({ artifact, onArtifactChange }: ArtifactContentProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const graph = artifact.graph;
  if (!graph) return <EmptyContent />;
  const related = selected ? graph.relations.filter((relation) => relation.from === selected || relation.to === selected) : graph.relations;
  const label = (id: string) => graph.nodes.find((node) => node.id === id)?.label || id;
  return (
    <div className="aos-artifact-graph-scroll"><article className="aos-artifact-graph-paper"><div className="aos-artifact-eyebrow"><span>CONNECTED KNOWLEDGE</span><span>{artifact.version}</span></div><h1>{artifact.title}</h1><p className="aos-artifact-introduction">{graph.description}</p><div className="aos-artifact-graph-heading"><h2>资产节点</h2><span>{graph.nodes.length} 个节点 · {graph.relations.length} 条关系</span></div><div className="aos-artifact-graph-nodes">{graph.nodes.map((node) => <button key={node.id} type="button" className={selected === node.id ? 'aos-artifact-node aos-artifact-node--selected' : 'aos-artifact-node'} onClick={() => setSelected((value) => value === node.id ? null : node.id)} aria-pressed={selected === node.id}><span className="aos-artifact-node-kind"><span />{node.kind}</span><strong>{node.label}</strong><span className="aos-artifact-node-description">{node.description}</span></button>)}</div><div className="aos-artifact-graph-heading"><h2>{selected ? `${label(selected)}的关联` : '来源与依赖'}</h2>{selected && <button type="button" onClick={() => setSelected(null)}>查看全部</button>}</div><div className="aos-artifact-relations">{related.map((relation) => <div className="aos-artifact-relation" key={`${relation.from}-${relation.to}`}><span>{label(relation.from)}</span><span className="aos-artifact-relation-label"><span>{relation.label}</span><ArrowRight size={15} /></span><span>{label(relation.to)}</span></div>)}</div>{onArtifactChange && <button className="aos-artifact-related-link" type="button" onClick={() => onArtifactChange('data-report')}><FileText size={15} />打开关联成果：数据质量巡检报告<ArrowRight size={14} /></button>}<p className="aos-artifact-graph-help">选择一个节点，查看它的来源与依赖关系。</p></article></div>
  );
}

function EmptyContent() {
  return <div className="aos-artifact-empty"><FileText size={28} strokeWidth={1} /><p>成果内容正在整理中</p></div>;
}

export function ArtifactContent(props: ArtifactContentProps) {
  return <div className={`aos-artifact-content aos-artifact-content--${props.artifact.type}`} key={props.artifact.id}>{props.artifact.type === 'document' ? <DocumentContent {...props} /> : props.artifact.type === 'slides' ? <SlidesContent {...props} /> : props.artifact.type === 'web' ? <WebContent {...props} /> : <GraphContent {...props} />}</div>;
}

export default ArtifactContent;
