import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  fileDownload,
  routineFromRequest,
  runRoutine,
  seedRoutines,
  seedWorkspaceFiles,
  tableActionStatus,
  tableRows,
  workspaceFiles,
} from '../src/components/botos/workspaceWidgets.ts';

const daily = routineFromRequest('每天早上给我一份简报', 'routine-1');
assert.deepEqual(daily, { id: 'routine-1', name: '每日简报', trigger: '每天 09:00', enabled: true });
assert.equal(routineFromRequest('每天早上几点开门？', 'ignored'), undefined);
assert.equal(routineFromRequest('每周五下午 3 点发竞品周报', 'weekly')?.trigger, '每周五 15:00');
assert.equal(routineFromRequest('收到 GitHub 新 PR 时提醒我', 'event')?.trigger, 'GitHub 新 PR');
assert.ok(seedRoutines('research').some(routine => routine.trigger === 'GitHub 新 PR'));
assert.ok(seedRoutines('data').some(routine => routine.trigger === '每天 09:00'));
assert.deepEqual(seedRoutines('recruited-instance'), []);

const at = Date.UTC(2026, 10, 12, 17);
const run = runRoutine(daily, at, 'run-1');
assert.equal(run.routine.lastRunAt, at);
assert.equal(run.routine.lastResult, '已完成');
assert.equal(run.artifact.id, 'run-1');
assert.equal(run.artifact.folder, 'artifacts');
assert.equal(run.log.folder, 'logs');
assert.match(run.text, /每日简报/);

const legacy = { id: 'work', name: '日常办公', messages: [
  { id: 'old-file', attachment: '品牌产品介绍.html', name: '日常办公', time: '09:00', text: '已完成' },
  { id: 'message', time: '10:00', text: '无附件' },
] };
assert.deepEqual(workspaceFiles(legacy).map(file => [file.id, file.kind]), [['old-file', 'web']]);
const generated = { ...legacy, files: [run.artifact, run.log, ...seedWorkspaceFiles('work')], messages: [
  ...legacy.messages,
  { id: 'run-1', attachment: run.artifact.name, name: '日常办公', time: '11:00', text: run.text },
] };
const files = workspaceFiles(JSON.parse(JSON.stringify(generated)));
assert.deepEqual(files.filter(file => file.id === 'run-1'), [{ ...run.artifact, author: '日常办公' }]);
assert.ok(files.some(file => file.folder === 'uploads'));
assert.ok(files.some(file => file.folder === 'logs'));
assert.equal(workspaceFiles({ id: 'another', name: '另一个智能体', messages: [] }).length, 0);

const logDownload = fileDownload(run.log);
assert.equal(logDownload.name, run.log.name);
assert.match(logDownload.text, /每日简报/);
const webDownload = fileDownload(workspaceFiles(legacy)[0]);
assert.match(webDownload.text, /<!doctype html>/i);
assert.equal(webDownload.mime, 'text/html;charset=utf-8');
const presentation = workspaceFiles({ ...legacy, messages: [
  { id: 'slides', attachment: '品牌升级提案.pptx', name: '品牌专家团', time: '09:00', text: '已完成' },
] })[0];
const pptDownload = fileDownload(presentation);
assert.equal(pptDownload.name, '品牌升级提案.pptx');
const pptBytes = await readFile(new URL(`../public${pptDownload.url}`, import.meta.url));
assert.ok(pptBytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])));
assert.equal(pptDownload.bytes, pptBytes.length);

const risk = tableRows('skill:risk')[0];
assert.deepEqual(risk.actions, ['handle', 'ignore', 'delegate']);
assert.ok(tableRows('mcp:github').some(row => row.actions.includes('review')));
assert.equal(tableActionStatus('review'), '已请求评审');
assert.deepEqual(tableRows('mcp:other'), []);

console.log('workspace widget checks passed');
