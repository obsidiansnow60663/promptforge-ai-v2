import { Problem } from './providers.mjs';
import { invalid, str, uuid, validVersion, validateInput, validateReport } from './validation.mjs';
import { outputDimensions } from './output.mjs';

const tables = { versions: 'versions', executions: 'executions' };
const pageSize = 10;

export async function exportPage(db, owner, params) {
  const kind = params.get('kind'), session = params.get('session') || null;
  const cursor = Number(params.get('cursor') ?? 0);
  if (!Object.hasOwn(tables, kind) || !Number.isSafeInteger(cursor) || cursor < 0 || (session !== null && !uuid(session))) invalid();
  const table = tables[kind];
  const executionColumns = kind === 'executions' ? ',status' : '';
  const conditions = kind === 'executions' ? " AND status<>'running'" : '';
  const rows = await db.prepare(
    `SELECT rowid AS cursor,session,version,request_id AS id,created,payload${executionColumns}
     FROM ${table} WHERE owner=? AND rowid>? AND (? IS NULL OR session=?)${conditions} ORDER BY rowid LIMIT ?`,
  ).bind(owner, cursor, session, session, pageSize + 1).all();
  return {
    schema: 1, kind,
    rows: rows.results.slice(0, pageSize).map(({ cursor: _cursor, payload, ...row }) => ({ ...row, payload: JSON.parse(payload) })),
    next: rows.results.length > pageSize ? rows.results[pageSize - 1].cursor : null,
  };
}

function onlyKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).every(key => keys.includes(key));
}

function validTarget(target) {
  return onlyKeys(target, ['provider', 'model']) && ['openai', 'anthropic', 'gemini'].includes(target.provider) && str(target.model, 120);
}

function validTrace(trace) {
  const count = value => value === null || (Number.isSafeInteger(value) && value >= 0);
  return onlyKeys(trace, ['text', 'provider', 'requestedModel', 'model', 'finish', 'latencyMs', 'attempts', 'usage']) &&
    onlyKeys(trace.usage, ['input', 'output']) && validTarget({ provider: trace.provider, model: trace.requestedModel }) &&
    (trace.model === null || str(trace.model, 160)) && str(trace.finish, 100) &&
    Number.isSafeInteger(trace.latencyMs) && trace.latencyMs >= 0 &&
    [1, 2].includes(trace.attempts) && count(trace.usage?.input) && count(trace.usage?.output);
}

function validOutput(output) {
  return onlyKeys(output, ['status', 'warnings', 'text', 'critical', 'dimensions', 'adaptation', 'review']) &&
    ['validated', 'warning', 'unavailable', 'unverified'].includes(output.status) &&
    Array.isArray(output.warnings) && output.warnings.length <= 32 && output.warnings.every(item => str(item, 1000)) &&
    (output.text === undefined || str(output.text, 30000)) &&
    (output.critical === undefined || typeof output.critical === 'boolean') &&
    (output.dimensions === undefined || (onlyKeys(output.dimensions, outputDimensions) && outputDimensions.every(key => typeof output.dimensions[key] === 'boolean'))) &&
    (output.adaptation === undefined || validTrace(output.adaptation)) &&
    (output.review === undefined || validTrace(output.review)) &&
    (output.status !== 'validated' || (output.text && !output.warnings.length && output.critical === false &&
      outputDimensions.every(key => output.dimensions?.[key] === true)));
}

function validateExecution(row) {
  const data = row.payload;
  if (!onlyKeys(data, ['target', 'assessmentTarget', 'language', 'raw', 'output', 'error', 'feedback']) ||
    !['complete', 'warning', 'failed'].includes(row.status) ||
    !validTarget(data.target) || (data.assessmentTarget !== undefined && !validTarget(data.assessmentTarget)) ||
    !['Bahasa Indonesia', 'English'].includes(data.language) ||
    (data.raw !== undefined && (!validTrace(data.raw) || !str(data.raw.text, 30000))) ||
    (data.output !== undefined && !validOutput(data.output)) ||
    (data.error !== undefined && (!onlyKeys(data.error, ['code', 'message']) || !str(data.error.code, 100) || !str(data.error.message, 500))) ||
    (data.feedback !== undefined && (!onlyKeys(data.feedback, ['useful', 'comment']) || typeof data.feedback.useful !== 'boolean' ||
      typeof data.feedback.comment !== 'string' || data.feedback.comment.length > 1000))) invalid();
  if ((row.status === 'complete' && (!data.raw || data.output?.status !== 'validated')) ||
    (row.status === 'warning' && (!data.raw || !data.output || data.output.status === 'validated')) ||
    (row.status === 'failed' && !data.error)) invalid();
}

function versionInsert(db, owner, row) {
  const { session, version, id, created, payload } = row;
  validateInput(payload);
  validateReport(payload, true);
  if (!onlyKeys(payload, ['source', 'domain', 'lang', 'answers', 'spec', 'draft', 'stage', 'issues', 'revisions', 'model', 'parent']) ||
    !onlyKeys(payload.spec, ['goal', 'context', 'requirements', 'constraints', 'deliverables', 'assumptions', 'questions']) ||
    !payload.answers.every(answer => onlyKeys(answer, ['question', 'answer']))) invalid();
  const parent = payload.parent ?? null;
  if (!str(payload.model, 160) || (parent !== null && (!validVersion(parent) || parent >= version))) invalid();
  return db.prepare(
    `INSERT INTO versions(owner,session,version,request_id,created,payload)
     VALUES (?,?,?,?,?,CASE WHEN ? IS NULL OR EXISTS
       (SELECT 1 FROM versions WHERE owner=? AND session=? AND version=?) THEN ? ELSE NULL END)
     ON CONFLICT(owner,session,version) DO UPDATE SET payload=CASE
       WHEN versions.request_id=excluded.request_id AND versions.created=excluded.created
         AND json(versions.payload)=json(excluded.payload) THEN versions.payload ELSE NULL END`,
  ).bind(owner, session, version, id, created, parent, owner, session, parent, JSON.stringify(payload));
}

function executionInsert(db, owner, row) {
  const { session, version, id, created, status, payload } = row;
  validateExecution(row);
  return db.prepare(
    `INSERT INTO executions(owner,session,version,request_id,created,status,payload) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(owner,request_id) DO UPDATE SET payload=CASE
       WHEN executions.session=excluded.session AND executions.version=excluded.version
         AND executions.created=excluded.created AND executions.status=excluded.status
         AND json(executions.payload)=json(excluded.payload) THEN executions.payload ELSE NULL END`,
  ).bind(owner, session, version, id, created, status, JSON.stringify(payload));
}

export async function restorePage(db, owner, input) {
  const { rows, schema, kind } = input;
  if (schema !== 1 || !Object.hasOwn(tables, kind) || !Array.isArray(rows) || !rows.length || rows.length > pageSize) invalid();
  for (const row of rows) {
    if (!row || !uuid(row.session) || !uuid(row.id) || !validVersion(row.version) || typeof row.created !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.created) ||
      !Number.isFinite(Date.parse(row.created)) ||
      !row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) invalid();
  }
  const insert = kind === 'versions' ? versionInsert : executionInsert;
  const statements = rows.map(row => insert(db, owner, row));
  try {
    await db.batch(statements);
  } catch (error) {
    if (/constraint/i.test(String(error))) {
      throw new Problem(409, 'Cadangan bentrok dengan data tersimpan atau versi induknya belum dipulihkan.', 'restore_conflict');
    }
    throw error;
  }
  return { accepted: rows.length };
}
