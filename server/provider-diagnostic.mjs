import { agentModel } from './providers.mjs';

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

  const [control, catalog, completion] = await Promise.all([
    check('https://example.com/'),
    check('https://arxpay.my.id/v1/models'),
    check('https://arxpay.my.id/v1/chat/completions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.ARXPAY_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: agentModel, messages: [{ role: 'user', content: 'Answer with the word OK.' }],
        max_tokens: 120, thinking: { type: 'disabled' } }),
    }),
  ]);
  return { configured: Boolean(env.ARXPAY_API_KEY), control, catalog, completion };
}
