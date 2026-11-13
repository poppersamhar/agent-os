import { ArrowLeft, Trash2, X } from 'lucide-react';
import { agentLabel, faceStateOf, memberBots, type Bot, type BotosState, type Mcp, type Skill } from './botModel';
import BotAvatar from './BotAvatar';
import { findItem } from './marketCatalog';

export default function MarketAgentDetail({ bot, state, onBack, onOpenBot, onRequestDeletion }: { bot: Bot; state: BotosState; onBack: () => void; onOpenBot: (id: string) => void; onRequestDeletion?: (bot: Bot, memoryId?: string) => void }) {
  const skills = bot.skillIds.map(id => state.skills.find(s => s.id === id)).filter((s): s is Skill => !!s);
  const mcps = bot.mcpIds.map(id => state.mcps.find(m => m.id === id)).filter((m): m is Mcp => !!m);
  const members = memberBots(state, bot);
  const source = bot.sourceId ? findItem(bot.sourceId, state) : undefined;
  return <aside className="mk-detail" aria-label={`${bot.name} 智能体详情`}>
    <button type="button" className="bos-back" onClick={onBack}><ArrowLeft size={14} />返回市场</button>
    <div className="bos-detail-title"><BotAvatar bot={bot} size={44} state={faceStateOf(state, bot)} members={members} /><div><h2>{bot.name}</h2><p>{bot.kind === 'group' ? `专家团 · ${members.length} 个成员` : `${agentLabel(bot)} · 创建于 ${bot.createdAt}`}</p></div>
      <button type="button" className="bos-secondary" onClick={() => onOpenBot(bot.id)}>打开对话</button></div>
    <>
      <p className="bos-readonly-note">技能和连接器由智能体在工作中自己添加或移除，这里只展示当前状态。{source ? `初始能力来自市场「${source.name}」。` : ''}想调整它的做法，直接在对话里告诉它。</p>
      <dl className="bos-facts">
        <div className="bos-fact-wide"><dt>角色与目标</dt><dd>{bot.prompt || '还没有设定，智能体会在对话中逐步形成。'}</dd></div>
        <div><dt>模型</dt><dd>{bot.model}</dd></div>
      </dl>
      {bot.kind === 'group' ? <><h3 className="bos-section-title">成员 <small>{members.length} 个智能体</small></h3>
        <ul className="bos-install">{members.map(m => <li key={m.id}><button type="button" className="bos-row-link" onClick={() => onOpenBot(m.id)}><span className="bos-row-name"><BotAvatar bot={m} size={24} />{m.name}</span></button></li>)}</ul></> : null}
      <h3 className="bos-section-title">技能 <small>{skills.length} 项</small></h3>
      {skills.length ? <div className="bos-chips">{skills.map(s => <span key={s.id} className="bos-tag bos-tag--cap">{s.name}</span>)}</div> : <p className="bos-hint">还没有技能，需要时专家会自己添加。</p>}
      <h3 className="bos-section-title">连接器 <small>{mcps.length} 个</small></h3>
      {mcps.length ? <div className="bos-chips">{mcps.map(m => <span key={m.id} className={`bos-tag bos-tag--cap${m.enabled ? '' : ' is-off'}`} title={m.enabled ? undefined : '已被管理员停用'}>{m.name}{m.enabled ? '' : '（已停用）'}</span>)}</div> : <p className="bos-hint">还没有连接器，需要时专家会自己申请。</p>}
    </>
    <h3 className="bos-section-title">记忆 <small>{bot.memory.length} 条 · 可逐条查看与删除</small></h3>
    {bot.memory.length ? <ul className="bos-memory">{bot.memory.map(m => <li key={m.id}>
      <span className={`bos-tag bos-tag--${m.scope}`}>{m.scope === 'team' ? '团队' : '个人'}</span><p>{m.text}</p><small>{m.createdAt}</small>
      {onRequestDeletion ? <button type="button" className="bos-icon" aria-label={`删除记忆：${m.text}`} onClick={() => onRequestDeletion?.(bot, m.id)}><X size={13} /></button> : null}
    </li>)}</ul> : <p className="bos-hint">还没有记忆。对话中确认过的偏好与事实会保存在这里。</p>}
    {onRequestDeletion ? <div className="bos-form-actions"><button type="button" className="bos-ghost-danger" onClick={() => onRequestDeletion?.(bot)}><Trash2 size={13} />申请删除</button></div> : null}
  </aside>;
}
