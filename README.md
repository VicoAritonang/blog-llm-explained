# NeuroLab: Bangunkan GPT-3

Petualangan 3D untuk memahami cara kerja LLM dengan menyentuh mesinnya, bukan membaca penjelasannya. Pengunjung menyeberangi kepulauan yang menyimpan seluruh hidup sebuah model bahasa: **fase belajar**, **fase optimasi**, dan **fase berjalan**. Setiap misi menghadiahkan satu komponen GPT-3, dan semuanya dirakit di akhir.

Semua angka di mesin dihitung langsung oleh decoder mini yang benar-benar dilatih pada data sintetis (20.256 parameter). Angka GPT-3 dikutip dari [paper aslinya](https://arxiv.org/abs/2005.14165) atau diturunkan dari dimensinya. Inference berjalan lokal di browser; tidak memerlukan API key, akun, backend, atau layanan model eksternal.

Seluruh situs adalah dunia ini. Tidak ada lagi halaman bacaan terpisah: materi yang bisa disimulasikan menjadi mesin, dan materi yang tidak bisa disimulasikan menjadi buku di mimbar.

## Menjalankan

Gunakan Node.js 24:

```sh
npm ci
npm run dev
```

Buka **http://127.0.0.1:5173/**. Tambahkan `?grafik=ringan` atau `?grafik=tinggi` untuk memaksa kualitas grafik. URL lama (`/id/…`, `/en/…`, panduan topik, `llms.txt`) dialihkan permanen ke `/` lewat `vercel.json`.

## Petualangan 3D

Prinsipnya **simulasi dan interaksi dulu, teks belakangan**. Setiap mesin punya satu kalimat dari penjaga pulau dan dua atau tiga tantangan pendek. Penjelasan muncul sebagai **kartu temuan** setelah pengunjung menghasilkan efeknya sendiri.

| Pulau | Fase | Misi (komponen GPT-3 yang didapat) |
| --- | --- | --- |
| Dermaga Awal | Prolog | Oracle Tanya: model mini sungguhan menjawab catatan, termasuk kombinasi yang ditahan dari training |
| Hutan Data | Belajar | Gudang Data (Korpus: campuran 300 M token, Wikipedia dibaca 3,4×) · Pemotong Token (Tokenizer BPE) · Sabuk Tebakan (Target token berikutnya: loss per posisi dari model asli) · Galaksi Makna (Embedding) |
| Pegunungan Loss | Optimasi | Bengkel Gradien (Optimizer: langkah softmax, lembah loss, overshoot) · Tungku Komputasi (6 × N × D ≈ 3,15×10²³) · Aula Penyelarasan (preferensi manusia, diberi label contoh hitung) |
| Kota Inferensi | Berjalan | Panggung Sorot (Attention: cabut kepala penyalin warna) · Arena Peluang (Sampling dan suhu) · Gudang Cache (KV cache: jumlah posisi dihitung/dipakai ulang dari engine) · Ruang Bukti (Konteks: halusinasi dan RAG) |
| Observatorium | Finale | Menara Skala (volume ∝ parameter) · Cetak Biru GPT-3 (susun jalur latih dan jalur jalan, urutan salah ditolak) |

Jembatan ke pulau berikutnya terbuka setelah semua misi di bab sebelumnya selesai. Ada NPC penjaga di setiap pulau, penanda misi, tiang cahaya penunjuk, kompas dengan jarak, minimap, peta (M) dengan teleport ke mesin di pulau yang terbuka, dan log misi (J).

**Kamera.** Orang ketiga (default): WASD/panah atau klik tanah, Shift lari, Space lompat, seret untuk memutar kamera, E untuk masuk atau bicara, Esc keluar. **Orang pertama (V):** klik dunia untuk mengunci kursor (desktop), mouse untuk melihat, WASD untuk berjalan; di layar sentuh, seret untuk melihat. Mesin terdekat aktif otomatis dan tombolnya diklik langsung dengan crosshair.

**Alat (1–3, atau scroll di orang pertama).** *Tangan* menekan tombol dan tuas. *Pemindai* membaca mesin, landmark, gerbang, balok, dan Nara, lalu menampilkan perannya dalam LLM dan angka GPT-3. *Balok Token* memasang balok voxel bertuliskan token (R untuk ganti token; klik kanan atau Shift+klik untuk membongkar; balok menumpuk di sisi yang diklik). Balok dibaca sesuai urutan pasang, dan Oracle (model mini sungguhan) menebak token berikutnya. Contohnya, "kunci ada di laci" membuatnya menebak "kuning" 98%. Setiap alat punya tombol cadangan di bawah hotbar.

**Nara, drone pendamping.** Robot melayang tanpa baling-baling (inti mengkilap, visor bermata, dua cincin orbit hologram) yang terbang di samping pemain. Tekan H atau *Tanya Nara*. Di luar mesin, Nara menyebut misi berikutnya, jarak, dan arah relatif terhadap pandanganmu, lalu terbang beberapa meter ke arah itu. Di dalam mesin, ia memberi petunjuk konkret untuk tantangan yang sedang berjalan; ada 39 petunjuk di `src/world3d/hints.ts`. Nara juga bereaksi saat misi selesai atau jembatan terbuka, dan menawarkan bantuan bila pemain tampak tersesat.

**Pencapaian dan rekor (K).** Stopwatch menghitung waktu bermain selama tab terlihat. Waktu saat ke-39 tantangan selesai menjadi rekor terbaik. "Mulai ulang" memulai lari baru tanpa menghapus rekor dan pencapaian. Ada 13 pencapaian, antara lain lulus tiap fase, *Pelari kilat* (kurang dari 25 menit), *Mandiri* (≤ 3 petunjuk), *Cetak biru sempurna*, *Pemindai ulung*, *Arsitek kata*, *Pembisik Oracle*, *Penjelajah*, dan *Mata pertama*.

Catatan jujur tentang model mini: checkpoint dilatih hanya pada posisi jawaban, sehingga loss di teks catatan dan pertanyaan tinggi; Sabuk Tebakan menampilkannya apa adanya. Aula Penyelarasan memakai log-peluang asli model sebagai skor awal, tetapi pembaruannya adalah contoh hitung dan tidak mengubah checkpoint.

**Visual.** Shader buatan sendiri di `src/world3d/shaders.tsx`: rumput instanced (hingga 9.000 helai per pulau) yang bergoyang tertiup angin, material hologram (fresnel, scanline, kedip) untuk Nara dan tiang penunjuk, serta gerbang energi beranimasi di jembatan terkunci. Grafik tinggi memakai `@react-three/postprocessing` (bloom kernel, tone mapping ACES, vignette, SMAA), bayangan lembut, dan peta lingkungan dari `Lightformer`. Tekstur rumput, batu, kayu, logam, ubin, dan jendela kota dibuat secara prosedural di `src/world3d/textures.ts` (noise periodik di canvas, termasuk normal map), langit senja dan laut memakai shader sendiri, semuanya tanpa berkas gambar atau CDN. Grafik ringan (default di ponsel) mematikan efek dan bayangan.

Progres tersimpan di local storage (`neurolab-dunia3d-v2`). Bila storage diblokir, dunia tetap berjalan dan progres disimpan di memori.

Kode ada di `src/world3d/`: `content.ts` (wilayah, misi, tantangan, kartu temuan, komponen), `world.ts` (geografi, jembatan, area yang bisa diinjak), `Terrain.tsx` (langit, laut, pulau, bioma), `Scene.tsx` (pemain, NPC, kamera, cangkang mesin dengan LOD), `Hud.tsx`, `Effects.tsx`, `textures.ts`, `shaders.tsx`, `FirstPerson.tsx` (kamera orang pertama dan alat di tangan), `Blocks.tsx` (balok token, pemindai), `Companion.tsx` (Nara), `hints.ts`, `achievements.ts`, dan `stations/*.tsx` (satu berkas per mesin). `tests/world3d.test.mjs` menjaga agar setiap klaim di kartu temuan tetap benar terhadap checkpoint dan angka paper.

## Perpustakaan pulau

Materi yang tidak bisa disimulasikan dibaca di dunia sebagai **buku 3D di atas mimbar**. Ada 12 buku yang tersebar di kelima pulau:

| Pulau | Buku |
| --- | --- |
| Dermaga Awal | Dari Aturan ke Contoh (sejarah) · Kapan Harus Curiga (keamanan) |
| Hutan Data | Dari Mana LLM Belajar? · Attention Is All You Need |
| Pegunungan Loss | Hukum Skala · Mengapa Butuh Banyak GPU · Dari Base Model ke Asisten |
| Kota Inferensi | Tool, RAG, dan Agent · Membaca Isi Kepala Model |
| Observatorium | Ukuran Itu Relatif · Benchmark dan Kontaminasi · Peta yang Sudah Kamu Jelajahi |

Dekati mimbar yang bercahaya, lalu tekan E atau sentuh bukunya. Buku terbuka di atas mimbar dan kamera condong untuk membaca. Sentuh halaman kanan untuk lanjut, halaman kiri untuk kembali, atau pakai ←/→. Halaman digambar di canvas, termasuk garis waktu, alur, dan tabel. Halaman terakhir berisi satu pertanyaan: jawaban yang tepat (klik pilihan di halaman, atau 1–4) menamatkan buku. Daftar buku dan tombol *Baca* (teleport ke mimbar) ada di log misi (J); mimbar juga tampil di peta. Menamatkan semuanya memberi pencapaian *Kutu buku*. Isinya ada di `src/world3d/books.ts`, tampilannya di `src/world3d/Library.tsx`.

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

Tiga jenis materi diberi label: **hasil model mini**, **contoh hitung terpisah**, dan **skema/proyeksi visual**. Penyelarasan ditunjukkan sebagai contoh hitung karena tidak ada pasangan checkpoint base/instruction.

Training ulang bersifat opsional; menjalankan situs hanya memerlukan Node.js:

```sh
python -m pip install -r scripts/story-requirements.txt
python scripts/check-story-gradients.py
python scripts/train-story-model.py
```

## Verifikasi

```sh
npm test                 # unit test: model mini, angka GPT-3, klaim kartu temuan
npm run test:browser     # memainkan dunia 3D di build dist/
npm run check            # semuanya, termasuk type-check dan build
```

Browser check memakai Playwright. Instal Chromium dengan `npx playwright install chromium`, atau gunakan Chrome lokal dengan `NEUROLAB_BROWSER_CHANNEL=chrome`. Tes ini:
- memainkan ke-39 tantangan lewat kontrol cadangannya;
- mengecek jembatan terkunci, buku dan kuisnya, balok token, pemindai, mode orang pertama, petunjuk Nara, pencapaian, dan rekor waktu;
- mengecek tampilan ponsel, storage yang diblokir, dan bahwa frame grafik tinggi tidak kosong.

Screenshot tersimpan di `test-results/`.

## Struktur

```text
index.html                       satu halaman: meta, noscript, dan dunia 3D
src/main.tsx                     memuat dunia
src/world3d/                     seluruh pengalaman: pulau, mesin, buku, alat, Nara, HUD
src/world3d/stations/            satu berkas per mesin (adegan 3D + kontrol cadangan)
src/simulation/story/            decoder mini terlatih: engine, checkpoint, kasus
src/simulation/bpe.mjs, gpt3.mjs tokenizer BPE di browser dan angka GPT-3 dari paper
scripts/train-story-model.py     melatih ulang model mini (opsional)
scripts/world3d-browser-check.mjs
```

Halaman dan kode lama (mode teks, investigasi 14 pos, dunia 2D, annex, versi Inggris, panduan SEO) dihapus pada 14 November 2026. Arsipnya disimpan di luar repository sebagai `../neurolab-halaman-lama-2026-11-14.tar.gz`.
