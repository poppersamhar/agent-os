import { pickFace, type FaceSpec } from './botFaces';
import type { Bot, BotKind, BotosState } from './botModel';

export interface BotDraft {
  name: string; kind: Exclude<BotKind, 'main'>; prompt: string; model: string; skillIds: string[]; mcpIds: string[]; memberIds: string[];
  /** 不填表示「按名称自动分配」；用户选过就固定下来。 */
  face?: FaceSpec;
}

export const emptyDraft = (kind: BotDraft['kind'] = 'bot'): BotDraft => ({ name: '', kind, prompt: '', model: '系统默认', skillIds: [], mcpIds: [], memberIds: [] });
export const models = ['系统默认', 'Claude Sonnet 4.6', 'GPT-4o', 'DeepSeek Chat'];

/** 草稿当前的头像：用户选过的，或按名称从未占用的组合里自动挑一个。 */
export function draftFace(draft: BotDraft, state: BotosState, editingId?: string): FaceSpec {
  if (draft.face) return draft.face;
  return pickFace(draft.name.trim() || '新 Bot', state.bots.filter(b => b.id !== editingId).map(b => b.face));
}

export function draftToBot(draft: BotDraft, face: FaceSpec, id = 'draft'): Bot {
  return { id, name: draft.name || '未命名 Bot', kind: draft.kind, face, prompt: draft.prompt, model: draft.model, skillIds: draft.skillIds, mcpIds: draft.mcpIds, memberIds: draft.memberIds, memory: [], messages: [], history: [], createdAt: '' };
}
