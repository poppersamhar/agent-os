import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { CircleAlert, CircleStop, FileText, GitBranch, LoaderCircle, MessageCircle, Search, SendHorizontal, SquareCheck, UserRound } from 'lucide-react';
import { getComposerModelLabel } from './composerModels';
import type { ConversationMessage, WorkerJob } from './workspaceModel';
import WorkHistoryIndex from './WorkHistoryIndex';
import './WorkRecords.css';

interface WorkRecordsProps {
  messages: ConversationMessage[];
  jobs: WorkerJob[];
  onOpen: (id: string) => void;
  onCancel: (job: WorkerJob) => void;
  onResume: (job: WorkerJob) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onDismiss: () => void;
}

const sourceLabels = { feishu: '飞书群聊', github: 'GitHub', im: '群聊消息' };
const taskStates = {
  running: { label: '正在处理', icon: LoaderCircle },
  completed: { label: '已完成', icon: SquareCheck },
  paused: { label: '需要人工介入', icon: CircleAlert },
  cancelled: { label: '已停止', icon: CircleStop },
};

function senderName(record: ConversationMessage) {
  return record.sourceKind ? record.sourceName || sourceLabels[record.sourceKind] : 'samhar';
}

function messageContent(text: string) {
  const attachmentStart = text.lastIndexOf('\n附件：');
  return attachmentStart < 0 ? { body: text, files: [] } : {
    body: text.slice(0, attachmentStart),
    files: text.slice(attachmentStart + 4).split('、').filter(Boolean),
  };
}

export default function WorkRecords({ messages, jobs, onOpen, onCancel, onResume, triggerRef, onDismiss }: WorkRecordsProps) {
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recordRefs = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    let frameFocusTimer = 0;
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onDismiss();
    };
    // Web preview clicks stay inside the frame; detect focus entering it instead.
    const onWindowBlur = () => {
      window.clearTimeout(frameFocusTimer);
      frameFocusTimer = window.setTimeout(() => {
        const target = document.activeElement;
        if (target instanceof HTMLIFrameElement && !panelRef.current?.contains(target)) onDismiss();
      }, 0);
    };
    document.addEventListener('click', onOutsideClick, true);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      document.removeEventListener('click', onOutsideClick, true);
      window.removeEventListener('blur', onWindowBlur);
      window.clearTimeout(frameFocusTimer);
    };
  }, [onDismiss, triggerRef]);

  const jobsById = useMemo(() => new Map(jobs.map(job => [job.id, job])), [jobs]);
  const records = useMemo(() => messages.filter(record => record.role === 'user'
    && `${record.text} ${senderName(record)} ${record.sourceKind ? sourceLabels[record.sourceKind] : '文本输入'}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [messages, query]);
  const history = useMemo(() => records.map(record => ({ id: record.id, title: messageContent(record.text).body, sender: senderName(record), time: record.time })), [records]);

  return <aside ref={panelRef} className="aos-work-records" aria-label="任务记录">
    <header><h2>任务记录</h2></header>
    <label className="aos-work-search"><Search size={13} /><input value={query} onChange={event => {
      setQuery(event.target.value);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }} placeholder="搜索消息、来源或发送者" aria-label="搜索任务记录" /></label>
    <div className="aos-work-records-body">
      <div ref={scrollRef} className="aos-work-records-scroll" role="log" aria-label="提交的任务记录" tabIndex={0}>
        {records.length ? records.map(record => {
          const job = (record.jobId ? jobsById.get(record.jobId) : undefined)
            ?? (!record.jobId ? jobs.find(item => record.text === item.request) : undefined);
          const sender = senderName(record);
          const content = messageContent(record.text);
          const state = job ? taskStates[job.status] : null;
          const StatusIcon = state?.icon ?? SendHorizontal;
          const AvatarIcon = record.sourceKind === 'github' ? GitBranch : record.sourceKind ? MessageCircle : UserRound;
          return <article key={record.id} ref={element => {
            if (element) recordRefs.current.set(record.id, element);
            else recordRefs.current.delete(record.id);
          }} className={`aos-work-record${job ? ' aos-work-record--clickable' : ''}`} aria-label={`${sender}：${content.body}`}
            onClick={job ? event => {
              if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return;
              onOpen(job.artifactId);
            } : undefined}>
            <div className="aos-work-record-meta">
              <div className="aos-work-record-source" title={record.sourceKind ? `${sourceLabels[record.sourceKind]} · ${sender}` : sender}>
                <span className={`aos-work-avatar aos-work-avatar--${record.sourceKind ?? 'user'}`} aria-hidden="true">
                  {record.sourceKind === 'feishu' ? <img src="/source-icons/feishu.png" alt="" /> : <AvatarIcon size={13} strokeWidth={1.7} />}
                </span>
                <strong>{sender}</strong>
              </div>
              <time>{record.time}</time>
              {job && state ? <button type="button" className={`aos-work-status aos-work-status--${job.status}`} onClick={() => onOpen(job.artifactId)}
                aria-label={`查看任务：${job.title}，${state.label}`} title={`${state.label} · 查看任务${job.modelId ? ` · 模型偏好 ${getComposerModelLabel(job.modelId)}` : ''}`}>
                <StatusIcon size={13} aria-hidden="true" className={job.status === 'running' ? 'aos-spin' : undefined} />
              </button> : <span className="aos-work-status aos-work-status--sent" role="img" aria-label="已发送" title="已发送"><StatusIcon size={13} aria-hidden="true" /></span>}
            </div>
            {record.sourceKind ? <span className="aos-work-record-origin">{sourceLabels[record.sourceKind]}</span> : null}
            {job ? <button type="button" className="aos-work-record-message" aria-label={`打开任务：${job.title}`} onClick={() => onOpen(job.artifactId)}>{content.body}</button>
              : <p className="aos-work-record-message">{content.body}</p>}
            {content.files.length ? <div className="aos-work-record-files" aria-label="消息附件名称">{content.files.map((name, index) =>
              <span key={`${name}-${index}`} className="aos-work-record-file" title={`附件名称：${name}`}><FileText size={13} /><span>{name}</span></span>)}</div> : null}
            {job && (job.status === 'running' || job.status === 'paused' || job.status === 'cancelled') ? <div className="aos-work-record-followup">
              <span>{job.status === 'paused' ? '任务已暂停，确认后可继续。' : job.status === 'running' ? '任务持续推进中' : '记录与已有成果已保留'}</span>
              {job.status === 'running' ? <button type="button" aria-label={`停止任务：${job.title}`} onClick={() => onCancel(job)}>停止</button>
                : <button type="button" aria-label={`继续任务：${job.title}`} onClick={() => onResume(job)}>继续</button>}
            </div> : null}
          </article>;
        }) : <div className="aos-work-empty"><FileText size={25} strokeWidth={1.2} /><p>{query ? '没有匹配的消息' : '你发出的任务，会留在这里。'}</p><span>文本、群聊与 GitHub 来源统一记录</span></div>}
      </div>
      <WorkHistoryIndex records={history} scrollRef={scrollRef} recordRefs={recordRefs} />
    </div>
    <footer>{messages.filter(record => record.role === 'user').length} 条记录 <span>一个入口，所有工作</span></footer>
  </aside>;
}
