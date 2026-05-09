import { useState, useRef, useEffect } from 'react';
import {
  Send, PanelRightOpen, PanelRightClose, ChevronDown, ChevronRight,
  FileText, Database, Network, Clock, CheckCircle2, AlertTriangle,
  X, Plus, AtSign, Slash, Download, Eye, BarChart3, Maximize2,
  MessageSquare,
} from 'lucide-react';
import { dataItems, subAgents, taskTokenEntries } from '../data/mockData';
import type { ChatMessage, DataItem } from '../data/mockData';

/* ─── 工具函数 ─── */
function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colors: Record<string, string> = { s: 'bg-emerald-500', b: 'bg-blue-500', a: 'bg-amber-500', k: 'bg-rose-500', c: 'bg-purple-500', l: 'bg-cyan-500' };
  const bg = colors[initial.toLowerCase()] || 'bg-gray-400';
  return (
    <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center text-white text-[11px] font-semibold shrink-0`}>
      {initial}
    </div>
  );
}

function BotAvatar() {
  return (
    <img
      src="/accio-icon.png"
      alt="Accio"
      className="w-7 h-7 rounded-full shrink-0 object-contain bg-white"
    />
  );
}

/* ─── 数据链接 ─── */
function DataLink({ item, isSelected, onClick }: { item: DataItem; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg transition-colors ${
        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-text-muted'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span className="text-[12px] flex-1 truncate">{item.title}</span>
    </button>
  );
}

/* ─── 任务树面板 ─── */
function TaskTreePanel({ taskId }: { taskId: string }) {
  const taskEntry = taskTokenEntries.find(t => t.id === taskId);
  const taskSubs = taskEntry ? subAgents.filter(w => taskEntry.subAgentIds.includes(w.id)) : [];
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">任务树</span>
            <button onClick={() => setExpanded(!expanded)} className="text-text-muted hover:text-text transition-colors">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />}
            </button>
          </div>
          <span className="text-[11px] text-text-muted">供应商信用评估 Q4</span>
        </div>
      </div>
      {expanded && (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* MyAgent 协调 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <BotAvatar />
              <span className="text-[12px] font-medium text-text">MyAgent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              <span className="text-[10px] text-text-muted">协调中</span>
            </div>
            <div className="ml-9 space-y-2">
              {taskSubs.map(w => (
                <div key={w.id} className="flex items-start gap-2">
                  <div className="w-px h-full bg-border-light mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'completed' ? 'bg-success' : w.status === 'running' ? 'bg-primary' : w.status === 'waiting' ? 'bg-text-muted' : 'bg-warning'}`} />
                      <span className="text-[11px] font-medium text-text">[{w.name}]</span>
                      <span className="text-[10px] text-text-muted">
                        {w.status === 'completed' ? '完成' : w.status === 'running' ? '运行中' : w.status === 'waiting' ? '等待中' : '暂停'}
                      </span>
                    </div>
                    {w.tools.length > 0 && (
                      <div className="text-[10px] text-text-muted mt-0.5">{w.tools.join(' · ')}</div>
                    )}
                    {w.duration !== '—' && (
                      <div className="text-[10px] text-text-muted mt-0.5">{w.duration} · {w.tokenUsed > 0 ? `${w.tokenUsed} tok` : ''}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Token 进度 */}
          <div className="mt-4 pt-3 border-t border-border-light">
            <div className="text-[11px] text-text-muted mb-1">
              消耗：{taskEntry?.totalTokens.toLocaleString() || 0} / 预计 {taskEntry?.estimatedTokens.toLocaleString() || 0} tok
            </div>
            <div className="bg-border-light rounded-full h-[5px]">
              <div className="h-[5px] rounded-full bg-primary" style={{ width: `${taskEntry ? (taskEntry.totalTokens / taskEntry.estimatedTokens) * 100 : 0}%` }} />
            </div>
          </div>

          <button className="mt-3 text-[11px] text-primary hover:underline">查看完整 Trace</button>
        </div>
      )}
    </div>
  );
}

/* ─── 图谱面板 ─── */
function GraphPanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <div>
          <span className="text-sm font-semibold text-text">知识图谱</span>
          <span className="text-[11px] text-success ml-2">实时更新</span>
        </div>
        <button className="text-[11px] text-text-muted hover:text-text transition-colors">
          <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex-1 p-4">
        <div className="bg-bg rounded-xl border border-border-light h-full flex flex-col items-center justify-center text-center p-4">
          <Network className="w-8 h-8 text-text-muted/30 mb-2" strokeWidth={1.2} />
          <p className="text-[11px] text-text-muted">图谱可视化区域</p>
          <p className="text-[10px] text-text-muted/60 mt-1">亮色：本次新增节点 · 灰色：已有实体</p>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-border-light">
        <div className="text-[11px] text-text mb-1">本次执行</div>
        <div className="text-[11px] text-text-secondary">新增实体 4 个 · 新增关系 6 条</div>
        <button className="mt-2 text-[11px] text-primary hover:underline">查看完整图谱</button>
      </div>
    </div>
  );
}

/* ─── 文件面板 ─── */
function FilePanel() {
  const files = [
    { name: '供应商交易记录 Q3.xlsx', size: '2.3MB' },
    { name: '上季度信用评估报告.pdf', size: '1.1MB' },
    { name: '应收账款风险标准 v2.docx', size: '340KB' },
  ];
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border-light">
        <span className="text-sm font-semibold text-text">文件</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-primary font-medium">{f.name.split('.').pop()?.toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-text truncate">{f.name}</div>
              <div className="text-[10px] text-text-muted">{f.size}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 右侧面板 ─── */
function RightPanel({ taskId }: { taskId: string }) {
  const [activeTab, setActiveTab] = useState<'tree' | 'graph' | 'file'>('tree');
  return (
    <div className="h-full flex flex-col bg-white border-l border-border-light">
      <div className="shrink-0 flex border-b border-border-light">
        {[
          { key: 'tree' as const, label: '任务树', icon: BarChart3 },
          { key: 'graph' as const, label: '图谱', icon: Network },
          { key: 'file' as const, label: '文件', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] transition-all border-b-2 ${
                isActive ? 'text-primary border-primary font-medium' : 'text-text-secondary border-transparent hover:text-text'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0">
        {activeTab === 'tree' && <TaskTreePanel taskId={taskId} />}
        {activeTab === 'graph' && <GraphPanel />}
        {activeTab === 'file' && <FilePanel />}
      </div>
    </div>
  );
}

/* ─── Sub-Agent 分身折叠卡片 ─── */
function SubAgentCard({ name, content, duration, onExpand }: { name: string; content: string; duration: string; onExpand?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="ml-10">
      <div className="bg-bg rounded-xl p-3 border border-border-light">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-text">[{name}] 分身汇报</span>
            <CheckCircle2 className="w-3 h-3 text-success" strokeWidth={1.5} />
            <span className="text-[10px] text-text-muted">{duration}</span>
          </div>
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{content}</p>
        {!expanded && (
          <button
            onClick={() => { setExpanded(true); onExpand?.(); }}
            className="mt-2 text-[11px] text-primary hover:underline"
          >
            展开完整详情
          </button>
        )}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-border-light space-y-1.5">
            <div className="text-[11px] text-text-secondary">Tool 调用：SQL Tool</div>
            <div className="text-[11px] text-text-secondary">输入：SELECT * FROM suppliers WHERE status = 'active'</div>
            <div className="text-[11px] text-text-secondary">输出：47 条记录</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 审批中断卡片 ─── */
function ApprovalCard({ onApprove, onSkip }: { onApprove?: () => void; onSkip?: () => void }) {
  return (
    <div className="ml-10">
      <div className="bg-warning-subtle rounded-xl p-4 border border-warning/20">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⏸</span>
          <span className="text-[13px] font-medium text-text">等待审批</span>
        </div>
        <div className="space-y-1.5 mb-4">
          <div className="text-[12px] text-text-secondary">操作：调用企查查信用 API</div>
          <div className="text-[12px] text-text-secondary">查询：47 家供应商 · 预估费用 $240</div>
          <div className="text-[12px] text-text-secondary">审批人：samhar（此项目负责人）</div>
          <div className="text-[12px] text-text-secondary">已通知：飞书消息 · 14:23 发送</div>
          <div className="text-[12px] text-text-secondary">预计响应：24h 内</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] hover:bg-primary-dark transition-colors shadow-sm">催审批</button>
          <button className="px-3 py-1.5 border border-border rounded-lg text-[11px] text-text-secondary hover:bg-bg transition-colors">跳过此步骤</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 任务完成汇报 ─── */
function CompletionReport() {
  return (
    <div className="ml-10">
      <div className="bg-success-subtle rounded-xl p-4 border border-success/20">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.5} />
          <span className="text-[13px] font-medium text-text">任务完成</span>
        </div>
        <div className="mb-4">
          <div className="text-[12px] text-text-secondary mb-2">Q4 供应商信用评估报告已生成。</div>
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-medium text-text mb-1">📊 执行摘要</div>
              <div className="space-y-0.5 text-[11px] text-text-secondary">
                <div>· 评估供应商：47 家（头部 20 家已优先处理）</div>
                <div>· 高风险标记：3 家（天合光能 52分 · 振华重工 58分 · 某某物流 45分）</div>
                <div>· 数据覆盖率：94%（2 家数据不足，已标注）</div>
                <div>· 总耗时：2h 14min · 消耗：18.4K tokens</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-text mb-1">📁 产出物</div>
              <div className="space-y-1">
                {[
                  '供应商信用评估 Q4 报告.pdf',
                  '高风险供应商预警列表.xlsx',
                  'Q4 关键指标监控仪表盘',
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-text-muted" strokeWidth={1.5} />
                    <span className="text-[11px] text-primary">{f}</span>
                    <button className="text-[10px] text-text-muted hover:text-text">下载</button>
                    <button className="text-[10px] text-text-muted hover:text-text">预览</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-text mb-1">✦ 图谱更新</div>
              <div className="text-[11px] text-text-secondary">新增实体 24 个 · 新增关系 31 条 · 3 家高风险供应商已标记为「风险实体」</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-success/20">
          <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] hover:bg-primary-dark transition-colors shadow-sm">提交给 samhar 审核</button>
          <button className="px-3 py-1.5 border border-border rounded-lg text-[11px] text-text-secondary hover:bg-bg transition-colors">导出报告</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 消息气泡 ─── */
function MessageBubble({ msg, selectedDataItemId, onSelectDataItem }: {
  msg: ChatMessage;
  selectedDataItemId: string | null;
  onSelectDataItem: (id: string | null) => void;
}) {
  const isHuman = msg.role === 'human';
  const isHost = msg.role === 'host';
  const msgDataItems = msg.metadata?.dataItemIds?.map(id => dataItems.find(d => d.id === id)).filter(Boolean) as DataItem[] | undefined;

  // 用户消息
  if (isHuman) {
    return (
      <div className="flex flex-col items-end" data-message-id={msg.id}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-text-muted/60">{msg.timestamp}</span>
          <span className="text-[11px] text-text">{msg.senderName}</span>
          <UserAvatar name={msg.senderName} />
        </div>
        <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] text-text leading-relaxed max-w-[75%]">
          {msg.content}
        </div>
        <div className="flex items-center gap-3 mt-1.5 mr-1">
          <button className="text-[10px] text-text-muted/50 hover:text-text-muted transition-colors">Retry</button>
          <button className="text-[10px] text-text-muted/50 hover:text-text-muted transition-colors">复制</button>
        </div>
      </div>
    );
  }

  // MyAgent / Agent / Skill 消息
  return (
    <div className="flex gap-3" data-message-id={msg.id}>
      {isHost ? <BotAvatar /> : (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] shrink-0">
          {msg.senderName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-text">{msg.senderName}</span>
          {msg.senderName === 'MyAgent' && <span className="text-[10px] text-text-muted">· 代 samhar 发布</span>}
        </div>
        <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
        {msgDataItems && msgDataItems.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {msgDataItems.map(item => (
              <DataLink
                key={item.id}
                item={item}
                isSelected={selectedDataItemId === item.id}
                onClick={() => onSelectDataItem(selectedDataItemId === item.id ? null : item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 主组件 ─── */
interface GroupChatPageProps {
  chatName: string;
  messages: ChatMessage[];
  taskId?: string;
}

export default function GroupChatPage({ chatName, messages, taskId = 't1' }: GroupChatPageProps) {
  const [input, setInput] = useState('');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedDataItemId, setSelectedDataItemId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部群聊信息栏 */}
      <div className="h-12 shrink-0 flex items-center justify-between px-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold text-text tracking-tight">{chatName}</h1>
          <div className="flex -space-x-1">
            {['S', 'K'].map((m, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-primary-subtle border border-white flex items-center justify-center text-[8px] font-bold text-primary-dark">
                {m}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-text-muted">2 members</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted">
            由 samhar 通过 MyAgent 创建 · 2024-01-15 14:20
          </span>
          <button className="text-[11px] text-primary hover:underline">直接联系 samhar →</button>
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1.5 hover:bg-bg rounded-lg transition-colors text-text-muted"
          >
            {rightCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex-1 flex min-h-0">
        {/* 消息区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* MyAgent 首条任务消息 */}
            <div className="flex gap-3">
              <BotAvatar />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-medium text-text">MyAgent</span>
                  <span className="text-[10px] text-text-muted">· 代 samhar 发布</span>
                </div>
                <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
                  samhar 说：Q4 供应商评估报告需要本周五前完成，优先看头部 20 家，重点关注应收账款风险。
                </div>
                <div className="mt-3 bg-bg rounded-xl p-4 border border-border-light">
                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] font-medium text-text mb-1.5">📁 相关文件</div>
                      <div className="space-y-1">
                        {['供应商交易记录 Q3.xlsx', '上季度信用评估报告.pdf', '应收账款风险标准 v2.docx'].map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-text-muted" strokeWidth={1.5} />
                            <span className="text-[11px] text-primary">{f}</span>
                            <button className="text-[10px] text-text-muted hover:text-text">打开</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-text mb-1.5">📊 相关数据源</div>
                      <div className="space-y-1 text-[11px] text-text-secondary">
                        <div>· 供应链数据库（已连接）</div>
                        <div>· 企查查 MCP（调用时需审批）</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-text mb-1.5">✦ 图谱关联</div>
                      <div className="text-[11px] text-text-secondary">
                        · 发现 3 个相关实体：天合光能 · 应收账款 · 信用评分模型
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-text mb-1.5">📋 任务拆解建议</div>
                      <div className="space-y-1 text-[11px] text-text-secondary">
                        <div>1. 数据清洗与标准化（预计 30 分钟）</div>
                        <div>2. 信用评分计算（预计 2 小时）</div>
                        <div>3. 报告生成与审核（预计 1 小时）</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-light flex items-center justify-end gap-2">
                    <button className="px-3 py-1.5 border border-border rounded-lg text-[11px] text-text-secondary hover:bg-bg transition-colors">直接联系 samhar</button>
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] hover:bg-primary-dark transition-colors shadow-sm">开始执行</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Agent 卡片示例 */}
            <SubAgentCard
              name="数据清洗"
              content="处理了 47 家供应商数据，发现异常 2 处。天合光能 Q1-Q3 数据存在缺口，已标注。"
              duration="3.2s"
            />

            {/* 审批中断 */}
            <ApprovalCard />

            {/* 任务完成汇报 */}
            <CompletionReport />

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                selectedDataItemId={selectedDataItemId}
                onSelectDataItem={setSelectedDataItemId}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 底部输入区 */}
          <div className="shrink-0 px-4 py-3 border-t border-gray-100">
            <div className="flex items-end gap-2 bg-bg rounded-xl px-3 py-2 border border-border-light focus-within:border-primary/30 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message... (@ 提及成员 / 文件 / 数据源)"
                rows={1}
                className="bizagent-textarea flex-1 bg-transparent resize-none outline-none text-[13px] text-text py-1"
                style={{ minHeight: '20px' }}
              />
              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-bg rounded-lg text-text-muted transition-colors" title="上传文件">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button className="p-1.5 hover:bg-bg rounded-lg text-text-muted transition-colors" title="@提及">
                  <AtSign className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button className="p-1.5 hover:bg-bg rounded-lg text-text-muted transition-colors" title="指令">
                  <Slash className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <div className="w-px h-5 bg-border-light mx-1" />
                <span className="text-[11px] text-text-muted px-1">全群 ▼</span>
                <button
                  onClick={handleSend}
                  className="p-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧面板 */}
        {!rightCollapsed && (
          <div className="w-[320px] shrink-0">
            <RightPanel taskId={taskId} />
          </div>
        )}
      </div>
    </div>
  );
}
