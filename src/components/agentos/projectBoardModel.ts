import { normalizeProjectId, type Artifact } from '../../data/agentosArtifacts';
import type { ConversationMessage, WorkerJob, WorkerStatus } from './workspaceModel';

export type ProjectBoardColumnId = 'pending' | 'running' | 'completed';

export interface ProjectBoardTask {
  id: string;
  title: string;
  summary: string;
  artifactId: string;
  jobId?: string;
  column: ProjectBoardColumnId;
  statusLabel: string;
  sourceName: string;
  sourceKind?: 'feishu' | 'github' | 'im';
  time?: string;
  messageCount: number;
  artifactCount: number;
}

const workerColumns: Record<WorkerStatus, { column: ProjectBoardColumnId; statusLabel: string }> = {
  paused: { column: 'pending', statusLabel: '需要人工介入' },
  cancelled: { column: 'pending', statusLabel: '已停止' },
  running: { column: 'running', statusLabel: '正在处理' },
  completed: { column: 'completed', statusLabel: '已完成' },
};
const sourceLabels = { feishu: '飞书群聊', github: 'GitHub', im: '群聊消息' };
const staticPriority = { ready: 0, draft: 1, updating: 2 };

/** Builds project tasks from their own records, never from borrowed session previews. */
export function projectBoardTasks(
  projectId: string,
  jobs: WorkerJob[],
  messages: ConversationMessage[],
  artifacts: Artifact[],
): ProjectBoardTask[] {
  const ownerId = normalizeProjectId(projectId);
  const jobsById = new Map(jobs.map(job => [job.id, job]));
  const artifactsByTask = new Map<string, Map<string, Artifact>>();
  for (const artifact of artifacts) {
    const owner = jobsById.get(artifact.taskId);
    if (normalizeProjectId(owner?.projectId ?? artifact.projectId) !== ownerId) continue;
    let taskArtifacts = artifactsByTask.get(artifact.taskId);
    if (!taskArtifacts) {
      taskArtifacts = new Map();
      artifactsByTask.set(artifact.taskId, taskArtifacts);
    }
    taskArtifacts.set(artifact.id, artifact);
  }
  const requestsByTask = new Map<string, ConversationMessage[]>();
  for (const message of messages) {
    if (message.role !== 'user' || !message.jobId) continue;
    const requests = requestsByTask.get(message.jobId) ?? [];
    requests.push(message);
    requestsByTask.set(message.jobId, requests);
  }

  const tasks: ProjectBoardTask[] = [];
  for (const job of [...jobsById.values()].reverse()) {
    if (normalizeProjectId(job.projectId) !== ownerId) continue;
    const requests = requestsByTask.get(job.id) ?? [];
    const origin = requests[0];
    const sourceKind = job.sourceKind ?? origin?.sourceKind;
    const matchingOrigin = sourceKind && origin?.sourceKind !== sourceKind
      ? requests.find(request => request.sourceKind === sourceKind) : origin;
    const artifactIds = new Set(artifactsByTask.get(job.id)?.keys());
    if (job.status === 'completed') artifactIds.add(job.artifactId);
    tasks.push({
      id: job.id,
      title: job.title,
      summary: job.request,
      artifactId: job.artifactId,
      jobId: job.id,
      ...workerColumns[job.status],
      sourceName: job.sourceName || matchingOrigin?.sourceName || (sourceKind ? sourceLabels[sourceKind] : 'samhar'),
      ...(sourceKind ? { sourceKind } : {}),
      ...(origin?.time ? { time: origin.time } : {}),
      messageCount: requests.length,
      artifactCount: artifactIds.size,
    });
  }

  for (const [taskId, grouped] of artifactsByTask) {
    if (jobsById.has(taskId)) continue;
    const related = [...grouped.values()];
    const representative = related.reduce((selected, artifact) =>
      staticPriority[artifact.status] > staticPriority[selected.status] ? artifact : selected);
    const column = representative.status === 'updating' ? 'running' : representative.status === 'draft' ? 'pending' : 'completed';
    tasks.push({
      id: taskId,
      title: representative.taskTitle || representative.title,
      summary: representative.summary,
      artifactId: representative.id,
      column,
      statusLabel: column === 'running' ? '正在更新' : column === 'pending' ? '待确认' : '已完成',
      sourceName: '示例任务',
      time: representative.updatedAt,
      messageCount: 0,
      artifactCount: grouped.size,
    });
  }
  return tasks;
}
