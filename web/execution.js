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

export function modelName(settings, provider, model) {
  const names = settings?.modelNames;
  return provider === 'arxpay' && names && Object.hasOwn(names, model) ? names[model] : model;
}

export function targets(settings, escape, {auto = false} = {}) {
  const presets = settings?.presets?.map(item => '<option value="' + escape(item.id + '/' + item.provider + '/' + item.model) +
    '">' + escape(item.label + ' · ' + modelName(settings, item.provider, item.model)) + '</option>').join('');
  const selected = settings?.defaultTarget;
  const automatic = auto && selected ?
    '<option value="auto/' + escape(selected.provider + '/' + selected.model) + '">Otomatis · ' +
    escape(modelName(settings, selected.provider, selected.model)) + '</option>' : '';
  return automatic + (presets ? '<optgroup label="Profil">' + presets + '</optgroup>' : '') + (settings?.providers ?? []).filter(provider => provider.configured).map(provider =>
    '<optgroup label="' + escape(provider.label) + '">' + provider.models.map(model =>
      '<option value="' + escape(provider.id + '/' + model) + '">' + escape(modelName(settings, provider.id, model)) + '</option>').join('') + '</optgroup>').join('');
}

export function selectedTarget(element) {
  const [provider, model] = element.value.split('/').slice(-2);
  return { provider, model };
}

function feedbackForm(record, escape) {
  if (!['complete', 'warning'].includes(record.status)) return '';
  const current = record.feedback;
  return '<details><summary>Umpan balik' + (current ? ' tersimpan' : '') + '</summary>' +
    '<form data-feedback="' + escape(record.id) + '"><div class="group"><label for="useful-' + escape(record.id) +
    '">Apakah hasil membantu?</label><select id="useful-' + escape(record.id) + '" name="useful" required>' +
    '<option value="">Pilih</option><option value="yes"' + (current?.useful === true ? ' selected' : '') +
    '>Ya</option><option value="no"' + (current?.useful === false ? ' selected' : '') + '>Tidak</option></select></div>' +
    '<div class="group"><label for="comment-' + escape(record.id) + '">Catatan (opsional)</label><textarea id="comment-' +
    escape(record.id) + '" name="comment" maxlength="1000" rows="2">' + escape(current?.comment ?? '') +
    '</textarea></div><button>Simpan umpan balik</button></form></details>';
}

export function executionCards(records, escape, { feedback = true, settings } = {}) {
  return records.map(record => {
    const raw = record.raw;
    const exceptional = record.status === 'failed' || record.status === 'warning';
    const state = record.error?.code === 'execution_cancelled' ? 'Dibatalkan' : { running: 'Sedang diproses', complete: 'Validasi otomatis selesai', warning: 'Periksa peringatan', failed: 'Eksekusi gagal' }[record.status];
    const name = modelName(settings, record.target.provider, record.target.model);
    return '<article class="panel execution"><h3>' + escape(record.target.provider + ' / ' + name) + '</h3>' +
      (name !== record.target.model ? '<p class="muted">ID model · ' + escape(record.target.model) + '</p>' : '') +
      '<p class="' + (exceptional ? 'note' : 'muted') + '">' + escape(state) + '</p>' +
      '<p class="muted">' + escape('Mulai ' + new Date(record.created).toLocaleString('id-ID') +
        (record.completed ? ' · Selesai ' + new Date(record.completed).toLocaleString('id-ID') : '')) + '</p>' +
      (record.error ? '<p class="err">' + escape(record.error.message) + '</p>' : '') +
      adaptedAnswer(record.output, record.language, escape) +
      (raw ? '<p class="muted">' + escape(
        'Model aktual ' + (raw.model ?? 'tidak dilaporkan') + ' · ' + locale.format(raw.latencyMs) +
        ' ms · Token masuk / keluar ' + (raw.usage.input ?? '—') + ' / ' + (raw.usage.output ?? '—')) +
        '</p><details><summary>Respons mentah provider</summary>' +
        '<pre class="answer">' + escape(raw.text) + '</pre></details>' : '') + (feedback ? feedbackForm(record, escape) : '') + '</article>';
  }).join('');
}
