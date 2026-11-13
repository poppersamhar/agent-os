import { pickFace, type FaceSpec } from './botFaces';
import type { BotKind, BotosState } from './botModel';

export interface BotDraft {
  name: string; kind: BotKind; prompt: string; model: string; skillIds: string[]; mcpIds: string[]; memberIds: string[];
  /** 不填表示「按名称自动分配」；用户选过就固定下来。 */
  face?: FaceSpec;
}

export const emptyDraft = (kind: BotDraft['kind'] = 'bot'): BotDraft => ({ name: '', kind, prompt: '', model: '系统默认', skillIds: [], mcpIds: [], memberIds: [] });

/** 草稿当前的头像：用户选过的，或按名称从未占用的组合里自动挑一个。 */
export function draftFace(draft: BotDraft, state: BotosState, editingId?: string): FaceSpec {
  if (draft.face) return draft.face;
  return pickFace(draft.name.trim() || '新智能体', state.bots.filter(b => b.id !== editingId).map(b => b.face));
}

