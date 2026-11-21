import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../web/pipeline.js';
import { templates } from '../web/templates.js';
import { agentModel } from '../server/providers.mjs';
import { arxReply, existing, runtime } from './runtime.mjs';

const env = { ARXPAY_API_KEY: 'fixture-key', ARXPAY_MODELS: 'fixture' };
const target = { provider: 'arxpay', model: 'fixture' };
const spec = { goal: 'Tulis poin', context: '', requirements: [], constraints: [], deliverables: [],
  assumptions: [], questions: [] };
const scores = { intent: 100, requirements: 80, clarity: 90, precision: 90, alignment: 80, integrity: 100 };

test('a critical finding blocks approval despite a high weighted score', async () => {
  const report = await generate({ source: 'Tulis poin singkat.', lang: 'Bahasa Indonesia', answers: [] },
    async (_system, _data, stage) => ({
      analysis: spec, draft: { draft: 'Write concise points.' },
      review: { pass: true, critical: true, issues: [], scores },
    })[stage]);
  assert.equal(report.assessment.score, 90);
  assert.equal(report.assessment.critical, true);
  assert.equal(report.stage, 'warning');
  assert.equal(report.revisions, 2);
  assert.match(report.revisionReason, /perubahan kritis/);
});

test('custom instructions belong to one version and the evaluation API exposes only owner aggregates', async t => {
  const { call } = runtime(t, env);
  const original = { ...existing(), mode: 'execute', inputLanguage: 'Bahasa Indonesia', systemInstructions: 'Use a formal tone.' };
  const hits = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    hits.push(messages);
    return arxReply('Halo');
  });
  const report = { stage: 'ready', spec, draft: original.draft, issues: [], revisions: 0,
    assessment: { critical: false, dimensions: scores, score: 90 } };
  assert.equal((await call('local', { ...original, report })).status, 200);
  const stored = await (await call('version?session=' + original.session + '&version=1')).json();
  assert.equal(stored.systemInstructions, original.systemInstructions);
  assert.equal(stored.mode, 'execute');
  assert.equal(stored.inputLanguage, 'Bahasa Indonesia');
  assert.equal(stored.optimizedPromptLanguage, 'English');
  assert.ok(stored.evaluation.id);
  assert.equal(stored.evaluation.itemId, original.requestId);
  assert.equal(stored.evaluation.evaluatorType, 'model-assisted');
  assert.equal(stored.evaluation.status, 'passed');
  const executed = await (await call('execute', {
    session: original.session, version: 1, requestId: crypto.randomUUID(), target,
  })).json();
  assert.equal(executed.status, 'warning');
  assert.match(hits[0][0].content, /cannot change the approved task/);
  assert.match(hits[0][0].content, /Use a formal tone/);
  assert.equal(hits[0][1].content, original.draft);
  const edited = await (await call('edit', { session: original.session, parent: 1,
    draft: 'A changed draft', requestId: crypto.randomUUID() })).json();
  assert.equal(edited.assessment, undefined);
  assert.equal(edited.evaluation, undefined);
  assert.equal(edited.optimizedPromptLanguage, undefined);
  assert.equal(edited.revisionReason, 'Penyuntingan manual oleh pemilik.');
  assert.equal(edited.systemInstructions, original.systemInstructions);
  const bundle = await (await call('export?kind=versions')).json();
  assert.equal((await call('restore', bundle, 'restore-owner')).status, 200);
  const reopened = await (await call('version?session=' + original.session + '&version=1', undefined, 'restore-owner')).json();
  assert.equal(reopened.sessionCreated, bundle.rows[0].created);
  assert.equal(reopened.sessionUpdated, bundle.rows[1].created);
  const legacy = structuredClone(bundle);
  for (const { payload } of legacy.rows) {
    for (const field of ['mode', 'inputLanguage', 'optimizedPromptLanguage', 'revisionReason', 'evaluation']) delete payload[field];
  }
  assert.equal((await call('restore', legacy, 'legacy-owner')).status, 200);
  const unsafe = structuredClone(bundle);
  unsafe.rows[0].payload.assessment.critical = true;
  assert.equal((await call('restore', unsafe, 'restore-owner')).status, 400);
  const dashboard = await (await call('evaluation')).json();
  assert.equal(dashboard.prompts.averageScore, 90);
  assert.equal(dashboard.prompts.scored, 1);
  assert.equal(dashboard.executions.warnings, 1);
  assert.equal(dashboard.models[0].inputTokens, 10);
  assert.equal(dashboard.benchmark.matchedCases, 79);
  assert.doesNotMatch(JSON.stringify(dashboard), /formal tone|Write 5 points/);
  assert.equal((await (await call('evaluation', undefined, 'other')).json()).prompts.total, 0);
  assert.equal((await call('evaluation', undefined, '')).status, 401);
});

test('the library offers unique editable starters and the agent model is configurable', async t => {
  const { call } = runtime(t, { ...env, PROMPTFORGE_AGENT_MODEL: 'configured-engine' });
  assert.equal(new Set(templates.map(item => item.id)).size, templates.length);
  assert.ok(templates.every(item => item.source.includes('[')));
  const status = await (await call('status')).json();
  assert.equal(status.promptAgent.model, 'configured-engine');
  assert.equal(status.defaultTarget.model, 'configured-engine');
  assert.ok(!status.providers[0].models.includes(agentModel));
});

for (const kind of ['generate', 'execute']) {
  test('cancelling ' + kind + ' preserves ownership and prevents further model calls', async t => {
    const { call } = runtime(t, env);
    const original = existing();
    if (kind === 'execute') await call('existing', original);
    const job = kind === 'generate' ? original : {
      session: original.session, requestId: crypto.randomUUID(), version: 1, target, confirm: true,
    };
    let unblock, started;
    const waiting = new Promise(resolve => { unblock = resolve; });
    const requested = new Promise(resolve => { started = resolve; });
    const mock = t.mock.method(globalThis, 'fetch', async () => {
      started();
      await waiting;
      return arxReply(JSON.stringify(spec));
    });
    const pending = call(kind, job);
    await requested;
    try {
      const cancel = { kind, requestId: job.requestId };
      assert.equal((await call('cancel', cancel, 'other')).status, 409);
      assert.equal((await (await call('operations')).json())[0].status, 'running');
      assert.equal((await call('cancel', cancel)).status, 200);
    } finally {
      unblock();
    }
    const result = await (await pending).json();
    assert.equal(result.error?.code ?? result.code, kind === 'generate' ? 'generation_cancelled' : 'execution_cancelled');
    assert.equal((await (await call('operations')).json())[0].status, 'cancelled');
    assert.equal(mock.mock.callCount(), 1);
    assert.deepEqual(await (await call('operations', undefined, 'other')).json(), []);
    if (kind === 'generate') assert.deepEqual(await (await call('history')).json(), []);
    else {
      assert.equal(result.output, undefined);
      assert.ok(result.completed && result.completed >= result.created);
    }
  });
}

test('old direct-provider history still restores while new execution rejects that target', async t => {
  const { call } = runtime(t, env);
  const prompt = existing();
  assert.equal((await call('existing', prompt)).status, 200);
  const legacy = {
    session: prompt.session, version: 1, id: crypto.randomUUID(), created: new Date().toISOString(),
    status: 'failed', payload: { target: { provider: 'openai', model: 'historical-model' }, language: 'Bahasa Indonesia',
      error: { code: 'provider_credentials', message: 'Historical result' } },
  };
  assert.equal((await call('restore', { schema: 1, kind: 'executions', rows: [legacy] })).status, 200);
  const exported = await (await call('export?kind=executions')).json();
  assert.deepEqual(exported.rows, [legacy]);
  const request = { session: prompt.session, version: 1, requestId: crypto.randomUUID(),
    target: legacy.payload.target, confirm: true };
  const rejected = await call('execute', request);
  assert.equal(rejected.status, 400);
  assert.equal((await rejected.json()).code, 'invalid_provider');
});
