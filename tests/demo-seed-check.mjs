import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

// Match Vite's local extensionless TS imports without changing the source modules.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !extname(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { agentosArtifacts } = await import(new URL('../src/data/agentosArtifacts.ts', import.meta.url));
const { demoWorkJobs, demoWorkMessages } = await import(new URL('../src/components/agentos/workspaceDemoData.ts', import.meta.url));
const { workspaceReducer, restoreWorkspace, jobArtifact } = await import(new URL('../src/components/agentos/workspaceModel.ts', import.meta.url));

const seed = state => workspaceReducer(state, { type: 'seed-demo', jobs: demoWorkJobs, messages: demoWorkMessages });
const restore = state => restoreWorkspace(JSON.stringify({ ...state, version: 1 }));
const sampleJobIds = new Set(demoWorkJobs.map(job => job.id));
const sampleMessageIds = new Set(demoWorkMessages.map(message => message.id));
const base = agentosArtifacts[0];

function genuineJob(id, status) {
  return {
    id,
    request: `Original request ${id}`,
    title: `Original title ${id}`,
    baseId: base.id,
    artifactId: `original-artifact-${id}`,
    projectId: base.projectId,
    status,
    phase: status === 'completed' ? 3 : 1,
    attempt: 1,
    modelId: 'default',
  };
}

const original = {
  jobs: [genuineJob('original-running', 'running'), genuineJob('original-completed', 'completed')],
  messages: [
    { id: 'original-user', role: 'user', text: 'An existing request', time: '08:30', jobId: 'original-running' },
    { id: 'original-assistant', role: 'assistant', text: 'An existing reply', time: '08:31' },
  ],
  selectedId: 'original-artifact-original-running',
  contextId: 'original-artifact-original-completed',
  draft: 'Existing unsent draft\nKeep this line.',
};
const originalSnapshot = structuredClone(original);
let checks = 0;

function check(name, run) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

check('six samples have valid bases, unique IDs, and message/artifact links', () => {
  assert.equal(demoWorkJobs.length, 6);
  assert.equal(demoWorkMessages.length, 6);
  assert.equal(sampleJobIds.size, 6);
  assert.equal(sampleMessageIds.size, 6);
  assert.equal(new Set(demoWorkJobs.map(job => job.artifactId)).size, 6);
  assert.deepEqual([...new Set(demoWorkJobs.map(job => job.status))].sort(), ['completed', 'paused', 'running']);
  for (const job of demoWorkJobs) {
    assert(agentosArtifacts.some(artifact => artifact.id === job.baseId), `${job.id}: missing base`);
    assert(!agentosArtifacts.some(artifact => artifact.id === job.artifactId), `${job.id}: artifact ID collision`);
    assert.equal(job.demo, true);
    assert.match(job.title, /示例/);
    assert.match(job.request, /示例/);
    assert.equal(jobArtifact(job).id, job.artifactId);
    const linked = demoWorkMessages.filter(message => message.jobId === job.id);
    assert.equal(linked.length, 1, `${job.id}: expected one sample message`);
    assert.equal(linked[0].text, job.request);
    assert.equal(linked[0].role, 'user');
    assert.equal(linked[0].sourceKind, job.sourceKind);
    assert.equal(linked[0].sourceName, job.sourceName);
  }
});

const seeded = seed(original);
check('seed preserves existing history, draft, context, selection, and its input', () => {
  assert.deepEqual(original, originalSnapshot);
  assert.equal(seeded.jobs.length, original.jobs.length + 6);
  assert.equal(seeded.messages.length, original.messages.length + 6);
  assert.deepEqual(seeded.jobs.filter(job => !sampleJobIds.has(job.id)), original.jobs);
  assert.deepEqual(seeded.messages.filter(message => !sampleMessageIds.has(message.id)), original.messages);
  for (const job of original.jobs) assert.equal(seeded.jobs.find(item => item.id === job.id), job);
  for (const message of original.messages) assert.equal(seeded.messages.find(item => item.id === message.id), message);
  assert.equal(seeded.draft, original.draft);
  assert.equal(seeded.contextId, original.contextId);
  assert.equal(seeded.selectedId, original.selectedId);
});

check('repeating seed returns the same state without duplicate IDs', () => {
  assert.equal(seed(seeded), seeded);
  assert.equal(new Set(seeded.jobs.map(job => job.id)).size, seeded.jobs.length);
  assert.equal(new Set(seeded.messages.map(message => message.id)).size, seeded.messages.length);
});

check('restore retains sample states while pausing genuine running work', () => {
  const restored = restore(seeded);
  assert.equal(restored.jobs.length, seeded.jobs.length);
  assert.deepEqual(restored.messages, seeded.messages);
  for (const job of demoWorkJobs) {
    const recovered = restored.jobs.find(item => item.id === job.id);
    assert.equal(recovered.status, job.status, `${job.id}: status changed`);
    assert.equal(recovered.demo, true);
  }
  assert.equal(restored.jobs.find(job => job.id === 'original-running').status, 'paused');
  assert.equal(restored.jobs.find(job => job.id === 'original-completed').status, 'completed');
  assert.equal(restored.draft, original.draft);
  assert.equal(restored.contextId, original.contextId);
  assert.equal(restored.selectedId, original.selectedId);
});

check('invalid demo metadata is stripped without losing history or running recovery', () => {
  const tampered = {
    ...seeded,
    jobs: seeded.jobs.map(job => job.id === 'original-running' ? { ...job, demo: 'true' } : job),
  };
  const restored = restore(tampered);
  assert.equal(restored.jobs.length, seeded.jobs.length);
  assert.deepEqual(restored.messages, seeded.messages);
  const recovered = restored.jobs.find(job => job.id === 'original-running');
  assert.equal(recovered.status, 'paused');
  assert.equal(Object.hasOwn(recovered, 'demo'), false);
  assert.equal(restored.draft, original.draft);
  assert.equal(restored.contextId, original.contextId);
  assert.equal(restored.selectedId, original.selectedId);
});

check('seeding does not reset a sample that the user cancelled', () => {
  const runningSample = demoWorkJobs.find(job => job.status === 'running');
  const cancelled = workspaceReducer(seeded, {
    type: 'cancel', id: runningSample.id,
    message: { id: 'sample-cancel-reply', role: 'assistant', text: 'Stopped sample', time: '10:00' },
  });
  assert.equal(cancelled.jobs.find(job => job.id === runningSample.id).status, 'cancelled');
  assert.equal(seed(cancelled), cancelled);
  assert.equal(restore(cancelled).jobs.find(job => job.id === runningSample.id).status, 'cancelled');
});

check('partial seeds fill missing jobs and messages independently', () => {
  const retainedJob = { ...demoWorkJobs[0], status: 'cancelled' };
  const retainedMessage = { ...demoWorkMessages[1], text: 'An existing sample message kept unchanged' };
  const partial = {
    ...original,
    jobs: [...original.jobs, retainedJob],
    messages: [...original.messages, retainedMessage],
  };
  const repaired = seed(partial);
  assert.equal(repaired.jobs.length, original.jobs.length + 6);
  assert.equal(repaired.messages.length, original.messages.length + 6);
  assert.equal(repaired.jobs.find(job => job.id === retainedJob.id), retainedJob);
  assert.equal(repaired.messages.find(message => message.id === retainedMessage.id), retainedMessage);
  assert.equal(seed(repaired), repaired);
});

console.log(`All ${checks} demo-seed invariant checks passed.`);
