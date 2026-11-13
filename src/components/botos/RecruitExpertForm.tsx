import { useState } from 'react';
import { Plug } from 'lucide-react';
import type { BotosState } from './botModel';
import { connectorFor, itemDeps, recruitmentName, type RecruitableItem, type RecruitOptions } from './marketCatalog';
import './NewExpertDialog.css';

export default function RecruitExpertForm({ state, item, groupId, onRecruit, onBack }: {
  state: BotosState; item: RecruitableItem; groupId?: string;
  onRecruit: (options: RecruitOptions) => void; onBack: () => void;
}) {
  const [name, setName] = useState(() => recruitmentName(state, item));
  const [approved, setApproved] = useState<string[]>([]);
  const ids = itemDeps(item).mcpIds;

  return <form className="nx-recruit-form" onSubmit={event => {
    event.preventDefault();
    if (name.trim()) onRecruit({ name, approvedMcpIds: approved, groupId });
  }}>
    <div className="nx-recruit-summary"><h3>{item.name}</h3><p className="bos-hint">{item.summary}</p></div>
    <label className="bos-field"><span>智能体名称</span><input autoFocus value={name} onChange={event => setName(event.target.value)} required /></label>
    {ids.length ? <fieldset className="nx-permissions">
      <legend>授权连接器</legend>
      <p className="bos-hint">逐个确认新智能体可以使用的连接器。跳过的连接器会显示为「待授权」。</p>
      {ids.map(id => {
        const connector = connectorFor(state, id);
        const checked = approved.includes(id);
        return <label key={id}>
          <input type="checkbox" checked={checked} disabled={!connector?.enabled} onChange={event => {
            setApproved(event.target.checked ? [...approved, id] : approved.filter(item => item !== id));
          }} />
          <Plug size={15} aria-hidden="true" /><span>{connector?.name ?? id}</span><small>{!connector?.enabled ? '不可用' : checked ? '已确认' : '待授权'}</small>
        </label>;
      })}
    </fieldset> : null}
    <footer><button type="button" className="bos-secondary" onClick={onBack}>返回</button><button type="submit" className="bos-primary" disabled={!name.trim()}>{groupId ? '招募到群' : '确认招募'}</button></footer>
  </form>;
}
