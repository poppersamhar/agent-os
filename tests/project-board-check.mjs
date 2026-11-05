import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve((specifier.startsWith('./') || specifier.startsWith('../')) && !extname(specifier)
      ? `${specifier}.ts` : specifier, context);
  },
});

const { projectBoardTasks } = await import(new URL('../src/components/agentos/projectBoardModel.ts', import.meta.url));
const { agentosArtifacts } = await import(new URL('../src/data/agentosArtifacts.ts', import.meta.url));
const base = agentosArtifacts[0];
const job = {
  id: 'owned-task', title: '品牌发布演示稿', request: '制作六页演示稿\n\n突出产品价值',
  artifactId: 'owned-result', baseId: base.id, projectId: base.projectId,
  status: 'completed', phase: 3, attempt: 2, sourceName: '产品共创群', sourceKind: 'feishu',
};
const request = { id: 'm-1', role: 'user', jobId: job.id, text: '制作六页演示稿', time: '09:00', sourceName: '产品共创群', sourceKind: 'feishu' };
const followup = { id: 'm-2', role: 'user', jobId: job.id, text: '突出产品价值', time: '09:01' };
let checks = 0;
function check(name, run) { run(); checks += 1; console.log(`PASS ${name}`); }

check('worker states occupy exactly one accurate column with a task-specific target', () => {
  for (const [status, column, label] of [
    ['paused', 'pending', '需要人工介入'], ['cancelled', 'pending', '已停止'],
    ['running', 'running', '正在处理'], ['completed', 'completed', '已完成'],
  ]) {
    const [task] = projectBoardTasks(base.projectId, [{ ...job, status }], [request], []);
    assert.equal(task.column, column);
    assert.equal(task.statusLabel, label);
    assert.equal(task.id, job.id);
    assert.equal(task.jobId, job.id);
    assert.equal(task.artifactId, job.artifactId);
    assert.equal(task.artifactCount, status === 'completed' ? 1 : 0);
  }
});

check('follow-ups remain one card and preserve task origin rather than the latest sender', () => {
  const tasks = projectBoardTasks(base.projectId, [job], [request, followup,
    { id: 'a-1', role: 'assistant', jobId: job.id, text: '已完成', time: '09:02' }], []);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].messageCount, 2);
  assert.equal(tasks[0].summary, job.request);
  assert.equal(tasks[0].sourceName, '产品共创群');
  assert.equal(tasks[0].sourceKind, 'feishu');
  assert.equal(tasks[0].time, '09:00');
  const [personal] = projectBoardTasks(base.projectId, [{ ...job, sourceKind: undefined, sourceName: undefined }], [followup], []);
  assert.equal(personal.sourceName, 'samhar');
});

check('shared artifact templates do not collapse distinct user tasks', () => {
  const other = { ...job, id: 'another-task', artifactId: 'another-result' };
  const tasks = projectBoardTasks(base.projectId, [job, other], [], [base]);
  assert.equal(tasks.length, 3);
  assert.deepEqual(tasks.slice(0, 2).map(task => task.id), [other.id, job.id]);
  assert.equal(tasks.find(task => task.id === base.taskId).sourceName, '示例任务');
});

check('static multi-file tasks deduplicate and unfinished files prevent false completion', () => {
  const ready = { ...base, id: 'ready-file', taskId: 'multi-task', status: 'ready' };
  const draft = { ...ready, id: 'draft-file', status: 'draft' };
  const updating = { ...ready, id: 'updating-file', status: 'updating' };
  const [pending] = projectBoardTasks(base.projectId, [], [], [ready, draft, ready]);
  assert.equal(pending.column, 'pending');
  assert.equal(pending.artifactCount, 2);
  assert.equal(pending.artifactId, draft.id);
  const [running] = projectBoardTasks(base.projectId, [], [], [ready, draft, updating]);
  assert.equal(running.column, 'running');
  assert.equal(running.artifactId, updating.id);
  assert.equal(running.artifactCount, 3);
  const [completed] = projectBoardTasks(base.projectId, [], [], [ready]);
  assert.equal(completed.column, 'completed');
});

check('job state and project ownership override stale static records without duplicate cards', () => {
  const stale = { ...base, taskId: job.id, status: 'ready' };
  const moved = { ...job, projectId: 'p_data_middle', status: 'paused' };
  assert.deepEqual(projectBoardTasks(base.projectId, [moved], [], [stale]), []);
  const [task] = projectBoardTasks(moved.projectId, [moved], [], [stale]);
  assert.equal(task.column, 'pending');
  assert.equal(task.statusLabel, '需要人工介入');
  assert.equal(task.artifactId, moved.artifactId);
  assert.equal(task.artifactCount, 1);
});

check('default project normalization includes unclassified tasks without leaking known projects', () => {
  const legacy = { ...job, projectId: 'personal' };
  const tasks = projectBoardTasks('p_default', [legacy, { ...job, id: 'known' }], [], [base]);
  assert.deepEqual(tasks.map(task => task.id), [legacy.id]);
  assert.deepEqual(projectBoardTasks('p_risk', [legacy], [], [base]), []);
});

check('building a board leaves job, message, and artifact inputs untouched', () => {
  const inputs = { jobs: [job], messages: [request, followup], artifacts: [base] };
  const snapshot = structuredClone(inputs);
  projectBoardTasks(base.projectId, inputs.jobs, inputs.messages, inputs.artifacts);
  assert.deepEqual(inputs, snapshot);
});

console.log(`All ${checks} project board checks passed.`);
