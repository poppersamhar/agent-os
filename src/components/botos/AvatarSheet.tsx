import { useId, useState, type ReactNode } from 'react';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import FacePicker from './FacePicker';
import BotFace, { BotFaceStack } from './BotFace';
import { MAIN_FACE, SYSTEM_FACES, faceColors, faceName, faceShapes, pickableShapes, type FaceSpec, type FaceState } from './botFaces';
import { seedBotos } from './botosSeed';
import './BotWorkspace.css';
import './AvatarSheet.css';

type Theme = 'light' | 'dark';

const states: { id: FaceState; name: string; note: string }[] = [
  { id: 'idle', name: '空闲', note: '偶尔眨眼，身体轻轻呼吸' },
  { id: 'working', name: '工作中', note: '左右来回看，身体跟着起伏；悬停显示当前在做什么' },
  { id: 'needs', name: '需要你', note: '看向你、歪头晃一下，右上角亮起朱砂舵点' },
  { id: 'done', name: '刚完成', note: '眯眼笑、原地蹦一下，几秒后回到空闲' },
];

const sizes = [
  { size: 20, use: '智能体栏' }, { size: 22, use: '对话标题' }, { size: 28, use: '列表' }, { size: 42, use: '工作台' }, { size: 64, use: '选择面板' },
];

// 示例智能体的头像：由产品里的同一套规则按名称自动分配（系统智能体用专用形状）。
const autoFaces = seedBotos().bots.filter(bot => bot.kind === 'bot').map(bot => ({ id: bot.id, name: bot.name, face: bot.face }));
const faceOf = (id: string) => autoFaces.find(item => item.id === id)?.face ?? MAIN_FACE;

function Pair({ children }: { children: (theme: Theme) => ReactNode }) {
  return <div className="kdx-pair">
    {(['light', 'dark'] as const).map(theme => <div key={theme} className="kdx-theme kdx-panel" data-theme={theme}>
      <span className="kdx-panel-label">{theme === 'light' ? '亮色 · 宣纸' : '深色 · 夜航'}</span>
      {children(theme)}
    </div>)}
  </div>;
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="kdx-section"><header><h2>{title}</h2>{note ? <p>{note}</p> : null}</header>{children}</section>;
}

function PickerDemo() {
  const promptId = useId();
  const [face, setFace] = useState<FaceSpec>({ shape: 'leaf', color: 'indigo' });
  const [prompt, setPrompt] = useState('持续跟踪竞品动态，用网页调研整理产品更新与定价');
  return <div className="kdx-picker-demo">
    <label className="kdx-label" htmlFor={promptId}>智能体的角色（「生成」页签据此推荐）</label>
    <textarea id={promptId} className="kdx-textarea" rows={2} value={prompt} onChange={e => setPrompt(e.target.value)} />
    <FacePicker value={face} onChange={setFace} prompt={prompt} />
  </div>;
}

export default function AvatarSheet() {
  return <div className="kdx-sheet kdx-theme" data-theme="light">
    <header className="kdx-sheet-head">
      <a className="kdx-back" href="./"><ArrowLeft size={14} />返回工作空间</a>
      <h1>智能体头像样稿</h1>
      <p>形状 × 颜色 × 两点眼睛。{pickableShapes.length} 种形状 × {faceColors.length} 种颜色 = {pickableShapes.length * faceColors.length} 种组合，另有四种形状专门留给系统智能体。
        颜色只用 KodaX 主题自己的靛蓝、朱砂、暖灰，再加纯黑。遵循 KodaX：圆头线条、圆点为基本单元、低饱和、无渐变。每组都并排给出亮色与深色两个主题。</p>
    </header>

    <Section title="1 · 形状" note="圆润可爱版：形状更胖、转角更圆；眼睛偏下、分得开；不画腮红，适合 B 端场合。只靠轮廓区分，小尺寸也认得出。">
      <Pair>{() => <div className="kdx-grid">{pickableShapes.map(shape => <div key={shape.id} className="kdx-cell"><BotFace face={{ shape: shape.id, color: 'indigo' }} size={52} /><small>{shape.name}</small></div>)}</div>}</Pair>
    </Section>

    <Section title="2 · 颜色" note="靛蓝 = 主色，朱砂 = 舵色，暖灰 = 次要文字色，再加纯黑。前三种随主题切换（深色主题里靛蓝变为月白）；纯黑在深色主题里加一道描边。">
      <Pair>{() => <div className="kdx-grid">{faceColors.map(color => <div key={color.id} className="kdx-cell"><BotFace face={{ shape: 'round', color: color.id }} size={52} /><small>{color.name}<br /><code>{color.source}</code></small></div>)}</div>}</Pair>
    </Section>

    <Section title="3 · 全部组合" note="每一行一种颜色，每一列一种形状。">
      <Pair>{() => <div className="kdx-matrix">{faceColors.map(color => pickableShapes.map(shape => <BotFace key={`${color.id}-${shape.id}`} face={{ shape: shape.id, color: color.id }} size={30} title={faceName({ shape: shape.id, color: color.id })} />))}</div>}</Pair>
    </Section>

    <Section title="4 · 状态" note="眼睛和身体一起表达状态，替代现在胶囊外圈的呼吸动画。样稿里「刚完成」循环播放，产品里任务完成后蹦一次，4 秒后回到原状态。动画会跟随系统的「减少动态效果」设置关闭。">
      <Pair>{() => <div className="kdx-states">{states.map(s => <div key={s.id} className="kdx-state">
        <div className="kdx-state-faces">{[faceOf('work'), faceOf('data'), MAIN_FACE].map((face, i) => <BotFace key={i} face={face} size={48} state={s.id} loop title={s.id === 'working' ? '正在：核对华东二号供应商交付节点' : undefined} />)}</div>
        <strong>{s.name}</strong><small>{s.note}</small>
      </div>)}</div>}</Pair>
    </Section>

    <Section title="5 · 尺寸" note="同一个头像在各处的大小。24px 及以下自动放大眼睛和舵点，保证看得清。">
      <Pair>{() => <div className="kdx-sizes">{sizes.map(item => <div key={item.size} className="kdx-cell"><BotFace face={faceOf('research')} size={item.size} state={item.size === 20 ? 'needs' : 'idle'} /><small>{item.size}px<br />{item.use}</small></div>)}</div>}</Pair>
    </Section>

    <Section title="6 · 系统智能体、专家团与上传">
      <Pair>{() => <div className="kdx-specials">
        <div className="kdx-card kdx-card--system"><strong>系统智能体</strong><div className="kdx-row kdx-system-row">
          {[{ face: MAIN_FACE, name: '首页', note: '六边，呼应 Logo' }, { face: SYSTEM_FACES.experts, name: '专家', note: '三个脑袋，一个团队' }, { face: SYSTEM_FACES.skills, name: '技能', note: '星芒，一闪的灵感' }, { face: SYSTEM_FACES.connectors, name: '连接器', note: '插头，接入系统' }]
            .map(item => <figure key={item.name}><BotFace face={item.face} size={48} loop /><figcaption>{item.name}<small>{item.note}</small></figcaption></figure>)}
        </div><small>四种形状只给系统智能体用，用户新建时选不到；靠形状本身区分，不加角标。</small></div>
        <div className="kdx-card"><strong>专家团</strong><div className="kdx-row"><BotFaceStack faces={[faceOf('research'), faceOf('work')]} size={42} /><BotFaceStack faces={[faceOf('research'), faceOf('work'), faceOf('risk')]} size={42} /><BotFaceStack faces={[faceOf('data'), faceOf('risk')]} size={28} /></div><small>2–3 个成员头像叠放，替代通用的「多人」图标。</small></div>
        <div className="kdx-card"><strong>上传图片</strong><div className="kdx-row"><span className="kdx-photo"><ImagePlus size={18} /></span><span className="kdx-photo is-needs"><ImagePlus size={18} /></span></div><small>图片上无法画眼睛，状态改用右上角朱砂点。</small></div>
      </div>}</Pair>
    </Section>

    <Section title="7 · 自动分配" note="新建智能体时按名称挑一个未被占用的组合，用户不选也不会撞。以下是现有示例智能体的分配结果。">
      <Pair>{() => <div className="kdx-grid">{autoFaces.map(item => <div key={item.id} className="kdx-cell"><BotFace face={item.face} size={52} /><small>{item.name}<br />{faceName(item.face)}</small></div>)}</div>}</Pair>
    </Section>

    <Section title="8 · 放进产品" note="智能体栏胶囊加 22px 头像；工作中由眼睛表示，数字角标保留。">
      <Pair>{() => <div className="kdx-mock">
        <div className="kdx-mock-bar">
          <span className="bos-current"><BotFace face={faceOf('work')} size={22} />日常办公</span>
          <span className="bos-botbar-divider" />
          <span className="bos-bot-pill"><BotFace face={faceOf('risk')} size={22} state="working" title="正在：核对华东二号供应商交付节点" />风险跟进专家<span className="bos-badge">1</span></span>
          <span className="bos-bot-pill"><BotFace face={faceOf('data')} size={22} state="needs" />数据巡检专家</span>
          <span className="bos-bot-pill"><BotFaceStack faces={[faceOf('research'), faceOf('work')]} size={22} />品牌专家团</span>
        </div>
        <div className="kdx-mock-card"><strong>你的智能体</strong><div className="kdx-mock-agents">
          {autoFaces.map((item, i) => <div key={item.id} className="kdx-cell"><BotFace face={item.face} size={42} state={i === 1 ? 'working' : i === 2 ? 'needs' : 'idle'} /><small>{item.name}</small></div>)}
          <div className="kdx-cell"><BotFaceStack faces={[faceOf('research'), faceOf('work')]} size={42} /><small>品牌专家团</small></div>
        </div></div>
      </div>}</Pair>
    </Section>

    <Section title="9 · 选择面板" note="放在新建智能体的名称上方。三个页签：形象、生成、上传；上方实时预览四种状态。可以直接点着试。">
      <Pair>{() => <PickerDemo />}</Pair>
    </Section>

    <p className="kdx-foot">共 {Object.keys(faceShapes).length} 种形状。样稿代码：<code>src/components/botos/BotFace.tsx</code>、<code>botFaces.ts</code>。</p>
  </div>;
}
