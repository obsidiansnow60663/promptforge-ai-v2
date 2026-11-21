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
