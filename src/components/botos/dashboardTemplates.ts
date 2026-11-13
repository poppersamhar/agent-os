import type { WidgetKind } from './botModel';

export type DashboardTemplate = 'research' | 'content' | 'query' | 'monitoring';

export const dashboardTemplates: Record<DashboardTemplate, { title: string; priority: WidgetKind[] }> = {
  research: { title: '调研', priority: ['sources', 'artifacts', 'artifact-preview', 'routines'] },
  content: { title: '内容产出', priority: ['artifacts', 'artifact-preview', 'feed', 'workspace'] },
  query: { title: '查询', priority: ['query-form', 'audit', 'capabilities'] },
  monitoring: { title: '运营监控', priority: ['action-table', 'checks', 'trend', 'metrics', 'routines'] },
};

export function inferDashboardTemplate(name: string, prompt: string, mcpIds: string[]): DashboardTemplate {
  const description = `${name} ${prompt}`;
  if (mcpIds.includes('personnel') || /人员查询|信息查询/.test(description)) return 'query';
  if (/调研|竞品|研究/.test(description)) return 'research';
  if (/巡检|风险|运营|研发|监控/.test(description)) return 'monitoring';
  return 'content';
}
