import { useState, useRef, useEffect } from 'react';
import {
  Plus, Wrench, Send, BrainCircuit, Sparkles,
  Upload, Globe, Pencil, Trash2, MoreHorizontal,
} from 'lucide-react';
import type { AccountType } from '../App';
import { skills } from '../data/mockData';
import type { Skill } from '../data/mockData';

interface SkillPageProps {
  accountType: AccountType;
}

/* ─── Skill 卡片 ─── */
function SkillCard({ skill, onEdit, onDelete, currentUser }: {
  skill: Skill;
  onEdit: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
  currentUser: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canEdit = !skill.isPreset && skill.author === currentUser;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSkillCreator = skill.id === 'skill-creator';

  return (
    <div
      className={`bg-white rounded-xl border p-4 cursor-pointer hover:border-primary/30 transition-all relative group ${
        isSkillCreator ? 'border-primary/30 shadow-[0_4px_20px_rgba(0,0,0,0.06)]' : 'border-border-light'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{skill.icon}</span>
          <div>
            <div className="text-[13px] font-medium text-text">{skill.name}</div>
            <div className="text-[11px] text-text-muted">
              {skill.category === 'knowledge' ? '知识工程' : skill.category === 'governance' ? '数据治理' : skill.category === 'analysis' ? '分析' : '工具'}
              {' · '}
              {skill.isPreset ? '系统' : skill.author}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="p-1 rounded-md hover:bg-bg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-white rounded-lg border border-border-light shadow-lg py-1 z-10 w-24">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(skill); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text hover:bg-bg transition-colors"
                >
                  <Pencil className="w-3 h-3" strokeWidth={1.5} />
                  编辑
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(skill.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-danger hover:bg-bg transition-colors"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-[12px] text-text-secondary line-clamp-2 mb-3">{skill.description}</p>
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>调用 {skill.calls.toLocaleString()} 次 · 成功率 {skill.successRate}%</span>
      </div>
    </div>
  );
}

/* ─── 导入 Skill 下拉菜单 ─── */
function ImportSkillMenu({ onImportLocal, onImportGitHub }: {
  onImportLocal: () => void;
  onImportGitHub: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2} /> 导入 Skill
      </button>
      {open && (
        <div className="absolute right-0 top-9 bg-white rounded-xl border border-border-light shadow-lg py-1 z-20 w-36">
          <button
            onClick={() => { onImportLocal(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text hover:bg-bg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
            从本地导入
          </button>
          <button
            onClick={() => { onImportGitHub(); setOpen(false); }}
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

/* ─── HubAgent 面板（AgentPanel 玻璃态样式） ─── */
function HubAgentSkillPanel() {
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
          <h2 className="font-semibold text-text text-sm tracking-tight">HubAgent</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            Skill 管理
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-10 h-10 text-primary/30 mb-4" strokeWidth={1.2} />
            <h3 className="text-base font-semibold text-text tracking-tight mb-2">Skill 管理中心</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[220px]">
              描述你需要的 Skill，我可以帮你创建、配置和管理
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] ${
                  msg.isUser
                    ? 'bg-primary-subtle text-primary-dark rounded-tr-sm'
                    : 'bg-bg text-text-secondary rounded-tl-sm border border-border-light'
                }`}>
                  {msg.text}
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
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="描述你需要的 Skill..."
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
  const currentUser = 'samhar';

  const filtered = skillList.filter(s => {
    if (filter === 'all') return true;
    return s.category === filter;
  });

  const handleEdit = (skill: Skill) => {
    // TODO: open edit modal
    console.log('Edit skill:', skill.id);
  };

  const handleDelete = (skillId: string) => {
    setSkillList(prev => prev.filter(s => s.id !== skillId));
  };

  const handleImportLocal = () => {
    // TODO: local import
    console.log('Import from local');
  };

  const handleImportGitHub = () => {
    // TODO: GitHub import
    console.log('Import from GitHub');
  };

  return (
    <div className="h-full flex">
      {/* 左侧 Skill 列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-text">Skills</h1>
            <ImportSkillMenu onImportLocal={handleImportLocal} onImportGitHub={handleImportGitHub} />
          </div>

          <div className="flex items-center gap-2 mb-4">
            {['all', 'knowledge', 'governance', 'analysis', 'tool'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${filter === f ? 'bg-primary-subtle text-primary-dark font-medium' : 'text-text-secondary hover:bg-bg'}`}
              >
                {f === 'all' ? '全部' : f === 'knowledge' ? '知识' : f === 'governance' ? '治理' : f === 'analysis' ? '分析' : '工具'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filtered.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onEdit={handleEdit}
                onDelete={handleDelete}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 右侧 HubAgent */}
      <div className="w-[380px] shrink-0 pt-12 pr-4 pb-14">
        <HubAgentSkillPanel />
      </div>
    </div>
  );
}
