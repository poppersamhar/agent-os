import type { Project } from '../../data/agentosArtifacts';
import type { ProjectActivity } from './projectActivity';
import './ProjectRail.css';

interface ProjectRailProps {
  projects: Project[];
  selectedId?: string | null;
  activity: Record<string, ProjectActivity>;
  onSelect: (projectId: string) => void;
}

const statusLabels: Record<ProjectActivity, string> = { idle: '暂无运行任务', running: '任务正在运行', completed: '任务已全部完成', attention: '有任务等待处理' };

export default function ProjectRail({ projects, selectedId, activity, onSelect }: ProjectRailProps) {
  if (!projects.length) return null;
  return <nav className="aos-project-rail" aria-label="项目导航">
    {projects.map(project => {
      const status = activity[project.id] ?? 'idle';
      return <button type="button" key={project.id} className="aos-project-shortcut"
        aria-label={`打开项目：${project.name}`} aria-description={statusLabels[status]} aria-current={selectedId === project.id ? 'true' : undefined}
        data-status={status}
        onClick={() => onSelect(project.id)}>
        <span className="aos-project-status-ring" aria-hidden="true" />
        <span className="aos-project-shortcut-name" aria-hidden="true">{project.name}</span>
      </button>;
    })}
  </nav>;
}
