import test from 'node:test';
import assert from 'node:assert/strict';
import { runtime } from './runtime.mjs';

test('upgrades a pre-progress database without losing saved versions or executions', async t => {
  const owner = 'pemilik-lama';
  const session = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const executionId = crypto.randomUUID();
  const created = new Date(Date.now() - 86400000).toISOString();
  const version = {
    source: 'Buat ringkasan Git.', domain: 'Umum', lang: 'Bahasa Indonesia', answers: [],
    spec: { goal: 'Ringkas Git', context: '', requirements: [], constraints: [], deliverables: [], assumptions: [], questions: [] },
    draft: 'Summarize Git.', stage: 'ready', issues: [], revisions: 0, model: 'Model historis',
  };
  const execution = {
    target: { provider: 'openai', model: 'historical' }, language: 'Bahasa Indonesia',
    error: { code: 'provider_timeout', message: 'Waktu tunggu habis.' },
  };
  const { call } = runtime(t, { ARXPAY_API_KEY: 'fixture' }, {
    beforeMigration: {
      name: '0005_generation_progress.sql',
      seed(sqlite) {
        sqlite.prepare('INSERT INTO versions(owner,session,version,request_id,created,payload) VALUES (?,?,?,?,?,?)')
          .run(owner, session, 1, versionId, created, JSON.stringify(version));
        sqlite.prepare('INSERT INTO executions(owner,session,version,request_id,created,status,payload) VALUES (?,?,?,?,?,?,?)')
          .run(owner, session, 1, executionId, created, 'failed', JSON.stringify(execution));
      },
    },
  });

  assert.equal((await call('status', undefined, owner)).status, 200);
  const history = await (await call('history', undefined, owner)).json();
  assert.equal(history[0].session, session);
  const versionPath = 'version?session=' + session + '&version=1';
  const executionsPath = 'executions?session=' + session + '&version=1';
  const savedVersion = await (await call(versionPath, undefined, owner)).json();
  const savedExecution = { ...execution, id: executionId, created, status: 'failed' };
  assert.equal(savedVersion.draft, version.draft);
  assert.deepEqual(await (await call(executionsPath, undefined, owner)).json(), [savedExecution]);
  assert.equal((await call(versionPath, undefined, 'pemilik-lain')).status, 404);
  assert.deepEqual(await (await call(executionsPath, undefined, 'pemilik-lain')).json(), []);
  const status = await (await call('status', undefined, owner)).json();
  const unconfirmed = await call('execute', { session, version: 1, requestId: crypto.randomUUID(), target: status.defaultTarget }, owner);
  assert.equal((await unconfirmed.json()).code, 'confirmation_required');
  const dashboard = await (await call('evaluation', undefined, owner)).json();
  assert.equal(dashboard.prompts.ready, 0);
  assert.equal(dashboard.prompts.warnings, 1);

  for (const kind of ['versions', 'executions']) {
    const backup = await (await call('export?kind=' + kind, undefined, owner)).json();
    assert.equal((await call('restore', backup, 'pemulihan')).status, 200);
  }
  assert.deepEqual(await (await call(versionPath, undefined, 'pemulihan')).json(), savedVersion);
  assert.deepEqual(await (await call(executionsPath, undefined, 'pemulihan')).json(), [savedExecution]);
});
