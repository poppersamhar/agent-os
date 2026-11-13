export type ApprovalKind = 'reveal-personnel' | 'connector-access' | 'send-external' | 'delete' | 'delete-memory' | 'publish';
export type ApprovalDecision = 'approved' | 'rejected';
export type ApprovalStatus = 'pending' | ApprovalDecision | 'expired';

export interface Approval {
  id: string;
  botId: string;
  botName: string;
  kind: ApprovalKind;
  title: string;
  detail: string;
  impact: string;
  subject?: string;
  targetId?: string;
  requestedAt: number;
  submittedAt?: number;
  expiresAt: number;
  status: ApprovalStatus;
  resolvedAt?: number;
}

export interface AuditRecord {
  id: string;
  botId: string;
  botName: string;
  at: number;
  actor: string;
  action: string;
  subject: string;
  reason: string;
  result: string;
}

const APPROVAL_WINDOW = 10 * 60_000;

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  pending: '待审批', approved: '已通过', rejected: '已拒绝', expired: '已过期',
};

const approvalActionLabels: Record<ApprovalKind, string> = {
  'reveal-personnel': '查看完整信息',
  'connector-access': '连接器授权',
  'send-external': '对外发送',
  delete: '删除智能体',
  'delete-memory': '删除记忆',
  publish: '发布到企业市场',
};

type ApprovalInput = Pick<Approval, 'id' | 'botId' | 'botName' | 'kind' | 'title' | 'detail' | 'impact' | 'subject' | 'targetId'>;

export function createApproval(input: ApprovalInput, at = Date.now()): Approval {
  return {
    ...input, requestedAt: at, expiresAt: at + APPROVAL_WINDOW, status: 'pending',
    submittedAt: input.kind === 'connector-access' ? undefined : at,
  };
}

export function submitApproval(approval: Approval, at = Date.now()): Approval {
  if (approval.status !== 'pending' || approval.submittedAt !== undefined) return approval;
  return { ...approval, submittedAt: at, expiresAt: at + APPROVAL_WINDOW };
}

export function approvalStatus(approval: Approval, at = Date.now()): ApprovalStatus {
  return approval.status === 'pending' && approval.submittedAt !== undefined && at >= approval.expiresAt ? 'expired' : approval.status;
}

export function expireApproval(approval: Approval, at = Date.now()): Approval {
  if (approval.status !== 'pending' || approvalStatus(approval, at) !== 'expired') return approval;
  return { ...approval, status: 'expired', resolvedAt: approval.expiresAt };
}

export function decideApproval(approval: Approval, decision: ApprovalDecision, at = Date.now()): Approval {
  if (approval.status !== 'pending' || approval.submittedAt === undefined) return approval;
  const current = expireApproval(approval, at);
  if (current.status === 'expired') return current;
  return { ...approval, status: decision, resolvedAt: at };
}

export function auditApproval(approval: Approval): AuditRecord {
  return {
    id: `${approval.id}-audit`, botId: approval.botId, botName: approval.botName,
    at: approval.resolvedAt ?? approval.requestedAt, actor: approval.status === 'expired' ? '系统' : 'Samhar',
    action: approvalActionLabels[approval.kind], subject: approval.subject ?? approval.title,
    reason: approval.detail, result: approvalStatusLabels[approval.status],
  };
}
