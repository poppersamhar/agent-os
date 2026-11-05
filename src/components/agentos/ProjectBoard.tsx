import { GitBranch, MessageCircle, UserRound } from 'lucide-react';
import type { Project } from '../../data/agentosArtifacts';
import type { ProjectBoardTask } from './projectBoardModel';
import './ProjectBoard.css';

interface ProjectBoardProps {
  project: Project;
  tasks: ProjectBoardTask[];
  onOpenTask: (task: ProjectBoardTask) => void;
}

const columns = [
  { id: 'pending', label: '待确认', empty: '暂无待确认任务' },
  { id: 'running', label: '进行中', empty: '暂无进行中的任务' },
  { id: 'completed', label: '已完成', empty: '暂无已完成任务' },
] as const;

function TaskSource({ task }: { task: ProjectBoardTask }) {
  const Icon = task.sourceKind === 'github' ? GitBranch : task.sourceKind ? MessageCircle : UserRound;
  const sourceLabel = task.sourceKind === 'feishu' ? '飞书' : task.sourceKind === 'github' ? 'GitHub' : task.sourceKind === 'im' ? '群聊' : '';
  const label = sourceLabel && task.sourceName !== sourceLabel ? `${sourceLabel} · ${task.sourceName}` : task.sourceName;
  return <span className="aos-project-board-task-source" title={label}>
    {task.sourceKind === 'feishu' ? <img src="/source-icons/feishu.png" alt="" /> : <Icon size={11} strokeWidth={1.5} aria-hidden="true" />}
    <span>{label}</span>
  </span>;
}

export default function ProjectBoard({ project, tasks, onOpenTask }: ProjectBoardProps) {
  return <section className="aos-project-board" aria-label={`${project.name}项目看板`}>
    <header className="aos-project-board-heading">
      <div><h1>{project.name}</h1><p>{project.description}</p></div>
      <span>{tasks.length} 项任务</span>
    </header>
    <div className="aos-project-board-columns-scroll" role="region" aria-label="项目任务状态看板" tabIndex={0}>
      <div className="aos-project-board-columns">
        {columns.map(column => {
          const related = tasks.filter(task => task.column === column.id);
          return <section className={`aos-project-board-column aos-project-board-column--${column.id}`} key={column.id} aria-label={`${column.label}，${related.length}项任务`}>
            <header><h2><span className="aos-project-board-state-dot" aria-hidden="true" />{column.label}</h2><span>{related.length}</span></header>
            <div className="aos-project-board-task-list" role="list" aria-label={`${column.label}任务列表`} tabIndex={0}>
              {related.length ? related.map(task => <div role="listitem" key={task.id}>
                <button type="button" className="aos-project-board-task" aria-label={`打开任务：${task.title}`} onClick={() => onOpenTask(task)}>
                  <strong>{task.title}</strong>
                  <span className="aos-project-board-task-summary">{task.summary}</span>
                  <span className="aos-project-board-task-meta"><TaskSource task={task} />{task.time ? <time>{task.time}</time> : null}</span>
                  <span className="aos-project-board-task-footer"><span>{task.statusLabel}</span><span>{task.messageCount ? `${task.messageCount} 条消息` : task.artifactCount ? `${task.artifactCount} 份成果` : ''}</span></span>
                </button>
              </div>) : <div className="aos-project-board-empty"><span className="aos-project-board-empty-circle" aria-hidden="true" /><p>{column.empty}</p></div>}
            </div>
          </section>;
        })}
      </div>
    </div>
  </section>;
}
