import { useState, useRef, useEffect } from 'react';
import {
  Folder, Plus, Send, BrainCircuit, Sparkles,
  MessageCircle, ArrowRight,
  FileText, Database, Share2, Upload, Download,
  MoreVertical, Pin, Pencil, Archive,
} from 'lucide-react';
import type { AccountType, ViewType } from '../App';
import type { Project, Chat } from '../data/mockData';
import KnowledgeGraph from './KnowledgeGraph';

interface ProjectViewProps {
  accountType: AccountType;
  project: Project;
  onNavigate: (view: ViewType, projectId?: string, taskId?: string) => void;
  onCreateTask: (projectId: string, name: string) => void;
  onRenameTask: (taskId: string, newName: string) => void;
  onPinTask: (taskId: string, pinned: boolean) => void;
  onArchiveTask: (taskId: string) => void;
}

type ProjectTab = 'tasks' | 'files' | 'data' | 'graph';

/* ─── WorkAgent 面板（AgentPanel 玻璃态样式） ─── */
function WorkAgentPanel({ projectName }: { projectName: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, isUser: true }]);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-primary/20 overflow-hidden">
      <div className="h-[52px] flex items-center gap-2.5 px-4 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <BrainCircuit className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="font-semibold text-text text-sm tracking-tight">WorkAgent</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            {projectName}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
              <h3 className="text-base font-semibold text-text tracking-tight mb-2">项目助手</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-[220px]">
                我可以帮你发起任务、查看项目状态
              </p>
            </div>
            <div className="pb-3">
              <div className="text-[10px] text-text-muted mb-1.5">快捷操作</div>
              <div className="flex gap-2">
                {[
                  { label: '发起任务', icon: Sparkles },
                  { label: '查看图谱', icon: Share2 },
                ].map(a => (
                  <button
                    key={a.label}
                    onClick={() => setMessages(prev => [...prev, { text: a.label, isUser: true }])}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-bg rounded-lg border border-border-light hover:border-primary/30 transition-colors text-[11px] text-text-secondary"
                  >
                    <a.icon className="w-3 h-3" strokeWidth={1.5} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-full bg-primary-subtle flex items-center justify-center text-[10px] font-bold text-primary-dark shrink-0 mt-0.5">W</div>
              <div className="bg-bg rounded-2xl rounded-tl-sm px-4 py-2.5 text-[12px] text-text-secondary border border-border-light max-w-[85%]">
                项目当前状态：\n· 财报分析正在执行\n  Sub-Agent 处理第 3/5 步\n· 供应商评估等待审批
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] ${
                  msg.isUser
                    ? 'bg-primary-subtle text-primary-dark rounded-tr-sm'
                    : 'bg-bg text-text-secondary rounded-tl-sm border border-border-light'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="flex items-end gap-2 bg-white/60 rounded-xl px-3 py-2 shadow-sm focus-within:border-primary/20 focus-within:ring-2 focus-within:ring-primary/5 transition-all border border-transparent">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="问 WorkAgent..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-xs text-text py-1"
            style={{ minHeight: '20px' }}
          />
          <button onClick={handleSend} className="p-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shrink-0 shadow-sm shadow-primary/20">
            <Send className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 任务项操作菜单（三点） ─── */
function TaskItemMenu({
  taskId, isPinned, onRename, onPin, onArchive,
}: {
  taskId: string;
  isPinned: boolean;
  onRename: (taskId: string, newName: string) => void;
  onPin: (taskId: string, pinned: boolean) => void;
  onArchive: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = `proj-task-menu-${taskId}`;

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
            onClick={(e) => { e.stopPropagation(); onPin(taskId, !isPinned); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-[11px] text-text-secondary hover:bg-bg transition-colors flex items-center gap-2"
          >
            <Pin className={`w-3 h-3 ${isPinned ? 'text-primary fill-primary' : ''}`} strokeWidth={1.5} />
            {isPinned ? '取消置顶' : '置顶'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newName = prompt('重命名会话', '');
              if (newName?.trim()) onRename(taskId, newName.trim());
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
                onArchive(taskId);
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

/* ─── 文件 Tab（任务树样式：上下文 + 产物） ─── */
function FilesTab({ project }: { project: Project }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artifacts = [
    { name: '风控报告_2026Q1.pdf', size: '1.8MB' },
    { name: '供应商评估模型.ipynb', size: '45KB' },
    { name: '贷后监控日报_0508.html', size: '320KB' },
  ];
  const handleUpload = (files: FileList) => {
    console.log('[Project Upload]', files);
    alert(`已选择 ${files.length} 个文件，上传功能即将接入后端`);
  };
  return (
    <div className="space-y-3">
      {/* 上下文 卡片：每个任务的 context.md */}
      <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-medium text-text">上下文</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] text-text-secondary hover:text-text transition-colors flex items-center gap-1"
            title="上传上下文文件"
          >
            <Upload className="w-3 h-3" strokeWidth={1.5} /> 上传
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
        </div>
        <div className="space-y-0.5">
          {project.chats.map((chat) => (
            <div key={chat.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg transition-colors cursor-pointer">
              <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
                <span className="text-[8px] text-text-muted font-medium">MD</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text truncate">{chat.name}/context.md</div>
                <div className="text-[10px] text-text-muted">上下文文档</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 产物 卡片 */}
      <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-medium text-text">产物</span>
          <button className="text-[11px] text-text-secondary hover:text-text transition-colors flex items-center gap-1">
            <FileText className="w-3 h-3" strokeWidth={1.5} /> 打包下载
          </button>
        </div>
        <div className="space-y-0.5">
          {artifacts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg transition-colors cursor-pointer group">
              <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
                <span className="text-[8px] text-text-muted font-medium">{a.name.split('.').pop()?.toUpperCase().slice(0,3)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text truncate">{a.name}</div>
                <div className="text-[10px] text-text-muted">{a.size}</div>
              </div>
              <button
                className="p-1 hover:bg-primary/5 rounded text-text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="下载"
                onClick={() => console.log('[Download]', a.name)}
              >
                <Download className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 知识库 Tab（原数据） ─── */
function KnowledgeBaseTab() {
  const sources = [
    { name: '企业知识库', type: '内部', status: 'connected', icon: 'DB' },
    { name: '供应链数据库', type: '第三方', status: 'connected', icon: 'SQL' },
    { name: '企查查 API', type: 'MCP', status: 'connected', icon: 'API' },
    { name: '外部评级数据', type: 'API', status: 'disconnected', icon: 'EXT' },
  ];
  return (
    <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-medium text-text">知识库</span>
        <span className="text-[10px] text-text-muted">API 接入</span>
      </div>
      <div className="space-y-2">
        {sources.map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors">
            <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
              <span className="text-[7px] text-text-muted font-medium">{s.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-text truncate">{s.name}</div>
              <div className="text-[10px] text-text-muted">{s.type}</div>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.status === 'connected' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
              {s.status === 'connected' ? '已连接' : '未连接'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectView({ accountType, project, onNavigate, onCreateTask, onRenameTask, onPinTask, onArchiveTask }: ProjectViewProps) {
  const [tab, setTab] = useState<ProjectTab>('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const tabs: { key: ProjectTab; label: string }[] = [
    { key: 'tasks', label: '任务' },
    { key: 'files', label: '文件' },
    { key: 'data', label: '知识库' },
    { key: 'graph', label: '项目图谱' },
  ];

  return (
    <div className="h-full flex">
      {/* 左侧项目内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 项目名称 */}
        <h1 className="text-lg font-semibold text-text mb-4">{project.name}</h1>

        {/* Tab 导航 */}
          <div className="flex items-center gap-1 mb-4 border-b border-border-light">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-[13px] transition-all border-b-2 ${tab === t.key ? 'text-primary border-primary font-medium' : 'text-text-secondary border-transparent hover:text-text'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 内容 */}
          {tab === 'tasks' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-text-muted">共 {project.chats.length} 个任务</span>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} /> 新建任务
                </button>
              </div>
              <div className="space-y-2">
                {project.chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => onNavigate('task', project.id, chat.id)}
                    className="bg-white rounded-xl border border-border-light p-4 cursor-pointer hover:border-primary/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                      <div className="text-[13px] font-medium text-text">{chat.name}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TaskItemMenu
                        taskId={chat.id}
                        isPinned={!!chat.pinned}
                        onRename={onRenameTask}
                        onPin={onPinTask}
                        onArchive={onArchiveTask}
                      />
                      <ArrowRight className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'files' && <FilesTab project={project} />}
          {tab === 'data' && <KnowledgeBaseTab />}
          {tab === 'graph' && (
            <div className="w-full aspect-square rounded-xl border border-border-light bg-white overflow-hidden">
              <KnowledgeGraph projectId={project.id} />
            </div>
          )}
      </div>

      {/* 右侧 WorkAgent */}
      <div className="w-[380px] shrink-0 pt-12 pr-4 pb-14">
        <WorkAgentPanel projectName={project.name} />
      </div>

      {/* 新建任务 Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[420px] shadow-xl">
            <h2 className="text-base font-semibold text-text mb-4">新建任务</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] text-text-muted mb-1 block">任务名称</label>
                <input
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="例如：Q4 财报分析"
                  className="w-full px-3 py-2 bg-bg border border-border-light rounded-xl text-[13px] text-text outline-none focus:border-primary/30"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 rounded-xl text-[12px] text-text-secondary hover:bg-bg transition-colors">取消</button>
              <button
                onClick={() => {
                  if (newTaskName.trim()) {
                    onCreateTask(project.id, newTaskName.trim());
                    setShowTaskModal(false);
                    setNewTaskName('');
                  }
                }}
                className="px-4 py-2 rounded-xl text-[12px] bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
