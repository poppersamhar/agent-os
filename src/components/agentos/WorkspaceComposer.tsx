import { useId, useRef, type KeyboardEvent } from 'react';
import { ArrowUp, ChevronDown, FileText, Plus, X, Zap } from 'lucide-react';
import type { Artifact } from '../../data/agentosArtifacts';
import { composerModels, getComposerModel, isComposerModelId, type ComposerModelId } from './composerModels';
import './WorkspaceComposer.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  context: Artifact | undefined;
  onClearContext: () => void;
  attachments: File[];
  onAttachments: (files: File[]) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  modelId: ComposerModelId;
  onModelChange: (modelId: ComposerModelId) => void;
  dock?: boolean;
}

export default function WorkspaceComposer({ value, onChange, onSend, context, onClearContext, attachments, onAttachments, inputRef, modelId, onModelChange, dock = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const modelDescriptionId = useId();
  const model = getComposerModel(modelId);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSend();
    }
  };
  return (
    <div className="aos-composer-wrap">
      <div className="aos-composer">
        {context ? <div className="aos-composer-context"><FileText size={13} /><span>引用：{context.title}</span>
          <button type="button" aria-label="移除成果引用" onClick={onClearContext}><X size={13} /></button></div> : null}
        {attachments.length ? <div className="aos-attachments">{attachments.map((file, index) => <span key={`${file.name}-${index}`}>
          <FileText size={12} /><span>{file.name}</span><button type="button" aria-label={`移除附件 ${file.name}`}
            onClick={() => onAttachments(attachments.filter((_, i) => i !== index))}><X size={12} /></button></span>)}</div> : null}
        <textarea ref={inputRef} aria-label="给 OrgAgent 发送消息" placeholder="告诉我你想做什么，或继续刚才的工作…"
          rows={2} value={value} onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} />
        <div className="aos-composer-actions">
          <input ref={fileRef} type="file" multiple className="aos-visually-hidden" tabIndex={-1}
            onChange={event => { onAttachments([...attachments, ...Array.from(event.target.files ?? [])]); event.target.value = ''; }} />
          <button type="button" className="aos-icon-button aos-composer-add" aria-label="添加附件" title="添加附件"
            onClick={() => fileRef.current?.click()}><Plus size={dock ? 21 : 22} strokeWidth={1.6} /></button>
          <span className="aos-composer-mode">OrgAgent</span>
          <div className="aos-composer-controls">
            <label className="aos-composer-model-picker" title="模型偏好 · 当前为交互预览，尚未接入真实模型调用">
              <Zap size={14} strokeWidth={1.7} aria-hidden="true" />
              <span className="aos-composer-model-name" aria-hidden="true">{model.label}</span>
              <ChevronDown size={12} strokeWidth={1.7} aria-hidden="true" />
              <select aria-label="选择任务模型" aria-describedby={modelDescriptionId} value={modelId}
                onChange={event => { if (isComposerModelId(event.target.value)) onModelChange(event.target.value); }}>
                {composerModels.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <span id={modelDescriptionId} className="aos-visually-hidden">当前为交互预览，选择会记录为新任务的模型偏好，尚未接入真实模型调用。</span>
            <button type="button" className="aos-send-button" aria-label="发送消息" disabled={!value.trim() && !attachments.length}
              onClick={onSend}><ArrowUp size={19} strokeWidth={1.9} /></button>
          </div>
        </div>
      </div>
      <div className="aos-composer-footnote"><span>一个对话，连接所有工作</span><span>Enter 发送 <span aria-hidden="true">·</span> Shift + Enter 换行</span></div>
    </div>
  );
}
