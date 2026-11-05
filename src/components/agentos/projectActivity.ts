import { normalizeProjectId, type Artifact } from '../../data/agentosArtifacts';
import type { WorkerJob } from './workspaceModel';

export type ProjectActivity = 'idle' | 'running' | 'completed' | 'attention';

export function projectActivity(projectId: string, jobs: WorkerJob[], artifacts: Artifact[]): ProjectActivity {
  const tasks = new Map<string, ProjectActivity>();
  artifacts.filter(artifact => normalizeProjectId(artifact.projectId) === projectId).forEach(artifact => {
    const status = artifact.status === 'ready' ? 'completed' : artifact.status === 'updating' ? 'running' : 'idle';
    // A task with an unfinished file is not complete even if its other files are ready.
    const previous = tasks.get(artifact.taskId);
    if (previous !== 'running' && !(previous === 'idle' && status === 'completed')) tasks.set(artifact.taskId, status);
  });
  jobs.filter(job => normalizeProjectId(job.projectId) === projectId).forEach(job => {
    tasks.set(job.id, job.status === 'running' ? 'running' : job.status === 'completed' ? 'completed' : 'attention');
  });
  const statuses = [...tasks.values()];
  if (statuses.includes('running')) return 'running';
  if (statuses.includes('attention')) return 'attention';
  return statuses.length && statuses.every(status => status === 'completed') ? 'completed' : 'idle';
}
