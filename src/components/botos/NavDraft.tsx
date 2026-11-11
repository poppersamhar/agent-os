import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import BotFace from './BotFace';
import { MAIN_FACE, SYSTEM_FACES, type FaceSpec } from './botFaces';
import './BotWorkspace.css';
import './NavDraft.css';

// 首页 / 专家 / 技能 / 连接器 四个按钮的样稿：选中后都是深色胶囊（头像 + 名字），
// 未选中时要和智能体栏里的普通智能体（头像 + 名字、无外框）区分开。这里并排几种方案。

type Item = { id: string; name: string; face: FaceSpec };
const home: Item = { id: 'home', name: '首页', face: MAIN_FACE };
const tools: Item[] = [
  { id: 'experts', name: '专家', face: SYSTEM_FACES.experts },
  { id: 'skills', name: '技能', face: SYSTEM_FACES.skills },
  { id: 'connectors', name: '连接器', face: SYSTEM_FACES.connectors },
];
const agents: Item[] = [
  { id: 'a1', name: '产品经理', face: { shape: 'tri', color: 'cinnabar' } },
  { id: 'a2', name: '风险跟进专家', face: { shape: 'peanut', color: 'black' } },
  { id: 'a3', name: '竞品调研专家', face: { shape: 'square', color: 'taupe' } },
];

type Variant = 'disc' | 'tray' | 'bare' | 'label';
const variants: { id: Variant; title: string; note: string }[] = [
  { id: 'disc', title: 'A · 圆形底座', note: '未选中：头像放在一个浅色圆盘里，不显示名字，悬停时提示名字。像系统入口、像「按钮」，普通智能体没有底座，一眼能分开。' },
  { id: 'tray', title: 'B · 共用托盘', note: '未选中：专家 / 技能 / 连接器收在同一个浅色托盘里，只显示头像；首页单独一个。选中的那个在托盘里展开成深色胶囊。分组感最强。' },
  { id: 'bare', title: 'C · 只有大头像', note: '未选中：只放大头像（比智能体栏的头像大一倍），不显示名字，悬停提示。最干净，但新用户可能不知道是什么。' },
  { id: 'label', title: 'D · 头像 + 下方小字', note: '未选中：头像下方一行小字名字，像手机桌面的应用图标。智能体栏是左右排列，这里是上下排列，结构上就不一样。' },
];

function SysButton({ item, selected, variant, onClick }: { item: Item; selected: boolean; variant: Variant; onClick: () => void }) {
  if (selected) return <button type="button" className="bos-current nd-selected" onClick={onClick} aria-pressed="true">
    <BotFace face={item.face} size={24} /><span className="bos-pill-name">{item.name}</span>
  </button>;
  return <button type="button" className={`nd-sys nd-sys--${variant}`} onClick={onClick} aria-pressed="false" title={item.name} aria-label={item.name}>
    <BotFace face={item.face} size={variant === 'bare' ? 40 : variant === 'label' ? 30 : 30} />
    {variant === 'label' ? <span>{item.name}</span> : null}
  </button>;
}

function Bar({ variant, theme }: { variant: Variant; theme: 'light' | 'dark' }) {
  const [selected, setSelected] = useState('home');
  const group = (items: Item[]) => {
    const buttons = items.map(item => <SysButton key={item.id} item={item} variant={variant} selected={selected === item.id} onClick={() => setSelected(item.id)} />);
    return variant === 'tray' ? <div className="nd-tray">{buttons}</div> : <div className="nd-group">{buttons}</div>;
  };
  return <div className="kdx-theme nd-panel" data-theme={theme}>
    <span className="nd-panel-label">{theme === 'light' ? '亮色' : '深色'}</span>
    <div className="nd-agents">
      <span className="nd-plus">+</span>
      {agents.map(a => <span key={a.id} className="bos-bot-pill"><BotFace face={a.face} size={24} /><span className="bos-pill-name">{a.name}</span></span>)}
      <small>← 智能体栏（对照）</small>
    </div>
    <div className="nd-row">
      {group([home])}
      <div className="nd-input"><span>告诉首页你想做什么…</span><i><ArrowUp size={15} /></i></div>
      {group(tools)}
    </div>
  </div>;
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <section className="nd-section"><header><h2>{title}</h2><p>{note}</p></header>{children}</section>;
}

export default function NavDraft() {
  return <div className="nd-sheet kdx-theme" data-theme="light">
    <a className="nd-back" href="./"><ArrowLeft size={14} />返回工作空间</a>
    <h1>首页 / 专家 / 技能 / 连接器 按钮样稿</h1>
    <p className="nd-lead">选中后统一是深色胶囊（头像 + 名字），和当前对话的智能体一致。下面只比较「未选中」的样子。每一行都可以点，试试切换选中。上方一行是智能体栏，用来对照区分度。</p>
    {variants.map(v => <Section key={v.id} title={v.title} note={v.note}>
      <div className="nd-pair"><Bar variant={v.id} theme="light" /><Bar variant={v.id} theme="dark" /></div>
    </Section>)}
  </div>;
}
