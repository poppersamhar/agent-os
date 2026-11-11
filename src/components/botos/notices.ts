import { useEffect, useState } from 'react';

// 通知中心的数据：围绕「发布到企业市场 需要审批」。

export type NoticeKind = 'review-request' | 'approved' | 'rejected' | 'submitted' | 'update';
export interface Notice {
  id: string; kind: NoticeKind; title: string; detail: string; time: string; read: boolean;
  /** 审批请求的处理结果（我是审批人时） */
  decision?: 'approved' | 'rejected';
  link?: string;
}

const NOTICE_KEY = 'agentos-notices-v1';
const seedNotices: Notice[] = [
  { id: 'n-review-1', kind: 'review-request', title: '王珂 申请发布技能「客服工单分析」', detail: '发布到企业市场 · 依赖连接器「工单系统」，需要你审批。', time: '10 分钟前', read: false },
  { id: 'n-approved-1', kind: 'approved', title: '「周报生成」已通过审批', detail: '已上架企业市场，同事现在可以在市场里添加。', time: '1 小时前', read: false, link: '?view=market&kind=skill' },
  { id: 'n-rejected-1', kind: 'rejected', title: '「合同审查专家」发布被退回', detail: '法务部 · 李然：缺少使用说明和适用合同类型，补充后可重新提交。', time: '昨天', read: false, link: '?view=market&kind=expert' },
  { id: 'n-submitted-1', kind: 'submitted', title: '「竞品调研」已提交审批', detail: '发布到企业市场，等待平台管理员审批。', time: '昨天', read: true },
  { id: 'n-update-1', kind: 'update', title: '「竞品调研专家」有新版本 2.1.0', detail: '新增定价变化提醒。你添加的这个专家可以一键更新。', time: '2 天前', read: true, link: '?view=market&kind=expert' },
];

function restore(): Notice[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(NOTICE_KEY) ?? 'null');
    if (Array.isArray(value) && value.every(n => n && typeof n.id === 'string' && typeof n.read === 'boolean')) return value as Notice[];
  } catch { /* 读取失败时用示例 */ }
  return seedNotices;
}

export function useNotices(): [Notice[], (next: Notice[]) => void] {
  const [notices, setNotices] = useState<Notice[]>(restore);
  useEffect(() => { try { localStorage.setItem(NOTICE_KEY, JSON.stringify(notices)); } catch { /* 仅本次生效 */ } }, [notices]);
  return [notices, setNotices];
}

