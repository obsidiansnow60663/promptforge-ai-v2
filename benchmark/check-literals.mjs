import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { cases, datasetVersion } from './cases.mjs';
import { criticalTokens } from '../web/pipeline.js';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw Error('Gunakan: node benchmark/check-literals.mjs REPORT.json AUDIT.json');
const original = await readFile(inputPath);
const report = JSON.parse(original);
const hash = data => createHash('sha256').update(data).digest('hex');
if (report.method !== 'provider requests' || report.datasetVersion !== datasetVersion ||
    report.datasetSha256 !== hash(JSON.stringify(cases))) throw Error('Dataset atau metode laporan tidak cocok.');
const expected = new Map(cases.map(item => [item.id, item]));
const variants = ['direct-id', 'literal-en', 'promptforge'];
const seen = new Set();
const audit = report.rows.map(row => {
  const item = expected.get(row.caseId);
  const id = row.caseId + '/' + row.variant;
  if (!item || !variants.includes(row.variant) || seen.has(id)) throw Error('Kasus atau varian tidak sah: ' + id);
  seen.add(id);
  const exact = criticalTokens(item.source);
  const promptTokens = row.prompt ? new Set(criticalTokens(row.prompt)) : null;
  const missedPromptTokens = promptTokens ? exact.filter(token => !promptTokens.has(token)) : null;
  return {
    caseId: row.caseId, category: item.category, variant: row.variant, status: row.status, failure: row.failure,
    promptPresent: Boolean(row.prompt), answerPresent: Boolean(row.answer), exactTokenCount: exact.length, missedPromptTokens,
    outputMarker: row.answer ? row.answer.includes(item.marker) : null,
    latencyMs: row.execution?.latencyMs ?? null,
  };
});
const matchedCases = [...expected.keys()].filter(id => variants.every(variant =>
  audit.some(row => row.caseId === id && row.variant === variant && row.answerPresent)));
function summarize(rows) {
  const checkable = rows.filter(row => row.promptPresent && row.exactTokenCount > 0);
  return {
    cases: rows.length, answered: rows.filter(row => row.answerPresent).length,
    markerFound: rows.filter(row => row.outputMarker === true).length,
    markerAbsent: rows.filter(row => row.outputMarker === false).length,
    promptsWithCheckableTokens: checkable.length,
    promptsPreservingAllCheckedTokens: checkable.filter(row => row.missedPromptTokens.length === 0).length,
    missedTokens: checkable.flatMap(row => row.missedPromptTokens).length,
    failures: Object.fromEntries([...new Set(rows.map(row => row.failure).filter(Boolean))].map(failure =>
      [failure, rows.filter(row => row.failure === failure).length])),
  };
}
const summary = Object.fromEntries(variants.map(variant => [variant, summarize(audit.filter(row => row.variant === variant))]));
const matched = Object.fromEntries(variants.map(variant =>
  [variant, summarize(audit.filter(row => row.variant === variant && matchedCases.includes(row.caseId)))]));
const result = { method: 'deterministic exact text checks', datasetVersion, datasetSha256: report.datasetSha256,
  reportSha256: hash(original), workflowCommit: report.workflowCommit, matchedCases, summary, matched, rows: audit };
await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ cases: audit.length, matched: matchedCases.length, summary }));
