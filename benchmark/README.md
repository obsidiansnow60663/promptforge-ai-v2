# Benchmark PromptForge

Dataset `promptforge-id-1.0.0` mencakup 100 kasus dan enam kategori. Gunakan Node 24 dan jalankan dari akar repositori.

```sh
node benchmark/run.mjs --out /tmp/promptforge-fixture.json
```

Fixture memeriksa penyusunan dataset, jalur optimasi dengan jawaban terkontrol, validasi rubrik dan struktur laporan. Skor fixture diganti dengan `null` pada ringkasan klaim mutu.

Untuk uji provider yang telah diotorisasi, sediakan variabel rahasia dalam environment eksekusi dan daftarkan model tambahan pada `ARXPAY_MODELS`. Untuk ArxPay, nilai *_PROVIDER adalah `arxpay`. Untuk tiap awalan `BENCH_EXEC`, `BENCH_OPT` dan `BENCH_JUDGE`, tetapkan variabel berakhiran `_PROVIDER` dan `_MODEL`. Mesin penilai harus berbeda dari eksekutor dan optimizer. Uji satu kasus sebelum menjalankan semua 100 kasus. Setel `BENCH_COMMIT` untuk mencatat commit sumber.

```sh
node benchmark/run.mjs --live --case programming-01 --out /tmp/promptforge-smoke.json
node benchmark/run.mjs --live --out /tmp/promptforge-live.json
```

Semua varian menggunakan eksekutor, bahasa, batas keluaran dan sampling default provider yang sama. Jalur literal dan optimasi memakai optimizer yang sama. Jalur optimasi memanggil fungsi Prompt Intelligence dari aplikasi dengan adapter server benchmark, sehingga model inferensinya dapat berbeda dari WebLLM di Studio. Hasil yang memerlukan klarifikasi atau gagal peninjauan dicatat sebagai prompt belum disetujui. Benchmark menilai jawaban mentah menggunakan kondisi yang sama untuk ketiga varian. Uji Fase 4 menilai adaptasi secara terpisah.

Untuk evaluasi manusia, buat dokumen JSON dengan `datasetVersion`, `reportSha256` (SHA-256 byte laporan asli), dan `reviews`. Setiap entri memiliki `caseId`, `variant`, `prompt`, `output`, `promptConstraints`, `constraints`, `issues` dan `critical`. Sesuaikan urutan kedua daftar boolean dengan urutan batasan pada dataset. `promptConstraints` menilai preservasi batasan di prompt dan `constraints` menilai kepatuhan jawaban. Impor versi lama bisa tanpa `promptConstraints`. Gunakan kunci rubrik yang sama seperti `review` dalam laporan. Nilai dimensi 0–100, dengan kepatuhan bahasa 100 hanya bila benar. Gabungkan penilaian dengan `node benchmark/run.mjs --report LAPORAN_ASLI --human PENILAIAN --out LAPORAN_GABUNGAN`. Runner memeriksa sidik laporan dan memakai jawaban yang sudah tersimpan.

Laporan mencantumkan jumlah pemeriksaan batasan prompt dan jawaban di setiap jalur. Bandingkan `promptConstraintChecks` dengan `promptConstraintChecksPossible` sebelum memakai persentase preservasi. Kasus yang tidak menghasilkan draf siap atau belum dinilai mengurangi cakupan. `pairedTaskSuccess` menghitung rata-rata keberhasilan tugas pada kasus dengan penilaian untuk ketiga jalur. Jumlah kasus sebanding dilaporkan terpisah untuk penilai model dan manusia.

Target 95% preservasi, kepatuhan bahasa dan keberhasilan tugas masih belum diukur dengan provider dan penilai manusia.

## Uji mandiri dan audit deterministik

Pilih beberapa kasus dengan `--case programming-09,content-01`. Untuk seluruh dataset, `--jobs` menerima 1–8 kasus paralel. Opsi `--checkpoint PATH` menyimpan hasil per kasus dan dapat dijalankan ulang dengan dataset, model, metode, dan `BENCH_COMMIT` yang sama. Jika provider melaporkan kuota habis, runner melewati permintaan berikutnya dan menandai kasus terdampak agar bisa diteruskan dari checkpoint setelah kuota tersedia. Gunakan direktori baru setelah perubahan workflow atau kriteria.

Gunakan `--automated-only` jika model penilai yang berbeda belum tersedia. Runner membuat jawaban nyata sekaligus menyimpan kegagalan atau kebutuhan klarifikasi. Kolom peringkat dan kelulusan manual tetap kosong. Audit dari laporan live memeriksa token persis pada prompt dan satu penanda teks pada jawaban, lalu memberi ringkasan seluruh percobaan dan subset yang memiliki jawaban di ketiga varian. Jangan menafsirkan penanda sebagai skor mutu semantik.

```sh
node benchmark/check-literals.mjs REPORT_LIVE.json AUDIT.json
npm run build
node scripts/self-check.mjs REPORT_E2E.json
```

Uji end-to-end memerlukan `ARXPAY_API_KEY` dari environment. Ia memakai Worker dan database SQLite sementara dengan instruksi sintetis, tanpa mengambil data Studio. Uji mencakup klarifikasi, bahasa yang dipilih di instruksi, batasan persis, restore dan isolasi pemilik. Runner lama dan versi perbaikan dicatat dengan commit masing-masing.

Setelah mengubah optimizer, `--reuse-baselines REPORT.json` menjalankan ulang jalur teroptimasi sambil mempertahankan dua baseline identik. Runner memeriksa snapshot dataset, model, batas token dan sampling, serta merekam sidik laporan baseline.

## Menyiapkan penilaian manusia

```sh
node benchmark/review-packet.mjs prepare REPORT.json PACKET.json KEY.json
node benchmark/review-packet.mjs resolve RATINGS.json HUMAN.json KEY.json
node benchmark/run.mjs --report REPORT.json --human HUMAN.json --out REVIEWED.json
```

Paket memuat kasus yang mempunyai jawaban dari ketiga jalur, dengan urutan acak dan ID tanpa nama varian. Isi prompt dapat tetap memperlihatkan perbedaan bahasa. Berikan paket saja kepada penilai yang telah diotorisasi. Simpan KEY untuk menyambungkan ID penilaian ke laporan sumber. RATINGS berisi `datasetVersion` dan `reviews` dengan `itemId` dan dimensi rubrik yang digunakan runner. Pembuatan paket atau pengujian impor tidak mengisi penilaian manusia.

## Bukti verifikasi DoD versi 13

Uji ArxPay menjalankan ulang jalur optimasi pada 100 kasus dari sumber Sites v13 dan memakai kembali dua baseline v12 dengan konfigurasi eksekusi yang sama. Sebanyak 18 kasus menghasilkan jawaban dan semuanya memuat penanda yang diperiksa. Dari enam prompt siap dengan literal yang bisa diperiksa, semuanya mempertahankan literal. Sebanyak 77 kasus tercatat terkena batas permintaan, dua memerlukan klarifikasi, dan tiga menghasilkan peringatan. Uji serial kemudian mengonfirmasi HTTP 429 dengan kode `key_daily_cap`. Jalur v13 ini mengukur jawaban mentah dan cakupan uji provider.

Dua putaran penilaian buta oleh agen Codex memakai 12 kasus v12, dua per kategori, dengan 36 jawaban. Pada skala 0–2 per jawaban, PromptForge mendapat 18/24 untuk keberhasilan tugas, instruksi Indonesia langsung 17/24, dan terjemahan literal Inggris 20/24. Satu jawaban mentah PromptForge menyisipkan fragmen Mandarin. Temuan tersebut menghasilkan pemeriksaan tambahan pada keluaran adaptasi Studio, dengan tes yang menjaga nama dan kutipan yang diminta. Sampel ini belum memenuhi penilaian manusia maupun gerbang mutu penuh. Bukti, sidik laporan, dan hasil per kasus ada di [`evidence-dod-v13.json`](evidence-dod-v13.json).

Audit lanjutan menilai seluruh 54 jawaban mentah dari 18 kasus v13 yang memiliki jawaban di ketiga jalur. Semua kasus tersebut berasal dari kategori Pemrograman karena batas kuota. Tiga agen Codex menilai dengan label varian disembunyikan. Pada skala yang sama, PromptForge mendapat 31/36, instruksi Indonesia langsung 29/36, dan terjemahan literal 28/36. Semua 18 draf PromptForge mempertahankan batasan yang ditinjau dan semua 18 jawabannya menggunakan bahasa yang diminta. Sebanyak 17 dari 18 jawaban memenuhi semua batasan. Uji kalibrasi pada satu kasus menunjukkan perbedaan penilaian kepatuhan batasan untuk satu dari tiga jawaban. [Penilaian dan temuan per kasus](evidence-semantic-v13.json).
