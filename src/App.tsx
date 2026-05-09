import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

import SkillPage from './components/SkillPage';
import NewTaskPage from './components/NewTaskPage';
import ToolsPage from './components/ToolsPage';
import ProjectView from './components/ProjectView';
import TaskSpace from './components/TaskSpace';
import { workLines, standaloneTasks, currentUserId, type Project, type StandaloneTask } from './data/mockData';

export type AccountType = 'member' | 'admin';
export type ViewType = 'home' | 'skill' | 'tools' | 'project' | 'task' | 'newtask' | 'settings';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('agent_os_logged_in') === 'true';
  });
  const [accountType, setAccountType] = useState<AccountType>(() => {
    return (localStorage.getItem('agent_os_account_type') as AccountType) || 'member';
  });
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<Project[]>(workLines);
  const [standaloneTaskList, setStandaloneTaskList] = useState<StandaloneTask[]>(standaloneTasks);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogin = (type: AccountType) => {
    setIsLoggedIn(true);
    setAccountType(type);
    localStorage.setItem('agent_os_logged_in', 'true');
    localStorage.setItem('agent_os_account_type', type);
    setActiveView('home');
    setActiveProjectId(null);
    setActiveTaskId(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('agent_os_logged_in');
    localStorage.removeItem('agent_os_account_type');
  };

  const handleSwitchAccount = () => {
    const newType = accountType === 'admin' ? 'member' : 'admin';
    setAccountType(newType);
    localStorage.setItem('agent_os_account_type', newType);
    setActiveView('home');
    setActiveProjectId(null);
    setActiveTaskId(null);
  };

  const handleNavigate = useCallback((view: ViewType, projectId?: string, taskId?: string) => {
    // Member 无法访问 settings
    if (view === 'settings' && accountType !== 'admin') {
      setActiveView('home');
      return;
    }
    setActiveView(view);
    if (projectId !== undefined) setActiveProjectId(projectId);
    if (taskId !== undefined) setActiveTaskId(taskId);
    if (view === 'home' || view === 'skill' || view === 'tools' || view === 'newtask' || view === 'settings') {
      setActiveProjectId(null);
      setActiveTaskId(null);
    }
    if (view === 'project') setActiveTaskId(null);
  }, [accountType]);

  const handleCreateProject = (name: string, description: string) => {
    const pid = `p${Date.now()}`;
    const newProject: Project = {
      id: pid,
      name,
      description,
      updatedAt: '刚刚',
      memberCount: 1,
      unread: false,
      status: 'active',
      icon: 'folder',
      createdBy: currentUserId,
      chats: [
        { id: `c${Date.now()}`, name: '主对话', projectId: pid, type: 'single', messages: [] },
      ],
    };
    setProjectList(prev => [newProject, ...prev]);
    handleNavigate('project', newProject.id);
  };

  const handleCreateTask = (projectId: string, name: string) => {
    const project = projectList.find(p => p.id === projectId);
    if (!project) return;
    const newTaskId = `task${Date.now()}`;
    const newChat = {
      id: newTaskId,
      name,
      projectId,
      type: 'single' as const,
      messages: [],
    };
    setProjectList(prev => prev.map(p =>
      p.id === projectId ? { ...p, chats: [...p.chats, newChat] } : p
    ));
    handleNavigate('task', projectId, newTaskId);
  };

  const handleCreateStandaloneTask = (name: string, shouldNavigate: boolean = true, initialMessages?: StandaloneTask['messages']) => {
    const newTask: StandaloneTask = {
      id: `st${Date.now()}`,
      name,
      type: 'single',
      messages: initialMessages || [],
      createdAt: '刚刚',
    };
    setStandaloneTaskList(prev => [newTask, ...prev]);
    if (shouldNavigate) {
      setActiveView('task');
      setActiveProjectId(null);
      setActiveTaskId(newTask.id);
    }
    return newTask.id;
  };

  const handleRenameTask = (taskId: string, newName: string) => {
    setStandaloneTaskList(prev => prev.map(t => t.id === taskId ? { ...t, name: newName } : t));
    setProjectList(prev => prev.map(p => ({
      ...p,
      chats: p.chats.map(c => c.id === taskId ? { ...c, name: newName } : c),
    })));
  };

  const handlePinTask = (taskId: string, pinned: boolean) => {
    setStandaloneTaskList(prev => prev.map(t => t.id === taskId ? { ...t, pinned } : t));
    setProjectList(prev => prev.map(p => ({
      ...p,
      chats: p.chats.map(c => c.id === taskId ? { ...c, pinned } : c),
    })));
  };

  const handleArchiveTask = (taskId: string) => {
    setStandaloneTaskList(prev => prev.filter(t => t.id !== taskId));
    setProjectList(prev => prev.map(p => ({
      ...p,
      chats: p.chats.filter(c => c.id !== taskId),
    })));
    if (activeTaskId === taskId) {
      setActiveView('home');
      setActiveTaskId(null);
      setActiveProjectId(null);
    }
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjectList(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
  };

  const handlePinProject = (projectId: string, pinned: boolean) => {
    setProjectList(prev => prev.map(p => p.id === projectId ? { ...p, pinned } : p));
  };

  const handleArchiveProject = (projectId: string) => {
    setProjectList(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveView('home');
      setActiveProjectId(null);
      setActiveTaskId(null);
    }
  };

  // 滚轮切换 home/skill/tools
  useEffect(() => {
    const scrollViews: ViewType[] = ['home', 'skill', 'tools'];
    const handler = (e: WheelEvent) => {
      if (!scrollViews.includes(activeView)) return;
      const idx = scrollViews.indexOf(activeView);
      if (e.deltaY > 30 && idx < scrollViews.length - 1) {
        setActiveView(scrollViews[idx + 1]);
      } else if (e.deltaY < -30 && idx > 0) {
        setActiveView(scrollViews[idx - 1]);
      }
    };
    window.addEventListener('wheel', handler, { passive: true });
    return () => window.removeEventListener('wheel', handler);
  }, [activeView]);

  const activeProject = activeProjectId ? projectList.find(p => p.id === activeProjectId) || null : null;
  // 先从项目中查找任务，找不到则从独立任务中查找
  const activeTaskFromProject = activeProject?.chats.find(c => c.id === activeTaskId);
  const activeTaskFromStandalone = standaloneTaskList.find(t => t.id === activeTaskId);
  const activeTask = activeTaskFromProject || activeTaskFromStandalone || null;

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex bg-bg overflow-hidden">
      <Sidebar
        accountType={accountType}
        activeView={activeView}
        activeProjectId={activeProjectId}
        activeTaskId={activeTaskId}
        projectList={projectList.filter(p => p.createdBy === currentUserId)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={handleNavigate}
        onCreateProject={handleCreateProject}
        onCreateStandaloneTask={handleCreateStandaloneTask}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
        onRenameTask={handleRenameTask}
        onPinTask={handlePinTask}
        onArchiveTask={handleArchiveTask}
        onRenameProject={handleRenameProject}
        onPinProject={handlePinProject}
        onArchiveProject={handleArchiveProject}
        standaloneTasks={standaloneTaskList}
      />
      <main className="flex-1 min-w-0 overflow-hidden bg-main-bg">
        {activeView === 'home' && (
          <Dashboard accountType={accountType} />
        )}

        {activeView === 'skill' && (
          <SkillPage accountType={accountType} />
        )}
        {activeView === 'tools' && (
          <ToolsPage accountType={accountType} />
        )}
        {activeView === 'newtask' && (
          <NewTaskPage
            onCreateStandaloneTask={handleCreateStandaloneTask}
          />
        )}
        {activeView === 'project' && activeProject && (
          <ProjectView
            accountType={accountType}
            project={activeProject}
            onNavigate={handleNavigate}
            onCreateTask={handleCreateTask}
            onRenameTask={handleRenameTask}
            onPinTask={handlePinTask}
            onArchiveTask={handleArchiveTask}
          />
        )}
        {activeView === 'task' && activeTask && (
          <TaskSpace
            key={activeTask.id}
            accountType={accountType}
            project={activeProject}
            task={activeTask}
            onBack={() => activeProject ? handleNavigate('project', activeProject.id) : handleNavigate('home')}
            onRename={handleRenameTask}
            onPin={handlePinTask}
            onArchive={handleArchiveTask}
          />
        )}
        {activeView === 'settings' && accountType === 'admin' && (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            组织管理功能请前往 L2/L3/L4 层
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
