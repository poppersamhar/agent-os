import { useState, useRef } from 'react';
import {
  Send, BrainCircuit, Sparkles, Wrench, CheckCircle2,
  Database, Terminal, Search, BarChart3, MessageSquare,
  ClipboardList, Mail, FileText, ShieldCheck, TrendingUp,
  Users, Check, X, MessageCircle, ChevronRight, Clock,
  AlertTriangle,
} from 'lucide-react';
import { skills } from '../data/mockData';
import type { Skill, UserRole } from '../data/mockData';

const skillIconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  's1': Database, 's2': Terminal, 's3': Search, 's4': BarChart3,
  's5': MessageSquare, 's6': ClipboardList, 's7': Mail, 's8': FileText,
};

/* ─── Skill 详情子组件 ─── */
function SkillDetailPanel({ skill }: { skill: Skill }) {
  const categoryLabels: Record<string, string> = {
    knowledge: '知识工程', governance: '数据治理', analysis: '分析', tool: '通用工具',
  };
  const SkillIcon = skillIconMap[skill.id] || FileText;
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <SkillIcon className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-text">{skill.name}</span>
        <span className={`text-[10px] px-2 py-[2px] rounded-full font-medium ${skill.enabled ? 'bg-success-subtle text-success' : 'bg-text-muted/10 text-text-muted'}`}>
          {skill.enabled ? '已启用' : '已停用'}
        </span>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed mb-3">{skill.description}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[{ label: skill.source }, { label: skill.version }, { label: skill.author }, { label: `${skill.scopeCount} 个项目` }, { label: categoryLabels[skill.category] }]
          .map((t, i) => <span key={i} className="text-[10px] bg-bg text-text-muted px-2 py-[2px] rounded-md border border-border-light">{t.label}</span>)}
      </div>
      <div className="border-t border-border-light my-3" />
      <div className="text-xs font-medium text-text mb-2">执行步骤</div>
      <div className="space-y-0">
        {skill.steps && skill.steps.length > 0 ? skill.steps.map((step, idx) => (
          <div key={step.order} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-5 h-5 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary-subtle">
                <span className="text-[9px] font-bold text-primary-dark">{step.order}</span>
              </div>
              {idx < skill.steps!.length - 1 && <div className="w-px flex-1 bg-border-light min-h-[16px] my-0.5" />}
            </div>
            <div className="pb-3">
              <div className="text-xs font-medium text-text leading-5">{step.name}</div>
              <div className="text-[11px] text-text-muted leading-relaxed">{step.description}</div>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-4 text-text-muted">
            <CheckCircle2 className="w-6 h-6 mb-1 opacity-30" strokeWidth={1.5} />
            <p className="text-[11px]">暂无执行步骤说明</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 团队 Tab（协作感知层）─── */
function TeamTab() {
  const [activeSection, setActiveSection] = useState<'dispatch' | 'approval'>('dispatch');
  const teamNotifications = [
    { id: 1, from: 'samhar', action: '向你派发了新任务', task: '供应商评估 Q4', time: '10 分钟前', type: 'dispatch' as const },
  ];
  const approvals = [
    { id: 1, user: 'chen', agent: 'MyAgent', action: '外部 API 调用', cost: '$240', project: '供应链项目', time: '2 小时前' },
  ];
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3">
      {/* 我的团队动态 */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-text mb-2">我的团队动态</div>
        {teamNotifications.map(n => (
          <div key={n.id} className="bg-bg rounded-xl p-3 border border-border-light mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-medium text-text">{n.from} {n.action}</span>
            </div>
            <p className="text-[11px] text-text-secondary mb-1">{n.task} · {n.time}</p>
            <button className="text-[11px] text-primary hover:underline">查看任务</button>
          </div>
        ))}
      </div>

      {/* 我负责的项目审批 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text">我负责的项目审批 ({approvals.length})</span>
        </div>
        {approvals.map(a => (
          <div key={a.id} className="bg-bg rounded-xl p-3 border border-border-light mb-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span className="text-[11px] font-medium text-text">{a.user} · {a.agent}</span>
            </div>
            <p className="text-[11px] text-text-secondary mb-0.5">{a.action}{a.cost ? ` · 预估 ${a.cost}` : ''}</p>
            <p className="text-[10px] text-text-muted mb-2">{a.project} · {a.time}</p>
            <div className="flex items-center gap-2">
              <button className="text-[10px] px-2 py-1 rounded-md bg-primary text-white hover:bg-primary-dark transition-colors">批准</button>
              <button className="text-[10px] px-2 py-1 rounded-md border border-border hover:bg-bg transition-colors text-text-secondary">拒绝</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 快捷操作 ─── */
function QuickActions({ onAction }: { onAction: (text: string) => void }) {
  const actions = [
    { label: '新建任务', icon: Sparkles },
    { label: '查找 Skill', icon: Wrench },
    { label: '查项目', icon: Database },
  ];
  return (
    <div className="px-4 pb-3">
      <div className="text-[10px] text-text-muted mb-1.5">快捷操作</div>
      <div className="flex gap-2">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => onAction(a.label)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-bg rounded-lg border border-border-light hover:border-primary/30 transition-colors text-[11px] text-text-secondary"
          >
            <a.icon className="w-3 h-3" strokeWidth={1.5} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── 主组件 ─── */
interface AgentPanelProps {
  accountType: UserRole;
  activeView: string;
  selectedSkillId?: string | null;
}

export default function AgentPanel({ accountType, activeView, selectedSkillId }: AgentPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'myagent' | 'team'>('myagent');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedSkill = selectedSkillId ? skills.find(s => s.id === selectedSkillId) : null;

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, isUser: true }]);
    setInput('');
  };

  const handleQuickAction = (action: string) => {
    setMessages(prev => [...prev, { text: action, isUser: true }]);
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

  const getPlaceholder = () => {
    if (activeView === 'skill' && selectedSkill) return `输入针对 ${selectedSkill.name} 的指令...`;
    if (activeTab === 'team') return '搜索团队动态...';
    return '问我任何问题...';
  };

  return (
    <div className="h-full flex flex-col rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="h-[52px] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="w-4.5 h-4.5 text-primary-dark" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-semibold text-text text-sm tracking-tight">MyAgent</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className={`w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot`} />
              运行中
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-bg rounded-lg transition-colors text-text-muted"
            title="折叠"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 px-4 pb-2">
        <div className="flex bg-bg rounded-xl p-0.5">
          <button
            onClick={() => setActiveTab('myagent')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'myagent'
                ? 'bg-white text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            MyAgent
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all relative ${
              activeTab === 'team'
                ? 'bg-white text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            团队
            {/* 角标：有审批或派发任务时显示 */}
            <span className="absolute top-0.5 right-2 w-1.5 h-1.5 rounded-full bg-danger" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative">
        {activeTab === 'myagent' ? (
          <>
            {/* ── 空状态 ── */}
            {messages.length === 0 && !selectedSkill && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
                <h3 className="text-base font-semibold text-text tracking-tight mb-2">
                  让我们一起高效协作
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed max-w-[220px]">
                  你可以问我任何问题——我可以帮你查找项目、Skill 或直接开始一个新任务
                </p>
              </div>
            )}

            {/* ── 消息列表 ── */}
            {messages.length > 0 && (
              <div className="space-y-3 pt-2 px-4">
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

            {/* ── Skill 详情 ── */}
            {activeView === 'skill' && selectedSkill && (
              <div className="px-4 pt-2">
                <SkillDetailPanel skill={selectedSkill} />
              </div>
            )}

            {/* ── 快捷操作 ── */}
            {activeView === 'home' && messages.length === 0 && (
              <QuickActions onAction={handleQuickAction} />
            )}
          </>
        ) : (
          <TeamTab />
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="flex items-end gap-2 bg-white/60 rounded-xl px-3 py-2 shadow-sm focus-within:border-primary/20 focus-within:ring-2 focus-within:ring-primary/5 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={getPlaceholder()}
            rows={1}
            className="bizagent-textarea flex-1 bg-transparent resize-none outline-none text-xs text-text py-1"
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
