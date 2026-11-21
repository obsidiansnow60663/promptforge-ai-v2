import { executionCards, targets } from './execution.js';

function identityNotice(runs) {
  if (runs.filter(run => run.raw).length !== 2) return 'Dua jawaban mentah belum tersedia untuk dibandingkan.';
  const [first, second] = runs.map(run => run.raw.model);
  if (!first || !second) return 'ArxPay tidak melaporkan identitas kedua model aktual. Perbandingan model belum terverifikasi.';
  if (first === second) return 'Kedua pilihan mengarah ke model aktual yang sama (' + first + '). Pilih dua model aktual yang berbeda.';
  return '';
}

export function comparisonView({ settings, history, comparison, escape }) {
  const options = targets(settings, escape);
  const models = (settings?.providers ?? []).filter(item => item.configured)
    .flatMap(item => item.models.map(model => ({ provider: item.id, model })));
  const versions = history.map(row => '<option value="' + escape(row.session + '/' + row.version) + '">' +
    escape(row.title) + ' · v' + escape(row.version) + '</option>').join('');
  const input = models.length < 2 ? '<p>Perbandingan membutuhkan dua model terkonfigurasi.</p>' :
    !versions ? '<p>Simpan sebuah versi prompt sebelum membandingkan model.</p>' :
      '<form id="compare"><div class="group"><label for="compareVersion">Versi prompt</label><select id="compareVersion">' +
      versions + '</select></div><div class="grid">' +
      '<div class="group"><label for="firstModel">Model pertama</label><select id="firstModel">' +
      targets(settings, escape, { selectedModel: models[0] }) + '</select></div>' +
      '<div class="group"><label for="secondModel">Model kedua</label><select id="secondModel">' +
      targets(settings, escape, { selectedModel: models[1] }) + '</select></div></div>' +
      '<div class="group"><label for="reviewModel">Model adaptasi dan peninjauan untuk kedua hasil</label>' +
      '<select id="reviewModel">' + options + '</select></div>' +
      '<label class="execution-check"><input id="confirmCompare" type="checkbox" required> Saya setujui versi prompt ini dan memahami peringatan yang menyertainya.</label>' +
      '<button class="primary">Jalankan perbandingan</button></form>';
  const notice = comparison ? identityNotice(comparison.runs) : '';
  return '<section class="panel"><h2>Bandingkan dua model</h2><p>Kedua model menerima versi prompt dan batas keluaran yang sama. ' +
    'Satu model melakukan adaptasi dan penilaian kedua jawaban. Setiap eksekusi tersimpan di versi promptnya.</p>' + input +
    '</section>' + (comparison ? '<section class="section"><h2>Hasil perbandingan · Versi ' + escape(comparison.version) + '</h2>' +
      '<p class="muted">Latensi dan token pada kartu mengukur permintaan jawaban awal.</p>' +
      (notice ? '<p class="note" role="status">' + escape(notice) + '</p>' : '') +
      '<div class="grid compare-grid">' + executionCards(comparison.runs, escape, { feedback: false, settings }) +
      comparison.errors.map(error => '<p class="err">' + escape(error) + '</p>').join('') +
      '</div></section>' : '') +
    '<section class="section panel"><h2>Evaluasi benchmark</h2><p>100 kasus bahasa Indonesia dalam enam kategori. ' +
    'Metode membandingkan instruksi Indonesia asli, terjemahan harfiah, dan prompt teroptimasi dengan kondisi eksekusi yang sama.</p>' +
    '<p>Penilaian provider dan penilaian manusia masih diperlukan untuk mengukur peningkatan kualitas.</p>' +
    '<a href="#evaluasi">Lihat dasbor evaluasi</a></section>';
}
