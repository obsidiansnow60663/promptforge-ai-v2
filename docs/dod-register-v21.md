# Register DoD PromptForge v2.1

Audit 21 November 2026 WIB untuk Studio privat. Bukti dibedakan antara Worker dan Chromium lokal dengan respons tiruan, panggilan ArxPay nyata, dan pemeriksaan URL produksi. [Blueprint dan kriteria](blueprint.md) · [Riwayat rilis](brainstorming.md).

| DoD | Status | Bukti atau kriteria terbuka |
|---|---|---|
| §14.1, §15.1–15.2 · Prompt dan Generate Only | Implementasi teruji lokal | Alur bahasa Indonesia, klarifikasi, pemeriksaan literal dan revisi terbatas lulus. Review yang kehilangan rincian skor dicoba ulang secara terbatas, lalu menyimpan draf dengan peringatan jika gagal. Draf dengan banyak temuan tetap dapat disimpan. Preservasi semua persyaratan masih dinilai pada benchmark nyata. |
| §14.2, §10 · Antarmuka | Teruji lokal | Alur utama, keyboard, lebar 390 px, pemilih model, status proses dan buka ulang hasil diuji di Chromium lokal. Pengujian browser melalui akun pemilik di produksi masih terbuka. |
| §15.3 · Eksekusi ArxPay | Implementasi teruji lokal, bukti nyata historis | Jalur ArxPay bekerja pada bukti v13. Pengujian terbaru menemukan 19 ID, lalu berhenti pada permintaan pertama karena kuota. Pemilih hanya menampilkan model baru yang lolos. Dua alias yang melaporkan model aktual yang sama atau identitas yang tidak lengkap diberi peringatan pada hasil perbandingan. Uji dua model aktual masih terbuka. |
| §15.4–15.5 · Generate & Execute dan bahasa keluaran | Teruji lokal, bukti nyata historis | Versi yang disetujui, persetujuan eksplisit atas peringatan, hasil mentah, hasil adaptasi, dan metadata eksekusi diuji. Bukti real sebelumnya menghasilkan jawaban Indonesia. Kealamian, fakta, batasan kritis, dan kepatuhan bahasa seluruh benchmark belum terbukti. |
| §14.3, §15.6 · Data, migrasi dan pemulihan | Teruji lokal | Uji memasukkan prompt dan eksekusi ke skema sebelum migrasi 0005, menerapkan migrasi terbaru, lalu membuka, mengekspor, dan memulihkan keduanya. Identitas lain menerima 404 atau daftar kosong. Pengujian ini memakai Worker dan SQLite lokal. Bukti D1 historis tersedia, sedangkan buka ulang di browser produksi rilis terbaru masih terbuka. |
| §14.4, §11–12 · Keamanan dan keandalan | Teruji sesuai bukti | Secret tersimpan di Sites, origin provider tetap, redirect ditolak, input dibatasi, dan pembatalan mencegah panggilan provider lanjutan. Produksi menolak akses anonim. Uji browser dengan identitas pemilik masih terbuka. Kelanjutan otomatis di latar belakang setelah tab ditutup belum terverifikasi. |
| §8.6, §14.5, §15.7 · Benchmark dan mutu | Terbuka | Dataset 100 kasus dan dua baseline tersedia. Penilaian buta tiga agen mencakup seluruh 54 jawaban mentah pada 18 kasus pembanding v13, semua kategori Pemrograman. PromptForge mendapat 31/36 poin keberhasilan tugas, pembanding langsung 29/36 dan terjemahan literal 28/36. Seluruh dataset, penilaian manusia, target 95%, dan bukti peningkatan keberhasilan tugas masih terbuka. |
| §14.6, §15.8 · Rilis Sites | Sebagian terverifikasi | Aset dan otorisasi HTTP produksi diperiksa. D1 dan kebijakan akses khusus pemilik terdeteksi di Sites. Browser bersama gagal dimulai. Preview atau alur produksi yang memerlukan identitas pemilik tidak dapat dibuktikan lewat uji HTTP layanan. |

## Skenario penerimaan §16

| Skenario | Bukti | Status |
|---|---|---|
| AT-01–05 | Pipeline lokal menguji prompt jelas, klarifikasi, literal, revisi karena syarat tidak didukung, dan bahasa eksplisit. | Teruji lokal. Preservasi semantik berskala penuh terbuka. |
| AT-06–10 | Fixture menguji ID model pada payload, timeout dan retry, galat kredensial, penyimpanan token/latensi, serta adaptasi dan validasi. | Teruji lokal. Uji provider penuh rilis terbaru terbuka. |
| AT-11–12 | Isolasi identitas tiruan, buka ulang hasil setelah reload lokal, serta pemulihan cadangan. | Teruji lokal. Uji browser produksi terbuka. |
| AT-13–14 | Validasi masukan dan batas payload, draf peringatan dengan banyak temuan, serta galat provider yang dapat dibedakan. | Teruji lokal. Jalur kuota terkonfirmasi dengan ArxPay nyata. |
| AT-15–16 | Situs menolak pengunjung anonim. Uji migrasi menerapkan skema baru pada data lama dan memverifikasi ekspor serta pemulihan. | HTTP produksi dan migrasi lokal teruji. Identitas browser produksi dan persistence rilis terbaru terbuka. |
| AT-17–18 | Tes regresi menolak review yang mengaku lulus tanpa penilaian lengkap. Kegagalan adaptasi tetap membedakan hasil mentah dari jawaban tervalidasi. | Teruji lokal. |

Bukti audit per kasus dan batas cakupan tersedia di [audit semantik v13](../benchmark/evidence-semantic-v13.json). Bukti provider asli v13 dan penyebab cakupan berkurang ada di [laporan v13](../benchmark/evidence-dod-v13.json). Integrasi langsung vendor dan gerbang berbagi publik §17.3 berada di luar lingkup Studio privat sesuai konfigurasi pemilik.
