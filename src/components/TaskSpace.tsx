import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import {
  Send, PanelRightOpen, PanelRightClose,
  FileText, CheckCircle2, AlertTriangle,
  X, Brain, Sparkles,
  ChevronDown, ChevronUp, Bot,
  BarChart3, Zap, Lightbulb,
  FileSpreadsheet, Presentation,
  GitBranch,
  Cpu, Database, Code, Terminal,
  Loader2, Lock,
  MoreVertical, Pin, Archive, Pencil, Check,
  Upload, BookOpen, Plus, Download, Maximize2, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import type { Project, Chat } from '../data/mockData';
import { WorkAgentClient, createSession, listSkills } from '../api/workagent';
import type { AgentMessage, ExecutionMode, Skill } from '../types/workagent';
import KnowledgeGraph from './KnowledgeGraph';

/* ─── 下载辅助函数 ─── */
async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    // 降级：直接打开链接
    window.open(url, '_blank');
  }
}

async function downloadAllAsZip(artifacts: Array<{ name: string; url: string }>, zipName: string) {
  const zip = new JSZip();
  await Promise.all(
    artifacts.map(async (a) => {
      try {
        const response = await fetch(a.url);
        const blob = await response.blob();
        zip.file(a.name, blob);
      } catch {
        zip.file(a.name + '.txt', `无法下载: ${a.url}`);
      }
    })
  );
  const content = await zip.generateAsync({ type: 'blob' });
  const blobUrl = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

/* ─── KodaX-inspired 类型定义 ─── */
type ToolCategory = 'file' | 'shell' | 'repo' | 'agent' | 'skill';

interface TaskMessage {
  id: string;
  type: 'member' | 'workagent' | 'subagent' | 'approval' | 'failure' | 'completion' | 'plan' | 'question' | 'system' | 'permission' | 'skill';
  senderName: string;
  content: string;
  timestamp: string;
  metadata?: {
    subAgentName?: string;
    duration?: string;
    estimatedCost?: number;
    files?: string[];
    steps?: PlanStep[];
    reportTitle?: string;
    reportSummary?: string;
    reportDetail?: ReportDetail;
    toolCategory?: ToolCategory;
    permissionType?: 'bash' | 'edit' | 'dispatch';
    skills?: string[];
    artifactUrl?: string;
    // ── Completion 详情 ──
    themeColor?: string;
    pages?: number;
    style?: string;
    slideStructure?: Array<{ page: number; type: string; title: string }>;
    previewImage?: string;
    fileSize?: string;
    responseTime?: string;
    // ── Demo / Reasoning ──
    reasoning?: {
      text: string;
      duration?: number;
    };
  };
}

interface PlanStep {
  step: number;
  name: string;
  tool: string;
  status?: 'pending' | 'running' | 'completed' | 'skipped';
  category?: ToolCategory;
}

/* ─── Agent 编排链路节点 ─── */
interface AgentOrchestrationNode {
  id: string;
  agentName: string;
  agentType: 'subagent' | 'skill';
  status: 'pending' | 'running' | 'completed' | 'skipped';
  description: string;
  skills: string[];
  duration?: string;
}

interface ReportDetail {
  title: string;
  sections: ReportSection[];
}

interface ReportSection {
  title: string;
  content: string;
  charts?: ChartData[];
}

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar';
  title: string;
  data: { label: string; value: number; color?: string }[];
}

/* ─── 工具类别图标映射 (KodaX风格) ─── */
function ToolCategoryIcon({ category }: { category?: ToolCategory }) {
  switch (category) {
    case 'file': return <FileText className="w-3 h-3 text-text-muted" strokeWidth={1.5} />;
    case 'shell': return <Terminal className="w-3 h-3 text-text-muted" strokeWidth={1.5} />;
    case 'repo': return <Database className="w-3 h-3 text-text-muted" strokeWidth={1.5} />;
    case 'agent': return <Bot className="w-3 h-3 text-text-muted" strokeWidth={1.5} />;
    case 'skill': return <Sparkles className="w-3 h-3 text-text-muted" strokeWidth={1.5} />;
    default: return <Code className="w-3 h-3 text-text-muted" strokeWidth={1.5} />;
  }
}

/* ─── Token 使用指示器（输入框底部紧凑版 · 环形） ─── */
function TokenUsageCompact({ used, total }: { used: number; total: number }) {
  const pct = Math.min((used / total) * 100, 100);
  const r = 7;
  const c = 2 * Math.PI * r;
  const dash = c * (pct / 100);
  const color = pct > 90 ? '#1a1a1a' : pct > 70 ? '#888888' : '#b0b0b0';

  return (
    <div className="flex items-center gap-1.5" title={`Context: ${used.toFixed(1)}K / ${total}K`}>
      <span className="text-[10px] text-text-muted">{used.toFixed(1)}K / {total}K</span>
      <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
        {/* 轨道 */}
        <circle cx="9" cy="9" r={r} fill="none" stroke="#f2f2f2" strokeWidth="2.5" />
        {/* 进度 */}
        <circle
          cx="9" cy="9" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 9 9)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
    </div>
  );
}

/* ─── Agent 编排链路 ─── */
function AgentOrchestration({ nodes }: { nodes: AgentOrchestrationNode[] }) {
  return (
    <div className="space-y-0">
      {nodes.map((node, i) => (
        <div key={node.id} className="flex items-start gap-2">
          {/* 状态指示器 + 连线 */}
          <div className="flex flex-col items-center pt-0.5">
            {node.status === 'completed' ? (
              <div className="w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Check className="w-2 h-2 text-white" strokeWidth={3} />
              </div>
            ) : node.status === 'running' ? (
              <div className="w-3.5 h-3.5 rounded-full border border-accent flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
            )}
            {i < nodes.length - 1 && (
              <div className="w-px h-full min-h-[16px] bg-border" />
            )}
          </div>

          {/* Agent 信息 */}
          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-medium text-text">{node.agentName}</span>
              {node.duration && (
                <span className="text-[9px] text-text-muted">{node.duration}</span>
              )}
            </div>
            <p className="text-[10px] text-text-secondary leading-relaxed mb-1">
              {node.description}
            </p>
            {node.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {node.skills.map((skill, j) => (
                  <span key={j} className="text-[9px] px-1.5 py-0.5 bg-bg rounded border border-border-light text-text-muted">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── 权限请求卡片 (KodaX Permission Control) ─── */
function PermissionRequestCard({ msg, onApprove, onReject }: {
  msg: TaskMessage;
  onApprove: () => void;
  onReject: () => void;
}) {
  const typeLabels: Record<string, string> = {
    bash: '执行 Shell 命令',
    edit: '修改文件',
    dispatch: '派生子 Agent',
  };
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-bg flex items-center justify-center shrink-0 border border-border">
        <Lock className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-medium text-text">WorkAgent</span>
          <span className="text-[10px] text-text-muted font-medium">· 等待授权</span>
        </div>
        <div className="bg-bg rounded-xl p-4 border border-border">
          <div className="text-[12px] text-text mb-3">
            <span className="font-medium">{typeLabels[msg.metadata?.permissionType || 'bash']}</span>
            <span className="text-text-secondary"> — {msg.content}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] hover:bg-primary-dark transition-colors font-medium"
            >
              允许执行
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 bg-white text-text rounded-lg text-[11px] hover:bg-bg transition-colors border border-border-light"
            >
              拒绝
            </button>
            <button className="px-3 py-1.5 bg-white text-text rounded-lg text-[11px] hover:bg-bg transition-colors border border-border-light">
              允许本次会话
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 流式执行指示器 ─── */
function StreamingIndicator({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <WorkAgentAvatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-text">WorkAgent</span>
          <span className="text-[10px] text-primary">· 思考中</span>
          <Loader2 className="w-3 h-3 text-primary animate-spin" strokeWidth={2} />
        </div>
        <div className="text-[13px] text-text leading-relaxed">
          {text}
          <span className="inline-block w-1.5 h-3.5 bg-primary/60 ml-0.5 animate-pulse align-middle" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AI SDK Elements — Reasoning Component System
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   AI SDK Elements — Reasoning (minimal)
   ═══════════════════════════════════════════════ */

interface ReasoningContextValue {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
}

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null);

function useReasoning() {
  const ctx = React.useContext(ReasoningContext);
  if (!ctx) throw new Error('useReasoning must be used within <Reasoning>');
  return ctx;
}

interface ReasoningProps {
  children: React.ReactNode;
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
}

function Reasoning({
  children,
  isStreaming = false,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  duration: controlledDuration,
}: ReasoningProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [startTime] = useState(Date.now());
  const [computedDuration, setComputedDuration] = useState<number | undefined>(undefined);

  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setIsOpen = (value: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (isStreaming && !isOpen) setIsOpen(true);
  }, [isStreaming, isOpen]);

  useEffect(() => {
    if (!isStreaming && computedDuration === undefined) {
      setComputedDuration((Date.now() - startTime) / 1000);
    }
  }, [isStreaming, startTime, computedDuration]);

  const duration = controlledDuration !== undefined ? controlledDuration : computedDuration;

  return (
    <ReasoningContext.Provider value={{ isStreaming, isOpen, setIsOpen, duration }}>
      {children}
    </ReasoningContext.Provider>
  );
}

function ReasoningTrigger() {
  const { isStreaming, isOpen, setIsOpen, duration } = useReasoning();

  const displayDuration = duration !== undefined
    ? `${duration < 1 ? (duration * 1000).toFixed(0) + 'ms' : duration.toFixed(1) + 's'}`
    : null;

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text transition-colors group"
    >
      <Brain className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} />
      <span>
        {isStreaming ? 'Thinking' : `Thought for ${displayDuration}`}
      </span>
      {isStreaming && (
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
        </span>
      )}
      <span className="ml-1.5 text-text-muted group-hover:text-text transition-colors">
        {isOpen ? (
          <ChevronUp className="w-3 h-3" strokeWidth={2} />
        ) : (
          <ChevronDown className="w-3 h-3" strokeWidth={2} />
        )}
      </span>
    </button>
  );
}

function ReasoningContent({ children }: { children: React.ReactNode }) {
  const { isOpen, isStreaming } = useReasoning();
  if (!isOpen) return null;
  return (
    <div className="mt-2 pl-3 border-l-2 border-primary/20 overflow-hidden">
      <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
        {children}
        {isStreaming && (
          <span className="inline-block w-1 h-3.5 bg-primary/50 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

/* ─── 头像组件 ─── */
function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
      {initial}
    </div>
  );
}

function WorkAgentAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-bg flex items-center justify-center shrink-0 border border-border">
      <Bot className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
    </div>
  );
}

function SubAgentAvatar({ name: _name }: { name?: string }) {
  return (
    <div className="w-6 h-6 rounded-full bg-bg flex items-center justify-center shrink-0 border border-border">
      <Zap className="w-3 h-3 text-text-muted" strokeWidth={2} />
    </div>
  );
}

/* ─── Member 消息 ─── */
function MemberMessage({ msg }: { msg: TaskMessage }) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] text-text-muted">{msg.timestamp}</span>
        <span className="text-[11px] text-text font-medium">{msg.senderName}</span>
        <UserAvatar name={msg.senderName} />
      </div>
      <div className="bg-primary-subtle text-primary-dark rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] leading-relaxed max-w-[78%]">
        {msg.content}
      </div>
    </div>
  );
}

/* ─── WorkAgent 追问卡片（Kollab 风格需求澄清） ─── */
function QuestionMessage({ msg, onAnswer }: { msg: TaskMessage; onAnswer?: (answer: string) => void }) {
  const [answered, setAnswered] = useState(false);
  return (
    <div className="flex gap-3">
      <WorkAgentAvatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-medium text-text">{msg.senderName}</span>
          <span className="text-[10px] text-primary font-medium">· 需求澄清</span>
          <Lightbulb className="w-3 h-3 text-primary" strokeWidth={2} />
        </div>
        <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
        {!answered && onAnswer && msg.metadata?.steps && (
          <div className="flex flex-wrap gap-2 mt-3">
            {msg.metadata.steps.map((step, i) => (
              <button
                key={i}
                onClick={() => { onAnswer(step.name); setAnswered(true); }}
                className="px-3 py-1.5 bg-white rounded-lg text-[12px] text-text hover:bg-primary-subtle hover:text-primary-dark transition-colors border border-border-light"
              >
                {step.name}
              </button>
            ))}
          </div>
        )}
        {answered && (
          <div className="text-[11px] text-text-muted mt-2">已回复，继续分析中...</div>
        )}
      </div>
    </div>
  );
}

/* ─── WorkAgent 普通消息（支持 Reasoning） ─── */
function WorkAgentMessage({ msg }: { msg: TaskMessage }) {
  const hasReasoning = !!msg.metadata?.reasoning;

  return (
    <div className="flex gap-3">
      <WorkAgentAvatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-text">{msg.senderName}</span>
          <span className="text-[10px] text-text-muted">· 编排者</span>
        </div>

        {/* Reasoning Panel */}
        {hasReasoning && (
          <Reasoning
            isStreaming={false}
            defaultOpen={false}
          >
            <ReasoningTrigger />
            <ReasoningContent>{msg.metadata!.reasoning!.text}</ReasoningContent>
          </Reasoning>
        )}

        {/* Main content */}
        <div className={`text-[13px] text-text leading-relaxed whitespace-pre-wrap ${hasReasoning ? 'mt-3' : ''}`}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

/* ─── 方案确认卡片 ─── */
function PlanConfirmCard({ steps, onConfirm }: { steps: PlanStep[]; onConfirm: () => void }) {
  return (
    <div className="flex gap-3">
      <WorkAgentAvatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-medium text-text">WorkAgent</span>
          <span className="text-[10px] text-text-muted">· 执行方案</span>
        </div>
        <div className="bg-bg rounded-xl p-4 border border-border-light">
          <div className="text-[13px] text-text mb-3">需求已明确，我将按以下方案执行：</div>
          <div className="space-y-2.5 mb-4">
            {steps.map((s) => (
              <div key={s.step} className="flex items-start gap-3 text-[12px]">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0 mt-0.5">
                  {s.step}
                </span>
                <div className="flex-1">
                  <div className="text-text font-medium">{s.name}</div>
                  <div className="text-text-muted text-[11px]">→ {s.tool}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onConfirm} className="px-4 py-1.5 bg-primary text-white rounded-lg text-[11px] hover:bg-primary-dark transition-colors shadow-sm font-medium">
            确认方案，开始执行
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-Agent 折叠汇报卡片 ─── */
function SubAgentMessage({ msg, onClick }: { msg: TaskMessage; onClick?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const toolMap: Record<string, { skills: string; category: ToolCategory }> = {
    '数据采集': { skills: 'WebCrawler Skill · 数据清洗 Skill', category: 'skill' },
    '价格分析': { skills: 'PriceCompare Skill · SQL Tool', category: 'repo' },
    '智能化评估': { skills: 'AIEval Skill · 企查查 MCP', category: 'agent' },
    '报告生成': { skills: 'ReportGen Skill · SlideCraft Skill', category: 'skill' },
  };
  const info = toolMap[msg.metadata?.subAgentName || ''];
  return (
    <div className="flex gap-3">
      <SubAgentAvatar name={msg.metadata?.subAgentName || 'Sub'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-medium text-text">[{msg.metadata?.subAgentName}] 分身汇报</span>
          <CheckCircle2 className="w-3 h-3 text-success" strokeWidth={2} />
          <span className="text-[10px] text-text-muted">{msg.metadata?.duration}</span>
        </div>
        <div className="bg-bg rounded-xl p-3 border border-border-light">
          <p className="text-[12px] text-text-secondary leading-relaxed">{msg.content}</p>
          {!expanded && (
            <button onClick={() => setExpanded(true)} className="mt-2 text-[11px] text-primary hover:underline flex items-center gap-1">
              <ChevronDown className="w-3 h-3" /> 展开执行详情
            </button>
          )}
          {expanded && (
            <div className="mt-2 pt-2 border-t border-border-light space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <ToolCategoryIcon category={info?.category} />
                <span className="text-text-muted">调用 Skill：</span>
                {info?.skills || 'Unknown Skill'}
              </div>
              <div className="text-[11px] text-text-secondary">
                <span className="text-text-muted">Token 消耗：</span>1.2K
              </div>
              <div className="text-[11px] text-text-secondary">
                <span className="text-text-muted">工具类别：</span>
                <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-white rounded border border-border-light">
                  <ToolCategoryIcon category={info?.category} />
                  {info?.category === 'skill' ? 'Skill 调用' : info?.category === 'repo' ? '数据查询' : info?.category === 'agent' ? 'Agent 控制' : '通用工具'}
                </span>
              </div>
              <button onClick={() => setExpanded(false)} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                <ChevronUp className="w-3 h-3" /> 收起
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 产出物预览浮窗 ─── */
function ArtifactPreview({ url, fileName, fileSize, onClose }: {
  url: string;
  fileName: string;
  fileSize?: string;
  onClose: () => void;
}) {
  const [isFull, setIsFull] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* 半透明毛玻璃背景 */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />

      {/* 浮窗 */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFull ? 'w-[98vw] h-[96vh]' : 'w-[900px] max-w-[92vw] h-[80vh] max-h-[700px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border-light bg-white"
        >
          <div className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
            >
              <span className="text-[10px] text-primary font-semibold">HTML</span>
            </div>
            <div>
              <div className="text-[13px] font-medium text-text">{fileName}</div>
              {fileSize && <div className="text-[10px] text-text-muted">HTML · {fileSize}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1"
          >
            <button
              onClick={() => window.open(url, '_blank')}
              className="p-2 hover:bg-bg rounded-lg text-text-muted transition-colors"
              title="下载"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setIsFull(!isFull)}
              className="p-2 hover:bg-bg rounded-lg text-text-muted transition-colors"
              title={isFull ? '退出全屏' : '全屏'}
            >
              <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-bg rounded-lg text-text-muted transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-h-0 bg-bg"
        >
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={fileName}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── 任务完成卡片（参考截图样式） ─── */
function CompletionMessage({ msg, onViewReport, onPreview }: { msg: TaskMessage; onViewReport?: () => void; onPreview?: (url: string, fileName: string, fileSize?: string) => void }) {
  const meta = msg.metadata;
  const hasRichData = meta?.slideStructure || meta?.themeColor || meta?.previewImage;

  return (
    <div className="flex gap-3">
      <WorkAgentAvatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-medium text-text">WorkAgent</span>
          <span className="text-[10px] text-success font-medium">· 任务完成</span>
          <CheckCircle2 className="w-3 h-3 text-success" strokeWidth={2} />
        </div>
        <div className="bg-gradient-to-r from-[#f8f8f8] to-white rounded-xl p-4 border border-border">
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={2} />
            <span className="text-[15px] font-semibold text-text">{meta?.reportTitle || '任务已完成'}</span>
          </div>

          {/* 元数据行 */}
          {hasRichData && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-secondary mb-4">
              {meta?.themeColor && (
                <span>
                  <span className="text-text-muted">主题色:</span>{' '}
                  <span className="text-text">{meta.themeColor}</span>
                </span>
              )}
              {meta?.pages && (
                <span>
                  <span className="text-text-muted">页数:</span>{' '}
                  <span className="text-text">{meta.pages} 页</span>
                </span>
              )}
              {meta?.style && (
                <span>
                  <span className="text-text-muted">风格:</span>{' '}
                  <span className="text-text">{meta.style}</span>
                </span>
              )}
            </div>
          )}

          {/* PPT 内容结构表格 */}
          {meta?.slideStructure && meta.slideStructure.length > 0 && (
            <div className="mb-4">
              <div className="text-[13px] font-semibold text-text mb-2">PPT 内容结构</div>
              <div className="rounded-lg border border-border-light overflow-hidden bg-white">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-bg border-b border-border-light">
                      <th className="px-3 py-1.5 text-left text-text-muted font-medium w-12">页码</th>
                      <th className="px-3 py-1.5 text-left text-text-muted font-medium w-20">类型</th>
                      <th className="px-3 py-1.5 text-left text-text-muted font-medium">主题</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.slideStructure.map((slide, i) => (
                      <tr key={i} className="border-b border-border-light last:border-b-0">
                        <td className="px-3 py-1.5 text-text">{slide.page}</td>
                        <td className="px-3 py-1.5 text-text-secondary">{slide.type}</td>
                        <td className="px-3 py-1.5 text-text">{slide.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 文件位置 + 预览 */}
          {meta?.artifactUrl && (
            <div className="mb-4">
              <div className="text-[13px] font-semibold text-text mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                文件位置
              </div>
              <div className="text-[11px] text-text-muted mb-2">预览链接:</div>
              <div
                onClick={() => onPreview?.(meta.artifactUrl!, meta.reportTitle || 'output', meta.fileSize)}
                className="rounded-xl border border-border-light overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all bg-white"
              >
                {meta.previewImage ? (
                  <img src={meta.previewImage} alt="preview" className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-bg flex items-center justify-center">
                    <Presentation className="w-8 h-8 text-text-muted/30" strokeWidth={1.2} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 产物文件列表 */}
          {(meta?.files || meta?.artifactUrl) && (
            <div className="mb-3">
              <div className="text-[11px] text-text-muted mb-1.5">产物</div>
              <div className="space-y-1">
                {meta.files?.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-border-light">
                    <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[9px] text-primary font-medium">{f.split('.').pop()?.toUpperCase().slice(0, 3) || 'FILE'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-text truncate">{f}</div>
                      {meta.fileSize && <div className="text-[10px] text-text-muted">{meta.fileSize}</div>}
                    </div>
                  </div>
                ))}
                {!meta.files?.length && meta.artifactUrl && (
                  <div
                    onClick={() => onPreview?.(meta.artifactUrl!, meta.reportTitle || 'output', meta.fileSize)}
                    className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-border-light cursor-pointer hover:border-primary/40 transition-all"
                  >
                    <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[9px] text-primary font-medium">HTML</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-text truncate">{meta.artifactUrl}</div>
                      {meta.fileSize && <div className="text-[10px] text-text-muted">{meta.fileSize}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 底部信息：响应耗时 + 时间戳 */}
          <CompletionFeedback timestamp={msg.timestamp} responseTime={meta?.responseTime} />
        </div>
      </div>
    </div>
  );
}

/* ─── 系统提示 ─── */
function SystemMessage({ msg }: { msg: TaskMessage }) {
  return (
    <div className="flex justify-center">
      <div className="text-[11px] text-text-muted bg-bg rounded-full px-3 py-1 border border-border-light">
        {msg.content}
      </div>
    </div>
  );
}

/* ─── 任务完成反馈条（Claude 风格赞踩） ─── */
function CompletionFeedback({ timestamp, responseTime }: { timestamp: string; responseTime?: string }) {
  const [show, setShow] = useState(true);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  if (!show) return null;

  return (
    <div className="flex items-center justify-between text-[10px] text-text-muted pt-2 border-t border-border">
      <div className="flex items-center gap-3">
        {responseTime && <span>响应耗时 {responseTime}</span>}
        <span>{timestamp}</span>
      </div>
      <div className="flex items-center gap-0">
        <span className="text-text-muted mr-2">任务结果有帮助吗？</span>
        <button
          onClick={() => setVote(vote === 'up' ? null : 'up')}
          className={`p-1.5 rounded-lg transition-colors ${vote === 'up' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg'}`}
          title="有帮助"
        >
          <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setVote(vote === 'down' ? null : 'down')}
          className={`p-1.5 rounded-lg transition-colors ${vote === 'down' ? 'bg-danger/10 text-danger' : 'text-text-muted hover:bg-bg'}`}
          title="没帮助"
        >
          <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <div className="w-px h-3 bg-border mx-1" />
        <button
          onClick={() => setShow(false)}
          className="p-1.5 text-text-muted hover:bg-bg rounded-lg transition-colors"
          title="关闭"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

/* ─── 会话操作菜单（三点） ─── */
function TaskMenu({
  onPin,
  onRename,
  onArchive,
  isPinned,
}: {
  onPin: () => void;
  onRename: () => void;
  onArchive: () => void;
  isPinned: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 hover:bg-bg rounded-lg transition-colors text-text-muted opacity-0 group-hover:opacity-100"
        title="更多操作"
      >
        <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-border-light shadow-lg py-1 z-50">
          <button
            onClick={() => { onPin(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-bg transition-colors flex items-center gap-2"
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-primary fill-primary' : ''}`} strokeWidth={1.5} />
            {isPinned ? '取消置顶' : '置顶会话'}
          </button>
          <button
            onClick={() => { onRename(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-bg transition-colors flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            重命名
          </button>
          <div className="mx-2 my-1 h-px bg-border-light" />
          <button
            onClick={() => { onArchive(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-[12px] text-danger hover:bg-danger/5 transition-colors flex items-center gap-2"
          >
            <Archive className="w-3.5 h-3.5" strokeWidth={1.5} />
            归档删除
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── 重命名弹窗 ─── */
function RenameDialog({ currentName, onConfirm, onCancel }: {
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(currentName);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-[400px] max-w-[90vw] p-5">
        <h3 className="text-[14px] font-semibold text-text mb-4">重命名会话</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onConfirm(name.trim()); } }}
          className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-[13px] text-text outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/5 transition-all"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-[12px] text-text-secondary bg-bg hover:bg-border/50 rounded-xl transition-colors border border-border">
            取消
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="px-4 py-2 text-[12px] bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   图谱 Tab — 三个子视图
   ═══════════════════════════════════════════════ */

type GraphSubTab = 'knowledge' | 'evolution';

/* ── 知识图谱子视图 ── */
function KnowledgeGraphView({ taskId }: { taskId: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div className="flex items-center justify-center py-2">
        <div
          className="w-full aspect-square rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white overflow-hidden cursor-zoom-in"
          onDoubleClick={() => setExpanded(true)}
        >
          <KnowledgeGraph projectId={taskId} />
        </div>
      </div>
      <p className="text-[11px] text-text-muted text-center mt-1">双击卡片全屏查看 · 滚轮缩放 · 拖拽平移</p>

      {/* 全屏预览 */}
      {expanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setExpanded(false)}>
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all"
            style={{ width: 'min(90vw, 900px)', height: 'min(85vh, 700px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border-light bg-white">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                <span className="text-[13px] font-semibold text-text">知识图谱</span>
              </div>
              <button onClick={() => setExpanded(false)} className="p-2 hover:bg-bg rounded-lg text-text-muted transition-colors">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <KnowledgeGraph projectId={taskId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── 上下文演化子视图 ── */
function ContextEvolutionView() {
  const versions = [
    {
      version: 'v5',
      time: '09:34',
      agent: 'SlideCraft',
      type: 'sub_agent' as const,
      changes: ['PPT 结构定义（15 页目录）', '产出文件路径：corbusier-ppt/index.html'],
    },
    {
      version: 'v4',
      time: '09:34',
      agent: 'ContentWriter',
      type: 'sub_agent' as const,
      changes: ['柯布西耶生平概要', '建筑理念 5 条', '代表作品 12 个', '影响流派 3 个'],
    },
    {
      version: 'v3',
      time: '09:33',
      agent: 'ThemeEngine',
      type: 'sub_agent' as const,
      changes: ['沙丘主题色 CSS 变量', '配色方案确认'],
    },
    {
      version: 'v2',
      time: '09:33',
      agent: 'WorkAgent',
      type: 'sub_agent' as const,
      changes: ['主题色确认：沙丘', '页数确认：15', '风格确认：建筑专业介绍'],
    },
    {
      version: 'v1',
      time: '09:32',
      agent: '用户',
      type: 'user' as const,
      changes: ['任务创建：生成柯布西耶 PPT'],
    },
  ];

  return (
    <div className="space-y-0">
      {versions.map((v, i) => (
        <div key={v.version} className="flex gap-3">
          {/* 时间轴轴线 */}
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              v.type === 'user' ? 'bg-[#3B82F6]' : 'bg-[#7C3AED]'
            }`} />
            {i < versions.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>

          {/* 内容卡片 */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-text">{v.version}</span>
              <span className="text-[10px] text-text-muted">{v.time}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                v.type === 'user'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-purple-50 text-purple-600'
              }`}>
                {v.agent}
              </span>
            </div>
            <div className="space-y-0.5">
              {v.changes.map((c, j) => (
                <div key={j} className="text-[11px] text-text-secondary flex items-start gap-1">
                  <span className="text-success mt-0.5">+</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 图谱 Tab 主容器 ── */
function GraphTab({ taskId }: { taskId: string }) {
  const [subTab, setSubTab] = useState<GraphSubTab>('knowledge');

  const subTabs: { key: GraphSubTab; label: string }[] = [
    { key: 'knowledge', label: '知识图谱' },
    { key: 'evolution', label: '上下文演化' },
  ];

  return (
    <div className="space-y-3">
      {/* 子 Tab 切换 */}
      <div className="flex items-center gap-1 bg-bg rounded-lg p-0.5">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 py-1.5 text-[11px] rounded-md transition-colors ${
              subTab === t.key ? 'bg-white text-text font-medium shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 子视图内容 */}
      {subTab === 'knowledge' && <KnowledgeGraphView taskId={taskId} />}
      {subTab === 'evolution' && <ContextEvolutionView />}
    </div>
  );
}

/* ─── 右侧面板 ─── */
function RightPanel({ taskId, projectId, project, dynamicSteps, reportDetail, onCloseReport, contextFiles = [], artifacts = [], agentOrchestration = [], onUploadContext }: {
  taskId: string;
  projectId?: string | null;
  project?: Project | null;
  dynamicSteps: PlanStep[];
  reportDetail: ReportDetail | null;
  onCloseReport: () => void;
  contextFiles?: string[];
  artifacts?: Array<{ name: string; url: string }>;
  agentOrchestration?: AgentOrchestrationNode[];
  onUploadContext?: (files: FileList) => void;
}) {
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'tree' | 'project' | 'graph'>('tree');
  const [graphExpanded, setGraphExpanded] = useState(false);

  const tabs = [
    { key: 'tree' as const, label: '任务树', icon: BarChart3 },
    ...(projectId ? [{ key: 'project' as const, label: '项目树', icon: FileSpreadsheet }] : []),
    { key: 'graph' as const, label: '图谱', icon: GitBranch },
  ];

  // 如果有报告详情，自动切换到任务树tab（报告嵌入在任务树中）
  useEffect(() => {
    if (reportDetail && activeTab !== 'graph') {
      setActiveTab('tree');
    }
  }, [reportDetail]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 flex border-b border-border-light">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] transition-all border-b-2 ${
                isActive ? 'text-accent border-accent font-medium' : 'text-text-secondary border-transparent hover:text-text'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
        {/* ── 任务树 Tab ── */}
        {activeTab === 'tree' && (
          <>
            {/* Agent 编排链路 */}
            <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-medium text-text">Agent 编排</span>
                <span className="text-[10px] text-text-muted">
                  {agentOrchestration.filter(n => n.status === 'completed').length}/{agentOrchestration.length}
                </span>
              </div>
              <AgentOrchestration nodes={agentOrchestration} />
            </div>

            {/* 上下文 卡片：任务的上传文件 */}
            <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-medium text-text">上下文</span>
                <button
                  onClick={() => contextFileInputRef.current?.click()}
                  className="text-[11px] text-text-secondary hover:text-text transition-colors flex items-center gap-1"
                  title="上传上下文文件"
                >
                  <Upload className="w-3 h-3" strokeWidth={1.5} />
                  上传
                </button>
                <input
                  type="file"
                  multiple
                  ref={contextFileInputRef}
                  onChange={(e) => { if (e.target.files?.length) onUploadContext?.(e.target.files); e.target.value = ''; }}
                  className="hidden"
                />
              </div>
              <div className="space-y-0.5">
                {contextFiles.length > 0 ? (
                  contextFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg transition-colors cursor-pointer">
                      <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
                        <span className="text-[8px] text-text-muted font-medium">{f.split('.').pop()?.toUpperCase().slice(0,3)}</span>
                      </div>
                      <span className="text-[12px] text-text truncate">{f}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <FileText className="w-4 h-4 text-text-muted/40 shrink-0" strokeWidth={1.5} />
                    <span className="text-[12px] text-text-muted">未附加文件</span>
                  </div>
                )}
              </div>
            </div>

            {/* 产物 卡片：第一个是 context.md，然后是其他产物 */}
            <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-medium text-text">产物</span>
                {artifacts.length > 0 && (
                  <button
                    onClick={() => downloadAllAsZip(artifacts, `artifacts-${Date.now()}.zip`)}
                    className="text-[11px] text-text-secondary hover:text-text transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" strokeWidth={1.5} />
                    打包下载
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {/* 第一个永远是 context.md */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg transition-colors cursor-pointer">
                  <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
                    <span className="text-[8px] text-text-muted font-medium">MD</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-text truncate">context.md</div>
                    <div className="text-[10px] text-text-muted">任务上下文文档</div>
                  </div>
                </div>
                {/* 其他产物 */}
                {artifacts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg transition-colors group">
                    <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
                      <span className="text-[8px] text-text-muted font-medium">{a.name.split('.').pop()?.toUpperCase().slice(0,3)}</span>
                    </div>
                    <span className="text-[12px] text-text truncate flex-1">{a.name}</span>
                    <button
                      onClick={() => downloadFile(a.url, a.name)}
                      className="p-1 hover:bg-primary/5 rounded text-text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="下载"
                    >
                      <Download className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 项目树 Tab ── */}
        {activeTab === 'project' && (
          <>
            {/* 上下文 卡片：项目下所有任务的 context.md，无上传 */}
            <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-medium text-text">上下文</span>
                <span className="text-[10px] text-text-muted">{project?.chats.length ?? 0} 个任务</span>
              </div>
              <div className="space-y-0.5">
                {project && project.chats.length > 0 ? (
                  project.chats.map((chat) => (
                    <div key={chat.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg transition-colors cursor-pointer">
                      <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
                        <span className="text-[8px] text-text-muted font-medium">MD</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-text truncate">{chat.name}/context.md</div>
                        <div className="text-[10px] text-text-muted">上下文文档</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <FileText className="w-4 h-4 text-text-muted/40 shrink-0" strokeWidth={1.5} />
                    <span className="text-[12px] text-text-muted">暂无任务</span>
                  </div>
                )}
              </div>
            </div>

            {/* 产物 卡片：项目全部产物 */}
            <div className="rounded-xl border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-medium text-text">产物</span>
                <button className="text-[11px] text-text-secondary hover:text-text transition-colors flex items-center gap-1">
                  <Download className="w-3 h-3" strokeWidth={1.5} /> 打包下载
                </button>
              </div>
              <div className="space-y-0.5">
                {[
                  { name: '风控报告_2026Q1.pdf', size: '1.8MB' },
                  { name: '供应商评估模型.ipynb', size: '45KB' },
                  { name: '贷后监控日报_0508.html', size: '320KB' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg transition-colors cursor-pointer group">
                    <div className="w-6 h-6 rounded bg-primary/5 flex items-center justify-center shrink-0">
                      <span className="text-[8px] text-text-muted font-medium">{a.name.split('.').pop()?.toUpperCase().slice(0,3)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-text truncate">{a.name}</div>
                      <div className="text-[10px] text-text-muted">{a.size}</div>
                    </div>
                    <button
                      onClick={() => console.log('[Download]', a.name)}
                      className="p-1 hover:bg-primary/5 rounded text-text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="下载"
                    >
                      <Download className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 图谱 Tab ── */}
        {activeTab === 'graph' && <GraphTab taskId={taskId} />}
      </div>
    </div>
  );
}

/* ─── 底部输入区 ─── */
function ChatInput({ onSend, disabled, tokenUsed = 18.5, tokenTotal = 20 }: { onSend: (text: string) => void; disabled?: boolean; tokenUsed?: number; tokenTotal?: number }) {
  const [input, setInput] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; name: string; type: string; preview?: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || disabled) return;
    let content = input.trim();
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map((f) => f.name).join(', ');
      content = content ? `${content}\n\n[附件: ${fileNames}]` : `[附件: ${fileNames}]`;
    }
    onSend(content);
    setInput('');
    setAttachedFiles([]);
    setShowAttachMenu(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachedFiles((prev) => [...prev, { id: `img_${Date.now()}_${Math.random()}`, type: 'image', preview: ev.target?.result as string, name: file.name }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        setAttachedFiles((prev) => [...prev, { id: `pdf_${Date.now()}_${Math.random()}`, type: 'pdf', name: file.name }]);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.type === 'application/pdf') {
        setAttachedFiles((prev) => [...prev, { id: `pdf_${Date.now()}_${Math.random()}`, type: 'pdf', name: file.name }]);
      }
    });
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <>
      {attachedFiles.length > 0 && (
        <div className="max-w-3xl mx-auto px-5 pt-2">
          <div className="flex gap-2 flex-wrap">
            {attachedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-1.5 bg-bg rounded-lg px-2 py-1.5 border border-border-light">
                {file.type === 'image' && file.preview ? (
                  <img src={file.preview} alt={file.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <FileText className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                )}
                <span className="text-[11px] text-text-secondary truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removeFile(file.id)} className="p-0.5 hover:bg-white rounded">
                  <X className="w-3 h-3 text-text-muted" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输入卡片 */}
      <div className="mx-4 mb-3">
        <div
          className={`rounded-2xl border transition-all relative ${disabled ? 'border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)]/30 opacity-60' : 'border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] focus-within:border-primary/30'} ${isDragging ? 'border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-primary-subtle/20' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* + 号下拉菜单 */}
          {showAttachMenu && (
            <div ref={menuRef} className="absolute bottom-full mb-2 left-0 bg-white rounded-xl border border-border-light shadow-lg p-1 z-20 w-52">
              <button
                onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg transition-colors flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Upload className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[12px] text-text font-medium">导入文件</div>
                  <div className="text-[10px] text-text-muted">支持 PDF 文件上传</div>
                </div>
              </button>
              <div className="mx-2 my-1 h-px bg-border-light" />
              <button
                onClick={() => { alert('接入知识库功能即将上线'); setShowAttachMenu(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg transition-colors flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[12px] text-text font-medium">接入知识库</div>
                  <div className="text-[10px] text-text-muted">连接企业知识库资源</div>
                </div>
              </button>
            </div>
          )}

          {/* 第一行：输入框 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={disabled ? 'WorkAgent 执行中，请稍候...' : isDragging ? '释放以添加文件...' : '与 WorkAgent 对话，或输入指令...'}
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent resize-none outline-none text-[13px] text-text px-3 pt-3 pb-1 disabled:cursor-not-allowed"
            style={{ minHeight: '24px' }}
          />

          {/* 第二行：+、发送 */}
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={disabled}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${showAttachMenu ? 'bg-black text-white' : 'hover:bg-black/10 text-black'}`}
              title="添加附件"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

            <div className="flex items-center gap-2">
              <TokenUsageCompact used={tokenUsed} total={tokenTotal} />
              <button
                onClick={handleSend}
                disabled={disabled || (!input.trim() && attachedFiles.length === 0)}
                className="p-1.5 bg-black hover:bg-black/80 text-white rounded-lg transition-colors disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 警示语 */}
      <div className="max-w-3xl mx-auto text-center pb-2 px-5">
        <span className="text-[11px] text-text-muted">
          Agent 是 AI，可能会产生错误。请仔细核对回复内容。
        </span>
      </div>
    </>
  );
}

/* ─── 辅助函数：后端消息 → 前端消息 ─── */
function convertAgentMessage(msg: AgentMessage): TaskMessage {
  const typeMap: Record<string, TaskMessage['type']> = {
    user: 'member',
    assistant: 'workagent',
    tool: 'subagent',
    system: 'system',
    subagent: 'subagent',
  };

  let type = typeMap[msg.role] || 'workagent';

  // 优先使用后端标记的消息类型（最可靠）
  if (msg.metadata?.messageType) {
    type = msg.metadata.messageType;
  }
  // 兜底：根据内容特征识别特殊消息类型
  else if (msg.role === 'assistant') {
    const content = msg.content;
    if (content.includes('确认几个细节') || content.includes('我需要确认') || content.includes('追问')) {
      type = 'question';
    } else if (content.includes('按以下方案执行') || content.includes('执行方案') || content.includes('计划')) {
      type = 'plan';
    } else if (content.includes('任务已完成') || content.includes('全部完成') || content.includes('核心结论')) {
      type = 'completion';
    }
  }

  // 转换 planSteps 为前端格式
  const steps = msg.metadata?.planSteps?.map((s) => ({
    step: s.step,
    name: s.name,
    tool: s.tool,
    status: s.status,
    category: s.category as ToolCategory,
  }));

  return {
    id: msg.id,
    type,
    senderName: msg.senderName,
    content: msg.content,
    timestamp: new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    metadata: msg.metadata
      ? {
          subAgentName: msg.metadata.subAgentName,
          duration: typeof msg.metadata.duration === 'number' ? `${msg.metadata.duration}s` : msg.metadata.duration,
          files: msg.metadata.files,
          steps: steps || (type === 'question' ? [
            { step: 1, name: '特斯拉、比亚迪、蔚来', tool: '', status: 'pending' as const, category: 'skill' as ToolCategory },
            { step: 2, name: '价格 + 智能化', tool: '', status: 'pending' as const, category: 'skill' as ToolCategory },
            { step: 3, name: 'PPT 格式', tool: '', status: 'pending' as const, category: 'skill' as ToolCategory },
          ] : undefined),
          reportTitle: msg.metadata.report?.title,
          reportSummary: msg.metadata.report?.summary,
          reportDetail: msg.metadata.report
            ? {
                title: msg.metadata.report.title,
                sections: msg.metadata.report.sections.map((s) => ({
                  title: s.title,
                  content: s.content,
                  charts: s.charts,
                })),
              }
            : undefined,
          permissionType: msg.metadata.permissionRequest?.type,
        }
      : undefined,
  };
}

/** 根据流式文本内容判断消息最终类型（兜底，优先使用 metadata.messageType） */
function determineMessageType(content: string): TaskMessage['type'] {
  if (content.includes('确认几个细节') || content.includes('我需要确认') || content.includes('追问') || content.includes('为了提供精准') || content.includes('需要确认')) {
    return 'question';
  }
  if (content.includes('按以下方案执行') || content.includes('执行方案') || content.includes('需求已明确') || content.includes('我将按以下方案') || content.includes('以下方案')) {
    return 'plan';
  }
  if (content.includes('任务已完成') || content.includes('全部完成') || content.includes('核心结论') || content.includes('任务已') || content.includes('竞品分析任务已')) {
    return 'completion';
  }
  return 'workagent';
}

/* ─── 主组件 ─── */
interface TaskSpaceProps {
  accountType: import('../App').AccountType;
  project?: Project | null;
  task: Chat | { id: string; name: string; type: string; messages: unknown[] };
  onBack: () => void;
  onRename?: (taskId: string, newName: string) => void;
  onPin?: (taskId: string, pinned: boolean) => void;
  onArchive?: (taskId: string) => void;
}

export default function TaskSpace({ project, task, onBack, onRename, onPin, onArchive }: TaskSpaceProps) {
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(340);
  const [isResizing, setIsResizing] = useState(false);
  const [showInitialPlan, setShowInitialPlan] = useState(false);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [localTaskName, setLocalTaskName] = useState(task.name);

  // 产出物预览浮窗
  const [preview, setPreview] = useState<{ url: string; fileName: string; fileSize?: string } | null>(null);

  // Reasoning (Thinking) state — AI SDK Elements style
  const [reasoning, setReasoning] = useState<{ text: string; isStreaming: boolean } | null>(null);

  const clientRef = useRef<WorkAgentClient | null>(null);
  const streamingContentRef = useRef('');
  const hasSentInitialMessages = useRef(false);

  // 动态步骤状态（从 pending 开始，随后端执行进度更新）
  const [dynamicSteps, setDynamicSteps] = useState<PlanStep[]>([
    { step: 1, name: '需求澄清', tool: 'WorkAgent', status: 'pending', category: 'agent' },
    { step: 2, name: '数据采集', tool: 'WebCrawler Skill', status: 'pending', category: 'skill' },
    { step: 3, name: '价格分析', tool: 'PriceCompare Skill', status: 'pending', category: 'repo' },
    { step: 4, name: '智能化评估', tool: 'AIEval Skill', status: 'pending', category: 'agent' },
    { step: 5, name: '报告生成', tool: 'ReportGen Skill', status: 'pending', category: 'skill' },
  ]);

  // Agent 编排链路（替代 Progress，展示每个 SubAgent 的职责与挂载 Skills）
  const [agentOrchestration] = useState<AgentOrchestrationNode[]>([
    {
      id: 'req-parser',
      agentName: '需求解析 Agent',
      agentType: 'subagent',
      status: 'completed',
      description: '解析用户意图，提取关键参数（主题色、页数、风格偏好）',
      skills: ['IntentParser'],
      duration: '2s',
    },
    {
      id: 'data-gov',
      agentName: '数据治理 Agent',
      agentType: 'subagent',
      status: 'completed',
      description: '清洗并结构化 sales_q3.xlsx，生成标准化数据表',
      skills: ['WebCrawler', 'DataClean'],
      duration: '45s',
    },
    {
      id: 'kg-retrieval',
      agentName: '知识检索 Agent',
      agentType: 'subagent',
      status: 'running',
      description: '从企业知识库检索行业基准数据与竞品情报',
      skills: ['RAG', 'KnowledgeBase'],
      duration: '12s',
    },
    {
      id: 'price-analyzer',
      agentName: '价格分析 Agent',
      agentType: 'subagent',
      status: 'pending',
      description: '多维度价格对比与趋势分析，生成可视化图表',
      skills: ['PriceCompare', 'SQLTool'],
    },
    {
      id: 'report-gen',
      agentName: '报告生成 Agent',
      agentType: 'subagent',
      status: 'pending',
      description: '汇总所有分析结果，生成柯布西耶 PPT 最终报告',
      skills: ['ReportGen', 'SlideCraft'],
    },
  ]);

  const planSteps: PlanStep[] = [
    { step: 1, name: '数据采集', tool: 'WebCrawler Skill', category: 'skill' },
    { step: 2, name: '价格分析', tool: 'PriceCompare Skill', category: 'repo' },
    { step: 3, name: '智能化评估', tool: 'AIEval Skill', category: 'agent' },
    { step: 4, name: '报告生成', tool: 'ReportGen Skill · SlideCraft Skill', category: 'skill' },
  ];

  const reportData: ReportDetail = {
    title: '新能源汽车竞品分析报告',
    sections: [
      {
        title: '一、市场定位对比',
        content: '特斯拉：高端智能电动车领导者，主打自动驾驶与品牌价值\n比亚迪：全价位覆盖，垂直整合能力强，电池自研\n蔚来：高端服务体验，换电模式差异化，用户社区运营',
        charts: [{
          type: 'bar',
          title: '主力车型价格区间（万元）',
          data: [
            { label: '特斯拉', value: 35, color: '#E84B25' },
            { label: '比亚迪', value: 22, color: '#3B82F6' },
            { label: '蔚来', value: 42, color: '#10B981' },
          ]
        }]
      },
      {
        title: '二、智能化能力评分',
        content: '自动驾驶：特斯拉 FSD 9.2分（行业领先）> 蔚来 NAD 7.8分 > 比亚迪 DiPilot 6.5分\n智能座舱：蔚来 8.5分（NOMI 交互优秀）> 特斯拉 7.2分 > 比亚迪 7.0分\nOTA 能力：特斯拉 9.0分（更新频率最高）> 蔚来 8.0分 > 比亚迪 7.5分',
        charts: [{
          type: 'radar',
          title: '智能化综合评分',
          data: [
            { label: '特斯拉', value: 85, color: '#E84B25' },
            { label: '比亚迪', value: 72, color: '#3B82F6' },
            { label: '蔚来', value: 78, color: '#10B981' },
          ]
        }]
      },
      {
        title: '三、核心结论与建议',
        content: '1. 特斯拉在智能化领域保持领先，但价格偏高，适合追求科技体验的用户\n2. 比亚迪性价比最高，产品线最全，适合大众市场\n3. 蔚来服务体验最佳，换电模式解决里程焦虑，适合高端用户\n\n建议：我司可对标蔚来服务模式 + 比亚迪成本控制，打造差异化竞争力',
      }
    ]
  };

  const [messages, setMessages] = useState<TaskMessage[]>(() => {
    // 从 task.messages 加载初始消息
    const initial = (task.messages || []).map((m: any) => {
      let type: TaskMessage['type'] = m.role === 'human' ? 'member' : m.role === 'agent' ? 'workagent' : 'system';
      // 优先使用 metadata 中标记的消息类型
      if (m.metadata?.messageType) {
        type = m.metadata.messageType;
      }
      return {
        id: m.id,
        type,
        senderName: m.senderName || m.senderId || 'WorkAgent',
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata,
      };
    });
    return initial;
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  // 流式消息 ID 追踪
  const streamingMsgIdRef = useRef<string | null>(null);

  // 发送初始消息到后端（当 session 和 WebSocket 都就绪时）
  useEffect(() => {
    if (!sessionId || !isConnected || hasSentInitialMessages.current) return;
    if (!clientRef.current) return;

    const userMessages = (task.messages || []).filter((m: any) => m.role === 'human');
    if (userMessages.length === 0) {
      hasSentInitialMessages.current = true;
      return;
    }

    console.log('[TaskSpace] Sending initial messages to session:', sessionId);
    for (const msg of userMessages as any[]) {
      clientRef.current.sendMessage(sessionId, msg.content);
    }
    hasSentInitialMessages.current = true;
  }, [sessionId, isConnected, task.messages]);

  // ─── 后端集成：初始化 WebSocket 连接 ───
  useEffect(() => {
    hasSentInitialMessages.current = false;
    const userId = 'samhar'; // TODO: 从登录态获取
    const client = new WorkAgentClient(userId);
    clientRef.current = client;

    client.on({
      onConnect: () => {
        setIsConnected(true);
        console.log('[TaskSpace] Connected to WorkAgent backend');
      },
      onDisconnect: () => {
        setIsConnected(false);
        console.log('[TaskSpace] Disconnected from WorkAgent backend');
      },
      onMessage: (msg) => {
        const taskMsg = convertAgentMessage(msg);
        setMessages(prev => {
          // 根据消息 ID 去重，防止后端重连导致重复消息
          if (prev.some(m => m.id === taskMsg.id)) return prev;
          // 如果收到 agent 的最终消息，移除对应的流式占位消息（按 ID 前缀匹配）
          if (msg.role === 'assistant') {
            const streamMsgs = prev.filter(m => m.id.startsWith('stream_'));
            if (streamMsgs.length > 0) {
              const filtered = prev.filter(m => !m.id.startsWith('stream_'));
              streamingMsgIdRef.current = null;
              streamingContentRef.current = '';
              setStreamingText('');
              setIsStreaming(false);
              // Agent 最终回复到达，清除 reasoning（已完成使命）
              setReasoning(null);
              return [...filtered, taskMsg];
            }
          }
          return [...prev, taskMsg];
        });
        // 收到 completion 消息时解除执行锁定
        if (taskMsg.type === 'completion') {
          setIsExecuting(false);
        }
      },
      onThinking: (text) => {
        setReasoning(prev => {
          if (prev) {
            return { ...prev, text: prev.text + text, isStreaming: true };
          }
          return { text, isStreaming: true };
        });
      },
      onStream: (chunk, done) => {
        if (done) {
          setIsStreaming(false);
          const msgId = streamingMsgIdRef.current;
          // 移除流式占位消息，最终消息由 onMessage 推送
          if (msgId) {
            setMessages(prev => prev.filter(m => m.id !== msgId));
          }
          streamingContentRef.current = '';
          setStreamingText('');
          streamingMsgIdRef.current = null;
          // 流式结束，标记 reasoning 完成
          setReasoning(prev => prev ? { ...prev, isStreaming: false } : null);
        } else {
          setIsStreaming(true);
          streamingContentRef.current += chunk;
          setStreamingText(streamingContentRef.current);

          // 实时更新/创建流式消息
          const msgId = streamingMsgIdRef.current;
          if (!msgId) {
            const newId = `stream_${Date.now()}`;
            streamingMsgIdRef.current = newId;
            setMessages(prev => [...prev, {
              id: newId,
              type: 'workagent',
              senderName: 'WorkAgent',
              content: chunk,
              timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            }]);
          } else {
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, content: m.content + chunk } : m
            ));
          }
        }
      },
      onStateChange: (state, step) => {
        console.log('[TaskSpace] State:', state, step);
        if (step) {
          setDynamicSteps(prev => {
            const exists = prev.find(s => s.step === step.step);
            if (exists) {
              return prev.map(s => s.step === step.step ? { ...s, status: step.status } : s);
            }
            // 新步骤：追加到列表
            return [...prev, {
              step: step.step,
              name: step.name,
              tool: step.tool,
              status: step.status,
              category: step.category as ToolCategory,
            }];
          });
        }
      },
      onPermissionRequest: (req) => {
        setMessages(prev => [...prev, {
          id: `perm_${req.requestId}`,
          type: 'permission',
          senderName: 'WorkAgent',
          content: req.description,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          metadata: { permissionType: req.type },
        }]);
      },
      onError: (err) => {
        console.error('[TaskSpace] Error:', err);
        setIsExecuting(false);
      },
    });

    client.connect();

    // 创建会话
    const initSession = async () => {
      try {
        const session = await createSession({
          userId,
          projectId: project?.id || '',
          taskId: task.id,
          title: task.name,
        });
        setSessionId(session.id);
      } catch {
        console.log('[TaskSpace] Failed to create session, using mock mode');
      }
    };
    initSession();

    return () => {
      client.disconnect();
    };
  }, [project?.id, task.id, task.name]);

  useEffect(() => {
    if (messages.length > 12) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /* ─── Mock Demo: 柯布西耶 PPT 完整对话流 ─── */
  const isMockDemo = (text: string) =>
    /柯布西耶|ppt|PPT|幻灯片/.test(text);

  const runMockDemo = (userText: string) => {
    const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // ── Round 1: 分析 + 需求澄清 ──
    const round1Agent: TaskMessage = {
      id: `mock_${Date.now()}_r1`,
      type: 'workagent',
      senderName: 'WorkAgent',
      content:
        `好的！我来帮你生成一个介绍柯布西耶的电子杂志风格 PPT。\n\n` +
        `在动手之前，让我先确认几个基本需求：\n\n` +
        `1. **主题色偏好**：我推荐用 沙丘（🌙） 或 墨水经典（✒️），比较适合艺术/建筑类主题，你有偏好吗？\n\n` +
        `2. **页数**：大概需要多少页？15分钟演讲≈10页，30分钟≈20页。\n\n` +
        `3. **风格**：你想要偏建筑专业介绍，还是偏大众科普？\n\n` +
        `不过，如果你想直接开始，我可以先用 **沙丘主题色**，给你做一个 15-18 页的标准分享 PPT（覆盖柯布西耶生平、建筑理念、代表作品、影响等）。\n\n` +
        `你先告诉我偏好，我来规划具体内容结构？`,
      timestamp: now(),
      metadata: {
        reasoning: {
          text:
            `The user wants to create a PPT about Le Corbusier. Let me first read the relevant skill for PPT creation.\n\n` +
            `I'll need to:\n` +
            `1. Clarify requirements (theme, page count, style)\n` +
            `2. Copy the template\n` +
            `3. Fill in the content\n\n` +
            `Le Corbusier is a famous architect. I should ask a few questions first.`,
          duration: 29,
        },
      },
    };

    // 显示 Round 1 Agent 回复（带 thinking 动画）
    setReasoning({ text: '', isStreaming: true });
    setIsExecuting(true);

    // 模拟 thinking 流式输出
    const thinkingText = round1Agent.metadata!.reasoning!.text;
    let thinkingIdx = 0;
    const thinkingInterval = setInterval(() => {
      thinkingIdx += 8;
      setReasoning({ text: thinkingText.slice(0, thinkingIdx), isStreaming: thinkingIdx < thinkingText.length });
      if (thinkingIdx >= thinkingText.length) {
        clearInterval(thinkingInterval);
        setTimeout(() => {
          setReasoning(null);
          setMessages(prev => [...prev, round1Agent]);
          setIsExecuting(false);
        }, 400);
      }
    }, 30);
  };

  const runMockDemoRound2 = () => {
    const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // 用户快捷回复
    const userReply: TaskMessage = {
      id: `mock_${Date.now()}_u2`,
      type: 'member',
      senderName: 'samhar',
      content: '沙丘 15页 建筑专业介绍',
      timestamp: now(),
    };
    setMessages(prev => [...prev, userReply]);

    // Round 2 Agent 回复
    const round2Agent: TaskMessage = {
      id: `mock_${Date.now()}_r2`,
      type: 'workagent',
      senderName: 'WorkAgent',
      content:
        `现在让我创建完整的15页柯布西耶PPT。我会：\n\n` +
        `1. 切换到沙丘主题色\n` +
        `2. 规划15页内容结构\n` +
        `3. 写入所有slides`,
      timestamp: now(),
      metadata: {
        reasoning: {
          text:
            `User selected: Dune theme, 15 pages, architectural professional style.\n\n` +
            `I'll execute the plan:\n` +
            `1. Read themes.md to confirm Dune color scheme\n` +
            `2. Read layouts.md for architecture-friendly layouts\n` +
            `3. Write the 15 slides\n\n` +
            `Content plan:\n` +
            `• Cover: Portrait + title\n` +
            `• TOC\n` +
            `• Biography (2 pages)\n` +
            `• Architecture principles (3 pages)\n` +
            `• Masterpieces (4 pages)\n` +
            `• Legacy + Conclusion`,
          duration: 15,
        },
      },
    };

    setReasoning({ text: '', isStreaming: true });
    setIsExecuting(true);

    const thinkingText = round2Agent.metadata!.reasoning!.text;
    let thinkingIdx = 0;
    const thinkingInterval = setInterval(() => {
      thinkingIdx += 10;
      setReasoning({ text: thinkingText.slice(0, thinkingIdx), isStreaming: thinkingIdx < thinkingText.length });
      if (thinkingIdx >= thinkingText.length) {
        clearInterval(thinkingInterval);
        setTimeout(() => {
          setReasoning(null);
          setMessages(prev => [...prev, round2Agent]);
          setIsExecuting(false);

          // Round 3: 最终完成消息
          setTimeout(() => {
            const completionMsg: TaskMessage = {
              id: `mock_${Date.now()}_r3`,
              type: 'completion',
              senderName: 'WorkAgent',
              content:
                `柯布西耶 PPT 已生成完毕！`,
              timestamp: now(),
              metadata: {
                files: ['corbusier-ppt/index.html'],
                reportTitle: '柯布西耶 PPT 已完成',
                artifactUrl: '/corbusier-ppt/index.html',
                themeColor: '沙丘（炭灰 + 沙色）',
                pages: 15,
                style: '建筑专业介绍',
                slideStructure: [
                  { page: 1, type: '封面', title: '柯布西耶 — 现代建筑之父' },
                  { page: 2, type: 'Act I 幕封', title: '生平' },
                  { page: 3, type: '数据大字报', title: '一生关键数字（1887-1965, 78作品, 24著作...）' },
                  { page: 4, type: '左文右图', title: '早年经历 — 从工匠到大师' },
                  { page: 5, type: 'Act II 幕封', title: '建筑理念' },
                  { page: 6, type: 'Pipeline', title: '新建筑五点原则（柱墩/屋顶花园/自由平面/横窗/自由立面）' },
                  { page: 7, type: '大引用', title: '"住宅是居住的机器"' },
                  { page: 8, type: '图文混排', title: '模度系统 Le Modulor' },
                  { page: 9, type: 'Act III 幕封', title: '代表作品' },
                  { page: 10, type: '左文右图', title: '朗香教堂 Notre-Dame-du-Haut' },
                  { page: 11, type: '左文右图', title: '拉图雷特修道院 La Tourette' },
                  { page: 12, type: '图片网格', title: '全球足迹（联合国总部/马赛公寓/昌迪加尔...）' },
                  { page: 13, type: 'Pipeline', title: '影响与遗产 + 核心著作' },
                  { page: 14, type: '问题收束', title: '留给建筑的问题' },
                  { page: 15, type: '结尾幕封', title: 'The Question' },
                ],
                fileSize: '48.8 KB',
                responseTime: '10m 50s',
              },
            };
            setMessages(prev => [...prev, completionMsg]);
          }, 1200);
        }, 400);
      }
    }, 25);
  };

  const handleSend = (text: string) => {
    // 本地添加用户消息
    setMessages(prev => [...prev, {
      id: String(Date.now()),
      type: 'member',
      senderName: 'samhar',
      content: text,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }]);

    // ── Mock Demo 拦截 ──
    if (isMockDemo(text)) {
      runMockDemo(text);
      return;
    }

    // 如果是 demo 的快捷回复
    if (/沙丘.*15页|建筑专业/.test(text)) {
      runMockDemoRound2();
      return;
    }

    // 发送到后端
    if (sessionId && clientRef.current) {
      clientRef.current.sendMessage(sessionId, text);
    }
  };

  const handleConfirmPlan = () => {
    setShowInitialPlan(false);
    setIsExecuting(true);
    handleSend('确认方案，开始执行');
    if (sessionId && clientRef.current) {
      clientRef.current.approvePlan(sessionId, true);
    }
  };

  const handleViewReport = () => {
    setReportDetail(reportData);
  };

  const handleCloseReport = () => {
    setReportDetail(null);
  };

  const handleApprovePermission = (requestId: string) => {
    if (sessionId && clientRef.current) {
      clientRef.current.approvePermission(sessionId, requestId, true);
    }
  };

  const handleRejectPermission = (requestId: string) => {
    if (sessionId && clientRef.current) {
      clientRef.current.approvePermission(sessionId, requestId, false);
    }
  };

  const renderMessage = (msg: TaskMessage) => {
    switch (msg.type) {
      case 'member': return <MemberMessage key={msg.id} msg={msg} />;
      case 'workagent': return <WorkAgentMessage key={msg.id} msg={msg} />;
      case 'question': return <QuestionMessage key={msg.id} msg={msg} onAnswer={(ans) => handleSend(ans)} />;
      case 'subagent': return <SubAgentMessage key={msg.id} msg={msg} />;
      case 'completion': return <CompletionMessage key={msg.id} msg={msg} onViewReport={handleViewReport} onPreview={(url, fileName, fileSize) => setPreview({ url, fileName, fileSize })} />;
      case 'system': return <SystemMessage key={msg.id} msg={msg} />;
      case 'plan': return <PlanConfirmCard key={msg.id} steps={msg.metadata?.steps || []} onConfirm={handleConfirmPlan} />;
      case 'permission': return <PermissionRequestCard key={msg.id} msg={msg} onApprove={() => handleApprovePermission(msg.id)} onReject={() => handleRejectPermission(msg.id)} />;
      default: return <WorkAgentMessage key={msg.id} msg={msg} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部栏 */}
      <div className="h-12 shrink-0 flex items-center justify-between px-5 group">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-bg rounded-lg text-text-muted mr-1 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <h1 className="text-[15px] font-semibold text-text tracking-tight">{localTaskName}</h1>
          {project && (
            <div className="w-5 h-5 rounded-full bg-primary-subtle border border-white flex items-center justify-center text-[8px] font-bold text-primary-dark">
              S
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(onRename || onPin || onArchive) && (
            <TaskMenu
              isPinned={(task as any).pinned ?? false}
              onPin={() => onPin?.(task.id, !(task as any).pinned)}
              onRename={() => setShowRenameDialog(true)}
              onArchive={() => {
                if (confirm('确定要归档并删除这个会话吗？此操作不可撤销。')) {
                  onArchive?.(task.id);
                }
              }}
            />
          )}
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1.5 hover:bg-bg rounded-lg transition-colors text-text-muted"
          >
            {rightCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 重命名弹窗 */}
      {showRenameDialog && (
        <RenameDialog
          currentName={localTaskName}
          onConfirm={(newName) => {
            setLocalTaskName(newName);
            onRename?.(task.id, newName);
            setShowRenameDialog(false);
          }}
          onCancel={() => setShowRenameDialog(false)}
        />
      )}

      {/* 主体 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧聊天区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 relative pb-24 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-28 after:bg-gradient-to-t after:from-white after:via-white/98 after:to-transparent after:pointer-events-none">
            <div className="max-w-3xl mx-auto space-y-5">
              {showInitialPlan && (
                <PlanConfirmCard
                  steps={planSteps}
                  onConfirm={handleConfirmPlan}
                />
              )}
              {messages.map(renderMessage)}
              {reasoning && (
                <div className="flex gap-3">
                  <WorkAgentAvatar />
                  <div className="flex-1 min-w-0">
                    <Reasoning isStreaming={reasoning.isStreaming} defaultOpen={true}>
                      <ReasoningTrigger />
                      <ReasoningContent>{reasoning.text}</ReasoningContent>
                    </Reasoning>
                  </div>
                </div>
              )}
              {isStreaming && !reasoning && (
                <StreamingIndicator text={streamingText} />
              )}
              <div ref={bottomRef} />
            </div>
          </div>
          <ChatInput onSend={handleSend} disabled={isExecuting || isStreaming} tokenUsed={18.5} tokenTotal={20} />
        </div>

        {/* 拖拽条 */}
        {!rightCollapsed && (
          <div
            className="w-4 shrink-0 cursor-col-resize flex items-center justify-center group relative z-20"
            onMouseDown={(e) => {
              setIsResizing(true);
              const startX = e.clientX;
              const startWidth = rightWidth;
              const handleMove = (ev: MouseEvent) => {
                const delta = startX - ev.clientX;
                const newWidth = Math.max(280, Math.min(520, startWidth + delta));
                setRightWidth(newWidth);
              };
              const handleUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleUp);
              };
              document.addEventListener('mousemove', handleMove);
              document.addEventListener('mouseup', handleUp);
            }}
          >
            <div className={`w-px h-8 rounded-full transition-all ${isResizing ? 'bg-primary h-16' : 'bg-transparent group-hover:bg-border group-hover:h-12'}`} />
          </div>
        )}

        {/* 右侧面板 */}
        {!rightCollapsed && (
          <div className="shrink-0" style={{ width: rightWidth }}>
            <RightPanel
              taskId={task.id}
              projectId={(task as any).projectId || null}
              project={project}
              dynamicSteps={dynamicSteps}
              reportDetail={reportDetail}
              onCloseReport={handleCloseReport}
              contextFiles={(task.messages || []).flatMap((m: any) => m.metadata?.files || []).filter(Boolean)}
              artifacts={(task.messages || [])
                .filter((m: any) => m.metadata?.artifactUrl)
                .map((m: any) => ({
                  name: m.metadata!.artifactUrl!.split('/').pop() || 'output',
                  url: m.metadata!.artifactUrl!,
                }))}
              agentOrchestration={agentOrchestration}
              onUploadContext={(files) => {
                console.log('[Context Upload]', files);
                alert(`已选择 ${files.length} 个文件，上传功能即将接入后端`);
              }}
            />
          </div>
        )}
      </div>

      {/* 产出物预览浮窗 */}
      {preview && (
        <ArtifactPreview
          url={preview.url}
          fileName={preview.fileName}
          fileSize={preview.fileSize}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
