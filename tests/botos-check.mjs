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

const { composeDashboard, botosReducer, restoreBotos, HOME_PAGE_ID, MARKET_PAGE_ID, BOTOS_STORAGE_KEY, faceStateOf, agentLabel, waitingFor } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));
const { seedBotos } = await import(new URL('../src/components/botos/botosSeed.ts', import.meta.url));

const state = seedBotos();
const bot = id => state.bots.find(b => b.id === id);
const kinds = spec => spec.widgets.map(w => w.kind);
const rowsFilled = spec => {
  let used = 0;
  for (const w of spec.widgets) { if (used + w.span > 3) used = 0; used = (used + w.span) % 3; }
  return used === 0;
};

// 首页、市场是页面，智能体列表只保存用户的智能体和群。
assert.equal(state.currentId, HOME_PAGE_ID);
assert.ok(state.bots.every(item => item.kind === 'bot' || item.kind === 'group'));
assert.ok([HOME_PAGE_ID, MARKET_PAGE_ID].every(id => !state.order.includes(id) && !bot(id)));
const market = botosReducer(state, { type: 'select', id: MARKET_PAGE_ID });
assert.equal(market.currentId, MARKET_PAGE_ID);
assert.deepEqual(market.order, state.order);
assert.equal(botosReducer(market, { type: 'select', id: HOME_PAGE_ID }).currentId, HOME_PAGE_ID);
assert.equal(botosReducer(market, { type: 'select', id: 'sys-skills' }), market);
const crossTabMarket = botosReducer(market, { type: 'sync', state: { ...state, currentId: 'work' } });
assert.equal(crossTabMarket.currentId, MARKET_PAGE_ID, 'another tab opening an agent does not navigate this tab away from Market');

// 能力决定仪表盘：数据巡检 Skill 与数据仓库 MCP 都提供 checks，只出现一次
const data = composeDashboard(bot('data'), state.skills, state.mcps);
assert.deepEqual(kinds(data), ['checks', 'trend', 'routines', 'waiting', 'runs', 'artifacts', 'artifact-preview', 'workspace', 'capabilities']);
assert.equal(data.widgets.find(w => w.kind === 'checks').source, 'skill:inspect');
assert.ok(rowsFilled(data), 'data bot rows should be filled');

// 安装 GitHub MCP 后仪表盘出现 PR 与 Issue
const withGithub = composeDashboard({ ...bot('data'), mcpIds: ['warehouse', 'github'] }, state.skills, state.mcps);
assert.ok(kinds(withGithub).includes('action-table'));
assert.ok(rowsFilled(withGithub));

// 停用的 MCP 不贡献组件
const offMcps = state.mcps.map(m => m.id === 'github' ? { ...m, enabled: false } : m);
assert.ok(!kinds(composeDashboard(bot('research'), state.skills, offMcps)).includes('action-table'));

// 群聊有成员组件
assert.ok(kinds(composeDashboard(bot('brand-team'), state.skills, state.mcps)).includes('members'));

// 发送后当前 Bot 移到第一位，并进入工作中
const task = { id: 't1', botId: 'research', request: '调研 Dify' };
const sent = botosReducer(state, { type: 'send', botId: 'research', message: { id: 'u1', author: 'user', name: 'Samhar', text: '调研 Dify', time: '10:00' }, task });
assert.equal(sent.order[0], 'research');
assert.equal(sent.currentId, 'research');
assert.equal(sent.pending.length, 1);
assert.equal(botosReducer(state, { type: 'send', botId: HOME_PAGE_ID, message: sent.bots.find(item => item.id === 'research').messages.at(-1), task: { ...task, botId: HOME_PAGE_ID } }), state);

// 完成后计入运行记录，pending 清空
const before = bot('research').history.at(-1)[0];
const done = botosReducer(sent, { type: 'complete', taskId: 't1', messages: [] });
assert.equal(done.pending.length, 0);
assert.equal(done.bots.find(b => b.id === 'research').history.at(-1)[0], before + 1);

// 删除智能体时也移出群聊成员与顺序。
const deleted = botosReducer(state, { type: 'delete-bot', id: 'research' });
assert.ok(!deleted.order.includes('research'));
assert.ok(!deleted.bots.find(b => b.id === 'brand-team').memberIds.includes('research'));
assert.equal(botosReducer(state, { type: 'delete-bot', id: HOME_PAGE_ID }), state);
assert.equal(botosReducer(sent, { type: 'sync', state: deleted }).currentId, HOME_PAGE_ID, 'a remotely deleted selection returns to Home');

// 恢复：损坏数据回到示例；合法数据保留并补全顺序
assert.equal(restoreBotos('{broken', seedBotos).currentId, HOME_PAGE_ID);
const empty = restoreBotos(JSON.stringify({ ...state, bots: [], order: [] }), seedBotos);
assert.equal(empty.bots.length, 0, 'the workspace may have no agents after deleting them');
assert.equal(empty.currentId, HOME_PAGE_ID);
const restored = restoreBotos(JSON.stringify({ ...state, order: ['work'], currentId: 'missing' }), seedBotos);
assert.equal(restored.currentId, HOME_PAGE_ID);
assert.equal(restored.order.length, state.order.length);
assert.equal(restoreBotos(JSON.stringify(market), seedBotos).currentId, MARKET_PAGE_ID);
assert.equal(typeof BOTOS_STORAGE_KEY, 'string');

// 示例智能体的头像各不相同。
const regular = state.bots.filter(b => b.kind === 'bot');
assert.equal(new Set(regular.map(b => `${b.face.shape}:${b.face.color}`)).size, regular.length, 'seed bots should have distinct faces');
assert.equal(new Set(regular.map(b => b.face.color)).size, Math.min(regular.length, 4), 'seed bots should use all available colors');

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
assert.equal(faceStateOf(state, bot('personnel')), 'idle');

const waiting = waitingFor(bot('risk'))[0];
const resolved = botosReducer(state, { type: 'resolve-waiting', botId: waiting.botId, messageId: waiting.messageId });
const resolvedRisk = resolved.bots.find(item => item.id === waiting.botId);
assert.ok(resolvedRisk.messages.some(message => message.id === waiting.messageId), 'resolving the to-do preserves the conversation');
assert.ok(!waitingFor(resolvedRisk).some(item => item.messageId === waiting.messageId));
const restoredRisk = restoreBotos(JSON.stringify(resolved), seedBotos).bots.find(item => item.id === waiting.botId);
assert.ok(!waitingFor(restoredRisk).some(item => item.messageId === waiting.messageId), 'restoring a resolved to-do does not reopen it');

// 恢复旧版工作区：移除退休智能体及其关联，保留用户智能体与治理记录。
const retiredIds = ['main', 'sys-experts', 'sys-skills', 'sys-connectors'];
const oldState = structuredClone(sent);
oldState.bots.push(...retiredIds.map(id => ({ ...bot('work'), id, kind: id === 'main' ? 'main' : 'system' })));
oldState.order.push(...retiredIds);
const finishedMessage = { id: 'seed-日常办公-14:24-项目总结已整', author: 'bot', name: '日常办公', text: '项目总结已整理并发送到「品牌升级」群。', time: '14:24' };
oldState.bots.find(item => item.id === 'work').messages = [finishedMessage];
oldState.bots.find(item => item.id === 'brand-team').memberIds.push(...retiredIds);
oldState.pending.push({ id: 'retired-task', botId: 'sys-skills', request: '创建旧技能' });
oldState.skills.push({ ...state.skills[0], id: 'skill-custom', name: '旧版创建的技能', createdByUser: true });
oldState.mcps.push({ ...state.mcps[0], id: 'mcp-custom', name: '旧版接入的连接器', createdByUser: true });
oldState.audit.push({ id: 'audit-1', botId: 'research', botName: '竞品调研专家', at: 10, actor: 'Samhar', action: '人员查询', subject: '9901**********0001', reason: '核验', result: '查到记录' });
const requestedAt = Date.now();
oldState.approvals.push({ id: 'approval-1', botId: 'research', botName: '竞品调研专家', kind: 'connector-access', title: '申请授权', detail: '任务所需', impact: '当前智能体', targetId: 'personnel', requestedAt, submittedAt: requestedAt, expiresAt: requestedAt + 600_000, status: 'pending' });
const expectedMessages = JSON.parse(JSON.stringify(sent.bots.find(item => item.id === 'research').messages));
for (const currentId of retiredIds) {
  const migratedOld = restoreBotos(JSON.stringify({ ...oldState, currentId }), seedBotos);
  assert.equal(migratedOld.currentId, HOME_PAGE_ID);
  assert.deepEqual(migratedOld.bots.map(item => item.id), state.bots.map(item => item.id));
  assert.deepEqual(migratedOld.order, sent.order);
  assert.deepEqual(migratedOld.bots.find(item => item.id === 'brand-team').memberIds, bot('brand-team').memberIds);
  assert.deepEqual(migratedOld.pending, [task]);
  assert.deepEqual(migratedOld.audit, oldState.audit);
  assert.deepEqual(migratedOld.approvals, oldState.approvals);
  assert.deepEqual(migratedOld.skills.find(item => item.id === 'skill-custom'), oldState.skills.at(-1));
  assert.deepEqual(migratedOld.mcps.find(item => item.id === 'mcp-custom'), oldState.mcps.at(-1));
  assert.deepEqual(migratedOld.bots.find(item => item.id === 'research').messages, expectedMessages);
  assert.deepEqual(migratedOld.bots.find(item => item.id === 'work').messages.find(item => item.id === finishedMessage.id), finishedMessage);
}
const migratedFromAgent = restoreBotos(JSON.stringify(oldState), seedBotos);
assert.equal(migratedFromAgent.currentId, HOME_PAGE_ID);
assert.equal(restoreBotos(JSON.stringify({ ...migratedFromAgent, currentId: 'research' }), seedBotos).currentId, 'research');

// 沉淀：智能体 → 专家，智能体群 → 专家团。
assert.equal(agentLabel(bot('work')), '智能体');
const { createPublication } = await import(new URL('../src/components/botos/expertDefinitions.ts', import.meta.url));
const capture = agent => ({
  type: 'capture-expert',
  publication: createPublication(state, agent, { prompt: agent.prompt, publish: false, routineTemplates: [], panelWidgets: [] }),
  prompt: agent.prompt,
  message: { id: 'capture', author: 'bot', name: agent.name, time: '12:00', text: '已沉淀为专家。' },
});
assert.equal(botosReducer(state, capture({ ...bot('personnel'), history: [] })), state, 'immature bots cannot bypass the capture gate');
const matured = botosReducer(state, capture(bot('work')));
assert.equal(agentLabel(matured.bots.find(b => b.id === 'work')), '专家');
assert.equal(matured.expertPublications.length, 1);
assert.equal(agentLabel({ kind: 'group', matured: false }), '智能体群');
assert.equal(agentLabel({ kind: 'group', matured: true }), '专家团');

const revoked = botosReducer(state, { type: 'revoke-capability', botId: 'personnel', kind: 'mcp', id: 'personnel' });
const revokedBot = revoked.bots.find(item => item.id === 'personnel');
const revokedWidgets = kinds(composeDashboard(revokedBot, revoked.skills, revoked.mcps));
assert.ok(revokedWidgets.includes('audit'), 'revoking query access preserves masked audit history access');
assert.ok(!revokedWidgets.includes('query-form'));

console.log('botos checks passed');
