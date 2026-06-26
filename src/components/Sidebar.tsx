import { useState, useRef, useEffect } from 'react';
import {
  Home, Wrench, Plug, Plus, ChevronLeft,
  PanelLeft, UserCog, Users, TrendingUp, Settings, LogOut,
  Pin, MoreVertical, Pencil, Archive, BookOpen, GitBranch,
} from 'lucide-react';
import type { AccountType, ViewType } from '../App';
import type { Project, StandaloneTask } from '../data/mockData';
import ProjectWizard from './ProjectWizard';

interface SidebarProps {
  accountType: AccountType;
  activeView: ViewType;
  activeProjectId: string | null;
  activeTaskId: string | null;
  projectList: Project[];
  spaceResultProjectId?: string;
  standaloneTasks: StandaloneTask[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (view: ViewType, projectId?: string, taskId?: string) => void;
  onCreateProject: (name: string, description: string) => void;
  onCreateStandaloneTask: (name: string) => void;
  onLogout: () => void;
  onRenameTask: (taskId: string, newName: string) => void;
  onPinTask: (taskId: string, pinned: boolean) => void;
  onArchiveTask: (taskId: string) => void;
  onRenameProject?: (projectId: string, newName: string) => void;
  onPinProject?: (projectId: string, pinned: boolean) => void;
  onArchiveProject?: (projectId: string) => void;
}

export default function Sidebar({
  accountType,
  activeView,
  activeProjectId,
  activeTaskId,
  projectList,
  spaceResultProjectId,
  standaloneTasks,
  collapsed,
  onToggleCollapse,
  onNavigate,
  onCreateProject,
  onCreateStandaloneTask,
  onLogout,
  onRenameTask,
  onPinTask,
  onArchiveTask,
  onRenameProject,
  onPinProject,
  onArchiveProject,
}: SidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['p_risk']));
  const [expandedStandalone, setExpandedStandalone] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleProject = (pid: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  /* ─── 项目项操作菜单（三点） ─── */
  function ProjectItemMenu({
    projectId, isPinned, onStartRename,
  }: {
    projectId: string;
    isPinned: boolean;
    onStartRename: (projectId: string, currentName: string) => void;
  }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuId = `project-menu-${projectId}`;

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        const menu = document.getElementById(menuId);
        const btn = btnRef.current;
        const target = e.target as Node;
        if (btn && btn.contains(target)) return;
        if (menu && menu.contains(target)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [menuId]);

    const rect = btnRef.current?.getBoundingClientRect();
    const menuStyle: React.CSSProperties = rect
      ? { position: 'fixed', top: rect.bottom + 4, left: rect.left - 120, zIndex: 9999 }
      : {};

    return (
      <>
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="p-0.5 hover:bg-primary/10 rounded text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="更多操作"
        >
          <MoreVertical className="w-3 h-3" strokeWidth={1.5} />
        </button>
        {open && (
          <div id={menuId} style={menuStyle} className="w-36 bg-white rounded-xl border border-border-light shadow-lg py-1">
            <button
              onClick={(e) => { e.stopPropagation(); onPinProject?.(projectId, !isPinned); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-text-secondary hover:bg-bg transition-colors flex items-center gap-2"
            >
              <Pin className={`w-3 h-3 ${isPinned ? 'text-primary fill-primary' : ''}`} strokeWidth={1.5} />
              {isPinned ? '取消置顶' : '置顶'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const project = projectList.find(p => p.id === projectId);
                onStartRename(projectId, project?.name || '');
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[11px] text-text-secondary hover:bg-bg transition-colors flex items-center gap-2"
            >
              <Pencil className="w-3 h-3" strokeWidth={1.5} />
              重命名
            </button>
            <div className="mx-2 my-1 h-px bg-border-light" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要归档并删除这个项目吗？此操作不可撤销。')) {
                  onArchiveProject?.(projectId);
                }
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[11px] text-danger hover:bg-danger/5 transition-colors flex items-center gap-2"
            >
              <Archive className="w-3 h-3" strokeWidth={1.5} />
              归档删除
            </button>
          </div>
        )}
      </>
    );
  }

  /* ─── 任务项操作菜单（三点） ─── */
  function TaskItemMenu({
    taskId, isPinned,
  }: {
    taskId: string;
    isPinned: boolean;
  }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuId = `task-menu-${taskId}`;

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        const menu = document.getElementById(menuId);
        const btn = btnRef.current;
        const target = e.target as Node;
        if (btn && btn.contains(target)) return;
        if (menu && menu.contains(target)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [menuId]);

    const rect = btnRef.current?.getBoundingClientRect();
    const menuStyle: React.CSSProperties = rect
      ? { position: 'fixed', top: rect.bottom + 4, left: rect.left - 120, zIndex: 9999 }
      : {};

    return (
      <>
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="p-0.5 hover:bg-primary/10 rounded text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="更多操作"
        >
          <MoreVertical className="w-3 h-3" strokeWidth={1.5} />
        </button>
        {open && (
          <div id={menuId} style={menuStyle} className="w-36 bg-white rounded-xl border border-border-light shadow-lg py-1">
            <button
              onClick={(e) => { e.stopPropagation(); onPinTask(taskId, !isPinned); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-text-secondary hover:bg-bg transition-colors flex items-center gap-2"
            >
              <Pin className={`w-3 h-3 ${isPinned ? 'text-primary fill-primary' : ''}`} strokeWidth={1.5} />
              {isPinned ? '取消置顶' : '置顶'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newName = prompt('重命名会话', '');
                if (newName?.trim()) onRenameTask(taskId, newName.trim());
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[11px] text-text-secondary hover:bg-bg transition-colors flex items-center gap-2"
            >
              <Pencil className="w-3 h-3" strokeWidth={1.5} />
              重命名
            </button>
            <div className="mx-2 my-1 h-px bg-border-light" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要归档并删除这个会话吗？此操作不可撤销。')) {
                  onArchiveTask(taskId);
                }
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[11px] text-danger hover:bg-danger/5 transition-colors flex items-center gap-2"
            >
              <Archive className="w-3 h-3" strokeWidth={1.5} />
              归档删除
            </button>
          </div>
        )}
      </>
    );
  }

  const orgNav = [
    { key: 'home' as ViewType, label: '首页', icon: Home },
    { key: 'knowledge' as ViewType, label: '企业记忆库', icon: BookOpen },
    { key: 'skill' as ViewType, label: '技能市场', icon: Wrench },
    { key: 'connector' as ViewType, label: '连接器', icon: Plug },
  ];

  const collapsedNav = [
    ...orgNav,
    { key: 'project' as ViewType, label: '项目', icon: GitBranch },
  ];

  const adminNav = [
    { key: 'settings' as ViewType, label: '成员管理', icon: UserCog, external: 'https://agent-os-l4.vercel.app' },
    { key: 'settings' as ViewType, label: '团队管理', icon: Users, external: 'https://agent-os-l4.vercel.app' },
    { key: 'settings' as ViewType, label: '用量管理', icon: TrendingUp, external: 'https://agent-os-l4.vercel.app' },
    { key: 'settings' as ViewType, label: '系统设置', icon: Settings, external: 'https://agent-os-l4.vercel.app' },
  ];

  if (collapsed) {
    return (
      <div className="w-14 h-full flex flex-col bg-gradient-to-l from-[#f5f5f5] to-white border-r border-border-light shrink-0">
        <div className="h-12 flex items-center justify-center border-b border-border-light">
          <button onClick={onToggleCollapse} className="p-1.5 hover:bg-primary/5 rounded-lg text-text-muted">
            <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <nav className="flex-1 py-2 space-y-1">
          {collapsedNav.map(item => {
            const Icon = item.icon;
            const isActive = item.key === 'project' ? activeView === 'project' : activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex justify-center py-2 transition-colors ${isActive ? 'text-primary-dark' : 'text-text-muted hover:text-text'}`}
                title={item.label}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            );
          })}
        </nav>
        <div className="py-2 border-t border-border-light">
          <button onClick={onLogout} className="w-full flex justify-center py-2 text-text-muted hover:text-danger transition-colors" title="退出">
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div data-agentos-sidebar className="w-[240px] h-full flex flex-col bg-gradient-to-l from-[#f5f5f5] to-white border-r border-border-light shrink-0">
        {/* Header */}
        <div className="h-12 px-3 flex items-center justify-between border-b border-border-light">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white text-xs font-bold">H</div>
            <span className="font-semibold text-text text-sm">Agent OS</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onToggleCollapse} className="p-1.5 hover:bg-primary/5 rounded-lg text-text-muted">
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* OrgAgent */}
        <nav className="px-3 py-3 space-y-1">
          <div className="px-2 mb-1.5">
            <div className="text-[11px] font-semibold text-text-secondary">OrgAgent</div>
            <div className="text-[10px] text-text-muted mt-0.5">企业记忆 · 技能市场 · 连接器</div>
          </div>
          {orgNav.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.key && !activeProjectId;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  isActive ? 'bg-primary-subtle text-primary-dark' : 'text-text-secondary hover:bg-primary/5 hover:text-text'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── 下半部分：项目入口 ── */}
        <div className="flex-1 overflow-y-auto">
          {/* 项目 */}
          <div className="px-3 py-3 border-t border-border-light">
            <div className="px-2 mb-1.5">
              <div className="text-[11px] font-semibold text-text-secondary">ProjectAgent</div>
              <div className="text-[10px] text-text-muted mt-0.5">项目组合 · 上下文协同</div>
            </div>
            <div className={`w-full flex items-center gap-1 rounded-lg transition-all group ${
              activeView === 'project' ? 'bg-primary-subtle ring-1 ring-primary/20' : 'hover:bg-primary/5'
            }`}>
              <button
                type="button"
                className={`min-w-0 flex-1 flex items-center gap-2 px-2 py-2 text-left text-[13px] ${
                  activeView === 'project' ? 'text-primary-dark font-medium' : 'text-text-secondary group-hover:text-text'
                }`}
                onClick={() => onNavigate('project')}
              >
                <GitBranch className="w-4 h-4 shrink-0" strokeWidth={1.7} />
                <span className="truncate flex-1">项目</span>
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowProjectModal(true);
                }}
                className="mr-1 p-1 hover:bg-primary/10 rounded text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                title="新建项目"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
            <div className="ml-5 mt-1.5 pl-3 border-l border-border-light space-y-0.5">
              {[...projectList].sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
              }).map(project => {
                const isExpanded = expandedProjects.has(project.id);
                const isActiveProject = activeProjectId === project.id;
                const isRenaming = renamingProjectId === project.id;
                const hasSpaceResult = project.id === spaceResultProjectId;
                return (
                  <div key={project.id}>
                    <div
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] transition-all cursor-pointer group ${
                        isActiveProject ? 'bg-primary/10 text-primary-dark font-medium' : 'text-text-muted hover:bg-primary/5 hover:text-text'
                      }`}
                      onClick={() => !isRenaming && onNavigate('project', project.id)}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasSpaceResult ? 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : isActiveProject ? 'bg-primary-dark' : 'bg-text-muted/50'}`} />
                      {project.pinned && <Pin className="w-2.5 h-2.5 text-primary shrink-0" strokeWidth={2.5} />}
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (renameValue.trim()) onRenameProject?.(project.id, renameValue.trim());
                              setRenamingProjectId(null);
                            } else if (e.key === 'Escape') {
                              setRenamingProjectId(null);
                            }
                          }}
                          onBlur={() => {
                            if (renameValue.trim()) onRenameProject?.(project.id, renameValue.trim());
                            setRenamingProjectId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-white border border-primary/20 rounded px-1.5 py-0.5 text-[12px] text-text outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate flex-1">{project.name}</span>
                      )}
                      {!isRenaming && (
                        <>
                          <ProjectItemMenu
                            projectId={project.id}
                            isPinned={!!project.pinned}
                            onStartRename={(id, name) => {
                              setRenamingProjectId(id);
                              setRenameValue(name);
                            }}
                          />
                          {hasSpaceResult ? (
                            <span className="shrink-0 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium leading-none text-red-600">
                              回传
                            </span>
                          ) : project.unread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Section */}
          {accountType === 'admin' && (
            <div className="px-3 py-2 border-t border-border-light">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">组织管理</div>
              <div className="space-y-0.5">
                {adminNav.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={i}
                      href={item.external}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-text-secondary hover:bg-primary/5 hover:text-text transition-all"
                    >
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                      <span>{item.label}</span>
                      <span className="ml-auto text-[10px] text-text-muted">↗</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="p-3" data-agentos-user-card>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-primary/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary-subtle flex items-center justify-center text-[11px] font-bold text-primary-dark">
                {accountType === 'admin' ? 'A' : 'S'}
              </div>
              <div className="text-left">
                <div className="text-[12px] font-medium text-text">{accountType === 'admin' ? 'admin' : 'samhar'}</div>
                <div className="text-[10px] text-text-muted">{accountType === 'admin' ? 'Admin' : 'Member'}</div>
              </div>
            </button>
            {showUserMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-xl border border-border-light shadow-lg py-1">
                <button
                  onClick={() => { setShowUserMenu(false); onLogout(); }}
                  className="w-full px-3 py-2 text-left text-[12px] text-danger hover:bg-bg transition-colors"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProjectModal && (
        <ProjectWizard
          onCancel={() => setShowProjectModal(false)}
          onCreateProject={(name, desc) => onCreateProject(name, desc)}
        />
      )}
    </>
  );
}
