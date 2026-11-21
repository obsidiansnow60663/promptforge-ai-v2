import { hasPromptScores, promptWeights, weightedPromptScore } from '../web/quality.js';
import { Problem } from './providers.mjs';

export const invalid = () => { throw new Problem(400, 'Periksa isian dan coba kembali.'); };
export const str = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export const strings = value => Array.isArray(value) && value.length <= 40 && value.every(item => str(item, 2000));
export const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export const validVersion = value => Number.isSafeInteger(value) && value > 0;

export function validateSystemInstructions(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > 2000) invalid();
  return value.trim();
}

export function validateInput(body) {
  if (!str(body?.source, 12000) || !str(body.domain, 80) || !['Bahasa Indonesia', 'English'].includes(body.lang) ||
    (body.subdomain !== undefined && (typeof body.subdomain !== 'string' || body.subdomain.length > 80)) ||
    (body.mode !== undefined && !['generate', 'execute', 'existing'].includes(body.mode)) ||
    (body.inputLanguage !== undefined && !['Bahasa Indonesia', 'English', 'Tidak ditentukan'].includes(body.inputLanguage)) ||
    !Array.isArray(body.answers) || body.answers.length > 12 ||
    !body.answers.every(item => item && str(item.question, 500) && str(item.answer, 1500))) invalid();
  const systemInstructions = validateSystemInstructions(body.systemInstructions);
  const subdomain = body.subdomain?.trim();
  return { source: body.source, domain: body.domain, lang: body.lang, ...(systemInstructions ? { systemInstructions } : {}),
    ...(subdomain ? { subdomain } : {}),
    ...(body.mode ? { mode: body.mode } : {}), ...(body.inputLanguage ? { inputLanguage: body.inputLanguage } : {}),
    answers: body.answers.map(({ question, answer }) => ({ question, answer })) };
}

export function validateAssessment(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value.critical !== 'boolean' ||
      (value.dimensions !== null && !hasPromptScores(value.dimensions))) invalid();
  const dimensions = value.dimensions && Object.fromEntries(Object.keys(promptWeights).map(key=>[key,value.dimensions[key]]));
  const score = dimensions ? weightedPromptScore(dimensions) : null;
  const evaluatorType = value.evaluatorType;
  if (value.score !== score || (evaluatorType !== undefined &&
      (!['model-assisted', 'deterministic'].includes(evaluatorType) || (evaluatorType === 'deterministic' && dimensions)))) invalid();
  return { critical: value.critical, dimensions, score, ...(evaluatorType ? { evaluatorType } : {}) };
}

export function validateRevisionReason(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > 1000) invalid();
  return value.trim();
}

export function validateReport(report, allowEdited = false) {
  const spec = report?.spec;
  const keys = ['goal', 'context', 'requirements', 'constraints', 'deliverables', 'assumptions', 'questions'];
  const stages = allowEdited ? ['ready', 'warning', 'edited'] : ['ready', 'warning'];
  if (!spec || !str(spec.goal, 2000) || typeof spec.context !== 'string' || spec.context.length > 5000 ||
    !keys.slice(2).every(key => strings(spec[key])) || !str(report.draft, 32000) || !strings(report.issues) ||
    !stages.includes(report.stage) || !Number.isInteger(report.revisions) || report.revisions < 0 || report.revisions > 2) invalid();
  const assessment = validateAssessment(report.assessment);
  const stage = (report.issues.length || assessment?.critical) && report.stage === 'ready' ? 'warning' : report.stage;
  if (stage === 'ready' && assessment?.evaluatorType === 'deterministic') invalid();
  const revisionReason = validateRevisionReason(report.revisionReason);
  return {
    ...(assessment ? { assessment } : {}),
    ...(revisionReason ? { revisionReason } : {}),
    spec: Object.fromEntries(keys.map(key => [key, spec[key]])), draft: report.draft,
    stage,
    issues: report.issues, revisions: report.revisions,
  };
}

export async function readJson(req, maxBytes) {
  const fail = () => { throw new Problem(413, 'Ukuran permintaan melebihi batas.'); };
  if (Number(req.headers.get('Content-Length')) > maxBytes) fail();
  if (!req.body) invalid();
  const reader = req.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let raw = '', bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {});
        fail();
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) invalid();
    return data;
  } catch (error) {
    if (error instanceof Problem) throw error;
    invalid();
  } finally {
    reader.releaseLock();
  }
}
