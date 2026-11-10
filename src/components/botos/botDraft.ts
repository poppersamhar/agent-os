import type { Bot, BotKind } from './botModel';

export interface BotDraft { name: string; kind: Exclude<BotKind, 'main'>; prompt: string; model: string; skillIds: string[]; mcpIds: string[]; memberIds: string[] }

export const emptyDraft = (kind: BotDraft['kind'] = 'bot'): BotDraft => ({ name: '', kind, prompt: '', model: '系统默认', skillIds: [], mcpIds: [], memberIds: [] });
export const models = ['系统默认', 'Claude Sonnet 4.6', 'GPT-4o', 'DeepSeek Chat'];

export function draftToBot(draft: BotDraft, id = 'draft'): Bot {
  return { id, name: draft.name || '未命名 Bot', kind: draft.kind, prompt: draft.prompt, model: draft.model, skillIds: draft.skillIds, mcpIds: draft.mcpIds, memberIds: draft.memberIds, memory: [], messages: [], history: [], createdAt: '' };
}
