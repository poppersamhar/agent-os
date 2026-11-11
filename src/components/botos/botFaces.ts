// Bot 头像：形状 × 颜色 × 两点眼睛。
// 遵循 KodaX：线条端点圆头、圆点是基本单元、低饱和无渐变。

export type FaceShapeId = 'round' | 'pill' | 'bean' | 'square' | 'arch' | 'drop' | 'leaf' | 'peanut' | 'bowl' | 'tri' | 'diamond' | 'bloom' | 'helm';
export type FaceColorId = 'indigo' | 'cinnabar' | 'taupe' | 'black';
export type FaceState = 'idle' | 'working' | 'needs' | 'done';
export interface FaceSpec { shape: FaceShapeId; color: FaceColorId }

export type FacePart =
  | { kind: 'path'; d: string; round: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ring'; cx: number; cy: number; r: number; width: number };

export interface FaceShape { id: FaceShapeId; name: string; parts: FacePart[]; eyes: { y: number; dx: number }; reserved?: boolean }

const circle = (cx: number, cy: number, r: number): FacePart => ({ kind: 'circle', cx, cy, r });
const path = (d: string, round = 4): FacePart => ({ kind: 'path', d, round });

/**
 * 画布 48×48。路径用同色描边 + 圆角连接，让所有转角都是圆头。
 * 圆润可爱版：形状更胖、转角半径更大；眼睛偏下、分得开（眼距窄会像纽扣孔），留出「额头」，更像小动物。
 */
export const faceShapeList: FaceShape[] = [
  { id: 'round', name: '圆', parts: [circle(24, 24, 19.5)], eyes: { y: 26, dx: 7.5 } },
  { id: 'pill', name: '胶囊', parts: [path('M24 5a13 13 0 0 1 13 13v12a13 13 0 0 1-26 0V18A13 13 0 0 1 24 5z')], eyes: { y: 24, dx: 6 } },
  { id: 'bean', name: '豆', parts: [path('M17 11h14a13 13 0 0 1 0 26H17a13 13 0 0 1 0-26z')], eyes: { y: 25, dx: 8 } },
  { id: 'square', name: '方', parts: [path('M21 7h6a14 14 0 0 1 14 14v6a14 14 0 0 1-14 14h-6A14 14 0 0 1 7 27v-6A14 14 0 0 1 21 7z')], eyes: { y: 26, dx: 7.5 } },
  { id: 'arch', name: '拱', parts: [path('M8 36V24a16 16 0 0 1 32 0v12a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z')], eyes: { y: 29, dx: 7 } },
  { id: 'drop', name: '水滴', parts: [path('M24 5C30 12 39 19 39 29a15 15 0 0 1-30 0C9 19 18 12 24 5z', 7)], eyes: { y: 31, dx: 6.5 } },
  { id: 'leaf', name: '叶', parts: [path('M9 39C9 19 19 9 39 9C39 29 29 39 9 39z', 8)], eyes: { y: 25, dx: 5.5 } },
  { id: 'peanut', name: '团子', parts: [circle(17, 25, 13.5), circle(31, 25, 13.5)], eyes: { y: 25, dx: 7 } },
  { id: 'bowl', name: '碗', parts: [path('M6 15h36a18 18 0 0 1-36 0z', 8)], eyes: { y: 21.5, dx: 7 } },
  { id: 'tri', name: '饭团', parts: [path('M24 9c2 0 3 1 4 3l13 22c2 4-1 6-4 6H11c-3 0-6-2-4-6l13-22c1-2 2-3 4-3z')], eyes: { y: 30, dx: 5.5 } },
  { id: 'diamond', name: '菱', parts: [path('M24 6L42 24 24 42 6 24z', 12)], eyes: { y: 25, dx: 5.5 } },
  { id: 'bloom', name: '花', parts: [circle(24, 14, 10), circle(34, 24, 10), circle(24, 34, 10), circle(14, 24, 10), circle(24, 24, 10)], eyes: { y: 25, dx: 5.5 } },
  { id: 'helm', name: '舵', reserved: true, parts: [{ kind: 'ring', cx: 24, cy: 24, r: 21.5, width: 2.5 }, circle(24, 24, 16)], eyes: { y: 25.5, dx: 6 } },
];

export const faceShapes = Object.fromEntries(faceShapeList.map(shape => [shape.id, shape])) as Record<FaceShapeId, FaceShape>;
/** 用户可选的形状；「舵」留给主 Bot。 */
export const pickableShapes = faceShapeList.filter(shape => !shape.reserved);

/**
 * 颜色只用 KodaX 主题自己的颜色，再加纯黑：
 * 靛蓝 = primary（深色主题为月白），朱砂 = helm，暖灰 = text-muted，纯黑 = #000（深色主题加一道描边，避免和背景融在一起）。
 * eye 是对应底色上的眼睛颜色。
 */
export const faceColors: { id: FaceColorId; name: string; source: string; fill: string; eye: string }[] = [
  { id: 'indigo', name: '靛蓝', source: 'primary', fill: 'var(--u4f-primary)', eye: 'var(--u4f-on-primary)' },
  { id: 'cinnabar', name: '朱砂', source: 'helm', fill: 'var(--u4f-helm)', eye: 'var(--kdx-eye-on-color)' },
  { id: 'taupe', name: '暖灰', source: 'text-muted', fill: 'var(--u4f-text-muted)', eye: 'var(--kdx-eye-on-color)' },
  { id: 'black', name: '纯黑', source: '#000000', fill: '#000000', eye: 'var(--kdx-eye-on-black)' },
];

export const MAIN_FACE: FaceSpec = { shape: 'helm', color: 'indigo' };

const colorOf = (color: FaceColorId) => faceColors.find(item => item.id === color) ?? faceColors[0];
export const faceFill = (color: FaceColorId) => colorOf(color).fill;
export const faceEye = (color: FaceColorId) => colorOf(color).eye;

export const sameFace = (a: FaceSpec, b: FaceSpec) => a.shape === b.shape && a.color === b.color;
export const faceName = (face: FaceSpec) => `${faceShapes[face.shape].name} · ${colorOf(face.color).name}`;

const combos: FaceSpec[] = pickableShapes.flatMap(shape => faceColors.map(color => ({ shape: shape.id, color: color.id })));

/** 新建 Bot 时的默认头像：按名称确定性挑选，跳过已被占用的组合。 */
export function pickFace(seed: string, taken: FaceSpec[] = []): FaceSpec {
  let h = 0;
  for (const ch of seed) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  // 步长 29：每次换形状也换颜色（48 与 29 互质，能遍历全部组合）。
  const order = combos.map((_, i) => combos[(h + i * 29) % combos.length]);
  // 先找形状和颜色都没被用过的（主 Bot 的专属形状不占颜色）；用完了再退到只要组合不重复。
  const peers = taken.filter(item => !faceShapes[item.shape].reserved);
  return order.find(face => !peers.some(item => item.shape === face.shape || item.color === face.color))
    ?? order.find(face => !taken.some(item => sameFace(item, face)))
    ?? order[0];
}

const rules: [RegExp, FaceSpec[]][] = [
  [/调研|研究|搜索|竞品|资料/, [{ shape: 'leaf', color: 'indigo' }, { shape: 'drop', color: 'taupe' }]],
  [/风险|安全|合规|审计/, [{ shape: 'diamond', color: 'cinnabar' }, { shape: 'square', color: 'black' }]],
  [/数据|巡检|报表|指标/, [{ shape: 'square', color: 'indigo' }, { shape: 'bowl', color: 'taupe' }]],
  [/写作|品牌|内容|文案|演示/, [{ shape: 'bloom', color: 'cinnabar' }, { shape: 'bean', color: 'black' }]],
  [/研发|代码|github|PR|Issue/i, [{ shape: 'tri', color: 'black' }, { shape: 'pill', color: 'indigo' }]],
];
const fallback: FaceSpec[] = [{ shape: 'round', color: 'indigo' }, { shape: 'arch', color: 'taupe' }, { shape: 'peanut', color: 'black' }];

/** 「生成」页签：按角色 prompt 推荐 3 个组合。原型用关键词规则，之后可换成模型生成。 */
export function recommendFaces(prompt: string): FaceSpec[] {
  const picked: FaceSpec[] = [];
  const add = (face: FaceSpec) => { if (picked.length < 3 && !picked.some(item => sameFace(item, face))) picked.push(face); };
  rules.filter(([pattern]) => pattern.test(prompt)).forEach(([, faces]) => faces.forEach(add));
  fallback.forEach(add);
  return picked;
}
