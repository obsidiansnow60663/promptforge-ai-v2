# Bukti implementasi Fase 3–6

**21 November 2026 WIB.** Acuan PFAI-SITES-BLUEPRINT v2.0.0. Basis yang diverifikasi adalah deployment versi 3 dengan commit `515596e24ce3a6eb6777774c3956134bf1dfd798`. Enam regresi awal lulus dan riwayat `main` belum memuat perubahan Fase 3–6.

## Pengujian lokal

| Kriteria blueprint | Bukti dan status |
|---|---|
| §14.1, §14.2 dan §15.1–15.2 · Generate Only, validasi, klarifikasi, revisi, sunting dan simpan | Enam skenario Fase 2 tetap lulus. Uji mengonfirmasi pemisahan draf, maksimum dua revisi, kegagalan format, angka kritis dan status review yang tidak lengkap. Tinjauan kealamian prompt dan kasus jalur WebGPU nyata masih terbuka. Label form, status dan grid responsif diperiksa pada sumber. Interaksi pointer, keyboard dan perangkat belum diverifikasi melalui browser pada sesi ini. |
| §14.3 dan §15.6 · Sesi dan versi | SQLite menguji penyimpanan, retri tanpa duplikasi, versi induk, isolasi antaridentitas, hapus berantai, dan pembacaan data dalam permintaan baru. Daftar riwayat terbaru dibatasi 200 versi dan 30 hasil per versi. Ekspor memakai halaman terpisah. |
| §14.4, §15.8 · Keamanan dan akses | Pemisahan identitas server, Origin untuk perubahan, MIME dan batas ukuran, kueri berparameter, izin pemilik, fixture penyamaran pesan provider, batas eksekusi, dan penolakan konflik impor diuji. UI menyajikan konten dinamis sebagai teks yang di-escape. Tidak ada tool provider atau eksekusi kode dari prompt. Kontrol audiens Sites dikonfirmasi hanya untuk pemilik. Uji akun non-pemilik terautentikasi masih diperlukan untuk verifikasi perilaku akses. Site publik tidak dibuat. |
| §15.3 · Multi-provider | Fixture kontrak OpenAI Responses, Anthropic Messages dan Gemini generateContent lulus. Endpoint, header, data hasil, model aktual, token, latensi, konfigurasi yang hilang, galat permanen, kuota, time-out dan retri 5xx diperiksa. Jalur live tiap provider memerlukan secret Sites dan bukti HTTPS dari Worker. |
| §15.4 · Generate & Execute dan Execute Existing Prompt | Uji Worker + SQLite membuktikan prompt tersimpan persis yang dikirim, konfirmasi untuk versi berperingatan atau suntingan, hasil tersimpan, data per pemilik, dan ID permintaan berulang. Bila respons hilang, UI dapat memeriksa ulang riwayat versi. Eksekusi provider dan pembacaan hasil autentikasi melalui browser belum diverifikasi. |
| §15.5 · Output Intelligence | Fixture menguji Bahasa Indonesia, tanggal, persen, URL, referensi, kode, nama, perubahan kritis yang mengalahkan penilaian positif, kegagalan adaptasi dan peninjauan tidak lengkap. Tinjauan model mengevaluasi tujuh dimensi dalam permintaan terpisah. Kealamian, istilah, makna, audiens, format dan konsistensi fakta tetap perlu penilai manusia atas keluaran provider nyata. |
| §15.7 · Evaluasi dan perbandingan | Dataset memiliki 100 kasus unik di enam kategori, tujuan, batasan, format, bahasa, rubrik dan kegagalan kritis. Runner fixture menghasilkan 100 rekaman per varian. Perbandingan memakai draft sama dan satu target adaptasi serta peninjauan untuk kedua jawaban. Uji fixture memverifikasi target penilai dan umpan balik berbasis pemilik. Penilaian live, manusia, 95% preservasi, perbaikan task success dan regresi bahasa masih terbuka. |
| §9.7, §14.3 dan §15.6 · Cadangan dan pemulihan | Uji sintetis mengekspor lebih dari satu halaman, memulihkan versi, induk, hasil dan umpan balik, menolak eksekusi tanpa versi, mencegah overwrite dan membatalkan satu batch konflik secara atomik. Ekspor/impor autentikasi di deployment masih perlu dibuktikan. |
| §14.5, §14.6, §15.8 · Verifikasi rilis | `npm test` membangun Worker lalu menjalankan 24 tes. Preview browser belum berhasil karena relay CLI tidak siap dan browser cloud tidak dapat diinisialisasi. Bukti deployment dan HTTP dicatat terpisah. Gerbang MVP dan review akhir menunggu provider nyata, uji browser autentikasi, regresi deployment, serta penilaian manusia. |

## Skenario penerimaan §16

| Skenario | Bukti |
|---|---|
| AT-01–AT-04 | Fixture pipeline untuk instruksi jelas, klarifikasi, angka ketat, dan review yang menghalangi penerimaan. Pemeriksaan penambahan yang masuk akal masih perlu sampel nyata dan penilaian manusia. |
| AT-05–AT-10 | Pilihan bahasa, model, retri, status kredensial, metadata dan output terpisah tersedia. Kontrak dan hasil contoh diuji dengan HTTP tiruan. Uji provider nyata dan kualitas bahasa tetap terbuka. |
| AT-11–AT-12 | Worker + SQLite membuktikan isolasi dan pembacaan kembali. Uji pengguna terautentikasi terhadap D1 live masih terbuka. |
| AT-13–AT-14 | Fixture menolak input dan konfigurasi invalid. Teks sumber dipertahankan oleh state UI. Pengujian interaksi browser masih terbuka. |
| AT-15–AT-16 | Kontrol akses Sites dan versi sumber diperiksa. Verifikasi akses dan regresi deployment dicatat terpisah. |
| AT-17–AT-18 | Tes peninjauan yang terputus, adaptasi gagal dan konflik nilai tidak menampilkan status tervalidasi. |

## Operasi dan pemulihan

- Pemilik menyediakan secret provider lewat pengaturan environment Sites. Model yang dapat dipilih berasal dari daftar `OPENAI_MODELS`, `ANTHROPIC_MODELS` dan `GEMINI_MODELS` yang diisi menurut model yang benar-benar dapat diakses. Daftar dipisahkan koma. Profil opsional menggunakan `PROMPTFORGE_QUALITY_MODEL`, `PROMPTFORGE_BALANCED_MODEL` atau `PROMPTFORGE_FAST_MODEL` dengan format provider/model yang tersedia. Situs mengecek pasangan key dan daftar model. Key hanya digunakan oleh Worker ke host yang telah ditentukan.
- Untuk rotasi, buat pengganti dengan lingkup minimum di konsol provider, perbarui secret Sites, deploy kembali, uji satu kasus sintetis, lalu cabut key lama. Untuk menonaktifkan provider, hapus secret di Sites dan deploy. Jawaban yang dikirim untuk adaptasi dapat diteruskan ke provider penilai yang dipilih pengguna.
- Eksekusi memiliki dua percobaan maksimum. Retri otomatis hanya untuk respons gangguan eksplisit 5xx. Setiap percobaan memiliki tenggat 10 detik. Satu hasil dapat memerlukan tiga panggilan provider. Batas aplikasi 12 eksekusi per menit dan 3 aktif dalam jendela 2 menit per pemilik. Metrik yang ditampilkan mengukur jawaban awal. Jejak adaptasi dan penilaian juga tersimpan. Token bukan estimasi biaya.
- Gunakan **Pengaturan → Cadangan data**. Siapkan dan unduh JSON privat. Cadangan seluruh data dibatasi 32 MB dalam browser. Jika perlu, gunakan cadangan per sesi dari versi tersimpan. Tunggu eksekusi selesai dan hindari perubahan data saat mengekspor. Ekspor berhalaman tidak menyediakan snapshot transaksi lintas halaman. Operasi yang masih berstatus running tidak disertakan.
- Untuk memulihkan, pilih file di Pengaturan. Versi dipulihkan sebelum hasil. Impor dilakukan per halaman maksimal 10 record dan 2 MiB per permintaan. Setiap halaman konsisten, dan file bisa diimpor ulang. Jika konflik, halaman tersebut dibatalkan. Halaman yang sudah diterima tetap tersimpan. Bandingkan jumlah dan relasi versi setelah pemulihan. Impor menggunakan identitas pemilik tujuan.
- Penghapusan sesi menghapus versi, hasil dan umpan balik. Metadata teknis pembatasan memuat ID permintaan dan waktu, lalu dibersihkan ketika pemilik menjalankan operasi berikutnya setelah 24 jam. Bindings R2 tidak dipakai. Pemulihan versi kode Sites tidak memulihkan D1. Cadangan otomatis dan pemulihan atomik seluruh file tidak tersedia.

## Rujukan kontrak provider

- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages)
- [Google Gemini generateContent](https://ai.google.dev/api/generate-content)

## Bukti deployment privat

| Pemeriksaan | Hasil |
|---|---|
| Versi sumber | Sites menyimpan versi 4 untuk `3cff6da2afd843d3bc58e0e0b5104574811b5d9e` dengan arsip Worker dan migrasi D1. |
| Publikasi | Deployment `appgdep_6b00eaea3a0481918ce05ea726f3535e` berstatus `succeeded`. |
| Kebijakan akses | Setelah deploy, Sites melaporkan satu pemilik, tanpa grup dan tanpa pengunjung eksternal. |
| URL anonim | GET `/` dan `/api/history` mengembalikan HTTP 401. |
| URL melalui akses layanan Sites | GET `/`, `/backup.js`, dan `/benchmark.txt` mengembalikan HTTP 200. Respons berisi CSP Worker dan aset Fase 5–6. |
| API tanpa identitas pengunjung | GET `/api/status` dan `/api/export?kind=versions` mengembalikan HTTP 401 meskipun menggunakan akses layanan Sites. |
| Identitas pengguna dan data | Browser cloud gagal diinisialisasi. Layanan HTTP Sites tidak membawa identitas pemilik. Login pemilik, akun non-pemilik terautentikasi, penyimpanan dan pemulihan D1 end-to-end, interaksi responsif serta WebGPU belum diverifikasi di deployment. |
| Provider dan mutu | Pengaturan runtime belum berisi kredensial atau daftar model. Tidak ada panggilan provider nyata pada Fase 3–6 dalam sesi ini. Mutu jawaban dan hasil benchmark masih memerlukan data live dan penilai manusia. |

URL teruji: [PromptForge AI Studio](https://promptforge-studio.pearlymonkey32.chatgpt.site).
