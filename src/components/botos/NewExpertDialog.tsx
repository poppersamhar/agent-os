import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Plus, X } from 'lucide-react';
import BotFace, { BotFaceStack } from './BotFace';
import { faceColors, faceName, isReservedFace, pickableShapes, type FaceSpec } from './botFaces';
import { draftFace, emptyDraft, type BotDraft } from './botDraft';
import type { BotosState } from './botModel';
import { installItem, isInstalled, kindLabels, marketCatalog, teamMembers, type ExpertItem, type TeamItem } from './marketCatalog';
import './NewExpertDialog.css';

/**
 * 新建智能体：左边只要起名、选形状和颜色就能创建；右边是市场里推荐的专家和专家团，一键添加。
 * 不需要配置技能、连接器：专家会在工作中自己添加或移除需要的能力。
 */
export default function NewExpertDialog({ state, onClose, onCreate, onInstall }: {
  state: BotosState;
  onClose: () => void;
  onCreate: (draft: BotDraft) => void;
  /** 添加市场条目后的新状态 */
  onInstall: (next: BotosState) => void;
}) {
  const [name, setName] = useState('');
  const [face, setFace] = useState<FaceSpec>(() => draftFace(emptyDraft(), state));
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);

  const recommended = useMemo(() => marketCatalog
    .filter((item): item is ExpertItem | TeamItem => (item.kind === 'expert' || item.kind === 'team') && !isInstalled(state, item))
    .sort((a, b) => b.installs - a.installs).slice(0, 6), [state]);

  const createQuick = () => { if (name.trim()) onCreate({ ...emptyDraft(), name: name.trim(), face }); };

  return <div className="bos-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="bos-modal nx-modal" role="dialog" aria-modal="true" aria-label="新建智能体">
      <header>
        <h2>新建智能体<span className="nx-sub">，完成任务或项目</span></h2>
        <button type="button" className="bos-icon" aria-label="关闭" onClick={onClose}><X size={16} /></button>
      </header>

      <div className="nx-body">
        <section className="nx-create" aria-label="自己创建">
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

        <section className="nx-recs" aria-label="推荐">
          <header><h3>直接用现成的专家和专家团</h3><a href="?view=market">去市场 <ArrowUpRight size={12} /></a></header>
          {recommended.length ? <ul>{recommended.map(item => {
            const members = item.kind === 'team' ? teamMembers(item) : [];
            return <li key={item.id}>
              {item.kind === 'expert' ? <BotFace face={item.face} size={40} /> : <BotFaceStack faces={members.map(m => m.face)} size={40} />}
              <div>
                <strong>{item.name}<span className="mk-tag">{kindLabels[item.kind]}</span></strong>
                <p>{item.summary}</p>
                <small>{item.owner} · {item.installs.toLocaleString()} 次添加{members.length ? ` · ${members.length} 位成员` : ''}</small>
              </div>
              <button type="button" className="bos-secondary" onClick={() => onInstall(installItem(state, item))} aria-label={`添加 ${item.name}`}><Plus size={13} />添加</button>
            </li>;
          })}</ul> : <p className="bos-hint"><Check size={13} /> 市场里的专家都已添加。</p>}
        </section>
      </div>

      <footer>
        <button type="button" className="bos-secondary" onClick={onClose}>取消</button>
        <button type="button" className="bos-primary" disabled={!name.trim()} onClick={createQuick}>创建</button>
      </footer>
    </div>
  </div>;
}
