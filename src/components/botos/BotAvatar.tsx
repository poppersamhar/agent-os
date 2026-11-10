import { Users } from 'lucide-react';
import type { Bot } from './botModel';

const palette = ['#c2410c', '#fb923c', '#8b5cf6', '#2563eb', '#0f766e', '#be185d', '#4d7c0f'];

function botColor(bot: Pick<Bot, 'id' | 'kind'>): string {
  if (bot.kind === 'main') return '#111111';
  let h = 0;
  for (const ch of bot.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

function botInitial(bot: Pick<Bot, 'name' | 'kind'>): string {
  if (bot.kind === 'main') return 'H';
  const latin = bot.name.match(/^[A-Za-z]+/);
  return latin ? latin[0].slice(0, 2).toUpperCase() : bot.name.slice(0, 1);
}

export default function BotAvatar({ bot, size = 28, working = false }: { bot: Pick<Bot, 'id' | 'name' | 'kind'>; size?: number; working?: boolean }) {
  return <span className={`bos-avatar${working ? ' is-working' : ''}`} style={{ width: size, height: size, background: botColor(bot), fontSize: size * 0.38 }} aria-hidden="true">
    {bot.kind === 'group' ? <Users size={size * 0.46} /> : botInitial(bot)}
  </span>;
}
