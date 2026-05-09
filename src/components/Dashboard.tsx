import { useState } from 'react';
import {
  FolderOpen, CheckCircle2, Zap,
  Send, BrainCircuit, Sparkles, Wrench, Database,
  FileText, X,
} from 'lucide-react';
import type { AccountType } from '../App';
import { workLines } from '../data/mockData';

interface DashboardProps {
  accountType?: AccountType;
}

/* ─── Agent 对话区（AgentPanel 玻璃态样式） ─── */
function AgentChatPanel({ name, badge, welcomeText, placeholder, attachedContexts = [], onRemoveContext }: {
  name: string; badge: string; welcomeText: string; placeholder: string;
  attachedContexts?: string[];
  onRemoveContext?: (ctx: string) => void;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean; contexts?: string[] }[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const handleSend = () => {
    if (!input.trim() && attachedContexts.length === 0) return;
    const displayText = attachedContexts.length > 0
      ? `${attachedContexts.map(c => `@${c}`).join(' ')} ${input}`
      : input;
    setMessages(prev => [...prev, { text: displayText, isUser: true, contexts: attachedContexts }]);
    setInput('');
  };

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-primary/20 overflow-hidden">
        <button
          onClick={() => setCollapsed(false)}
          className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 hover:bg-primary/20 transition-colors"
        >
          <BrainCircuit className="w-5 h-5 text-primary-dark" strokeWidth={1.8} />
        </button>
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="h-[52px] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-semibold text-text text-sm tracking-tight">{name}</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              运行中 · {badge}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
              <h3 className="text-base font-semibold text-text tracking-tight mb-2">让我们一起高效协作</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-[220px]">
                你可以问我任何问题——我可以帮你查找项目、Skill 或直接开始一个新任务
              </p>
            </div>
            {/* 快捷操作 */}
            <div className="pb-3">
              <div className="text-[10px] text-text-muted mb-1.5">快捷操作</div>
              <div className="flex gap-2">
                {[
                  { label: '新建任务', icon: Sparkles },
                  { label: '查找 Skill', icon: Wrench },
                  { label: '查项目', icon: Database },
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
            {/* Welcome */}
            <div className="flex gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-full bg-primary-subtle flex items-center justify-center text-[10px] font-bold text-primary-dark shrink-0 mt-0.5">
                {name === 'HubAgent' ? 'H' : 'O'}
              </div>
              <div className="bg-bg rounded-2xl rounded-tl-sm px-4 py-2.5 text-[12px] text-text-secondary border border-border-light max-w-[85%]">
                {welcomeText}
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

      {/* Attached Context Tags */}
      {attachedContexts.length > 0 && (
        <div className="px-3 pt-2 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {attachedContexts.map((ctx, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary-dark text-[11px] rounded-md">
                <FileText className="w-3 h-3" strokeWidth={1.5} />
                @{ctx}
                <button
                  onClick={() => onRemoveContext?.(ctx)}
                  className="ml-0.5 hover:text-primary transition-colors"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="flex items-end gap-2 bg-white/60 rounded-xl px-3 py-2 shadow-sm focus-within:border-primary/20 focus-within:ring-2 focus-within:ring-primary/5 transition-all border border-transparent">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-xs text-text py-1"
            style={{ minHeight: '20px' }}
          />
          <button
            onClick={handleSend}
            className="p-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shrink-0 shadow-sm shadow-primary/20"
          >
            <Send className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Member 首页 ─── */
function MemberDashboard() {
  const totalTokens = '1.7M';
  const activeProjects = 1;
  const successRate = '98%';

  const projectTokens = [
    { name: '供应链金融风控', tokens: '981K', pct: 100, trend: 'up' },
  ];

  const weekData = [12, 18, 15, 22, 28, 35, 30];
  const maxWeek = Math.max(...weekData);

  const [attachedContexts, setAttachedContexts] = useState<string[]>([]);

  const handleAttachContext = (projectName: string) => {
    const ctx = `${projectName} · 记忆.md`;
    if (!attachedContexts.includes(ctx)) {
      setAttachedContexts(prev => [...prev, ctx]);
    }
  };

  const handleRemoveContext = (ctx: string) => {
    setAttachedContexts(prev => prev.filter(c => c !== ctx));
  };

  return (
    <div className="h-full flex">
      {/* 左侧数据看板 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: '本月 Token', value: totalTokens, icon: Zap, color: 'text-primary' },
              { label: '活跃项目', value: activeProjects.toString(), icon: FolderOpen, color: 'text-info' },
              { label: '任务成功率', value: successRate, icon: CheckCircle2, color: 'text-success' },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-border-light p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                    <span className="text-[11px] text-text-muted">{card.label}</span>
                  </div>
                  <div className="text-xl font-bold text-text">{card.value}</div>
                </div>
              );
            })}
          </div>

          {/* 项目 Token 消耗 */}
          <div className="bg-white rounded-xl border border-border-light p-4 mb-6">
            <h3 className="text-[13px] font-semibold text-text mb-3">项目 Token 消耗概览</h3>
            <div className="space-y-3">
              {projectTokens.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[12px] text-text w-32 truncate">{p.name}</span>
                  <span className="text-[12px] text-text-secondary w-14">{p.tokens}</span>
                  <span className="text-[11px] text-text-muted w-8">{p.pct}%</span>
                  <div className="flex-1 bg-border-light rounded-full h-[5px]">
                    <div className="h-[5px] rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
                  </div>
                  <span className={`text-[11px] ${p.trend === 'up' ? 'text-success' : 'text-text-muted'}`}>
                    {p.trend === 'up' ? '↑' : '→'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 近 7 日走势 */}
          <div className="bg-white rounded-xl border border-border-light p-4 mb-6">
            <h3 className="text-[13px] font-semibold text-text mb-3">近 7 日 Token 消耗走势</h3>
            <div className="flex items-end gap-2 h-28">
              {weekData.map((v, i) => {
                const h = (v / maxWeek) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-border-light rounded-t-sm relative" style={{ height: `${h * 0.8}px` }}>
                      <div className="absolute inset-0 bg-primary/50 rounded-t-sm" />
                    </div>
                    <span className="text-[9px] text-text-muted">
                      {['一', '二', '三', '四', '五', '六', '日'][i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 项目上下文记忆 */}
          <div className="bg-white rounded-xl border border-border-light p-4">
            <h3 className="text-[13px] font-semibold text-text mb-3">项目上下文记忆</h3>
            <div className="space-y-2">
              {workLines.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleAttachContext(project.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-bg transition-colors text-left group"
                >
                  <FileText className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" strokeWidth={1.5} />
                  <span className="text-[12px] text-text-secondary group-hover:text-text transition-colors">
                    {project.name} · 记忆.md
                  </span>
                  <span className="ml-auto text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    点击 @ 引用
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧 HubAgent */}
      <div className="w-[380px] shrink-0 pt-12 pr-4 pb-14">
        <AgentChatPanel
          name="HubAgent"
          badge="个人全局"
          welcomeText="你好，samhar。今天有 1 个审批待处理：供应链项目 · 外部 API 调用"
          placeholder="问 HubAgent..."
          attachedContexts={attachedContexts}
          onRemoveContext={handleRemoveContext}
        />
      </div>
    </div>
  );
}

/* ─── Admin 首页 ─── */
function AdminDashboard() {
  const totalTokens = '12.4M';
  const activeMembers = 8;
  const activeProjects = 3;

  const members = [
    { name: 'samhar', role: 'Member', projects: ['供应链金融风控平台'], tokenUsage: '1.2M' },
  ];

  const weekData = [18.5, 19.2, 20.1, 21.0, 22.3, 23.4, 24.1];
  const maxWeek = Math.max(...weekData);

  const [attachedContexts, setAttachedContexts] = useState<string[]>([]);

  const handleAttachContext = (projectName: string) => {
    const ctx = `${projectName} · 记忆.md`;
    if (!attachedContexts.includes(ctx)) {
      setAttachedContexts(prev => [...prev, ctx]);
    }
  };

  const handleRemoveContext = (ctx: string) => {
    setAttachedContexts(prev => prev.filter(c => c !== ctx));
  };

  return (
    <div className="h-full flex">
      {/* 左侧数据看板 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: '全组织 Token', value: totalTokens, icon: Zap, color: 'text-primary' },
              { label: '活跃成员', value: activeMembers.toString(), icon: FolderOpen, color: 'text-info' },
              { label: '活跃项目', value: activeProjects.toString(), icon: CheckCircle2, color: 'text-success' },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-border-light p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                    <span className="text-[11px] text-text-muted">{card.label}</span>
                  </div>
                  <div className="text-xl font-bold text-text">{card.value}</div>
                </div>
              );
            })}
          </div>

          {/* 成员概览 */}
          <div className="bg-white rounded-xl border border-border-light p-4 mb-6">
            <h3 className="text-[13px] font-semibold text-text mb-3">成员概览</h3>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-text-muted border-b border-border-light">
                  <th className="text-left py-2 font-medium">成员</th>
                  <th className="text-left py-2 font-medium">负责项目</th>
                  <th className="text-left py-2 font-medium">本月消耗</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={i} className="border-b border-border-light/50 hover:bg-bg transition-colors">
                    <td className="py-2.5 text-text font-medium">{m.name}</td>
                    <td className="py-2.5 text-text-secondary">{m.projects.join('、')}</td>
                    <td className="py-2.5 text-text-secondary">{m.tokenUsage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 全组织费用趋势 */}
          <div className="bg-white rounded-xl border border-border-light p-4 mb-6">
            <h3 className="text-[13px] font-semibold text-text mb-3">全组织费用趋势</h3>
            <div className="flex items-end gap-2 h-28">
              {weekData.map((v, i) => {
                const h = (v / maxWeek) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-border-light rounded-t-sm relative" style={{ height: `${h * 0.8}px` }}>
                      <div className="absolute inset-0 bg-primary/50 rounded-t-sm" />
                    </div>
                    <span className="text-[9px] text-text-muted">
                      {['一', '二', '三', '四', '五', '六', '日'][i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 项目上下文记忆 */}
          <div className="bg-white rounded-xl border border-border-light p-4">
            <h3 className="text-[13px] font-semibold text-text mb-3">项目上下文记忆</h3>
            <div className="space-y-2">
              {workLines.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleAttachContext(project.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-bg transition-colors text-left group"
                >
                  <FileText className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" strokeWidth={1.5} />
                  <span className="text-[12px] text-text-secondary group-hover:text-text transition-colors">
                    {project.name} · 记忆.md
                  </span>
                  <span className="ml-auto text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    点击 @ 引用
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧 OrgAgent */}
      <div className="w-[380px] shrink-0 pt-12 pr-4 pb-14">
        <AgentChatPanel
          name="OrgAgent"
          badge="全组织"
          welcomeText="本周组织摘要：\n· 1 个活跃项目，1 个成员参与\n· 供应链金融风控平台效率最高（ROI 1.5x）"
          placeholder="问 OrgAgent..."
          attachedContexts={attachedContexts}
          onRemoveContext={handleRemoveContext}
        />
      </div>
    </div>
  );
}

export default function Dashboard({ accountType = 'member' }: DashboardProps) {
  return accountType === 'admin' ? <AdminDashboard /> : <MemberDashboard />;
}
