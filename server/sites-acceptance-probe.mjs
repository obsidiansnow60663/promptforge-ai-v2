import { agentModel } from './providers.mjs';

export async function sitesAcceptanceProbe(request, env, route) {
  const key = env.PROMPTFORGE_ACCEPTANCE_KEY;
  const match = typeof key === 'string' && /^(\d+)\.[a-f0-9]{64}\.([a-f0-9-]{36})$/.exec(key);
  if (!match || Number(match[1]) <= Date.now() || request.headers.get('X-PF-QA-Key') !== key) return null;
  const phase = request.headers.get('X-PF-QA-Phase');
  if (!['write', 'verify', 'cleanup'].includes(phase)) return null;
  const session = match[2];
  const owner = 'qa-synthetic-' + session;
  const second = 'qa-restored-' + session;
  const origin = new URL(request.url).origin;
  const checks = {};
  const call = async (id, path, body) => {
    const response = await route(new Request(origin + '/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'oai-authenticated-user-id': id, Origin: origin, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), env);
    return { status: response.status, value: await response.json() };
  };
  const safe = async (id, path, body) => {
    try { return await call(id, path, body); } catch (error) { return { status: error.status, code: error.code }; }
  };
  const mark = (name, result) => {
    checks[name] = Boolean(result);
    if (!result) throw Error(name);
  };
  const cleanup = async () => {
    await env.DB.batch(['executions', 'versions', 'prompt_generations', 'execution_limits'].map(table =>
      env.DB.prepare('DELETE FROM ' + table + ' WHERE owner IN (?,?)').bind(owner, second)));
    const [versions, executions] = await Promise.all([
      call(owner, 'export?kind=versions'), call(second, 'export?kind=executions'),
    ]);
    checks.syntheticRowsRemoved = versions.value.rows.length === 0 && executions.value.rows.length === 0;
  };
  try {
    if (phase === 'cleanup') {
      await cleanup();
      return { phase, checks };
    }
    if (phase === 'write') {
      const input = {
        session, requestId: session, lang: 'Bahasa Indonesia', domain: 'Pemrograman', answers: [],
        source: 'Jelaskan Git untuk mahasiswa baru dalam tepat 5 poin bernomor. Jawab dalam Bahasa Indonesia.',
      };
      const generated = await safe(owner, 'generate', input);
      mark('generated', generated.status === 200 && generated.value.stage === 'ready' && generated.value.draft.includes('5'));
      const repeated = await call(owner, 'generate', input);
      mark('idempotent', generated.value.version === repeated.value.version && generated.value.draft === repeated.value.draft);
      const execution = await call(owner, 'execute', {
        session, version: generated.value.version, requestId: session, target: { provider: 'arxpay', model: agentModel },
      });
      mark('executed', execution.status === 200 && execution.value.raw?.model);
      mark('adapted', execution.value.output?.text && ['complete', 'warning'].includes(execution.value.status));
      checks.validated = execution.value.output.status === 'validated';
      return { phase, checks };
    }
    const version = 'version?session=' + session + '&version=1';
    const executions = 'executions?session=' + session + '&version=1';
    const [saved, output, outsider, outsiderResults] = await Promise.all([
      safe(owner, version), call(owner, executions), safe(second, version), call(second, executions),
    ]);
    mark('persistsAcrossRequests', saved.value?.draft.includes('5') && output.value.length === 1 && output.value[0].output?.text);
    mark('isolatedSyntheticIdentities', outsider.status === 404 && outsiderResults.value.length === 0);
    for (const kind of ['versions', 'executions']) {
      const backup = await call(owner, 'export?kind=' + kind);
      mark('exported_' + kind, backup.value.rows.length === 1);
      const restored = await call(second, 'restore', backup.value);
      mark('restored_' + kind, restored.status === 200 && restored.value.accepted === 1);
      const retrieved = await call(second, 'export?kind=' + kind);
      mark('verified_' + kind, JSON.stringify(backup.value.rows) === JSON.stringify(retrieved.value.rows));
    }
    const removed = await call(second, 'delete', { session });
    mark('deleteCascades', removed.status === 200 && (await call(second, executions)).value.length === 0);
    await cleanup();
    return { phase, checks };
  } catch (error) {
    await cleanup().catch(() => {});
    return { phase, checks, failed: Object.keys(checks).find(name => checks[name] === false) ?? error.code ?? 'probe_failed' };
  }
}
