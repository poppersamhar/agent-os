import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Cpu,
  GitBranch,
  MessageSquareText,
  MonitorUp,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Project } from '../data/mockData';

interface ProjectOverviewProps {
  projects: Project[];
  currentUserId: string;
  onCreateProject: () => void;
  onOpenProject: (projectId: string) => void;
}

const projectMeta: Record<string, {
  people: string;
  progress: string;
  pending: string;
  state: string;
  stateTone: string;
  revenue: string;
  roi: string;
  token: string;
  progressValue: number;
}> = {
  p_risk: {
    people: '3 人',
    progress: '7 个项目节点',
    pending: '2 个待确认',
    state: '执行中',
    stateTone: 'bg-amber-50 text-amber-700',
    revenue: '¥68.2万',
    roi: '2.6x',
    token: '64K',
    progressValue: 74,
  },
  p_brand_contract: {
    people: '5 人',
    progress: '6 个项目节点',
    pending: '2 个待审批',
    state: '执行中',
    stateTone: 'bg-amber-50 text-amber-700',
    revenue: '¥31.4万',
    roi: '1.8x',
    token: '38K',
    progressValue: 52,
  },
  p_data_middle: {
    people: '4 人',
    progress: '8 个项目节点',
    pending: '1 个待授权',
    state: '执行中',
    stateTone: 'bg-amber-50 text-amber-700',
    revenue: '¥26.7万',
    roi: '2.1x',
    token: '89K',
    progressValue: 61,
  },
};

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-text-muted">{label}</span>
        <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-[24px] font-semibold leading-none text-text">{value}</span>
        <span className="text-[11px] text-text-muted mb-0.5">{note}</span>
      </div>
    </div>
  );
}

function ProjectRow({ project, onOpenProject }: { project: Project; onOpenProject: (projectId: string) => void }) {
  const meta = projectMeta[project.id] ?? {
    people: `${project.memberCount || 1} 人`,
    progress: '项目初始化',
    pending: '0 个待确认',
    state: project.status === 'completed' ? '已交付' : '执行中',
    stateTone: project.status === 'completed' ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-50 text-amber-700',
    revenue: '¥0',
    roi: '0x',
    token: '0K',
    progressValue: project.status === 'completed' ? 100 : 18,
  };

  return (
    <button
      onClick={() => onOpenProject(project.id)}
      className="w-full rounded-lg border border-border-light bg-white px-4 py-3 text-left hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_96px_72px_72px_74px_52px] items-center gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-semibold text-text truncate">{project.name}</div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${meta.stateTone}`}>
              {meta.state}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
            <span>{meta.people}</span>
            <span>·</span>
            <span>{meta.progress}</span>
            <span>·</span>
            <span>{meta.pending}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full rounded-full bg-zinc-950" style={{ width: `${meta.progressValue}%` }} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold text-text">{meta.revenue}</div>
          <div className="text-[10px] text-text-muted">预计收益</div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold text-text">{meta.roi}</div>
          <div className="text-[10px] text-text-muted">ROI</div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold text-text">{meta.token}</div>
          <div className="text-[10px] text-text-muted">Token</div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold text-text">{meta.progressValue}%</div>
          <div className="text-[10px] text-text-muted">进度</div>
        </div>
        <span className="shrink-0 inline-flex items-center justify-end gap-1 text-[12px] text-amber-700">
          进入
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} />
        </span>
      </div>
    </button>
  );
}

function PortfolioPanel() {
  const rows = [
    { label: '供应链金融风控平台', value: 54, amount: '¥68.2万' },
    { label: '品牌升级 · Q3 营销合同', value: 25, amount: '¥31.4万' },
    { label: '数据中台 · 清洗建模', value: 21, amount: '¥26.7万' },
  ];

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <CircleDollarSign className="w-4 h-4" strokeWidth={1.6} />
          收益贡献
        </div>
        <span className="text-[11px] text-text-muted">预计收益 ¥126万</span>
      </div>
      <div className="p-4 space-y-4">
        {rows.map(row => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[12px] font-medium text-text">{row.label}</span>
              <span className="text-[12px] text-text-secondary">{row.amount}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full rounded-full bg-zinc-950" style={{ width: `${row.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OperationsPanel() {
  const rows = [
    { label: '审批待处理', value: '5', detail: '数据授权 3 · 立项 2', icon: ShieldCheck },
    { label: 'Space 在线', value: '3/8', detail: '3 个 PAT 可接收', icon: MonitorUp },
    { label: 'Token 消耗', value: '191K', detail: '预算消耗 63.7%', icon: Cpu },
    { label: '成员覆盖', value: '12', detail: '跨 3 个团队', icon: Users },
  ];

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center gap-2 border-b border-border-light text-[13px] font-semibold text-text">
        <BarChart3 className="w-4 h-4" strokeWidth={1.6} />
        项目运营指标
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {rows.map(row => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="rounded-lg border border-border-light bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-text-muted">{row.label}</span>
                <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
              </div>
              <div className="text-[20px] font-semibold leading-none text-text">{row.value}</div>
              <div className="mt-1 text-[11px] text-text-secondary">{row.detail}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CollaborationRulesPanel() {
  const rows = [
    { title: '创建即负责人', detail: '任意用户都可以创建项目，创建后自动成为此项目负责人，也就是项目群主。', icon: Users },
    { title: 'ProjectAgent 拆解', detail: '负责人和 ProjectAgent 对话，基于资料和企业记忆生成需求、节点和成员责任项。', icon: MessageSquareText },
    { title: '分发到 PAT', detail: '项目任务不会在 AgentOS 本地执行，而是发送到成员 PAT，由 PAT 在 Space 创建任务。', icon: MonitorUp },
    { title: '成果回传项目页', detail: '成员在 Space 完成后，PAT 将结果送回项目页，ProjectAgent 负责审核、统计和沉淀。', icon: ShieldCheck },
  ];

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <GitBranch className="w-4 h-4" strokeWidth={1.6} />
          ProjectAgent 协同规则
        </div>
        <span className="text-[11px] text-text-muted">负责人 · 成员 · PAT · Space</span>
      </div>
      <div className="grid grid-cols-4 gap-3 p-4">
        {rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div key={row.title} className="rounded-lg border border-border-light bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-border-light flex items-center justify-center">
                  <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
                </div>
                <span className="text-[10px] text-text-muted">0{index + 1}</span>
              </div>
              <div className="text-[13px] font-semibold text-text">{row.title}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{row.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ProjectOverview({ projects, currentUserId, onCreateProject, onOpenProject }: ProjectOverviewProps) {
  const owned = projects.filter(project => project.createdBy === currentUserId);
  const joined = projects.filter(project => project.createdBy !== currentUserId);
  const visibleOwned = owned.length > 0 ? owned : projects;

  const metrics = [
    { label: '项目总数', value: projects.length, note: '全部项目', icon: GitBranch },
    { label: '预计收益', value: '¥126万', note: '当前组合', icon: TrendingUp },
    { label: '平均 ROI', value: '2.2x', note: '收益 / 成本', icon: CircleDollarSign },
    { label: '待审批', value: '5', note: '需要确认', icon: ShieldCheck },
  ];

  return (
    <div className="h-full overflow-y-auto bg-main-bg">
      <div className="px-6 py-5 border-b border-border-light bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.6} />
              ProjectAgent · 项目管理与协同看板
            </div>
            <h1 className="text-[20px] font-semibold text-text tracking-tight">项目看板</h1>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-text-secondary">
              创建项目、拉起成员协作、拆解责任项，并通过 PAT 把成员任务送到 Space 执行。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCreateProject}
              className="h-8 px-3 rounded-lg bg-zinc-950 text-white text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              创建项目
            </button>
            <span className="hidden md:flex h-8 px-3 rounded-lg border border-border-light bg-white text-[12px] text-text-secondary items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5" strokeWidth={1.6} />
              本月更新
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-4 gap-3">
          {metrics.map(item => (
            <MetricCard key={item.label} {...item} />
          ))}
        </div>

        <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <PortfolioPanel />
          <OperationsPanel />
        </section>

        <CollaborationRulesPanel />

        <section>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-text" strokeWidth={1.6} />
              <h2 className="text-[15px] font-semibold text-text">项目列表</h2>
            </div>
            <div className="text-[11px] text-text-muted">
              我负责 {visibleOwned.length} · 我参与 {joined.length}
            </div>
          </div>
          <div className="space-y-2">
            {projects.map(project => (
              <ProjectRow key={project.id} project={project} onOpenProject={onOpenProject} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
