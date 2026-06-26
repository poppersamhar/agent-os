import { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Filter,
  GitBranch,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { AccountType } from '../App';
import KnowledgeGraph from './KnowledgeGraph';

interface MemorySource {
  id: string;
  name: string;
  type: '文档' | '项目记忆' | 'Skill经验' | '连接器' | '制度';
  description: string;
  entries: number;
  status: 'active' | 'review' | 'locked';
}

interface KnowledgePageProps {
  accountType: AccountType;
}

const memorySources: MemorySource[] = [
  { id: 'm1', name: '企业制度与流程', type: '制度', description: '审批规则、项目流程、数据安全边界', entries: 286, status: 'active' },
  { id: 'm2', name: '项目复盘记忆', type: '项目记忆', description: '项目目标、决策理由、失败经验和最佳实践', entries: 356, status: 'review' },
  { id: 'm3', name: '行业与客户资料', type: '文档', description: '客户背景、行业报告、招投标材料', entries: 1240, status: 'active' },
  { id: 'm4', name: 'Skill 执行经验', type: 'Skill经验', description: 'Skill 调用效果、参数习惯、失败样例', entries: 2100, status: 'active' },
  { id: 'm5', name: '企查查 MCP', type: '连接器', description: '企业工商信息、信用数据和外部关系', entries: 5600, status: 'active' },
  { id: 'm6', name: '敏感数据索引', type: '连接器', description: '只保存元数据与权限边界，不保存原始内容', entries: 89, status: 'locked' },
];

const memoryCandidates = [
  {
    title: '供应链风控项目：先校准数据口径再拆模型任务',
    source: '供应链金融风控平台',
    status: '待负责人确认',
    risk: '低',
    summary: '同类项目在立项早期需要先统一字段口径、供应商分层规则和回传边界。',
  },
  {
    title: '本地数据请求优先回传摘要，不回传原始文件',
    source: 'PAT / Space 请求流',
    status: '待脱敏',
    risk: '中',
    summary: '涉及员工本地电脑或客户文件时，默认采用结构化摘要和证据哈希。',
  },
  {
    title: '项目页只做规划、问答和分发，不承载本地执行',
    source: 'AgentOS 产品矩阵',
    status: '可入库',
    risk: '低',
    summary: '项目执行由 PersonalAgent/PAT 下发到 Space，并通过 KodaX 内核完成。',
  },
];

const pipeline = [
  { label: '资料接入', detail: '上传文档、连接器数据和 Space 回传成果', icon: Upload },
  { label: '结构解析', detail: '抽取实体、关系、证据、口径和标签', icon: Layers3 },
  { label: '项目沉淀', detail: '项目页沉淀任务、决策、证据和复盘', icon: GitBranch },
  { label: '治理发布', detail: '脱敏、去重、权限审核后进入全局', icon: ShieldCheck },
];

const memoryCapabilities = [
  {
    title: '文档解析',
    detail: '把制度、报告、合同和客户资料拆成可引用的知识片段。',
    metric: '1,240 份资料',
    icon: FileText,
  },
  {
    title: '项目记忆沉淀',
    detail: '从项目节点、决策、交付成果和复盘中提炼可复用经验。',
    metric: '42 条候选',
    icon: GitBranch,
  },
  {
    title: '图谱问答',
    detail: '基于关系图谱回答问题，并返回来源、证据和关联项目。',
    metric: '可追溯回答',
    icon: MessageSquareText,
  },
  {
    title: '经验提炼',
    detail: '把单个项目经验整理成 SOP、风险规则和最佳实践。',
    metric: '13 条待审核',
    icon: Sparkles,
  },
  {
    title: '权限治理',
    detail: '控制敏感内容、受限索引、跨部门可见范围和审批流。',
    metric: '89 条受限',
    icon: LockKeyhole,
  },
  {
    title: '缺口发现',
    detail: '识别过期知识、冲突口径、重复记忆和项目复用断点。',
    metric: '7 个缺口',
    icon: Filter,
  },
];

const qaScenarios = [
  {
    question: '类似供应链风控项目，立项前应该先确认什么？',
    answer: '先统一字段口径、供应商分层规则、数据授权边界，再拆模型任务。',
  },
  {
    question: '哪些项目经验可以沉淀为全局 SOP？',
    answer: '项目复盘中的稳定流程、风险规则、审批边界和可复用模板会进入候选。',
  },
  {
    question: '某条记忆被哪些项目或 Skill 使用过？',
    answer: '按记忆节点追踪引用链路，展示项目、成员、Skill 和连接器调用记录。',
  },
];

const memoryHealth = [
  { label: '重复候选', value: '12', detail: '建议合并', icon: Layers3 },
  { label: '冲突口径', value: '4', detail: '需要负责人确认', icon: ShieldCheck },
  { label: '过期内容', value: '18', detail: '超过 90 天未验证', icon: Clock3 },
  { label: '缺失证据', value: '7', detail: '等待补充来源', icon: BadgeCheck },
];

const statusStyle = {
  active: 'bg-emerald-50 text-emerald-700',
  review: 'bg-amber-50 text-amber-700',
  locked: 'bg-zinc-100 text-zinc-600',
};

const statusText = {
  active: '已启用',
  review: '待整理',
  locked: '受限',
};

function MemorySourceCard({ source }: { source: MemorySource }) {
  return (
    <div className="rounded-lg border border-border-light bg-white p-4 hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-text">
            <Database className="w-4 h-4" strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-text truncate">{source.name}</div>
            <div className="text-[11px] text-text-muted">{source.type}</div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${statusStyle[source.status]}`}>
          {statusText[source.status]}
        </span>
      </div>
      <p className="mt-3 min-h-9 text-[12px] leading-relaxed text-text-secondary">{source.description}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
        <span>{source.entries.toLocaleString()} 条记忆</span>
        <span className="inline-flex items-center gap-1">
          查看
          <ArrowRight className="w-3 h-3" strokeWidth={1.6} />
        </span>
      </div>
    </div>
  );
}

function CapabilityMatrix() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <BrainCircuit className="w-4 h-4" strokeWidth={1.6} />
          记忆平台能力
        </div>
        <span className="text-[11px] text-text-muted">文档、项目记忆、问答、提炼与治理</span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {memoryCapabilities.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-lg border border-border-light bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-border-light flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
                </div>
                <span className="shrink-0 text-[10px] text-text-muted">{item.metric}</span>
              </div>
              <div className="mt-3 text-[13px] font-semibold text-text">{item.title}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QaScenarioPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <MessageSquareText className="w-4 h-4" strokeWidth={1.6} />
          问答与提炼场景
        </div>
        <span className="text-[11px] text-text-muted">带来源、带证据、可沉淀</span>
      </div>
      <div className="divide-y divide-border-light">
        {qaScenarios.map(item => (
          <div key={item.question} className="px-4 py-3">
            <div className="text-[12px] font-medium text-text">{item.question}</div>
            <div className="mt-1 text-[12px] leading-relaxed text-text-secondary">{item.answer}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemoryHealthPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <CheckCircle2 className="w-4 h-4" strokeWidth={1.6} />
          记忆健康度
        </div>
        <span className="text-[11px] text-text-muted">去重、冲突、时效与证据完整性</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {memoryHealth.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-border-light bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-text-muted">{item.label}</span>
                <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
              </div>
              <div className="text-[20px] font-semibold leading-none text-text">{item.value}</div>
              <div className="mt-1 text-[11px] text-text-secondary">{item.detail}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrgMemoryPanel({ accountType }: { accountType: AccountType }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);

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
          <div>
            <h2 className="font-semibold text-text text-sm tracking-tight">OrgAgent</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              企业记忆治理 · {accountType === 'admin' ? '管理视角' : '成员视角'}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
              <h3 className="text-base font-semibold text-text tracking-tight mb-2">企业记忆助手</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-[220px]">
                我可以帮你基于企业记忆问答、提炼经验、追溯证据和治理入库
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
              placeholder="问企业记忆、提炼经验、追溯来源..."
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

export default function KnowledgePage({ accountType }: KnowledgePageProps) {
  const [filter, setFilter] = useState<string>('全部');

  const filtered = memorySources.filter(source => filter === '全部' || source.type === filter);
  const filters = ['全部', '文档', '项目记忆', 'Skill经验', '连接器', '制度'];

  return (
    <div className="h-full grid grid-cols-[minmax(760px,1fr)_380px] bg-main-bg overflow-hidden">
      <main className="min-w-0 overflow-y-auto">
        <div className="px-6 py-5 border-b border-border-light bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
                <Layers3 className="w-3.5 h-3.5" strokeWidth={1.6} />
                企业记忆库 · 全局知识与项目经验沉淀
              </div>
              <h1 className="text-[20px] font-semibold text-text tracking-tight">企业记忆库</h1>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-text-secondary">
                通过上传文档和沉淀项目记忆，形成可视化、可问答、可提炼、可治理的企业记忆平台。
              </p>
            </div>
            <button className="h-8 px-3 rounded-lg bg-zinc-950 text-white text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-800 transition-colors">
              <Upload className="w-3.5 h-3.5" strokeWidth={2} />
              上传 / 接入资料
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '有效记忆', value: '9,671', icon: BookOpen },
              { label: '项目候选', value: '42', icon: Sparkles },
              { label: '待审核', value: '13', icon: ShieldCheck },
              { label: '受限索引', value: '89', icon: LockKeyhole },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-border-light bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-text-muted">{item.label}</span>
                    <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
                  </div>
                  <div className="text-[24px] font-semibold leading-none text-text">{item.value}</div>
                </div>
              );
            })}
          </div>

          <CapabilityMatrix />

          <section className="grid grid-cols-[minmax(0,1fr)_315px] gap-4">
            <div className="rounded-lg border border-border-light bg-white overflow-hidden">
              <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <BookOpen className="w-4 h-4" strokeWidth={1.6} />
                  企业记忆图谱
                </div>
                <span className="text-[11px] text-text-muted">文档、项目、Skill 与连接器关系</span>
              </div>
              <div className="h-[320px]">
                <KnowledgeGraph />
              </div>
            </div>

            <div className="rounded-lg border border-border-light bg-white overflow-hidden">
              <div className="h-11 px-4 flex items-center gap-2 border-b border-border-light text-[13px] font-semibold text-text">
                <GitBranch className="w-4 h-4" strokeWidth={1.6} />
                记忆入库路径
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {pipeline.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
                            <Icon className="w-4 h-4" strokeWidth={1.7} />
                          </div>
                          {index < pipeline.length - 1 && <div className="w-px h-8 bg-border-light" />}
                        </div>
                        <div className="pt-0.5">
                          <div className="text-[13px] font-medium text-text">{step.label}</div>
                          <div className="mt-0.5 text-[12px] text-text-secondary">{step.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border-light bg-white overflow-hidden">
            <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                <Sparkles className="w-4 h-4" strokeWidth={1.6} />
                项目记忆候选
              </div>
              <span className="text-[11px] text-text-muted">由 ProjectAgent 提炼，OrgAgent 治理入库</span>
            </div>
            <div className="divide-y divide-border-light">
              {memoryCandidates.map(candidate => (
                <div key={candidate.title} className="px-4 py-3 grid grid-cols-[1fr_120px_88px_92px] gap-4 items-center">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-text truncate">{candidate.title}</div>
                    <div className="mt-1 text-[12px] text-text-secondary leading-relaxed">{candidate.summary}</div>
                    <div className="mt-1 text-[11px] text-text-muted">来源：{candidate.source}</div>
                  </div>
                  <span className="text-[12px] text-text-secondary">{candidate.status}</span>
                  <span className="text-[12px] text-text-secondary">风险：{candidate.risk}</span>
                  <button className="h-8 rounded-lg border border-border-light text-[12px] text-text-secondary hover:border-zinc-300 hover:text-text transition-colors">
                    审核
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-[1fr_1fr] gap-4">
            <QaScenarioPanel />
            <MemoryHealthPanel />
          </section>

          <section className="rounded-lg border border-border-light bg-white overflow-hidden">
            <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                <Database className="w-4 h-4" strokeWidth={1.6} />
                记忆来源
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Filter className="w-3.5 h-3.5" strokeWidth={1.6} />
                来源筛选
              </div>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-border-light">
              {filters.map(item => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`h-7 px-3 rounded-lg text-[11px] transition-colors ${
                    filter === item
                      ? 'bg-zinc-950 text-white'
                      : 'bg-zinc-50 text-text-secondary hover:bg-zinc-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              {filtered.map(source => (
                <MemorySourceCard key={source.id} source={source} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <OrgMemoryPanel accountType={accountType} />
    </div>
  );
}
