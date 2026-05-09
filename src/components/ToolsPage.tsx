import { useState } from 'react';
import {
  Plus, Plug, Send, BrainCircuit, Sparkles,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import type { AccountType } from '../App';

interface Tool {
  id: string;
  name: string;
  type: 'MCP' | 'API' | '其他';
  description: string;
  status: 'connected' | 'disconnected' | 'needs_reauth';
  calls: number;
  cost: string;
  lastUsed: string;
}

const tools: Tool[] = [
  { id: 't1', name: '企查查', type: 'MCP', description: '企业工商信息、信用数据查询', status: 'connected', calls: 142, cost: '$186', lastUsed: '2h ago' },
  { id: 't2', name: 'Jira', type: 'API', description: '创建、查询、更新工单', status: 'disconnected', calls: 0, cost: '—', lastUsed: '—' },
  { id: 't3', name: 'GitHub', type: 'API', description: '代码仓库、Issue、PR 管理', status: 'connected', calls: 156, cost: '—', lastUsed: '昨天' },
  { id: 't4', name: 'Notion', type: 'API', description: '页面读写、数据库查询', status: 'needs_reauth', calls: 0, cost: '—', lastUsed: '3天前' },
  { id: 't5', name: '企业搜索', type: 'MCP', description: '跨系统文档、邮件、聊天记录搜索', status: 'connected', calls: 3102, cost: '$24', lastUsed: '刚刚' },
  { id: 't6', name: 'SMTP Server', type: '其他', description: '企业邮箱发送格式化邮件', status: 'connected', calls: 678, cost: '—', lastUsed: '1h ago' },
];

interface ToolsPageProps {
  accountType: AccountType;
}

function ToolCard({ tool }: { tool: Tool }) {
  const statusConfig = {
    connected: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: '已连接' },
    disconnected: { icon: XCircle, color: 'text-text-muted', bg: 'bg-text-muted/10', label: '未连接' },
    needs_reauth: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10', label: '需重新授权' },
  };
  const cfg = statusConfig[tool.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-border-light p-4 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center text-primary">
            <Plug className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-text">{tool.name}</div>
            <div className="text-[11px] text-text-muted">{tool.type}</div>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className="w-3 h-3" strokeWidth={2} /> {cfg.label}
        </span>
      </div>
      <p className="text-[12px] text-text-secondary mb-3">{tool.description}</p>
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>本月调用 {tool.calls} 次{tool.cost !== '—' ? ` · 费用 ${tool.cost}` : ''}</span>
        <span>上次使用 {tool.lastUsed}</span>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button className="px-2.5 py-1 rounded-md border border-border hover:bg-bg text-[11px] text-text-secondary transition-colors">管理</button>
        {tool.status === 'connected' ? (
          <button className="px-2.5 py-1 rounded-md border border-border hover:bg-bg text-[11px] text-text-secondary transition-colors">断开</button>
        ) : (
          <button className="px-2.5 py-1 rounded-md bg-primary text-white hover:bg-primary-dark text-[11px] transition-colors">连接</button>
        )}
      </div>
    </div>
  );
}

function HubAgentToolsPanel() {
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
          <h2 className="font-semibold text-text text-sm tracking-tight">HubAgent</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            工具管理
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
            <h3 className="text-base font-semibold text-text tracking-tight mb-2">工具管理中心</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[220px]">
              告诉我你想连接什么工具，我可以帮你完成配置
            </p>
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
            placeholder="描述你想连接的工具..."
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

export default function ToolsPage({ accountType }: ToolsPageProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = tools.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  return (
    <div className="h-full flex">
      {/* 左侧 Tool 列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-text">Tools</h1>
            <span className="text-[11px] text-text-muted">v0.2.0 支持添加工具</span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {['all', 'MCP', 'API', '其他'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${filter === f ? 'bg-primary-subtle text-primary-dark font-medium' : 'text-text-secondary hover:bg-bg'}`}
              >
                {f === 'all' ? '全部' : f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filtered.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </div>

      {/* 右侧 HubAgent */}
      <div className="w-[380px] shrink-0 pt-12 pr-4 pb-14">
        <HubAgentToolsPanel />
      </div>
    </div>
  );
}
