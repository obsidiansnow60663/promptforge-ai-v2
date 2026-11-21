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
