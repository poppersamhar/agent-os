import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !extname(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { marketCatalog, findItem, installItem, isInstalled, itemDeps, teamMembers, mcpConfig, pluginPackage } = await import(new URL('../src/components/botos/marketCatalog.ts', import.meta.url));
const { seedBotos } = await import(new URL('../src/components/botos/botosSeed.ts', import.meta.url));
const { MAIN_BOT_ID } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));

// 目录完整：id 唯一；专家 / 专家团引用的 Skill、MCP、成员都存在
assert.equal(new Set(marketCatalog.map(i => i.id)).size, marketCatalog.length, 'ids are unique');
for (const item of marketCatalog) {
  const deps = itemDeps(item);
  deps.skillIds.forEach(id => assert.ok(findItem(`skill:${id}`), `${item.id} needs missing skill ${id}`));
  deps.mcpIds.forEach(id => assert.ok(findItem(`connector:${id}`), `${item.id} needs missing mcp ${id}`));
  if (item.kind === 'team') assert.equal(teamMembers(item).length, item.memberIds.length, `${item.id} members exist`);
}
const experts = marketCatalog.filter(i => i.kind === 'expert');
assert.equal(new Set(experts.map(e => `${e.face.shape}:${e.face.color}`)).size, experts.length, 'market experts have distinct faces');
assert.ok(experts.every(e => !['hex', 'crowd', 'spark', 'plug'].includes(e.face.shape)), 'system shapes reserved');

// 添加专家：带上缺的 Skill / MCP，生成带 sourceId 的 Bot，并成为当前 Bot
const base = seedBotos();
const contract = findItem('expert:contract');
const s1 = installItem(base, contract);
const bot = s1.bots.find(b => b.sourceId === 'expert:contract');
assert.ok(bot && bot.kind === 'bot');
assert.equal(s1.currentId, bot.id);
assert.ok(s1.skills.some(s => s.id === 'contract') && s1.mcps.some(m => m.id === 'contracts-db'), 'deps installed');
assert.ok(isInstalled(s1, contract));
assert.equal(installItem(s1, contract), s1, 'installing twice is a no-op');

// 添加专家团：成员专家复用已添加的，缺的新建；群聊引用成员
const legal = findItem('team:legal');
const s2 = installItem(s1, legal);
const group = s2.bots.find(b => b.sourceId === 'team:legal');
assert.equal(group.kind, 'group');
assert.equal(group.memberIds.length, 2);
assert.ok(group.memberIds.includes(bot.id), 'reuses the contract expert already added');
assert.equal(s2.bots.filter(b => b.sourceId === 'expert:contract').length, 1, 'no duplicate member');
assert.ok(s2.bots.some(b => b.sourceId === 'expert:minutes'), 'adds missing member');
assert.ok(s2.mcps.some(m => m.id === 'dingtalk'), 'member deps installed');
assert.ok(!s2.order.includes(MAIN_BOT_ID));

// 添加 Skill / MCP 只加能力，不建 Bot
const s3 = installItem(base, findItem('skill:minutes'));
assert.equal(s3.bots.length, base.bots.length);
assert.ok(s3.skills.some(s => s.id === 'minutes'));
assert.ok(isInstalled(base, findItem('connector:feishu')), 'seeded mcp counts as installed');

// 插件：远程调用配置是合法 JSON；插件包不含记忆和对话
const cfg = JSON.parse(mcpConfig(findItem('team:brand')));
assert.ok(Object.values(cfg.mcpServers)[0].url.includes('/mcp/team/brand'));
const pkg = JSON.parse(pluginPackage(findItem('team:brand')).content);
assert.equal(pkg.type, 'agentos.team');
assert.equal(pkg.members.length, 2);
assert.ok(!('memory' in pkg) && !('messages' in pkg));
assert.ok(pluginPackage(findItem('skill:research')).content.startsWith('---\nname: 网页调研'));

// 新专家开场：打招呼 + 选择卡；按角色给出起步任务
const { firstTask } = await import(new URL('../src/components/botos/firstTask.ts', import.meta.url));
const { botosReducer } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));
const opening = bot.messages[0];
assert.ok(opening.choices && opening.choices.options.length === 3, 'market expert opens with a question card');
assert.ok(firstTask('客服质检专家').choices.options.some(o => o.includes('客服')));
assert.equal(firstTask('随便起个名').choices.options.length, 3, 'fallback options');
const answered = botosReducer(s1, { type: 'answer', botId: bot.id, messageId: opening.id, answer: opening.choices.options[0] });
assert.equal(answered.bots.find(b => b.id === bot.id).messages[0].choices.answered, opening.choices.options[0]);

console.log('market checks passed');
