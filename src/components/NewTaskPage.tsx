import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Send, Database,
  Plus, FileText, Bot, X,
  Clock, Upload, BookOpen,
} from 'lucide-react';

import type { ChatMessage, StandaloneTask } from '../data/mockData';

/* ─── 类型 ─── */
interface AttachedFile {
  id: string;
  type: 'image' | 'pdf';
  file: File;
  preview?: string;
  name: string;
}

/* ─── 快捷操作 ─── */
function QuickActions({ onAction }: { onAction: (text: string) => void }) {
  const actions = [
    { label: '帮我分析 Q4 财报' },
    { label: '设计供应商评估框架' },
    { label: '梳理数据清洗流程' },
  ];
  return (
    <div className="flex flex-wrap gap-2 mt-5 justify-center">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => onAction(a.label)}
          className="px-3 py-2 bg-bg rounded-xl border border-border-light hover:border-primary/30 transition-colors text-[12px] text-text-secondary"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ─── 增强输入框 ─── */
function EnhancedChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string, files: AttachedFile[]) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || disabled) return;
    onSend(input.trim(), attachedFiles);
    setInput('');
    setAttachedFiles([]);
    setShowAttachMenu(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachedFiles((prev) => [
            ...prev,
            { id: `img_${Date.now()}_${Math.random()}`, type: 'image', file, preview: e.target?.result as string, name: file.name },
          ]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        setAttachedFiles((prev) => [
          ...prev,
          { id: `pdf_${Date.now()}_${Math.random()}`, type: 'pdf', file, name: file.name },
        ]);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.type === 'application/pdf') {
        setAttachedFiles((prev) => [
          ...prev,
          { id: `pdf_${Date.now()}_${Math.random()}`, type: 'pdf', file, name: file.name },
        ]);
      }
    });
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white relative">
      {attachedFiles.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachedFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-1.5 bg-bg rounded-lg px-2 py-1.5 border border-border-light">
              {file.type === 'image' && file.preview ? (
                <img src={file.preview} alt={file.name} className="w-6 h-6 rounded object-cover" />
              ) : (
                <FileText className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
              )}
              <span className="text-[11px] text-text-secondary truncate max-w-[120px]">{file.name}</span>
              <button onClick={() => removeFile(file.id)} className="p-0.5 hover:bg-white rounded">
                <X className="w-3 h-3 text-text-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* + 号下拉菜单 */}
      {showAttachMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-full mb-2 left-4 bg-white rounded-xl border border-border-light shadow-lg p-1 z-20 w-52"
        >
          <button
            onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg transition-colors flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Upload className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[12px] text-text font-medium">导入文件</div>
              <div className="text-[10px] text-text-muted">支持 PDF 文件上传</div>
            </div>
          </button>
          <div className="mx-2 my-1 h-px bg-border-light" />
          <button
            onClick={() => { alert('接入知识库功能即将上线'); setShowAttachMenu(false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg transition-colors flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[12px] text-text font-medium">接入知识库</div>
              <div className="text-[10px] text-text-muted">连接企业知识库资源</div>
            </div>
          </button>
        </div>
      )}

      <div
        className={`flex items-end gap-2 bg-bg rounded-xl px-3 py-2 border transition-all relative ${
          disabled ? 'border-border-light/50 opacity-60' : 'border-border-light focus-within:border-primary/30'
        } ${isDragging ? 'border-primary bg-primary-subtle/20' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* + 号按钮 — 展开下拉菜单 */}
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          disabled={disabled}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0 ${
            showAttachMenu ? 'bg-primary text-white' : 'hover:bg-white text-text-muted'
          }`}
          title="添加附件"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={disabled ? 'WorkAgent 执行中，请稍候...' : isDragging ? '释放以添加图片...' : '与 WorkAgent 对话，或输入指令...'}
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent resize-none outline-none text-[13px] text-text py-1 disabled:cursor-not-allowed"
          style={{ minHeight: '20px' }}
        />

        <button
          onClick={handleSend}
          disabled={disabled || (!input.trim() && attachedFiles.length === 0)}
          className="p-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ─── 主组件 ─── */
interface NewTaskPageProps {
  onCreateStandaloneTask: (name: string, shouldNavigate?: boolean, initialMessages?: StandaloneTask['messages']) => void;
}

export default function NewTaskPage({ onCreateStandaloneTask }: NewTaskPageProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = (text: string, files: AttachedFile[]) => {
    if (!text.trim() && files.length === 0) return;

    setIsSending(true);

    // 构建消息内容（包含文件信息）
    let content = text;
    if (files.length > 0) {
      const fileNames = files.map((f) => f.name).join(', ');
      content = text ? `${text}\n\n[附件: ${fileNames}]` : `[附件: ${fileNames}]`;
    }

    // 构建初始用户消息
    const initialMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'human',
      senderId: 'samhar',
      senderName: 'samhar',
      content,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    // 用文本作为任务名称，传递初始消息，创建任务并自动跳转到 TaskSpace
    onCreateStandaloneTask(text, true, [initialMsg]);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部栏 */}
      <div className="h-12 shrink-0 flex items-center justify-between px-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold text-text tracking-tight">新建独立任务</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" strokeWidth={1.5} />
            独立任务
          </span>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-subtle flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-text tracking-tight mb-3">
                新建独立任务
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-[420px] mb-1">
                告诉我你想完成什么——WorkAgent 会帮你创建并执行独立任务。
              </p>
              <p className="text-xs text-text-muted mb-6">
                支持文本输入、拖拽图片、上传 PDF，也可以使用 Skill 和 Tool
              </p>
              <QuickActions onAction={(text) => handleSend(text, [])} />
            </div>
          </div>
          <EnhancedChatInput onSend={handleSend} disabled={isSending} />
        </div>
      </div>
    </div>
  );
}
