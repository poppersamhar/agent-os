import { agentosProjects, normalizeProjectId, type Artifact, type Project } from '../../data/agentosArtifacts';
import type { WorkerJob } from './workspaceModel';

export interface HomeProjectSummary extends Project {
  artifacts: Artifact[];
  total: number;
  completed: number;
  active: number;
  percent: number;
}

export function buildHomeProjects(artifacts: Artifact[], jobs: WorkerJob[]): HomeProjectSummary[] {
  return agentosProjects.map(project => {
    const matches = (id: string) => normalizeProjectId(id) === project.id;
    const related = artifacts.filter(artifact => matches(artifact.projectId));
    const tasks = new Map(related.map(artifact => [artifact.taskId, artifact.status === 'ready' ? 'completed' : 'draft']));
    jobs.filter(job => matches(job.projectId)).forEach(job => tasks.set(job.id, job.status));
    const completed = [...tasks.values()].filter(status => status === 'completed').length;
    const active = [...tasks.values()].filter(status => status === 'running').length;
    return { ...project, artifacts: related, total: tasks.size, completed, active, percent: tasks.size ? Math.round(completed / tasks.size * 100) : 0 };
  });
}
