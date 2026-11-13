import { useState } from 'react';
import { canUseConnector, grantFor, hasGrant } from './capabilities';
import { approvalStatus, type ApprovalDecision } from './governance';
import { AuditWidget } from './PersonnelWidget';
import type { Bot, BotosState } from './botModel';

export function ApprovalsWidget({ state, onDecide }: { state: BotosState; onDecide: (id: string, decision: ApprovalDecision) => void }) {
  const pending = state.approvals.filter(approval => approval.submittedAt !== undefined && approvalStatus(approval) === 'pending');
  if (!pending.length) return <p className="bos-empty-note">没有待审批的申请</p>;
  return <ul className="bos-governance-list">{pending.map(approval => <li key={approval.id}>
    <div><strong>{approval.title}</strong><small>{approval.detail}</small><small>{approval.botName} · {approval.impact}</small></div>
    <div className="bos-widget-controls">
      <button type="button" className="bos-primary" onClick={() => onDecide(approval.id, 'approved')}>通过</button>
      <button type="button" className="bos-secondary" onClick={() => onDecide(approval.id, 'rejected')}>退回</button>
    </div>
  </li>)}</ul>;
}

export function CapabilityHealth({ state }: { state: BotosState }) {
  const skills = [...state.skills].sort((a, b) => b.failRate - a.failRate).slice(0, 3);
  const [now] = useState(Date.now);
  const deadline = now + 7 * 86400000;
  const connectors = state.mcps.filter(mcp => !mcp.enabled || (mcp.credentialExpiresAt !== undefined && mcp.credentialExpiresAt <= deadline));
  return <div className="bos-health">
    <strong>技能失败率排行</strong>
    <ul className="bos-governance-list">{skills.map(skill => <li key={skill.id}><span>{skill.name}</span><b>{(skill.failRate * 100).toFixed(0)}%</b></li>)}</ul>
    <strong>连接器状态</strong>
    {connectors.length ? <ul className="bos-governance-list">{connectors.map(mcp => <li key={mcp.id}><span>{mcp.name}</span>
      <small>{!mcp.enabled ? '已停用' : (mcp.credentialExpiresAt ?? Infinity) <= now ? '凭证已过期' : '凭证即将过期'}</small></li>)}</ul> : <p className="bos-empty-note">连接器状态正常</p>}
  </div>;
}

export function SensitiveOperations({ state }: { state: BotosState }) {
  const [filter, setFilter] = useState('');
  const sensitive = state.audit.filter(record => ['人员查询', '异常分析', '查看完整信息'].includes(record.action));
  const bots = new Map(sensitive.map(record => [record.botId, record.botName]));
  return <div className="bos-sensitive-operations">
    <label className="bos-field"><span>按智能体筛选</span><select value={filter} onChange={event => setFilter(event.target.value)}>
      <option value="">全部智能体</option>
      {[...bots].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    <AuditWidget records={sensitive.filter(record => !filter || record.botId === filter).slice(0, 20)} showBot />
  </div>;
}

export function CapabilitiesWidget({ bot, state, onRequest }: { bot: Bot; state: BotosState; onRequest: (id: string) => void }) {
  const skillRows = state.skills.filter(skill => bot.skillIds.includes(skill.id)).map(skill => ({ kind: 'skill' as const, id: skill.id, name: skill.name }));
  const connectorIds = new Set([...bot.mcpIds, ...(bot.requiredMcpIds ?? [])]);
  const connectorRows = state.mcps.filter(mcp => connectorIds.has(mcp.id)).map(mcp => ({ kind: 'mcp' as const, id: mcp.id, name: mcp.name, enabled: mcp.enabled }));
  if (!skillRows.length && !connectorRows.length) return <p className="bos-empty-note">暂无已授权能力。可在对话中申请需要的连接器。</p>;
  return <ul className="bos-governance-list">{[...skillRows, ...connectorRows].map(item => {
    const grant = grantFor(bot, item.kind, item.id);
    const active = item.kind === 'mcp' ? canUseConnector(state, bot, item.id) : hasGrant(bot, item.kind, item.id);
    const disabled = 'enabled' in item && !item.enabled;
    const pending = state.approvals.find(approval => approval.botId === bot.id && approval.kind === 'connector-access' && approval.targetId === item.id && approvalStatus(approval) === 'pending');
    return <li key={`${item.kind}:${item.id}`}>
      <div><strong>{item.name}</strong><small>{item.kind === 'skill' ? '技能' : '连接器'} · {grant ? `授权人 ${grant.grantedBy} · ${grant.expiresAt ? `${new Date(grant.expiresAt).toLocaleDateString('zh-CN')} 到期` : '长期有效'}` : '待授权'}</small></div>
      {disabled ? <span className="bos-tag">已停用</span> : active ? <span className="bos-tag">已授权</span>
        : pending?.submittedAt ? <span className="bos-tag">审批中</span>
          : item.kind === 'mcp' ? <button type="button" className="bos-secondary" onClick={() => onRequest(item.id)}>{pending ? '查看申请' : '申请授权'}</button>
            : <span className="bos-tag">授权已过期</span>}
    </li>;
  })}</ul>;
}
