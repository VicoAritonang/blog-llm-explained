# NeuroLab — Ikuti perjalanan satu token

Web pembelajaran LLM untuk blog portofolio: delapan stasiun 3D, tujuh eksperimen, inspector untuk menelusuri angka, dan mode 2D yang lengkap. Bahasa utama Indonesia.

**Simulator edukasi:** bobot mainan deterministik, bukan inference/aktivasi GPT-2 asli. Profil demo: lebar 8, 2 head × 4, MLP 32, 2 blok, vocabulary 16, maksimal 12 token. GPT-2 small menjadi referensi arsitektur; bobot model asli tidak diunduh.

## Menjalankan

Gunakan Node.js 22.18+ atau Node.js 24/25 dan npm.

```sh
npm ci
npm run dev
```

Buka **http://127.0.0.1:5173/**. Pilih **Ikuti satu token**, **Jelajahi lab**, atau **Baca tanpa 3D**. Diagram/kontrol tersedia lewat tab instrumen dan workbench di bawah canvas. Pada mobile, buka **Catatan lab** untuk inspector bottom sheet.

```sh
npm run build
npm run preview
```

Build statis berada di `dist/`. Artikel tersedia dalam HTML sebelum React siap. Three.js baru dimuat setelah masuk 3D. Tidak perlu backend, API key, atau CDN.

Jika subprocess Vite dibatasi lingkungan kerja, gunakan native config loader: `npm run dev -- --configLoader native` atau `npm run preview -- --configLoader native`.

## Fitur

- Tokenisasi preset mainan: ID, offset, whitespace, dan merge BPE lokal.
- Embedding + learned position, swap posisi, Q/K/V, head dan blok yang bisa dipilih.
- Dot product → scale → causal mask → softmax → AV → concat → output projection; derivasi memperlihatkan input, bobot, perkalian, jumlah, dan presisi penuh.
- Dua blok pre-norm lengkap: attention, residual, LayerNorm, MLP 8→32→8, GELU, residual kedua, final LayerNorm, tied output embedding.
- Sampling/greedy, temperature, top-k/top-p, seed, logits, lima kandidat + massa lainnya, append token.
- Decode incremental pipeline mainan; perbandingan numerik dengan forward penuh, cache on/off, pekerjaan ilustratif, reset prefix, dan rewind decode.
- Analogi word vectors: panah 3D, sumber 4D, ranking cosine.
- Guided/orbit/POV desktop, koridor aman, mobile tap-to-focus, reduced motion, lazy assets, batching, DPR terbatas, render saat diperlukan.
- Timeline diskret: play/pause, previous/next, replay, seek operasi, speed, deep link dengan parameter tervalidasi.
- Tiga checkpoint, glossary, pseudocode, provenance, sumber primer, fallback WebGL/asset, dan artikel diprerender.

## Verifikasi

```sh
npx playwright install chromium  # satu kali jika browser tes belum tersedia
npm run check
```

`check` menjalankan TypeScript strict, 26 tes matematika/geometri, build/prerender, dan browser checks Playwright + axe. Screenshot/laporan: `test-results/`. Browser tests memakai server localhost tersendiri, bukan tab browser pengguna.

`npm test` hanya menjalankan tes matematika. `npm run test:browser` memakai build terakhir. [Laporan implementasi](docs/implementation.md) menjelaskan cakupan/batas verifikasi. [Panduan integrasi](docs/integration.md) menjelaskan hosting subpath, iframe, exit link, dan asset base.

Target FPS di `system.md` belum menjadi klaim benchmark perangkat nyata. Pengujian browser memakai Chromium headless/software WebGL. Analytics tidak terpasang dan tidak ada statistik pengguna yang dikarang.

## Struktur

```text
src/app/          shell, artikel, tur, modal, CSS
src/content/      narasi, operasi, eksperimen, checkpoint, referensi
src/simulation/   decoder murni, schema, snapshot, sampling, cache
src/scenarios/    JSON offline versioned; 88 tensor/preset + lineage/steps
src/scene/        GLB batching, cells, panah, kamera, resource lifecycle
src/stations/     diagram/kontrol HTML/SVG
src/inspector/    matriks, derivasi, rumus, pseudocode, provenance
src/navigation/   deep-link whitelist dan validasi
src/store/        state pengalaman dan aksi navigasi
public/assets/    kit GLB asli
scripts/          fixture/prerender builder, QA, generator/katalog
tests/           invarian matematika independen
```

## Rancangan dan kit aset

[product.md](product.md) dan [system.md](system.md) adalah rancangan utama. [Kit aset](public/assets/lab-v1/README.md) berisi 25 GLB modular + satu referensi lab. Generator, manifest, layout, dan lisensi MIT tetap tersedia.

```sh
npm run fixtures:generate
npm run assets:preview
npm run assets:validate
```

Katalog lama: http://127.0.0.1:4173/preview/ saat server katalog berjalan. `npm run assets:generate` meregenerasi dan menimpa keluaran GLB; tidak diperlukan untuk menjalankan aplikasi.
