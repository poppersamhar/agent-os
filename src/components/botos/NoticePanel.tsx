import { useEffect, useState } from 'react';
import type { Notice } from './notices';
import { ArrowUpRight, Check, CircleCheck, CircleX, RefreshCw, Send, X } from 'lucide-react';

// 通知中心：围绕「发布到企业市场 需要审批」。
// 这里只放需要知道或需要决定的「流程事件」；专家日常的「需要你」仍在工作台的「待你处理」里，不重复。

const icons = { 'review-request': Send, approved: CircleCheck, rejected: CircleX, submitted: Send, update: RefreshCw };

export default function NoticePanel({ notices, onChange, onClose }: { notices: Notice[]; onChange: (next: Notice[]) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'all' | 'review'>('all');
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const pendingReviews = notices.filter(n => n.kind === 'review-request' && !n.decision).length;
  const list = tab === 'review' ? notices.filter(n => n.kind === 'review-request') : notices;
  const update = (id: string, patch: Partial<Notice>) => onChange(notices.map(n => n.id === id ? { ...n, ...patch } : n));
  return <div className="bos-notices" role="dialog" aria-label="通知">
    <header>
      <strong>通知</strong>
      <button type="button" className="bos-link-button" disabled={!notices.some(n => !n.read)} onClick={() => onChange(notices.map(n => ({ ...n, read: true })))}>全部已读</button>
      <button type="button" className="bos-icon" aria-label="关闭通知" onClick={onClose}><X size={14} /></button>
    </header>
    <div className="bos-segment bos-notices-tabs" role="group" aria-label="筛选">
      <button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>全部</button>
      <button type="button" aria-pressed={tab === 'review'} onClick={() => setTab('review')}>待我审批{pendingReviews ? ` ${pendingReviews}` : ''}</button>
    </div>
    <ul>{list.map(n => {
      const Icon = icons[n.kind];
      return <li key={n.id} className={`bos-notice bos-notice--${n.kind}${n.read ? '' : ' is-unread'}`} onClick={() => { if (!n.read) update(n.id, { read: true }); }}>
        <Icon size={15} className="bos-notice-icon" />
        <div>
          <strong>{n.title}</strong>
          <p>{n.detail}</p>
          {n.kind === 'review-request' ? n.decision
            ? <span className={`bos-notice-result is-${n.decision}`}><Check size={12} />{n.decision === 'approved' ? '你已通过，已上架企业市场' : '你已退回'}</span>
            : <span className="bos-notice-actions">
              <button type="button" className="bos-primary" onClick={e => { e.stopPropagation(); update(n.id, { decision: 'approved', read: true }); }}>通过</button>
              <button type="button" className="bos-secondary" onClick={e => { e.stopPropagation(); update(n.id, { decision: 'rejected', read: true }); }}>退回</button>
            </span> : null}
          <small>{n.time}{n.link ? <a href={n.link} onClick={e => e.stopPropagation()}>在市场查看 <ArrowUpRight size={11} /></a> : null}</small>
        </div>
        {n.read ? null : <i className="bos-notice-dot" aria-label="未读" />}
      </li>;
    })}</ul>
    <footer>原型数据 · 发布、审批流程尚未接入后端</footer>
  </div>;
}
