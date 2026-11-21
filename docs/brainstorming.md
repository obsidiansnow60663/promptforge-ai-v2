# Lingkup fitur PromptForge v2.1

Arahan pemilik pada 21 November 2026 mengadopsi fitur dan perilaku sistem dari dokumen brainstorming. Blueprint tetap menjadi acuan produk dan DoD. ArxPay menjadi satu-satunya koneksi eksekusi server. Pemilih manual, profil konfigurasi, pilihan default otomatis, dan perbandingan tetap bekerja pada model ArxPay yang diizinkan. Satu model server tersedia pada konfigurasi Site saat ini.

| Lingkup | Perilaku Studio |
|---|---|
| Prompt Intelligence | Generate Only terpisah dari eksekusi. Analisis, klarifikasi, struktur, optimasi bahasa Inggris, pemeriksaan literal dan review menghasilkan draf tersimpan. Revisi semantik dibatasi dua. |
| Prompt Execution | Generate & Execute dan Execute Existing Prompt memakai versi tersimpan. Instruksi sistem opsional disimpan per versi. Preferensi nada, format, dan audiens tidak mengubah tugas yang sudah disetujui. |
| Output Intelligence | Adaptasi dan penilaian jawaban terpisah. Bahasa Indonesia menjadi default. Hasil mentah, hasil adaptasi, peringatan, metadata model, token dan latensi dapat dibuka kembali. |
| Evaluasi | Enam dimensi memakai bobot dari rubrik benchmark. Temuan kritis menghalangi persetujuan otomatis. Skor model, validasi keluaran, metrik 30 hari dan hasil benchmark terlihat terpisah. Skor baru tersedia bila peninjau mengembalikan dimensi yang valid. |
| Perbandingan dan umpan balik | Perbandingan versi dan penilaian kegunaan tersedia. Perbandingan model memakai dua pilihan berbeda serta satu target penilaian untuk keduanya. |
| Pustaka templat | Templat terkurasi untuk Pemrograman, Otomasi, Riset, Bisnis, Konten, Analisis data, dan Umum mengisi instruksi sesi baru. Bidang contoh dapat diedit. |
| Status dan pembatalan | Halaman Proses membaca status server per pemilik. Pembatalan mencegah tahap provider berikutnya dan penyimpanan hasil yang sudah dibatalkan. Panggilan yang sudah dikirim dapat tetap selesai di provider. |
| Data dan akses | Riwayat, skor, preferensi versi, dan metadata hasil melalui otorisasi pemilik. Cadangan lama tetap bisa diimpor, termasuk metadata hasil dari provider terdahulu. Adapter lama tidak dapat dipanggil untuk eksekusi baru. |

## Bukti dan batas verifikasi

- Benchmark 100 kasus yang ditampilkan memakai bukti rilis 12. Dataset, tiga varian, cakupan jawaban dan pemeriksaan literal dibedakan dari skor kualitas semantik. Bukti lama tidak dianggap pengukuran ulang untuk rilis ini.
- Penilaian manusia, target 95%, dan penilaian independen berskala penuh masih terbuka. Perbandingan dua model nyata memerlukan dua model yang dapat dipakai melalui konfigurasi yang sama.
- Status disimpan di basis data. Kelanjutan pekerjaan setelah browser menutup koneksi masih memerlukan kemampuan background yang terverifikasi.
- Register v2.0 menyimpan bukti historis. Integrasi langsung OpenAI, Anthropic, dan Gemini keluar dari DoD aktif.

## Uji rilis

Uji mandiri dengan Worker lokal, SQLite, dan ArxPay nyata menyusun prompt Git, menyimpan skor dari peninjau dan preferensi formal, menghasilkan tepat tiga poin tanpa salam, memisahkan statistik prompt dan hasil, membaca dua status operasi, serta memulihkan versi. Skor 100 yang dilaporkan model pada sampel tersebut adalah penilaian model untuk satu draf.

Tes otomatis memeriksa isolasi dashboard dan operasi, gerbang kritis meski skor tinggi, pemisahan instruksi opsional, pemulihan cadangan lama, dan pembatalan konkuren yang mencegah panggilan lanjutan. Pratinjau browser terhenti karena relay tidak siap.

Sites menerbitkan versi 13 dari commit `e90d4d6c6e1284a0829e08dd8d6a6a09b8bfb371`. Deployment `appgdep_6b014e2d5f10819186273329efbba17e` sukses pada environment revisi 5. Akses hanya untuk pemilik dan hanya secret ArxPay yang terpasang. Smoke test HTTP mengembalikan 200 pada aset dasbor, templat, proses dan laporan benchmark melalui akses layanan. Permintaan anonim ke halaman utama dan akses layanan tanpa identitas pengunjung ke API evaluasi, status proses dan pembatalan mengembalikan 401. Keempat puluh tes otomatis lulus.

## Penutupan temuan DoD v2.1

| Kriteria | Perubahan dan bukti |
|---|---|
| §9.2–9.5 · Metadata | Versi menyimpan mode, bahasa sumber yang dideklarasikan, target bahasa prompt, dan alasan revisi. API versi menampilkan waktu sesi dari versi tertua dan terbaru. Eksekusi menyimpan waktu akhir, termasuk saat dibatalkan. Evaluasi prompt, jawaban dan umpan balik pemilik memiliki ID, jenis penilai, waktu, dan status. Uji pemulihan mencakup arsip lama dan hasil yang diperoleh pada percobaan provider ketiga. Metadata historis yang tidak diketahui tetap kosong. |
| §6.4, §12 · Status dan retry | Halaman Proses membedakan analisis, penyusunan, dan peninjauan. Pengiriman ulang dengan sesi, instruksi, dan konfigurasi model yang sama memakai tahap tervalidasi dari percobaan gagal dalam 24 jam. Pembatalan mencegah panggilan baru, termasuk retry. Provider memakai maksimal tiga percobaan untuk kegagalan sementara, jeda 250 dan 500 ms, serta menghormati Retry-After pendek. Kuota harian, penolakan kredensial dan batas waktu tidak dicoba ulang otomatis. |
| §10.7 · Pengaturan | Bahasa jawaban dan model atau profil eksekusi bawaan dapat dipilih di Studio dan disimpan di browser. Konfigurasi model yang diizinkan dan kredensial tetap berasal dari Sites. |
| §10.8, §15.6 · Browser dan riwayat | Chromium lokal pada lebar 390 px memverifikasi fokus keyboard dari tautan lewati navigasi, pilihan bahasa setelah refresh, status penyusunan, eksekusi, dan buka ulang jawaban tiga poin dari riwayat sesudah reload. Uji memakai Worker lokal, SQLite dan respons provider tiruan. |
| §15.3, §15.7, §15.8 · Verifikasi tersisa | Pembandingan dua model nyata memerlukan dua model yang bisa menyelesaikan eksekusi. Penilaian manusia dan pengukuran target mutu seluruh kasus belum lengkap. Uji browser sebagai pemilik di URL produksi masih diperlukan. |

Pemulihan tahap dimulai ketika instruksi dikirim ulang dari sesi yang sama. Kemampuan melanjutkan pekerjaan otomatis di latar belakang setelah browser ditutup masih belum terverifikasi.

Benchmark ArxPay untuk kode v13 mencoba jalur optimasi pada 100 kasus dan memakai kembali dua baseline v12 dari dataset yang sama. Sebanyak 18 kasus menghasilkan jawaban, 77 ditolak dengan HTTP 429, dua perlu klarifikasi, dan tiga menghasilkan draf berperingatan. Panggilan serial mengonfirmasi kode `key_daily_cap`. Pada 12 kasus v12 yang dinilai secara buta oleh agen, skor keberhasilan tugas PromptForge 18/24, pembanding Indonesia langsung 17/24, dan terjemahan literal 20/24. Temuan campuran aksara memicu pemeriksaan tambahan untuk prosa Indonesia. Hasil terbatas ini tidak menetapkan preservasi 95% atau peningkatan keberhasilan. [Bukti per kasus](../benchmark/evidence-dod-v13.json).

### Verifikasi rilis v14

Sites menerbitkan v14 dari commit `d9200ae70f93e91c4543df9fce98ea5e4bebeee8` pada environment revisi 5. Akses terverifikasi hanya untuk pemilik. Uji HTTP produksi mendapat 200 untuk aset aplikasi, evaluasi, proses, templat, dan benchmark melalui akses layanan. Akses anonim ke halaman utama, serta permintaan layanan tanpa identitas pengunjung ke API evaluasi, proses, dan pembatalan mendapat 401. Binding D1 terdeteksi melalui Sites. Browser bersama gagal dimulai, sehingga pengujian penyimpanan dari browser produksi sebagai pemilik masih terbuka.

Seluruh 44 tes lokal lulus. Uji Chromium lokal diulang pada kode rilis dengan respons provider tiruan. Bukti ArxPay nyata memakai kode v13; pengujian proyek dengan kasus sintetis dan data benchmark tidak dihitung sebagai penilaian manusia. Ketiga belas alias ArxPay alternatif yang dicoba belum menghasilkan respons yang dapat dipakai sebagai model kedua.

### Nama model ArxPay dan subbidang sesi

Pemilik dapat menyimpan nama tampilan per ID model terkonfigurasi melalui **Pengaturan → Nama tampilan model ArxPay**. Nama tersimpan di D1 untuk akun tersebut dan muncul pada pemilih eksekusi, perbandingan, dan riwayat eksekusi. Mengosongkan nama mengembalikan tampilan ke ID model. Permintaan provider, allowlist, dan metadata eksekusi menggunakan ID asli. Cadangan sesi tetap berisi versi dan hasil eksekusi.

Generator menerima subbidang opsional dan menyimpannya bersama versi prompt (§9.2). Subbidang mengikuti versi saat diekspor atau dipulihkan. Arsip lama tanpa subbidang tetap didukung.

45 tes lokal lulus. Chromium lokal dengan respons provider tiruan menguji penyimpanan nama, pembacaan sesudah muat ulang, nama tampilan di pilihan eksekusi, nilai ID asli yang dipilih, penghapusan nama, dan pembukaan kembali hasil. Uji ArxPay nyata terpisah mengembalikan HTTP 429 `key_daily_cap` tanpa waktu reset pada pemeriksaan satu panggilan. Bukti benchmark lengkap, penilaian manusia, pembandingan dua model nyata, dan sesi browser produksi sebagai pemilik masih terbuka.

Sites menerbitkan v15 dari commit `2d594f16fa3b155e0a22d35c1d8162aa61b3871d` dengan akses khusus pemilik. Sites mendeteksi tabel D1 `arxpay_model_names`. Aset form dan subbidang mengembalikan HTTP 200 melalui akses layanan. Halaman anonim dan API nama model tanpa identitas pengunjung mengembalikan 401. Uji browser sebagai pemilik di URL produksi tertahan karena browser bersama gagal dimulai.

### Katalog model dari ArxPay

**Pengaturan → Katalog model ArxPay → Ambil daftar model** membaca `GET /v1/models` dari Worker memakai secret Sites. Studio menampilkan ID yang dikembalikan ArxPay. **Uji dan aktifkan** memeriksa satu model terpilih dengan respons JSON kecil sebelum memasukkannya ke pilihan eksekusi, perbandingan dan nama tampilan. Model tambahan tersimpan per pemilik dan dapat dinonaktifkan. Model bawaan penyusun prompt tetap ditentukan oleh konfigurasi Sites.

Katalog nyata mengembalikan 19 ID saat diuji. Aktivasi, penolakan saat kuota habis, pemakaian ID asli, isolasi akun, dan penonaktifan lulus dengan respons tiruan. Chromium lokal menguji alur Pengaturan pada lebar 390 px, termasuk membaca kembali model aktif sesudah muat ulang.
