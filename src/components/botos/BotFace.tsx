import type { CSSProperties } from 'react';
import { faceEye, faceFill, faceShapes, type FaceSpec, type FaceState } from './botFaces';
import './BotFace.css';

interface Props { face: FaceSpec; size?: number; state?: FaceState; title?: string; /** 「刚完成」的蹦跳循环播放（样稿和预览用）；产品里只蹦一次 */ loop?: boolean }

/** Bot 头像。眼睛表达状态：空闲眨眼、工作中左右看、需要你看向你并亮朱砂舵点、完成后眯眼。 */
export default function BotFace({ face, size = 42, state = 'idle', title, loop = false }: Props) {
  const shape = faceShapes[face.shape];
  const small = size <= 24;
  const eyeR = small ? 3.8 : 3;
  const { y, dx } = shape.eyes;
  const xs = [24 - dx, 24 + dx];
  const style = {
    width: size, height: size,
    '--kdx-face-fill': faceFill(face.color),
    '--kdx-face-eye-color': faceEye(face.color),
  } as CSSProperties;
  return <span className={`kdx-face kdx-face--${state} kdx-face--${face.color}${loop ? ' kdx-face--loop' : ''}`} style={style} title={title} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <g className="kdx-face-squish">
        <g className="kdx-face-body">
          {shape.parts.map((part, i) => part.kind === 'path'
            ? <path key={i} d={part.d} strokeWidth={part.round} />
            : part.kind === 'circle'
              ? <circle key={i} cx={part.cx} cy={part.cy} r={part.r} />
              : <circle key={i} className="kdx-face-ring" cx={part.cx} cy={part.cy} r={part.r} strokeWidth={part.width} />)}
        </g>
        <g className="kdx-face-eyes">
          {state === 'done'
            ? xs.map(x => <path key={x} className="kdx-face-smile" d={`M${x - 3} ${y + 1.2}Q${x} ${y - 2.8} ${x + 3} ${y + 1.2}`} strokeWidth={small ? 2.8 : 2.2} />)
            : xs.map(x => <circle key={x} cx={x} cy={y} r={eyeR} />)}
        </g>
      </g>
      {state === 'needs' ? <circle className="kdx-face-helm" cx={small ? 39 : 40} cy={small ? 9 : 8} r={small ? 7 : 5} /> : null}
    </svg>
  </span>;
}

/** 群聊头像：2–3 个成员头像叠放。 */
export function BotFaceStack({ faces, size = 42 }: { faces: FaceSpec[]; size?: number }) {
  const shown = faces.slice(0, 3);
  const item = Math.round(size * (shown.length > 2 ? 0.6 : 0.66));
  const far = size - item;
  const spots = shown.length > 2 ? [[far / 2, 0], [0, far], [far, far]] : [[0, 0], [far, far]];
  return <span className="kdx-face-stack" style={{ width: size, height: size }} aria-hidden="true">
    {shown.map((face, i) => <span key={i} className="kdx-face-stack-item" style={{ left: spots[i][0], top: spots[i][1] }}><BotFace face={face} size={item} /></span>)}
  </span>;
}
