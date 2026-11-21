const dimensions = {
  fidelity: 'Kesetiaan makna', completeness: 'Kelengkapan', naturalness: 'Kealamian bahasa',
  terminology: 'Istilah teknis', audience: 'Kesesuaian audiens', factualConsistency: 'Konsistensi fakta', format: 'Format',
};

function adaptedAnswer(output, language, escape) {
  if (!output) return '';
  const heading = output.status === 'validated' ? 'Jawaban tervalidasi' : 'Adaptasi memerlukan peninjauan';
  const review = output.dimensions ? '<details><summary>Penilaian keluaran</summary><ul>' +
    Object.entries(output.dimensions).map(([key, pass]) => '<li>' + escape(dimensions[key] ?? key) + ' · ' +
      (pass ? 'Lulus' : 'Perlu ditinjau') + '</li>').join('') + '</ul></details>' : '';
  return '<h4>' + (output.text ? heading + ' · ' + escape(language) : 'Adaptasi belum tersedia') + '</h4>' +
    (output.critical ? '<p class="err">Perubahan kritis terdeteksi.</p>' : '') +
    (output.warnings.length ? '<ul class="note">' + output.warnings.map(warning => '<li>' + escape(warning) + '</li>').join('') + '</ul>' : '') +
    (output.text ? '<pre class="answer">' + escape(output.text) + '</pre>' : '') + review;
}

const locale = new Intl.NumberFormat('id-ID');

export function targets(settings, escape) {
  return (settings?.providers ?? []).filter(provider => provider.configured).map(provider =>
    '<optgroup label="' + escape(provider.label) + '">' + provider.models.map(model =>
      '<option value="' + escape(provider.id + '/' + model) + '">' + escape(model) + '</option>').join('') + '</optgroup>').join('');
}

export function selectedTarget(element) {
  const [provider, model] = element.value.split('/');
  return { provider, model };
}

export function executionCards(records, escape) {
  return records.map(record => {
    const raw = record.raw;
    const exceptional = record.status === 'failed' || record.status === 'warning';
    const state = { running: 'Sedang diproses', complete: 'Validasi otomatis selesai', warning: 'Periksa peringatan', failed: 'Eksekusi gagal' }[record.status];
    return '<article class="panel execution"><h3>' + escape(record.target.provider + ' / ' + record.target.model) + '</h3>' +
      '<p class="' + (exceptional ? 'note' : 'muted') + '">' + escape(state) + '</p>' +
      (record.error ? '<p class="err">' + escape(record.error.message) + '</p>' : '') +
      adaptedAnswer(record.output, record.language, escape) +
      (raw ? '<p class="muted">' + escape(
        'Model aktual ' + (raw.model ?? 'tidak dilaporkan') + ' · ' + locale.format(raw.latencyMs) +
        ' ms · Token masuk / keluar ' + (raw.usage.input ?? '—') + ' / ' + (raw.usage.output ?? '—') +
        ' · ' + new Date(record.created).toLocaleString('id-ID')) + '</p><details open><summary>Respons mentah provider</summary>' +
        '<pre class="answer">' + escape(raw.text) + '</pre></details>' : '') + '</article>';
  }).join('');
}
