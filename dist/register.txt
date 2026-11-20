# PromptForge AI — Register Kapabilitas Sites

**Diperiksa 20 November 2026 (WIB).** Acuan produk adalah PFAI-SITES-BLUEPRINT v2.0.0. Status “terdokumentasi” berarti kontrak platform tersedia. Bukti ini berbeda dari hasil pengujian integrasi di deployment PromptForge. Hasil deployment dan uji akses dicatat di laporan pengujian.

| Kapabilitas | Ketersediaan dan bukti | Batas, dampak produk, dan keputusan |
|---|---|---|
| Runtime dan teknologi | Terdokumentasi dalam panduan Sites yang terpasang. Hosting menerima aset statis atau Worker ES module dengan handler fetch. | Gunakan HTML, CSS, dan JavaScript untuk interaksi fase 1. Tambahkan Worker native ketika fase 2 membutuhkan operasi server. |
| Basis data persisten | D1 didukung dalam kontrak binding dan dokumentasi platform [1]. | Riwayat lintas kunjungan perlu operasi server. Pada fase persistensi, aktifkan binding, terapkan migrasi, batasi setiap operasi ke pemilik, lalu uji muat ulang dan penghapusan. |
| File dan unggahan | R2 didukung [1]. Kontrak binding menempatkan akses bucket di sisi server. | Formulir fase 1 menerima teks. Sebelum menawarkan unggahan, uji ukuran objek, otorisasi baca/tulis, penghapusan dan pemulihan dengan file contoh. |
| Identitas pengunjung | Dokumentasi autentikasi runtime menjelaskan header ID pengguna yang stabil dalam satu Site. Pengaturan audiens dan login aplikasi memiliki fungsi tersendiri [2]. | Untuk sesi persisten, peroleh ID dari request tepercaya di server. Uji pengguna berbeda dengan record sintetis sebelum berbagi. |
| Akses dan berbagi | Daftar proyek pada akun ini menunjukkan workbench v6 berakses publik. Sites menyediakan deployment privat untuk pemilik [2]. | Gunakan proyek privat terpisah untuk fase 0–1 agar alur simulasi tidak menggantikan aplikasi publik. Periksa audiens sesudah deploy, uji URL dengan identitas yang sesuai, lalu catat hasilnya. |
| Konfigurasi rahasia | Kontrak runtime dan kontrol environment variables tersedia. Pengaruh rotasi terhadap deployment bergantung pada mode hosting [2]. | Fase 1 tidak memerlukan kunci. Saat integrasi, pemilik mengelola secret khusus provider di Sites. Rotasi atau cabut di provider dan perbarui Sites, deploy sesuai mode, lalu uji. Batas akses editor berlaku [3]. |
| HTTPS keluar | HTTP(S) dan WebSocket didukung. TCP mentah tidak tersedia [1]. Akses dari Worker ke masing-masing host OpenAI, Anthropic, dan Gemini belum diuji. | Uji endpoint ringan per provider dari deployment, dengan tenggat waktu dan tanpa merekam credential. Kegagalan satu provider harus terlihat dan pilihan pengguna tetap berlaku. |
| Streaming dan tugas lama | Dukungan protokol tersedia [1]. Streaming token per provider, batas durasi, pembatalan, dan kelanjutan setelah browser menutup belum diverifikasi. | Pratinjau fase 1 tidak membutuhkannya. Mulai dengan request yang dibatasi waktu. Aktifkan streaming setelah uji token pertama, interupsi, dan hasil akhir. |
| Kuota dan penggunaan | D1 sampai 10 GB per Site. R2 tanpa batas tetap per Site. Pembuatan dan penyuntingan memakai kuota Codex. Kuota hosting dan penyimpanan berlaku terpisah dan dapat dibagi antar-Site [1, 2]. Panduan runtime menyebut memori Worker 128 MB per isolate. | Sisa kuota akun, kapasitas trafik dan batas waktu efektif belum diukur. Batasi ukuran payload dan konkurensi sebelum mengaktifkan eksekusi berbayar. |
| Backup, ekspor, pemulihan | Versi kode dan ekspor sumber didokumentasikan. Pemulihan versi tidak memulihkan D1 dan R2. Pemulihan gabungan otomatis ke Site baru tidak tersedia [2]. | Saat persistensi ditambahkan, sediakan ekspor record per pemilik berikut versi skema, serta manifest objek jika ada file. Uji impor pada data sintetis, cek jumlah record, tautan versi dan checksum objek. |

## Lingkup dan keputusan

- Fase 0–1 mencakup navigasi privat, dashboard, generator, pilihan mode, validasi formulir, peninjauan, status dan bantuan. Contoh transformasi dan eksekusi diberi label simulasi.
- MVP fungsional memerlukan Generate Only independen, ringkasan intent dan kendala, review maksimal dua revisi, Generate & Execute pada model pilihan, keluaran Indonesia yang divalidasi terpisah, dan persistensi berbasis pemilik. Fase 2–4 menyediakan komponen tersebut. Fase 5 mengevaluasi hasil dan fase 6 memverifikasi keamanan serta pemulihan.
- Keputusan arsitektur fase 1 berlaku dalam lingkup yang diminta pemilik. Belum ada persetujuan tambahan untuk infrastruktur eksternal, integrasi berbayar, atau perluasan audiens.
- Catatan keputusan PF-001, 20 November 2026. Target privat terpisah memenuhi gerbang §17.1 tanpa memigrasikan data publik. FR-07/08 memakai alur simulasi pada fase 1 sesuai §19.5. Kriteria penerimaan produk tetap mengikuti blueprint.

## Sumber

1. [ChatGPT Learn — Sites, runtime dan batas penyimpanan](https://learn.chatgpt.com/docs/sites)
2. [OpenAI Help Center — Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)
3. [OpenAI Help Center — Understanding responsibilities for your ChatGPT Sites](https://help.openai.com/en/articles/20001337-understanding-responsibilities-for-your-chatgpt-sites)

Rujukan teknis tambahan yang diperiksa pada lingkungan ini mencakup panduan runtime Sites, storage serta identity-and-secrets yang terpasang bersama integrasi Sites.

## Bukti proyek dan pengujian fase 0–1

Pada 20 November 2026, kontrol akses Site baru menunjukkan satu pemilik pada daftar akses custom. Proyek workbench publik versi 6 diperiksa secara baca-saja. Pratinjau menggunakan HTML, CSS dan JavaScript statis; tidak ada dependensi eksternal atau panggilan AI. Semua masukan dan draf berada di memori halaman hingga dimuat ulang. Data dinamis di-escape saat ditampilkan.

Lulus pada pratinjau browser desktop: dasbor kosong; formulir kosong memunculkan kesalahan; contoh jelas menghasilkan draf Inggris tanpa langkah eksekusi; contoh ambigu meminta tingkat dan format; persetujuan menampilkan jawaban contoh dan status kualitas terpisah; penyimpanan sementara dan pembukaan kembali memulihkan hasil simulasi. Pemeriksaan sintaks JavaScript lulus. CSS memakai navigasi horizontal dan satu kolom pada layar kecil. Pengujian perangkat fisik dan identitas pengunjung kedua masih terbuka. Gerbang MVP dan rilis publik belum tercapai.
