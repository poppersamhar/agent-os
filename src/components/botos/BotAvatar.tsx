import BotFace, { BotFaceStack } from './BotFace';
import type { FaceState } from './botFaces';
import type { Bot } from './botModel';

/**
 * 产品里统一的智能体头像入口。
 * - 智能体群 / 专家团：成员头像叠放。
 * - 企业效能管理智能体与系统管理智能体：用专用形状（六边、团队、星芒、插头），不加角标。
 */
export default function BotAvatar({ bot, size = 28, state = 'idle', members = [], title }: {
  bot: Pick<Bot, 'kind' | 'face'>; size?: number; state?: FaceState; members?: Pick<Bot, 'face'>[]; title?: string;
}) {
  if (bot.kind === 'group' && members.length >= 2) return <BotFaceStack faces={members.map(m => m.face)} size={size} />;
  return <BotFace face={bot.face} size={size} state={state} title={title} />;
}
