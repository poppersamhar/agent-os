import { createApproval, type Approval, type AuditRecord } from './governance';

export const PERSONNEL_MCP_ID = 'personnel';
export const PERSONNEL_SAMPLE_ID = '990101199001010001';

export type PersonnelAction = 'direct' | 'agent';
export interface PersonnelInput { identity: string; reason: string }
export interface PersonnelResult {
  id: string;
  action: PersonnelAction;
  subject: string;
  reason: string;
  at: number;
  recordKey?: string;
}

// 99 开头的地区代码与这些人员记录仅用于演示。
const records = [
  { key: 'p1', identity: PERSONNEL_SAMPLE_ID, name: '张明', department: '运营部', active: true },
  { key: 'p2', identity: '990101199205140025', name: '陈雨', department: '研发部', active: true },
  { key: 'p3', identity: '99010219880129004X', name: '李然', department: '财务部', active: true },
  { key: 'p4', identity: '990102199510080036', name: '王珂', department: '采购部', active: false },
  { key: 'p5', identity: '990103199907190012', name: '赵宁', department: '设计部', active: true },
  { key: 'p6', identity: '990103199311270058', name: '林清', department: '客户服务部', active: false },
];

function maskIdentity(identity: string): string {
  return `${identity.slice(0, 4)}**********${identity.slice(-4)}`;
}

function redactReason(reason: string): string {
  return reason
    .replace(/[1-9]\d{16}[\dX]/gi, maskIdentity)
    .replace(/1[3-9]\d{9}/g, phone => `${phone.slice(0, 3)}****${phone.slice(-4)}`);
}

export function personnelValidation(input: PersonnelInput, action: PersonnelAction = 'direct'): string | null {
  const identity = input.identity.trim().toUpperCase();
  if (!/^[1-9]\d{5}(?:18|19|20)\d{9}[\dX]$/.test(identity)) return '请输入 18 位身份证号，末位可以是 X。';
  const birthDate = `${identity.slice(6, 10)}-${identity.slice(10, 12)}-${identity.slice(12, 14)}`;
  const date = new Date(birthDate);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate) return '身份证号中的出生日期无效。';
  if (action === 'direct' && !input.reason.trim()) return '请输入查询事由。';
  return null;
}

export function runPersonnel(input: PersonnelInput, action: PersonnelAction, id: string, at = Date.now()): PersonnelResult | null {
  if (personnelValidation(input, action)) return null;
  const identity = input.identity.trim().toUpperCase();
  const record = records.find(item => item.identity === identity);
  return { id, action, subject: maskIdentity(identity), reason: redactReason(input.reason.trim()) || '异常分析', at, recordKey: record?.key };
}

export function personnelMessage(result: PersonnelResult): string {
  if (result.action === 'agent') return `动作：异常分析\n查询对象：${result.subject}\n查询事由：${result.reason}`;
  return `你在面板查询了 ${result.subject}，事由：${result.reason}。${result.recordKey ? '查到记录，结果已脱敏。' : '未查到。'}`;
}

export function personnelAnalysis(result: PersonnelResult): string {
  const record = records.find(item => item.key === result.recordKey);
  if (!record) return `未查到 ${result.subject} 的人员记录。请核对证件号码与人员档案。`;
  if (!record.active) return `${result.subject} 的档案状态为离职。请与人事确认账号和业务权限是否已经回收。`;
  return `${result.subject} 的档案状态为在职。当前记录未发现异常。`;
}

export function personnelView(result: PersonnelResult, approval?: Approval) {
  const record = records.find(item => item.key === result.recordKey);
  if (!record) return null;
  const revealed = approval?.kind === 'reveal-personnel' && approval.targetId === result.id && approval.status === 'approved';
  return {
    name: revealed ? record.name : `${record.name[0]}*`,
    identity: revealed ? record.identity : result.subject,
    department: record.department,
    status: record.active ? '在职' : '离职',
  };
}

export function personnelAudit(result: PersonnelResult, bot: { id: string; name: string }): AuditRecord {
  return {
    id: `${result.id}-audit`, botId: bot.id, botName: bot.name, at: result.at, actor: 'Samhar',
    action: result.action === 'direct' ? '人员查询' : '异常分析', subject: result.subject, reason: result.reason,
    result: result.action === 'agent' ? personnelAnalysis(result) : result.recordKey ? '查到记录' : '未查到',
  };
}

export function personnelApproval(result: PersonnelResult, bot: { id: string; name: string }, approvalId: string, at = Date.now()): Approval | null {
  if (result.action !== 'direct' || !result.recordKey) return null;
  return createApproval({
    id: approvalId, botId: bot.id, botName: bot.name, kind: 'reveal-personnel', title: '查看完整人员信息',
    detail: `查询对象 ${result.subject}。事由：${result.reason}`, impact: '在当前智能体的查询面板显示本次结果的完整姓名和证件号码。',
    targetId: result.id, subject: result.subject,
  }, at);
}
