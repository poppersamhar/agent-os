import { useState, useRef } from 'react';
import {
  Send, Hexagon, TrendingUp, Users, BarChart3, Network,
  ChevronRight, Zap, CheckCircle2,
} from 'lucide-react';

/* ─── 工具函数 ─── */
function formatToken(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return Math.floor(n / 1000) + 'K';
  return String(n);
}

/* ─── 数据看板 ─── */
function DataDashboard() {
  const [activeView, setActiveView] = useState<'team' | 'member' | 'usage' | 'graph'>('team');

  const teamData = [
    { name: '供应链部', status: '正常', statusColor: 'bg-success', usagePct: '34%' },
    { name: '智能客服组', status: '预警', statusColor: 'bg-warning', usagePct: '17%' },
    { name: '数据平台', status: '正常', statusColor: 'bg-success', usagePct: '29%' },
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-border-light">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-light">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">组织概览</span>
        </div>
        <button className="text-[11px] text-text-muted hover:text-text transition-colors">全屏</button>
      </div>

      <div className="shrink-0 flex border-b border-border-light">
        {[
          { key: 'team' as const, label: '团队' },
          { key: 'member' as const, label: '成员' },
          { key: 'usage' as const, label: '消耗' },
          { key: 'graph' as const, label: '图谱' },
        ].map(tab => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`flex-1 py-2.5 text-[12px] transition-all border-b-2 ${
                isActive ? 'text-primary border-primary font-medium' : 'text-text-secondary border-transparent hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeView === 'team' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {teamData.map(t => (
                <div key={t.name} className="flex items-center gap-4">
                  <span className="text-[13px] text-text w-24">{t.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.statusColor}`} />
                    <span className="text-text-secondary">{t.status}</span>
                  </span>
                  <span className="text-[12px] text-text-muted ml-auto">{t.usagePct}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border-light">
              <div className="text-xs font-semibold text-text mb-3">全组织消耗走势</div>
              <div className="flex items-end gap-2 h-32">
                {[320, 380, 350, 420, 390, 450, 410].map((v, i) => {
                  const max = 500;
                  const pct = (v / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full bg-border-light rounded-t-md relative" style={{ height: `${pct * 1.2}px` }}>
                        <div className="absolute inset-0 bg-primary/80 rounded-t-md" style={{ opacity: 0.6 + (i * 0.05) }} />
                      </div>
                      <span className="text-[10px] text-text-muted">{['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-3">
                {['7日', '30日', '季度'].map(p => (
                  <button key={p} className="text-[11px] text-text-muted hover:text-text transition-colors">{p}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView !== 'team' && (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted">
            <Network className="w-8 h-8 mb-2 opacity-30" strokeWidth={1.2} />
            <p className="text-[11px]">{activeView === 'member' ? '成员视图' : activeView === 'usage' ? '消耗视图' : '图谱视图'} 开发中</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 主组件 ─── */
export default function OrgAgentPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([
    {
      text: '本周组织执行摘要已生成：\n· 5 支团队合计完成 42 个任务，成功率 97%\n· 供应链部 Token 消耗同比增 18%，属正常增长\n· 智能客服组预算消耗偏快，建议关注\n· 2 个跨团队潜在协作机会已识别\n\n[查看完整报告]',
      isUser: false,
    },
  ]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, isUser: true }]);
    setInput('');
    // 模拟 OrgAgent 回复
    setTimeout(() => {
      setMessages(prev => [...prev, {
        text: '智能客服组本月已消耗预算 82%，还有 9 天。主要消耗来源：FAQ 优化项目（占 67%）。建议：可考虑暂缓低优先级子任务，或申请追加预算。\n\n[查看该团队详情] [调整预算]',
        isUser: false,
      }]);
    }, 800);
  };

  return (
    <div className="h-full flex">
      {/* 左侧：对话区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-[52px] flex items-center justify-between px-5 border-b border-border-light shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Hexagon className="w-4.5 h-4.5 text-primary-dark" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="font-semibold text-text text-sm tracking-tight">OrgAgent</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
                运行中
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              {!msg.isUser && (
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                  <Hexagon className="w-4 h-4 text-primary-dark" strokeWidth={1.8} />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed max-w-[80%] whitespace-pre-wrap ${
                msg.isUser
                  ? 'bg-primary-subtle text-primary-dark rounded-tr-sm'
                  : 'bg-bg text-text-secondary rounded-tl-sm border border-border-light'
              }`}>
                {msg.text.split('\n').map((line, li) => {
                  if (line.startsWith('[查看') || line.startsWith('[调整')) {
                    const items = line.replace('[', '').replace(']', '').split('] [');
                    return (
                      <div key={li} className="flex items-center gap-2 mt-2">
                        {items.map((item, ii) => (
                          <button key={ii} className="text-[11px] text-primary hover:underline">[{item}]</button>
                        ))}
                      </div>
                    );
                  }
                  return <div key={li}>{line}</div>;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-border-light">
          <div className="flex items-end gap-2 bg-white/60 rounded-xl px-3 py-2 shadow-sm border border-border-light focus-within:border-primary/30 transition-all">
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
              placeholder="问 OrgAgent... (@ 团队 / 成员 / 项目)"
              rows={1}
              className="bizagent-textarea flex-1 bg-transparent resize-none outline-none text-[13px] text-text py-1"
              style={{ minHeight: '20px' }}
            />
            <button
              onClick={handleSend}
              className="p-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shrink-0 shadow-sm shadow-primary/20"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* 右侧：数据看板 */}
      <div className="w-[380px] shrink-0 pt-12 pr-4 pb-14">
        <DataDashboard />
      </div>
    </div>
  );
}
