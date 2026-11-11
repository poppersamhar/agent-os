import { useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import BotFace from './BotFace';
import { faceColors, faceName, isReservedFace, pickableShapes, recommendFaces, sameFace, type FaceSpec, type FaceState } from './botFaces';
import './FacePicker.css';

const previewStates: { id: FaceState; name: string }[] = [
  { id: 'idle', name: '空闲' }, { id: 'working', name: '工作中' }, { id: 'needs', name: '需要你' }, { id: 'done', name: '刚完成' },
];

/** 头像选择面板：形象（形状 × 颜色）/ 生成（按角色推荐）/ 上传。上方实时预览四种状态。 */
export default function FacePicker({ value, onChange, prompt, auto = false, compact = false }: {
  value: FaceSpec; onChange: (face: FaceSpec) => void; prompt: string; auto?: boolean; compact?: boolean;
}) {
  const [tab, setTab] = useState<'pick' | 'gen' | 'upload'>('pick');
  const recs = useMemo(() => recommendFaces(prompt), [prompt]);
  const preview = compact ? 44 : 56;
  return <div className={`kdx-picker${compact ? ' kdx-picker--compact' : ''}`}>
    <div className="kdx-picker-preview">{previewStates.map(s => <figure key={s.id}><BotFace face={value} size={preview} state={s.id} loop /><figcaption>{s.name}</figcaption></figure>)}</div>
    <div className="kdx-tabs" role="tablist" aria-label="头像来源">
      {([['pick', '形象'], ['gen', '生成'], ['upload', '上传']] as const).map(([id, name]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{name}</button>)}
    </div>
    {tab === 'pick' ? <>
      <p className="kdx-label">形状</p>
      <div className="kdx-picker-row">{pickableShapes.map(shape => <button key={shape.id} type="button" aria-pressed={value.shape === shape.id} aria-label={shape.name}
        disabled={isReservedFace({ shape: shape.id, color: value.color })} title={isReservedFace({ shape: shape.id, color: value.color }) ? '这个组合留给系统智能体' : shape.name}
        onClick={() => onChange({ ...value, shape: shape.id })}><BotFace face={{ shape: shape.id, color: value.color }} size={30} /></button>)}</div>
      <p className="kdx-label">颜色</p>
      <div className="kdx-picker-row">{faceColors.map(color => <button key={color.id} type="button" className="kdx-swatch" aria-pressed={value.color === color.id} aria-label={color.name}
        disabled={isReservedFace({ shape: value.shape, color: color.id })} title={isReservedFace({ shape: value.shape, color: color.id }) ? '这个组合留给系统智能体' : color.name}
        onClick={() => onChange({ ...value, color: color.id })}><i style={{ background: color.fill }} /></button>)}</div>
    </> : tab === 'gen' ? <>
      <p className="kdx-label">按智能体的角色与目标推荐</p>
      <div className="kdx-picker-row">{recs.map(rec => <button key={`${rec.shape}-${rec.color}`} type="button" className="kdx-rec" aria-pressed={sameFace(rec, value)} onClick={() => onChange(rec)}>
        <BotFace face={rec} size={40} /><small>{faceName(rec)}</small></button>)}</div>
      <p className="kdx-note">原型先按关键词推荐，之后可以接模型生成。</p>
    </> : <div className="kdx-upload"><ImagePlus size={22} /><strong>上传图片</strong><span>原型暂不支持。之后会裁成圆形，状态改用右上角朱砂点表示。</span></div>}
    <p className="kdx-note">{faceName(value)}{auto ? ' · 按名称自动分配，选一个就会固定下来' : ''}</p>
  </div>;
}
