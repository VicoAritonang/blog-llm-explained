export const SITE_ORIGIN = "https://llm-explained.vicoworks.com";
export const publisher = { name: "Vicoworks", url: "https://vicoworks.com" };
export const languages = ["id", "en"];
export const siteCopy = {
  id: {
    title: "Masuk ke Dalam Model Bahasa: Belajar LLM di Dunia 3D | NeuroLab",
    description:
      "Jelajahi pulau 3D yang berisi model bahasa sungguhan. Potong token, sorot attention, putar suhu, latih bobot, dan tangkap halusinasi langsung di browser.",
    heading: "Masuk ke dalam model bahasa: belajar LLM dengan menyentuh mesinnya",
    intro:
      "Mengganti satu kata dalam catatan dapat mengubah jawaban tanpa melatih ulang model. NeuroLab mengajakmu menyelidiki kasus kunci cadangan melalui 14 pos: simpan dugaan, periksa perhitungan, lalu jelaskan buktinya. Model decoder mini terlatih menghitung angka yang sama untuk inspector dan visual 3D, langsung di browser. Bahasa utama investigasi ini adalah Indonesia; eksplorasi bebas lama tetap tersedia dalam Indonesia dan Inggris.",
    learn: "Panduan belajar LLM",
    back: "Kembali ke lab",
    try: "Coba di lab 3D",
    topics: "Annex: bacaan operasi pada workbench matematika",
    steps: "Cara menggunakan lab interaktif",
    controls:
      "Halaman utama adalah dunia 3D: sebuah pulau berisi delapan mesin yang mengikuti perjalanan teks di dalam model bahasa. Mesin Tanya menjalankan model mini sungguhan; Pemotong Token memotong catatan dan melatih tokenizer BPE; Galaksi Makna menampilkan embedding sebagai bintang; Panggung Sorot memperlihatkan attention dan membiarkanmu mencabut kepala attention; Arena Peluang mengundi token berikutnya dengan suhu yang bisa diputar; Bengkel Latihan menuruni lembah loss; Ruang Bukti memperlihatkan halusinasi dan retrieval; Menara Skala membandingkan model mini dengan GPT-3. Berjalan dengan WASD, panah, atau klik/ketuk tanah; masuk ke mesin dengan E, klik, atau tombol 1–8. Setiap mesin punya tantangan pendek yang tercentang dari tindakan nyata, dan penjelasan baru muncul sebagai kartu temuan setelah kamu menghasilkan efeknya. Semua kontrol juga tersedia sebagai tombol biasa. Mode teks per level, investigasi lengkap 14 pos, dan dunia 2D lama tetap tersedia.",
    tools:
      "Pilih posisi pada rel token; pilih blok dan head untuk memeriksa Q/K/V, mask, dan campuran Value. Ubah decoding, jalankan generation selangkah demi selangkah, bandingkan cache, lalu periksa training dan sumber. Buku bukti menyimpan prediksi, kondisi, observasi, dan penjelasan di perangkatmu serta dapat diunduh.",
    limitsTitle: "Sumber angka dan batas simulasi",
    limits:
      "Jalur investigasi memakai keys-decoder-v1: 2 blok, 2 head, lebar 32, MLP 64, vocabulary 32, konteks 64, dan 20.256 parameter terlatih pada tugas sintetis terbatas. Semua logits, probabilitas, dan aktivasi dihitung dari checkpoint itu. Hasil uji 112/112 hanya untuk split sintetis yang dijelaskan; sebuah kasus dua benda di luar pola latihan gagal dan tetap ditampilkan. Contoh operator diberi label terpisah. Annex lama memakai bobot acak deterministik (lebar 8) dan fixture ilustratif, bukan trace kasus kunci. Tidak ada bobot model besar atau API inference. Kelancaran jawaban dan probabilitas token tidak menjamin kebenaran.",
    faq: "Pertanyaan yang sering diajukan",
    sources: "Sumber primer",
    by: "Dibuat oleh",
    reading:
      "Panduan ini dapat dibaca tanpa JavaScript. Dunia 3D dan eksperimen memerlukan JavaScript; seluruh proses berjalan di browser.",
    more: "Topik terkait",
    observe: "Apa yang dapat kamu amati di lab?",
    mechanism: "Cara kerjanya",
    takeaway: "Hal yang perlu diingat",
    home: "Lab interaktif",
    loading: "Menyiapkan investigasi kasus kunci…",
    loadingLink: "Baca panduan sambil menunggu",
    faqItems: [
      [
        "Apa itu LLM?",
        "Large language model adalah model yang mempelajari pola bahasa dari data. Decoder autoregresif memprediksi distribusi token berikutnya berdasarkan konteks, memilih satu token, lalu mengulang proses.",
      ],
      [
        "Apakah lab ini gratis dan membutuhkan API key?",
        "Lab ini gratis dan berjalan di sisi client. Tidak diperlukan API key, akun, atau server inference. Preset lokal dan model mainan dipakai untuk pembelajaran.",
      ],
      [
        "Apakah nilai attention menunjukkan alasan pasti sebuah jawaban?",
        "Bobot attention menunjukkan campuran Value pada satu head dan satu langkah. Itu bukan penjelasan lengkap atas keputusan model atau jaminan kebenaran jawaban.",
      ],
      [
        "Apa bedanya training dan inference?",
        "Training memperbarui bobot melalui loss, backpropagation, dan optimizer. Inference memakai bobot yang tetap untuk menghasilkan aktivasi dan memprediksi token berikutnya.",
      ],
    ],
  },
  en: {
    title: "Learn LLMs Interactively with 3D Visualizations | NeuroLab",
    description:
      "Learn how LLMs work in a free interactive 3D lab. Explore tokenization, embeddings, attention, Transformers, sampling, and KV caching in English.",
    heading: "Learn LLMs interactively, from tokens to generated text",
    intro:
      "NeuroLab is a browser-based LLM learning laboratory by Vicoworks. Explore a first-person 3D world, use five tools, and test your understanding through six missions. This guide helps IT and data practitioners understand how large language models work, including decoder Transformer mechanisms underlying the GPT family.",
    learn: "LLM learning guide",
    back: "Back to the lab",
    try: "Try it in the 3D lab",
    topics: "Explore the mechanisms",
    steps: "How to use the interactive lab",
    controls:
      "Click the world to look around, walk with WASD, choose tools 1–5, and press E to use them. H opens Hint and F opens missions. On phones, use the joystick, drag to look, and tap Use. The journal offers Meaning, Numbers, and Code tabs. A 2D mode is available without WebGL.",
    tools:
      "The Scanner opens notes. The Token tracer selects token positions. The Head lens compares two demo heads. The Time controller pauses signals. The Calibrator changes experiment conditions before you predict and test the outcome.",
    limitsTitle: "Reference scale and simulation limits",
    limits:
      "Visuals use illustrative flows and fixtures. GPT-3 175B has 96 blocks, 96 heads per block, width 12,288, and a 2,048-token context. Its paper alternates dense and locally banded sparse attention; this lab examines causal dense attention. The numerical workbench uses a toy model with two blocks, two heads, width 8, and a vocabulary of 16. GPT-3 weights are not loaded, and presets do not generate answers from a trained language model.",
    faq: "Frequently asked questions",
    sources: "Primary sources",
    by: "Created by",
    reading:
      "This guide works without JavaScript. The 3D world and experiments require JavaScript; all processing happens in your browser.",
    more: "Related topics",
    observe: "What can you observe in the lab?",
    mechanism: "How it works",
    takeaway: "What to remember",
    home: "Interactive lab",
    loading: "Preparing the 3D world…",
    loadingLink: "Read the guide while loading",
    faqItems: [
      [
        "What is an LLM?",
        "A large language model learns language patterns from data. An autoregressive decoder predicts a next-token distribution from context, selects a token, and repeats.",
      ],
      [
        "Is this lab free, and do I need an API key?",
        "The lab is free and runs client-side. No API key, account, or inference server is required. Local presets and a toy model support learning.",
      ],
      [
        "Do attention weights explain exactly why a model answered?",
        "Attention weights describe a mixture of Values within one head and step. They are not a complete explanation of a model's decision or a guarantee of factual correctness.",
      ],
      [
        "How do training and inference differ?",
        "Training updates weights through loss, backpropagation, and an optimizer. Inference keeps weights fixed while producing activations and predicting the next token.",
      ],
    ],
  },
};
export const topicSlugs = {
  tokenizer: { id: "tokenisasi", en: "tokenization" },
  embedding: { id: "embedding-posisi", en: "embeddings-position" },
  qkv: { id: "query-key-value", en: "query-key-value" },
  attention: { id: "causal-attention", en: "causal-attention" },
  transformer: { id: "blok-transformer", en: "transformer-block" },
  sampling: { id: "sampling-temperature", en: "sampling-temperature" },
  cache: { id: "kv-cache", en: "kv-cache" },
  analogy: { id: "analogi-vektor", en: "vector-analogies" },
};
export const topicPath = (station, lang) =>
  `/${lang}/${lang === "id" ? "belajar" : "learn"}/${topicSlugs[station][lang]}/`;
export const topicTitles = {
  tokenizer: {
    id: "Apa Itu Tokenisasi LLM? Belajar dengan Visualisasi Interaktif",
    en: "What Is LLM Tokenization? Learn with Interactive Visualizations",
  },
  embedding: {
    id: "Embedding dan Posisi Token dalam LLM",
    en: "Token Embeddings and Positions in LLMs",
  },
  qkv: {
    id: "Query, Key, Value: Cara Kerja Attention LLM",
    en: "Query, Key, Value: How LLM Attention Works",
  },
  attention: {
    id: "Causal Attention dan Mask pada Transformer",
    en: "Causal Attention and Masking in Transformers",
  },
  transformer: {
    id: "Blok Transformer: Residual, LayerNorm, MLP, dan GELU",
    en: "Transformer Blocks: Residuals, LayerNorm, MLP, and GELU",
  },
  sampling: {
    id: "Sampling LLM: Temperature, Top-k, dan Top-p",
    en: "LLM Sampling: Temperature, Top-k, and Top-p",
  },
  cache: {
    id: "Apa Itu KV Cache? Memahami Prefill dan Decode LLM",
    en: "What Is a KV Cache? Understanding LLM Prefill and Decoding",
  },
  analogy: {
    id: "Analogi Vektor dan Embedding Statis",
    en: "Vector Analogies and Static Embeddings",
  },
};
export const articleDate = "2026-10-25";
