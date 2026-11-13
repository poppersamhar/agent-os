import type { Bot, BotosState } from './botModel';
import { PERSONNEL_MCP_ID } from './personnel';

export interface CapabilityGrant {
  kind: 'skill' | 'mcp';
  id: string;
  grantedBy: string;
  expiresAt?: number;
}

export function grantFor(bot: Bot, kind: CapabilityGrant['kind'], id: string): CapabilityGrant | undefined {
  const ids = kind === 'skill' ? bot.skillIds : bot.mcpIds;
  if (!ids.includes(id)) return undefined;
  return bot.capabilityGrants?.find(grant => grant.kind === kind && grant.id === id) ?? { kind, id, grantedBy: 'Samhar' };
}

export function hasGrant(bot: Bot, kind: CapabilityGrant['kind'], id: string, at = Date.now()): boolean {
  const grant = grantFor(bot, kind, id);
  return !!grant && (grant.expiresAt === undefined || grant.expiresAt > at);
}

export function canUseConnector(state: BotosState, bot: Bot, id: string, at = Date.now()): boolean {
  return state.mcps.some(mcp => mcp.id === id && mcp.enabled) && hasGrant(bot, 'mcp', id, at);
}

export function grantCapability(bot: Bot, grant: CapabilityGrant): Bot {
  const key = grant.kind === 'skill' ? 'skillIds' : 'mcpIds';
  return {
    ...bot,
    [key]: [...new Set([...bot[key], grant.id])],
    capabilityGrants: [...(bot.capabilityGrants ?? []).filter(item => item.kind !== grant.kind || item.id !== grant.id), grant],
  };
}

export function revokeCapability(bot: Bot, kind: CapabilityGrant['kind'], id: string): Bot {
  const key = kind === 'skill' ? 'skillIds' : 'mcpIds';
  return {
    ...bot,
    [key]: bot[key].filter(item => item !== id),
    personnelResults: kind === 'mcp' && id === PERSONNEL_MCP_ID ? undefined : bot.personnelResults,
    requiredMcpIds: kind === 'mcp' ? [...new Set([...(bot.requiredMcpIds ?? []), id])] : bot.requiredMcpIds,
    capabilityGrants: bot.capabilityGrants?.filter(grant => grant.kind !== kind || grant.id !== id),
  };
}
