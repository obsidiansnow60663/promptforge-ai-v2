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
  const lookup = executionLookup(db, owner, requestId);
  const previous = await lookup.first();
  if (previous) {
    const result = present(previous);
    if (previous.session !== session || previous.version !== version ||
      result.target.provider !== target?.provider || result.target.model !== target?.model) {
      throw new Problem(409, 'Permintaan ini sudah dipakai untuk eksekusi lain.');
    }
    if (result.status === 'running' && Date.now() - Date.parse(result.created) > 120000) {
      throw new Problem(409, 'Eksekusi sebelumnya belum terkonfirmasi. Periksa riwayat sebelum menjalankan ulang.', 'execution_unconfirmed');
    }
    return result;
  }

  requireTarget(env, target);
  const row = await db.prepare('SELECT payload FROM versions WHERE owner=? AND session=? AND version=?')
    .bind(owner, session, version).first();
  if (!row) throw new Problem(404, 'Versi prompt tidak ditemukan.');
  const approved = JSON.parse(row.payload);
  if (approved.stage !== 'ready' && input.confirm !== true) {
    throw new Problem(409, 'Setujui versi prompt dan peringatannya sebelum menjalankan.', 'confirmation_required');
  }

  const created = new Date().toISOString();
  const data = { target: { provider: target.provider, model: target.model }, language: approved.lang };
  const claim = await db.prepare(
    `INSERT INTO executions(owner,session,version,request_id,created,status,payload)
     SELECT ?,?,?,?,?, 'running', ?
     WHERE EXISTS (SELECT 1 FROM versions WHERE owner=? AND session=? AND version=?)
       AND (SELECT count(*) FROM executions WHERE owner=? AND created>=?) < 12
       AND (SELECT count(*) FROM executions WHERE owner=? AND status='running' AND created>=?) < 3
     ON CONFLICT(owner,request_id) DO NOTHING`,
  ).bind(owner, session, version, requestId, created, JSON.stringify(data), owner, session, version,
    owner, new Date(Date.now() - 60000).toISOString(), owner, new Date(Date.now() - 120000).toISOString()).run();
  if (!(claim.meta?.changes ?? claim.changes)) {
    if (await lookup.first()) return execute(db, env, owner, input);
    throw new Problem(429, 'Batas eksekusi sementara tercapai atau versi sudah dihapus. Periksa riwayat dan coba lagi.', 'execution_limit');
  }

  let status;
  try {
    data.raw = await generateText(env, target, {
      system: 'Answer the approved prompt below. Follow its task and format. Write the answer in ' + approved.lang +
        '. No external tools are available. Do not claim to have used tools or verified external sources.',
      prompt: approved.draft,
    });
    status = 'complete';
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
