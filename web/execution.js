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
    const state = { running: 'Sedang diproses', complete: 'Respons tersedia', warning: 'Periksa peringatan', failed: 'Eksekusi gagal' }[record.status];
    return '<article class="panel execution"><h3>' + escape(record.target.provider + ' / ' + record.target.model) + '</h3>' +
      '<p class="' + (exceptional ? 'note' : 'muted') + '">' + escape(state) + '</p>' +
      (record.error ? '<p class="err">' + escape(record.error.message) + '</p>' : '') +
      (raw ? '<p class="muted">' + escape(
        'Model aktual ' + (raw.model ?? 'tidak dilaporkan') + ' · ' + locale.format(raw.latencyMs) +
        ' ms · Token masuk / keluar ' + (raw.usage.input ?? '—') + ' / ' + (raw.usage.output ?? '—') +
        ' · ' + new Date(record.created).toLocaleString('id-ID')) + '</p><details open><summary>Respons mentah provider</summary>' +
        '<pre class="answer">' + escape(raw.text) + '</pre></details>' : '') + '</article>';
  }).join('');
}
