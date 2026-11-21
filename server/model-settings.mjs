import { catalog, configuredAgentModel, fetchArxPayModels, generateText, Problem, validModelId } from './providers.mjs';
import { invalid } from './validation.mjs';

const limit = 20;
const scanWindow = 30000;
const scanProofAge = 120000;

async function verifyModel(env, model, timeout) {
  const result = await generateText({ ...env, ownerArxPayModels: [model] }, { provider: 'arxpay', model }, {
    system: 'Return only the JSON object {"ready":true}.', prompt: 'Verify JSON support.', json: true, limit: 512, thinking: false,
  }, { timeout, maxAttempts: 1 });
  let ready;
  try { ready = JSON.parse(result.text).ready === true; } catch { ready = false; }
  if (!ready) throw new Problem(502, 'Model belum berhasil menghasilkan JSON yang diminta. Model belum diaktifkan.', 'model_verification_failed');
}

export async function scanArxPayModels(db, env, owner) {
  const started = Date.now();
  const lookup = db.prepare('SELECT started,result FROM arxpay_catalog_scans WHERE owner=?').bind(owner);
  const claim = await db.prepare(`INSERT INTO arxpay_catalog_scans(owner,started) VALUES (?,?)
    ON CONFLICT(owner) DO UPDATE SET started=excluded.started,result=NULL WHERE arxpay_catalog_scans.started <= ?`)
    .bind(owner, started, started - scanWindow).run();
  if (!(claim.meta?.changes ?? claim.changes)) {
    const previous = await lookup.first();
    if (previous?.result) return JSON.parse(previous.result);
    throw new Problem(409, 'Pemeriksaan katalog ArxPay masih berjalan.', 'catalog_scan_running');
  }

  try {
    const catalogIds = await fetchArxPayModels(env);
    const defaultId = configuredAgentModel(env);
    const prioritized = catalogIds.includes(defaultId) ? [defaultId, ...catalogIds.filter(id => id !== defaultId)] : catalogIds;
    const models = [];
    let checked = 0;
    let stoppedBy = null;
    const deadline = started + 24000;
    const stops = ['provider_credentials', 'provider_quota', 'provider_rate_limit', 'provider_redirect'];
    const candidates = prioritized.slice(0, limit);

    while (checked < candidates.length && !stoppedBy) {
      const remaining = deadline - Date.now();
      if (remaining < 1000) break;
      // Check one model first so a shared quota failure does not start a batch.
      const batch = candidates.slice(checked, checked + (checked ? 3 : 1));
      const outcomes = await Promise.allSettled(batch.map(model => verifyModel(env, model, Math.min(6000, remaining))));
      for (const [index, outcome] of outcomes.entries()) {
        if (outcome.status === 'fulfilled') models.push(batch[index]);
        else if (stops.includes(outcome.reason?.code)) stoppedBy ??= outcome.reason.code;
      }
      checked += batch.length;
    }

    const result = { models: models.sort(), checked, total: catalogIds.length, stoppedBy };
    await db.prepare('UPDATE arxpay_catalog_scans SET result=? WHERE owner=? AND started=?')
      .bind(JSON.stringify(result), owner, started).run();
    return result;
  } catch (issue) {
    await db.prepare('DELETE FROM arxpay_catalog_scans WHERE owner=? AND started=?').bind(owner, started).run();
    throw issue;
  }
}

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
  const recent = await db.prepare('SELECT result FROM arxpay_catalog_scans WHERE owner=? AND started>?')
    .bind(owner, Date.now() - scanProofAge).first();
  if (!recent?.result || !JSON.parse(recent.result).models.includes(model)) {
    if (!(await fetchArxPayModels(env)).includes(model)) {
      throw new Problem(400, 'ID model tidak tercantum dalam katalog ArxPay.', 'invalid_model');
    }
    await verifyModel(env, model, 12000);
  }

  const insert = await db.prepare(`INSERT INTO arxpay_enabled_models(owner,model)
    SELECT ?,? WHERE (SELECT count(*) FROM arxpay_enabled_models WHERE owner=?) < ?
    ON CONFLICT(owner,model) DO NOTHING`).bind(owner, model, owner, limit).run();
  if (!(insert.meta?.changes ?? insert.changes)) {
    const saved = await db.prepare('SELECT 1 FROM arxpay_enabled_models WHERE owner=? AND model=?').bind(owner, model).first();
    if (!saved) throw new Problem(409, 'Batas 20 model tambahan tercapai. Nonaktifkan satu model sebelum menambah lagi.');
  }
  return { model, enabled: true };
}
