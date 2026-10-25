# NeuroLab: Masuk ke dalam mesin bahasa

Laboratorium LLM yang langsung terbuka sebagai dunia 3D orang pertama. Pengunjung berjalan di antara delapan instrumen, memakai lima alat, dan mempelajari mekanisme Transformer melalui Hint serta catatan interaktif. Tersedia dalam Bahasa Indonesia (`/id/`) dan Inggris (`/en/`). Antarmuka memakai Source Sans 3 yang dibundel lokal, dengan dark mode untuk HUD, catatan, tabel, dan eksperimen.

Seluruh pengalaman berjalan di browser menggunakan Three.js, React Three Fiber, dan geometri prosedural. Tidak ada backend, API key, unduhan bobot besar, atau panggilan inference. Preset lokal dan model mainan deterministik mendukung angka yang bisa diperiksa.

## Menjalankan

Gunakan Node.js 24 dan npm:

```sh
npm ci
npm run dev
```

Buka **http://127.0.0.1:5173/**. Dunia langsung tampil, tanpa homepage. Klik dunia untuk mengendalikan mouse. Escape melepas mouse agar tombol antarmuka bisa diklik.

| Kontrol | Fungsi |
| --- | --- |
| WASD / panah | Berjalan |
| Mouse | Melihat sekitar; seret jika pointer lock tidak tersedia |
| Shift / Space | Berjalan cepat / lompat |
| 1–5 / scroll | Pilih alat di hotbar |
| E / klik saat mouse terkunci | Gunakan alat yang dipegang |
| R | Maju satu operasi pembelajaran |
| H | Buka/tutup Hint kontekstual |
| M / J | Peta fasilitas / catatan lapangan |
| F | Konsol misi dan eksperimen |
| Esc | Lepas mouse atau tutup panel |

Pada ponsel: joystick untuk berjalan, seret dunia untuk melihat, ketuk hotbar untuk memilih alat, lalu **Gunakan**. Pengaturan menyediakan kualitas render, kecepatan sinyal, reduced motion, dan mode diagram 2D. Jika WebGL tidak tersedia, instrumen 2D terbuka otomatis.

## Alat dan pembelajaran

- **Pemindai:** bidik instrumen untuk membuka mekanisme, angka, rumus, dan pseudocode. Instrumen yang dipindai dicatat dalam progres eksplorasi.
- **Pelacak token:** ganti posisi token yang disorot pada matriks dan attention. Bukan simulasi tokenisasi GPT-3 yang sebenarnya.
- **Lensa head:** bandingkan dua head demo di Q/K/V, attention, dan Transformer.
- **Kalibrator:** alat kelima untuk mengganti konfigurasi model eksperimen secara langsung. E mengubah parameter; F membuka prediksi dan pengujian.
- **Pengendali waktu:** jeda/jalankan aliran sinyal. Gerakan pemain tetap tersedia saat sinyal dijeda; R menelusuri operasi secara manual.

Delapan area: tokenizer, embedding + posisi, Q/K/V, causal attention, blok Transformer, sampling token, KV cache, dan annex analogi vektor. Peta menyediakan perpindahan langsung. Hint mengikuti instrumen yang dibidik dan memberi saran alat, operasi aktif, serta alasan tahap tersebut penting.

Catatan lapangan mempertahankan tujuh eksperimen: tokenisasi, dot product, causal masking, analogi, sampling, dan cache, termasuk perjalanan token menyeluruh. Tab **Makna / Angka / Kode** menghubungkan visual dengan derivasi. Tab **Eksperimen** membuka kontrol preset, token/head/blok, temperature, top-k/top-p, seed, append token, serta cache.

**Dua skala dibedakan secara eksplisit:** referensi GPT-3 175B (96 blok, 96 head, lebar 12.288, MLP 49.152, konteks 2.048) dan workbench mainan (2 blok, 2 head, lebar 8, MLP 32, vocabulary 16). Visual dan lintasan bersifat ilustratif, bukan aktivasi GPT-3. GPT-3 memakai attention dense dan locally banded sparse bergantian; lab membedah causal dense attention. [Paper referensi](https://arxiv.org/abs/2005.14165).

Analogi vektor menyediakan tiga preset: Tokyo − Jepang + Prancis ≈ Paris, walking − walk + swim ≈ swimming, dan dokter − rumah sakit + sekolah ≈ guru. Grafik, vektor sumber, ranking cosine, formula catatan, dan label 3D mengikuti pilihan yang sama. Semua vektor adalah fixture ilustratif empat dimensi.

Lisensi font: `public/licenses/source-sans-3.txt` (SIL Open Font License).

## Misi dan sandbox

Buka **Misi [F]**, pilih tantangan, lalu **Lihat model 3D**. Kalibrator [5] + E mengubah instrumen yang dibidik. Pilih prediksi di konsol dan **Jalankan uji**; setiap lencana membutuhkan konfigurasi dan alasan yang tepat. Semua tantangan terbuka sejak awal, tanpa penalti atau batas percobaan.

Enam misi: segmentasi subword, penambahan posisi, causal mask, residual, temperature, dan pemakaian ulang KV cache. Model 3D khusus meliputi pemotong token, penanda posisi, gerbang mask, jembatan residual, tabung probabilitas, dan rak K/V. Arsip server, jalur utilitas, drone observasi, serta koleksi kristal penemuan melengkapi ruangan.

**Model misi memakai fixture ilustratif terpisah dari workbench numerik.** Angka tabung sampling adalah preset kualitatif, bukan keluaran softmax GPT-3. Konfigurasi tanpa mask/residual sengaja menjadi eksperimen yang melanggar arsitektur referensi. Pilih alat 1–4 untuk kembali melihat instrumen utama; Catatan tetap menyediakan derivasi model mainan.

Lencana disimpan lokal dengan key `neurolab-discoveries-v1`; konfigurasi dan prediksi direset saat reload. Storage yang tidak tersedia tidak menghalangi eksperimen. Konsol misi juga berfungsi pada fallback 2D.

## Build dan Vercel

```sh
npm run build
npm run preview
```

Build statis berada di `dist/`. React langsung membuka dunia; penjelasan pembelajaran tetap tersedia dalam HTML di bawah lab. Delapan topik memiliki halaman statis dalam masing-masing bahasa (18 URL canonical total). `vercel.json` memilih Vite, `npm run build`, dan output `dist`; Node.js 24 ditentukan dalam `package.json`. Import repository ke Vercel untuk deploy. Semua rendering dan interaksi berjalan di sisi client; tidak diperlukan Docker atau server aplikasi.

## SEO dan bahasa

Origin production: **https://llm-explained.vicoworks.com**. Build membuat canonical/hreflang, metadata sosial, JSON-LD, sitemap, robots.txt, llms.txt, llms-full.txt, dan salinan Markdown. Lab tetap client-side, sementara halaman topik dapat dibaca tanpa JavaScript. Tombol ID/EN mengganti bahasa sambil mempertahankan keadaan instrumen melalui hash yang tervalidasi.

Lihat [panduan deploy dan indexing](DEPLOYMENT.md) untuk DNS subdomain, verifikasi Google/Bing, pengiriman sitemap, dan pemeliharaan konten.

## Verifikasi

```sh
npx playwright install chromium
npm run check
```

Atau gunakan Chrome lokal di PowerShell:

```powershell
$env:NEUROLAB_BROWSER_CHANNEL='chrome'
npm run check
```

`check` menjalankan TypeScript, 34 tes matematika/geometri/collision, build, dan Playwright + axe. Browser checks mencakup masuk langsung, Hint, pemindaian, pergantian token/head, semua stasiun dan eksperimen, pause/resume piksel canvas, gerakan saat dijeda, collision, mouse look, joystick sentuh, reduced motion, fallback WebGL, dan permintaan jaringan lokal saja.

Screenshot, laporan aksesibilitas, serta draw calls/triangles tersimpan di `test-results/`. Pengujian memakai Chromium headless/software WebGL, bukan benchmark FPS perangkat nyata. `npm test` menjalankan unit tests; `npm run test:browser` menguji build terakhir.

## Struktur

```text
src/app/GameExperience.tsx     HUD, Hint, hotbar, dialog, kontrol sentuh
src/app/game.css              tampilan dunia dan layout responsif
src/scene/SimulationWorld.tsx  fasilitas dan instrumen Three.js
src/scene/Player.tsx           kamera FPS, mouse, keyboard, raycast
src/scene/Hands.tsx            tangan, alat, sway, pergantian, recoil
src/scene/world-physics.mjs    batas ruangan dan collision plinth
src/content/world.ts          lokasi, alat, saran eksplorasi
src/store/game.ts             alat, target, perjalanan, panel, progres
src/simulation/               decoder mainan, snapshot, sampling, cache
src/stations/                 diagram dan kontrol eksperimen
src/inspector/                matriks, derivasi, rumus, pseudocode
```

Scene utama tidak memerlukan GLB atau CDN. Kit GLB lama tetap tersedia terpisah di `public/assets/lab-v1/`. Untuk memperbarui cover dari dunia sebenarnya, jalankan dev server lalu `npm run poster:generate`. `NEUROLAB_BROWSER_CHANNEL=chrome` memakai Chrome lokal dan `NEUROLAB_PREVIEW_URL` mengganti URL.
