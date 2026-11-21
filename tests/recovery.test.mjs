import test from 'node:test';
import assert from 'node:assert/strict';
import { existing, arxReply, runtime } from './runtime.mjs';
import { outputDimensions } from '../server/output.mjs';

const env = { ARXPAY_API_KEY: 'fixture-arxpay', ARXPAY_MODELS: 'fixture' };

const page = async (call, kind, owner, cursor = 0) =>
  (await call('export?kind=' + kind + '&cursor=' + cursor, undefined, owner)).json();

test('restores version links and real record shape with provider fixtures under a new owner', async t => {
  const { call } = runtime(t, env);
  const original = { ...existing(), subdomain: 'Version control' };
  await call('existing', original);
  await call('edit', { session: original.session, parent: 1, draft: 'Write a concise list of 5 points.',
    revisionReason: 'Perjelas format daftar.', requestId: crypto.randomUUID() });
  let attempts = 0;
  const mock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const call = JSON.parse(options.body);
    if (call.messages[0].content.startsWith('You adapt')) return arxReply(JSON.stringify({ answer: 'Rangkum.', warnings: [] }));
    if (call.messages[0].content.startsWith('Independently')) return arxReply(JSON.stringify({
      critical: false, issues: [], dimensions: Object.fromEntries(outputDimensions.map(key => [key, true])),
    }));
    if (++attempts < 3) return Response.json({}, { status: 503 });
    return arxReply('Rangkum.');
  });
  const run = await (await call('execute', {
    session: original.session, version: 2, requestId: crypto.randomUUID(), confirm: true,
    target: { provider: 'arxpay', model: 'fixture' },
  })).json();
  await call('feedback', { session: original.session, version: 2, executionId: run.id, useful: true, comment: 'Ringkas.' });
  const versions = await page(call, 'versions');
  const executions = await page(call, 'executions');
  assert.equal(versions.rows[1].payload.parent, 1);
  assert.equal(versions.rows[1].payload.subdomain, 'Version control');
  assert.equal(versions.rows[1].payload.revisionReason, 'Perjelas format daftar.');
  assert.equal(executions.rows[0].payload.raw.attempts, 3);
  assert.ok(run.created <= run.output.evaluation.created && run.output.evaluation.created <= run.completed);
  assert.equal(run.output.evaluation.itemId, run.id);
  assert.equal(run.output.evaluation.type, 'output');
  assert.equal(run.output.evaluation.evaluatorType, 'model-assisted');
  assert.equal(run.output.evaluation.status, 'passed');
  assert.equal(executions.rows[0].payload.feedback.comment, 'Ringkas.');
  assert.equal(executions.rows[0].payload.feedback.evaluation.type, 'usefulness');
  assert.equal(executions.rows[0].payload.feedback.evaluation.evaluatorType, 'human');
  assert.equal(executions.rows[0].payload.completed, run.completed);
  assert.equal(await (await call('export?kind=versions', undefined, '')).status, 401);
  assert.deepEqual((await page(call, 'versions', 'recipient')).rows, []);
  assert.equal((await call('restore', executions, 'recipient')).status, 409);
  assert.equal((await call('restore', versions, 'recipient')).status, 200);
  assert.equal((await call('restore', executions, 'recipient')).status, 200);
  assert.equal((await call('restore', versions, 'recipient')).status, 200);
  assert.equal((await call('restore', executions, 'recipient')).status, 200);
  assert.deepEqual((await page(call, 'versions', 'recipient')).rows, versions.rows);
  assert.deepEqual((await page(call, 'executions', 'recipient')).rows, executions.rows);
  assert.equal(mock.mock.callCount(), 5);
  await call('delete', { session: original.session });
  assert.deepEqual((await page(call, 'executions')).rows, []);
  assert.equal((await page(call, 'executions', 'recipient')).rows.length, 1);
});

test('failed recovery batch preserves existing records and rolls back preceding writes', async t => {
  const { call } = runtime(t);
  const original = existing();
  await call('existing', original);
  const backup = await page(call, 'versions');
  const saved = backup.rows[0];
  backup.rows = [
    { ...saved, session: crypto.randomUUID(), id: crypto.randomUUID() },
    { ...saved, payload: { ...saved.payload, draft: 'Conflicting text' } },
  ];
  assert.equal((await call('restore', backup)).status, 409);
  assert.deepEqual((await page(call, 'versions')).rows, [saved]);
});

test('export pages stay owner-scoped and cover more versions than a single page', async t => {
  const { call } = runtime(t);
  const ids = Array.from({ length: 12 }, () => existing());
  for (const prompt of ids) await call('existing', prompt);
  await call('existing', existing(), 'recipient');
  const first = await page(call, 'versions');
  const second = await page(call, 'versions', undefined, first.next);
  assert.deepEqual([...first.rows, ...second.rows].map(row => row.session), ids.map(row => row.session));
  assert.equal(second.next, null);
});

test('requests require owner identity, same origin and JSON with capped body size', async t => {
  const { call } = runtime(t);
  assert.equal((await call('existing', existing(), '')).status, 401);
  assert.equal((await call('existing', existing(), 'owner', { Origin: 'https://outside.test' })).status, 403);
  assert.equal((await call('existing', existing(), 'owner', { 'Content-Type': 'application/jsonx' })).status, 403);
  assert.equal((await call('existing', { padding: 'X'.repeat(256 * 1024) })).status, 413);
  assert.equal((await call('restore', { schema: 2, kind: 'versions', rows: [] })).status, 400);
});

test('deleted history still counts against the bounded execution window', async t => {
  const { call } = runtime(t, env);
  t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 401 }));
  const run = session => call('execute', { session, version: 1, requestId: crypto.randomUUID(), confirm: true,
    target: { provider: 'arxpay', model: 'fixture' } });
  for (let i = 0; i < 12; ++i) {
    const prompt = existing();
    await call('existing', prompt);
    assert.equal((await (await run(prompt.session)).json()).status, 'failed');
    await call('delete', { session: prompt.session });
  }
  const prompt = existing();
  await call('existing', prompt);
  assert.equal((await run(prompt.session)).status, 429);
});
