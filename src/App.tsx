import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

import SkillPage from './components/SkillPage';
import ConnectorPage from './components/ConnectorPage';
import KnowledgePage from './components/KnowledgePage';
import ProjectOverview from './components/ProjectOverview';
import ProjectView from './components/ProjectView';
import ProjectWizard from './components/ProjectWizard';
import PersonalAgentDeskPet from './components/PersonalAgentDeskPet';
import { workLines, standaloneTasks, currentUserId, type Project, type StandaloneTask } from './data/mockData';

export type AccountType = 'member' | 'admin';
export type ViewType = 'home' | 'skill' | 'connector' | 'knowledge' | 'project' | 'task' | 'newtask' | 'settings';
export type SpaceResultNotification = {
  projectId: string;
  projectName: string;
  title: string;
  summary: string;
  receivedAt: string;
};

const spaceResultNotification: SpaceResultNotification = {
  projectId: 'p_data_middle',
  projectName: '数据中台 · 清洗建模',
  title: 'Space 执行结果已回传',
  summary: '清洗质量报告、异常字段清单和建模输入表已完成回传。',
  receivedAt: '刚刚',
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('agent_os_logged_in') === 'true';
  });
  const [accountType, setAccountType] = useState<AccountType>(() => {
    return (localStorage.getItem('agent_os_account_type') as AccountType) || 'member';
  });
  const [dashboardScope, setDashboardScope] = useState<AccountType>(() => {
    return (localStorage.getItem('agent_os_dashboard_scope') as AccountType) || 'member';
  });
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<Project[]>(workLines);
  const [standaloneTaskList, setStandaloneTaskList] = useState<StandaloneTask[]>(standaloneTasks);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);

  const handleLogin = (type: AccountType) => {
    setIsLoggedIn(true);
    setAccountType(type);
    setDashboardScope(type);
    localStorage.setItem('agent_os_logged_in', 'true');
    localStorage.setItem('agent_os_account_type', type);
    localStorage.setItem('agent_os_dashboard_scope', type);
    setActiveView('home');
    setActiveProjectId(null);
    setActiveTaskId(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('agent_os_logged_in');
    localStorage.removeItem('agent_os_account_type');
  };

  const handleDashboardScopeChange = (scope: AccountType) => {
    setDashboardScope(scope);
    localStorage.setItem('agent_os_dashboard_scope', scope);
  };

  const handleNavigate = useCallback((view: ViewType, projectId?: string, taskId?: string) => {
    // Member 无法访问 settings
    if (view === 'settings' && accountType !== 'admin') {
      setActiveView('home');
      return;
    }
    if (view === 'newtask') {
      setActiveView('home');
      setActiveProjectId(null);
      setActiveTaskId(null);
      return;
    }
    if (view === 'task') {
      if (projectId) {
        setActiveView('project');
        setActiveProjectId(projectId);
      } else {
        setActiveView('home');
        setActiveProjectId(null);
      }
      setActiveTaskId(null);
      return;
    }
    if (view === 'project') {
      setActiveView('project');
      setActiveProjectId(projectId ?? null);
      setActiveTaskId(null);
      return;
    }
    setActiveView(view);
    if (projectId !== undefined) setActiveProjectId(projectId);
    if (taskId !== undefined) setActiveTaskId(taskId);
    if (view === 'home' || view === 'skill' || view === 'connector' || view === 'knowledge' || view === 'settings') {
      setActiveProjectId(null);
      setActiveTaskId(null);
    }
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
        projectList={projectList}
        spaceResultProjectId={spaceResultNotification.projectId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={handleNavigate}
        onCreateProject={handleCreateProject}
        onCreateStandaloneTask={handleCreateStandaloneTask}
        onLogout={handleLogout}
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
          <Dashboard accountType={dashboardScope} onAccountTypeChange={handleDashboardScopeChange} />
        )}

        {activeView === 'skill' && (
          <SkillPage accountType={accountType} />
        )}
        {activeView === 'connector' && (
          <ConnectorPage accountType={accountType} />
        )}
        {activeView === 'knowledge' && (
          <KnowledgePage accountType={accountType} />
        )}
        {activeView === 'project' && !activeProject && (
          <ProjectOverview
            projects={projectList}
            currentUserId={currentUserId}
            onCreateProject={() => setShowProjectWizard(true)}
            onOpenProject={(projectId) => handleNavigate('project', projectId)}
          />
        )}
        {activeView === 'project' && activeProject && (
          <ProjectView
            accountType={accountType}
            project={activeProject}
            currentUserId={currentUserId}
            onNavigate={handleNavigate}
            onCreateTask={handleCreateTask}
            onRenameTask={handleRenameTask}
            onPinTask={handlePinTask}
            onArchiveTask={handleArchiveTask}
          />
        )}
        {activeView === 'settings' && accountType === 'admin' && (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            组织管理功能请前往 L2/L3/L4 层
          </div>
        )}
      </main>
      <PersonalAgentDeskPet
        accountType={accountType}
        notification={spaceResultNotification}
        onOpenNotification={() => handleNavigate('project', spaceResultNotification.projectId)}
      />
      {showProjectWizard && (
        <ProjectWizard
          onCreateProject={(name, description) => {
            handleCreateProject(name, description);
            setShowProjectWizard(false);
          }}
          onCancel={() => setShowProjectWizard(false)}
        />
      )}
    </div>
  );
}

export default App;
