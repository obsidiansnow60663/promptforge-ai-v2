import { runPromptAgent } from './prompt-engine.mjs';

export async function diagnoseProvider(req, env) {
  const key = env.PROMPTFORGE_DIAGNOSTIC_KEY;
  if (!key || Number(key.split('.')[0]) <= Date.now() ||
      req.headers.get('X-PromptForge-Diagnostic') !== key) return null;

  async function check(url, options = {}) {
    const start = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'manual', ...options });
      const elapsed = Date.now() - start;
      const location = response.headers.get('location');
      const data = options.method === 'POST' ? await response.json().catch(() => null) : null;
      await response.body?.cancel().catch(() => {});
      return { status: response.status, elapsed, locationHost: location ? new URL(location, url).hostname : null,
        hasCloudflareRay: response.headers.has('cf-ray'), validResponse: Boolean(data?.choices?.[0]?.message?.content),
        providerError: typeof data?.error?.type === 'string' && /^[a-z_]{1,50}$/.test(data.error.type) ? data.error.type : null };
    } catch (error) {
      const message = String(error?.message ?? '').replaceAll(env.ARXPAY_API_KEY || key, '[redacted]')
        .replaceAll(key, '[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 200);
      return { issue: error.name, message, elapsed: Date.now() - start };
    }
  }

  // The control has no credentials and no user content.
  const detached = fetch;
  const [redirectMode, receiver] = await Promise.all([
    check('https://arxpay.my.id/v1/models', { redirect: 'error' }),
    (async () => {
      try {
        const response = await detached('https://arxpay.my.id/v1/models', { redirect: 'manual' });
        await response.body?.cancel().catch(() => {});
        return { status: response.status };
      } catch (error) {
        return { issue: error.name, message: String(error.message).slice(0, 150) };
      }
    })(),
  ]);
  let pipeline;
  const started = Date.now();
  try {
    const result = await runPromptAgent(env, {
      source: 'Jelaskan Git kepada mahasiswa baru dalam tepat 5 poin. Jawab dalam Bahasa Indonesia.',
      domain: 'Pemrograman', lang: 'Bahasa Indonesia', answers: [],
    });
    pipeline = { stage: result.stage, model: result.model, revisions: result.revisions,
      preservesCount: result.draft?.includes('5') ?? false, elapsed: Date.now() - started };
  } catch (error) {
    pipeline = { code: error.code, message: error.message, elapsed: Date.now() - started };
  }
  return { configured: Boolean(env.ARXPAY_API_KEY), redirectMode, receiver, pipeline };
}
