const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const metric = value => value == null ? '—' : number.format(value);
const labels = {
  'direct-id': 'Instruksi Indonesia langsung',
  'literal-en': 'Terjemahan Inggris harfiah',
  promptforge: 'PromptForge',
};

function stats(items, escape) {
  return '<dl class="metric-list">' + items.map(([label, value]) =>
    '<div><dt>' + escape(label) + '</dt><dd>' + escape(metric(value)) + '</dd></div>').join('') + '</dl>';
}

function table(headers, rows, escape) {
  return '<div class="table-scroll" tabindex="0" role="region" aria-label="' + escape(headers[0]) + '">' +
    '<table><thead><tr>' + headers.map(label => '<th scope="col">' + escape(label) + '</th>').join('') + '</tr></thead>' +
    '<tbody>' + rows.map(([label, ...values]) => '<tr><th scope="row">' + escape(label) + '</th>' +
      values.map(value => '<td>' + escape(value) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}

export function evaluationView({ data, error, loading, escape }) {
  if (loading) return '<p role="status">Memuat evaluasi…</p>';
  if (error) return '<p class="err" role="alert">' + escape(error) + '</p><button id="refreshEvaluation">Coba lagi</button>';
  if (!data) return '<button id="refreshEvaluation">Muat evaluasi</button>';
  const { prompts, executions, models, benchmark } = data;
  return '<div class="grid compare-grid">' +
    '<section class="panel"><h2>Peninjauan prompt</h2>' +
    stats([['Versi tersimpan', prompts.total], ['Lolos peninjauan', prompts.ready], ['Dengan peringatan', prompts.warnings],
      ['Perubahan kritis ditandai', prompts.critical], ['Suntingan belum ditinjau', prompts.edited]], escape) +
    (prompts.scored ? '<p>Rata-rata skor dari ' + escape(prompts.scored) + ' draf yang lolos dan memiliki nilai adalah <strong>' +
      escape(metric(prompts.averageScore)) + '/100</strong>.</p>' : '<p>Skor belum tersedia untuk draf yang lolos.</p>') + '</section>' +
    '<section class="panel"><h2>Validasi hasil</h2>' +
    stats([['Eksekusi', executions.total], ['Tervalidasi', executions.validated], ['Dengan peringatan', executions.warnings],
      ['Gagal', executions.failed], ['Dibatalkan', executions.cancelled], ['Tercatat berjalan', executions.running]], escape) +
    '<p>Umpan balik membantu pada ' + escape(executions.helpful) + ' dari ' + escape(executions.feedback) + ' penilaian.</p></section></div>' +
    '<section class="section panel"><h2>Penggunaan model</h2>' + (models.length ?
      table(['Model aktual atau pilihan', 'Jawaban', 'Rata-rata ms', 'Token masuk', 'Token keluar'], models.map(row =>
        [row.model + ' · ' + row.provider, metric(row.runs), metric(row.latencyMs), metric(row.inputTokens), metric(row.outputTokens)]), escape) :
      '<p>Belum ada jawaban model yang tercatat.</p>') + '</section>' +
    '<section class="section panel"><h2>Benchmark ' + escape(benchmark.dataset) + '</h2>' +
    table(['Varian benchmark', 'Jawaban tersedia', 'Penanda terdeteksi', 'Literal prompt utuh'], benchmark.runs.map(row =>
      [labels[row.id], row.answered + '/' + row.cases, row.markerFound + '/' + row.answered,
        row.preserving + '/' + row.checkable]), escape) +
    '<p>' + escape(benchmark.matchedCases) + ' kasus memiliki jawaban pada ketiga varian. Angka menunjukkan cakupan dan pemeriksaan teks. Penilaian mutu semantik masih terbuka.</p>' +
    '<a href="/benchmark.txt">Baca metode benchmark</a></section>';
}
