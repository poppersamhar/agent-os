import { canUseConnector, grantCapability } from './capabilities';
import { botosReducer, incrementHistory, isAgent, withDashboardChange, type Bot, type BotMessage, type BotosState } from './botModel';
import { approvalStatus, auditApproval, decideApproval, expireApproval, submitApproval, type Approval, type ApprovalDecision } from './governance';
import { PERSONNEL_MCP_ID, personnelAnalysis, personnelAudit, personnelMessage, runPersonnel, type PersonnelAction, type PersonnelInput, type PersonnelResult } from './personnel';
import type { ExpertPublication } from './expertDefinitions';

export type GovernanceAction =
  | { type: 'personnel-run'; botId: string; input: PersonnelInput; mode: PersonnelAction; id: string; slotId: string; at: number }
  | { type: 'personnel-complete'; taskId: string; at: number }
  | { type: 'request-approval'; approval: Approval; messages?: BotMessage[] }
  | { type: 'submit-approval'; id: string; at: number }
  | { type: 'resolve-approval'; id: string; decision: ApprovalDecision; at: number }
  | { type: 'expire-approvals'; at: number }
  | { type: 'capture-expert'; publication: ExpertPublication; prompt: string; message: BotMessage; approval?: Approval };

const timeLabel = (at: number) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

function withBot(state: BotosState, bot: Bot): BotosState {
  return { ...state, bots: state.bots.map(item => item.id === bot.id ? bot : item) };
}

function finishPersonnel(state: BotosState, bot: Bot, result: PersonnelResult, slotId: string, at: number): BotosState {
  const direct = result.action === 'direct';
  const message: BotMessage = {
    id: `${result.id}-result`, author: direct ? 'source' : 'bot', name: direct ? '工作台' : bot.name,
    time: timeLabel(at), text: direct ? personnelMessage(result) : personnelAnalysis(result),
    execution: [{ path: '连接器', tool: direct ? 'lookup_personnel' : 'analyze_personnel', durationMs: direct ? 120 : 460 }],
  };
  const next = withBot(state, { ...bot, history: incrementHistory(bot.history), messages: [...bot.messages, message],
    personnelResults: { ...bot.personnelResults, [result.action]: result },
    widgetUpdates: { ...bot.widgetUpdates, [slotId]: at, 'mcp:personnel:audit': at, 'core:runs': at },
  });
  return { ...next, audit: [personnelAudit(result, bot), ...state.audit] };
}

function validTarget(state: BotosState, approval: Approval, at: number): boolean {
  const bot = state.bots.find(item => item.id === approval.botId);
  switch (approval.kind) {
    case 'publish':
      return !!state.expertPublications?.some(item => item.id === approval.targetId && item.status === 'pending');
    case 'connector-access':
      return !!bot && state.mcps.some(item => item.id === approval.targetId && item.enabled);
    case 'reveal-personnel':
      return !!bot && canUseConnector(state, bot, PERSONNEL_MCP_ID, at)
        && (bot.personnelResults?.direct?.id === approval.targetId && !!bot.personnelResults?.direct?.recordKey);
    case 'delete':
      return !!bot && isAgent(bot);
    case 'delete-memory':
      return !!bot?.memory.some(item => item.id === approval.targetId);
    case 'send-external':
      return !!bot && canUseConnector(state, bot, approval.targetId ?? 'feishu', at);
  }
}

function withDecision(state: BotosState, approval: Approval, at: number): BotosState {
  let next = { ...state, approvals: state.approvals.map(item => item.id === approval.id ? approval : item), audit: [auditApproval(approval), ...state.audit] };
  if (approval.kind === 'publish') {
    const status = approval.status === 'approved' ? 'approved' : 'rejected';
    return { ...next, expertPublications: next.expertPublications?.map(item => item.id === approval.targetId ? { ...item, status } : item) };
  }
  if (approval.status !== 'approved') return next;
  const bot = state.bots.find(item => item.id === approval.botId);
  if (!bot) return next;
  switch (approval.kind) {
    case 'connector-access': {
      const connector = state.mcps.find(item => item.id === approval.targetId);
      if (!connector) return next;
      const granted = grantCapability(bot, { kind: 'mcp', id: connector.id, grantedBy: 'Samhar', expiresAt: at + 30 * 24 * 60 * 60 * 1000 });
      return withBot(next, withDashboardChange(state, bot, granted, `mcp:${connector.id}`, connector.name));
    }
    case 'send-external':
      return botosReducer(next, { type: 'reply', botId: bot.id, messages: [{ id: `${approval.id}-sent`, author: 'source', name: `${approval.targetId === 'dingtalk' ? '钉钉' : '飞书'} · 模拟`,
        text: '审批已通过，已模拟将内容发到群聊。', time: timeLabel(at), execution: [{ path: '连接器', tool: '发送消息', durationMs: 230 }] }] });
    case 'delete-memory':
      return botosReducer(next, { type: 'forget', botId: bot.id, memoryId: approval.targetId ?? '' });
    case 'delete':
      next = botosReducer(next, { type: 'delete-bot', id: bot.id });
      return next;
    case 'reveal-personnel':
      return next;
  }
}

export function applyGovernance(state: BotosState, action: GovernanceAction): BotosState {
  switch (action.type) {
    case 'personnel-run': {
      const bot = state.bots.find(item => item.id === action.botId);
      if (!bot || !canUseConnector(state, bot, PERSONNEL_MCP_ID, action.at)) return state;
      if (state.audit.some(item => item.id === `${action.id}-audit`) || state.pending.some(task => task.id === action.id)) return state;
      const result = runPersonnel(action.input, action.mode, action.id, action.at);
      if (!result) return state;
      if (action.mode === 'direct') return finishPersonnel(state, bot, result, action.slotId, action.at);
      const request = personnelMessage(result);
      return botosReducer(state, { type: 'send', botId: bot.id,
        message: { id: `${action.id}-input`, author: 'user', name: 'Samhar', text: request, time: timeLabel(action.at),
          widgetInput: { slotId: action.slotId, subject: result.subject, reason: result.reason } },
        task: { id: action.id, botId: bot.id, request, personnel: result, slotId: action.slotId },
      });
    }
    case 'personnel-complete': {
      const task = state.pending.find(item => item.id === action.taskId);
      if (!task?.personnel || !task.slotId) return state;
      const next = { ...state, pending: state.pending.filter(item => item.id !== task.id) };
      const bot = state.bots.find(item => item.id === task.botId);
      if (!bot) return next;
      if (!canUseConnector(state, bot, PERSONNEL_MCP_ID, action.at)) {
        const entry = { ...personnelAudit(task.personnel, bot), result: '权限已失效，查询中止' };
        return withBot({ ...next, audit: [entry, ...next.audit] }, { ...bot, messages: [...bot.messages,
          { id: `${task.id}-denied`, author: 'bot', name: bot.name, text: '人员信息库的授权已失效，已中止分析。', time: timeLabel(action.at) }] });
      }
      return finishPersonnel(next, bot, task.personnel, task.slotId, action.at);
    }
    case 'request-approval': {
      const approval = action.approval;
      const existing = state.approvals.find(item => item.botId === approval.botId && item.kind === approval.kind && item.targetId === approval.targetId && (item.kind !== 'send-external' || item.detail === approval.detail) && approvalStatus(item, approval.requestedAt) === 'pending');
      const next = action.messages?.length ? botosReducer(state, { type: 'reply', botId: approval.botId, messages: action.messages }) : state;
      if (existing || !state.bots.some(item => item.id === approval.botId)) return next;
      return botosReducer({ ...next, approvals: [approval, ...next.approvals] }, { type: 'reply', botId: approval.botId,
        messages: [{ id: approval.id, approvalId: approval.id, author: 'source', name: '审批', time: timeLabel(approval.requestedAt), text: '' }],
      });
    }
    case 'submit-approval': {
      const approval = state.approvals.find(item => item.id === action.id);
      if (!approval) return state;
      return { ...state, approvals: state.approvals.map(item => item.id === action.id ? submitApproval(approval, action.at) : item) };
    }
    case 'resolve-approval': {
      const approval = state.approvals.find(item => item.id === action.id);
      if (!approval) return state;
      const decision = action.decision === 'approved' && !validTarget(state, approval, action.at) ? 'rejected' : action.decision;
      const result = decideApproval(approval, decision, action.at);
      return result === approval ? state : withDecision(state, result, action.at);
    }
    case 'expire-approvals':
      return state.approvals.reduce((next, approval) => {
        const expired = expireApproval(approval, action.at);
        return expired === approval ? next : withDecision(next, expired, action.at);
      }, state);
    case 'capture-expert': {
      const bot = state.bots.find(item => item.id === action.publication.botId);
      if (!bot || !isAgent(bot) || state.expertPublications?.some(item => item.id === action.publication.id || (item.botId === bot.id && item.status === 'pending'))) return state;
      const next = withBot({ ...state, expertPublications: [action.publication, ...(state.expertPublications ?? [])] },
        { ...bot, matured: true, prompt: action.prompt, messages: [...bot.messages, action.message] });
      return action.approval ? applyGovernance(next, { type: 'request-approval', approval: action.approval }) : next;
    }
  }
}
