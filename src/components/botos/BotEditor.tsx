import { useMemo } from 'react';
import { composeDashboard, type Bot, type BotosState } from './botModel';
import { draftToBot, models, type BotDraft } from './botDraft';
import { botTemplates } from './botosSeed';


const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

/** 仪表盘预览：只画 Spec 的结构，让用户看到「能力 → 仪表盘」的对应关系。 */
export function SpecPreview({ bot, state }: { bot: Bot; state: BotosState }) {
  const spec = useMemo(() => composeDashboard(bot, state.skills, state.mcps), [bot, state.skills, state.mcps]);
  return <div className="bos-spec-preview" aria-label="仪表盘预览">
    {spec.widgets.map(w => <div key={w.id} className={`bos-spec-cell bos-card--span${w.span}${w.source === 'core' ? '' : ' is-contributed'}`}>
      <strong>{w.title}</strong>
      <small>{w.source === 'core' ? '通用' : w.source.startsWith('skill:') ? `Skill · ${state.skills.find(s => `skill:${s.id}` === w.source)?.name}` : `MCP · ${state.mcps.find(m => `mcp:${m.id}` === w.source)?.name}`}</small>
    </div>)}
  </div>;
}

export default function BotEditor({ draft, onChange, state, editingId, showTemplates = false }: { draft: BotDraft; onChange: (draft: BotDraft) => void; state: BotosState; editingId?: string; showTemplates?: boolean }) {
  const set = (patch: Partial<BotDraft>) => onChange({ ...draft, ...patch });
  const candidates = state.bots.filter(b => b.kind === 'bot' && b.id !== editingId);
  return <div className="bos-editor">
    <div className="bos-editor-form">
      {showTemplates ? <div className="bos-field"><span>从模板开始</span><div className="bos-chips">
        {botTemplates.map(t => <button type="button" key={t.id} className="bos-chip-toggle" onClick={() => set({ name: t.name, prompt: t.prompt, skillIds: t.skillIds, mcpIds: t.mcpIds, kind: 'bot' })}>{t.name}</button>)}
      </div></div> : null}
      {!editingId ? <div className="bos-field"><span>类型</span><div className="bos-segment" role="group" aria-label="类型">
        <button type="button" aria-pressed={draft.kind === 'bot'} onClick={() => set({ kind: 'bot' })}>Bot</button>
        <button type="button" aria-pressed={draft.kind === 'group'} onClick={() => set({ kind: 'group' })}>群聊（专家团）</button>
      </div></div> : null}
      <label className="bos-field"><span>名称</span><input value={draft.name} onChange={e => set({ name: e.target.value })} placeholder={draft.kind === 'group' ? '例如：品牌专家团' : '例如：竞品调研'} /></label>
      <label className="bos-field"><span>角色与目标（prompt）</span><textarea rows={3} value={draft.prompt} onChange={e => set({ prompt: e.target.value })} placeholder="这个 Bot 负责什么、怎样算做好" /></label>
      <label className="bos-field"><span>模型</span><select value={draft.model} onChange={e => set({ model: e.target.value })}>{models.map(m => <option key={m}>{m}</option>)}</select></label>
      {draft.kind === 'group' ? <div className="bos-field"><span>群聊成员</span><div className="bos-chips">
        {candidates.map(b => <button type="button" key={b.id} className="bos-chip-toggle" aria-pressed={draft.memberIds.includes(b.id)} onClick={() => set({ memberIds: toggle(draft.memberIds, b.id) })}>{b.name}</button>)}
      </div></div> : null}
      <div className="bos-field"><span>Skill</span><div className="bos-chips">
        {state.skills.map(s => <button type="button" key={s.id} className="bos-chip-toggle" aria-pressed={draft.skillIds.includes(s.id)} onClick={() => set({ skillIds: toggle(draft.skillIds, s.id) })}>{s.name}</button>)}
      </div></div>
      <div className="bos-field"><span>MCP</span><div className="bos-chips">
        {state.mcps.map(m => <button type="button" key={m.id} className="bos-chip-toggle" aria-pressed={draft.mcpIds.includes(m.id)} disabled={!m.enabled} title={m.enabled ? undefined : '该 MCP 已停用'} onClick={() => set({ mcpIds: toggle(draft.mcpIds, m.id) })}>{m.name}</button>)}
      </div></div>
    </div>
    <div className="bos-editor-preview">
      <span className="bos-field-label">将生成的仪表盘</span>
      <SpecPreview bot={draftToBot(draft, editingId)} state={state} />
      <p className="bos-hint">仪表盘由 prompt 和已装的 Skill / MCP 组装而成。增减能力，仪表盘随之变化。</p>
    </div>
  </div>;
}
