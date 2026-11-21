# Audit mutu PromptForge

21 November 2026 WIB. Pengujian mandiri memakai instruksi sintetis dan panggilan nyata ke ArxPay. Model yang diminta adalah `deepseek-v4.1-flash-bansos`. Respons melaporkan `deepseek-v4.1-flash`. Data pengguna Studio tidak dipakai. Pemeriksaan kode dan peninjauan sampel dilakukan oleh Codex. Penilaian tersebut bukan penilaian manusia.

## Cakupan DoD

| Kriteria | Bukti |
|---|---|
| §15.1–15.2, AT-01–05 dan AT-17 | Worker diuji mulai dari analisis, klarifikasi, peninjauan, hingga penyimpanan draf. Bahasa yang disebut secara eksplisit di instruksi mengikuti draf tersimpan. Kutipan sumber diperlukan untuk mengubah preferensi bahasa. Token kritis, termasuk kode reservasi dan persen, menolak draf yang mengubah nilai. Tes fixture mencakup maksimal dua revisi serta opsi asumsi yang harus dilihat dan disetujui lewat jawaban klarifikasi. |
| §15.3–15.5, AT-06–10 dan AT-18 | ArxPay nyata menjalankan draf tersimpan, adaptasi dan peninjauan keluaran. Kontrak langsung OpenAI, Anthropic dan Gemini lulus fixture. Secret yang tersedia di Sites hanya untuk ArxPay. |
| §15.6, AT-11–12 | Skenario nyata pada Worker lokal dan SQLite memeriksa buka kembali, Idempotensi, isolasi pemilik, ekspor dan impor. Pemeriksaan native Sites mengonfirmasi binding D1 serta tabel `versions`, `executions`, `execution_limits`, dan `prompt_generations` di deployment. |
| §14.2, §15.8, AT-13–16 | Riwayat pengujian mencakup validasi, kegagalan recoverable dan publikasi owner-only. Pemilik melaporkan bahwa generator versi 9 berfungsi. Browser cloud tetap gagal diinisialisasi. Pengujian visual, keyboard, akun non-pemilik yang terautentikasi dan jalur WebGPU belum selesai. |
| §15.7 | Laporan benchmark mencakup 100 kasus dalam enam kategori, tiga varian dan perbandingan pada subset yang mempunyai jawaban di semua varian. Audit mekanis menilai literal prompt dan penanda jawaban. Penilaian manusia, penilai model independen untuk semua kasus, dan 95% preservasi seluruh persyaratan belum dibuktikan. |

## Metode dan iterasi

Kedua baseline dan PromptForge memakai model eksekusi, bahasa jawaban, batas keluaran dan aturan sampling yang sama. Jawaban benchmark adalah hasil awal sebelum adaptasi. Uji end-to-end terpisah mencakup adaptasi, peninjauan dan pemulihan. Pemanggilan ulang optimizer mempertahankan jawaban baseline asli dan memeriksa kesamaan dataset, model dan pengaturan. Kegagalan dan permintaan klarifikasi tetap terhitung dalam total 100. Sampel yang bisa dibandingkan menggunakan irisan kasus dengan jawaban pada ketiga jalur.

| Temuan | Tindakan |
|---|---|
| Permintaan template, contoh SQL dan metode umum memicu klarifikasi meski placeholder cukup | Analisis membedakan kebutuhan atas materi yang belum diberikan dari pilihan implementasi yang bisa diasumsikan. Retest terarah pada 12 kasus yang awalnya belum menghasilkan jawaban menghasilkan 5 jawaban. Tujuh kasus masih meminta klarifikasi. |
| Jawaban eksplisit dalam bahasa Inggris berpotensi mengikuti preferensi awal Indonesia | Bahasa yang diidentifikasi bersama kutipan sumber diteruskan sampai eksekusi dan adaptasi. Uji reservasi R77 dengan preferensi Indonesia mengembalikan jawaban Inggris. |
| Prompt hitung CSV membatasi ekstensi huruf kecil tanpa dasar | Peninjau memeriksa penambahan kata pembatas dan pilihan implementasi. Retest menghasilkan prompt yang mempertahankan penjagaan file dan nama berspasi tanpa membatasi huruf kecil. |
| Contoh naskah hemat air memasukkan angka konsumsi dan statistik global tanpa sumber | Eksekusi dan peninjauan membedakan angka faktual, data yang diberikan, dan contoh yang diberi label. |
| Uji model penilai dari katalog tidak memberikan endpoint yang dapat digunakan | Qwen tidak tersedia. DeepSeek Pro, GPT, Gemini, GLM, Kimi dan MiniMax yang dicoba ditolak atau tidak diizinkan. Pelaporan menggunakan pemeriksaan deterministik dan analisis sampel. Keputusan pencapaian gerbang mutu manusia tetap terbuka. |

### Sampel yang ditinjau Codex

- `programming-09` mempertahankan `id-ID`, `Intl.NumberFormat`, dan permintaan kode serta kasus uji. Hasil memuat fungsi dan contoh. Contoh tampilan nilai mata uang masih dapat bervariasi menurut runtime.
- `automation-06` mempertahankan bahwa penolakan otomatis hanya berlaku tanpa tanggal. Jawaban awal menambahkan penghapusan entri dan payroll. Prompt retest lebih ringkas dan hanya menentukan transisi yang diminta.
- `research-09` mempertahankan URL dan menyatakan bahwa akses belum dikonfirmasi. Jawaban mengusulkan langkah verifikasi tanpa mengklaim telah mengunjungi sumber.
- `business-08` mempertahankan ketersediaan, respons dan eskalasi. Jawaban menyajikan checklist, tetapi angka SLA 99,5% hanya merupakan contoh.
- `content-02` mempertahankan waktu 60 detik dan audiens remaja. Jawaban awal menambahkan angka yang tidak memiliki sumber dalam instruksi.
- `general-01` mempertahankan 10 menit per hari dan audiens pemula. Jadwal menjabarkan tiga kegiatan dengan total 10 menit di hari-hari yang ditinjau.

## Putaran pertama benchmark live

Commit runner `62bbb94` memakai pipeline versi 9. Semua 100 kasus dicoba pada tiap varian.

| Varian | Jawaban tersedia | Penanda jawaban terdeteksi | Prompt dengan semua literal terukur utuh |
|---|---:|---:|---:|
| Instruksi Indonesia langsung | 100/100 | 97/100 | 46/46 |
| Terjemahan harfiah Inggris | 100/100 | 98/100 | 46/46 |
| PromptForge sebelum perbaikan | 39/100 | 37/39 | 15/15 |

Sebanyak 61 kasus PromptForge tidak mencapai jawaban. Sebanyak 48 meminta klarifikasi, 7 respons terpotong, 5 draf berperingatan dan 1 melewati tenggat. Skor literal menguji angka, pengenal, URL dan bentuk kode tertentu. Metrik itu belum mengukur cakupan seluruh persyaratan, ketepatan bahasa atau keberhasilan tugas.

## Uji end-to-end akhir

`scripts/self-check.mjs` melalui rute Worker yang sama dengan aplikasi, memakai ArxPay nyata dan database lokal terisolasi. Semua skenario memenuhi pemeriksaan mekanis, idempotensi, akses pemilik, versi, dan pemulihan hasil serta prompt. Ada 36 tes otomatis yang lulus pada build deployment.

| Skenario | Hasil |
|---|---|
| Git | Tepat 5 poin bernomor dan maksimal 20 kata per poin. Validasi otomatis selesai. |
| Reservasi R77 | Jawaban berbahasa Inggris mengikuti instruksi meski formulir awal menetapkan Bahasa Indonesia. Kode R77 dipertahankan. |
| Paket L-12 | Nama, tanggal `21/11/2026`, dan diskon `15%` tetap persis tanpa harga baru. |
| Naskah hemat air | Penanda waktu, durasi 60 detik, dan audiens remaja dipertahankan. Pemeriksaan tidak menemukan klaim jumlah liter atau statistik populasi yang tidak diminta. |
| Ringkasan survei | Alur meminta data yang benar-benar hilang, lalu menghasilkan tabel 25 dari 40 responden. Peringatan mencatat bahwa kategori responden lain tidak disediakan. Nilai dan batasan tetap utuh, hasil tidak diklaim sepenuhnya tervalidasi. |

## Verifikasi versi 10

Sites menyimpan versi 10 untuk commit `112cb62be9404b1f77876c1ef51eeb144bc6ce8b`. Deployment `appgdep_6b00ffbe22f08191b63a2832f2b2faa0` sukses. Audiens berisi satu pemilik tanpa grup. URL versi 10 memberi HTTP 200 untuk aset aplikasi dan benchmark melalui akses layanan Sites. Halaman utama anonim, API generator anonim dan API generator melalui akses layanan tanpa identitas pengunjung memberi HTTP 401. Pemeriksaan aset tidak menemukan nilai secret. Bukti ini melengkapi uji Worker lokal dan konfirmasi pengguna yang sudah tersedia untuk versi 9.

## Putaran kedua benchmark live

Optimizer dari commit `bb97781` diuji pada seluruh 100 kasus. Dua baseline disalin dari laporan asli dengan sidik SHA-256 `a91317ae7de908de3ad8912366f0df262166c1a281d4c2f782bc7fd38ffcadd5`. Pemanggilan optimizer dan eksekusi varian PromptForge memakai API nyata. Perubahan setelah commit tersebut berada pada peninjauan keluaran dan dokumen.

| Varian | Jawaban tersedia | Penanda jawaban terdeteksi | Prompt dengan semua literal terukur utuh |
|---|---:|---:|---:|
| Instruksi Indonesia langsung | 100/100 | 97/100 | 46/46 |
| Terjemahan harfiah Inggris | 100/100 | 98/100 | 46/46 |
| PromptForge setelah perbaikan | 76/100 | 76/76 | 34/34 |

Irisan ketiga jalur mencakup 76 kasus. Penanda jawaban terdeteksi pada Instruksi Indonesia langsung 73/76, Terjemahan harfiah Inggris 74/76, PromptForge setelah perbaikan 76/76. Status jalur PromptForge yang belum menghasilkan jawaban mencakup 15 klarifikasi, 3 respons terpotong, 4 draf berperingatan, 2 tenggat provider. Audit ini tidak menetapkan pencapaian 95% preservasi seluruh persyaratan atau peningkatan keberhasilan tugas.

Ringkasan per kasus dan sidik laporan disimpan dalam `benchmark/evidence-2026-11-21.json`.
