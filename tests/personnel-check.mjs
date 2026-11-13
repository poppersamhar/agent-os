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

const { approvalStatus, auditApproval, createApproval, decideApproval, expireApproval, submitApproval } = await import('../src/components/botos/governance.ts');
const { PERSONNEL_SAMPLE_ID, personnelAnalysis, personnelApproval, personnelAudit, personnelMessage, personnelValidation, personnelView, runPersonnel } = await import('../src/components/botos/personnel.ts');
const { seedBotos } = await import('../src/components/botos/botosSeed.ts');
const { botosReducer, composeDashboard, restoreBotos } = await import('../src/components/botos/botModel.ts');

const bot = { id: 'demo-bot', name: '人员查询' };
const at = 1_000;
const input = { identity: PERSONNEL_SAMPLE_ID, reason: `入职核验 ${PERSONNEL_SAMPLE_ID}` };
assert.equal(personnelValidation(input), null);
assert.ok(personnelValidation({ ...input, reason: '  ' }));
assert.ok(personnelValidation({ ...input, identity: '123' }));
assert.ok(personnelValidation({ ...input, identity: '990101199002310001' }));
assert.equal(runPersonnel({ ...input, identity: '123' }, 'direct', 'invalid', at), null);

const query = runPersonnel(input, 'direct', 'query-1', at);
assert.ok(query.recordKey);
assert.match(query.subject, /^\d{4}\*{10}\d{4}$/);
assert.ok(!JSON.stringify(query).includes(PERSONNEL_SAMPLE_ID));
assert.match(personnelMessage(query), /在面板查询了/);
const audit = personnelAudit(query, bot);
assert.deepEqual([audit.botId, audit.subject, audit.result], [bot.id, query.subject, '查到记录']);
assert.ok(!JSON.stringify(audit).includes(PERSONNEL_SAMPLE_ID));

const missing = runPersonnel({ ...input, identity: '110101199001010009' }, 'direct', 'query-2', at);
assert.equal(missing.recordKey, undefined);
assert.equal(personnelAudit(missing, bot).result, '未查到');
assert.equal(personnelApproval(missing, bot, 'none'), null);

const analysis = runPersonnel({ ...input, reason: '' }, 'agent', 'analysis-1', at);
assert.match(personnelMessage(analysis), /动作：异常分析\n查询对象：/);
assert.equal(analysis.reason, '异常分析');
assert.ok(personnelAnalysis(analysis));
assert.equal(personnelApproval(analysis, bot, 'none'), null);

const approval = personnelApproval(query, bot, 'reveal-1', at);
assert.equal(approval.targetId, query.id);
assert.equal(approvalStatus(approval, at), 'pending');
assert.equal(personnelView(query, approval).identity, query.subject);
assert.equal(personnelView(query, { ...approval, targetId: 'other', status: 'approved' }).identity, query.subject);
assert.equal(personnelView(query, { ...approval, kind: 'connector-access', status: 'approved' }).identity, query.subject);
const approved = decideApproval(approval, 'approved', at + 1);
assert.equal(personnelView(query, approved).identity, PERSONNEL_SAMPLE_ID);
const rejected = decideApproval(approval, 'rejected', at + 1);
assert.equal(personnelView(query, rejected).identity, query.subject);
assert.equal(decideApproval(approved, 'rejected', at + 2), approved);
assert.equal(auditApproval(approved).subject, query.subject);
assert.ok(!JSON.stringify(auditApproval(approved)).includes(PERSONNEL_SAMPLE_ID));

const draft = createApproval({ botId: bot.id, botName: bot.name, id: 'access', kind: 'connector-access', title: '授权申请', detail: '人员信息库', impact: '仅当前智能体', targetId: 'personnel' }, at);
assert.equal(draft.submittedAt, undefined);
assert.equal(decideApproval(draft, 'approved', at), draft);
const submitted = submitApproval(draft, at + 5);
assert.equal(submitted.submittedAt, at + 5);
assert.equal(submitted.expiresAt - submitted.submittedAt, 600_000);
assert.equal(expireApproval(submitted, submitted.expiresAt - 1), submitted);
assert.equal(decideApproval(submitted, 'approved', submitted.expiresAt).status, 'expired');
assert.equal(expireApproval(submitted, submitted.expiresAt).status, 'expired');

let state = seedBotos();
const personnelBot = () => state.bots.find(item => item.id === 'personnel');
const reduce = action => { state = botosReducer(state, action); };
const queryWidgets = () => composeDashboard(personnelBot(), state.skills, state.mcps).widgets.filter(widget => widget.kind === 'query-form');
const run = (mode, id) => reduce({ type: 'personnel-run', botId: 'personnel', mode, input, id, slotId: `mcp:personnel:query-form:${mode}`, at });

assert.deepEqual(queryWidgets().map(widget => widget.action), ['direct', 'agent']);
run('direct', 'demo-query');
assert.equal(state.audit.length, 1);
assert.equal(personnelBot().messages.at(-1).author, 'source');
const liveReveal = personnelApproval(personnelBot().personnelResults.direct, personnelBot(), 'demo-reveal', at);
reduce({ type: 'request-approval', approval: liveReveal });
reduce({ type: 'resolve-approval', id: liveReveal.id, decision: 'approved', at: at + 1 });
assert.equal(personnelView(personnelBot().personnelResults.direct, state.approvals[0]).identity, PERSONNEL_SAMPLE_ID);
assert.equal(state.audit.length, 2);

run('agent', 'demo-analysis');
assert.equal(personnelBot().messages.at(-1).author, 'user');
assert.equal(state.pending.length, 1);
state = restoreBotos(JSON.stringify(state), seedBotos);
reduce({ type: 'personnel-complete', taskId: 'demo-analysis', at: at + 500 });
assert.equal(personnelBot().messages.at(-1).author, 'bot');
assert.ok(personnelBot().personnelResults.agent);
assert.equal(state.audit.length, 3);
assert.ok(!JSON.stringify(state).includes(PERSONNEL_SAMPLE_ID));

reduce({ type: 'revoke-capability', botId: 'personnel', kind: 'mcp', id: 'personnel' });
assert.equal(queryWidgets().length, 0);
run('direct', 'blocked-query');
assert.equal(state.audit.length, 3);
const grant = createApproval({ ...draft, id: 'demo-grant', botId: 'personnel', botName: personnelBot().name }, Date.now());
reduce({ type: 'request-approval', approval: grant });
reduce({ type: 'submit-approval', id: grant.id, at: grant.requestedAt });
reduce({ type: 'resolve-approval', id: grant.id, decision: 'approved', at: grant.requestedAt + 1 });
assert.equal(queryWidgets().length, 2);
assert.equal(personnelBot().personnelResults?.direct, undefined, 'connector regrant requires a new query before exposing personnel data');
assert.ok(state.audit.some(record => record.id === `${liveReveal.id}-audit`), 'revocation preserves earlier audit records');

const externalApproval = (id, detail) => createApproval({ id, botId: 'work', botName: '日常办公', kind: 'send-external', title: '发送到飞书', targetId: 'feishu', detail, impact: '群聊成员可见' }, at);
reduce({ type: 'request-approval', approval: externalApproval('send-a', '发送采购纪要') });
reduce({ type: 'request-approval', approval: externalApproval('send-b', '发送设计纪要') });
assert.equal(state.approvals.filter(approval => approval.kind === 'send-external').length, 2, 'distinct messages to one channel have separate approvals');

console.log('personnel and approvals checks passed');
