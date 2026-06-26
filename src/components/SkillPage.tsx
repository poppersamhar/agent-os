import { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wrench,
} from 'lucide-react';
import type { AccountType } from '../App';
import { skills } from '../data/mockData';
import type { Skill } from '../data/mockData';

interface SkillPageProps {
  accountType: AccountType;
}

const currentUser = 'samhar';

const marketStats = [
  { label: '已上架 Skill', value: '86', detail: '组织可调用', icon: Wrench },
  { label: '待审批', value: '7', detail: '首页处理', icon: ShieldCheck },
  { label: '本月调用', value: '12.8K', detail: '成功率 97%', icon: CheckCircle2 },
  { label: '创建者', value: '18', detail: '可更新维护', icon: Users },
];

const publishFlow = [
  { title: '描述需求', detail: '用户用自然语言说明目标、输入、输出和使用场景', icon: Sparkles },
  { title: '生成 Skill', detail: 'OrgAgent 调用 KodaX 内核生成指令、工具、参数和测试样例', icon: BrainCircuit },
  { title: '管理员审批', detail: '检查权限、数据边界、依赖工具和安全风险', icon: ShieldCheck },
  { title: '上架市场', detail: '审批通过后进入技能市场，员工和项目 Agent 均可调用', icon: CheckCircle2 },
];

function categoryLabel(category: Skill['category']) {
  if (category === 'knowledge') return '知识工程';
  if (category === 'governance') return '数据治理';
  if (category === 'analysis') return '分析';
  return '工具';
}

function marketState(skill: Skill) {
  if (skill.id === 'skill-creator') {
    return { label: '创建入口', tone: 'bg-zinc-950 text-white' };
  }
  if (skill.isPreset) {
    return { label: '系统上架', tone: 'bg-zinc-100 text-zinc-700' };
  }
  if (skill.author === currentUser) {
    return { label: '我创建', tone: 'bg-emerald-50 text-emerald-700' };
  }
  return { label: '已上架', tone: 'bg-zinc-100 text-zinc-700' };
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wrench;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-text-muted">{label}</span>
        <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-[24px] font-semibold leading-none text-text">{value}</span>
        <span className="text-[11px] text-text-muted mb-0.5">{detail}</span>
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  onEdit,
  onDelete,
}: {
  skill: Skill;
  onEdit: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canEdit = !skill.isPreset && skill.author === currentUser;
  const state = marketState(skill);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="rounded-lg border border-border-light bg-white p-4 hover:border-zinc-300 transition-colors relative group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{skill.icon}</span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-text truncate">{skill.name}</div>
            <div className="text-[11px] text-text-muted truncate">
              {categoryLabel(skill.category)} · {skill.isPreset ? '系统' : skill.author}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${state.tone}`}>{state.label}</span>
          {canEdit && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={event => {
                  event.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 rounded-md hover:bg-bg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="更多操作"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 bg-white rounded-lg border border-border-light shadow-lg py-1 z-10 w-28">
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onEdit(skill);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text hover:bg-bg transition-colors"
                  >
                    <Pencil className="w-3 h-3" strokeWidth={1.5} />
                    更新版本
                  </button>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onDelete(skill.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-danger hover:bg-bg transition-colors"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    下架删除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="min-h-10 text-[12px] leading-relaxed text-text-secondary line-clamp-2">{skill.description}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-text-muted">
        <span>调用 {skill.calls.toLocaleString()}</span>
        <span>成功率 {skill.successRate}%</span>
        <span>版本 {skill.version}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-text-muted truncate">创建者可维护，管理员审核后上架</span>
        <button className="h-7 px-2.5 rounded-lg border border-border-light text-[11px] text-text-secondary hover:text-text hover:border-zinc-300 transition-colors">
          {canEdit ? '更新' : '使用'}
        </button>
      </div>
    </div>
  );
}

function CreateSkillMenu({
  onCreate,
  onImportLocal,
  onImportGitHub,
}: {
  onCreate: () => void;
  onImportLocal: () => void;
  onImportGitHub: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-3 rounded-lg bg-zinc-950 text-white text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-800 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
        创建 Skill
      </button>
      {open && (
        <div className="absolute right-0 top-9 bg-white rounded-xl border border-border-light shadow-lg py-1 z-20 w-40">
          <button
            onClick={() => {
              onCreate();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text hover:bg-bg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            按需求创建
          </button>
          <button
            onClick={() => {
              onImportLocal();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text hover:bg-bg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
            从本地导入
          </button>
          <button
            onClick={() => {
              onImportGitHub();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text hover:bg-bg transition-colors"
          >
            <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
            从 GitHub 导入
          </button>
        </div>
      )}
    </div>
  );
}

function PublishFlowPanel() {
  return (
    <section className="rounded-lg border border-border-light bg-white overflow-hidden">
      <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
          <Sparkles className="w-4 h-4" strokeWidth={1.6} />
          Skill 创建与上架流程
        </div>
        <span className="text-[11px] text-text-muted">需求创建 · 审批 · 市场分发</span>
      </div>
      <div className="grid grid-cols-4 gap-3 p-4">
        {publishFlow.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-lg border border-border-light bg-zinc-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-border-light flex items-center justify-center">
                  <Icon className="w-4 h-4 text-text-secondary" strokeWidth={1.6} />
                </div>
                <span className="text-[10px] text-text-muted">0{index + 1}</span>
              </div>
              <div className="text-[13px] font-semibold text-text">{step.title}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{step.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrgAgentSkillPanel({ accountType }: { accountType: AccountType }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, isUser: true }]);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col rounded-3xl bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-primary/20 overflow-hidden">
      <div className="h-[52px] flex items-center gap-2.5 px-4 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <BrainCircuit className="w-[18px] h-[18px] text-primary-dark" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="font-semibold text-text text-sm tracking-tight">OrgAgent</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            技能市场 · {accountType === 'admin' ? '审批管理' : '创建与使用'}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
            <h3 className="text-base font-semibold text-text tracking-tight mb-2">技能市场助手</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[230px]">
              描述你需要的 Skill，我可以帮你生成配置、测试样例、审批说明和上架材料
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] ${
                  message.isUser
                    ? 'bg-primary-subtle text-primary-dark rounded-tr-sm'
                    : 'bg-bg text-text-secondary rounded-tl-sm border border-border-light'
                }`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="flex items-end gap-2 bg-white/60 rounded-xl px-3 py-2 shadow-sm focus-within:border-primary/20 focus-within:ring-2 focus-within:ring-primary/5 transition-all border border-transparent">
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="描述你要创建或管理的 Skill..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-xs text-text py-1"
            style={{ minHeight: '20px' }}
          />
          <button onClick={handleSend} className="p-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shrink-0 shadow-sm shadow-primary/20">
            <Send className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SkillPage({ accountType }: SkillPageProps) {
  const [filter, setFilter] = useState('all');
  const [skillList, setSkillList] = useState<Skill[]>(skills);

  const filtered = skillList.filter(skill => {
    if (filter === 'all') return true;
    if (filter === 'mine') return !skill.isPreset && skill.author === currentUser;
    return skill.category === filter;
  });

  const handleEdit = (skill: Skill) => {
    console.log('Edit skill:', skill.id);
  };

  const handleDelete = (skillId: string) => {
    setSkillList(prev => prev.filter(skill => skill.id !== skillId));
  };

  const handleCreate = () => {
    console.log('Create skill from demand');
  };

  const handleImportLocal = () => {
    console.log('Import from local');
  };

  const handleImportGitHub = () => {
    console.log('Import from GitHub');
  };

  return (
    <div className="h-full grid grid-cols-[minmax(760px,1fr)_380px] bg-main-bg overflow-hidden">
      <main className="min-w-0 overflow-y-auto">
        <div className="px-6 py-5 border-b border-border-light bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
                <Wrench className="w-3.5 h-3.5" strokeWidth={1.6} />
                OrgAgent · Skill 创建、审批、上架与版本管理
              </div>
              <h1 className="text-[20px] font-semibold text-text tracking-tight">技能市场</h1>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-text-secondary">
                根据用户需求搭建 Skill，管理员审批后上架市场；创建者可以持续修改、测试、更新和维护版本。
              </p>
            </div>
            <CreateSkillMenu
              onCreate={handleCreate}
              onImportLocal={handleImportLocal}
              onImportGitHub={handleImportGitHub}
            />
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {marketStats.map(item => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>

          <PublishFlowPanel />

          <section className="rounded-lg border border-border-light bg-white overflow-hidden">
            <div className="h-11 px-4 flex items-center justify-between border-b border-border-light">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                <Wrench className="w-4 h-4" strokeWidth={1.6} />
                市场 Skill
              </div>
              <span className="text-[11px] text-text-muted">员工可调用，创建者可更新，管理员可治理</span>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-border-light">
              {['all', 'mine', 'knowledge', 'governance', 'analysis', 'tool'].map(item => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`h-7 px-3 rounded-lg text-[11px] transition-colors ${
                    filter === item
                      ? 'bg-zinc-950 text-white'
                      : 'bg-zinc-50 text-text-secondary hover:bg-zinc-100'
                  }`}
                >
                  {item === 'all'
                    ? '全部'
                    : item === 'mine'
                      ? '我创建的'
                      : item === 'knowledge'
                        ? '知识'
                        : item === 'governance'
                          ? '治理'
                          : item === 'analysis'
                            ? '分析'
                            : '工具'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {filtered.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <div className="shrink-0 pt-12 pr-4 pb-14">
        <OrgAgentSkillPanel accountType={accountType} />
      </div>
    </div>
  );
}
