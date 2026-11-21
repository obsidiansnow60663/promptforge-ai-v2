import benchmark from '../benchmark/evidence-dod-v12.json' with { type: 'json' };

const benchmarkRuns = ['direct-id', 'literal-en', 'promptforge'].map(id => {
  const row = benchmark.liveSummary[id];
  return { id, cases: row.cases, answered: row.answered, markerFound: row.markerFound,
    preserving: row.promptsPreservingAllCheckedTokens, checkable: row.promptsWithCheckableTokens };
});

export async function readEvaluation(db, owner) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [prompts, executions, models] = await Promise.all([
    db.prepare(`SELECT count(*) AS total,
      count(CASE WHEN json_extract(payload,'$.stage')='ready' THEN 1 END) AS ready,
      count(CASE WHEN json_extract(payload,'$.stage')='warning' THEN 1 END) AS warnings,
      count(CASE WHEN json_extract(payload,'$.stage')='edited' THEN 1 END) AS edited,
      count(CASE WHEN json_extract(payload,'$.assessment.critical')=1 THEN 1 END) AS critical,
      count(CASE WHEN json_extract(payload,'$.stage')='ready' THEN json_extract(payload,'$.assessment.score') END) AS scored,
      avg(CASE WHEN json_extract(payload,'$.stage')='ready' THEN json_extract(payload,'$.assessment.score') END) AS averageScore
      FROM versions WHERE owner=? AND created>=?`).bind(owner, since).first(),
    db.prepare(`SELECT count(*) AS total,
      count(CASE WHEN status='complete' THEN 1 END) AS validated,
      count(CASE WHEN status='warning' THEN 1 END) AS warnings,
      count(CASE WHEN status='failed' AND coalesce(json_extract(payload,'$.error.code'),'')<>'execution_cancelled' THEN 1 END) AS failed,
      count(CASE WHEN json_extract(payload,'$.error.code')='execution_cancelled' THEN 1 END) AS cancelled,
      count(CASE WHEN status='running' THEN 1 END) AS running,
      count(CASE WHEN json_extract(payload,'$.feedback.useful')=1 THEN 1 END) AS helpful,
      count(json_extract(payload,'$.feedback.useful')) AS feedback
      FROM executions WHERE owner=? AND created>=?`).bind(owner, since).first(),
    db.prepare(`SELECT json_extract(payload,'$.target.provider') AS provider,
      coalesce(json_extract(payload,'$.raw.model'),json_extract(payload,'$.target.model')) AS model,
      count(*) AS runs, avg(json_extract(payload,'$.raw.latencyMs')) AS latencyMs,
      sum(json_extract(payload,'$.raw.usage.input')) AS inputTokens,
      sum(json_extract(payload,'$.raw.usage.output')) AS outputTokens
      FROM executions WHERE owner=? AND created>=? AND json_extract(payload,'$.raw.text') IS NOT NULL
      GROUP BY provider,model ORDER BY runs DESC,provider,model LIMIT 20`).bind(owner, since).all(),
  ]);
  return { days: 30, prompts, executions, models: models.results,
    benchmark: { dataset: benchmark.datasetVersion, matchedCases: benchmark.matchedCases.length, runs: benchmarkRuns } };
}
