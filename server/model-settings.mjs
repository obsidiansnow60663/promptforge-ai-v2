import { catalog, fetchArxPayModels, generateText, Problem, validModelId } from './providers.mjs';
import { invalid } from './validation.mjs';

const limit = 20;

export async function ownerModelEnvironment(db, env, owner) {
  if (!db || !env.ARXPAY_API_KEY) return env;
  const { results } = await db.prepare('SELECT model FROM arxpay_enabled_models WHERE owner=? ORDER BY model LIMIT ?')
    .bind(owner, limit).all();
  return { ...env, ownerArxPayModels: results.map(row => row.model) };
}

export async function setArxPayModel(db, env, owner, body) {
  if (!validModelId(body?.model) || typeof body.enabled !== 'boolean') invalid();
  const { model, enabled } = body;
  if (!enabled) {
    await db.prepare('DELETE FROM arxpay_enabled_models WHERE owner=? AND model=?').bind(owner, model).run();
    return { model, enabled: false };
  }

  const scoped = await ownerModelEnvironment(db, env, owner);
  const configured = catalog(scoped).find(item => item.id === 'arxpay');
  if (configured.configured && configured.models.includes(model)) return { model, enabled: true };
  if ((scoped.ownerArxPayModels?.length ?? 0) >= limit) {
    throw new Problem(409, 'Batas 20 model tambahan tercapai. Nonaktifkan satu model sebelum menambah lagi.');
  }
  if (!(await fetchArxPayModels(env)).includes(model)) {
    throw new Problem(400, 'ID model tidak tercantum dalam katalog ArxPay.', 'invalid_model');
  }
  const result = await generateText({ ...env, ownerArxPayModels: [model] }, { provider: 'arxpay', model }, {
    system: 'Return only the JSON object {"ready":true}.', prompt: 'Verify JSON support.', json: true, limit: 512,
  }, { timeout: 12000 });
  let ready;
  try { ready = JSON.parse(result.text).ready === true; } catch { ready = false; }
  if (!ready) throw new Problem(502, 'Model belum berhasil menghasilkan JSON yang diminta. Model belum diaktifkan.', 'model_verification_failed');

  const insert = await db.prepare(`INSERT INTO arxpay_enabled_models(owner,model)
    SELECT ?,? WHERE (SELECT count(*) FROM arxpay_enabled_models WHERE owner=?) < ?
    ON CONFLICT(owner,model) DO NOTHING`).bind(owner, model, owner, limit).run();
  if (!(insert.meta?.changes ?? insert.changes)) {
    const saved = await db.prepare('SELECT 1 FROM arxpay_enabled_models WHERE owner=? AND model=?').bind(owner, model).first();
    if (!saved) throw new Problem(409, 'Batas 20 model tambahan tercapai. Nonaktifkan satu model sebelum menambah lagi.');
  }
  return { model, enabled: true };
}
