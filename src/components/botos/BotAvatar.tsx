import BotFace, { BotFaceStack } from './BotFace';
import type { FaceState } from './botFaces';
import type { Bot } from './botModel';

/** 产品里统一的 Bot 头像入口。群聊有 2 个以上成员时叠放成员头像，否则用自己的头像。 */
export default function BotAvatar({ bot, size = 28, state = 'idle', members = [], title }: {
  bot: Pick<Bot, 'kind' | 'face'>; size?: number; state?: FaceState; members?: Pick<Bot, 'face'>[]; title?: string;
}) {
  if (bot.kind === 'group' && members.length >= 2) return <BotFaceStack faces={members.map(m => m.face)} size={size} />;
  return <BotFace face={bot.face} size={size} state={state} title={title} />;
}
