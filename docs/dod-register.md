# Register DoD PromptForge v2.0

Audit 21 November 2026 WIB. Bukti di bawah memakai Site khusus pemilik. Nama pemilik, instruksi pribadi, dan data produksi yang sudah ada tidak diambil untuk pengujian. Detail putaran sebelumnya ada di [audit mutu](quality-audit.md) dan [verifikasi implementasi](verification.md).

## Dapat dikerjakan dan sudah diperiksa

| Bagian blueprint | Kriteria yang diperiksa | Bukti |
|---|---|---|
| §14.1, §15.1–15.2 | Masukan Indonesia, tujuan, konteks, batasan, hasil yang diminta, struktur dan bahasa draf, analisis ambiguitas, pemisahan sumber/draf, warning, maksimal dua revisi, Generate Only independen | Fixture pipeline dan uji ArxPay nyata. Draf diperiksa terhadap sumber sebelum tersimpan. Angka, URL, kode, pengenal dan persen tertentu diperiksa deterministik. Kehilangan literal menghalangi persetujuan otomatis. Bahasa eksplisit memakai kutipan dari masukan. |
| §14.1–14.2, §15.2 | Label dan validasi form, state kosong/loading/sukses/peringatan/gagal, draf dan jawaban dibedakan, input dapat dipertahankan pada kegagalan, kontrol sunting/salin, ringkasan dan batasan terlihat | Diperiksa pada kode UI dan kontrak API. Simpan/ulangi diuji melalui Worker. Bukti operasi pointer, fokus keyboard dan ukuran layar pada browser masih parsial. |
| §14.3, §15.4, §15.6 | Sesi, penyimpanan versi, hasil tertaut, pemisahan data sementara dan tersimpan, baca setelah permintaan baru, isolasi, penghapusan, ekspor dan impor | Dua permintaan HTTP ke Worker produksi versi 11 memakai identitas sintetis pada rute normal dan binding D1. Uji meliputi simpan idempoten, baca lintas permintaan, data pemilik kedua kosong, audit hasil, ekspor dua jenis record, impor versi dan hasil ke pemilik sintetis kedua, verifikasi isi dan hapus berantai. Data uji dibersihkan. |
| §14.4 | Rahasia tersimpan di Sites, kredensial tidak ada pada respons atau aset yang diperiksa, host provider tetap, redirect ditolak, input/hasil teks dianggap tidak tepercaya, pesan galat aman, kontrol akses | Secret tercatat sebagai secret Sites. Fixture memeriksa origin, MIME, batas isi, jaringan provider, sanitasi galat dan tanpa penerusan kredensial. Kode UI menampilkan teks dengan escape. URL menolak akses tanpa identitas. Tidak ada publikasi publik. |
| §15.3 | Kontrak bersama, pemilihan provider/model, identitas model aktual, token dan latensi, kategori galat, batas waktu dan retri, draft tetap tersedia ketika provider bermasalah, pengujian berulang | ArxPay diuji end-to-end. Kontrak OpenAI, Anthropic dan Gemini lulus fixture HTTP. Endpoint langsung tiga provider itu tetap memerlukan verifikasi nyata. |
| §15.4 | Persetujuan atas versi atau warning, hasil mentah/hasil adaptasi, status eksekusi, pencatatan metrik, membuka kembali | Fixture dan uji jalur Worker nyata. Di produksi operasi sintetis mendapati versi tersimpan dan hasil yang sudah diadaptasi di permintaan berikutnya. Status lengkap baru digunakan setelah validasi. |
| §15.5 | Bahasa default Indonesia, bahasa eksplisit, format, angka, tanggal, nama, pengenal, URL, istilah, peringatan bila hasil belum dapat divalidasi, output mentah dibedakan | Uji otomatis, sampel live, dan pemeriksaan kualitatif Codex. Audit sampel menandai klaim/format yang masih perlu diperiksa. Bukti menyeluruh tentang kealamian, fakta, dan preservasi semantik masih terbuka. |
| §14.5, §15.7 | 100 kasus, kategori, sumber, rubrik, tiga varian, kondisi sebanding, metadata dataset/model, pemisahan audit draf/hasil, kegagalan kritis dan keterbatasan terlihat | Benchmark live dengan dua kontrol tetap, audit mekanis dan uji lalu uji ulang kasus yang gagal. Model yang dipakai untuk menghasilkan jawaban adalah DeepSeek via ArxPay. Pemeriksaan Codex atas sampel memberi bukti independen terbatas. |
| §14.6, §15.8 | Register kapabilitas, sumber dan deployment tersimpan, uji URL, batas pemulihan, penggunaan dan penyimpanan, audiens owner-only | Versi privasi diverifikasi melalui Sites. Uji HTTP dan probe D1 dilakukan pada URL asli. Prosedur pemulihan, kuota dan dampak restore versi kode tetap tercatat dalam register. Probe sementara ditutup setelah pengujian. |

## Ketergantungan yang masih terbuka

| DoD | Bukti yang masih dibutuhkan | Mengapa belum dapat ditutup sekarang |
|---|---|---|
| §15.3 dan §15.8 · Integrasi yang diwajibkan berjalan pada layanan asli | HTTP live dengan OpenAI Responses, Anthropic Messages dan Google Gemini | Environment Sites hanya memiliki secret ArxPay. Akses ArxPay ke DeepSeek membuktikan jalur kompatibel. Model-model lain yang dicoba melalui kunci tersebut menolak akses atau tidak tersedia. |
| §15.7 · Evaluasi manusia dan semantik independen | Penilaian manusia dengan rubrik atas jawaban benchmark dan penilaian independen berskala penuh | Codex melakukan audit sampel tanpa penilai manusia. Kunci ArxPay yang tersedia belum memberikan model kedua yang dapat digunakan. Laporan dan format impor penilaian manusia siap di runner. |
| §8.6, §14.1, §15.1 dan §15.5 · Gerbang mutu | Preservasi 95% atas seluruh persyaratan, tidak ada perubahan batasan kritis, mutu dan kepatuhan bahasa, dan pembuktian keberhasilan tugas yang lebih baik | Pemeriksaan literal dan sampel tidak mengukur seluruh persyaratan. Klarifikasi yang diperlukan, draf berperingatan, respons terpotong dan batas waktu dihitung sebagai kasus tanpa jawaban. |
| §14.2, §14.4, §14.6 dan §15.8 · Browser dan identitas pengunjung | Tampilan responsif, pointer dan keyboard, sign-in pada akun pemilik dan kasus penolakan akun non-pemilik yang benar-benar terautentikasi, preview WebGPU | Inisialisasi browser cloud gagal. Uji HTTP dan identitas sintetis memakai jalur yang tepat untuk akses API/SQL, tanpa menjadi sesi login browser. Konfirmasi pemilik sebelumnya hanya mencakup generator versi 9. |
| §15.8 · Konten publik | Pemeriksaan materi yang akan dirilis publik | Saat ini tidak berlaku. Site dipertahankan hanya untuk pemilik. |

## Pengujian tambahan di Sites

Versi 11 menjalankan probe sementara dengan secret terpisah yang kedaluwarsa dan akses layanan Sites. Probe tanpa secret mengembalikan HTTP 401. Fase tulis menjalankan ArxPay nyata untuk menyusun, meninjau, mengeksekusi, mengadaptasi dan memvalidasi prompt Git. Fase baca di permintaan baru mengonfirmasi D1 menyimpan data dan menjalankan pemulihan per pemilik dengan benar. Tidak ada record pengguna yang diedit. Rute probe dan secret uji tidak dibawa ke rilis berikutnya.

## Audit sampel oleh Codex

| Kasus sintetis | Draf | Jawaban awal dan umpan balik |
|---|---|---|
| Go konfigurasi | Mempertahankan penolakan field asing, pesan galat, dan satu blok Go. | Menggunakan `DisallowUnknownFields` dan merambatkan error. Pemeriksaan trailing JSON dengan `Decoder.More` masih lemah dan perlu uji teknis tambahan. |
| Prompt klasifikasi tiket | Mempertahankan tiga tag dan identitas tiket. | Jawaban awal mencampur Markdown dan blok JSON serta menambahkan field confidence dan reason. Eksekutor kini diperintahkan mempertahankan kontrak persis. |
| Metode akses kerja | Meminta definisi akses dan pembedaan korelasi dari kausalitas. | Mengoperasionalkan akses dan membahas identifikasi kausal. Atribusi pustaka yang muncul tidak diverifikasi. |
| SWOT sabun isi ulang | Meminta matriks dan melarang angka pasar rekaan. | Menandai asumsi, tetapi beberapa pernyataan tren disebut fakta tanpa bukti. Tidak terlihat angka pasar dalam sampel yang ditinjau. |
| Naskah hemat air | Mempertahankan penanda waktu, 60 detik dan larangan klaim tanpa sumber. | Naskah mencapai 01:00 dan tidak menambahkan angka penggunaan air atau statistik populasi. |
| Pembagian 12 buku | Mempertahankan 12, 3, dan format operasi hitung. | Operasi 12 dibagi 3 menghasilkan 4 buku per kelompok. |

Audit sampel bersifat kualitatif. Ia membantu menentukan perbaikan berikutnya dan tidak digunakan untuk menyatakan skor 95% atau klaim bahwa PromptForge lebih baik dari baseline.

## Loop perbaikan terarah

- Dari 24 kasus yang belum menghasilkan jawaban di putaran sebelumnya, uji ulang awal menghasilkan 10 jawaban. Sepuluh kasus meminta klarifikasi, tiga tertahan karena peninjauan semantik belum selesai, dan satu mendapat keluaran provider tidak lengkap. Uji ini memakai kembali dua kontrol dengan dataset dan pengaturan yang sama.
- Peninjau diperbaiki agar mengenali bahwa menulis prompt atau kontrak bisa menjadi hasil yang diminta. Instruksi analisis menyatakan pilihan implementasi dapat tetap berupa placeholder. Budget respons untuk review dinaikkan sambil mempertahankan batas dua revisi.
- Uji ulang lanjutan terhadap empat kasus non-klarifikasi menghasilkan tiga jawaban. Kasus pengumuman kerja bakti tetap meminta tanggal dan rincian kegiatan. Tanggal yang belum diberikan tidak diisi dengan fakta rekaan.
- Uji alur terpisah menghasilkan kontrak JSON valid dengan tepat dua field dan tiga tag yang diizinkan. Matriks penilaian membedakan klaim dan bukti setelah dua artikel sintetis diberikan. Agenda hanya memuat tiga prioritas setelah catatan sintetis diberikan. Ketiganya lulus validasi model dan pemeriksaan simpan/pulihkan.
- Paket penilaian 228 jawaban untuk 76 kasus sebanding berhasil dibuat dari putaran versi 10. Pemetaan ID diuji dengan satu penilaian fixture dan validasi sidik laporan. Paket tidak dikirim kepada siapa pun. Nilai fixture tidak menjadi bukti penilaian manusia.

## Verifikasi rilis

Versi 12 disimpan dari commit `9106a873c765b88026ddd851af4bcabcb891fca6` dan deployment `appgdep_6b01069b67f081918d9c3c38cf5a8eec` berstatus sukses. Versi ini memakai environment revisi 5 yang kembali hanya memiliki secret ArxPay. Site mempunyai satu pemilik dan tanpa grup. URL mengembalikan HTTP 200 untuk aset aplikasi dan benchmark lewat akses layanan. Generator memerlukan identitas pengunjung. Rute probe menolak kunci uji lama dengan HTTP 401. Sebanyak 36 tes otomatis lulus sebelum deploy.

## Hasil akhir benchmark 100 kasus

Benchmark menguji optimizer commit `9106a87` yang ada pada versi 12, dengan baseline awal yang sama. Ketiga jalur memakai pengaturan eksekusi yang sama. Hasil berikut berasal dari panggilan nyata ke ArxPay.

| Varian | Jawaban tersedia | Penanda jawaban terdeteksi | Prompt dengan semua literal terukur utuh |
|---|---:|---:|---:|
| Instruksi langsung | 100/100 | 97/100 | 46/46 |
| Terjemahan harfiah | 100/100 | 98/100 | 46/46 |
| PromptForge | 79/100 | 78/79 | 38/38 |

PromptForge memiliki 21 kasus tanpa jawaban. Ringkasan status

- `clarify` 9
- `provider_incomplete` 1
- `warning` 3
- `provider_timeout` 8

Ada 79 kasus dengan jawaban pada semua jalur. Audit literal berlaku pada kasus yang menyertakan token terukur. P50 dan P95 latensi jawaban awal PromptForge masing-masing 5674 ms dan 21206 ms. Angka mencakup permintaan provider yang menghasilkan jawaban. P50 jumlah waktu panggilan optimizer adalah 24793 ms. Metrik ini tidak mengukur waktu interaksi browser atau adaptasi.

Patch Node.js lulus pemeriksaan penerusan galat, pemisahan versi dan pemulihan. Draf mendapat persetujuan model sebelum eksekusi.

Hasil per kasus, sidik laporan, uji D1 dan bukti uji ulang ada di `benchmark/evidence-dod-v12.json`. Semua penilaian manusia tetap kosong.
