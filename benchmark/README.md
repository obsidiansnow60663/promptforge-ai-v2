# Benchmark PromptForge

Dataset `promptforge-id-1.0.0` mencakup 100 kasus dan enam kategori. Gunakan Node 24 dan jalankan dari akar repositori.

```sh
node benchmark/run.mjs --out /tmp/promptforge-fixture.json
```

Fixture memeriksa penyusunan dataset, jalur optimasi dengan jawaban terkontrol, validasi rubrik dan struktur laporan. Skor fixture diganti dengan `null` pada ringkasan klaim mutu.

Untuk uji provider yang telah diotorisasi, sediakan variabel rahasia dalam environment eksekusi dan daftarkan model pada `OPENAI_MODELS`, `ANTHROPIC_MODELS` atau `GEMINI_MODELS`. Untuk tiap awalan `BENCH_EXEC`, `BENCH_OPT` dan `BENCH_JUDGE`, tetapkan variabel berakhiran `_PROVIDER` dan `_MODEL`. Mesin penilai harus berbeda dari eksekutor dan optimizer. Uji satu kasus sebelum menjalankan semua 100 kasus. Setel `BENCH_COMMIT` untuk mencatat commit sumber.

```sh
node benchmark/run.mjs --live --case programming-01 --out /tmp/promptforge-smoke.json
node benchmark/run.mjs --live --out /tmp/promptforge-live.json
```

Semua varian menggunakan eksekutor, bahasa, batas keluaran dan sampling default provider yang sama. Jalur literal dan optimasi memakai optimizer yang sama. Jalur optimasi memanggil fungsi Prompt Intelligence dari aplikasi dengan adapter server benchmark, sehingga model inferensinya dapat berbeda dari WebLLM di Studio. Hasil yang memerlukan klarifikasi atau gagal peninjauan dicatat sebagai prompt belum disetujui. Benchmark menilai jawaban mentah menggunakan kondisi yang sama untuk ketiga varian. Uji Fase 4 menilai adaptasi secara terpisah.

Untuk evaluasi manusia, buat dokumen JSON dengan `datasetVersion`, `reportSha256` (SHA-256 byte laporan asli), dan `reviews`. Setiap entri `reviews` memiliki `caseId`, `variant`, `prompt`, `output`, `constraints`, `issues` dan `critical`. Gunakan kunci rubrik yang sama seperti `review` dalam laporan. Nilai dimensi 0–100, dengan kepatuhan bahasa 100 hanya bila benar. Tandai batasan gagal secara eksplisit dan simpan penilaian terpisah dari hasil otomatis. Gabungkan penilaian dengan `node benchmark/run.mjs --report LAPORAN_ASLI --human PENILAIAN --out LAPORAN_GABUNGAN`. Runner memeriksa sidik laporan dan memakai jawaban yang sudah tersimpan.

Target 95% preservasi, kepatuhan bahasa dan keberhasilan tugas masih belum diukur dengan provider dan penilai manusia.

## Uji mandiri dan audit deterministik

Pilih beberapa kasus dengan `--case programming-09,content-01`. Untuk seluruh dataset, `--jobs` menerima 1–8 kasus paralel. Opsi `--checkpoint PATH` menyimpan hasil per kasus dan dapat dijalankan ulang dengan dataset, model, metode, dan `BENCH_COMMIT` yang sama. Gunakan direktori baru setelah perubahan workflow atau kriteria.

Gunakan `--automated-only` jika model penilai yang berbeda belum tersedia. Runner membuat jawaban nyata sekaligus menyimpan kegagalan atau kebutuhan klarifikasi. Kolom peringkat dan kelulusan manual tetap kosong. Audit dari laporan live memeriksa token persis pada prompt dan satu penanda teks pada jawaban, lalu memberi ringkasan seluruh percobaan dan subset yang memiliki jawaban di ketiga varian. Jangan menafsirkan penanda sebagai skor mutu semantik.

```sh
node benchmark/check-literals.mjs REPORT_LIVE.json AUDIT.json
npm run build
node scripts/self-check.mjs REPORT_E2E.json
```

Uji end-to-end memerlukan `ARXPAY_API_KEY` dari environment. Ia memakai Worker dan database SQLite sementara dengan instruksi sintetis, tanpa mengambil data Studio. Uji mencakup klarifikasi, bahasa yang dipilih di instruksi, batasan persis, restore dan isolasi pemilik. Runner lama dan versi perbaikan dicatat dengan commit masing-masing.

Setelah mengubah optimizer, `--reuse-baselines REPORT.json` menjalankan ulang jalur teroptimasi sambil mempertahankan dua baseline identik. Runner memeriksa snapshot dataset, model, batas token dan sampling, serta merekam sidik laporan baseline.
