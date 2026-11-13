import { canUseConnector, grantFor, hasGrant } from './capabilities';
import { approvalStatus } from './governance';
import type { Bot, BotosState } from './botModel';

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
