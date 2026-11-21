import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptOutput, criticalLiterals, outputDimensions } from '../server/output.mjs';

const example = {
  raw: { text: 'Maya uses API `fetchUser` on 21/11/2026. Rate: 15%. Read https://example.org/data. [1]' },
  approved: { draft: 'Summarize the API usage in Indonesian.', lang: 'Bahasa Indonesia', spec: { constraints: [] } },
};
const answer = 'Maya menggunakan API `fetchUser` pada 21/11/2026. Tarifnya 15%. Rujukan: https://example.org/data. [1]';
const review = { critical: false, issues: [], dimensions: Object.fromEntries(outputDimensions.map(key => [key, true])) };
function fixture(...steps) {
  return async (_env, _target, call) => {
    assert.ok(call.system);
    const step = steps.shift();
    if (step instanceof Error) throw step;
    return { text: JSON.stringify(step), model: 'fixture' };
  };
}

test('adaptation and independent review preserve numerals, references and technical terms', async () => {
  const result = await adaptOutput({}, {}, example, fixture({ answer, warnings: [] }, review));
  assert.equal(result.status, 'validated');
  assert.equal(result.text, answer);
  assert.equal(result.dimensions.naturalness, true);
  assert.equal(result.review.model, 'fixture');
});

test('missing values override a positive semantic review', async () => {
  assert.deepEqual(criticalLiterals(example.raw.text, answer.replace('15%', '25%')), ['15%']);
  const result = await adaptOutput({}, {}, example, fixture({ answer: answer.replace('Maya', 'Naya').replace('15%', '25%'), warnings: [] }, review));
  assert.equal(result.status, 'warning');
  assert.equal(result.critical, true);
  assert.match(result.warnings[0], /15%/);
});

test('a mixed-script fragment in Indonesian prose raises a warning and preserves valid names, quotes and code', async () => {
  const budget = {
    raw: { text: 'Sisihkan Rp30.000 sebagai缓冲.' },
    approved: { draft: 'Make an Indonesian budget table.', lang: 'Bahasa Indonesia', spec: { constraints: [] } },
  };
  const result = await adaptOutput({}, {}, budget, fixture({ answer: budget.raw.text, warnings: [] }, review));
  assert.equal(result.status, 'warning');
  assert.equal(result.critical, false);
  assert.match(result.warnings[0], /缓冲/);

  const quote = { ...budget, approved: { ...budget.approved, draft: 'Include the quotation “缓冲”.' } };
  const quoted = await adaptOutput({}, {}, quote, fixture({ answer: 'Sisihkan Rp30.000 sebagai “缓冲”.', warnings: [] }, review));
  assert.equal(quoted.status, 'validated');
  const code = await adaptOutput({}, {}, budget, fixture({ answer: 'Rp30.000. Contoh kode: `缓冲`.', warnings: [] }, review));
  assert.equal(code.status, 'validated');
  const city = { raw: { text: 'Tokyo (東京) is in Japan.' }, approved: { ...budget.approved, draft: 'Describe Japanese cities with local names.' } };
  const named = await adaptOutput({}, {}, city, fixture({ answer: 'Tokyo (東京) berada di Jepang.', warnings: [] }, review));
  assert.equal(named.status, 'validated');
});

test('review findings flag a proper name change and incomplete audit cannot validate an answer', async () => {
  const changed = answer.replace('Maya', 'Naya');
  const result = await adaptOutput({}, {}, example, fixture({ answer: changed, warnings: [] }, {
    ...review, critical: true, issues: ['Nama Maya berubah menjadi Naya.'],
  }));
  assert.equal(result.status, 'warning');
  assert.equal(result.critical, true);
  const invalid = await adaptOutput({}, {}, example, fixture({ answer, warnings: [] }, {}));
  assert.equal(invalid.status, 'unverified');
});

test('adapter failure exposes the raw result separately from any adapted answer', async () => {
  const result = await adaptOutput({}, {}, example, fixture(new Error('fixture network error')));
  assert.equal(result.status, 'unavailable');
  assert.equal(result.text, undefined);
  assert.equal((await adaptOutput({}, {}, example, fixture({ answer: '<script>', warnings: null }))).status, 'unavailable');
});

test('an incomplete review schema gets one correction without changing the adapted answer', async () => {
  const result = await adaptOutput({}, {}, example, fixture({ answer, warnings: [] }, {}, review));
  assert.equal(result.status, 'validated');
  assert.equal(result.text, answer);
});
