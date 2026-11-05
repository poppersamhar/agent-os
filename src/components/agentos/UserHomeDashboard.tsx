import { useMemo } from 'react';
import { Activity, ArrowUpRight, ChevronRight, FileText, Globe, Layers3, Network, Plug, Presentation, type LucideIcon } from 'lucide-react';
import { artifactTypeLabels, type Artifact } from '../../data/agentosArtifacts';
import type { WorkerJob } from './workspaceModel';
import { buildHomeProjects } from './homeProjectModel';
import './UserHomeDashboard.css';

export interface UserHomeDashboardProps {
  artifacts: Artifact[];
  jobs: WorkerJob[];
  sourceCount: number;
  onOpenArtifact: (artifactId: string) => void;
  onOpenProject: (projectId: string) => void;
}

const artifactIcons: Record<Artifact['type'], LucideIcon> = { document: FileText, slides: Presentation, web: Globe, graph: Network };

export default function UserHomeDashboard({ artifacts, jobs, sourceCount, onOpenArtifact, onOpenProject }: UserHomeDashboardProps) {
  const readableArtifacts = useMemo(() => artifacts.filter(artifact => {
    const job = jobs.find(item => item.artifactId === artifact.id);
    return !job || job.status === 'completed';
  }), [artifacts, jobs]);
  const taskIds = new Set([...artifacts.map(artifact => artifact.taskId), ...jobs.map(job => job.id)]);
  const running = jobs.filter(job => job.status === 'running').length;
  const waiting = jobs.filter(job => job.status === 'paused' || job.status === 'cancelled').length;
  const projects = useMemo(() => buildHomeProjects(artifacts, jobs), [artifacts, jobs]);

  return <section className="aos-user-home aos-user-home--overview" aria-label="用户工作台">
    <div className="aos-home-metrics" aria-label="工作概况">
      {[
        { label: '任务总数', value: taskIds.size, note: '当前工作空间', icon: Layers3 },
        { label: '正在推进', value: running, note: waiting ? `${waiting} 项待继续` : '后台任务', icon: Activity },
        { label: '工作成果', value: readableArtifacts.length, note: '可直接查看', icon: FileText },
        { label: '输入来源', value: sourceCount, note: '已添加的来源', icon: Plug },
      ].map(item => <div className="aos-home-metric" key={item.label}><div><span>{item.label}</span><item.icon size={15} strokeWidth={1.5} /></div><strong>{item.value}<span>{item.note}</span></strong></div>)}
    </div>
    <div className="aos-home-overview">
      <section className="aos-home-panel"><header><div><Activity size={15} /><h2>项目与任务进度</h2></div><span>{projects.length} 个项目</span></header>
        <div className="aos-home-projects">{projects.map(project => <button type="button" className="aos-home-project" key={project.id} onClick={() => onOpenProject(project.id)}>
          <div><strong>{project.name}</strong><span>{project.active ? `${project.active} 项进行中` : project.total ? `${project.completed} / ${project.total} 项已完成` : '等待开始'}</span></div>
          <div className="aos-home-progress"><span style={{ width: `${project.percent}%` }} /></div><div><span>{project.description}</span><span>{project.percent}%<ChevronRight size={12} /></span></div>
        </button>)}</div>
      </section>
      <section className="aos-home-panel"><header><div><FileText size={15} /><h2>最近成果</h2></div><span>{readableArtifacts.length} 份成果</span></header><div className="aos-home-recent">
        {readableArtifacts.slice(0, 5).map(artifact => { const Icon = artifactIcons[artifact.type]; return <button type="button" key={artifact.id} onClick={() => onOpenArtifact(artifact.id)}><span className="aos-home-result-icon"><Icon size={16} strokeWidth={1.5} /></span><span><strong>{artifact.title}</strong><span>{artifactTypeLabels[artifact.type]} · {artifact.updatedAt}</span></span><ArrowUpRight size={13} /></button>; })}
        {!readableArtifacts.length ? <p className="aos-home-empty">工作成果会在这里汇集。</p> : null}
      </div></section>
    </div>
  </section>;
}
