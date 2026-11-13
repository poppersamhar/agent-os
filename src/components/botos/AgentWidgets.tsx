import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Folder, Globe, Play, Presentation } from 'lucide-react';
import type { ExecutionStep, WidgetSource } from './botModel';
import { fileDownload, newestFileFirst, samplePresentation, tableActionLabel, tableActionStatus, tableRows, webSample, type ActionRow, type Routine, type TableAction, type WorkspaceFile } from './workspaceWidgets';
import './AgentWidgets.css';

export function ActionTableWidget({ source, actions = {}, onAction }: {
  source: WidgetSource;
  actions?: Record<string, TableAction>;
  onAction: (row: ActionRow, action: TableAction) => void;
}) {
  const rows = tableRows(source);
  if (!rows.length) return <p className="bos-empty-note">暂无待处理事项</p>;
  return <div className="bos-action-table-wrap" tabIndex={0} role="region" aria-label="事项操作表格">
    <table className="bos-action-table">
      <thead><tr><th scope="col">事项</th><th scope="col">操作</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <th scope="row"><strong>{row.title}</strong><small>{row.detail}</small></th>
        <td>{actions[row.id] ? <span className="bos-tag" role="status">{tableActionStatus(actions[row.id])}</span> : <div className="bos-widget-actions">
          {row.actions.map(action => <button type="button" key={action} className="bos-secondary bos-widget-button"
            aria-label={`${tableActionLabel(action)} ${row.title}`} onClick={() => onAction(row, action)}>{tableActionLabel(action)}</button>)}
        </div>}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

const dateTime = new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export function RoutinesWidget({ routines, onToggle, onRun }: {
  routines: readonly Routine[];
  onToggle: (id: string) => void;
  onRun: (id: string) => void;
}) {
  if (!routines.length) return <p className="bos-empty-note">还没有长期职责。可以在对话里说「每天早上给我一份简报」。</p>;
  return <ul className="bos-routine-list">{routines.map(routine => <li key={routine.id} className="bos-routine-row">
    <div className="bos-widget-entry">
      <strong>{routine.name}</strong><small>{routine.trigger}</small>
    </div>
    <span className="bos-routine-result">{routine.lastRunAt === undefined ? '尚未运行' : `${dateTime.format(routine.lastRunAt)} · ${routine.lastResult ?? '已完成'}`}</span>
    <div className="bos-widget-actions">
      <label className="bos-routine-switch">
        <input type="checkbox" role="switch" checked={routine.enabled} aria-label={`启用 ${routine.name}`} onChange={() => onToggle(routine.id)} />
        <span>{routine.enabled ? '已启用' : '已暂停'}</span>
      </label>
      <button type="button" className="bos-secondary bos-widget-button" aria-label={`运行一次 ${routine.name}`} onClick={() => onRun(routine.id)}><Play size={12} />运行一次</button>
    </div>
  </li>)}</ul>;
}

const folderNames = { artifacts: '产物', uploads: '上传的资料', logs: '运行日志' } as const;
const fileIcon = { document: FileText, web: Globe, presentation: Presentation };
const fileTime = (file: WorkspaceFile) => file.at === undefined ? file.time : dateTime.format(file.at);

function fileSize(bytes: number) {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

function downloadTextFile(download: { name: string; text: string; mime: string }) {
  const url = URL.createObjectURL(new Blob([download.text], { type: download.mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = download.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WorkspaceWidget({ files, onPreview }: { files: readonly WorkspaceFile[]; onPreview: (file: WorkspaceFile) => void }) {
  const folders = Object.entries(folderNames) as [WorkspaceFile['folder'], string][];
  return <div className="bos-managed-workspace">
    <p className="bos-hint">只有这个智能体能访问。</p>
    {folders.map(([folder, label]) => {
      const entries = files.filter(file => file.folder === folder);
      return <details key={folder} open={folder === 'artifacts'}>
        <summary><Folder size={14} />{label}<span>{entries.length} 个文件</span></summary>
        {entries.length ? <ul className="bos-workspace-files">{entries.map(file => {
          const Icon = fileIcon[file.kind];
          const download = fileDownload(file);
          const bytes = 'text' in download ? new TextEncoder().encode(download.text).byteLength : download.bytes;
          return <li key={file.id}>
            <Icon size={14} />
            <div className="bos-widget-entry"><strong>{file.name}</strong><small>{[fileSize(bytes), fileTime(file)].filter(Boolean).join(' · ')}</small></div>
            <div className="bos-widget-actions">
              <button type="button" className="bos-secondary bos-widget-button" aria-label={`预览 ${file.name}`} onClick={() => onPreview(file)}><Eye size={13} />预览</button>
              {'url' in download
                ? <a href={`${import.meta.env.BASE_URL}${download.url.slice(1)}`} download={download.name} className="bos-secondary bos-widget-button" aria-label={`下载 ${file.name}`}><Download size={13} />下载</a>
                : <button type="button" className="bos-secondary bos-widget-button" aria-label={`下载 ${file.name}`} onClick={() => downloadTextFile(download)}><Download size={13} />下载</button>}
            </div>
          </li>;
        })}</ul> : <p className="bos-empty-note">暂无文件</p>}
      </details>;
    })}
  </div>;
}

export function RecentArtifactsWidget({ files, onPreview }: { files: readonly WorkspaceFile[]; onPreview: (file: WorkspaceFile) => void }) {
  const artifacts = files.filter(file => file.folder === 'artifacts').sort(newestFileFirst).slice(0, 4);
  if (!artifacts.length) return <p className="bos-empty-note">完成第一项任务后，成果会出现在这里</p>;
  return <ul className="bos-artifact-list">{artifacts.map(file => {
    const Icon = fileIcon[file.kind];
    return <li key={file.id}><button type="button" className="bos-artifact-button" onClick={() => onPreview(file)}>
      <Icon size={14} />
      <span className="bos-widget-entry"><strong>{file.name}</strong><small>{[file.author, fileTime(file)].filter(Boolean).join(' · ')}</small></span>
      <Eye size={14} />
    </button></li>;
  })}</ul>;
}

function PresentationPreview({ file }: { file: WorkspaceFile }) {
  const slides = file.name === '品牌升级提案.pptx' ? samplePresentation : [
    { title: file.name.replace(/\.pptx?$/i, ''), body: file.body ?? '' },
    ...samplePresentation.slice(1),
  ];
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  return <>
    <div className="bos-slide-preview" aria-live="polite"><strong>{slide.title}</strong><p>{slide.body}</p></div>
    <div className="bos-slide-navigation">
      <button type="button" className="bos-secondary bos-widget-button" aria-label="上一页" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft size={14} /></button>
      <span aria-live="polite">{index + 1} / {slides.length}</span>
      <button type="button" className="bos-secondary bos-widget-button" aria-label="下一页" disabled={index === slides.length - 1} onClick={() => setIndex(index + 1)}><ChevronRight size={14} /></button>
    </div>
  </>;
}

function WebPreview({ file }: { file: WorkspaceFile }) {
  const sample = webSample(file);
  return <div className="bos-web-preview" role="group" aria-label="网页缩略图">
    <div className="bos-web-preview-bar"><span aria-hidden="true">● ● ●</span>{sample.title}</div>
    <div className="bos-web-preview-body"><strong>{sample.headline}</strong><p>{sample.body}</p></div>
  </div>;
}

function DocumentPreview({ file }: { file: WorkspaceFile }) {
  const paragraphs = (file.body ?? file.name).split(/\n\n+/);
  return <div className="bos-document-preview">{paragraphs.map((paragraph, index) => /^#\s+/.test(paragraph)
    ? <h3 key={index}>{paragraph.replace(/^#\s+/, '')}</h3>
    : <p key={index}>{paragraph}</p>)}</div>;
}

export function ArtifactPreviewWidget({ file }: { file?: WorkspaceFile }) {
  if (!file) return <p className="bos-empty-note">选择「最近成果」或工作区文件以查看预览</p>;
  return <div className="bos-artifact-preview" aria-label={`${file.name} 预览`}>
    <p className="bos-artifact-name">{file.name}</p>
    {file.kind === 'presentation' ? <PresentationPreview key={file.id} file={file} />
      : file.kind === 'web' ? <WebPreview file={file} />
        : <DocumentPreview file={file} />}
  </div>;
}

export function ExecutionSteps({ steps }: { steps: readonly ExecutionStep[] }) {
  if (!steps.length) return null;
  return <details className="bos-execution-steps">
    <summary>执行步骤 <span>{steps.length} 步</span></summary>
    <ol>{steps.map((step, index) => <li key={index}><span>{step.path}</span><strong>{step.tool}</strong><small>{step.durationMs} 毫秒</small></li>)}</ol>
  </details>;
}
