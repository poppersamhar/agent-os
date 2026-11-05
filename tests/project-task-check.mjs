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

const { agentosProjects, DEFAULT_PROJECT_ID, normalizeProjectId } = await import(new URL('../src/data/agentosArtifacts.ts', import.meta.url));
const { emptyWorkspace, workspaceReducer, restoreWorkspace, jobArtifact } = await import(new URL('../src/components/agentos/workspaceModel.ts', import.meta.url));
const { isTaskContinuation } = await import(new URL('../src/components/agentos/taskContinuation.ts', import.meta.url));
const task = {
  id: 'task-main', artifactId: 'result-main', baseId: 'brand-slides', projectId: 'p_brand_contract',
  title: '品牌发布演示稿', request: '制作一份品牌发布演示稿', status: 'completed', phase: 3, attempt: 1,
  sourceId: 'feishu-product', sourceName: '产品共创群', sourceKind: 'feishu', modelId: 'default',
};
const originalMessage = { id: 'm-first', role: 'user', text: task.request, time: '10:00', jobId: task.id,
  sourceName: '产品共创群', sourceKind: 'feishu' };
const state = { ...emptyWorkspace, jobs: [task], messages: [originalMessage],
  selectedId: task.artifactId, contextId: task.artifactId, draft: '尚未发送的补充' };
const restore = value => restoreWorkspace(JSON.stringify({ version: 1, ...value }));
let checks = 0;
function check(name, run) {
  run(); checks += 1; console.log(`PASS ${name}`);
}

check('one default project owns every missing, personal, or unknown project ID', () => {
  assert.equal(agentosProjects.filter(project => project.id === DEFAULT_PROJECT_ID).length, 1);
  for (const value of [undefined, null, '', 'personal', 'unrecognized', 5]) assert.equal(normalizeProjectId(value), DEFAULT_PROJECT_ID);
  for (const project of agentosProjects) assert.equal(normalizeProjectId(project.id), project.id);
});

check('version 1 migration preserves history and valid projects while repairing unclassified tasks', () => {
  const { projectId: _projectId, ...withoutProject } = task;
  const legacy = { ...state, jobs: [task, { ...task, id: 'personal', projectId: 'personal' },
    { ...withoutProject, id: 'missing' }, { ...task, id: 'unknown', projectId: 'unknown' }] };
  const restored = restore(legacy);
  assert.equal(restored.jobs.length, 4);
  assert.equal(restored.jobs[0].projectId, task.projectId);
  assert(restored.jobs.slice(1).every(job => job.projectId === DEFAULT_PROJECT_ID));
  assert.deepEqual(restored.messages, state.messages);
  assert.equal(restored.draft, state.draft);
  assert.equal(restored.contextId, state.contextId);
  assert.equal(restored.selectedId, state.selectedId);
});

check('new jobs and artifacts cannot remain outside a project', () => {
  const unclassified = { ...task, projectId: 'personal' };
  const started = workspaceReducer(emptyWorkspace, { type: 'start', job: unclassified, messages: [originalMessage] });
  assert.equal(started.jobs[0].projectId, DEFAULT_PROJECT_ID);
  assert.equal(jobArtifact(unclassified).projectId, DEFAULT_PROJECT_ID);
  assert.equal(jobArtifact(task).taskTitle, task.title);
});

const followUp = (current, text, index, extra = {}) => workspaceReducer(current, {
  type: 'follow-up', id: task.id, text, ...extra,
  messages: [{ id: `m-${index}`, role: 'user', text, time: `10:0${index}`, sourceName: 'samhar' }],
});
const requests = ['控制在六页以内', '重点介绍产品价值', '最后补充下一步计划'];
const continued = requests.reduce((current, text, index) => followUp(current, text, index + 1), state);

check('four related messages remain one task with cumulative requirements and original source metadata', () => {
  assert.equal(continued.jobs.length, 1);
  const job = continued.jobs[0];
  assert.equal(job.id, task.id);
  assert.equal(job.artifactId, task.artifactId);
  assert.equal(job.projectId, task.projectId);
  assert.equal(job.title, task.title);
  assert.equal(job.modelId, task.modelId);
  assert.equal(job.sourceId, task.sourceId);
  assert.equal(job.sourceName, task.sourceName);
  assert.equal(job.request, [task.request, ...requests].join('\n\n'));
  assert.equal(job.status, 'running');
  assert.equal(job.phase, 0);
  assert.equal(job.attempt, 4);
  assert.equal(continued.messages.length, 4);
  assert(continued.messages.every(message => message.jobId === task.id));
  assert.equal(continued.messages[0], originalMessage);
  assert.equal(continued.messages[0].sourceName, '产品共创群');
  assert.equal(continued.messages[1].sourceName, 'samhar');
  assert.equal(continued.selectedId, task.artifactId);
  assert.equal(continued.draft, '');
});

check('old asynchronous work cannot overwrite a task after its follow-up', () => {
  assert.deepEqual(workspaceReducer(continued, { type: 'phase', id: task.id, attempt: 1, phase: 2 }), continued);
  assert.equal(workspaceReducer(continued, { type: 'complete', id: task.id, attempt: 1,
    message: { id: 'stale', role: 'assistant', text: 'An outdated result', time: '10:10' } }), continued);
  const completed = workspaceReducer(continued, { type: 'complete', id: task.id, attempt: 4,
    message: { id: 'current', role: 'assistant', text: 'Current result', time: '10:11' } });
  assert.equal(completed.jobs[0].status, 'completed');
  assert.equal(completed.messages.at(-1).id, 'current');
});

check('follow-up retains legacy first requests without linking unrelated or already linked messages', () => {
  const { jobId: _jobId, ...legacy } = originalMessage;
  const alreadyLinked = { ...originalMessage, id: 'm-other-task', jobId: 'other-task' };
  const unrelated = { ...legacy, id: 'm-unrelated', text: '另一个需求' };
  const assistant = { ...legacy, id: 'm-assistant', role: 'assistant' };
  const updated = followUp({ ...state, messages: [legacy, alreadyLinked, unrelated, assistant] }, requests[0], 1);
  assert.deepEqual(updated.messages[0], { ...legacy, jobId: task.id });
  assert.equal(updated.messages[0].sourceName, legacy.sourceName);
  assert.equal(updated.messages[0].sourceKind, legacy.sourceKind);
  assert.equal(updated.messages[1], alreadyLinked);
  assert.equal(updated.messages[2], unrelated);
  assert.equal(updated.messages[3], assistant);
  assert.equal(updated.messages.at(-1).jobId, task.id);
  assert.equal(Object.hasOwn(legacy, 'jobId'), false);
});

check('follow-up preserves other tasks and only changes the title when one is supplied', () => {
  const other = { ...task, id: 'other', projectId: 'p_data_middle' };
  const withOther = { ...state, jobs: [task, other] };
  const updated = followUp(withOther, requests[0], 1, { title: '  六页品牌提案  ' });
  assert.equal(updated.jobs[0].title, '六页品牌提案');
  assert.equal(updated.jobs[1], other);
  assert.equal(withOther.jobs[0], task);
  assert.equal(task.request, originalMessage.text);
  assert.equal(followUp(state, '  ', 1), state);
  assert.equal(workspaceReducer(state, { type: 'follow-up', id: 'missing', text: 'update', messages: [] }), state);
});

check('explicit follow-up activates only the edited sample and persisted context survives reload', () => {
  const sample = { ...task, demo: true, status: 'paused' };
  const untouched = { ...sample, id: 'other-demo' };
  const updated = followUp({ ...state, jobs: [sample, untouched] }, requests[0], 1);
  assert.equal(Object.hasOwn(updated.jobs[0], 'demo'), false);
  assert.equal(updated.jobs[1], untouched);
  const restored = restore(updated);
  assert.equal(restored.jobs[0].status, 'paused');
  assert.equal(restored.jobs[0].request, updated.jobs[0].request);
  assert.deepEqual(restored.messages, updated.messages);
  assert.equal(restored.jobs[1].demo, true);
});

check('preview routing distinguishes supplements from independent tasks', () => {
  for (const text of ['补充一下受众是投资人', '控制在六页以内', '最后加上下一步计划', '给投资人看', '把这个演示改成黑白风格']) {
    assert.equal(isTaskContinuation(text, task), true, text);
    assert.equal(isTaskContinuation(text, undefined), false, text);
  }
  for (const text of ['新任务：制作数据质量报告', '换个话题', '另一个问题：如何做PPT', '生成一个品牌发布网页', '制作一份数据中台演示稿']) {
    assert.equal(isTaskContinuation(text, task), false, text);
  }
});

console.log(`All ${checks} project/task checks passed.`);
