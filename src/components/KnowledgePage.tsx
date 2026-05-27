import { useState } from 'react';
import {
  Send, BrainCircuit, Sparkles, BookOpen, Database,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import type { AccountType } from '../App';
import KnowledgeGraph from './KnowledgeGraph';

interface KnowledgeSource {
  id: string;
  name: string;
  type: '内部' | '第三方' | 'MCP' | 'API';
  description: string;
  status: 'connected' | 'disconnected';
  entries: number;
}

const knowledgeSources: KnowledgeSource[] = [
  { id: 'k1', name: '企业知识库', type: '内部', description: '规章制度、应急预案、技术文档', status: 'connected', entries: 1240 },
  { id: 'k2', name: '项目知识沉淀', type: '内部', description: '所有项目任务上下文自动汇总', status: 'connected', entries: 356 },
  { id: 'k3', name: '供应链数据库', type: '第三方', description: '供应商信息、合同数据', status: 'connected', entries: 89 },
  { id: 'k4', name: '企查查 MCP', type: 'MCP', description: '企业工商信息、信用数据', status: 'connected', entries: 5600 },
  { id: 'k5', name: '外部评级数据', type: 'API', description: '行业报告、评级数据', status: 'disconnected', entries: 0 },
  { id: 'k6', name: '数字员工经验', type: '内部', description: 'Skill 执行日志与最佳实践', status: 'connected', entries: 2100 },
];

interface KnowledgePageProps {
  accountType: AccountType;
}

function KnowledgeSourceCard({ source }: { source: KnowledgeSource }) {
  const statusConfig = {
    connected: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: '已接入' },
    disconnected: { icon: XCircle, color: 'text-text-muted', bg: 'bg-text-muted/10', label: '未接入' },
  };
  const cfg = statusConfig[source.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-border-light p-4 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center text-primary">
            <Database className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-text">{source.name}</div>
            <div className="text-[11px] text-text-muted">{source.type}</div>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className="w-3 h-3" strokeWidth={2} /> {cfg.label}
        </span>
      </div>
      <p className="text-[12px] text-text-secondary mb-2">{source.description}</p>
      <div className="text-[11px] text-text-muted">
        {source.entries > 0 ? `${source.entries.toLocaleString()} 条知识条目` : '暂无数据'}
      </div>
    </div>
  );
}

function OrgAgentKnowledgePanel() {
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
            知识库管理
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
            <h3 className="text-base font-semibold text-text tracking-tight mb-2">知识库管理中心</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[220px]">
              问我任何问题，我可以帮你搜索知识库、生成培训材料或分析知识缺口
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
            placeholder="搜索知识库或询问..."
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

export default function KnowledgePage({ accountType }: KnowledgePageProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = knowledgeSources.filter(s => {
    if (filter === 'all') return true;
    return s.type === filter;
  });

  return (
    <div className="h-full flex">
      {/* 左侧内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-text">知识库</h1>
            <span className="text-[11px] text-text-muted">全局知识资产总览</span>
          </div>

          {/* 全局知识图谱 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-[13px] font-medium text-text">全局知识图谱</span>
              </div>
              <span className="text-[10px] text-text-muted">双击节点查看详情 · 滚轮缩放 · 拖拽平移</span>
            </div>
            <div className="w-full aspect-[16/9] rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white overflow-hidden">
              <KnowledgeGraph />
            </div>
          </div>

          {/* 筛选 */}
          <div className="flex items-center gap-2 mb-4">
            {['all', '内部', '第三方', 'MCP', 'API'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${filter === f ? 'bg-primary-subtle text-primary-dark font-medium' : 'text-text-secondary hover:bg-bg'}`}
              >
                {f === 'all' ? '全部' : f}
              </button>
            ))}
          </div>

          {/* 知识源列表 */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(source => (
              <KnowledgeSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      </div>

      {/* 右侧 OrgAgent */}
      <div className="w-[380px] shrink-0 pt-12 pr-4 pb-14">
        <OrgAgentKnowledgePanel />
      </div>
    </div>
  );
}
