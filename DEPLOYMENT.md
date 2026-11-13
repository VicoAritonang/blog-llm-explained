# Deploy NeuroLab

Target production: **https://llm-explained.vicoworks.com**.

1. Project Vercel memakai Node.js 24. `vercel.json` menjalankan `npm run build` dan menyajikan `dist/`.
2. Domain `llm-explained.vicoworks.com` ditambahkan di **Settings → Domains** project Vercel, dengan CNAME `llm-explained` di DNS `vicoworks.com` sesuai target yang ditampilkan Vercel.
3. Deploy manual dari folder kerja: `vercel --prod`.

Situs ini satu halaman (`/`). URL lama `/id/…`, `/en/…`, `/content/…`, dan `llms*.txt` dialihkan permanen ke `/`. `robots.txt` dan `sitemap.xml` (satu URL) ada di `public/`. Bila situs sudah terdaftar di Google Search Console atau Bing Webmaster Tools, kirim ulang sitemap agar halaman lama dikeluarkan dari indeks.
