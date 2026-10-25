# Deploy NeuroLab dan aktifkan pencarian

Target production: **https://llm-explained.vicoworks.com**.

## Deploy ke Vercel

1. Import repository ini sebagai project Vercel dengan Node.js 24. Konfigurasi Vite, `npm run build`, dan output `dist` sudah ada di `vercel.json`.
2. Di project Vercel, buka **Settings → Domains**, lalu tambahkan `llm-explained.vicoworks.com` untuk environment Production.
3. Di pengelola DNS `vicoworks.com`, buat CNAME dengan nama `llm-explained`. Gunakan target persis yang ditampilkan Vercel untuk project ini. Tunggu sampai domain dan sertifikat HTTPS dinyatakan valid di dashboard.
4. Buka `/id/` dan `/en/` pada domain production. Root `/` diarahkan permanen ke `/id/`.

Ikuti [panduan domain resmi Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain). Nilai target DNS dapat berbeda per project, sehingga tidak ditanam sebagai satu nilai umum di repository.

## Verifikasi dan kirim sitemap

- Tambahkan situs di [Google Search Console](https://search.google.com/search-console) dan [Bing Webmaster Tools](https://www.bing.com/webmasters/). Verifikasi kepemilikan melalui DNS, atau gunakan metode meta tag di bawah.
- Untuk verifikasi meta tag, isi `GOOGLE_SITE_VERIFICATION` dan/atau `BING_SITE_VERIFICATION` di environment variables Production Vercel dengan nilai token yang disediakan layanan tersebut, lalu redeploy. Tidak ada token dummy yang diterbitkan saat nilainya kosong.
- Kirim **https://llm-explained.vicoworks.com/sitemap.xml** pada kedua layanan.
- Gunakan URL Inspection untuk `/id/`, `/en/`, dan satu halaman topik. Pastikan HTML yang diterima sudah berisi penjelasan, canonical, dan bahasa yang benar.
- Tambahkan tautan biasa dari blog atau portofolio utama menuju lab, serta satu atau dua halaman topik yang relevan. Halaman lab sudah menautkan kembali ke Vicoworks.

File yang tersedia setelah build:

| URL | Isi |
| --- | --- |
| `/id/` | Lab dan panduan Bahasa Indonesia |
| `/en/` | English lab and learning guide |
| `/id/belajar/tokenisasi/` | Contoh halaman topik Indonesia |
| `/en/learn/tokenization/` | Contoh halaman topik Inggris |
| `/sitemap.xml` | 18 URL canonical beserta alternatif bahasa |
| `/robots.txt` | Mengizinkan crawler dan mencantumkan sitemap |
| `/llms.txt` | Peta konten untuk pembaca AI |
| `/llms-full.txt` | Penjelasan lengkap dalam dua bahasa |
| `/content/id/tokenizer.md` | Contoh salinan Markdown untuk mesin |

## Cara implementasi bekerja

Dunia Three.js tetap client-side dan langsung terbuka pada viewport pertama. Penjelasan pembelajaran berada di HTML biasa di bawah lab, tersedia untuk pengunjung dan crawler yang sama. Tombol Panduan pada pengaturan atau Hint membuka bagian tersebut. Saat lab di luar layar, sinyal dijeda agar pembacaan panduan tidak terus memakai GPU.

Delapan topik mendapat halaman HTML statis dalam kedua bahasa. Halaman topik tidak memuat Three.js atau memerlukan JavaScript. Tautan Coba di lab membuka instrumen yang sesuai. Tidak ada tampilan khusus yang disembunyikan hanya untuk bot.

Setiap halaman memiliki judul, deskripsi, canonical sendiri, `hreflang` dua arah (`id`, `en`, `x-default`), Open Graph, Twitter Card, dan JSON-LD yang sesuai isinya. Markdown diberi `X-Robots-Tag: noindex` supaya salinan mesin tidak bersaing dengan halaman HTML. Preview Vercel memakai meta `noindex` ketika `VERCEL_ENV=preview`.

`llms.txt` adalah format panduan yang diusulkan, bukan syarat atau jaminan kemunculan pada jawaban AI. Konten yang dapat diakses, tautan yang dapat dirayapi, dan kelayakan indeks tetap menjadi dasar. Lihat [Google AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) dan [spesifikasi llms.txt](https://llmstxt.org/).

## Memelihara konten

- Narasi, operasi, dan referensi: `src/content/lessons.ts` dan `src/content/architecture.ts`.
- Terjemahan Inggris: `src/i18n/*.mjs`. Teks Indonesia menjadi sumber, dan `t()` memilih terjemahan berdasarkan URL. Rumus, ID instrumen, serta data numerik tetap stabil.
- Judul SEO, slug, FAQ, dan origin: `src/seo/content.mjs`.
- Generator HTML, schema, dan teks mesin: `scripts/site-seo.mjs` serta `scripts/build-site.mjs`.
- File di `public/sitemap.xml`, `public/robots.txt`, dan `public/llms*.txt` digenerasi ulang saat build. Edit sumber generator, bukan hasilnya.
- Ubah `articleDate` hanya ketika konten pelajaran benar-benar diperbarui. Build tidak mengganti tanggal secara otomatis.

Jalankan `npm run check` sebelum deploy. Pemeriksaan meliputi TypeScript, 34 unit tests, build, struktur 18 halaman SEO, dan browser dengan/tanpa JavaScript dalam dua bahasa. Screenshot dan laporan berada di `test-results/`.

Deploy dan file teknis membantu proses penemuan dan pemahaman konten. Indeks, posisi pencarian, serta kutipan AI ditentukan oleh masing-masing layanan dan perlu dipantau setelah domain online.
