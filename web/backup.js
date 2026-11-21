const kinds = ['versions', 'executions'];
const fileLimit = 32 * 1024 * 1024;

export function backupView(escape, ready, filename) {
  return '<section class="section panel"><h2>Cadangan data</h2>' +
    '<p>Ekspor versi prompt, hasil eksekusi yang sudah selesai, dan umpan balik. Simpan file di tempat privat.</p>' +
    '<div class="actions"><button id="exportAll">Siapkan cadangan seluruh data</button>' +
    (ready ? '<a id="downloadBackup" href="' + escape(ready.url) + '" download="' +
      escape(ready.name) + '">Unduh cadangan</a>' : '') + '</div>' +
    '<form id="restore"><div class="group"><label for="backupFile">File cadangan JSON</label>' +
    '<input type="file" id="backupFile" accept="application/json,.json" required></div>' +
    (filename ? '<p class="muted">File terakhir: ' + escape(filename) + '</p>' : '') +
    '<p>Data yang sama dapat diimpor ulang. Jika ada konflik, data yang tersimpan dipertahankan.</p>' +
    '<button>Impor cadangan</button></form></section>';
}

export async function makeBackup(api, session) {
  const parts = ['{"format":"promptforge-backup","schema":1,"created":' + JSON.stringify(new Date().toISOString()) + ',"pages":['];
  let count = 0;
  let size = parts[0].length;
  const encoder = new TextEncoder();
  for (const kind of kinds) {
    let cursor = 0;
    do {
      const query = new URLSearchParams({ kind, cursor });
      if (session) query.set('session', session);
      const page = await api('export?' + query);
      if (page.rows.length) {
        const part = (count++ ? ',' : '') + JSON.stringify({ schema: page.schema, kind, rows: page.rows });
        size += encoder.encode(part).length;
        if (size + 2 > fileLimit) throw Error('Cadangan melebihi 32 MB. Unduh per sesi melalui versi yang tersimpan.');
        parts.push(part);
      }
      cursor = page.next;
    } while (cursor !== null);
  }
  parts.push(']}');
  const blob = new Blob(parts, { type: 'application/json' });
  return { url: URL.createObjectURL(blob), name: 'promptforge-' + (session ?? 'semua') + '-' +
    new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }) + '.json' };
}

export async function restoreBackup(api, file) {
  if (!file || file.size > fileLimit) throw Error('Pilih cadangan JSON hingga 32 MB.');
  let snapshot;
  try { snapshot = JSON.parse(await file.text()); } catch { throw Error('File cadangan bukan JSON yang valid.'); }
  if (snapshot?.format !== 'promptforge-backup' || snapshot.schema !== 1 || !Array.isArray(snapshot.pages) ||
    !snapshot.pages.every(page => page?.schema === 1 && kinds.includes(page.kind) &&
      Array.isArray(page.rows) && page.rows.length > 0 && page.rows.length <= 10)) {
    throw Error('Format atau versi cadangan belum didukung.');
  }
  let accepted = 0;
  for (const kind of kinds) {
    for (const page of snapshot.pages.filter(page => page.kind === kind)) {
      try {
        accepted += (await api('restore', page)).accepted;
      } catch (error) {
        throw Error(error.message + ' ' + accepted + ' record sudah dikonfirmasi. Anda dapat mengimpor ulang file ini.');
      }
    }
  }
  return accepted;
}
