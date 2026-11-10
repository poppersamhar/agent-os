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

const { composeDashboard, botosReducer, restoreBotos, MAIN_BOT_ID, BOTOS_STORAGE_KEY } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));
const { seedBotos } = await import(new URL('../src/components/botos/botosSeed.ts', import.meta.url));

const state = seedBotos();
const bot = id => state.bots.find(b => b.id === id);
const kinds = spec => spec.widgets.map(w => w.kind);
const rowsFilled = spec => {
  let used = 0;
  for (const w of spec.widgets) { if (used + w.span > 3) used = 0; used = (used + w.span) % 3; }
  return used === 0;
};

// 主 Bot：汇总型仪表盘
const main = composeDashboard(bot(MAIN_BOT_ID), state.skills, state.mcps);
assert.deepEqual(kinds(main), ['waiting', 'agents', 'done', 'runs']);

// 能力决定仪表盘：数据巡检 Skill 与数据仓库 MCP 都提供 checks，只出现一次
const data = composeDashboard(bot('data'), state.skills, state.mcps);
assert.deepEqual(kinds(data), ['waiting', 'trend', 'checks', 'runs', 'artifacts']);
assert.equal(data.widgets.find(w => w.kind === 'checks').source, 'skill:inspect');
assert.ok(rowsFilled(data), 'data bot rows should be filled');

// 安装 GitHub MCP 后仪表盘出现 PR 与 Issue
const withGithub = composeDashboard({ ...bot('data'), mcpIds: ['warehouse', 'github'] }, state.skills, state.mcps);
assert.ok(kinds(withGithub).includes('repo'));
assert.ok(rowsFilled(withGithub));

// 停用的 MCP 不贡献组件
const offMcps = state.mcps.map(m => m.id === 'github' ? { ...m, enabled: false } : m);
assert.ok(!kinds(composeDashboard(bot('research'), state.skills, offMcps)).includes('repo'));

// 群聊有成员组件
assert.ok(kinds(composeDashboard(bot('brand-team'), state.skills, state.mcps)).includes('members'));

// 发送后当前 Bot 移到第一位，并进入工作中
const task = { id: 't1', botId: 'research', request: '调研 Dify' };
const sent = botosReducer(state, { type: 'send', botId: 'research', message: { id: 'u1', author: 'user', name: 'Samhar', text: '调研 Dify', time: '10:00' }, task });
assert.equal(sent.order[0], 'research');
assert.equal(sent.currentId, 'research');
assert.equal(sent.pending.length, 1);

// 完成后计入运行记录，pending 清空
const before = bot('research').history.at(-1)[0];
const done = botosReducer(sent, { type: 'complete', taskId: 't1', messages: [] });
assert.equal(done.pending.length, 0);
assert.equal(done.bots.find(b => b.id === 'research').history.at(-1)[0], before + 1);

// 主 Bot 不进入 Bot 栏顺序
const toMain = botosReducer(state, { type: 'send', botId: MAIN_BOT_ID, message: { id: 'u2', author: 'user', name: 'Samhar', text: 'hi', time: '10:00' }, task: { id: 't2', botId: MAIN_BOT_ID, request: 'hi' } });
assert.ok(!toMain.order.includes(MAIN_BOT_ID));

// 删除 Bot：同时移出群聊成员与顺序；主 Bot 不可删除
const deleted = botosReducer(state, { type: 'delete-bot', id: 'research' });
assert.ok(!deleted.order.includes('research'));
assert.ok(!deleted.bots.find(b => b.id === 'brand-team').memberIds.includes('research'));
assert.equal(botosReducer(state, { type: 'delete-bot', id: MAIN_BOT_ID }), state);

// 恢复：损坏数据回到示例；合法数据保留并补全顺序
assert.equal(restoreBotos('{broken', seedBotos).currentId, 'work');
assert.equal(restoreBotos(JSON.stringify({ version: 1, bots: [], order: [], skills: [], mcps: [] }), seedBotos).bots.length, state.bots.length);
const restored = restoreBotos(JSON.stringify({ ...state, order: ['work'], currentId: 'missing' }), seedBotos);
assert.equal(restored.currentId, MAIN_BOT_ID);
assert.equal(restored.order.length, state.order.length);
assert.equal(typeof BOTOS_STORAGE_KEY, 'string');

console.log('botos checks passed');
