import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import BotFace, { BotFaceStack } from './BotFace';
import { faceColors, faceName, isReservedFace, pickableShapes, type FaceSpec } from './botFaces';
import { draftFace, emptyDraft, type BotDraft } from './botDraft';
import type { BotosState } from './botModel';
import { availableDefinitions } from './expertDefinitions';
import { kindLabels, recruitItem, teamMembers, type RecruitableItem } from './marketCatalog';
import RecruitExpertForm from './RecruitExpertForm';
import './NewExpertDialog.css';

export default function NewExpertDialog({ state, onClose, onCreate, onInstall, groupId, initialExpert }: {
  state: BotosState;
  onClose: () => void;
  onCreate: (draft: BotDraft) => void;
  onInstall: (next: BotosState) => void;
  groupId?: string;
  initialExpert?: RecruitableItem;
}) {
  const [tab, setTab] = useState<'blank' | 'recruit'>(groupId || initialExpert ? 'recruit' : 'blank');
  const [selected, setSelected] = useState<RecruitableItem | null>(initialExpert ?? null);
  const [name, setName] = useState('');
  const [face, setFace] = useState<FaceSpec>(() => draftFace(emptyDraft(), state));
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (tab === 'blank') nameRef.current?.focus(); }, [tab]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);

  const definitions = useMemo(() => availableDefinitions(state).filter(item => !groupId || item.kind === 'expert'), [state, groupId]);

  const createQuick = () => { if (name.trim()) onCreate({ ...emptyDraft(), name: name.trim(), face }); };

  return <div className="bos-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="bos-modal nx-modal" role="dialog" aria-modal="true" aria-label={groupId ? '招募专家进群' : '新建智能体'}>
      <header>
        <h2>{groupId ? '招募专家进群' : '新建智能体'}</h2>
        <button type="button" className="bos-icon" aria-label="关闭" onClick={onClose}><X size={16} /></button>
      </header>
      {groupId ? null : <div className="nx-tabs">
        <div className="bos-segment" role="group" aria-label="新建方式">
          <button type="button" aria-pressed={tab === 'blank'} onClick={() => { setTab('blank'); setSelected(null); }}>从空白开始</button>
          <button type="button" aria-pressed={tab === 'recruit'} onClick={() => setTab('recruit')}>招募专家</button>
        </div>
      </div>}
      {tab === 'blank' ? <>
        <section className="nx-create" aria-label="从空白开始">
          <div className="nx-preview"><BotFace face={face} size={112} /></div>
          <input ref={nameRef} className="nx-name" value={name} onChange={e => setName(e.target.value)} placeholder="给智能体起个名字"
            aria-label="智能体名称" onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) createQuick(); }} />
          <div className="nx-shapes" role="group" aria-label="形状">
            {pickableShapes.map(shape => {
              const locked = isReservedFace({ shape: shape.id, color: face.color });
              return <button key={shape.id} type="button" aria-pressed={face.shape === shape.id} aria-label={shape.name} disabled={locked}
                title={locked ? '这个组合留给系统智能体' : shape.name} onClick={() => setFace(f => ({ ...f, shape: shape.id }))}>
                <BotFace face={{ shape: shape.id, color: face.color }} size={40} />
              </button>;
            })}
          </div>
          <div className="nx-colors" role="group" aria-label="颜色">
            {faceColors.map(color => {
              const locked = isReservedFace({ shape: face.shape, color: color.id });
              return <button key={color.id} type="button" aria-pressed={face.color === color.id} aria-label={color.name} disabled={locked}
                title={locked ? '这个组合留给系统智能体' : color.name} onClick={() => setFace(f => ({ ...f, color: color.id }))}>
                <i style={{ background: color.fill }} />
              </button>;
            })}
          </div>
          <p className="bos-hint nx-hint">{faceName(face)} · 创建后在对话里告诉它要做什么，它会在工作中自己添加需要的技能和连接器。</p>
        </section>

        <footer>
          <button type="button" className="bos-secondary" onClick={onClose}>取消</button>
          <button type="button" className="bos-primary" disabled={!name.trim()} onClick={createQuick}>创建</button>
        </footer>
      </> : selected ? <RecruitExpertForm key={selected.id} state={state} item={selected} groupId={groupId}
        onRecruit={options => onInstall(recruitItem(state, selected, options))} onBack={() => setSelected(null)} />
        : <section className="nx-recs" aria-label="可招募的专家">
          <header><h3>{groupId ? '选择专家' : '专家和专家团'}</h3><a href="?view=market">去市场 <ArrowUpRight size={12} /></a></header>
          <ul>{definitions.map(item => {
            const members = item.kind === 'team' ? teamMembers(item) : [];
            return <li key={item.id}>
              {item.kind === 'expert' ? <BotFace face={item.face} size={40} /> : <BotFaceStack faces={members.map(m => m.face)} size={40} />}
              <div>
                <strong>{item.name}<span className="mk-tag">{kindLabels[item.kind]}</span></strong>
                <p>{item.summary}</p>
                <small>{item.owner}{members.length ? ` · ${members.length} 位成员` : ''}</small>
              </div>
              <button type="button" className="bos-secondary" onClick={() => setSelected(item)} aria-label={`招募 ${item.name}`}><Plus size={13} />招募</button>
            </li>;
          })}</ul>
        </section>}
    </div>
  </div>;
}
