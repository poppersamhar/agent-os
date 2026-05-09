import { useState, useRef, useEffect } from 'react';
import { Send, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { dataItems } from '../data/mockData';
import type { ChatMessage, DataItem } from '../data/mockData';

interface ProjectChatProps {
  chatName: string;
  messages: ChatMessage[];
  rightPanelCollapsed: boolean;
  onToggleRightPanel: () => void;
  selectedDataItemId: string | null;
  onSelectDataItem: (id: string | null) => void;
}

function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colors: Record<string, string> = {
    s: 'bg-emerald-500',
    b: 'bg-blue-500',
    a: 'bg-amber-500',
    k: 'bg-rose-500',
  };
  const bg = colors[initial.toLowerCase()] || 'bg-gray-400';
  return (
    <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center text-white text-[11px] font-semibold shrink-0`}>
      {initial}
    </div>
  );
}

function BotAvatar() {
  return (
    <img
      src="/accio-icon.png"
      alt="Accio"
      className="w-7 h-7 rounded-full shrink-0 object-contain bg-white"
    />
  );
}

function DataLink({ item, isSelected, onClick }: { item: DataItem; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg transition-colors ${
        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-text-muted'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span className="text-[12px] flex-1 truncate">{item.title}</span>
      <span className="text-[10px] shrink-0">{item.chartType === 'bar' ? '柱状图' : '折线图'}</span>
    </button>
  );
}

function MessageBubble({ msg, selectedDataItemId, onSelectDataItem }: { msg: ChatMessage; selectedDataItemId: string | null; onSelectDataItem: (id: string | null) => void; }) {
  const isHuman = msg.role === 'human';
  const isHost = msg.role === 'host';
  const msgDataItems = msg.metadata?.dataItemIds?.map(id => dataItems.find(d => d.id === id)).filter(Boolean) as DataItem[] | undefined;

  // 用户消息
  if (isHuman) {
    return (
      <div className="flex flex-col items-end" data-message-id={msg.id}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-text-muted/60">{msg.timestamp}</span>
          <span className="text-[11px] text-text">{msg.senderName}</span>
          <UserAvatar name={msg.senderName} />
        </div>
        <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] text-text leading-relaxed max-w-[75%]">
          {msg.content}
        </div>
        <div className="flex items-center gap-3 mt-1.5 mr-1">
          <button className="flex items-center gap-1 text-[10px] text-text-muted/50 hover:text-text-muted transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Retry
          </button>
          <button className="text-text-muted/50 hover:text-text-muted transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button className="text-text-muted/50 hover:text-text-muted transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>
          </button>
        </div>
      </div>
    );
  }

  // MyAgent / Agent / Skill 消息
  return (
    <div className="flex gap-3" data-message-id={msg.id}>
      {isHost ? <BotAvatar /> : (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] shrink-0">
          {msg.senderName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-text">{msg.senderName}</span>
        </div>
        <div className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
        {msgDataItems && msgDataItems.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {msgDataItems.map(item => (
              <DataLink
                key={item.id}
                item={item}
                isSelected={selectedDataItemId === item.id}
                onClick={() => onSelectDataItem(selectedDataItemId === item.id ? null : item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectChat({ chatName, messages, rightPanelCollapsed, onToggleRightPanel, selectedDataItemId, onSelectDataItem }: ProjectChatProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    setInput('');
  };

  if (!chatName) return <div className="flex items-center justify-center h-full text-text-muted text-sm">对话不存在</div>;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-12 shrink-0 flex items-center justify-between px-5 border-b border-gray-100">
        <h1 className="text-[15px] font-semibold text-text tracking-tight">{chatName}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <div className="flex -space-x-1.5">
              {['S', 'B', 'A', 'K'].map((letter, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white ${
                    i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                >
                  {letter}
                </div>
              ))}
            </div>
            <span className="text-[11px] text-text-muted ml-2">5 members</span>
          </div>
          <button
            onClick={onToggleRightPanel}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-text-muted"
          >
            {rightPanelCollapsed ? <PanelRightOpen className="w-4 h-4" strokeWidth={1.5} /> : <PanelRightClose className="w-4 h-4" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pl-5 pr-10 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-[11px] text-text-muted/50 bg-gray-50 rounded-full px-3 py-1">No more messages</span>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-center">
              <span className="text-[11px] text-text-muted/40">Today</span>
            </div>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                selectedDataItemId={selectedDataItemId}
                onSelectDataItem={onSelectDataItem}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-5 pb-4 pt-2">
        <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3 focus-within:border-gray-200 focus-within:ring-1 focus-within:ring-gray-100 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message... (@ to mention or reference files)"
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-[13px] text-text placeholder:text-text-muted/50 max-h-32 leading-relaxed"
            style={{ minHeight: '20px' }}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-lg transition-colors text-text-muted">
                <span className="text-sm leading-none">+</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted/60">Default Permission</span>
              <button
                onClick={handleSend}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-text rounded-full transition-colors"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
