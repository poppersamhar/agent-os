import { useState } from 'react';
import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Cpu,
  Database,
  GitBranch,
  MonitorUp,
  Plug,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import type { AccountType } from '../App';
import { workLines } from '../data/mockData';

interface DashboardProps {
  accountType?: AccountType;
  onAccountTypeChange?: (accountType: AccountType) => void;
}

const tokenTrend = [
  { label: '周一', value: 34 },
  { label: '周二', value: 48 },
  { label: '周三', value: 42 },
  { label: '周四', value: 66 },
  { label: '周五', value: 58 },
  { label: '周六', value: 28 },
  { label: '周日', value: 37 },
];

const approvalBuckets = [
  { label: '项目立项', total: 12, pending: 2, done: 10 },
  { label: '数据授权', total: 9, pending: 4, done: 5 },
  { label: '外部连接器', total: 6, pending: 1, done: 5 },
  { label: '企业记忆入库', total: 10, pending: 6, done: 4 },
];

const personalApprovalBuckets = [
  { label: '项目协作', total: 3, pending: 1, done: 2 },
  { label: '数据授权', total: 2, pending: 1, done: 1 },
  { label: '审批事项', total: 2, pending: 1, done: 1 },
  { label: '记忆确认', total: 1, pending: 0, done: 1 },
];

const projectValueRows = [
  { name: '供应链金融风控平台', revenue: '¥68.2万', roi: '2.6x', token: '64K', progress: 74 },
  { name: '品牌升级 · Q3 营销合同', revenue: '¥31.4万', roi: '1.8x', token: '38K', progress: 52 },
  { name: '数据中台 · 清洗建模', revenue: '¥26.7万', roi: '2.1x', token: '89K', progress: 61 },
];

const personalProjectValueRows = [
  { name: '供应链金融风控平台', revenue: '¥18.6万', roi: '2.3x', token: '24K', progress: 74 },
  { name: '品牌升级 · Q3 营销合同', revenue: '¥8.2万', roi: '1.7x', token: '11K', progress: 52 },
  { name: '数据中台 · 清洗建模', revenue: '¥5.4万', roi: '1.9x', token: '7K', progress: 61 },
];

const employeeRows = [
  {
    name: 'samhar',
    role: '产品负责人',
    team: '产品',
    projects: 3,
    token: '42K',
    approval: '3 待处理',
    memory: '8 条',
    space: '在线',
    workload: 76,
    statusTone: 'bg-emerald-50 text-emerald-700',
  },
  {
    name: 'chen',
    role: '研发负责人',
    team: '研发',
    projects: 2,
    token: '58K',
    approval: '2 待处理',
    memory: '5 条',
    space: '待接收',
    workload: 64,
    statusTone: 'bg-amber-50 text-amber-700',
  },
  {
    name: 'lin',
    role: '项目上级',
    team: '管理',
    projects: 3,
    token: '31K',
    approval: '6 待审批',
    memory: '11 条',
    space: '在线',
    workload: 52,
    statusTone: 'bg-emerald-50 text-emerald-700',
  },
  {
    name: 'li xue',
    role: '数据负责人',
    team: '数据',
    projects: 2,
    token: '47K',
    approval: '1 待授权',
    memory: '9 条',
    space: '在线',
    workload: 69,
    statusTone: 'bg-emerald-50 text-emerald-700',
  },
  {
    name: 'moran',
    role: '运营负责人',
    team: '运营',
    projects: 1,
    token: '13K',
    approval: '1 待确认',
    memory: '3 条',
    space: '离线',
    workload: 34,
    statusTone: 'bg-zinc-100 text-zinc-600',
  },
];

const memoryTimeline = [
  { title: '供应链风控项目形成 3 条记忆候选', time: '刚刚', state: '待确认' },
  { title: '产品方案证据摘要已进入项目记忆', time: '12 分钟前', state: '已沉淀' },
  { title: '数据权限规则更新为摘要优先', time: '今天 10:24', state: '已发布' },
];

const personalActionRows = [
  { title: '数字中台 · 清洗建模', detail: 'Space 已回传清洗结果，等待确认进入项目页', state: '新回传', tone: 'bg-rose-50 text-rose-600' },
  { title: '供应链金融风控平台', detail: '数据权限摘要需要你确认授权范围', state: '待授权', tone: 'bg-amber-50 text-amber-700' },
  { title: '品牌升级 · Q3 营销合同', detail: '项目记忆候选 2 条，等待负责人确认', state: '待确认', tone: 'bg-zinc-100 text-zinc-700' },
];

const spaceReturnRows = [
  { project: '数字中台 · 清洗建模', owner: 'li xue', result: '模型字段映射与异常样本摘要', time: '5 分钟前' },
  { project: '供应链金融风控平台', owner: 'samhar', result: '产品方案初稿与证据引用', time: '18 分钟前' },
];

const governanceRows = [
  { label: '企业记忆', value: '42', detail: '13 条待审核', icon: BookOpen },
  { label: 'Skill 调用', value: '286', detail: '8 个高频 Skill', icon: Activity },
  { label: '连接器', value: '11/14', detail: '3 个需重新授权', icon: Plug },
  { label: '数据权限', value: '9', detail: '4 个待处理', icon: Database },
];

const centralizedApprovals = [
  {
    id: 'memory-1',
    type: '企业记忆',
    title: '供应链风控项目经验入库',
    owner: 'samhar',
    status: '待审核',
    detail: '从项目复盘中提炼字段口径、授权边界和模型拆解经验。',
  },
  {
    id: 'memory-2',
    type: '企业记忆',
    title: '本地数据摘要回传规则',
    owner: 'lin',
    status: '待脱敏',
    detail: '涉及员工本地文件，只允许摘要、证据哈希和字段口径入库。',
  },
  {
    id: 'skill-1',
    type: '技能市场',
    title: '合同条款风险扫描 Skill',
    owner: 'chen',
    status: '待上架',
    detail: '识别合同中的付款、违约、数据授权和外部披露风险。',
  },
  {
    id: 'skill-2',
    type: '技能市场',
    title: '项目复盘提炼器 Skill',
    owner: 'samhar',
    status: '待测试',
    detail: '从项目页成果、决策和证据中提炼企业记忆候选。',
  },
  {
    id: 'connector-1',
    type: '连接器',
    title: '企查查 MCP 权限续期',
    owner: 'li xue',
    status: '待授权',
    detail: '用于供应商信用摘要和外部企业关系查询。',
  },
  {
    id: 'connector-2',
    type: '连接器',
    title: 'CRM 客户资料连接器',
    owner: 'moran',
    status: '待确认',
    detail: '申请读取客户行业、合同状态和历史合作记录。',
  },
];

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Activity;
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

function SectionHeader({
  icon: Icon,
  title,
  meta,
}: {
  icon: typeof Activity;
  title: string;
  meta?: string;
}) {
  return (
    <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
        <Icon className="w-4 h-4" strokeWidth={1.6} />
        {title}
      </div>
      {meta && <span className="text-[11px] text-text-muted">{meta}</span>}
    </div>
  );
}

function TokenUsagePanel({ accountType }: { accountType: AccountType }) {
  const isAdmin = accountType === 'admin';
  const used = isAdmin ? '191K' : '42K';
  const budget = isAdmin ? '300K' : '80K';
  const remaining = isAdmin ? '109K' : '38K';
  const percent = isAdmin ? '63.7%' : '52.5%';
  const width = isAdmin ? '63.7%' : '52.5%';

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={Cpu} title="Token 消耗" meta={`本月预算 ${budget}`} />
      <div className="p-4">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[30px] font-semibold leading-none text-text">{used}</div>
            <div className="mt-1 text-[11px] text-text-muted">已使用 {percent}，较上周 +12%</div>
          </div>
          <div className="min-w-[150px] text-right">
            <div className="text-[12px] text-text-secondary">剩余预算</div>
            <div className="mt-1 text-[20px] font-semibold text-text">{remaining}</div>
          </div>
        </div>

        <div className="mt-5 h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full rounded-full bg-zinc-950" style={{ width }} />
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 items-end h-[92px]">
          {tokenTrend.map(item => (
            <div key={item.label} className="h-full flex flex-col items-center justify-end gap-2">
              <div className="w-full rounded-t-md bg-zinc-900/85" style={{ height: `${item.value}%` }} />
              <span className="text-[10px] text-text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ApprovalPanel({ accountType }: { accountType: AccountType }) {
  const isAdmin = accountType === 'admin';
  const buckets = isAdmin ? approvalBuckets : personalApprovalBuckets;
  const total = buckets.reduce((sum, item) => sum + item.total, 0);
  const pending = buckets.reduce((sum, item) => sum + item.pending, 0);

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={ShieldCheck} title="审批总览" meta={`${total} 个事项 · ${pending} 个待处理`} />
      <div className="divide-y divide-border-light">
        {buckets.map(item => {
          const pendingRatio = Math.round((item.pending / item.total) * 100);
          return (
            <div key={item.label} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-medium text-text">{item.label}</div>
                <div className="text-[11px] text-text-secondary">{item.pending} 待处理 / {item.total} 总量</div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full rounded-full bg-zinc-900" style={{ width: `${100 - pendingRatio}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProjectValuePanel({ accountType }: { accountType: AccountType }) {
  const isAdmin = accountType === 'admin';
  const rows = isAdmin ? projectValueRows : personalProjectValueRows;

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={CircleDollarSign} title="项目收益与成本" meta={isAdmin ? '按组织项目聚合' : '按个人贡献聚合'} />
      <div className="divide-y divide-border-light">
        {rows.map(project => (
          <div key={project.name} className="px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-text truncate">{project.name}</div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full rounded-full bg-zinc-950" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              <div className="w-[92px] text-right">
                <div className="text-[13px] font-semibold text-text">{project.revenue}</div>
                <div className="text-[10px] text-text-muted">收益预测</div>
              </div>
              <div className="w-[64px] text-right">
                <div className="text-[13px] font-semibold text-text">{project.roi}</div>
                <div className="text-[10px] text-text-muted">ROI</div>
              </div>
              <div className="w-[64px] text-right">
                <div className="text-[13px] font-semibold text-text">{project.token}</div>
                <div className="text-[10px] text-text-muted">Token</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OperationPanel({ accountType }: { accountType: AccountType }) {
  const rows = accountType === 'admin'
    ? [
      { label: 'Space 节点', value: '3 / 8', detail: '在线率 37.5%', icon: MonitorUp },
      { label: '企业记忆候选', value: '42', detail: '13 条待审核', icon: BookOpen },
      { label: '数据授权', value: '9', detail: '4 条待处理', icon: Database },
      { label: '成员覆盖', value: '12', detail: '3 个团队接入', icon: Users },
    ]
    : [
      { label: 'Space 节点', value: '1 / 1', detail: 'PAT 在线', icon: MonitorUp },
      { label: '记忆候选', value: '3', detail: '2 条待确认', icon: BookOpen },
      { label: '数据授权', value: '2', detail: '1 条待处理', icon: Database },
      { label: '协作项目', value: '3', detail: '1 个我负责', icon: Users },
    ];

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={Activity} title="系统运营状态" meta={accountType === 'admin' ? '组织治理视角' : '个人工作视角'} />
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

function EmployeeDataPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={Users} title="员工数据总览" meta={`${employeeRows.length} 名成员 · 按人聚合`} />
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-3 px-4 py-2 border-b border-border-light text-[10px] text-text-muted">
            <span>员工</span>
            <span>团队</span>
            <span className="text-right">项目</span>
            <span className="text-right">Token</span>
            <span>审批/授权</span>
            <span>记忆贡献</span>
            <span>Space</span>
            <span>负载</span>
          </div>
          <div className="divide-y divide-border-light">
            {employeeRows.map(employee => (
              <div key={employee.name} className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-3 px-4 py-3 items-center">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-text truncate">{employee.name}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted truncate">{employee.role}</div>
                </div>
                <div className="text-[12px] text-text-secondary">{employee.team}</div>
                <div className="text-right text-[13px] font-semibold text-text">{employee.projects}</div>
                <div className="text-right text-[13px] font-semibold text-text">{employee.token}</div>
                <div className="text-[12px] text-text-secondary">{employee.approval}</div>
                <div className="text-[12px] text-text-secondary">{employee.memory}</div>
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${employee.statusTone}`}>
                    {employee.space}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full bg-zinc-950" style={{ width: `${employee.workload}%` }} />
                  </div>
                  <span className="w-8 text-right text-[11px] text-text-secondary">{employee.workload}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmployeeDistributionPanel() {
  const rows = [
    { label: '高负载成员', value: '1', detail: 'samhar 76%', icon: Activity },
    { label: '待授权成员', value: '4', detail: '13 个事项', icon: ShieldCheck },
    { label: 'PAT 在线', value: '3/5', detail: '2 个需跟进', icon: MonitorUp },
    { label: '记忆贡献', value: '36', detail: '本月候选', icon: BookOpen },
  ];

  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={BarChart3} title="员工状态分布" meta="管理视角" />
      <div className="grid grid-cols-4 gap-3 p-4">
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

function PersonalActionPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={BellRing} title="今日待处理" meta="项目回传、审批、记忆确认" />
      <div className="divide-y divide-border-light">
        {personalActionRows.map(item => (
          <div key={item.title} className="px-4 py-3 flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-zinc-700" strokeWidth={1.7} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-text truncate">{item.title}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{item.detail}</div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${item.tone}`}>{item.state}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpaceReturnPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={MonitorUp} title="Space 回传" meta="由 PAT 送回项目页" />
      <div className="divide-y divide-border-light">
        {spaceReturnRows.map(item => (
          <div key={item.project} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-text truncate">{item.project}</div>
                <div className="mt-0.5 text-[11px] text-text-secondary truncate">{item.result}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] text-text-secondary">{item.owner}</div>
                <div className="mt-0.5 text-[10px] text-text-muted">{item.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GovernanceStatusPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={ShieldCheck} title="组织治理状态" meta="OrgAgent 管理范围" />
      <div className="grid grid-cols-4 gap-3 p-4">
        {governanceRows.map(row => {
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

function MemoryActivity() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <SectionHeader icon={BookOpen} title="企业记忆动态" meta="项目经验沉淀" />
      <div className="divide-y divide-border-light">
        {memoryTimeline.map(item => (
          <div key={item.title} className="px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              {item.state === '已沉淀' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.7} />
              ) : item.state === '已发布' ? (
                <BookOpen className="w-4 h-4 text-zinc-700" strokeWidth={1.7} />
              ) : (
                <Clock3 className="w-4 h-4 text-amber-600" strokeWidth={1.7} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-text">{item.title}</div>
              <div className="mt-0.5 text-[11px] text-text-muted">{item.time}</div>
            </div>
            <span className="text-[11px] text-text-secondary">{item.state}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function approvalTypeTone(type: string) {
  if (type === '企业记忆') return 'bg-emerald-50 text-emerald-700';
  if (type === '技能市场') return 'bg-blue-50 text-blue-700';
  return 'bg-amber-50 text-amber-700';
}

function ApprovalCenterButton() {
  const [open, setOpen] = useState(false);
  const [handledIds, setHandledIds] = useState<string[]>([]);
  const pendingCount = centralizedApprovals.filter(item => !handledIds.includes(item.id)).length;
  const typeCounts = centralizedApprovals.reduce<Record<string, number>>((acc, item) => {
    if (!handledIds.includes(item.id)) {
      acc[item.type] = (acc[item.type] || 0) + 1;
    }
    return acc;
  }, {});

  const handleDecision = (id: string) => {
    setHandledIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="h-8 px-3 rounded-lg border border-border-light bg-white text-[12px] text-text-secondary flex items-center gap-1.5 hover:border-zinc-300 hover:text-text transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.6} />
        审批中心
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-zinc-950 text-white text-[10px] flex items-center justify-center">
          {pendingCount}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[440px] rounded-xl border border-border-light bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="h-12 px-4 flex items-center justify-between border-b border-border-light">
            <div>
              <div className="text-[13px] font-semibold text-text">统一审批中心</div>
              <div className="mt-0.5 text-[10px] text-text-muted">企业记忆、技能市场、连接器集中处理</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-zinc-50 text-text-muted hover:text-text transition-colors"
              aria-label="关闭审批中心"
            >
              <X className="w-4 h-4" strokeWidth={1.7} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 border-b border-border-light">
            {['企业记忆', '技能市场', '连接器'].map(type => (
              <div key={type} className="rounded-lg border border-border-light bg-zinc-50 px-3 py-2">
                <div className="text-[10px] text-text-muted">{type}</div>
                <div className="mt-1 text-[18px] font-semibold leading-none text-text">{typeCounts[type] || 0}</div>
              </div>
            ))}
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-border-light">
            {centralizedApprovals.map(item => {
              const handled = handledIds.includes(item.id);
              return (
                <div key={item.id} className={`px-4 py-3 ${handled ? 'bg-zinc-50/70' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${approvalTypeTone(item.type)}`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] text-text-muted">{item.status}</span>
                      </div>
                      <div className="mt-2 text-[13px] font-medium text-text truncate">{item.title}</div>
                      <div className="mt-1 text-[11px] leading-relaxed text-text-secondary">{item.detail}</div>
                      <div className="mt-1 text-[10px] text-text-muted">提交人：{item.owner}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button className="h-7 px-2.5 rounded-lg border border-border-light text-[11px] text-text-secondary hover:text-text hover:border-zinc-300 transition-colors">
                      查看详情
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={handled}
                        onClick={() => handleDecision(item.id)}
                        className={`h-7 px-2.5 rounded-lg text-[11px] transition-colors ${
                          handled ? 'bg-zinc-100 text-text-muted' : 'border border-border-light text-text-secondary hover:text-text hover:border-zinc-300'
                        }`}
                      >
                        {handled ? '已处理' : '驳回'}
                      </button>
                      <button
                        type="button"
                        disabled={handled}
                        onClick={() => handleDecision(item.id)}
                        className={`h-7 px-2.5 rounded-lg text-[11px] transition-colors ${
                          handled ? 'bg-zinc-100 text-text-muted' : 'bg-zinc-950 text-white hover:bg-zinc-800'
                        }`}
                      >
                        {handled ? '已完成' : item.type === '连接器' ? '授权通过' : '通过'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeToggle({
  accountType,
  onAccountTypeChange,
}: {
  accountType: AccountType;
  onAccountTypeChange?: (accountType: AccountType) => void;
}) {
  return (
    <div className="h-8 rounded-lg border border-border-light bg-zinc-50 p-0.5 flex items-center">
      {[
        { value: 'member' as const, label: '个人视角' },
        { value: 'admin' as const, label: '管理视角' },
      ].map(item => {
        const active = accountType === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onAccountTypeChange?.(item.value)}
            className={`h-7 px-3 rounded-md text-[12px] transition-all ${
              active
                ? 'bg-white text-text shadow-sm border border-border-light'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function DashboardContent({
  accountType,
  onAccountTypeChange,
}: {
  accountType: AccountType;
  onAccountTypeChange?: (accountType: AccountType) => void;
}) {
  const isAdmin = accountType === 'admin';
  const projectCount = workLines.length;

  const metrics = [
    { label: 'Token 消耗', value: isAdmin ? '191K' : '42K', icon: Cpu, note: isAdmin ? '本月 63.7%' : '个人本月' },
    { label: '审批总量', value: isAdmin ? '37' : '8', icon: ShieldCheck, note: isAdmin ? '13 待处理' : '3 待处理' },
    { label: '项目总数', value: projectCount, icon: GitBranch, note: '全部执行中' },
    { label: '项目价值', value: isAdmin ? '¥126万' : '¥18.6万', icon: TrendingUp, note: '本月归因' },
  ];

  return (
    <main className="h-full min-w-0 overflow-y-auto">
      <div className="px-6 py-5 border-b border-border-light bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={1.6} />
              首页 · 运营数据
            </div>
            <h1 className="text-[20px] font-semibold text-text tracking-tight">
              {isAdmin ? '员工数据看板' : '我的数据看板'}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScopeToggle accountType={accountType} onAccountTypeChange={onAccountTypeChange} />
            {isAdmin && <ApprovalCenterButton />}
            <span className="h-8 px-3 rounded-lg border border-border-light bg-white text-[12px] text-text-secondary flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5" strokeWidth={1.6} />
              本月
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

        {!isAdmin && (
          <>
            <section className="grid grid-cols-[1fr_1fr] gap-4">
              <PersonalActionPanel />
              <SpaceReturnPanel />
            </section>

            <section className="grid grid-cols-[1.2fr_0.8fr] gap-4">
              <ProjectValuePanel accountType={accountType} />
              <OperationPanel accountType={accountType} />
            </section>
          </>
        )}

        {isAdmin && (
          <>
            <EmployeeDataPanel />
            <EmployeeDistributionPanel />
            <GovernanceStatusPanel />
          </>
        )}

        <section className="grid grid-cols-[1fr_1fr] gap-4">
          <TokenUsagePanel accountType={accountType} />
          <ApprovalPanel accountType={accountType} />
        </section>

        <section className={`grid gap-4 ${isAdmin ? 'grid-cols-[1.15fr_0.85fr]' : 'grid-cols-[1fr_1fr]'}`}>
          <MemoryActivity />
          {isAdmin ? (
            <OperationPanel accountType={accountType} />
          ) : (
            <GovernanceStatusPanel />
          )}
        </section>
      </div>
    </main>
  );
}

export default function Dashboard({ accountType = 'member', onAccountTypeChange }: DashboardProps) {
  return (
    <div className="h-full bg-main-bg overflow-hidden">
      <DashboardContent accountType={accountType} onAccountTypeChange={onAccountTypeChange} />
    </div>
  );
}
