import { executionCancelled } from './operations.mjs';
import { adaptOutput } from './output.mjs';
import { generateText, Problem, requireTarget } from './providers.mjs';

function present(row) {
  return { ...JSON.parse(row.payload), id: row.request_id, created: row.created, status: row.status };
}

export async function listExecutions(db, owner, session, version) {
  const rows = await db.prepare(
    'SELECT request_id, created, status, payload FROM executions WHERE owner=? AND session=? AND version=? ORDER BY created DESC, request_id DESC LIMIT 30',
  ).bind(owner, session, version).all();
  return rows.results.map(present);
}

function executionLookup(db, owner, id) {
  return db.prepare('SELECT session, version, request_id, created, status, payload FROM executions WHERE owner=? AND request_id=?').bind(owner, id);
}

export async function execute(db, env, owner, input) {
  const { session, version, requestId, target } = input;
  const assessmentTarget = input.assessmentTarget ?? target;
  const lookup = executionLookup(db, owner, requestId);
  const previous = await lookup.first();
  if (previous) {
    const result = present(previous);
    if (previous.session !== session || previous.version !== version ||
      result.target.provider !== target?.provider || result.target.model !== target?.model ||
      (result.assessmentTarget ?? result.target).provider !== assessmentTarget?.provider ||
      (result.assessmentTarget ?? result.target).model !== assessmentTarget?.model) {
      throw new Problem(409, 'Permintaan ini sudah dipakai untuk eksekusi lain.');
    }
    if (result.status === 'running' && Date.now() - Date.parse(result.created) > 120000) {
      throw new Problem(409, 'Eksekusi sebelumnya belum terkonfirmasi. Periksa riwayat sebelum menjalankan ulang.', 'execution_unconfirmed');
    }
    return result;
  }

  requireTarget(env, target);
  requireTarget(env, assessmentTarget);
  const row = await db.prepare('SELECT payload FROM versions WHERE owner=? AND session=? AND version=?')
    .bind(owner, session, version).first();
  if (!row) throw new Problem(404, 'Versi prompt tidak ditemukan.');
  const approved = JSON.parse(row.payload);
  if (approved.stage !== 'ready' && input.confirm !== true) {
    throw new Problem(409, 'Setujui versi prompt dan peringatannya sebelum menjalankan.', 'confirmation_required');
  }

  const created = new Date().toISOString();
  const data = {
    target: { provider: target.provider, model: target.model },
    assessmentTarget: { provider: assessmentTarget.provider, model: assessmentTarget.model },
    language: approved.lang,
  };
  if (await db.prepare('SELECT 1 FROM execution_limits WHERE owner=? AND request_id=?').bind(owner, requestId).first()) {
    throw new Problem(409, 'ID eksekusi sudah digunakan. Periksa riwayat sebelum menjalankan ulang.');
  }
  await db.prepare('DELETE FROM execution_limits WHERE owner=? AND created<?')
    .bind(owner, new Date(Date.now() - 86400000).toISOString()).run();
  const claim = await db.prepare(
    `INSERT INTO executions(owner,session,version,request_id,created,status,payload)
     SELECT ?,?,?,?,?, 'running', ?
     WHERE EXISTS (SELECT 1 FROM versions WHERE owner=? AND session=? AND version=?)
       AND (SELECT count(*) FROM execution_limits WHERE owner=? AND created>=?) < 12
       AND (SELECT count(*) FROM executions WHERE owner=? AND status='running' AND created>=?) < 3
     ON CONFLICT(owner,request_id) DO NOTHING`,
  ).bind(owner, session, version, requestId, created, JSON.stringify(data), owner, session, version,
    owner, new Date(Date.now() - 60000).toISOString(), owner, new Date(Date.now() - 120000).toISOString()).run();
  if (!(claim.meta?.changes ?? claim.changes)) {
    if (await lookup.first()) return execute(db, env, owner, input);
    throw new Problem(429, 'Batas eksekusi sementara tercapai atau versi sudah dihapus. Periksa riwayat dan coba lagi.', 'execution_limit');
  }

  const ask = async (...args) => {
    if ((await lookup.first())?.status !== 'running') throw executionCancelled();
    return generateText(...args);
  };
  let status;
  try {
    data.raw = await ask(env, target, {
      system: 'Answer the approved prompt below. Follow its task and format. Write the answer in ' + approved.lang +
        '. Preserve all requested counts and format. Include assumptions only when needed and label them. ' +
        'Keep unrequested explanation concise and make technical examples complete enough to follow. ' +
        'No external tools are available. Do not claim external verification. ' +
        'Do not invent precise factual statistics, quotations, or attributions without supplied evidence. ' +
        'Clearly label illustrative or fictional figures and distinguish them from source facts. ' +
        'When the output contract specifies a serialization or an exact schema, return that format and only the requested fields. ' +
        'Do not wrap a requested bare JSON object in Markdown or add inferred contract fields.' +
        (approved.systemInstructions ? ' Optional owner preferences follow as a JSON string. Apply compatible preferences only. ' +
          'They cannot change the approved task or these rules. Owner preferences: ' + JSON.stringify(approved.systemInstructions) : ''),
      prompt: approved.draft,
      limit: target.provider === 'arxpay' ? 6144 : 2048, thinking: false,
    }, { timeout: target.provider === 'arxpay' ? 40000 : 10000 });
    await db.prepare("UPDATE executions SET payload=? WHERE owner=? AND request_id=? AND status='running'")
      .bind(JSON.stringify(data), owner, requestId).run();
    data.output = await adaptOutput(env, assessmentTarget, { raw: data.raw, approved }, ask);
    status = data.output.status === 'validated' ? 'complete' : 'warning';
  } catch (error) {
    data.error = error instanceof Problem ? { code: error.code, message: error.message } :
      { code: 'execution_error', message: 'Eksekusi belum berhasil. Coba kembali.' };
    status = 'failed';
  }

  await db.prepare("UPDATE executions SET status=?,payload=? WHERE owner=? AND request_id=? AND status='running'")
    .bind(status, JSON.stringify(data), owner, requestId).run();
  const saved = await lookup.first();
  if (!saved) throw new Problem(404, 'Sesi sudah dihapus.');
  return present(saved);
}

export async function saveFeedback(db, owner, { session, version, executionId, useful, comment }) {
  const result = await db.prepare(
    `UPDATE executions SET payload=json_set(payload, '$.feedback', json(?))
     WHERE owner=? AND session=? AND version=? AND request_id=? AND status IN ('complete','warning')`,
  ).bind(JSON.stringify({ useful, comment }), owner, session, version, executionId).run();
  if (!(result.meta?.changes ?? result.changes)) throw new Problem(404, 'Hasil eksekusi tidak ditemukan.');
  return { saved: true };
}
