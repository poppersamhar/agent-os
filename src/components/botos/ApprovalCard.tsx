import { ShieldCheck } from 'lucide-react';
import { approvalStatusLabels, type Approval, type ApprovalDecision } from './governance';
import './PersonnelWidget.css';

interface ApprovalCardProps {
  approval: Approval;
  onDecide: (id: string, decision: ApprovalDecision) => void;
  onSubmit?: (id: string) => void;
}

const expiryTime = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function ApprovalCard({ approval, onDecide, onSubmit }: ApprovalCardProps) {
  const draft = approval.submittedAt === undefined && approval.status === 'pending';
  const pending = approval.status === 'pending' && !draft;
  return <section className="bos-approval-card" aria-label={approval.title}>
    <header><ShieldCheck size={16} aria-hidden="true" /><strong>{approval.title}</strong>
      <span className={`bos-approval-status is-${draft ? 'draft' : approval.status}`}>{draft ? '待提交' : approvalStatusLabels[approval.status]}</span>
    </header>
    <p>{approval.detail}</p>
    <dl>
      <div><dt>影响范围</dt><dd>{approval.impact}</dd></div>
      {pending ? <div><dt>过期时间</dt><dd><time dateTime={new Date(approval.expiresAt).toISOString()}>{expiryTime.format(approval.expiresAt)}</time></dd></div> : null}
    </dl>
    {draft && onSubmit ? <div className="bos-personnel-actions">
      <button type="button" className="bos-primary" onClick={() => onSubmit(approval.id)}>提交申请</button>
    </div> : null}
    {pending ? <div className="bos-personnel-actions">
      <button type="button" className="bos-primary" onClick={() => onDecide(approval.id, 'approved')}>通过</button>
      <button type="button" className="bos-secondary" onClick={() => onDecide(approval.id, 'rejected')}>拒绝</button>
    </div> : null}
  </section>;
}
