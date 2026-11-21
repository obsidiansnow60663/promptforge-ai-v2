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

## PF-002 · Fase 2 · 20 November 2026

Mesin bawaan adalah Qwen2.5-1.5B-Instruct-q4f32_1-MLC dengan WebLLM 0.2.79. Model berbobot publik dipilih sesuai arahan pemilik untuk jalur tanpa OpenAI Developers. Pengunduhan memakai Hugging Face dan GitHub setelah pengguna mengirim formulir. Inferensi memerlukan WebGPU, sekitar 1,8 GB memori grafis dan konteks 4096 token. Batas kapasitas bisa tercapai sebelum batas karakter antarmuka. Tinjauan semantik memakai permintaan terpisah ke model lokal yang sama. Hasil bukan bukti akurasi benchmark. Studio dan riwayat memakai akses pemilik. Tidak ada token provider pada jalur ini.

Worker menangani akses data, dengan D1 untuk versi dan kunci pemilik dari header identitas Sites. Setiap suntingan menyimpan versi baru dengan induknya. Pengulangan penyimpanan dengan ID yang sama menghasilkan satu versi. Riwayat menampilkan 200 versi terbaru; hapus sesi menghapus semua versinya. Laporan lokal adalah data dari perangkat pemilik dan bukan sertifikasi server. Draf sebelum pengiriman berada di memori tab. Simulasi v1 tetap tersedia di /simulasi/. Ekspor massal, uji pemulihan, benchmark dan eksekusi multi-provider belum tersedia.

Pengujian: enam skenario otomatis dengan respons model terkendali dan SQLite lulus, termasuk klarifikasi, dua revisi maksimum, penolakan struktur tidak valid, pemeriksaan angka dan laporan peringatan. Uji data mencakup dua identitas, versi, penghapusan dan pengiriman ulang. Browser pratinjau tidak menyediakan adapter WebGPU; jalur kesalahan diuji dengan instruksi bebas dan masukan dipertahankan. Inferensi sungguhan dan performa model belum terverifikasi pada perangkat ber-WebGPU. Gerbang MVP tetap terbuka.

Referensi model: https://webllm.mlc.ai/models/

### Uji mesin nyata melalui endpoint kompatibel

D1 deployment privat menyediakan binding DB dan tabel versions. URL privat meminta login ChatGPT. Pipeline juga dijalankan dengan adapter pengujian terhadap endpoint dan model deepseek-v4.1-flash-bansos yang ditentukan pemilik, hanya dengan instruksi sintetis. Pada kasus pengenalan Git, uji pertama berhenti dengan peringatan setelah dua revisi: peninjau meminta jawaban akhir saat menilai prompt Inggris. Setelah tugas peninjau diperjelas, pengujian yang sama menghasilkan tiga respons HTTP 200 dan status ready tanpa revisi. Prompt akhir mempertahankan tepat 5 poin, maksimum 20 kata per poin, audiens mahasiswa baru, Git, dan bahasa jawaban Indonesia. Sampel tunggal ini tidak mengukur mutu Qwen lokal. Endpoint pengujian dan kredensial tidak digunakan oleh aplikasi.

## PF-003 · Fase 3–6 · 21 November 2026

Implementasi mempertahankan Worker native, WebLLM, dan binding D1 `DB`. Build membundel modul server menjadi entrypoint Worker. Provider memakai HTTPS dengan endpoint tetap dan katalog model per lingkungan. Sites menyimpan rahasia, sementara browser menerima nama dan ketersediaan provider. Daftar konfigurasi produksi kosong ketika diperiksa. Akses HTTPS dari Worker ke provider masih belum dibuktikan oleh panggilan nyata. Streaming berada di luar alur ini.

D1 menyimpan eksekusi yang tertaut pada versi prompt, hasil mentah, status adaptasi/peninjauan, metrik, dan umpan balik. Impor dan ekspor JSON berbasis pemilik mencakup record tersebut. Riwayat versi privat ditinjau melalui kontrol akses Sites. Bukti pengujian, prosedur rotasi serta pemulihan, dan kriteria yang masih terbuka dicatat di [dokumen verifikasi](docs/verification.md).

## PF-004 · Agen server ArxPay · 21 November 2026

Pemilik memilih mesin DeepSeek melalui endpoint Chat Completions ArxPay. Bila secret `ARXPAY_API_KEY` aktif, Generator dan Klarifikasi menggunakan Worker tanpa WebGPU. Qwen lokal tetap bisa dipilih di Pengaturan. UI menyebut pemrosesan eksternal sebelum pengiriman. ArxPay juga tersedia sebagai pilihan eksekusi setelah persetujuan versi. USD, tarif dan kebijakan retensi provider tidak diukur.

Pipeline yang sama menjalankan analisis, klarifikasi, optimasi bahasa Inggris, dan review. Maksimal satu koreksi struktur dan dua revisi semantik. Worker membatasi satu penyusunan aktif per pemilik dan enam permintaan per menit, lalu melindungi retry dengan ID dan sidik masukan. Secret tersimpan di Sites dan hanya dikirim ke host provider tetap. Arsip cadangan tidak membawa kredensial, sidik masukan, atau antrean kerja agen.
