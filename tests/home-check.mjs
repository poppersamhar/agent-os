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

const { maturityFor } = await import('../src/components/botos/botMaturity.ts');
assert.deepEqual(maturityFor({ history: [[18, 2]] }), {
  stableRuns: 18, totalRuns: 20, successRate: .9, remainingRuns: 12, eligible: false,
});
assert.equal(maturityFor({ history: [[36, 4]] }).eligible, true);
assert.equal(maturityFor({ history: [[30, 5]] }).eligible, false);
assert.equal(maturityFor({ history: [] }).successRate, undefined);

const { seedBotos } = await import('../src/components/botos/botosSeed.ts');
const { findItem } = await import('../src/components/botos/marketCatalog.ts');
const { personalHome, recommendedExperts, expertUsage, recommendedCapabilities } = await import('../src/components/botos/homeModel.ts');
const state = seedBotos();
const research = state.bots.find(bot => bot.id === 'research');
const needsUser = { id: 'needs-user', author: 'bot', name: research.name, text: '请确认调研范围', time: '10:00', needsUser: true };
const ordinary = { ...needsUser, id: 'ordinary', needsUser: false };
const approval = { ...needsUser, id: 'approval', approvalId: 'approval-1' };
const model = personalHome({
  ...state,
  pending: [{ id: 'running-1', botId: research.id, request: '整理竞品材料' }, { id: 'running-2', botId: research.id, request: '比较两份报告' }],
  bots: state.bots.map(bot => bot.id === research.id ? { ...bot, messages: [...bot.messages, ordinary, needsUser, approval] } : bot),
});
const botCard = model.agents.find(agent => agent.bot.id === research.id);
assert.equal(botCard.status, 'working');
assert.equal(botCard.currentTask, '比较两份报告');
assert.ok(botCard.latestArtifact);
assert.equal(model.working, 1);
assert.ok(model.waiting.some(item => item.messageId === needsUser.id && item.botId === research.id));
assert.ok(!model.waiting.some(item => item.messageId === ordinary.id));
assert.ok(!model.waiting.some(item => item.messageId === approval.id));

const expert = findItem('expert:research', state);
const live = { ...state, bots: [{ ...research, history: [[9, 1]] }] };
assert.equal(expertUsage(live, expert).successRate, .9);
assert.ok(recommendedExperts(state, 'popular').length);
assert.ok(recommendedExperts(state, 'department').some(entry => entry.item.tags.includes('品牌') || entry.item.owner === '品牌组'));
assert.notDeepEqual(recommendedExperts(state, 'popular').map(entry => entry.item.id), recommendedExperts(state, 'new').map(entry => entry.item.id));
assert.ok(recommendedCapabilities(state).some(entry => entry.item.kind === 'skill' && entry.reason));
assert.ok(recommendedCapabilities(state).some(entry => entry.item.kind === 'connector' && entry.reason));

console.log('personal home checks passed');
