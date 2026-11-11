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

// 头像：主 Bot 固定「圆 · 靛蓝」；示例 Bot 头像各不相同
const { faceStateOf } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));
assert.deepEqual(bot(MAIN_BOT_ID).face, { shape: 'hex', color: 'indigo' });
const regular = state.bots.filter(b => b.kind === 'bot');
assert.equal(new Set(regular.map(b => `${b.face.shape}:${b.face.color}`)).size, regular.length, 'seed bots should have distinct faces');
assert.equal(new Set(regular.map(b => b.face.color)).size, regular.length, 'seed bots should have distinct colors');
const systemShapes = ['hex', 'crowd', 'spark', 'plug'];
const isMain = f => systemShapes.includes(f.shape);
assert.ok(state.bots.every(b => b.kind === 'main' || b.kind === 'system' || !isMain(b.face)), 'system shapes are reserved for system agents');
const { pickFace } = await import(new URL('../src/components/botos/botFaces.ts', import.meta.url));
for (const name of ['a', 'b', '调研', '数据', 'Bot 1', 'Bot 2', '合同审查']) assert.ok(!isMain(pickFace(name, [])), `auto face for ${name} must not use a system shape`);

// 旧数据里主 Bot 的头像、以及普通 Bot 用了系统专用形状的，恢复时会改正
const stale = JSON.parse(JSON.stringify(state));
stale.bots.find(b => b.id === MAIN_BOT_ID).face = { shape: 'helm', color: 'indigo' };
stale.bots.find(b => b.id === 'risk').face = { shape: 'hex', color: 'indigo' };
const fixed = restoreBotos(JSON.stringify(stale), seedBotos);
assert.deepEqual(fixed.bots.find(b => b.id === MAIN_BOT_ID).face, { shape: 'hex', color: 'indigo' });
assert.ok(!isMain(fixed.bots.find(b => b.id === 'risk').face));

// 旧数据没有头像：恢复时补上，且不和已有头像重复
const legacy = JSON.parse(JSON.stringify(state));
legacy.bots.forEach(b => { if (b.id !== 'work') delete b.face; });
const migrated = restoreBotos(JSON.stringify(legacy), seedBotos);
assert.ok(migrated.bots.every(b => b.face && b.face.shape && b.face.color));
assert.deepEqual(migrated.bots.find(b => b.id === 'work').face, bot('work').face, 'existing faces are kept');
const migratedRegular = migrated.bots.filter(b => b.kind === 'bot');
assert.equal(new Set(migratedRegular.map(b => `${b.face.shape}:${b.face.color}`)).size, migratedRegular.length);

// 头像状态：工作中 > 刚完成 > 需要你 > 空闲
assert.equal(faceStateOf(sent, sent.bots.find(b => b.id === 'research')), 'working');
assert.equal(faceStateOf(state, bot('research'), ['research']), 'done');
assert.equal(faceStateOf(state, bot('risk')), 'needs');
assert.equal(faceStateOf(state, bot('work')), 'idle');
assert.equal(faceStateOf(state, bot(MAIN_BOT_ID)), 'needs', 'main bot needs you when any bot does');

// 主 Bot 名称由系统固定：旧数据里的「助理」恢复时改为当前名称
const { MAIN_BOT_NAME } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));
assert.equal(bot(MAIN_BOT_ID).name, MAIN_BOT_NAME);
const renamed = JSON.parse(JSON.stringify(state));
const oldMain = renamed.bots.find(b => b.id === MAIN_BOT_ID);
oldMain.name = '助理'; oldMain.messages.forEach(m => { if (m.author === 'bot') m.name = '助理'; });
const restoredMain = restoreBotos(JSON.stringify(renamed), seedBotos).bots.find(b => b.id === MAIN_BOT_ID);
assert.equal(restoredMain.name, MAIN_BOT_NAME);
assert.ok(restoredMain.messages.filter(m => m.author === 'bot').every(m => m.name === MAIN_BOT_NAME));

// 系统管理智能体：存在、不进智能体栏、不可删除；头像专用
const { SYSTEM_AGENTS, isAgent, agentLabel } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));
const { isReservedFace } = await import(new URL('../src/components/botos/botFaces.ts', import.meta.url));
for (const sys of SYSTEM_AGENTS) {
  const b = bot(sys.id);
  assert.ok(b && b.kind === 'system' && b.role === sys.role, `${sys.id} seeded`);
  assert.ok(!state.order.includes(sys.id), 'system agents stay out of the agent bar');
  assert.equal(botosReducer(state, { type: 'delete-bot', id: sys.id }), state, 'system agents cannot be deleted');
  assert.ok(b.messages[0].choices, 'system agents open with a question card');
}
assert.ok(state.bots.filter(isAgent).every(b => !isReservedFace(b.face)), 'agents never use reserved faces');
const sysTalk = botosReducer(state, { type: 'send', botId: 'sys-skills', message: { id: 'u9', author: 'user', name: 'Samhar', text: 'hi', time: '10:00' }, task: { id: 't9', botId: 'sys-skills', request: 'hi' } });
assert.deepEqual(sysTalk.order, state.order, 'talking to a system agent does not reorder the bar');

// 旧数据没有系统智能体：恢复时补上
const noSys = JSON.parse(JSON.stringify(state));
noSys.bots = noSys.bots.filter(b => !b.id.startsWith('sys-'));
const withSys = restoreBotos(JSON.stringify(noSys), seedBotos);
assert.ok(SYSTEM_AGENTS.every(s => withSys.bots.some(b => b.id === s.id && b.kind === 'system')));

// 沉淀：智能体 → 专家，智能体群 → 专家团；系统智能体不能沉淀
assert.equal(agentLabel(bot('work')), '智能体');
const matured = botosReducer(state, { type: 'mature', id: 'work' });
assert.equal(agentLabel(matured.bots.find(b => b.id === 'work')), '专家');
assert.equal(agentLabel({ kind: 'group', matured: false }), '智能体群');
assert.equal(agentLabel({ kind: 'group', matured: true }), '专家团');
assert.equal(botosReducer(state, { type: 'mature', id: 'sys-skills' }).bots.find(b => b.id === 'sys-skills').matured, undefined);

// 管理智能体在对话中修改面板数据
const { systemReply } = await import(new URL('../src/components/botos/systemAgents.ts', import.meta.url));
const made = systemReply('skills', state, '新建一个「投诉分析」技能');
assert.ok(made.state.skills.some(s => s.name === '投诉分析'), 'skills agent creates a skill');
assert.equal(systemReply('skills', state, '新建一个技能').state, undefined, 'asks for a name when missing');
const mcp = systemReply('connectors', state, '接入『工单系统』，地址 mcp://ticket.internal');
assert.equal(mcp.state.mcps.find(m => m.name === '工单系统').endpoint, 'mcp://ticket.internal');
assert.ok(systemReply('experts', state, '新建一个智能体').openCreate);

console.log('botos checks passed');
