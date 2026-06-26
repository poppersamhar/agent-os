import { useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  ClipboardList,
  Database,
  FileText,
  GitBranch,
  MonitorUp,
  Network,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import type { AccountType, ViewType } from '../App';
import type { Project } from '../data/mockData';

interface ProjectViewProps {
  accountType: AccountType;
  project: Project;
  currentUserId: string;
  onNavigate: (view: ViewType, projectId?: string, taskId?: string) => void;
  onCreateTask: (projectId: string, name: string) => void;
  onRenameTask: (taskId: string, newName: string) => void;
  onPinTask: (taskId: string, pinned: boolean) => void;
  onArchiveTask: (taskId: string) => void;
}

type ProjectNodeStatus = 'done' | 'active' | 'waiting' | 'risk';
type ProjectNodeKind = 'document' | 'memory' | 'milestone' | 'space' | 'approval' | 'delivery';

interface ProjectMapNode {
  id: string;
  label: string;
  owner: string;
  kind: ProjectNodeKind;
  status: ProjectNodeStatus;
  x: number;
  y: number;
  detail: string;
  target?: 'project' | 'space' | 'memory';
}

const projectNodes: ProjectMapNode[] = [
  {
    id: 'doc',
    label: '项目资料',
    owner: '创建者',
    kind: 'document',
    status: 'done',
    x: 7,
    y: 19,
    detail: '创建者上传文件、补充背景，并和 AI 对齐项目目标与约束。',
    target: 'project',
  },
  {
    id: 'memory',
    label: 'AI 方向校准',
    owner: 'ProjectAgent',
    kind: 'memory',
    status: 'done',
    x: 30,
    y: 13,
    detail: '基于企业记忆确认项目方向、执行策略和可复用经验。',
    target: 'memory',
  },
  {
    id: 'plan',
    label: '拆解与分发',
    owner: '创建者 ProjectAgent',
    kind: 'milestone',
    status: 'active',
    x: 53,
    y: 22,
    detail: '创建者 ProjectAgent 将项目拆成成员责任项，并生成 Space 执行需求。',
    target: 'project',
  },
  {
    id: 'prd',
    label: '产品方案',
    owner: 'samhar',
    kind: 'space',
    status: 'active',
    x: 18,
    y: 55,
    detail: 'PAT 已在 samhar 的 Space 创建项目，并提交产品方案需求。',
    target: 'space',
  },
  {
    id: 'dev',
    label: '研发评估',
    owner: 'chen',
    kind: 'space',
    status: 'waiting',
    x: 42,
    y: 67,
    detail: '成员可在自己的 AgentOS 项目页问答，执行仍在 Space 内完成。',
    target: 'space',
  },
  {
    id: 'review',
    label: '数据权限审批',
    owner: 'lin',
    kind: 'approval',
    status: 'risk',
    x: 66,
    y: 53,
    detail: '项目成员或上级在 AgentOS 内完成项目上下文审批。',
    target: 'project',
  },
  {
    id: 'delivery',
    label: '成果审核',
    owner: '创建者 ProjectAgent',
    kind: 'delivery',
    status: 'active',
    x: 76,
    y: 19,
    detail: 'PAT 将 Space 成果带回项目页，由创建者 ProjectAgent 审核、统计和沉淀。',
    target: 'project',
  },
];

const projectEdges = [
  ['doc', 'memory'],
  ['memory', 'plan'],
  ['plan', 'prd'],
  ['plan', 'dev'],
  ['prd', 'dev'],
  ['prd', 'review'],
  ['dev', 'delivery'],
  ['review', 'delivery'],
];

const memberRows = [
  {
    name: 'samhar',
    role: '产品负责人',
    responsibility: '产品方案、竞品调研、需求边界',
    agentScope: '可问项目背景、补充需求、查看审批',
    spaceState: 'Space 已创建',
    resultState: '成果已回传',
    color: 'bg-emerald-500',
  },
  {
    name: 'chen',
    role: '研发负责人',
    responsibility: '技术可行性、接口边界、工期评估',
    agentScope: '可问项目节点、依赖和交付标准',
    spaceState: '等待 PAT 接收',
    resultState: '待执行',
    color: 'bg-zinc-400',
  },
  {
    name: 'lin',
    role: '项目上级',
    responsibility: '数据权限、关键决策、阶段审批',
    agentScope: '可审阅项目证据和授权请求',
    spaceState: '无需 Space 执行',
    resultState: '待审批',
    color: 'bg-amber-500',
  },
];

const requestRows = [
  {
    type: '创建',
    title: '创建项目并上传资料',
    route: '创建者 -> 项目资料 -> ProjectAgent',
    status: '已完成',
  },
  {
    type: '规划',
    title: 'AI 对齐方向并拆解成员责任项',
    route: '企业记忆 -> 项目计划 -> 成员职责',
    status: '进行中',
  },
  {
    type: '分发',
    title: '负责人拉起成员并分发任务到 PAT',
    route: '项目群 -> ProjectAgent -> 成员 PAT -> Space',
    status: '已送达',
  },
  {
    type: '回传',
    title: 'Space 完成任务并返回成果',
    route: 'Space -> 成员 PAT -> 项目页',
    status: '有新成果',
  },
  {
    type: '总控',
    title: '创建者 ProjectAgent 审核、统计和沉淀',
    route: '项目页 -> 创建者 ProjectAgent -> 项目记忆',
    status: '待审核',
  },
];

const memoryItems = [
  '同类风控项目通常先确认数据口径，再把具体工作请求送到 Space。',
  '供应链数据回传优先采用摘要或结构化指标，原始文件需要审批。',
  '项目复盘中的决策理由应沉淀为企业记忆候选，不直接写入全局库。',
];

const statusStyle: Record<ProjectNodeStatus, string> = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  active: 'border-zinc-900 bg-white text-zinc-950 shadow-[0_8px_24px_rgba(24,24,27,0.12)]',
  waiting: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  risk: 'border-amber-300 bg-amber-50 text-amber-950',
};

const statusLabel: Record<ProjectNodeStatus, string> = {
  done: '已沉淀',
  active: '进行中',
  waiting: '等待中',
  risk: '需确认',
};

const kindIcon: Record<ProjectNodeKind, typeof FileText> = {
  document: FileText,
  memory: BookOpen,
  milestone: GitBranch,
  space: MonitorUp,
  approval: ShieldCheck,
  delivery: BadgeCheck,
};

function ProjectAgentPanel({
  projectName,
  accountType,
  isCreator,
}: {
  projectName: string;
  accountType: AccountType;
  isCreator: boolean;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const agentTitle = isCreator ? 'ProjectAgent · 项目总控' : 'ProjectAgent · 项目协同';
  const agentScope = isCreator
    ? '拆解、分发、审核、统计'
    : '问答、理解、审批、个人交付';
  const emptyTitle = isCreator ? '创建者项目总控' : '成员项目助手';
  const emptyBody = isCreator
    ? '我负责围绕当前项目做方向校准、任务拆解、成员分发、成果审核和项目统计，不进入员工本地电脑执行。'
    : '我负责帮助你理解项目上下文、处理审批、分析节点和确认自己的交付要求，执行仍由 Space 承接。';
  const quickPrompts = isCreator
    ? ['拆解下一阶段责任项', '审核 Space 回传成果', '统计成员执行风险']
    : ['解释我负责什么', '查看待我审批的事项', '分析当前项目节点'];

  const handleSend = (value = input) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { text: trimmed, isUser: true }]);
    setInput('');
  };

  return (
    <div className="h-full pt-12 pr-4 pb-14">
      <div className="h-full flex flex-col rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-primary/20 overflow-hidden">
        <div className="h-[52px] flex items-center gap-2.5 px-4 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-text text-sm tracking-tight truncate">{agentTitle}</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              {projectName} · {accountType === 'admin' ? '组织视角' : agentScope}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
              <h3 className="text-base font-semibold text-text tracking-tight mb-2">{emptyTitle}</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-[230px]">
                {emptyBody}
              </p>
              <div className="mt-4 w-full space-y-2">
                {quickPrompts.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="w-full rounded-lg border border-border-light bg-white/70 px-3 py-2 text-left text-[11px] text-text-secondary hover:border-primary/20 hover:text-text transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] ${
                    message.isUser
                      ? 'bg-primary-subtle text-primary-dark rounded-tr-sm'
                      : 'bg-bg text-text-secondary rounded-tl-sm border border-border-light'
                  }`}>
                    {message.text}
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
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isCreator ? '问拆解、分发、审核、统计...' : '问项目背景、我的事项、审批...'}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-xs text-text py-1"
              style={{ minHeight: '20px' }}
            />
            <button onClick={() => handleSend()} className="p-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shrink-0 shadow-sm shadow-primary/20">
              <Send className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectGraph({
  selectedNodeId,
  onSelect,
}: {
  selectedNodeId: string;
  onSelect: (nodeId: string) => void;
}) {
  const selectedNode = projectNodes.find(node => node.id === selectedNodeId) ?? projectNodes[0];
  const stages = [
    { label: '项目准备', left: '4%', width: '27%' },
    { label: '拆解分发', left: '34%', width: '28%' },
    { label: '成员执行', left: '15%', width: '50%' },
    { label: '回传审核', left: '68%', width: '27%' },
  ];

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-12 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-text" strokeWidth={1.6} />
          <span className="text-[13px] font-semibold text-text">项目图谱</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            已沉淀
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-zinc-950" />
            进行中
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            需确认
          </span>
        </div>
      </div>

      <div className="relative h-[560px] overflow-hidden bg-[linear-gradient(#f4f4f5_1px,transparent_1px),linear-gradient(90deg,#f4f4f5_1px,transparent_1px)] bg-[size:28px_28px]">
        <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-4 rounded-lg border border-border-light bg-white/90 px-3 py-2 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="text-[11px] text-text-muted">当前选中</div>
            <div className="truncate text-[13px] font-semibold text-text">{selectedNode.label}</div>
          </div>
          <div className="hidden max-w-[520px] truncate text-[11px] text-text-secondary md:block">
            {selectedNode.detail}
          </div>
        </div>

        {stages.map(stage => (
          <div
            key={stage.label}
            className="absolute top-[92px] bottom-5 rounded-2xl border border-dashed border-zinc-200 bg-white/35"
            style={{ left: stage.left, width: stage.width }}
          >
            <div className="absolute -top-7 left-3 rounded-full border border-border-light bg-white px-2.5 py-1 text-[10px] font-medium text-text-secondary shadow-sm">
              {stage.label}
            </div>
          </div>
        ))}

        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <marker id="project-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#a1a1aa" />
            </marker>
          </defs>
          {projectEdges.map(([from, to]) => {
            const a = projectNodes.find(node => node.id === from);
            const b = projectNodes.find(node => node.id === to);
            if (!a || !b) return null;
            const active = selectedNodeId === from || selectedNodeId === to;
            return (
              <path
                key={`${from}-${to}`}
                d={`M ${a.x + 7} ${a.y + 5} C ${(a.x + b.x) / 2} ${a.y + 5}, ${(a.x + b.x) / 2} ${b.y + 5}, ${b.x + 7} ${b.y + 5}`}
                fill="none"
                stroke={active ? '#18181b' : '#d4d4d8'}
                strokeWidth={active ? '0.6' : '0.38'}
                strokeDasharray={b.status === 'waiting' ? '1.4 1.2' : undefined}
                markerEnd="url(#project-arrow)"
              />
            );
          })}
        </svg>

        {projectNodes.map(node => {
          const Icon = kindIcon[node.kind];
          const selected = selectedNodeId === node.id;
          return (
            <button
              key={node.id}
              onClick={() => onSelect(node.id)}
              className={`absolute z-20 w-[168px] rounded-xl border px-3 py-3 text-left transition-all ${statusStyle[node.status]} ${
                selected ? 'ring-2 ring-zinc-900/15 scale-[1.03]' : 'hover:scale-[1.015] hover:shadow-md'
              }`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
                  <Icon className="w-4 h-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate">{node.label}</div>
                  <div className="mt-0.5 truncate text-[10px] opacity-70">{node.owner}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] opacity-80">{statusLabel[node.status]}</span>
                <span className="flex items-center gap-1 text-[10px] opacity-70">
                  {node.target === 'space' ? <MonitorUp className="w-3.5 h-3.5" strokeWidth={1.6} /> : <Route className="w-3.5 h-3.5" strokeWidth={1.6} />}
                  {node.target === 'space' ? 'Space' : 'AgentOS'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function ProjectView({ accountType, project, currentUserId }: ProjectViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState('plan');
  const isCreator = project.createdBy === currentUserId || accountType === 'admin';
  const creatorName = project.createdBy === currentUserId ? 'samhar' : 'li xue';

  return (
    <div className="h-full grid grid-cols-[minmax(760px,1fr)_380px] bg-main-bg overflow-hidden">
      <main className="min-w-0 overflow-y-auto">
        <div className="px-6 py-5 border-b border-border-light bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
                <Network className="w-3.5 h-3.5" strokeWidth={1.6} />
                项目空间 · 节点图谱 · 上下文协同
              </div>
              <h1 className="text-[20px] font-semibold text-text tracking-tight truncate">{project.name}</h1>
              <p className="mt-1 text-[12px] text-text-secondary max-w-3xl leading-relaxed">
                {project.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isCreator && (
                <>
                  <button className="h-8 px-3 rounded-lg border border-border-light bg-white text-[12px] text-text-secondary flex items-center gap-1.5 hover:border-zinc-300 hover:text-text transition-colors">
                    <UserPlus className="w-3.5 h-3.5" strokeWidth={1.6} />
                    拉成员
                  </button>
                  <button className="h-8 px-3 rounded-lg bg-zinc-950 text-white text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-800 transition-colors">
                    <MonitorUp className="w-3.5 h-3.5" strokeWidth={1.6} />
                    分发到 PAT
                  </button>
                </>
              )}
              <span className="h-8 px-3 rounded-lg border border-border-light bg-white text-[12px] text-text-secondary flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" strokeWidth={1.6} />
                {isCreator ? '创建者视角' : '成员视角'}
              </span>
              <span className="h-8 px-3 rounded-lg border border-border-light bg-white text-[12px] text-text-secondary flex items-center gap-1.5">
                <MonitorUp className="w-3.5 h-3.5" strokeWidth={1.6} />
                执行层在 Space
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <ProjectGraph selectedNodeId={selectedNodeId} onSelect={setSelectedNodeId} />

          <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="rounded-lg border border-border-light bg-white overflow-hidden">
              <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <ClipboardList className="w-4 h-4" strokeWidth={1.6} />
                  项目作战流
                </div>
                <span className="text-[11px] text-text-muted">创建者：{creatorName}</span>
              </div>
              <div className="divide-y divide-border-light">
                {requestRows.map((request, index) => (
                  <div
                    key={request.title}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-[12px] font-semibold text-text">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-text truncate">{request.title}</div>
                      <div className="mt-0.5 text-[11px] text-text-muted truncate">
                        {request.route}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] shrink-0 ${
                      request.status.includes('成果') || request.status.includes('审核')
                        ? 'bg-red-50 text-red-600'
                        : request.status.includes('进行')
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border-light bg-white overflow-hidden">
              <div className="h-11 px-4 flex items-center gap-2 border-b border-border-light text-[13px] font-semibold text-text">
                <Users className="w-4 h-4" strokeWidth={1.6} />
                项目成员与分工
              </div>
              <div className="divide-y divide-border-light">
                {memberRows.map(member => (
                  <div key={member.name} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${member.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-text">{member.name}</div>
                      <div className="text-[11px] text-text-muted">{member.role}</div>
                    </div>
                    <span className="text-[11px] text-text-secondary">{member.resultState}</span>
                    </div>
                    <div className="mt-2 pl-5 space-y-1">
                      <div className="text-[11px] text-text-secondary">{member.responsibility}</div>
                      <div className="flex items-center justify-between gap-3 text-[10px] text-text-muted">
                        <span>{member.agentScope}</span>
                        <span>{member.spaceState}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[1fr_1fr] gap-4">
            <div className="rounded-lg border border-border-light bg-white overflow-hidden">
              <div className="h-11 px-4 flex items-center gap-2 border-b border-border-light text-[13px] font-semibold text-text">
                <MonitorUp className="w-4 h-4" strokeWidth={1.6} />
                PAT / Space 链路
              </div>
              <div className="divide-y divide-border-light">
                {requestRows.map(request => (
                  <div key={request.title} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-medium text-text">{request.title}</div>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-text-secondary">{request.status}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-text-muted">{request.type}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
                      <Route className="w-3.5 h-3.5" strokeWidth={1.6} />
                      {request.route}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border-light bg-white overflow-hidden">
              <div className="h-11 px-4 flex items-center gap-2 border-b border-border-light text-[13px] font-semibold text-text">
                <Database className="w-4 h-4" strokeWidth={1.6} />
                项目记忆与成果沉淀
              </div>
              <div className="p-4 space-y-3">
                {memoryItems.map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center text-[11px] text-text-secondary shrink-0">
                      {index + 1}
                    </div>
                    <div className="text-[12px] leading-relaxed text-text-secondary">{item}</div>
                  </div>
                ))}
                <button className="w-full h-9 rounded-lg border border-dashed border-zinc-300 text-[12px] text-text-secondary hover:border-zinc-500 hover:text-text transition-colors flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.6} />
                  提炼为企业记忆候选
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <ProjectAgentPanel projectName={project.name} accountType={accountType} isCreator={isCreator} />
    </div>
  );
}
