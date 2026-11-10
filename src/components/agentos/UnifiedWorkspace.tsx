import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type Dispatch } from 'react';
import { ArrowUpRight, Hexagon, X } from 'lucide-react';
import { DEFAULT_PROJECT_ID, agentosArtifacts, agentosProjects, artifactTypeLabels, normalizeProjectId } from '../../data/agentosArtifacts';
import WorkspaceComposer from './WorkspaceComposer';
import WorkRecords from './WorkRecords';
import { demoWorkJobs, demoWorkMessages } from './workspaceDemoData';
import SessionCanvas, { type SessionCollection } from './SessionCanvas';
import UserHomeDashboard from './UserHomeDashboard';
import HomeResourceRail, { type HomeResourceId } from './HomeResourceRail';
import HomeResourcePage from './HomeResourcePage';
import ProjectRail from './ProjectRail';
import ProjectBoard from './ProjectBoard';
import { projectBoardTasks } from './projectBoardModel';
import { projectActivity } from './projectActivity';
import InputSources, { type InputSource } from './InputSources';
import { COMPOSER_MODEL_STORAGE_KEY, DEFAULT_COMPOSER_MODEL_ID, restoreComposerModel, type ComposerModelId } from './composerModels';
import { STORAGE_KEY, artifactTitle, chooseArtifact, jobArtifact, restoreWorkspace, workspaceReducer, type ConversationMessage, type WorkerJob, type WorkspaceAction } from './workspaceModel';
import { isTaskContinuation } from './taskContinuation';
import useTaskDispatchMotion from './useTaskDispatchMotion';
import './UnifiedWorkspace.css';
import './WorkspaceExperience.css';

const phases = ['理解目标与整理上下文', '组织内容与生成成果', '检查内容与准备交付'];
const SOURCE_KEY = 'agentos-input-sources-v1';
const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
const message = (text: string, extra?: Partial<ConversationMessage>): ConversationMessage => ({ id: crypto.randomUUID(), role: 'assistant', text, time: now(), ...extra });
function restoreSources(): InputSource[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SOURCE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((s): s is InputSource => !!s && typeof s === 'object'
      && typeof s.id === 'string' && ['feishu', 'github', 'im'].includes(s.kind) && typeof s.name === 'string'
      && typeof s.detail === 'string' && typeof s.enabled === 'boolean') : [];
  } catch { return []; }
}
function DemoWorker({ job, dispatch }: { job: WorkerJob; dispatch: Dispatch<WorkspaceAction> }) {
  const { id, attempt, title, artifactId } = job;
  useEffect(() => {
    const timers = [
      window.setTimeout(() => dispatch({ type: 'phase', id, attempt, phase: 1 }), 1100),
      window.setTimeout(() => dispatch({ type: 'phase', id, attempt, phase: 2 }), 2400),
      window.setTimeout(() => dispatch({ type: 'complete', id, attempt, message: message(`「${title}」已经完成，成果已放入展示区。`, { jobId: id, artifactId }) }), 3900),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [id, attempt, title, artifactId, dispatch]);
  return null;
}
interface AgentNotice { id: string; title: string; text: string; kind: 'running' | 'completed' | 'todo' | 'reply'; artifactId?: string; collectionId?: string }
const initialNotices: AgentNotice[] = [
  { id: 'risk-followup', title: '风险事项待确认', text: '两项供应链风险还需要核验。请确认交付节点与资料补充安排。', kind: 'todo', artifactId: 'risk-dashboard', collectionId: 'project:p_risk' },
  { id: 'data-ready', title: '数据质量巡检报告', text: '巡检报告与数据资产关系已整理，可以一起查看。', kind: 'completed', artifactId: 'data-report', collectionId: 'project:p_data_middle' },
  { id: 'brand-ready', title: '品牌升级提案', text: '品牌方案、演示稿与发布页已汇集在同一个项目中。', kind: 'completed', artifactId: 'brand-slides', collectionId: 'project:p_brand_contract' },
];

export default function UnifiedWorkspace() {
  const [state, dispatch] = useReducer(workspaceReducer, null, () => { try { return restoreWorkspace(localStorage.getItem(STORAGE_KEY)); } catch { return restoreWorkspace(null); } });
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [homeResourceId, setHomeResourceId] = useState<HomeResourceId | null>(null);
  const [workOpen, setWorkOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sources, setSources] = useState<InputSource[]>(restoreSources);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [projectScopeId, setProjectScopeId] = useState<string | null>(null);
  const [projectBoardOpen, setProjectBoardOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeNotice, setActiveNotice] = useState<AgentNotice | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [modelId, setModelId] = useState<ComposerModelId>(() => { try { return restoreComposerModel(localStorage.getItem(COMPOSER_MODEL_STORAGE_KEY)); } catch { return DEFAULT_COMPOSER_MODEL_ID; } });
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const workTrigger = useRef<HTMLButtonElement>(null);
  const taskDispatchMotion = useTaskDispatchMotion({ composerRef, taskRef: workTrigger });
  const displayedTaskCount = Math.max(0, state.jobs.length - taskDispatchMotion.pendingTaskCount);
  const dismissWork = useCallback(() => setWorkOpen(false), []);
  const changeModel = (id: ComposerModelId) => {
    setModelId(id);
    try { localStorage.setItem(COMPOSER_MODEL_STORAGE_KEY, id); } catch { setStorageUnavailable(true); }
  };
  const allArtifacts = useMemo(() => [...state.jobs.filter(j => j.status === 'completed').map(jobArtifact).reverse(), ...agentosArtifacts], [state.jobs]);
  const collections = useMemo<SessionCollection[]>(() => [
    ...state.jobs.slice().reverse().map(job => ({ id: `session:${job.id}`, title: job.title, projectId: job.projectId, job,
      requests: state.messages.filter(item => item.role === 'user' && (item.jobId === job.id || (!item.jobId && item.text === job.request))),
      artifacts: [jobArtifact(job), ...agentosArtifacts.filter(a => a.projectId === job.projectId && a.type !== jobArtifact(job).type).slice(0, 2)] })),
    ...agentosProjects.map(project => ({ id: `project:${project.id}`, title: project.name, projectId: project.id, artifacts: agentosArtifacts.filter(a => a.projectId === project.id) })),
  ], [state.jobs, state.messages]);
  const scopedProject = agentosProjects.find(project => project.id === projectScopeId);
  const boardTasks = useMemo(() => scopedProject ? projectBoardTasks(scopedProject.id, state.jobs, state.messages, agentosArtifacts) : [], [scopedProject, state.jobs, state.messages]);
  const canvasCollections = projectScopeId ? collections.filter(collection => normalizeProjectId(collection.projectId) === projectScopeId) : collections;
  const displayedCollection = canvasCollections.find(collection => collection.id === selectedCollectionId && collection.artifacts.some(artifact => artifact.id === state.selectedId))
    ?? canvasCollections.find(collection => collection.id.startsWith('project:') && collection.artifacts.some(artifact => artifact.id === state.selectedId))
    ?? canvasCollections.find(collection => collection.artifacts.some(artifact => artifact.id === state.selectedId))
    ?? canvasCollections.find(collection => collection.artifacts.length);
  const displayedArtifact = displayedCollection?.artifacts.find(artifact => artifact.id === state.selectedId) ?? displayedCollection?.artifacts[0];
  const displayedJob = displayedCollection?.job;
  const displayedProject = scopedProject ?? agentosProjects.find(project => project.id === normalizeProjectId(displayedJob?.projectId ?? displayedArtifact?.projectId));
  const displayedTaskName = displayedJob?.title ?? displayedArtifact?.taskTitle;
  const context = allArtifacts.find(a => a.id === state.contextId);
  const runningJobs = state.jobs.filter(j => j.status === 'running');
  const projectActivities = useMemo(() => Object.fromEntries(agentosProjects.map(project => [project.id, projectActivity(project.id, state.jobs, agentosArtifacts)])), [state.jobs]);
  const notices = useMemo<AgentNotice[]>(() => [
    ...state.messages.filter(m => m.role === 'assistant' && !m.jobId).slice(-2).reverse().map(m => ({ id: m.id, title: 'OrgAgent 回复', text: m.text, kind: 'reply' as const })),
    ...state.jobs.slice().reverse().map(job => ({ id: job.id, title: job.title, text: job.status === 'running' ? phases[Math.min(job.phase, 2)] : job.status === 'completed' ? `「${job.title}」已完成，可以查看全部成果。` : '工作已保留，等待继续。', kind: job.status === 'running' ? 'running' as const : job.status === 'completed' ? 'completed' as const : 'todo' as const, artifactId: job.artifactId, collectionId: `session:${job.id}` })),
    ...initialNotices,
  ], [state.messages, state.jobs]);
  const currentNotice = notices.find(notice => notice.id === activeNotice?.id) ?? activeNotice;
  const visibleNotice = currentNotice?.artifactId ? null : currentNotice;
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: 1 })); } catch { const timer = window.setTimeout(() => setStorageUnavailable(true), 0); return () => clearTimeout(timer); } }, [state]);
  useEffect(() => { try { localStorage.setItem(SOURCE_KEY, JSON.stringify(sources)); } catch { const timer = window.setTimeout(() => setStorageUnavailable(true), 0); return () => clearTimeout(timer); } }, [sources]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSourcesOpen(false); setAccountOpen(false); setActiveNotice(null); if (workOpen) { setWorkOpen(false); workTrigger.current?.focus(); } }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setWorkOpen(v => !v); setAccountOpen(false); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [workOpen]);
  const openArtifact = useCallback((id: string, collectionId?: string) => {
    dispatch({ type: 'select', id }); setDashboardOpen(false); setProjectBoardOpen(false); setAccountOpen(false); setSourcesOpen(false); setActiveNotice(null);
    const job = state.jobs.find(j => j.artifactId === id);
    const artifact = agentosArtifacts.find(a => a.id === id);
    const projectId = normalizeProjectId(job?.projectId ?? artifact?.projectId);
    setProjectScopeId(current => current && current !== projectId ? null : current);
    setSelectedCollectionId(collectionId ?? (job ? `session:${job.id}` : artifact ? `project:${artifact.projectId}` : null));
  }, [state.jobs]);
  const openProject = (projectId: string) => {
    setProjectBoardOpen(true);
    setProjectScopeId(projectId); setDashboardOpen(false); setWorkOpen(false); setAccountOpen(false); setSourcesOpen(false); setActiveNotice(null);
    if (context) dispatch({ type: 'context', id: null });
  };
  const cancelJob = (job: WorkerJob) => dispatch({ type: 'cancel', id: job.id, message: message(`已停止「${job.title}」，任务记录和已有成果已保留。`) });
  const resumeJob = (job: WorkerJob) => dispatch({ type: 'resume', id: job.id, message: message(`继续处理「${job.title}」。`, { jobId: job.id }) });
  const send = (preset?: string, source?: InputSource) => {
    if (source && !sources.some(item => item.id === source.id && item.enabled)) return;
    const text = (preset ?? state.draft).trim();
    if (!text && !attachments.length) return;
    setDashboardOpen(false); setSourcesOpen(false); setActiveNotice(null);
    const input = text || '请帮我整理这些资料';
    const userMessage = message(`${input}${!source && attachments.length ? `\n附件：${attachments.map(f => f.name).join('、')}` : ''}`, { role: 'user', sourceName: source?.name, sourceKind: source?.kind });
    if (!source && /^(你好|hi|hello|你是谁|你能做什么)[？?！!。\s]*$/i.test(input)) {
      const reply = message('我是 OrgAgent。告诉我一个目标，我会安排工作，并把进展与成果带回这里。“任务”里会保存你发出的任务，H 打开你的工作台。');
      dispatch({ type: 'message', message: userMessage }); dispatch({ type: 'message', message: reply }); dispatch({ type: 'draft', text: '' }); setAttachments([]);
      setActiveNotice({ id: reply.id, title: 'OrgAgent', text: reply.text, kind: 'reply' }); return;
    }
    if (!source && /^(查看|看看|现在|我的|帮我查看|有哪些).*(任务|进度|在做)/.test(input)) {
      const reply = message(`目前有 ${runningJobs.length} 项工作进行中，${state.jobs.filter(j => j.status === 'completed').length} 项已完成。点击“任务”可以查看你提交的任务，H 工作台可以查看整体进度。`);
      dispatch({ type: 'message', message: userMessage }); dispatch({ type: 'message', message: reply }); dispatch({ type: 'draft', text: '' }); setAttachments([]); setWorkOpen(true);
      setActiveNotice({ id: reply.id, title: '任务进展', text: reply.text, kind: 'reply' }); return;
    }
    if (!source && /^(停止|取消|暂停)/.test(input)) {
      dispatch({ type: 'message', message: userMessage });
      const named = runningJobs.filter(j => input.includes(j.title) || input.includes(j.request));
      const all = /^(停止|取消|暂停)(全部|所有)(任务|工作)[。！!，,\s]*$/.test(input);
      const generic = /^(停止|取消|暂停)(一下)?(这个|当前|这项)?(任务|工作)?[。！!，,\s]*$/.test(input);
      const candidates = projectBoardOpen ? runningJobs.filter(job => job.projectId === projectScopeId) : runningJobs;
      const selected = projectBoardOpen ? undefined : candidates.find(job => selectedCollectionId === `session:${job.id}`) ?? candidates.find(job => job.artifactId === state.selectedId);
      const target = named.length === 1 ? named[0] : generic ? selected ?? (candidates.length === 1 ? candidates[0] : undefined) : undefined;
      if (all && runningJobs.length) runningJobs.forEach(cancelJob); else if (target) cancelJob(target);
      else { const reply = message(runningJobs.length ? '请告诉我完整的任务名称，或在“任务”中停止对应工作。' : '目前没有正在执行的任务。'); dispatch({ type: 'message', message: reply }); setActiveNotice({ id: reply.id, title: 'OrgAgent', text: reply.text, kind: 'reply' }); }
      dispatch({ type: 'draft', text: '' }); setAttachments([]); return;
    }
    const continuingJob = !source && !dashboardOpen && !projectBoardOpen && isTaskContinuation(input, displayedJob) ? displayedJob : undefined;
    if (continuingJob) {
      const note = message('补充要求已加入当前任务，会结合前面的消息一起处理。', { jobId: continuingJob.id });
      if (preset === undefined) taskDispatchMotion.launch(false);
      dispatch({ type: 'follow-up', id: continuingJob.id, text: input, messages: [{ ...userMessage, jobId: continuingJob.id }, note] });
      dispatch({ type: 'select', id: continuingJob.artifactId });
      setSelectedCollectionId(`session:${continuingJob.id}`); setAttachments([]);
      return;
    }
    const base = chooseArtifact(input, source ? undefined : context);
    const id = crypto.randomUUID();
    const title = !source && context ? `${context.title.replace(/（修订）$/, '')}（修订）`
      : artifactTitle(input.replace(/^(?:新任务|另外一个任务|另一个任务)[：:\s]*/, ''), base.type);
    const job: WorkerJob = { id, request: input, title, modelId, baseId: agentosArtifacts.find(a => a.id === base.id)?.id ?? state.jobs.find(j => j.artifactId === base.id)?.baseId ?? agentosArtifacts[0].id,
      artifactId: `result-${id}`, projectId: !source && context ? normalizeProjectId(context.projectId) : projectScopeId ?? DEFAULT_PROJECT_ID, status: 'running', phase: 0, attempt: 1,
      sourceId: source?.id, sourceName: source?.name, sourceKind: source?.kind };
    const note = !source && attachments.length ? '本次预览保留附件名称，文件解析尚未接入。' : '';
    const startMessage = message(`${source ? `已从「${source.name}」导入这条示例需求。` : ''}正在整理${artifactTypeLabels[base.type]}，进展会出现在消息区域。${note}`, { jobId: id });
    if (!source && preset === undefined) taskDispatchMotion.launch(true);
    dispatch({ type: 'start', job, messages: [{ ...userMessage, jobId: id }, startMessage] });
    setProjectBoardOpen(false);
    dispatch({ type: 'select', id: job.artifactId }); setSelectedCollectionId(`session:${id}`);
    if (!source) setAttachments([]);
    else { dispatch({ type: 'draft', text: state.draft }); dispatch({ type: 'context', id: state.contextId }); }
  };
  const openDashboard = () => { setDashboardOpen(true); setHomeResourceId(null); setProjectBoardOpen(false); setProjectScopeId(null); setWorkOpen(false); setActiveNotice(null); setSourcesOpen(false); setAccountOpen(false); };
  const loadDemoWork = () => {
    if (!selectedCollectionId && state.selectedId) {
      const selectedJob = state.jobs.find(job => job.artifactId === state.selectedId);
      const selectedArtifact = agentosArtifacts.find(artifact => artifact.id === state.selectedId);
      setSelectedCollectionId(selectedJob ? `session:${selectedJob.id}` : selectedArtifact ? `project:${selectedArtifact.projectId}` : null);
    }
    dispatch({ type: 'seed-demo', jobs: demoWorkJobs, messages: demoWorkMessages });
    setDashboardOpen(false); setWorkOpen(true); setAccountOpen(false); setActiveNotice(null);
  };
  const composer = <WorkspaceComposer dock value={state.draft} onChange={text => dispatch({ type: 'draft', text })} onSend={() => send()} context={context} onClearContext={() => dispatch({ type: 'context', id: null })} attachments={attachments} onAttachments={setAttachments} inputRef={composerRef} modelId={modelId} onModelChange={changeModel} />;
  return <div className={`aos-shell aos-shell--experience${dashboardOpen ? ' aos-shell--home' : ''}`} style={{ '--aos-project-count': agentosProjects.length } as CSSProperties}>
    {runningJobs.filter(job => !job.demo).map(job => <DemoWorker key={`${job.id}-${job.attempt}`} job={job} dispatch={dispatch} />)}
    <header className="aos-header"><div className="aos-header-identity"><button type="button" className={`aos-brand${workOpen || dashboardOpen ? ' aos-brand--labeled' : ''}`} aria-label="返回工作台" title="返回工作台" onClick={openDashboard}><Hexagon size={22} fill="currentColor" strokeWidth={1.5} /><span>AgentOS<span className="aos-brand-dot">.</span></span></button>{!dashboardOpen && (displayedTaskName || scopedProject) ? <div className="aos-task-location" aria-label="当前项目与任务"><span>{displayedProject?.name ?? '默认项目'}</span>{!projectBoardOpen && displayedTaskName ? <><span aria-hidden="true">｜</span><strong title={displayedTaskName}>{displayedTaskName}</strong></> : null}</div> : null}</div><button type="button" className="aos-avatar" aria-label="账户与工作空间" aria-expanded={accountOpen} onClick={() => setAccountOpen(v => !v)}>S</button></header>
    {dashboardOpen
      ? <HomeResourceRail selectedId={homeResourceId} onSelect={setHomeResourceId} />
      : <ProjectRail projects={agentosProjects} selectedId={displayedProject?.id} activity={projectActivities} onSelect={openProject} />}
    {accountOpen ? <><button className="aos-popover-dismiss" aria-label="关闭账户菜单" onClick={() => setAccountOpen(false)} /><div className="aos-header-popover aos-header-popover--account"><div className="aos-account-name"><span className="aos-avatar">S</span><div><strong>samhar</strong><span>你的 AgentOS 工作空间</span></div></div><button type="button" className="aos-account-navigation" onClick={openDashboard}>我的工作台 <span>H</span></button><button type="button" className="aos-account-navigation" onClick={() => { setWorkOpen(true); setAccountOpen(false); }}>任务记录 <kbd>⌘K / Ctrl K</kbd></button><button type="button" className="aos-account-navigation" onClick={loadDemoWork}>添加示例任务 <span>多来源 · 三种状态</span></button><p>交互演示 · 来源配置与任务保存在本地，执行服务尚未接入。</p><a href="?view=legacy">查看原版界面 <ArrowUpRight size={14} /></a>{confirmReset ? <div className="aos-reset-confirm"><p>清空演示对话与任务？来源配置会保留。</p><button type="button" onClick={() => { dispatch({ type: 'reset' }); openDashboard(); setConfirmReset(false); setAttachments([]); setSelectedCollectionId(null); }}>确认重置演示</button><button type="button" onClick={() => setConfirmReset(false)}>保留</button></div> : <button type="button" className="aos-reset-button" onClick={() => setConfirmReset(true)}>重置交互演示</button>}</div></> : null}
    <div className="aos-experience"><div className="aos-display-layout">
        {workOpen ? <WorkRecords messages={state.messages} jobs={state.jobs} onOpen={id => openArtifact(id)} onCancel={cancelJob} onResume={resumeJob} triggerRef={workTrigger} onDismiss={dismissWork} /> : null}
        <main className="aos-display-frame" aria-label={dashboardOpen ? homeResourceId ? '资源展示区' : '用户工作台展示区' : projectBoardOpen ? '项目任务展示区' : '任务成果展示区'}>
          {dashboardOpen ? homeResourceId
            ? <HomeResourcePage key={homeResourceId} resourceId={homeResourceId} artifacts={allArtifacts} jobs={state.jobs} onOpenArtifact={id => openArtifact(id)} onBack={openDashboard} />
            : <UserHomeDashboard artifacts={allArtifacts} jobs={state.jobs} sourceCount={sources.filter(s => s.enabled).length} onOpenArtifact={id => openArtifact(id)} onOpenProject={openProject} />
            : projectBoardOpen && scopedProject ? <ProjectBoard project={scopedProject} tasks={boardTasks} onOpenTask={task => openArtifact(task.artifactId, task.jobId ? `session:${task.jobId}` : `project:${scopedProject.id}`)} />
              : <SessionCanvas collections={canvasCollections} selectedId={state.selectedId} selectedCollectionId={selectedCollectionId} onSelect={openArtifact} onResume={resumeJob} />}
        </main>
      </div>
        <section className="aos-message-zone" aria-label="任务消息区域"><button ref={workTrigger} type="button" className={`aos-work-toggle${workOpen ? ' is-active' : ''}`} aria-label="任务记录" aria-expanded={workOpen} onClick={() => setWorkOpen(v => !v)}>任务 <span className="aos-task-count" aria-live="polite" aria-atomic="true">{displayedTaskCount}</span></button><span className="aos-message-divider" /><div className="aos-agent-updates" aria-label="Agent 进展与推送">{notices.map(notice => <button type="button" key={notice.id} className={`aos-agent-update aos-agent-update--${notice.kind}${(notice.artifactId ? !dashboardOpen && !projectBoardOpen && (displayedJob ? displayedJob.id === notice.id : state.selectedId === notice.artifactId) : activeNotice?.id === notice.id) ? ' is-current' : ''}`} onClick={() => { if (notice.artifactId) openArtifact(notice.artifactId, notice.collectionId); else setActiveNotice(v => v?.id === notice.id ? null : notice); }} aria-label={`${notice.kind === 'running' ? '进行中' : notice.kind === 'completed' ? '已完成' : notice.kind === 'todo' ? '待处理' : 'Agent 回复'}：${notice.title}`}><span className="aos-update-dot" />{notice.title}<small>{notice.kind === 'running' ? '进行中' : notice.kind === 'completed' ? '已完成' : notice.kind === 'todo' ? '待处理' : '回复'}</small></button>)}</div>
        {visibleNotice ? <article className="aos-notice-popover" aria-label="Agent 消息详情"><header><strong>{visibleNotice.title}</strong><button type="button" className="aos-icon-button" aria-label="关闭 Agent 消息" onClick={() => setActiveNotice(null)}><X size={14} /></button></header><p>{visibleNotice.text}</p><span>{visibleNotice.kind === 'running' ? '正在推进' : visibleNotice.kind === 'todo' ? '需要你的关注' : '来自 OrgAgent'}</span></article> : null}</section>
        <section className="aos-workspace-dock" aria-label="输入来源区域"><button type="button" className={`aos-home-button${dashboardOpen ? ' is-active' : ''}`} aria-label="H 我的工作台" title="我的工作台" onClick={openDashboard}>H</button>{composer}<InputSources sources={sources} onChange={setSources} onImport={(source, request) => send(request, source)} open={sourcesOpen} onOpenChange={setSourcesOpen} /></section>
      </div>
    {taskDispatchMotion.overlay}
    {storageUnavailable ? <div className="aos-storage-note" role="status">浏览器暂时无法保存记录，本次交互仍可继续。</div> : null}
  </div>;
}
