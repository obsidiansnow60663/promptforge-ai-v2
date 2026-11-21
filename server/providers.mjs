export class Problem extends Error {
  constructor(status, message, code = 'request_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function usage(input, output) {
  return {
    input: Number.isSafeInteger(input) && input >= 0 ? input : null,
    output: Number.isSafeInteger(output) && output >= 0 ? output : null,
  };
}

export const agentModel = 'deepseek-v4.1-flash-bansos';

const arxpay = {
  label: 'ArxPay',
  key: 'ARXPAY_API_KEY',
  models: 'ARXPAY_MODELS',
  request(model, key, system, prompt, limit, json, thinking) {
    return ['https://arxpay.my.id/v1/chat/completions', { Authorization: 'Bearer ' + key }, {
      model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      max_tokens: limit, ...(json ? { response_format: { type: 'json_object' } } : {}),
      ...(model === agentModel && thinking === false ? { thinking: { type: 'disabled' } } : {}),
    }];
  },
  response(body) {
    const choice = body.choices?.[0];
    if (choice?.finish_reason !== 'stop') return null;
    return { text: choice.message?.content, model: body.model, finish: choice.finish_reason,
      usage: usage(body.usage?.prompt_tokens, body.usage?.completion_tokens) };
  },
};

const providers = { arxpay };

const modelPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}$/;
export const validModelId = value => typeof value === 'string' && modelPattern.test(value);

export function configuredAgentModel(env) {
  return validModelId(env.PROMPTFORGE_AGENT_MODEL) ? env.PROMPTFORGE_AGENT_MODEL : agentModel;
}
export function catalog(env) {
  return Object.entries(providers).map(([id, provider]) => {
    const available = (env[provider.models] ?? '').split(',').map(value => value.trim()).filter(validModelId);
    if (id === 'arxpay') available.unshift(configuredAgentModel(env));
    const enabled = id === 'arxpay' ? env.ownerArxPayModels ?? [] : [];
    const models = [...new Set([...new Set(available)].slice(0, 20).concat(enabled))];
    return { id, label: provider.label, configured: Boolean(env[provider.key] && models.length), models };
  });
}

export function providerPresets(env) {
  const providers = catalog(env);
  return [['QUALITY', 'Kualitas'], ['BALANCED', 'Seimbang'], ['FAST', 'Cepat']].flatMap(([key, label]) => {
    const [provider, ...parts] = (env['PROMPTFORGE_' + key + '_MODEL'] ?? '').split('/');
    const model = parts.join('/');
    return providers.some(item => item.id === provider && item.configured && item.models.includes(model)) ?
      [{ id: key.toLowerCase(), label, provider, model }] : [];
  });
}

export function requireTarget(env, target) {
  const selected = catalog(env).find(item => item.id === target?.provider);
  if (!selected) throw new Problem(400, 'Pilih provider yang tersedia.', 'invalid_provider');
  if (!selected.configured) throw new Problem(503, 'Konfigurasi provider belum lengkap di pengaturan Sites.', 'provider_unconfigured');
  if (!selected.models.includes(target.model)) throw new Problem(400, 'Pilih model yang terdaftar untuk provider ini.', 'invalid_model');
  return selected;
}

function providerError(status, body) {
  const type = body?.error?.code ?? body?.error?.type;
  if (status === 401 || status === 403) return new Problem(502, 'Provider menolak kredensial atau akses model. Periksa pengaturan Sites.', 'provider_credentials');
  if (status === 429) {
    if (['insufficient_quota', 'billing_hard_limit_reached', 'key_daily_cap'].includes(type)) {
      return new Problem(429, 'Kuota provider habis. Periksa batas penggunaan provider.', 'provider_quota');
    }
    return new Problem(429, 'Provider membatasi permintaan. Periksa kuota atau coba lagi nanti.', 'provider_rate_limit');
  }
  if (status === 408 || status >= 500) return new Problem(502, 'Provider sedang mengalami gangguan. Coba kembali.', 'provider_transient');
  return new Problem(502, 'Provider menolak permintaan. Periksa model dan panjang prompt.', 'provider_rejected');
}

export async function fetchArxPayModels(env) {
  if (!env.ARXPAY_API_KEY) throw new Problem(503, 'Kredensial ArxPay belum dikonfigurasi di Sites.', 'provider_unconfigured');
  const signal = AbortSignal.timeout(10000);
  let response, body;
  try {
    response = await fetch('https://arxpay.my.id/v1/models', {
      headers: { Authorization: 'Bearer ' + env.ARXPAY_API_KEY, Accept: 'application/json' }, redirect: 'manual', signal,
    });
    if (response.status < 300 || response.status >= 400) body = await response.json().catch(() => null);
    else await response.body?.cancel();
  } catch {
    throw new Problem(502, signal.aborted ? 'Waktu tunggu katalog ArxPay habis.' : 'Katalog ArxPay tidak dapat dihubungi.',
      signal.aborted ? 'provider_timeout' : 'provider_connection');
  }
  if (signal.aborted) throw new Problem(502, 'Waktu tunggu katalog ArxPay habis.', 'provider_timeout');
  if (response.status >= 300 && response.status < 400) throw new Problem(502, 'Endpoint katalog ArxPay mengalihkan permintaan.', 'provider_redirect');
  if (!response.ok) throw providerError(response.status, body);
  if (!Array.isArray(body?.data)) throw new Problem(502, 'Format katalog ArxPay tidak dapat dibaca.', 'provider_incomplete');
  return [...new Set(body.data.map(item => item?.id).filter(validModelId))].slice(0, 200).sort();
}

function retryDelay(response, code, attempt) {
  const header = response.headers.get('Retry-After');
  const requested = !header ? 0 : /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
  if (requested > 3000) return null;
  if (code === 'provider_transient' && response.status >= 500 ||
      code === 'provider_rate_limit' && header && Number.isFinite(requested)) {
    return Math.max(250 * 2 ** (attempt - 1), Number.isFinite(requested) ? requested : 0);
  }
  return null;
}

export async function generateText(env, target, { system, prompt, limit = 2048, json = false, thinking }, {
  send = (url, options) => globalThis.fetch(url, options),
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)),
  timeout = 10000,
  beforeAttempt,
} = {}) {
  requireTarget(env, target);
  const started = Date.now();
  const provider = providers[target.provider];
  const [url, headers, payload] = provider.request(target.model, env[provider.key], system, prompt, limit, json, thinking);
  const deadline = started + timeout * 2;
  let lastIssue;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await beforeAttempt?.();
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw lastIssue ?? new Problem(502, 'Waktu tunggu provider habis.', 'provider_timeout');
    const signal = AbortSignal.timeout(Math.min(timeout, remaining));
    let body, response;
    try {
      response = await send(url, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal, redirect: 'manual',
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel().catch(() => {});
      } else {
        body = await response.json().catch(() => null);
      }
    } catch {
      throw new Problem(502, signal.aborted ? 'Waktu tunggu provider habis.' : 'Provider tidak dapat dihubungi.',
        signal.aborted ? 'provider_timeout' : 'provider_connection');
    }
    if (signal.aborted) throw new Problem(502, 'Waktu tunggu provider habis.', 'provider_timeout');
    if (response.status >= 300 && response.status < 400) {
      throw new Problem(502, 'Endpoint provider mengalihkan permintaan. Hubungi pengelola provider.', 'provider_redirect');
    }
    if (!response.ok) {
      const issue = providerError(response.status, body);
      const delay = retryDelay(response, issue.code, attempt);
      if (attempt < 3 && delay !== null && Date.now() + delay < deadline) {
        lastIssue = issue;
        await pause(delay);
        continue;
      }
      throw issue;
    }
    let normalized;
    try { normalized = provider.response(body); } catch { normalized = null; }
    if (typeof normalized?.text !== 'string' || !normalized.text.trim() || normalized.text.length > 30000) {
      throw new Problem(502, 'Provider tidak mengirim hasil teks yang lengkap.', 'provider_incomplete');
    }
    return {
      ...normalized, provider: target.provider, requestedModel: target.model,
      model: typeof normalized.model === 'string' && normalized.model.trim() ? normalized.model.slice(0, 160) : null,
      latencyMs: Date.now() - started, attempts: attempt,
    };
  }
}
