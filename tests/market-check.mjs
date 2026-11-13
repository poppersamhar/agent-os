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

const { marketCatalog, catalogFor, findItem, installItem, recruitItem, definitionUpdate, applyDefinitionUpdate, isInstalled, itemDeps, teamMembers, mcpConfig, pluginPackage, publishedDefinitions, versionHistory, marketCapabilityIssue, marketItemAgents, marketScenes } = await import(new URL('../src/components/botos/marketCatalog.ts', import.meta.url));
const { seedBotos } = await import(new URL('../src/components/botos/botosSeed.ts', import.meta.url));
const { availableDefinitions, createPublication, sensitivePromptFields } = await import(new URL('../src/components/botos/expertDefinitions.ts', import.meta.url));
const { HOME_PAGE_ID, MARKET_PAGE_ID, composeDashboard } = await import(new URL('../src/components/botos/botModel.ts', import.meta.url));
const { makeSkill, makeConnector, parseSkillRequest, parseConnectorRequest, validConnectorEndpoint } = await import(new URL('../src/components/botos/capabilityDrafts.ts', import.meta.url));

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
const s1 = recruitItem(base, contract, { approvedMcpIds: ['contracts-db'] });
const bot = s1.bots.find(b => b.sourceId === 'expert:contract');
assert.ok(bot && bot.kind === 'bot');
assert.equal(s1.currentId, bot.id);
assert.ok(s1.skills.some(s => s.id === 'contract') && s1.mcps.some(m => m.id === 'contracts-db'), 'deps installed');
assert.ok(isInstalled(s1, contract));
assert.deepEqual(bot.mcpIds, ['contracts-db'], 'only selected connectors are granted');
const repeat = recruitItem(s1, contract);
const second = repeat.bots.find(b => b.id === repeat.currentId);
assert.equal(second.name, '合同审查专家 2');
assert.notEqual(second.id, bot.id);
assert.deepEqual(second.memory, []);
assert.deepEqual(second.mcpIds, []);
assert.deepEqual(second.requiredMcpIds, ['contracts-db']);
assert.match(second.messages[0].text, /从「合同审查专家」招募来的，记忆从空开始/);

// 添加专家团：群成员是从定义重新创建的独立实例。
const legal = findItem('team:legal');
const s2 = installItem(s1, legal);
const group = s2.bots.find(b => b.sourceId === 'team:legal');
assert.equal(group.kind, 'group');
assert.equal(group.memberIds.length, 2);
assert.ok(!group.memberIds.includes(bot.id), 'creates a new member without sharing the existing instance');
assert.equal(s2.bots.filter(b => b.sourceId === 'expert:contract').length, 2);
assert.ok(s2.bots.some(b => b.sourceId === 'expert:minutes'), 'adds missing member');
assert.ok(s2.mcps.some(m => m.id === 'dingtalk'), 'member deps installed');
assert.ok(!s2.order.includes(HOME_PAGE_ID) && !s2.order.includes(MARKET_PAGE_ID));
const recruitedToGroup = recruitItem(s2, contract, { groupId: group.id, name: '群里的合同助手' });
assert.equal(recruitedToGroup.currentId, group.id);
const member = recruitedToGroup.bots.find(b => b.name === '群里的合同助手');
assert.ok(recruitedToGroup.bots.find(b => b.id === group.id).memberIds.includes(member.id));
assert.deepEqual(member.memory, []);

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

// 沉淀只复制定义。待审批定义不能出现在企业市场。
const research = base.bots.find(b => b.id === 'research');
const opts = { publish: true, prompt: research.prompt, panelWidgets: composeDashboard(research, base.skills, base.mcps).widgets,
  routineTemplates: [{ name: '每日简报', trigger: '每天 09:00', enabled: true, id: 'old', lastRunAt: 10 }] };
assert.deepEqual(sensitivePromptFields('测试手机号 138 0000 0000 和身份证号 33010119900101001X'), ['身份证号', '手机号']);
assert.equal(createPublication(base, research, { ...opts, prompt: '联系 13800000000' }), undefined);
const publication = createPublication(base, research, opts);
assert.equal(publication.status, 'pending');
for (const field of ['memory', 'messages', 'history', 'files', 'capabilityGrants']) assert.ok(!(field in publication.definition));
assert.deepEqual(publication.definition.routineTemplates, [{ name: '每日简报', trigger: '每天 09:00', enabled: true }]);
assert.deepEqual(publishedDefinitions({ ...base, expertPublications: [publication] }), []);
const published = { ...base, expertPublications: [{ ...publication, status: 'approved' }] };
assert.equal(publishedDefinitions(published)[0].id, publication.definition.id);
const recruitedFromPublication = recruitItem(published, publication.definition);
const publishedInstance = recruitedFromPublication.bots.find(b => b.id === recruitedFromPublication.currentId);
assert.notEqual(publishedInstance.routines[0].id, 'old');
assert.equal(publishedInstance.routines[0].lastRunAt, undefined);
const nextPublication = createPublication(published, research, { ...opts, prompt: '每周整理定价和开源动态。' });
const withPendingUpdate = { ...recruitedFromPublication, expertPublications: [nextPublication, ...published.expertPublications] };
assert.equal(availableDefinitions(withPendingUpdate).find(item => item.id === publication.definition.id).version, nextPublication.definition.version);
assert.equal(publishedDefinitions(withPendingUpdate)[0].version, publication.definition.version);
assert.equal(definitionUpdate(withPendingUpdate, publishedInstance), undefined);
const withApprovedUpdate = { ...withPendingUpdate, expertPublications: [{ ...nextPublication, status: 'approved' }, ...published.expertPublications] };
assert.equal(definitionUpdate(withApprovedUpdate, publishedInstance).version, nextPublication.definition.version);
assert.deepEqual(versionHistory(nextPublication.definition, withApprovedUpdate).map(item => item.version), ['1.0.1', '1.0.0']);

const update = definitionUpdate(base, research);
assert.equal(update.version, '2.1.0');
const updated = applyDefinitionUpdate(base, research, update).bots.find(b => b.id === research.id);
assert.equal(updated.sourceVersion, update.version);
assert.deepEqual(updated.memory, research.memory);
assert.deepEqual(updated.messages, research.messages);
assert.deepEqual(updated.mcpIds, research.mcpIds);

// 市场以工作区的能力记录为准，临时助手只创建能力。
const skill = makeSkill(parseSkillRequest('新建「投诉分析」，整理客服工单'), 'complaints');
const connectorDraft = parseConnectorRequest('接入「工单系统」，端点 mcp://tickets.internal');
const connector = makeConnector({ ...connectorDraft, tools: ['检索工单', '检索工单'] }, 'tickets');
assert.equal(skill.name, '投诉分析');
assert.equal(parseSkillRequest('新建「市场验收技能」，整理模拟反馈').name, '市场验收技能');
assert.equal(skill.description, '整理客服工单');
assert.equal(connector.name, '工单系统');
assert.equal(connector.endpoint, 'mcp://tickets.internal');
assert.deepEqual(connector.tools, ['检索工单']);
assert.ok(validConnectorEndpoint('https://example.com/mcp?channel=tickets'));
assert.ok(!validConnectorEndpoint('https://example.com/mcp?api_key=secret'));
assert.ok(!validConnectorEndpoint('https://user:secret@example.com/mcp'));
const custom = botosReducer(botosReducer(base, { type: 'create-skill', skill }), { type: 'create-mcp', mcp: connector });
assert.equal(custom.bots.length, base.bots.length);
assert.equal(catalogFor(custom).find(item => item.id === `connector:${connector.id}`).source, 'mine');
assert.equal(findItem(`skill:${skill.id}`, custom).source, 'mine');
assert.equal(marketCapabilityIssue(findItem('connector:feishu', custom)), '凭证即将过期');
assert.equal(marketCapabilityIssue(findItem('skill:inspect', custom)), '失败率偏高');
assert.ok(marketScenes(contract).includes('法务'));
const liveConnector = findItem('connector:feishu', custom);
assert.ok(marketItemAgents(custom, liveConnector).some(bot => bot.id === 'work'));
const revoked = botosReducer(custom, { type: 'revoke-capability', kind: 'mcp', id: liveConnector.mcp.id, botId: 'work' });
assert.ok(!marketItemAgents(revoked, liveConnector).some(bot => bot.id === 'work'));
assert.equal(marketCapabilityIssue(findItem('connector:feishu', botosReducer(custom, { type: 'toggle-mcp', id: liveConnector.mcp.id }))), '已停用');

console.log('market checks passed');
