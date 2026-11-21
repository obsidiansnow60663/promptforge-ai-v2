import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { agentModel } from '../server/providers.mjs';
import { runtime } from '../tests/runtime.mjs';

if (!process.env.ARXPAY_API_KEY || !process.argv[2]) throw Error('Supply ARXPAY_API_KEY in the environment and an output path.');
const cleanups = [];
const { call } = runtime({ after: close => cleanups.push(close) }, { ARXPAY_API_KEY: process.env.ARXPAY_API_KEY });

const fixtures = [
  {
    name: 'git-exact-count', domain: 'Pemrograman',
    source: 'Jelaskan Git kepada mahasiswa baru dalam tepat 5 poin bernomor. Tiap poin maksimal 20 kata. Jawab dalam Bahasa Indonesia.',
    lang: 'Bahasa Indonesia', draftChecks: [/Git/i, /\b5\b/, /\b20\b/, /Indonesian|Bahasa Indonesia/i],
    answerCheck(answer) {
      const rows = [...answer.matchAll(/^\s*(\d+)\.\s+(.+)$/gm)];
      return rows.map(row => row[1]).join() === '1,2,3,4,5' && rows.every(row => row[2].trim().split(/\s+/).length <= 20);
    },
  },
  {
    name: 'explicit-english', domain: 'Konten',
    source: 'Tulis email singkat untuk membatalkan reservasi R77. Jawab dalam bahasa Inggris. Jangan mengarang tanggal atau biaya.',
    lang: 'English', draftChecks: [/\bR77\b/, /English/i, /cancel/i],
    answerCheck: answer => /\bR77\b/.test(answer) && /\bcancel/i.test(answer) && /\breservation\b/i.test(answer) &&
      !/\b(?:rupiah|mohon|selamat|reservasi)\b/i.test(answer),
  },
  {
    name: 'date-identifier-percent', domain: 'Bisnis',
    source: 'Tulis pemberitahuan singkat dalam Bahasa Indonesia. Paket L-12 berlaku 21/11/2026 dengan diskon 15%. Pertahankan format tanggal, nama paket, dan persentase persis. Jangan menambahkan harga.',
    lang: 'Bahasa Indonesia', draftChecks: [/\bL-12\b/, /21\/11\/2026/, /15%/, /Indonesian|Bahasa Indonesia/i],
    answerCheck: answer => /\bL-12\b/.test(answer) && /21\/11\/2026/.test(answer) && /15%/.test(answer) && !/\bRp\s*\d/i.test(answer),
  },
  {
    name: 'timed-video-without-invented-statistics', domain: 'Konten',
    source: 'Buat naskah video hemat air untuk remaja selama tepat 60 detik. Sajikan dengan penanda waktu. Hindari angka statistik atau klaim faktual spesifik yang tidak disertai sumber.',
    lang: 'Bahasa Indonesia', draftChecks: [/\b60\b/, /teen/i, /statistic|claims|evidence/i],
    answerCheck: answer => /(?:1:00|60\s*(?:detik|s)\b)/i.test(answer) && /0:00|00:00/.test(answer) &&
      !/\b\d+(?:[.,]\d+)?\s*(?:liter|juta|miliar)\b/i.test(answer),
  },
  {
    name: 'patch-after-source', domain: 'Pemrograman',
    source: 'Perbaiki aplikasi Node.js yang menelan galat saat Promise ditolak. Jangan abaikan galat. Sebutkan await. Berikan patch dan alasan. Potongan kode belum diberikan.',
    lang: 'Bahasa Indonesia', draftChecks: [/await/i, /patch/i],
    clarification: 'Kode sintetis untuk diuji: async function load() { try { return await fetchData(); } catch (error) { return null; } }. Pertahankan API async, dan teruskan error asli dengan throw agar pemanggil menanganinya.',
    answerCheck: answer => /await/.test(answer) && /throw\s+error/.test(answer),
  },
  {
    name: 'compare-after-articles', domain: 'Riset',
    source: 'Buat matriks untuk menguji pernyataan dalam dua artikel pangan. Pisahkan klaim dan bukti. Jangan ciptakan sitasi. Saya belum memberikan isi artikel.',
    lang: 'Bahasa Indonesia', draftChecks: [/matrix/i, /claims?/i, /evidence/i],
    clarification: 'Dua artikel sintetis. Artikel A menyatakan penyimpanan dingin memperpanjang kesegaran, tetapi tidak memberikan data. Artikel B menyatakan kemasan tertutup mengurangi kontak udara dan menyebut pengamatan laboratorium tanpa ukuran sampel. Gunakan hanya isi ini.',
    answerCheck: answer => /Artikel A/i.test(answer) && /Artikel B/i.test(answer) && /klaim/i.test(answer) && /bukti/i.test(answer),
  },
  {
    name: 'priorities-after-notes', domain: 'Umum',
    source: 'Ubah catatan tugas menjadi agenda tepat 3 prioritas bernomor. Minta catatan bila kosong. Saya belum mengirim catatan.',
    lang: 'Bahasa Indonesia', draftChecks: [/\b3\b/, /priorit/i],
    clarification: 'Catatan sintetis: bayar tagihan listrik hari ini; kirim draf laporan besok; rapikan arsip jika dua tugas pertama sudah selesai. Tulis hanya 3 prioritas bernomor.',
    answerCheck: answer => [...answer.matchAll(/^\s*([123])\.[ 	]+/gm)].map(row => row[1]).join() === '1,2,3' &&
      /listrik/i.test(answer) && /laporan/i.test(answer) && /arsip/i.test(answer),
  },
  {
    name: 'clarify-and-table', domain: 'Riset',
    source: 'Ringkas hasil survei internal kami dalam tabel. Data belum saya berikan. Jangan mengarang data.',
    lang: 'Bahasa Indonesia', draftChecks: [/surve/i, /table/i, /25/, /40/],
    clarification: 'Survei 40 orang. Sebanyak 25 memilih belajar lewat video. Hanya rangkum data tersebut dalam tabel. Jangan mengarang kategori lain.',
    answerCheck: answer => /\|.+\|/.test(answer) && /\b25\b/.test(answer) && /\b40\b/.test(answer),
  },
];
const target = { provider: 'arxpay', model: agentModel };
const request = async (owner, path, body) => {
  const response = await call(path, body, owner);
  return { status: response.status, data: await response.json() };
};

async function check(fixture) {
  const owner = fixture.name;
  const state = { session: crypto.randomUUID(), requestId: crypto.randomUUID(), source: fixture.source,
    domain: fixture.domain, lang: 'Bahasa Indonesia', answers: [] };
  const summary = { name: fixture.name, source: fixture.source };
  try {
    let generated = await request(owner, 'generate', state);
    if (fixture.clarification) {
      assert.equal(generated.data.stage, 'clarify', JSON.stringify(generated));
      summary.questions = generated.data.spec.questions;
      assert.ok(summary.questions.length >= 1 && summary.questions.length <= 3);
      assert.equal(generated.data.spec.safeAssumptions?.length ?? 0, 0, 'Missing source data must not receive fabricated assumptions');
      state.answers = summary.questions.map(question => ({ question, answer: fixture.clarification }));
      state.requestId = crypto.randomUUID();
      generated = await request(owner, 'generate', state);
    }
    summary.generationStatus = generated.data.stage ?? generated.data.code;
    summary.draft = generated.data.draft;
    summary.promptIssues = generated.data.issues ?? [];
    assert.equal(generated.data.stage, 'ready', JSON.stringify(generated));
    assert.equal(generated.data.lang, fixture.lang);
    assert.ok(fixture.draftChecks.every(pattern => pattern.test(generated.data.draft)));
    const retried = await request(owner, 'generate', state);
    assert.deepEqual(retried, generated);

    const version = generated.data.version;
    const execution = await request(owner, 'execute', {
      session: state.session, version, requestId: crypto.randomUUID(), target,
    });
    const result = execution.data;
    summary.executionStatus = result.status ?? result.code;
    summary.outputStatus = result.output?.status;
    summary.outputWarnings = result.output?.warnings ?? [];
    summary.model = result.raw?.model;
    summary.answer = result.output?.text;
    summary.checks = Boolean(summary.answer && fixture.answerCheck(summary.answer));
    assert.ok(summary.checks, JSON.stringify(execution));
    const path = 'executions?session=' + state.session + '&version=' + version;
    assert.deepEqual((await request(owner, path)).data, [result]);
    assert.deepEqual((await request(owner + '-other', path)).data, []);
    for (const kind of ['versions', 'executions']) {
      const exported = await request(owner, 'export?kind=' + kind);
      assert.equal(exported.data.rows.length, 1);
      assert.equal((await request(owner + '-restore', 'restore', exported.data)).status, 200);
      assert.deepEqual((await request(owner + '-restore', 'export?kind=' + kind)).data.rows, exported.data.rows);
    }
    summary.savedAndRecovered = true;
  } catch (error) {
    summary.failure = error.code ?? error.name;
    summary.detail = String(error.message).slice(0, 500);
  }
  console.error('%s: %s', fixture.name, summary.failure ?? summary.outputStatus);
  return summary;
}

const selectors = process.argv[3]?.split(',');
const selected = selectors ? fixtures.filter(item => selectors.includes(item.name)) : fixtures;
if (selected.length === 0 || (selectors && new Set(selectors).size !== selected.length)) throw Error('Unknown self-check case.');
try {
  const rows = await Promise.all(selected.map(check));
  await writeFile(process.argv[2], JSON.stringify({ model: agentModel, environment: 'local Worker/SQLite, live provider', rows }, null, 2) + '\n');
  if (rows.some(row => row.failure)) process.exitCode = 1;
} finally {
  for (const cleanup of cleanups) cleanup();
}
