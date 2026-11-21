const states = {
  running: 'Sedang diproses', finished: 'Tersimpan', complete: 'Validasi selesai',
  warning: 'Selesai dengan peringatan', failed: 'Gagal', cancelled: 'Dibatalkan',
  unconfirmed: 'Status belum terkonfirmasi',
};
const operationNames = { generate: 'Penyusunan prompt', execute: 'Eksekusi model' };
const time = new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short' });

export function cancelButton(item, escape, label = 'Batalkan') {
  return '<button type="button" data-cancel-kind="' + escape(item.kind) + '" data-cancel-id="' +
    escape(item.id) + '"' + (item.cancelling ? ' disabled' : '') + '>' +
    escape(item.cancelling ? 'Membatalkan…' : label) + '</button>';
}
export function operationsView({ data, error, loading, escape }) {
  if (loading) return '<p role="status">Memuat proses…</p>';
  const refresh = '<button type="button" id="refreshOperations">Muat ulang status</button>';
  if (error) return '<p class="err" role="alert">' + escape(error) + '</p>' + refresh;
  if (!data?.length) return '<p>Belum ada proses server yang tercatat.</p>' + refresh;
  return refresh + data.map(item => {
    const state = item.kind === 'generate' && item.status === 'finished' && !item.version ?
      'Klarifikasi diminta' : states[item.status] ?? item.status;
    return '<div class="listrow"><span><strong>' + escape(operationNames[item.kind]) + '</strong><br><small>' +
      escape(state) + ' · ' + escape(time.format(new Date(item.created))) + '</small></span><div class="actions">' +
      (item.version ? '<button data-open="' + escape(item.session) + '" data-version="' +
        escape(item.version) + '">Buka versi</button>' : '') +
      (item.status === 'running' || item.status === 'unconfirmed' ? cancelButton(item, escape) : '') + '</div></div>';
  }).join('');
}
