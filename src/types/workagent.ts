/**
 * WorkAgent 共享类型（前后端共用）
 *
 * 从 backend/src/types/index.ts 同步
 */

/** 执行模式 — 产品只保留全自动 */
export type ExecutionMode = 'auto';

export interface ExecutionModeConfig {
  mode: ExecutionMode;
  protectedPaths: string[];
}

export const MODE_CONFIGS: Record<ExecutionMode, ExecutionModeConfig> = {
  auto: {
    mode: 'auto',
    protectedPaths: ['.agentos/', '~/.agentos/'],
  },
};

export interface SessionBranch {
  id: string;
  name: string;
  parentBranchId?: string;
  rootMessageIndex: number;
  createdAt: string;
  active: boolean;
}

export interface Session {
  id: string;
  userId: string;
  projectId: string;
  taskId: string;
  title: string;
  branches: SessionBranch[];
  activeBranchId: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  contextWindow: {
    usedTokens: number;
    maxTokens: number;
  };
  autoCompaction: boolean;
  compactionPolicy: CompactionPolicy;
}

export interface CompactionPolicy {
  thresholdRatio: number;
  keepRecent: number;
  summaryModel?: string;
}

export interface AgentMessage {
  id: string;
  branchId: string;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'subagent';
  senderName: string;
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  subAgentName?: string;
  duration?: number;
  tokenUsage?: number;
  files?: string[];
  planSteps?: PlanStep[];
  toolCall?: { name: string; input: Record<string, unknown> };
  toolResult?: { name: string; output: string };
  report?: {
    title: string;
    summary: string;
    sections: ReportSection[];
  };
  permissionRequest?: {
    type: 'bash' | 'edit' | 'dispatch';
    description: string;
    command?: string;
  };
  messageType?: 'question' | 'plan' | 'completion' | 'workagent' | 'subagent' | 'system';
}

export interface PlanStep {
  step: number;
  name: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  category: ToolCategory;
  result?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  charts?: ChartData[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar';
  title: string;
  data: { label: string; value: number; color?: string }[];
}

export type ToolCategory = 'file' | 'shell' | 'repo' | 'agent' | 'skill' | 'mcp';

export interface Skill {
  id: string;
  name: string;
  description: string;
  sourcePath: string;
  triggerWords: string[];
  category: string;
  inputParams: SkillInputParam[];
  outputs: SkillOutput[];
  dependencies: string[];
  graphWrite: boolean;
  version: string;
  author: string;
  status: 'active' | 'inactive';
  stats: {
    calls: number;
    successRate: number;
    avgDuration: number;
  };
}

export interface SkillInputParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

export interface SkillOutput {
  name: string;
  type: string;
  description: string;
}

export interface SubAgentTask {
  id: string;
  parentSessionId: string;
  name: string;
  goal: string;
  constraints: string[];
  requiredSkills: string[];
  contextInheritance: 'full' | 'summary' | 'none';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  startedAt?: string;
  completedAt?: string;
}

export type WorkAgentState =
  | 'idle'
  | 'analyzing'
  | 'questioning'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'subagent_running'
  | 'reviewing'
  | 'completed'
  | 'failed';
