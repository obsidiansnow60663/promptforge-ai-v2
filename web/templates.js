export const templates = Object.freeze([
  { id: 'kode', domain: 'Pemrograman', title: 'Rancang fungsi dan pengujiannya',
    source: 'Buat fungsi [tujuan] menggunakan [bahasa]. Masukan: [struktur dan contoh]. Keluaran: [format]. Tangani [kasus tepi] dan sertakan pengujian untuk [perilaku penting].' },
  { id: 'otomasi', domain: 'Otomasi', title: 'Rancang alur otomatisasi',
    source: 'Rancang alur [proses] dari pemicu [kejadian] hingga hasil [keluaran]. Jelaskan input, langkah, penanganan gagal, dan titik persetujuan manusia. Pertahankan batasan [batasan].' },
  { id: 'riset', domain: 'Riset', title: 'Susun kerangka riset',
    source: 'Susun kerangka riset tentang [topik] untuk menjawab [pertanyaan]. Gunakan [sumber atau jenis bukti]. Jelaskan metode, keterbatasan, dan format hasil. Tandai klaim yang masih perlu diverifikasi.' },
  { id: 'bisnis', domain: 'Bisnis', title: 'Bandingkan opsi bisnis',
    source: 'Bandingkan [opsi] untuk mencapai [tujuan] dengan batas [anggaran, waktu, atau kapasitas]. Sajikan tabel manfaat, biaya, risiko, dan asumsi. Gunakan hanya data yang diberikan: [data].' },
  { id: 'konten', domain: 'Konten', title: 'Tulis naskah untuk audiens tertentu',
    source: 'Tulis [jenis naskah] tentang [topik] untuk [audiens]. Gunakan nada [nada], panjang [durasi atau kata], dan format [format]. Pertahankan fakta ini: [fakta].' },
  { id: 'data', domain: 'Analisis data', title: 'Rancang analisis data',
    source: 'Rancang analisis untuk [pertanyaan] berdasarkan [dataset, kolom, dan periode]. Tentukan metrik, perlakuan data kosong, pemeriksaan kualitas, serta format hasil [format]. Jangan mengisi data yang belum diberikan.' },
  { id: 'umum', domain: 'Umum', title: 'Buat rencana kerja',
    source: 'Buat rencana untuk [tujuan] selama [durasi] bagi [audiens]. Urutkan langkah, hasil setiap langkah, dan cara memeriksa kemajuan. Pertahankan batasan [batasan].' },
]);

export function templateLibrary(escape) {
  return '<div class="grid compare-grid">' + templates.map(template =>
    '<article class="panel template-card"><h2>' + escape(template.title) + '</h2>' +
    '<p class="muted">' + escape(template.domain) + '</p><p>' + escape(template.source) + '</p>' +
    '<button data-template="' + escape(template.id) + '">Gunakan templat</button></article>').join('') + '</div>';
}
