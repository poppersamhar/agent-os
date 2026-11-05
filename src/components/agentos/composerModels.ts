// Mirrors the defaults in backend/src/config/env.ts for the local interaction preview.
// These choices record a model preference; they do not configure or invoke a provider.
export const composerModels = [
  { id: 'default', label: '系统默认', provider: null, providerLabel: '工作空间', model: null },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', providerLabel: 'OpenAI', model: 'gpt-4o' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', providerLabel: 'Anthropic', model: 'claude-sonnet-4-6' },
  { id: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'deepseek', providerLabel: 'DeepSeek', model: 'deepseek-chat' },
] as const;

export type ComposerModel = (typeof composerModels)[number];
export type ComposerModelId = ComposerModel['id'];

export const DEFAULT_COMPOSER_MODEL_ID: ComposerModelId = 'default';
export const COMPOSER_MODEL_STORAGE_KEY = 'agentos-composer-model-v1';

export function isComposerModelId(value: unknown): value is ComposerModelId {
  return composerModels.some(model => model.id === value);
}

export function getComposerModel(id: unknown): ComposerModel {
  return composerModels.find(model => model.id === id) ?? composerModels[0];
}

export function getComposerModelLabel(id: unknown): string {
  return getComposerModel(id).label;
}

/** Accepts a stored ID, including JSON-encoded IDs, without reading browser storage. */
export function restoreComposerModel(raw: string | null): ComposerModelId {
  if (isComposerModelId(raw)) return raw;
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    return isComposerModelId(parsed) ? parsed : DEFAULT_COMPOSER_MODEL_ID;
  } catch {
    return DEFAULT_COMPOSER_MODEL_ID;
  }
}
