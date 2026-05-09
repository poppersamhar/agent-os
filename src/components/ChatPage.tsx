import { useState } from 'react';
import {
  MessageSquare, Plus, ChevronDown, ChevronRight,
  Clock, Search, FolderOpen,
} from 'lucide-react';
import type { Project, Chat } from '../data/mockData';
import type { ViewType } from '../App';

interface ChatPageProps {
  projects: Project[];
  onNavigate: (view: ViewType, projectId?: string, taskId?: string) => void;
  onCreateTask: (projectId: string, name: string) => void;
}

/* ─── 新建任务 Modal ─── */
function CreateTaskModal({
  projects,
  onCancel,
  onCreate,
}: {
  projects: Project[];
  onCancel: () => void;
  onCreate: (projectId: string, name: string) => void;
}) {
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id || '');
  const [taskName, setTaskName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-border-light shadow-xl w-[420px] p-5">
        <h3 className="text-sm font-semibold text-text mb-4">新建任务</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-text-muted mb-1 block">所属项目</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-bg rounded-xl border border-border-light text-[13px] text-text outline-none focus:border-primary/30"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-text-muted mb-1 block">任务名称</label>
            <input
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder="输入任务名称..."
              className="w-full px-3 py-2 bg-bg rounded-xl border border-border-light text-[13px] text-text outline-none focus:border-primary/30"
              onKeyDown={e => {
                if (e.key === 'Enter' && taskName.trim()) {
                  onCreate(selectedProject, taskName.trim());
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-border-light text-[12px] text-text-secondary hover:bg-bg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (taskName.trim()) onCreate(selectedProject, taskName.trim());
            }}
            disabled={!taskName.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-white text-[12px] hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 对话列表项 ─── */
function ChatListItem({ chat, project, onClick }: {
  chat: Chat;
  project: Project;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/5 transition-colors group"
    >
      <div className="w-9 h-9 rounded-xl bg-primary-subtle flex items-center justify-center shrink-0">
        <MessageSquare className="w-4 h-4 text-primary-dark" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-text truncate">{chat.name}</div>
        <div className="text-[11px] text-text-muted truncate">
          {project.name}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-text-muted shrink-0">
        <Clock className="w-3 h-3" strokeWidth={1.5} />
        {chat.messages.length > 0 ? '进行中' : '新对话'}
      </div>
    </button>
  );
}

/* ─── 项目分组 ─── */
function ProjectChatGroup({
  project,
  isExpanded,
  onToggle,
  onChatClick,
}: {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
  onChatClick: (chatId: string) => void;
}) {
  return (
    <div className="mb-1">
      {/* 项目标题（可折叠） */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left hover:bg-primary/5 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
        )}
        <FolderOpen className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
        <span className="text-[13px] font-medium text-text flex-1 truncate">{project.name}</span>
        <span className="text-[11px] text-text-muted bg-bg px-2 py-0.5 rounded-full">
          {project.chats.length}
        </span>
      </button>

      {/* 展开后的对话列表 */}
      {isExpanded && (
        <div className="ml-6 pl-3 border-l border-border-light space-y-0.5 mt-1">
          {project.chats.map(chat => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              project={project}
              onClick={() => onChatClick(chat.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 主组件 ─── */
export default function ChatPage({ projects, onNavigate, onCreateTask }: ChatPageProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleProject = (pid: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleChatClick = (projectId: string, chatId: string) => {
    onNavigate('task', projectId, chatId);
  };

  const handleCreateTask = (projectId: string, name: string) => {
    onCreateTask(projectId, name);
    setShowCreateModal(false);
  };

  // 过滤项目
  const filteredProjects = searchQuery.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.chats.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : projects;

  // 总对话数
  const totalChats = projects.reduce((sum, p) => sum + p.chats.length, 0);

  return (
    <div className="h-full flex flex-col bg-main-bg">
      {/* ── 顶部操作栏 ── */}
      <div className="shrink-0 px-6 py-4 border-b border-border-light bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold text-text tracking-tight">对话</h1>
            <p className="text-[11px] text-text-muted mt-0.5">
              {projects.length} 个项目 · {totalChats} 个对话
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[12px] font-medium hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            新建任务
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2 bg-bg rounded-xl px-3 py-2 border border-border-light">
          <Search className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索项目或对话..."
            className="flex-1 bg-transparent outline-none text-[13px] text-text placeholder:text-text-muted/60"
          />
        </div>
      </div>

      {/* ── 对话列表主体 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-10 h-10 text-text-muted/30 mb-3" strokeWidth={1.2} />
            <p className="text-sm text-text-secondary">暂无对话</p>
            <p className="text-[11px] text-text-muted mt-1">创建项目并新建任务后即可开始对话</p>
          </div>
        ) : (
          <div className="max-w-2xl">
            {filteredProjects.map(project => (
              <ProjectChatGroup
                key={project.id}
                project={project}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
                onChatClick={(chatId) => handleChatClick(project.id, chatId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 新建任务 Modal */}
      {showCreateModal && (
        <CreateTaskModal
          projects={projects}
          onCancel={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}
