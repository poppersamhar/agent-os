import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Check, GitBranch, MessageCircle, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import './InputSources.css';

export interface InputSource {
  id: string;
  kind: 'feishu' | 'github' | 'im';
  name: string;
  detail: string;
  enabled: boolean;
}

export interface InputSourcesProps {
  sources: InputSource[];
  onChange: (sources: InputSource[]) => void;
  onImport: (source: InputSource, request: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sourceKinds = [
  { kind: 'feishu', label: '飞书群聊', placeholder: '例如：产品共创群', link: 'https://…feishu.cn/…', icon: MessageCircle },
  { kind: 'github', label: 'GitHub', placeholder: '例如：team / agentos', link: 'https://github.com/team/repository', icon: GitBranch },
  { kind: 'im', label: '其他 IM', placeholder: '例如：项目协作群', link: 'https://…', icon: MessageCircle },
] as const;

function kindFor(source: Pick<InputSource, 'kind'>) {
  return sourceKinds.find(item => item.kind === source.kind) ?? sourceKinds[0];
}

function sampleRequest(source: InputSource) {
  if (source.kind === 'github') return `【GitHub 示例需求】请梳理「${source.name}」的待办 Issue，整理修复计划与阶段进度说明。`;
  if (source.kind === 'feishu') return `【飞书示例需求】请整理「${source.name}」的本周项目进展，输出待办清单与负责人。`;
  return `【IM 示例需求】请汇总「${source.name}」中的最新需求，整理成一份任务计划。`;
}

export default function InputSources({ sources, onChange, onImport, open, onOpenChange }: InputSourcesProps) {
  const [kind, setKind] = useState<InputSource['kind']>('feishu');
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'name' | 'detail' | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const sourceRefs = useRef(new Map<string, HTMLElement>());
  const fieldId = useId();
  const selectedKind = kindFor({ kind });

  useEffect(() => {
    if (!open) return;
    const target = selectedSourceId ? sourceRefs.current.get(selectedSourceId) : nameRef.current;
    target?.focus();
  }, [open, selectedSourceId]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation();
      onOpenChange(false); addRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onOpenChange]);

  const close = () => { onOpenChange(false); addRef.current?.focus({ preventScroll: true }); };
  const showSource = (id: string | null) => { setSelectedSourceId(id); setError(''); setErrorField(null); onOpenChange(true); };
  const add = () => {
    const sourceName = name.trim();
    const sourceDetail = detail.trim();
    if (!sourceName) { setError(kind === 'github' ? '请填写仓库显示名。' : '请填写来源名称。'); setErrorField('name'); nameRef.current?.focus(); return; }
    if (sources.some(source => source.kind === kind && source.name.toLocaleLowerCase() === sourceName.toLocaleLowerCase())) {
      setError('同类型下已添加这个名称，请使用不同的显示名。'); setErrorField('name'); nameRef.current?.focus(); return;
    }
    if (sourceDetail) {
      try {
        const url = new URL(sourceDetail);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
      } catch { setError('来源链接请使用完整的 http 或 https 地址，也可以暂时留空。'); setErrorField('detail'); return; }
    }
    const source: InputSource = { id: crypto.randomUUID(), kind, name: sourceName, detail: sourceDetail, enabled: true };
    onChange([...sources, source]); setName(''); setDetail(''); setError(''); setErrorField(null); setSelectedSourceId(source.id);
  };
  const remove = (source: InputSource) => {
    onChange(sources.filter(item => item.id !== source.id));
    if (selectedSourceId === source.id) setSelectedSourceId(null);
  };
  const importSample = (source: InputSource) => {
    if (!source.enabled) return;
    onImport(source, sampleRequest(source)); close();
  };

  return <div className="aos-input-sources" ref={containerRef}>
    <div className="aos-source-chips" aria-label="已添加的输入来源">
      {sources.map(source => {
        const Icon = kindFor(source).icon;
        return <button type="button" key={source.id} className={`aos-source-chip${source.enabled ? '' : ' aos-source-chip--paused'}`}
          aria-label={`管理来源：${source.name}`} title={`${source.name} · ${source.enabled ? '示例配置' : '已暂停'}`}
          onClick={() => showSource(source.id)}><Icon size={12} strokeWidth={1.6} /><span>{source.name}</span>{!source.enabled ? <Pause size={10} /> : null}</button>;
      })}
    </div>
    <button type="button" ref={addRef} className="aos-source-add" aria-label="添加输入来源" title="添加输入来源"
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${fieldId}-panel` : undefined}
      onClick={() => open ? close() : showSource(null)}><Plus size={19} strokeWidth={1.6} /></button>
    {open ? <div className="aos-source-popover" role="dialog" aria-labelledby={`${fieldId}-title`} id={`${fieldId}-panel`}>
      <header><div><h2 id={`${fieldId}-title`}>输入来源</h2><span>把不同入口的需求，交给同一个 Agent。</span></div>
        <button type="button" aria-label="关闭输入来源" onClick={close}><X size={16} /></button></header>
      <p className="aos-source-demo-note">示例接入 · 配置保存在本地，尚未连接真实平台。</p>
      {sources.length ? <section className="aos-source-configurations" aria-label="来源配置">
        {sources.map(source => {
          const sourceKind = kindFor(source);
          const Icon = sourceKind.icon;
          return <article key={source.id} ref={element => { if (element) sourceRefs.current.set(source.id, element); else sourceRefs.current.delete(source.id); }}
            tabIndex={-1} className={source.id === selectedSourceId ? 'aos-source-card is-selected' : 'aos-source-card'}>
            <div className="aos-source-card-top"><span className="aos-source-kind-icon"><Icon size={15} strokeWidth={1.6} /></span>
              <div><strong>{source.name}</strong><span>{sourceKind.label} · {source.enabled ? '已添加，示例配置' : '已暂停示例导入'}</span></div>
              <button type="button" className="aos-source-small-button" aria-label={`${source.enabled ? '暂停' : '启用'}来源：${source.name}`}
                title={source.enabled ? '暂停来源' : '启用来源'} onClick={() => onChange(sources.map(item => item.id === source.id ? { ...item, enabled: !item.enabled } : item))}>
                {source.enabled ? <Pause size={13} /> : <Play size={13} />}</button>
              <button type="button" className="aos-source-small-button" aria-label={`移除来源：${source.name}`} title="移除来源" onClick={() => remove(source)}><Trash2 size={13} /></button>
            </div>
            {source.detail ? <p className="aos-source-address" title={source.detail}>{source.detail}</p> : null}
            <button type="button" className="aos-source-import" disabled={!source.enabled} aria-label={`从${source.name}导入示例需求`}
              onClick={() => importSample(source)}><span>导入一条示例需求</span><ArrowUpRight size={12} /></button>
          </article>;
        })}
      </section> : <div className="aos-source-empty"><MessageCircle size={20} strokeWidth={1.3} /><p>添加群聊或仓库，让需求有统一的入口。</p></div>}
      <form className="aos-source-form" noValidate onSubmit={event => { event.preventDefault(); add(); }}>
        <strong className="aos-source-section-title">添加来源</strong>
        <div className="aos-source-kind-options" role="group" aria-label="来源类型">
          {sourceKinds.map(item => <button type="button" key={item.kind} aria-pressed={kind === item.kind}
            onClick={() => { setKind(item.kind); setError(''); setErrorField(null); }}><item.icon size={13} strokeWidth={1.5} />{item.label}</button>)}
        </div>
        <label htmlFor={`${fieldId}-name`}>{kind === 'github' ? '仓库显示名' : '来源名称'}</label>
        <input ref={nameRef} id={`${fieldId}-name`} type="text" value={name} maxLength={80} placeholder={selectedKind.placeholder}
          autoComplete="off" onChange={event => { setName(event.target.value); setError(''); setErrorField(null); }} aria-invalid={errorField === 'name' || undefined} aria-describedby={errorField === 'name' ? `${fieldId}-error` : undefined} />
        <label htmlFor={`${fieldId}-detail`}>来源链接<span>可选</span></label>
        <input id={`${fieldId}-detail`} type="url" value={detail} maxLength={1000} placeholder={selectedKind.link} autoComplete="off"
          onChange={event => { setDetail(event.target.value); setError(''); setErrorField(null); }} aria-invalid={errorField === 'detail' || undefined} aria-describedby={errorField === 'detail' ? `${fieldId}-error` : undefined} />
        {error ? <p id={`${fieldId}-error`} className="aos-source-error" role="alert">{error}</p> : null}
        <button type="submit" className="aos-source-submit"><Check size={13} />添加示例来源</button>
      </form>
    </div> : null}
  </div>;
}
