export const SITE_ORIGIN = "https://llm-explained.vicoworks.com";
export const publisher = { name: "Vicoworks", url: "https://vicoworks.com" };
export const languages = ["id", "en"];
export const siteCopy = {
  id: {
    title: "Belajar LLM Interaktif dengan Visualisasi 3D | NeuroLab",
    description:
      "Belajar cara kerja LLM secara interaktif: tokenisasi, embedding, attention, Transformer, sampling, dan KV cache dalam lab 3D gratis berbahasa Indonesia.",
    heading: "Belajar LLM secara interaktif, dari token hingga jawaban",
    intro:
      "NeuroLab adalah laboratorium pembelajaran LLM berbasis browser dari Vicoworks. Jelajahi dunia 3D orang pertama, gunakan lima alat, dan uji pemahaman melalui enam misi. Panduan ini membantu praktisi IT dan data memahami cara kerja large language model, termasuk mekanisme decoder Transformer yang menjadi dasar keluarga GPT.",
    learn: "Panduan belajar LLM",
    back: "Kembali ke lab",
    try: "Coba di lab 3D",
    topics: "Pelajari mekanismenya",
    steps: "Cara menggunakan lab interaktif",
    controls:
      "Klik dunia untuk melihat sekitar, gunakan WASD untuk berjalan, pilih alat 1–5, lalu tekan E. H membuka Hint dan F membuka misi. Pada ponsel, gunakan joystick, seret untuk melihat, lalu ketuk Gunakan. Catatan menyediakan tab Makna, Angka, dan Kode. Mode 2D tersedia jika WebGL tidak didukung.",
    tools:
      "Pemindai membuka catatan. Pelacak token memilih posisi token. Lensa head membandingkan dua head demo. Pengendali waktu menjeda sinyal. Kalibrator mengubah kondisi eksperimen sebelum kamu memprediksi dan menguji hasilnya.",
    limitsTitle: "Skala referensi dan batas simulasi",
    limits:
      "Visualisasi memakai aliran dan fixture ilustratif. Referensi GPT-3 175B memiliki 96 blok, 96 head per blok, lebar 12.288, dan konteks 2.048 token. Paper GPT-3 memakai attention dense dan locally banded sparse bergantian; lab ini membedah causal dense attention. Workbench angka memakai model mainan dua blok, dua head, lebar 8, dan vocabulary 16. Bobot GPT-3 tidak dimuat, dan preset tidak menghasilkan jawaban dari model bahasa terlatih.",
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
    loading: "Menyiapkan dunia 3D…",
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
