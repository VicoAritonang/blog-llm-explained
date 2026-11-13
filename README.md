# NeuroLab: Masuk ke Dalam Model Bahasa

Dunia 3D interaktif untuk mempelajari cara kerja LLM dengan menyentuh mesinnya, bukan membaca penjelasannya. Pengunjung berjalan di sebuah pulau berisi delapan mesin yang mengikuti perjalanan teks di dalam model bahasa: memutar catatan, memotong token, menyorot attention, mencabut kepala attention, memutar suhu, menuruni lembah loss, dan menangkap halusinasi.

Semua angka dihitung langsung oleh decoder mini yang benar-benar dilatih pada data sintetis (20.256 parameter). Inference berjalan lokal di browser; tidak memerlukan API key, akun, backend, atau layanan model eksternal.

## Menjalankan

Gunakan Node.js 24:

```sh
npm ci
npm run dev
```

Buka **http://127.0.0.1:5173/** atau `/id/`. Halaman utama adalah **dunia 3D** (lihat di bawah). Mode lain tetap tersedia:

| URL | Isi |
| --- | --- |
| `/id/` | Dunia 3D (pintu depan) |
| `/id/?pick=1`, `?level=pemula` | Mode teks per level dengan pemilihan level |
| `/id/?lesson=0` | Investigasi lengkap 14 pos dengan inspector angka |
| `/id/?mode=klasik` | Dunia 2D top-down sebelumnya |
| `/?explore=1`, `/en/` | Eksplorasi bebas lama (annex) |

## Dunia 3D

Prinsipnya **simulasi dan interaksi dulu, teks belakangan**. Setiap mesin hanya punya satu pertanyaan pembuka dan dua atau tiga tantangan pendek. Penjelasan muncul sebagai **kartu temuan** setelah pengunjung menghasilkan efeknya sendiri, dan semua kartu terkumpul di panel *Temuan*. Penanda berdenyut di dalam dunia menunjukkan objek yang perlu disentuh berikutnya.

| # | Mesin | Yang disentuh | Yang ditemukan (dihitung model asli) |
| --- | --- | --- | --- |
| 1 | Mesin Tanya | Drum benda/tempat/warna, tombol TANYA | Jawaban keluar token demi token; kombinasi yang ditahan dari training tetap dijawab benar |
| 2 | Pemotong Token | Tuas pemotong, tombol kamus dan gabungan BPE | Catatan menjadi ID; kamus Inggris memotong kalimat Indonesia jadi 54 potongan, kamus Indonesia 22 |
| 3 | Galaksi Makna | Bintang token (embedding diproyeksikan ke 3D) | Tetangga cosine di 32 dimensi; kelompok benda/tempat/warna terungkap |
| 4 | Panggung Sorot | Tiang token, empat lampu (lapisan × kepala), steker | Satu kepala lapisan 2 menyorot >90% ke warna di catatan; cabut kedua kepala lapisan 2 dan warnanya salah dengan yakin |
| 5 | Arena Peluang | Kenop suhu, tombol TULIS | 32 tiang peluang, bola undian, `<berhenti>` sebagai token; butuh suhu ±3 sebelum model mini mulai ngawur |
| 6 | Bengkel Latihan | Tiang logit + tuas LATIH, bola di lembah loss, ukuran langkah | Langkah gradien softmax, gradient descent, overshoot; kurva loss training asli |
| 7 | Ruang Bukti | Kaset catatan, laci arsip | Halusinasi yakin tanpa lokasi, kegagalan kasus dua benda, retrieval yang membuat jawaban berdasar |
| 8 | Menara Skala | Tombol ukuran GPT-3, model mini di kaki menara | Volume menara sebanding jumlah parameter; GPT-3 175B ≈ 8,6 juta model mini |

Kontrol: WASD/panah atau klik/ketuk tanah untuk berjalan, **E** atau klik untuk masuk ke mesin, **1–8** untuk pindah, **Esc** untuk keluar. Di dalam mesin, kamera bisa diputar dan di-zoom. Setiap aksi 3D juga punya padanan tombol biasa di *Kontrol tanpa 3D* (keyboard dan pembaca layar). Tanpa WebGL, halaman menawarkan mode teks.

Progres tersimpan di local storage (`neurolab-dunia3d-v1`). Bila storage diblokir, dunia tetap berjalan dan progres disimpan di memori.

Kode ada di `src/world3d/`: `content.ts` (mesin, tantangan, kartu temuan), `model.ts` (lapisan tipis di atas decoder), `Scene.tsx` (pemain, kamera, cangkang mesin), `Island.tsx`, `Hud.tsx`, dan `stations/*.tsx` (satu berkas per mesin, berisi adegan 3D dan kontrol cadangannya). `tests/world3d.test.mjs` menjaga agar setiap klaim di kartu temuan tetap benar terhadap checkpoint.

## Dunia 2D (mode klasik)

Mode klasik (`?mode=klasik`) adalah game top-down 2D yang dirender dengan Canvas di browser (tanpa server, tanpa library game). Pemain berjalan dengan WASD/panah atau ketuk/klik lantai, lalu memakai benda dengan E atau ketuk.

| Area | Level | Isi |
| --- | --- | --- |
| **Taman Kata** | 1 · Pemula | 7 mesin quest, 4 buku, Nara, terminal ujian lompat |
| **Pabrik Token** | 2 · Menengah | 9 mesin di sepanjang ban berjalan yang membawa token asli model mini (teks → ID → vektor → token keluaran), 4 buku |
| **Observatorium Skala** | 3 · Mahir | 7 mesin mengelilingi hologram GPT-3, 4 buku |
| **Aula Arsitek** | Tamat | Piala dan ringkasan perjalanan |

- **Quest** membuka lab yang sama dengan mode teks (`src/app/labs`) dan pos investigasi 3D. Tujuan tercentang dari tindakan nyata.
- **Gerbang** ke level berikutnya terbuka bila semua quest di area itu selesai, atau lewat **ujian lompat** (semua jawaban harus benar).
- **Buku** di podium memuat materi yang sulit disimulasikan (sejarah, data latih, post-training, RAG/agent, hukum skala, GPU, interpretabilitas, evaluasi), masing-masing dengan satu kuis.
- **XP**: 25 per tugas, 100 per quest, 20 per buku, 15 per kuis, 60 per ujian lompat. XP dihitung ulang dari progres, bukan disimpan terpisah.
- **Jurnal (J)** dan **Peta (M)** mendaftar semua quest, buku, dan terminal dengan tombol teleport/buka, sehingga semuanya terjangkau tanpa kanvas.

Kode ada di `src/world/`: `map.ts` (peta dan pathfinding), `engine.ts` (render, gerak, tabrakan), `progress.ts` (XP dan gerbang), `books.ts`, `exams.ts`, serta komponen HUD. Progres quest berbagi `neurolab-journey-v1` dengan mode teks; posisi, buku, dan ujian disimpan di `neurolab-world-v1`.

## Level belajar

Setiap level berisi misi dengan pemandu dan checklist yang tercentang dari tindakan nyata. Aturan penulisannya ada di [LEVEL-GUIDELINE.md](LEVEL-GUIDELINE.md).

| Level | Untuk siapa | Isi |
| --- | --- | --- |
| **Pemula** | Non-teknis | 7 misi tanpa kode: bedanya dengan program biasa, cara belajar, membaca konteks, keacakan, dan memeriksa jawaban |
| **Menengah** | Teknis, belum AI/ML | 9 misi: Lab BPE dan 13 pos investigasi dengan padanan software dan dampak production |
| **Mahir** | AI/ML | 7 misi: audit parameter, compute, data, attention, KV cache, in-context learning GPT-3, dan perubahan sesudahnya |

Angka di misi Pemula dihitung langsung oleh model mini. Angka GPT-3 dikutip dari [paper aslinya](https://arxiv.org/abs/2005.14165) atau diturunkan dari dimensinya; asumsi diberi label. Tidak ada bobot GPT-3 yang dimuat. Progres tersimpan di local storage (`neurolab-journey-v1`).

## Alur investigasi

1. **Pesan masuk:** bandingkan catatan biru/hijau; rekonstruksi token, lookup embedding, dan penambahan posisi.
2. **Konteks bekerja:** telusuri Q/K/V, mask kausal, weighted sum, concat head, normalization, residual, dan MLP dalam setiap blok.
3. **Jawaban terbentuk:** bandingkan logits dan decoding, jalankan generation sampai EOS, buktikan kesetaraan cache, lalu pelajari loss, gradien, dan training.
4. **Jawaban diperiksa:** bedakan post-training dari konteks/aplikasi, cari sumber lokal, evaluasi klaim, dan selesaikan kasus transfer kartu akses.

Tab **Makna / Angka / Kode**, pemilihan posisi/blok/head, tabel numerik, dan unduhan trace membantu memeriksa setiap tahap. Eksperimen tanpa mask dan ablation memperbarui visual serta inspector dari perhitungan diagnostik yang sama. Prediksi dibuat sebelum hasil pembanding dibuka; dugaan awal yang keliru tetap bisa menghasilkan bukti yang dijelaskan dengan benar.

**Buku bukti** menyimpan kondisi, prediksi, pengamatan, dan penjelasan di local storage (`neurolab-evidence-v2`), serta dapat diunduh sebagai JSON. Status “diamati” dibedakan dari “dijelaskan”. Penjelasan bebas disimpan untuk refleksi; aplikasi tidak mengklaim menilai kualitas semantiknya secara otomatis.

## Model dan sumber angka

| Profil aktif | Nilai |
| --- | --- |
| Model | `keys-decoder-v1` |
| Blok / head | 2 / 2 |
| Lebar / MLP | 32 / 64 |
| Vocabulary / kapasitas konteks | 32 / 64 token |
| Parameter | 20.256 |
| Posisi | Learned absolute embedding |
| Blok | Pre-norm, dense causal attention, GELU |
| Output | Final LayerNorm, tied embedding |
| Training | Adam, 1.800 langkah, seed 20261028 |

Tokenizer menggunakan longest-match pada vocabulary literal, termasuk whitespace. Ini bukan BPE atau tokenizer model umum. Checkpoint, kurva loss, hasil evaluasi per contoh, dan logits referensi NumPy tersedia di `src/simulation/story/`.

Hasil pada split sintetis: **336/336** contoh latihan dan **112/112** contoh uji menghasilkan jawaban yang sesuai. Split menahan kombinasi benda–lokasi, tetapi distraktor memiliki korelasi sederhana. Angka ini tidak mengukur kemampuan bahasa umum. Kasus dua benda tambahan gagal (`di laci kuning.` untuk sumber `di laci biru.`), dan hasil aslinya sengaja dipertahankan untuk membahas batas generalisasi.

Tiga jenis materi diberi label: **hasil model mini**, **contoh hitung terpisah**, dan **skema/proyeksi visual**. Demo tiga bias tidak mengubah checkpoint utama. Post-training dijelaskan secara konseptual karena tidak ada pasangan checkpoint base/instruction. Annex lama memakai engine matematika deterministik yang belum dilatih dan fixture tersendiri.

Training ulang bersifat opsional; menjalankan situs hanya memerlukan Node.js:

```sh
python -m pip install -r scripts/story-requirements.txt
python scripts/check-story-gradients.py
python scripts/train-story-model.py
```

## Verifikasi

```sh
npm test
npm run build
npm run test:story-browser
npm run test:path-browser
npm run test:world-browser
npm run test:browser
npm run test:seo
```

Atau jalankan semuanya dengan `npm run check`. Browser checks memakai Playwright; instal Chromium dengan `npx playwright install chromium`, atau gunakan Chrome lokal di PowerShell:

```powershell
$env:NEUROLAB_BROWSER_CHANNEL='chrome'
npm run check
```

Tes mencakup kesesuaian JS/NumPy pada setiap posisi prompt, seluruh 112 keluaran uji ditahan, prefix invariance, weighted sum, residual, sampling, cache dan invalidasinya, serta geometri/engine lama. Pemeriksaan gradien Python memakai finite differences pada 13 probe.

Browser checks memainkan seluruh 23 tantangan dunia 3D lewat kontrol cadangannya, lalu memeriksa 14 pos, gating prediksi, penyimpanan bukti, diagnosis, generation, training, retrieval, transfer, aksesibilitas, mobile, reduced motion, fallback WebGL, dan regresi dunia lama. Screenshot serta laporan tersimpan di `test-results/`. Uji usability dengan pengunjung nyata belum dilakukan.

## Build dan konten statis

```sh
npm run build
npm run preview
```

Output statis berada di `dist/`. Build juga menghasilkan 18 halaman lokal, canonical/hreflang, JSON-LD, sitemap, robots, dan salinan Markdown. Panduan Indonesia mengikuti seluruh cerita baru dan tetap bisa dibaca tanpa JavaScript. Origin produksi: `https://llm-explained.vicoworks.com`; konfigurasi Vercel tetap tersedia.

Lihat [analisis, daftar implementasi, dan batas cakupan](STORY-IMPLEMENTATION.md), [rancangan cerita](story.md), serta [panduan deploy](DEPLOYMENT.md).

## Struktur utama

```text
src/app/Investigation.tsx             perjalanan, eksperimen, dan buku bukti
src/app/InvestigationPanels.tsx       inspector, training, sumber, transfer
src/content/investigation.ts         narasi, pertanyaan, bukti, dan rute
src/scene/InvestigationScene.tsx      geometri 3D prosedural
src/scene/StoryDiagram.tsx            diagram tanpa dependensi renderer 3D
src/simulation/story/engine.mjs       decoder, sampling, cache, contoh operator
src/simulation/story/checkpoint.json parameter dan metadata terlatih
scripts/train-story-model.py         data, forward, backprop, dan Adam
src/app/GameExperience.tsx           annex eksplorasi bebas lama
src/world3d/                         dunia 3D (pintu depan) dan delapan mesinnya
```

Geometri utama dibuat langsung dengan Three.js/React Three Fiber; tidak memerlukan model 3D dari CDN. Kit GLB sebelumnya tetap berada di `public/assets/lab-v1/`. Source Sans 3 dibundel lokal dengan lisensi SIL Open Font License di `public/licenses/source-sans-3.txt`.
