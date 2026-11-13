import { uid, type Mcp, type McpKind, type Skill, type WidgetKind } from './botModel';

export const connectorKinds: Record<McpKind, string> = {
  feishu: '飞书', github: 'GitHub', database: '数据库', erp: '业务系统', web: '网页', custom: '自定义',
};

export const widgetChoices: { kind: WidgetKind; title: string }[] = [
  { kind: 'metrics', title: '指标' }, { kind: 'trend', title: '趋势' }, { kind: 'alerts', title: '事项列表' },
  { kind: 'sources', title: '来源与发现' }, { kind: 'checks', title: '检查清单' },
];

export interface SkillDraft { name: string; description?: string; category?: string; widget?: WidgetKind }
export interface ConnectorDraft { name: string; endpoint: string; kind?: McpKind; tools?: string[] }

export function makeSkill(draft: SkillDraft, id = uid()): Skill {
  const name = draft.name.trim();
  const widget = widgetChoices.find(choice => choice.kind === draft.widget);
  return {
    id: `skill-${id}`, name, description: draft.description?.trim() || '用户创建的技能', category: draft.category || '通用',
    version: '0.1.0', owner: 'Samhar', calls: 0, failRate: 0, createdByUser: true,
    widgets: widget ? [{ kind: widget.kind, title: `${name} · ${widget.title}`, span: 1 }] : [],
  };
}

export function makeConnector(draft: ConnectorDraft, id = uid()): Mcp {
  return {
    id: `mcp-${id}`, name: draft.name.trim(), endpoint: draft.endpoint.trim(), kind: draft.kind ?? 'custom',
    credential: 'vault', enabled: true, owner: 'Samhar', calls: 0, createdByUser: true,
    tools: [...new Set(draft.tools?.map(tool => tool.trim()).filter(Boolean))], widgets: [],
  };
}

function requestedName(input: string, action: RegExp): string {
  const explicitName = input.match(/[「『“"]([^」』”"]+)[」』”"]/)?.[1];
  const inferredName = input.split(/[，,。；;：:\n]/)[0].replace(action, '').replace(/(?:这个|的)?(?:技能|连接器)$/, '');
  return (explicitName ?? inferredName).trim().slice(0, 40);
}

export function parseSkillRequest(input: string): SkillDraft {
  const name = requestedName(input.trim(), /^(?:帮我|请)?(?:新建|创建|新增|做|沉淀)(?:一个|一下|成)?\s*(?:技能\s+)?/);
  const description = input.match(/[，,。；;：:\n]\s*(?:用于|用来|负责|说明[：:]?)?\s*(.+)/)?.[1];
  return { name, description, category: '通用' };
}

export function parseConnectorRequest(input: string): ConnectorDraft {
  const endpoint = input.match(/(?:mcp|https?):\/\/[^\s，,。；;「」“”<>]+/i)?.[0] ?? '';
  const name = requestedName(input.replace(endpoint, '').replace(/(?:端点|地址)\s*[：:]?\s*$/, '').trim(), /^(?:帮我|请)?(?:新建|接入|添加|连接|对接)(?:一个|一下)?\s*(?:连接器\s+)?/);
  const kind = name.includes('飞书') ? 'feishu' : /github/i.test(name) ? 'github' : name.includes('数据库') ? 'database' : 'custom';
  return { name, endpoint, kind };
}

export function validConnectorEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return !!url.hostname && ['mcp:', 'https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      && !Array.from(url.searchParams.keys()).some(key => /(?:token|secret|password|api[_-]?key|authorization)/i.test(key));
  } catch {
    return false;
  }
}
