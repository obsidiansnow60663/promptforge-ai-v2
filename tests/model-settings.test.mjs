import test from 'node:test';
import assert from 'node:assert/strict';
import { agentModel } from '../server/providers.mjs';
import { selectedTarget, targets } from '../web/execution.js';
import { arxReply, existing, runtime } from './runtime.mjs';

const env = { ARXPAY_API_KEY: 'fixture-arxpay' };
const model = 'family/model-v2';
const endpoint = 'https://arxpay.my.id/v1/';

test('owner can fetch, verify, use and remove a model from the ArxPay catalog', async t => {
  const { call } = runtime(t, env);
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fixture-arxpay');
    assert.equal(options.redirect, 'manual');
    requests.push(String(url));
    if (url === endpoint + 'models') {
      return Response.json({ data: [{ id: model, extra: 'private-fixture' }, { id: model }, { id: '../invalid' }, { id: agentModel }] });
    }
    assert.equal(url, endpoint + 'chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.model, model);
    if (body.messages[1].content === 'Verify JSON support.') {
      assert.deepEqual(body.response_format, { type: 'json_object' });
      return arxReply('{"ready":true}');
    }
    return Response.json({ error: { code: 'key_daily_cap' } }, { status: 429 });
  });

  assert.equal((await call('arxpay-models', undefined, '')).status, 401);
  assert.equal((await call('arxpay-model', { model, enabled: true }, 'pemilik', { Origin: 'https://elsewhere.test' })).status, 403);
  assert.deepEqual(await (await call('arxpay-models')).json(), { models: [agentModel, model] });
  assert.equal((await call('arxpay-model', { model: 'absent', enabled: true })).status, 400);
  assert.deepEqual(await (await call('arxpay-model', { model, enabled: true })).json(), { model, enabled: true });
  assert.equal(requests.length, 4);
  assert.equal((await call('arxpay-model', { model, enabled: true })).status, 200);
  assert.equal(requests.length, 4);

  const status = await (await call('status')).json();
  assert.deepEqual(status.enabledArxPayModels, [model]);
  assert.deepEqual(status.providers[0].models, [agentModel, model]);
  assert.equal(status.defaultTarget.model, agentModel);
  assert.deepEqual((await (await call('status', undefined, 'pengunjung')).json()).enabledArxPayModels, []);
  assert.match(targets(status, String), /arxpay\/family%2Fmodel-v2/);
  assert.deepEqual(selectedTarget({ value: 'arxpay/family%2Fmodel-v2' }), { provider: 'arxpay', model });
  assert.equal((await call('model-name', { model, name: 'Keluarga Model' })).status, 200);

  const saved = existing();
  await call('existing', saved);
  const result = await (await call('execute', { session: saved.session, version: 1, requestId: crypto.randomUUID(),
    target: { provider: 'arxpay', model }, confirm: true })).json();
  assert.equal(result.error.code, 'provider_quota');
  assert.equal(result.target.model, model);

  assert.deepEqual(await (await call('arxpay-model', { model, enabled: false })).json(), { model, enabled: false });
  assert.deepEqual((await (await call('status')).json()).providers[0].models, [agentModel]);
});

test('quota and redirects cannot enable a model or forward credentials', async t => {
  const { call } = runtime(t, env);
  let redirect = false;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url === endpoint + 'models') return redirect ?
      new Response(null, { status: 302, headers: { Location: 'https://outside.test' } }) :
      Response.json({ data: [{ id: model }] });
    assert.equal(url, endpoint + 'chat/completions');
    return Response.json({ error: { code: 'key_daily_cap' } }, { status: 429 });
  });
  const blocked = await call('arxpay-model', { model, enabled: true });
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).code, 'provider_quota');
  assert.deepEqual((await (await call('status')).json()).enabledArxPayModels, []);
  redirect = true;
  const shifted = await call('arxpay-models');
  assert.equal(shifted.status, 502);
  assert.equal((await shifted.json()).code, 'provider_redirect');
});

test('catalog access, invalid credentials and selected model access have distinct errors', async t => {
  const { call } = runtime(t, env);
  let catalogDenied = true;
  let invalidKey = false;
  const mock = t.mock.method(globalThis, 'fetch', async url => {
    if (url === endpoint + 'models') return catalogDenied ? Response.json({}, { status: 403 }) :
      Response.json({ data: [{ id: model }] });
    assert.equal(url, endpoint + 'chat/completions');
    return Response.json({
      error: { code: invalidKey ? 'invalid_api_key' : 'permission_denied', message: 'upstream detail' },
    }, { status: 403 });
  });
  const denied = await (await call('arxpay-models')).json();
  assert.equal(denied.code, 'provider_catalog_access');
  assert.match(denied.error, /katalog model/);

  catalogDenied = false;
  const activation = { model, enabled: true };
  const forbidden = await (await call('arxpay-model', activation)).json();
  assert.equal(forbidden.code, 'provider_model_access');
  assert.ok(forbidden.error.includes(model));
  assert.doesNotMatch(forbidden.error, /upstream detail|ARXPAY_API_KEY/);
  assert.equal(mock.mock.callCount(), 3);

  invalidKey = true;
  const credentials = await (await call('arxpay-model', activation)).json();
  assert.equal(credentials.code, 'provider_credentials');
  assert.doesNotMatch(credentials.error, /upstream detail/);
  assert.deepEqual((await (await call('status')).json()).enabledArxPayModels, []);
  assert.equal(mock.mock.callCount(), 5);
});
