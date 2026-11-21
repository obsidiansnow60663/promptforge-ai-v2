import test from 'node:test';
import assert from 'node:assert/strict';
import { outputDimensions } from '../server/output.mjs';
import { agentModel, catalog, generateText } from '../server/providers.mjs';
import { existing, openaiReply, runtime } from './runtime.mjs';

const env = {
  ARXPAY_API_KEY: 'fixture-arxpay',
  OPENAI_API_KEY: 'fixture-openai', OPENAI_MODELS: 'fixture',
  ANTHROPIC_API_KEY: 'fixture-anthropic', ANTHROPIC_MODELS: 'fixture',
  GEMINI_API_KEY: 'fixture-gemini', GEMINI_MODELS: 'fixture',
};
const target = { provider: 'openai', model: 'fixture' };
const request = { prompt: 'Say hello', system: 'Use Indonesian' };
const contractFixtures = {
  openai: ['api.openai.com', 'Authorization', 'Bearer fixture-openai', () => openaiReply('Halo')],
  anthropic: ['api.anthropic.com', 'x-api-key', 'fixture-anthropic', () => Response.json({
    model: 'fixture-2026', stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 4 },
    content: [{ type: 'text', text: 'Halo' }],
  })],
  gemini: ['generativelanguage.googleapis.com', 'x-goog-api-key', 'fixture-gemini', () => Response.json({
    modelVersion: 'fixture-2026', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Halo' }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 },
  })],
};

for (const [provider, [host, header, credential, reply]] of Object.entries(contractFixtures)) {
  test(provider + ' normalizes an execution and scopes credentials to its fixed origin', async () => {
    const result = await generateText(env, { provider, model: 'fixture' }, request, {
      send: async (url, options) => {
        assert.equal(new URL(url).hostname, host);
        assert.equal(options.headers[header], credential);
        assert.equal(options.redirect, 'error');
        assert.ok(options.body.includes(request.prompt) && options.body.includes(request.system));
        assert.equal(new URL(url).search, '');
        return reply();
      },
    });
    assert.equal(result.text, 'Halo');
    assert.equal(result.provider, provider);
    assert.equal(result.model, 'fixture-2026');
    assert.deepEqual(result.usage, { input: 10, output: 4 });
    assert.equal(result.attempts, 1);
  });
}

test('status reports configuration without keys and rejects unlisted models', async () => {
  assert.ok(catalog(env).every(provider => provider.configured));
  assert.doesNotMatch(JSON.stringify(catalog(env)), /fixture-openai|fixture-gemini|fixture-arxpay/);
  await assert.rejects(generateText(env, { ...target, model: '../elsewhere' }, request), { code: 'invalid_model' });
  await assert.rejects(generateText({}, target, request), { code: 'provider_unconfigured' });
});

test('only explicit transient responses are retried, with a bounded delay', async () => {
  let calls = 0;
  const delays = [];
  await assert.rejects(generateText(env, target, request, {
    pause: async ms => delays.push(ms),
    send: async () => { calls++; return Response.json({}, { status: 503 }); },
  }), { code: 'provider_transient' });
  assert.equal(calls, 2);
  assert.deepEqual(delays, [250]);
  for (const [status, expected] of [[401, 'provider_credentials'], [429, 'provider_quota'], [400, 'provider_rejected']]) {
    calls = 0;
    await assert.rejects(generateText(env, target, request, {
      send: async () => { calls++; return Response.json({ error: { code: 'insufficient_quota', message: 'secret leakage' } }, { status }); },
    }), error => error.code === expected && !error.message.includes('secret leakage'));
    assert.equal(calls, 1);
  }
});

test('timeout and truncated output stay distinct from a successful response', async () => {
  await assert.rejects(generateText(env, target, request, {
    timeout: 10,
    send: (_url, { signal }) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(openaiReply('late')), 1000);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    }),
  }), { code: 'provider_timeout' });
  await assert.rejects(generateText(env, target, request, {
    send: async () => Response.json({ status: 'incomplete' }),
  }), { code: 'provider_incomplete' });
});

test('execution requires confirmation, persists by owner/version and reuses its id', async t => {
  const { call } = runtime(t, env);
  const prompt = existing();
  const execution = { session: prompt.session, version: 1, requestId: crypto.randomUUID(), target };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls++;
    if (calls === 1) {
      assert.equal(JSON.parse(options.body).input, prompt.draft);
      return openaiReply('Halo');
    }
    if (calls === 2) return openaiReply(JSON.stringify({ answer: 'Halo', warnings: [] }));
    return openaiReply(JSON.stringify({
      critical: false, issues: [], dimensions: Object.fromEntries(outputDimensions.map(key => [key, true])),
    }));
  });
  assert.equal((await call('existing', prompt)).status, 200);
  assert.equal((await call('execute', execution)).status, 409);
  assert.equal((await call('execute', { ...execution, confirm: true }, 'pengunjung')).status, 404);
  const result = await (await call('execute', { ...execution, confirm: true })).json();
  assert.equal(result.status, 'complete');
  assert.equal(result.raw.text, 'Halo');
  assert.deepEqual(await (await call('execute', { ...execution, confirm: true })).json(), result);
  assert.equal(calls, 3);
  assert.equal(result.output.status, 'validated');
  const path = 'executions?session=' + prompt.session + '&version=1';
  assert.equal((await (await call(path)).json()).length, 1);
  assert.deepEqual(await (await call(path, undefined, 'pengunjung')).json(), []);
  await call('delete', { session: prompt.session });
  assert.deepEqual(await (await call(path)).json(), []);
});

test('comparison can use one assessment target and owner-only feedback updates the saved result', async t => {
  const { call } = runtime(t, env);
  const prompt = existing();
  const execution = { session: prompt.session, version: 1, requestId: crypto.randomUUID(), target, confirm: true,
    assessmentTarget: { provider: 'anthropic', model: 'fixture' } };
  const origins = [];
  t.mock.method(globalThis, 'fetch', async url => {
    origins.push(new URL(url).hostname);
    if (origins.length === 1) return openaiReply('Halo');
    const text = origins.length === 2 ? JSON.stringify({ answer: 'Halo', warnings: [] }) : JSON.stringify({
      critical: false, issues: [], dimensions: Object.fromEntries(outputDimensions.map(key => [key, true])),
    });
    return Response.json({ content: [{ type: 'text', text }], stop_reason: 'end_turn' });
  });
  await call('existing', prompt);
  const result = await (await call('execute', execution)).json();
  assert.equal(result.status, 'complete');
  assert.deepEqual(origins, ['api.openai.com', 'api.anthropic.com', 'api.anthropic.com']);
  const feedback = { session: prompt.session, version: 1, executionId: result.id, useful: false, comment: 'Perlu contoh.' };
  assert.equal((await call('feedback', feedback, 'visitor')).status, 404);
  assert.equal((await call('feedback', feedback)).status, 200);
  const [record] = await (await call('executions?session=' + prompt.session + '&version=1')).json();
  assert.deepEqual(record.feedback, { useful: false, comment: 'Perlu contoh.' });
});


test('ArxPay disables thinking only when the caller requests it for the configured agent model', async () => {
  const requests = [];
  const send = async (url, options) => {
    assert.equal(new URL(url).hostname, 'arxpay.my.id');
    requests.push(JSON.parse(options.body));
    return Response.json({ model: 'actual', choices: [{ finish_reason: 'stop', message: { content: 'A complete response.' } }] });
  };
  const arxpay = { provider: 'arxpay', model: agentModel };
  await generateText(env, arxpay, request, { send });
  await generateText(env, arxpay, { ...request, thinking: false }, { send });
  await generateText({ ...env, ARXPAY_MODELS: 'alternate' }, { ...arxpay, model: 'alternate' },
    { ...request, thinking: false }, { send });
  assert.equal(requests[0].thinking, undefined);
  assert.deepEqual(requests[1].thinking, { type: 'disabled' });
  assert.equal(requests[2].thinking, undefined);
});
