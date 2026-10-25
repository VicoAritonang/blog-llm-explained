import { t } from "../i18n/core.mjs";
export const stations = [
  {
    id: "tokenizer",
    title: "Tokenizer",
    short: t("Teks → token"),
    question: t("Bagaimana teks menjadi sesuatu yang bisa dihitung?"),
    description: t(
      "Model melihat ID token. Satu token dapat berupa kata, potongan kata, tanda baca, atau karakter dengan spasi awal.",
    ),
    formula: t(
      "\\text{teks} \\longrightarrow [\\text{ID}_0,\\ldots,\\text{ID}_{N-1}]",
    ),
    color: "#40d5de",
    icon: "scan",
    model: "tokenizer-bench",
    position: [-12, 0, -7],
  },
  {
    id: "embedding",
    title: t("Embedding & posisi"),
    short: t("Token → vektor"),
    question: t("Bagaimana ID token mendapatkan representasi?"),
    description: t(
      "ID memilih satu baris embedding. Vektor posisi terlatih ditambahkan agar model mengetahui urutan. ID itu sendiri bukan angka makna.",
    ),
    formula: "X_i=E[\\mathrm{ID}_i]+P[i]",
    color: "#40d5de",
    icon: "grid",
    model: "embedding-projector",
    position: [-4, 0, -7],
  },
  {
    id: "qkv",
    title: "Query, Key, Value",
    short: t("Tiga proyeksi"),
    question: t("Mengapa satu vektor menjadi tiga?"),
    description: t(
      "Query mencocokkan pola, Key menawarkan pola untuk dicocokkan, dan Value membawa informasi yang akan dicampurkan. Ketiganya proyeksi terlatih dari representasi yang sama.",
    ),
    formula: "U=\\mathrm{LN}(X),\\quad Q=UW_Q,\\ K=UW_K,\\ V=UW_V",
    color: "#a88ee8",
    icon: "split",
    model: "qkv-projector",
    position: [4, 0, -7],
  },
  {
    id: "attention",
    title: "Causal attention",
    short: t("Pilih konteks"),
    question: t("Token mana yang boleh memengaruhi token ini?"),
    description: t(
      "Skor Query–Key dibagi akar dimensi head. Posisi masa depan ditutup, lalu softmax membentuk bobot yang mencampurkan Value.",
    ),
    formula:
      "A=\\mathrm{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_h}}+M\\right),\\quad Z=AV",
    color: "#40d5de",
    icon: "network",
    model: "attention-workbench",
    position: [12, 0, -7],
  },
  {
    id: "transformer",
    title: t("Blok Transformer"),
    short: t("Perbarui representasi"),
    question: t("Apa yang terjadi setelah attention?"),
    description: t(
      "Setiap blok memiliki attention dan MLP. Dua residual mempertahankan jalur input. LayerNorm bekerja sepanjang dimensi fitur setiap token.",
    ),
    formula:
      "R=X+\\mathrm{Attention}(\\mathrm{LN}(X)),\\quad X^{\\prime}=R+\\mathrm{MLP}(\\mathrm{LN}(R))",
    color: "#eab96c",
    icon: "layers",
    model: "transformer-stack",
    position: [12, 0, 7],
  },
  {
    id: "sampling",
    title: t("Token berikutnya"),
    short: t("Vektor → probabilitas"),
    question: t("Bagaimana satu token akhirnya dipilih?"),
    description: t(
      "Representasi posisi terakhir melewati final LayerNorm dan proyeksi vocabulary yang berbagi embedding. Greedy memilih logit terbesar; sampling mengambil satu pilihan dari distribusi.",
    ),
    formula: "p=\\mathrm{softmax}\\!\\left(\\frac{H_{N-1}E^\\top}{T}\\right)",
    color: "#88d9ab",
    icon: "chart",
    model: "logits-amphitheater",
    position: [4, 0, 7],
  },
  {
    id: "cache",
    title: "Decode & KV cache",
    short: t("Gunakan kembali prefix"),
    question: t("Haruskah masa lalu dihitung lagi?"),
    description: t(
      "K/V lama pada setiap layer dapat dipakai kembali. Hanya token baru yang menghasilkan Query, Key, dan Value baru. Cache adalah aktivasi urutan ini, bukan bobot atau memori lintas pengguna.",
    ),
    formula: "\\mathrm{cache/layer}=2N\\,n_h\\,d_h\\,\\mathrm{bytes}",
    color: "#88d9ab",
    icon: "database",
    model: "kv-cache-rack",
    position: [-4, 0, 7],
  },
  {
    id: "analogy",
    title: t("Analogi vektor"),
    short: t("Annex eksplorasi"),
    question: t("Bisakah hubungan kata menjadi hubungan geometris?"),
    description: t(
      "Aritmetika vektor dapat memperlihatkan relasi pada word embeddings statis. Contoh lokal ini bukan mekanisme literal GPT menjawab dan bukan hubungan universal.",
    ),
    formula:
      "v_{\\mathrm{Tokyo}}-v_{\\mathrm{Jepang}}+v_{\\mathrm{Prancis}}\\approx v_{\\mathrm{Paris}}",
    color: "#a88ee8",
    icon: "move",
    model: "embedding-projector",
    position: [-12, 0, 7],
  },
] as const;
export type StationId = (typeof stations)[number]["id"];
export const experiments = [
  {
    id: "A",
    name: t("Perjalanan satu token"),
    subtitle: t("Dari teks hingga token berikutnya"),
    station: "tokenizer",
    tag: t("TUR UTAMA"),
    duration: t("8–12 menit"),
  },
  {
    id: "B",
    name: t("Mikroskop subword"),
    subtitle: t("Kata, spasi, dan bahasa"),
    station: "tokenizer",
    tag: "TOKENISASI",
    duration: t("3 menit"),
  },
  {
    id: "C",
    name: t("Telusuri attention"),
    subtitle: t("Bongkar satu dot product"),
    station: "attention",
    tag: "ATTENTION",
    duration: t("4 menit"),
  },
  {
    id: "D",
    name: t("Bisakah it melihat masa depan?"),
    subtitle: t("Ubah suffix, periksa prefix"),
    station: "attention",
    tag: "KAUSALITAS",
    duration: t("3 menit"),
  },
  {
    id: "E",
    name: t("Aritmetika vektor"),
    subtitle: t("Tokyo − Jepang + Prancis"),
    station: "analogy",
    tag: "VEKTOR",
    duration: t("3 menit"),
  },
  {
    id: "F",
    name: t("Logits sama, pilihan berbeda"),
    subtitle: "Temperature, top-k, top-p, seed",
    station: "sampling",
    tag: "SAMPLING",
    duration: t("4 menit"),
  },
  {
    id: "G",
    name: t("Gunakan kembali masa lalu"),
    subtitle: t("Prefill, decode, dan KV cache"),
    station: "cache",
    tag: "EFISIENSI",
    duration: t("3 menit"),
  },
] as const;
export type ExperimentId = (typeof experiments)[number]["id"];
export const operations: Record<
  StationId,
  { name: string; tensor: string; code: string; note: string }[]
> = {
  tokenizer: [
    {
      name: t("Teks masukan"),
      tensor: "ids",
      code: 'text = "The cat sat on the"',
      note: t(
        "Teks adalah titik awal. Profil ini memakai vocabulary mainan, bukan tokenizer GPT-2.",
      ),
    },
    {
      name: t("Pisahkan token"),
      tensor: "ids",
      code: "tokens = toy_tokenizer.preset(text)",
      note: t(
        "Spasi awal termasuk isi token. Preset menyimpan potongan dan offsets yang dapat direkonstruksi.",
      ),
    },
    {
      name: "Lookup ID",
      tensor: "ids",
      code: "ids = [vocab[token] for token in tokens]",
      note: t(
        "Posisi 0, 1, 2, … berbeda dari ID vocabulary. ID tidak menunjukkan besar atau kecilnya makna.",
      ),
    },
  ],
  embedding: [
    {
      name: "Lookup embedding",
      tensor: "embedding",
      code: "E_token = E[ids]  # [N, 8]",
      note: t(
        "Satu ID memilih satu baris dari matriks embedding terlatih; fixture ini memiliki 16 baris.",
      ),
    },
    {
      name: t("Lookup posisi"),
      tensor: "position",
      code: "P_token = P[positions]  # learned positions",
      note: t(
        "GPT-2 memakai learned position embeddings. Angka posisi di sini juga lookup, bukan sinusoidal.",
      ),
    },
    {
      name: t("Tambahkan posisi"),
      tensor: "X0",
      code: "X = E_token + P_token",
      note: t(
        "Penjumlahan dilakukan elemen demi elemen. Menukar urutan mempertahankan embedding token, tetapi mengganti kontribusi posisinya.",
      ),
    },
  ],
  qkv: [
    {
      name: "Pre-normalization",
      tensor: "U",
      code: "U = layer_norm(X, eps=1e-5)",
      note: t(
        "Hitung mean dan variance delapan fitur setiap token. Demo memakai gamma=1 dan beta=0.",
      ),
    },
    {
      name: t("Proyeksi Query"),
      tensor: "Q",
      code: "Q = U @ Wq + bq",
      note: t(
        "Klik angka hasil untuk menelusuri delapan pasangan perkalian antara baris input dan kolom bobot.",
      ),
    },
    {
      name: t("Proyeksi Key"),
      tensor: "K",
      code: "K = U @ Wk + bk",
      note: t(
        "Key membentuk pola yang dicocokkan oleh Query. Bobot model tetap; aktivasi bergantung pada input.",
      ),
    },
    {
      name: t("Proyeksi Value"),
      tensor: "V",
      code: "V = U @ Wv + bv",
      note: t(
        "Value adalah informasi yang dicampurkan setelah bobot attention tersedia.",
      ),
    },
    {
      name: t("Pisahkan dua head"),
      tensor: "headQ",
      code: "Qh = Q.reshape(N, 2, 4).transpose(1, 0, 2)",
      note: t(
        "Lebar 8 dibagi menjadi 2 head × 4 fitur. Mengganti head juga mengganti K, V, skor, dan hasilnya.",
      ),
    },
  ],
  attention: [
    {
      name: t("Kalikan Q × K"),
      tensor: "raw",
      code: "scores = Qh @ Kh.T",
      note: t(
        "Setiap sel membandingkan satu baris Query dan satu baris Key. Klik sel untuk melihat semua perkalian.",
      ),
    },
    {
      name: t("Jumlahkan dot product"),
      tensor: "raw",
      code: "score[i,j] = sum(Qh[i,d] * Kh[j,d] for d in range(4))",
      note: t(
        "Empat hasil perkalian dijumlahkan menjadi satu skor. Skor belum merupakan probabilitas.",
      ),
    },
    {
      name: "Scale",
      tensor: "scaled",
      code: "scaled = scores / sqrt(4)",
      note: t(
        "Pembagian oleh √d_head menjaga skala skor. Dalam demonstrasi ini √4 = 2.",
      ),
    },
    {
      name: "Causal mask",
      tensor: "masked",
      code: "scaled[j > i] = -inf",
      note: t(
        "Posisi masa depan belum tersedia. −∞ menjadi bobot nol tepat sesudah softmax.",
      ),
    },
    {
      name: t("Softmax per baris"),
      tensor: "A",
      code: "A = softmax(scaled, axis=-1)",
      note: t(
        "Normalisasi dilakukan sepanjang kolom Key, bukan seluruh matriks. Jumlah setiap baris adalah 1.",
      ),
    },
    {
      name: t("Campurkan Value"),
      tensor: "Z",
      code: "Z = A @ Vh",
      note: t(
        "Bobot attention dan kontribusi Value adalah dua hal berbeda. Klik output untuk melihat weighted sum.",
      ),
    },
    {
      name: t("Gabungkan head"),
      tensor: "concat",
      code: "concat = concatenate([Z_head1, Z_head2], axis=-1)",
      note: t("Dua output dengan lebar 4 digabung kembali menjadi lebar 8."),
    },
    {
      name: t("Proyeksi output"),
      tensor: "out",
      code: "attention_out = concat @ Wo + bo",
      note: t(
        "Proyeksi output terlatih mencampurkan fitur antarhead sebelum residual add.",
      ),
    },
  ],
  transformer: [
    {
      name: "Residual attention",
      tensor: "R",
      code: "R = X + attention_out",
      note: t(
        "Residual menambahkan representasi awal ke keluaran attention. Input tidak dibuang.",
      ),
    },
    {
      name: "Pre-norm MLP",
      tensor: "N",
      code: "N = layer_norm(R)",
      note: t(
        "LayerNorm kedua bekerja pada keluaran residual, per token sepanjang fitur.",
      ),
    },
    {
      name: t("Perluas 8 → 32"),
      tensor: "expanded",
      code: "expanded = N @ W1 + b1",
      note: t(
        "MLP memperluas dimensi fitur empat kali. Operasinya tetap dilakukan terpisah di setiap token.",
      ),
    },
    {
      name: t("Aktivasi GELU"),
      tensor: "activation",
      code: "activated = gelu(expanded)",
      note: t(
        "GELU adalah kurva halus; nilai negatif tidak seluruhnya diubah menjadi nol.",
      ),
    },
    {
      name: t("Kembali 32 → 8"),
      tensor: "M",
      code: "M = activated @ W2 + b2",
      note: t(
        "Proyeksi kedua mengembalikan dimensi agar penjumlahan residual memiliki shape yang sama.",
      ),
    },
    {
      name: "Residual MLP",
      tensor: "X",
      code: "X_next = R + M",
      note: t(
        "Setiap blok memiliki dua residual dan kedua sublayer. Skala referensi GPT-3: 96 blok; hitungan fixture: 2 blok.",
      ),
    },
  ],
  sampling: [
    {
      name: "Final LayerNorm",
      tensor: "H",
      code: "H = layer_norm(X_after_block2)",
      note: t(
        "Normalisasi final mengikuti dua blok demo. Hanya posisi terakhir yang dipakai untuk token berikutnya.",
      ),
    },
    {
      name: t("Proyeksi vocabulary"),
      tensor: "logits",
      code: "logits = H[-1] @ E.T  # tied weights",
      note: t(
        "Bobot output berbagi matriks embedding. Logits adalah skor mentah 16 token, bukan persentase.",
      ),
    },
    {
      name: t("Distribusi probabilitas"),
      tensor: "probabilities",
      code: "p = softmax(logits / temperature)",
      note: t(
        "Temperature positif mengubah bentuk distribusi. Temperature 0 memakai argmax tanpa membagi nol.",
      ),
    },
    {
      name: t("Pilih satu token"),
      tensor: "probabilities",
      code: "next_id = argmax(logits) if greedy else sample(p, seed)",
      note: t(
        "Greedy deterministik; sampling dapat memilih hasil berbeda. Probabilitas tinggi tidak menjamin fakta benar.",
      ),
    },
  ],
  cache: [
    {
      name: t("Simpan prefix K/V"),
      tensor: "K",
      code: "cache[layer] = (K_prefix, V_prefix)",
      note: t(
        "Prefill menghitung prompt dengan causal mask, lalu menyimpan aktivasi K/V pada setiap layer.",
      ),
    },
    {
      name: t("Decode token baru"),
      tensor: "V",
      code: "K = concat(K_cached, K_new); V = concat(V_cached, V_new)",
      note: t(
        "Query baru melihat seluruh Key yang tersedia. K/V prefix tidak diproyeksikan ulang.",
      ),
    },
    {
      name: t("Ulangi autoregresi"),
      tensor: "X",
      code: "ids.append(next_id)  # then repeat the same decoder",
      note: t(
        "Token baru menjadi bagian input berikutnya. Edit prefix membatalkan cache yang bergantung padanya.",
      ),
    },
  ],
  analogy: [
    {
      name: t("Vektor sumber"),
      tensor: "analogy",
      code: "a, b, c = selected_example.vectors",
      note: t(
        "Ini word vectors mainan statis empat dimensi, terpisah dari pipeline Transformer.",
      ),
    },
    {
      name: t("Aritmetika vektor"),
      tensor: "analogy",
      code: "target = a - b + c",
      note: t(
        "Penjumlahan dan pengurangan berlangsung pada vektor sumber. Lab menampilkan proyeksi dua dimensi; ranking memakai empat dimensi sumber.",
      ),
    },
    {
      name: "Ranking cosine",
      tensor: "analogy",
      code: "rank = sorted(cosine(target, vector) for vector in candidates)",
      note: t(
        "Hasil mendekati target contoh terpilih pada fixture ini. Tidak identik tepat dan tidak berlaku universal.",
      ),
    },
  ],
};
export const checkpoints = [
  {
    question: t("Dalam Z = A V, vektor apa yang dicampurkan?"),
    choices: [
      t("Key: karena cocok dengan Query"),
      t("Value: dengan bobot attention"),
      t("ID token: dijumlahkan langsung"),
    ],
    correct: 1,
    explanation: t(
      "Query dan Key menentukan bobot. Value membawa informasi yang dijumlahkan dengan bobot tersebut.",
    ),
    station: "attention",
  },
  {
    question: t(
      "Suffix setelah it berubah. Apa yang terjadi pada representasi it?",
    ),
    choices: [
      t("Tetap sama karena prefix identik"),
      t("Berubah karena semua token saling melihat"),
      t("Cache mengubahnya secara acak"),
    ],
    correct: 0,
    explanation: t(
      "Causal mask menutup masa depan. Dalam decoder, posisi it hanya dipengaruhi prefix sampai posisi itu.",
    ),
    station: "attention",
  },
  {
    question: t("Apa yang disimpan KV cache?"),
    choices: [
      t("Bobot model dari training"),
      t("Ingatan semua pengguna"),
      t("Aktivasi Key dan Value prefix per layer"),
    ],
    correct: 2,
    explanation: t(
      "Cache menyimpan aktivasi urutan yang sedang diproses. Bobot tetap, dan edit prefix membatalkan cache.",
    ),
    station: "cache",
  },
] as const;
export const glossary = [
  ["Token", t("Unit vocabulary; tidak selalu satu kata.")],
  [
    "Tensor",
    t("Array angka multidimensi. Shape menyatakan panjang tiap sumbu."),
  ],
  [
    "Weights",
    t(
      "Parameter terlatih yang tetap selama inference. Demo memakai bobot mainan.",
    ),
  ],
  [t("Aktivasi"), t("Angka hasil perhitungan yang bergantung pada input.")],
  ["Logits", t("Skor vocabulary sebelum softmax.")],
  [
    t("Autoregresi"),
    t("Token keluaran ditambahkan ke input, lalu proses diulang."),
  ],
  ["Head", t("Satu proyeksi attention; bukan peran semantik universal.")],
  ["Residual", t("Penjumlahan input dengan output sublayer.")],
];
export const references = [
  {
    title: "GPT-3 · Language Models are Few-Shot Learners",
    url: "https://arxiv.org/abs/2005.14165",
    note: t(
      "Skala 175B: 96 blok, lebar 12.288, 96 head, konteks 2.048; attention dense dan locally banded sparse bergantian.",
    ),
  },
  {
    title: t("GPT-2 · implementasi referensi"),
    url: "https://github.com/openai/gpt-2/blob/master/src/model.py",
    note: t("Pre-norm, learned position, GELU, residual, dan tied embedding."),
  },
  {
    title: "Attention Is All You Need",
    url: "https://arxiv.org/abs/1706.03762",
    note: t("Dasar scaled dot-product dan multi-head attention."),
  },
  {
    title: "Word representations · Mikolov et al.",
    url: "https://arxiv.org/abs/1301.3781",
    note: t("Latar word embeddings statis dan hubungan geometris."),
  },
  {
    title: "KV cache · Hugging Face",
    url: "https://huggingface.co/docs/transformers/main/cache_explanation",
    note: t("Perbedaan prefill, decode, dan pemakaian ulang K/V."),
  },
];
