import fs from "node:fs/promises";
import { stations, references } from "../src/content/lessons.ts";
const escape = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const article = `<main class="landing"><section class="article-body"><span class="section-kicker">NEUROLAB · LABORATORIUM PEMBELAJARAN LLM</span><h1>Ikuti perjalanan satu token.</h1><p>Dari teks menjadi angka, dari angka menjadi token berikutnya. Artikel interaktif ini menjelaskan decoder-only Transformer dengan GPT-2 sebagai referensi arsitektur.</p><p>Simulator edukasi. Angka diperkecil dan dikurasi; bukan keluaran GPT-2 asli. Profil demo: lebar 8, dua head, MLP 32, dua blok, vocabulary mainan 16, maksimal 12 token.</p>${stations.map((s, i) => `<article><h2>${String(i + 1).padStart(2, "0")} · ${escape(s.title)}</h2><h3>${escape(s.question)}</h3><p>${escape(s.description)}</p></article>`).join("")}<h2>Mengapa GPT-2?</h2><p>Implementasi publik GPT-2 memberi referensi yang dapat ditelusuri: pre-norm, learned position embeddings, GELU, dua residual, final LayerNorm, dan tied embedding. Lab tidak memuat bobot model asli.</p><h2>Sumber primer</h2>${references.map((r) => `<p><a href="${escape(r.url)}">${escape(r.title)}</a> — ${escape(r.note)}</p>`).join("")}<p>JavaScript memuat tur, inspector, dan eksperimen; tampilan 3D baru dimuat setelah masuk lab. Artikel ini tetap tersedia sebelum aplikasi siap.</p></section></main>`;
const file = new URL("../dist/index.html", import.meta.url);
const html = await fs.readFile(file, "utf8");
await fs.writeFile(
  file,
  html.replace('<div id="root"></div>', `<div id="root">${article}</div>`),
);
console.log("Prerendered Indonesian lesson article.");
