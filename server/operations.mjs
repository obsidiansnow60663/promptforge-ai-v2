import { Problem } from './providers.mjs';
import { invalid, uuid } from './validation.mjs';

export const generationCancelled = () =>
  new Problem(409, 'Penyusunan prompt dibatalkan.', 'generation_cancelled');
export const executionCancelled = () =>
  new Problem(409, 'Eksekusi dibatalkan.', 'execution_cancelled');

export async function cancelOperation(db, owner, { kind, requestId }) {
  if (!uuid(requestId) || !['generate', 'execute'].includes(kind)) invalid();
  const result = kind === 'generate' ? await db.prepare(
    "UPDATE prompt_generations SET status='failed',error_code='generation_cancelled',checkpoint=NULL WHERE owner=? AND request_id=? AND status='running'",
  ).bind(owner, requestId).run() : await db.prepare(
    "UPDATE executions SET status='failed',payload=json_set(payload,'$.error',json(?),'$.completed',max(created,?)) WHERE owner=? AND request_id=? AND status='running'",
  ).bind(JSON.stringify({ code: 'execution_cancelled', message: executionCancelled().message }), new Date().toISOString(), owner, requestId).run();
  if (!(result.meta?.changes ?? result.changes)) throw new Problem(409, 'Proses aktif tidak ditemukan atau sudah selesai.');
  return { cancelled: true };
}

export async function listOperations(db, owner) {
  const { results } = await db.prepare(`SELECT 'generate' AS kind, g.request_id AS id, g.session, g.created,
      g.status, g.error_code AS code, v.version, g.phase
      FROM prompt_generations g LEFT JOIN versions v ON v.owner=g.owner AND v.request_id=g.request_id
      WHERE g.owner=?
    UNION ALL
    SELECT 'execute', request_id, session, created, status, json_extract(payload,'$.error.code'), version, NULL
      FROM executions WHERE owner=?
    ORDER BY created DESC,id DESC LIMIT 20`).bind(owner, owner).all();
  return results.map(item => {
    const staleAfter = item.kind === 'generate' ? 180000 : 120000;
    const status = item.code?.endsWith('_cancelled') ? 'cancelled' :
      item.status === 'running' && Date.now() - Date.parse(item.created) > staleAfter ? 'unconfirmed' : item.status;
    return { ...item, status };
  });
}
