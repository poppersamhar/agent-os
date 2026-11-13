import { useId, useState, type FormEvent } from 'react';
import { LockKeyhole, Search } from 'lucide-react';
import { approvalStatusLabels, type Approval, type AuditRecord } from './governance';
import { PERSONNEL_SAMPLE_ID, personnelAnalysis, personnelValidation, personnelView, type PersonnelAction, type PersonnelInput, type PersonnelResult } from './personnel';
import './PersonnelWidget.css';

interface PersonnelWidgetProps {
  action: PersonnelAction;
  result?: PersonnelResult;
  working?: boolean;
  approval?: Approval;
  onRun: (input: PersonnelInput) => void;
  onRequestReveal: (resultId: string) => void;
}

function QueryResult({ result, approval, onRequestReveal }: { result: PersonnelResult; approval?: Approval; onRequestReveal: (resultId: string) => void }) {
  const decision = approval?.kind === 'reveal-personnel' && approval.targetId === result.id ? approval.status : undefined;
  const record = personnelView(result, approval);
  if (!record) return <p className="bos-empty-note">未查到人员记录。</p>;

  return <div className="bos-personnel-result">
    <dl>
      <div><dt>姓名</dt><dd>{record.name}</dd></div>
      <div><dt>身份证号</dt><dd className="bos-personnel-id">{record.identity}</dd></div>
      <div><dt>部门</dt><dd>{record.department}</dd></div>
      <div><dt>状态</dt><dd>{record.status}</dd></div>
    </dl>
    <div className="bos-personnel-actions">
      {decision === 'pending' ? <span>待审批 · 在对话中处理</span> : null}
      {decision === 'approved' ? <span>完整信息 · 审批已通过</span> : null}
      {decision === 'rejected' || decision === 'expired' ? <span>{approvalStatusLabels[decision]} · 信息已脱敏</span> : null}
      {decision !== 'pending' && decision !== 'approved' ? <button type="button" className="bos-secondary" onClick={() => onRequestReveal(result.id)}>
        <LockKeyhole size={13} aria-hidden="true" />查看完整信息
      </button> : null}
    </div>
  </div>;
}

export function PersonnelWidget({ action, result, working = false, approval, onRun, onRequestReveal }: PersonnelWidgetProps) {
  const [identity, setIdentity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const errorId = useId();
  const direct = action === 'direct';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (working) return;
    const validation = personnelValidation({ identity, reason }, action);
    if (validation) {
      setError(validation);
      return;
    }
    onRun({ identity, reason });
    setError('');
    setIdentity('');
    setReason('');
  };

  return <div className="bos-personnel">
    <form className="bos-personnel-form" aria-label={direct ? '人员查询表单' : '异常分析表单'} onSubmit={submit}>
      <label className="bos-field">
        <span>身份证号</span>
        <input value={identity} onChange={event => { setIdentity(event.target.value); setError(''); }} placeholder="18 位身份证号" required
          autoComplete="off" spellCheck={false} maxLength={18} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} />
      </label>
      {direct ? <label className="bos-field">
        <span>查询事由</span>
        <input value={reason} onChange={event => setReason(event.target.value)} placeholder="如核验入职资料" maxLength={160} required />
      </label> : null}
      {error ? <p id={errorId} className="bos-personnel-error" role="alert">{error}</p> : null}
      <div className="bos-personnel-actions">
        <button type="submit" className="bos-primary" disabled={working || !identity.trim() || (direct && !reason.trim())}>
          <Search size={14} aria-hidden="true" />{direct ? '查询' : '交给智能体分析'}
        </button>
        <button type="button" className="bos-personnel-example" onClick={() => {
          setIdentity(PERSONNEL_SAMPLE_ID);
          if (direct && !reason.trim()) setReason('核验入职资料');
          setError('');
        }}>填入示例</button>
      </div>
    </form>
    <div className="bos-personnel-output" aria-live="polite" aria-busy={working}>
      {working ? <p className="bos-empty-note">正在分析…</p> : null}
      {result && !working && direct ? <QueryResult result={result} approval={approval} onRequestReveal={onRequestReveal} /> : null}
      {result && !working && !direct ? <p className="bos-personnel-analysis">{personnelAnalysis(result)}</p> : null}
    </div>
  </div>;
}

const auditTime = new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export function AuditWidget({ records, showBot = false }: { records: AuditRecord[]; showBot?: boolean }) {
  if (!records.length) return <p className="bos-empty-note">暂无记录。</p>;
  return <div className="bos-audit-scroll" role="region" aria-label="操作记录" tabIndex={0}>
    <table className="bos-audit-table">
      <thead><tr>
        <th scope="col">时间</th><th scope="col">操作人</th>{showBot ? <th scope="col">智能体</th> : null}
        <th scope="col">操作</th><th scope="col">对象</th><th scope="col">事由</th><th scope="col">结果</th>
      </tr></thead>
      <tbody>{[...records].sort((a, b) => b.at - a.at).map(record => <tr key={record.id}>
        <td><time dateTime={new Date(record.at).toISOString()}>{auditTime.format(record.at)}</time></td>
        <td>{record.actor}</td>{showBot ? <td>{record.botName}</td> : null}
        <td>{record.action}</td><td>{record.subject}</td><td>{record.reason}</td><td>{record.result}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
