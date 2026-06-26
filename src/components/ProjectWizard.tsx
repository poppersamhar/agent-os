import { useState } from 'react';
import { X, LayoutGrid } from 'lucide-react';

interface ProjectWizardProps {
  onCreateProject: (name: string, desc: string, icon: string) => void;
  onCancel: () => void;
}

export default function ProjectWizard({ onCreateProject, onCancel }: ProjectWizardProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateProject(name.trim(), desc.trim(), 'folder');
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[90vw] overflow-hidden animate-fade-in border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 className="font-semibold text-text text-base">新建项目</h3>
            <p className="mt-1 text-[11px] text-text-muted">创建后你会成为此项目负责人，可拉成员并分发任务。</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-bg rounded-lg transition-colors text-text-muted"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Name input with icon */}
          <div className="flex items-center gap-3 bg-bg border border-border rounded-xl px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/5 transition-all">
            <LayoutGrid className="w-4 h-4 text-text-muted shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入项目名称"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">描述</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="描述项目目标、资料背景和希望 ProjectAgent 帮你拆解的方向。"
              rows={3}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/5 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-text-secondary bg-bg hover:bg-border/50 rounded-xl transition-colors border border-border"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-2 text-xs font-medium bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
}
