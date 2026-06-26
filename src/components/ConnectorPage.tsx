import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Database,
  Globe,
  KeyRound,
  MonitorUp,
  Plug,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react';
import type { AccountType } from '../App';

interface ConnectorPageProps {
  accountType: AccountType;
}

interface Connector {
  id: string;
  name: string;
  type: 'MCP' | 'API' | '数据库' | '数据服务';
  description: string;
  status: 'connected' | 'disconnected' | 'needs_reauth';
  calls: number;
  scope: string;
  lastUsed: string;
  owner: string;
  spaceReady: boolean;
}

const connectors: Connector[] = [
  { id: 'c1', name: '企查查 MCP', type: 'MCP', description: '企业工商信息、信用数据、关联方关系查询。', status: 'connected', calls: 142, scope: '供应商风控', lastUsed: '2 小时前', owner: '数据团队', spaceReady: true },
  { id: 'c2', name: 'GitHub API', type: 'API', description: '代码仓库、Issue、PR 与版本变更读取。', status: 'connected', calls: 156, scope: '研发项目', lastUsed: '昨天', owner: '研发团队', spaceReady: true },
  { id: 'c3', name: '客户 CRM', type: '数据服务', description: '客户行业、合同状态、历史合作和商机记录。', status: 'needs_reauth', calls: 0, scope: '销售/运营', lastUsed: '3 天前', owner: '运营团队', spaceReady: false },
  { id: 'c4', name: '企业搜索 MCP', type: 'MCP', description: '跨系统文档、邮件、聊天记录的企业级检索。', status: 'connected', calls: 3102, scope: '全员检索', lastUsed: '刚刚', owner: 'OrgAgent', spaceReady: true },
  { id: 'c5', name: '数据仓库只读连接', type: '数据库', description: '经营指标、项目成本、客户画像等只读查询。', status: 'connected', calls: 864, scope: '管理视角', lastUsed: '1 小时前', owner: '数据团队', spaceReady: true },
  { id: 'c6', name: 'Notion 文档库', type: 'API', description: '页面读取、数据库查询和项目文档同步。', status: 'disconnected', calls: 0, scope: '项目文档', lastUsed: '未使用', owner: '产品团队', spaceReady: false },
];

const connectorStats = [
  { label: '已上架连接器', value: '14', detail: 'Space 可调用', icon: Plug },
  { label: 'MCP 服务', value: '6', detail: '企业级工具', icon: Globe },
  { label: '待授权', value: '3', detail: '首页审批', icon: ShieldCheck },
  { label: '本月调用', value: '4.3K', detail: '跨项目复用', icon: Activity },
];

const accessFlow = [
  { title: '个人申请', detail: '员工提交要接入的 MCP、API、数据库或数据服务。', icon: Plus },
  { title: '权限说明', detail: '明确可读取范围、调用方式、敏感字段和使用场景。', icon: KeyRound },
  { title: '管理员审批', detail: '管理视角首页统一审批，确认权限和安全边界。', icon: ShieldCheck },
  { title: '上架调用', detail: '审批通过后进入企业连接器市场，Space 和 Agent 均可调用。', icon: MonitorUp },
];

function statusConfig(status: Connector['status']) {
  if (status === 'connected') {
    return { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700', label: '已上架' };
  }
  if (status === 'needs_reauth') {
    return { icon: AlertCircle, tone: 'bg-amber-50 text-amber-700', label: '需授权' };
  }
  return { icon: XCircle, tone: 'bg-zinc-100 text-zinc-600', label: '未连接' };
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Plug;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-text-muted">{label}</span>
        <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-[24px] font-semibold leading-none text-text">{value}</span>
        <span className="text-[11px] text-text-muted mb-0.5">{detail}</span>
      </div>
    </div>
  );
}

function ConnectorCard({ connector }: { connector: Connector }) {
  const cfg = statusConfig(connector.status);
  const StatusIcon = cfg.icon;

  return (
    <div className="rounded-lg border border-border-light bg-white p-4 hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            {connector.type === '数据库' ? (
              <Database className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
            ) : (
              <Plug className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-text truncate">{connector.name}</div>
            <div className="text-[11px] text-text-muted">{connector.type} · {connector.owner}</div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 ${cfg.tone}`}>
          <StatusIcon className="w-3 h-3" strokeWidth={1.8} />
          {cfg.label}
        </span>
      </div>
      <p className="min-h-10 text-[12px] leading-relaxed text-text-secondary">{connector.description}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-text-muted">
        <span>调用 {connector.calls.toLocaleString()}</span>
        <span>{connector.scope}</span>
        <span>{connector.lastUsed}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-[11px] ${connector.spaceReady ? 'text-emerald-700' : 'text-text-muted'}`}>
          {connector.spaceReady ? 'Space 可调用' : '待审批后开放'}
        </span>
        <div className="flex items-center gap-2">
          <button className="h-7 px-2.5 rounded-lg border border-border-light text-[11px] text-text-secondary hover:text-text hover:border-zinc-300 transition-colors">
            管理
          </button>
          <button className="h-7 px-2.5 rounded-lg bg-zinc-950 text-white text-[11px] hover:bg-zinc-800 transition-colors">
            {connector.status === 'connected' ? '调用' : '申请'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessFlowPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <ShieldCheck className="w-4 h-4" strokeWidth={1.6} />
          连接器接入与上架流程
        </div>
        <span className="text-[11px] text-text-muted">申请 · 审批 · 市场分发 · Space 调用</span>
      </div>
      <div className="grid grid-cols-4 gap-3 p-4">
        {accessFlow.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-lg border border-border-light bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-border-light flex items-center justify-center">
                  <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
                </div>
                <span className="text-[10px] text-text-muted">0{index + 1}</span>
              </div>
              <div className="text-[13px] font-semibold text-text">{step.title}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{step.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrgAgentConnectorPanel({ accountType }: { accountType: AccountType }) {
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
          <h2 className="font-semibold text-text text-sm tracking-tight">OrgAgent</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            连接器市场 · {accountType === 'admin' ? '治理管理' : '申请与调用'}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
            <h3 className="text-base font-semibold text-text tracking-tight mb-2">连接器管理中心</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[230px]">
              描述你想接入的 MCP、API 或数据源，我可以帮你生成权限说明、配置材料和审批摘要
            </p>
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
            placeholder="描述你想接入或治理的连接器..."
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

export default function ConnectorPage({ accountType }: ConnectorPageProps) {
  const [filter, setFilter] = useState<string>('all');
  const filtered = connectors.filter(connector => filter === 'all' || connector.type === filter);

  return (
    <div className="h-full grid grid-cols-[minmax(760px,1fr)_380px] bg-main-bg overflow-hidden">
      <main className="min-w-0 overflow-y-auto">
        <div className="px-6 py-5 border-b border-border-light bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
                <Plug className="w-3.5 h-3.5" strokeWidth={1.6} />
                OrgAgent · MCP、API、数据源接入与调用治理
              </div>
              <h1 className="text-[20px] font-semibold text-text tracking-tight">连接器</h1>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-text-secondary">
                企业级 MCP、API 和数据源市场。个人可申请接入，管理视角首页审批后上架，Space 和各类 Agent 可按权限调用。
              </p>
            </div>
            <button className="h-8 px-3 rounded-lg bg-zinc-950 text-white text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-800 transition-colors">
              <Upload className="w-3.5 h-3.5" strokeWidth={2} />
              申请接入
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {connectorStats.map(item => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>

          <AccessFlowPanel />

          <section className="rounded-lg border border-border-light bg-white overflow-hidden">
            <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                <Plug className="w-4 h-4" strokeWidth={1.6} />
                企业连接器市场
              </div>
              <span className="text-[11px] text-text-muted">上架后可被 Space、项目 Agent 和 Skill 调用</span>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-border-light">
              {['all', 'MCP', 'API', '数据库', '数据服务'].map(item => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`h-7 px-3 rounded-lg text-[11px] transition-colors ${
                    filter === item
                      ? 'bg-zinc-950 text-white'
                      : 'bg-zinc-50 text-text-secondary hover:bg-zinc-100'
                  }`}
                >
                  {item === 'all' ? '全部' : item}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {filtered.map(connector => (
                <ConnectorCard key={connector.id} connector={connector} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <div className="shrink-0 pt-12 pr-4 pb-14">
        <OrgAgentConnectorPanel accountType={accountType} />
      </div>
    </div>
  );
}
