import test from 'node:test';
import assert from 'node:assert/strict';
import { cases } from '../benchmark/cases.mjs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

test('benchmark covers 100 unique cases and three equivalent fixture tracks without performance claims', async t => {
  const groups = { programming: 20, automation: 20, research: 15, business: 15, content: 15, general: 15 };
  assert.equal(new Set(cases.map(item => item.source)).size, 100);
  assert.equal(new Set(cases.map(item => item.id)).size, 100);
  for (const [category, count] of Object.entries(groups)) assert.equal(cases.filter(item => item.category === category).length, count);
  for (const item of cases) {
    assert.ok(item.intent && item.format && item.language && item.rubric.length && item.criticalFailures.length);
    assert.ok(item.constraints.every(constraint => item.source.includes(constraint)));
  }
  const dir = await mkdtemp(join(tmpdir(), 'promptforge-benchmark-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = join(dir, 'report.json');
  await promisify(execFile)(process.execPath, ['benchmark/run.mjs', '--out', output]);
  const report = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(report.rows.length, 300);
  assert.equal(report.method, 'synthetic fixture');
  assert.equal(report.datasetSha256.length, 64);
  for (const summary of Object.values(report.summary)) {
    assert.equal(summary.evaluated, 100);
    assert.equal(summary.requirementPreservation, null);
    assert.equal(summary.humanReviewed, 0);
  }
});
