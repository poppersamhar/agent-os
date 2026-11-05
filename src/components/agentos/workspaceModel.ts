import { agentosArtifacts, normalizeProjectId, type Artifact } from '../../data/agentosArtifacts';
import { isComposerModelId, type ComposerModelId } from './composerModels';

export { DEFAULT_PROJECT_ID, normalizeProjectId } from '../../data/agentosArtifacts';

export type WorkerStatus = 'running' | 'completed' | 'cancelled' | 'paused';
export interface WorkerJob {
  id: string;
  request: string;
  title: string;
  baseId: string;
  artifactId: string;
  projectId: string;
  status: WorkerStatus;
  phase: number;
  attempt: number;
  sourceId?: string;
  sourceName?: string;
  sourceKind?: 'feishu' | 'github' | 'im';
  modelId?: ComposerModelId;
  /** Keeps seeded preview tasks in their displayed state instead of auto-completing. */
  demo?: true;
}
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  jobId?: string;
  artifactId?: string;
  sourceName?: string;
  sourceKind?: 'feishu' | 'github' | 'im';
}
export interface WorkspaceState {
  messages: ConversationMessage[];
  jobs: WorkerJob[];
  selectedId: string | null;
  contextId: string | null;
  draft: string;
}
export type WorkspaceAction =
  | { type: 'reset' }
  | { type: 'seed-demo'; jobs: WorkerJob[]; messages: ConversationMessage[] }
  | { type: 'draft'; text: string }
  | { type: 'select'; id: string }
  | { type: 'context'; id: string | null }
  | { type: 'message'; message: ConversationMessage }
  | { type: 'start'; job: WorkerJob; messages: ConversationMessage[] }
  | { type: 'follow-up'; id: string; text: string; title?: string; messages: ConversationMessage[] }
  | { type: 'phase'; id: string; attempt: number; phase: number }
  | { type: 'complete'; id: string; attempt: number; message: ConversationMessage }
  | { type: 'cancel'; id: string; message: ConversationMessage }
  | { type: 'resume'; id: string; message: ConversationMessage };

export const STORAGE_KEY = 'agentos-unified-workspace-v1';
export const emptyWorkspace: WorkspaceState = { messages: [], jobs: [], selectedId: null, contextId: null, draft: '' };
const workerStates = new Set<WorkerStatus>(['running', 'completed', 'cancelled', 'paused']);
const validSource = (item: Record<string, unknown>) =>
  (item.sourceId === undefined || typeof item.sourceId === 'string')
  && (item.sourceName === undefined || typeof item.sourceName === 'string')
  && (item.sourceKind === undefined || ['feishu', 'github', 'im'].includes(String(item.sourceKind)));

function isMessage(value: unknown): value is ConversationMessage {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.text === 'string' && typeof item.time === 'string'
    && (item.role === 'user' || item.role === 'assistant')
    && (item.jobId === undefined || typeof item.jobId === 'string')
    && (item.artifactId === undefined || typeof item.artifactId === 'string') && validSource(item);
}
type RestorableWorkerJob = Omit<WorkerJob, 'modelId' | 'demo' | 'projectId'> & { modelId?: unknown; demo?: unknown; projectId?: unknown };

function isJob(value: unknown): value is RestorableWorkerJob {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['id', 'request', 'title', 'baseId', 'artifactId'].every(key => typeof item[key] === 'string')
    && workerStates.has(item.status as WorkerStatus) && typeof item.phase === 'number'
    && Number.isInteger(item.attempt) && Number(item.attempt) > 0
    && agentosArtifacts.some(artifact => artifact.id === item.baseId) && validSource(item);
}

export function restoreWorkspace(raw: string | null): WorkspaceState {
  if (!raw) return emptyWorkspace;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return emptyWorkspace;
    const saved = value as Record<string, unknown>;
    if (saved.version !== 1 || !Array.isArray(saved.messages) || !saved.messages.every(isMessage)
      || !Array.isArray(saved.jobs) || !saved.jobs.every(isJob)) return emptyWorkspace;
    const jobs = saved.jobs.map<WorkerJob>(job => {
      const { modelId, demo, ...rest } = job;
      return { ...rest, projectId: normalizeProjectId(job.projectId), status: job.status === 'running' && demo !== true ? 'paused' : job.status,
        ...(demo === true ? { demo: true as const } : {}),
        ...(isComposerModelId(modelId) ? { modelId } : {}) };
    });
    const selectedId = typeof saved.selectedId === 'string'
      && (agentosArtifacts.some(artifact => artifact.id === saved.selectedId) || jobs.some(job => job.artifactId === saved.selectedId))
      ? saved.selectedId : null;
    const contextId = typeof saved.contextId === 'string'
      && (agentosArtifacts.some(artifact => artifact.id === saved.contextId)
        || jobs.some(job => job.artifactId === saved.contextId && job.status === 'completed')) ? saved.contextId : null;
    return { messages: saved.messages, jobs, selectedId, contextId, draft: typeof saved.draft === 'string' ? saved.draft : '' };
  } catch { return emptyWorkspace; }
}

function ensureProject(job: WorkerJob): WorkerJob {
  const projectId = normalizeProjectId(job.projectId);
  return job.projectId === projectId ? job : { ...job, projectId };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'reset': return { ...emptyWorkspace };
    case 'seed-demo': {
      const jobIds = new Set(state.jobs.map(job => job.id));
      const messageIds = new Set(state.messages.map(message => message.id));
      const jobs = action.jobs.filter(job => !jobIds.has(job.id)).map(ensureProject);
      const messages = action.messages.filter(message => !messageIds.has(message.id));
      if (!jobs.length && !messages.length) return state;
      return { ...state, jobs: [...state.jobs, ...jobs], messages: [...messages, ...state.messages] };
    }
    case 'draft': return { ...state, draft: action.text };
    case 'select': return { ...state, selectedId: action.id };
    case 'context': return { ...state, contextId: action.id };
    case 'message': return { ...state, messages: [...state.messages, action.message] };
    case 'start': return { ...state, draft: '', contextId: null, jobs: [...state.jobs, ensureProject(action.job)],
      messages: [...state.messages, ...action.messages], selectedId: state.selectedId ?? action.job.artifactId };
    case 'follow-up': {
      const job = state.jobs.find(item => item.id === action.id);
      const text = action.text.trim();
      if (!job || !text) return state;
      const messages = state.messages.map(item => item.role === 'user' && !item.jobId && item.text === job.request
        ? { ...item, jobId: job.id } : item);
      // A new requirement starts a fresh attempt; completions from the previous attempt are stale.
      const updated: WorkerJob = { ...job, projectId: normalizeProjectId(job.projectId),
        request: `${job.request}\n\n${text}`, title: action.title?.trim() || job.title,
        status: 'running', phase: 0, attempt: job.attempt + 1 };
      // An explicitly edited sample now behaves like any new user request.
      delete updated.demo;
      return { ...state, draft: '', contextId: null, selectedId: job.artifactId,
        jobs: state.jobs.map(item => item.id === job.id ? updated : item),
        messages: [...messages, ...action.messages.map(item => ({ ...item, jobId: job.id }))] };
    }
    case 'phase': return { ...state, jobs: state.jobs.map(job => job.id === action.id && job.attempt === action.attempt
      && job.status === 'running' ? { ...job, phase: action.phase } : job) };
    case 'complete': {
      const job = state.jobs.find(item => item.id === action.id);
      if (!job || job.status !== 'running' || job.attempt !== action.attempt) return state;
      return { ...state, jobs: state.jobs.map(item => item.id === action.id ? { ...item, status: 'completed', phase: 3 } : item),
        messages: [...state.messages, action.message], selectedId: state.selectedId ?? job.artifactId };
    }
    case 'cancel': {
      if (!state.jobs.some(job => job.id === action.id && (job.status === 'running' || job.status === 'paused'))) return state;
      return { ...state, jobs: state.jobs.map(job => job.id === action.id ? { ...job, status: 'cancelled' } : job),
        messages: [...state.messages, action.message] };
    }
    case 'resume': {
      if (!state.jobs.some(job => job.id === action.id && (job.status === 'paused' || job.status === 'cancelled'))) return state;
      return { ...state, jobs: state.jobs.map(job => job.id === action.id
        ? { ...job, status: 'running', phase: 0, attempt: job.attempt + 1 } : job), messages: [...state.messages, action.message] };
    }
  }
}

export function jobArtifact(job: WorkerJob): Artifact {
  const base = agentosArtifacts.find(artifact => artifact.id === job.baseId) ?? agentosArtifacts[0];
  return { ...base, id: job.artifactId, title: job.title, taskId: job.id, taskTitle: job.title,
    projectId: normalizeProjectId(job.projectId), status: job.status === 'completed' ? 'ready' : 'draft',
    summary: job.request, updatedAt: '刚刚', version: `v${job.attempt}.0` };
}

export function chooseArtifact(request: string, context?: Artifact): Artifact {
  if (context) return context;
  const type = /ppt|演示|汇报|幻灯|路演/i.test(request) ? 'slides'
    : /网页|网站|落地页|介绍页|页面/.test(request) ? 'web'
      : /图谱|关系图|知识关联/.test(request) ? 'graph' : 'document';
  const projectId = /品牌|营销|合同/.test(request) ? 'p_brand_contract'
    : /数据|清洗|字段|建模/.test(request) ? 'p_data_middle' : /风控|供应链/.test(request) ? 'p_risk' : undefined;
  return agentosArtifacts.find(artifact => artifact.type === type && (!projectId || artifact.projectId === projectId))
    ?? agentosArtifacts.find(artifact => artifact.type === type) ?? agentosArtifacts[0];
}

export function artifactTitle(request: string, type: Artifact['type']): string {
  const title = request.replace(/^(请|帮我|帮忙|请帮我|麻烦|给我)[，,\s]*/, '')
    .replace(/^(做一份|生成一份|整理一份|制作一份|做一个|生成一个|生成|整理|制作|写一份|写一个)/, '').trim();
  return title.length > 25 ? `${title.slice(0, 25)}…` : title || ({ document: '工作方案', slides: '项目汇报演示稿', web: '产品介绍网页', graph: '项目知识图谱' })[type];
}
