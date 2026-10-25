import { t } from "../i18n/core.mjs";
import type { StationId } from "./lessons";

// Presentation data only. These dimensions describe the reference model, not
// the small numerical workbench, and never allocate model-sized tensors.
export const modelReference = {
  name: "GPT-3 · 175B",
  layers: 96,
  heads: 96,
  width: 12288,
  headWidth: 128,
  mlpWidth: 49152,
  context: 2048,
  source: "https://arxiv.org/abs/2005.14165",
};
export const architecture: Record<
  StationId,
  {
    label: string;
    shape: string;
    story: string;
    watch: string;
    flow: string[];
  }
> = {
  tokenizer: {
    label: "01 / THE INPUT",
    shape: t("teks → N ID token"),
    story: t(
      "Kalimat masuk sebagai potongan teks. Tokenizer mengubah setiap potongan menjadi ID vocabulary; satu token tidak selalu satu kata.",
    ),
    watch: t(
      "Kapsul terpisah menunjukkan batas token. Warnanya mengikuti posisi token sepanjang perjalanan.",
    ),
    flow: [t("Teks UTF-8"), "Byte-level BPE", t("ID vocabulary")],
  },
  embedding: {
    label: "02 / REPRESENTATION",
    shape: "[N] → [N, 12.288]",
    story: t(
      "Setiap ID mengambil satu vektor dari tabel embedding. Tambahkan embedding posisi, sehingga token yang sama di posisi berbeda memiliki representasi masukan berbeda.",
    ),
    watch: t(
      "Kolom cahaya adalah fitur vektor. Warna merupakan ilustrasi nilai, bukan sumbu makna yang dapat diberi nama.",
    ),
    flow: ["Token embedding", t("+ Posisi terlatih"), "Residual stream"],
  },
  qkv: {
    label: "03 / THREE PROJECTIONS",
    shape: t("96 head × 128 fitur"),
    story: t(
      "Di dalam setiap blok, LayerNorm menormalkan fitur per token. Tiga proyeksi terlatih menghasilkan Query, Key, dan Value, lalu fitur dibagi menjadi beberapa head. Stasiun Q/K/V, attention, dan residual/MLP membedah bagian dari blok yang sama.",
    ),
    watch: t(
      "Satu aliran bercabang tiga: Query mencari kecocokan, Key dicocokkan, Value membawa informasi.",
    ),
    flow: ["LayerNorm", "WQ · WK · WV", t("Split 96 head")],
  },
  attention: {
    label: "04 / CONTEXT MIXING",
    shape: "[N, 128] → [N, N] → [N, 128]",
    story: t(
      "QKᵀ menghasilkan skor pasangan token. Skor dibagi √128, posisi masa depan ditutup, lalu softmax menghasilkan bobot untuk mencampurkan Value.",
    ),
    watch: t(
      "Garis hanya menuju posisi saat ini dan sebelumnya. Ketebalan menunjukkan bobot contoh; head lain dapat memiliki pola berbeda.",
    ),
    flow: ["QKᵀ / √128", "Causal mask", "Softmax · V", "Concat · WO"],
  },
  transformer: {
    label: "05 / THE TRANSFORMER",
    shape: "12.288 → 49.152 → 12.288",
    story: t(
      "Hasil attention ditambahkan ke residual stream. LayerNorm kedua dan MLP dengan GELU mengolah fitur per token, lalu residual kedua ditambahkan. Blok ini diulang 96 kali dengan bobot berbeda.",
    ),
    watch: t(
      "Jalur luar melewati cabang attention dan MLP: inilah residual. 96 pelat di belakang mewakili kedalaman model, bukan 96 langkah decoding.",
    ),
    flow: [
      "X + Attention(LN(X))",
      "LayerNorm",
      "Linear · GELU · Linear",
      "+ Residual",
    ],
  },
  sampling: {
    label: "06 / THE NEXT TOKEN",
    shape: t("posisi terakhir → logits vocabulary"),
    story: t(
      "Setelah blok terakhir, final LayerNorm dan LM head memetakan representasi posisi terakhir ke logits vocabulary. Temperature dan filter mengubah distribusi sebelum satu token dipilih.",
    ),
    watch: t(
      "Batang adalah kandidat token. Pilihan menambah satu token ke konteks; model tidak menghasilkan satu kalimat sekaligus.",
    ),
    flow: [
      "Final LayerNorm",
      "LM head",
      "Temperature · top-k/p",
      t("Pilih 1 token"),
    ],
  },
  cache: {
    label: "07 / AUTOREGRESSIVE LOOP",
    shape: "K/V per layer · prefix + 1 token",
    story: t(
      "Prefill memproses prompt. Ketika decode, K dan V token lama disimpan per layer; Query token baru membaca cache itu. Token terpilih ditambahkan ke input dan proses berulang hingga batas atau token akhir.",
    ),
    watch: t(
      "Rak menyimpan dua aliran: K dan V. Jalur balik membawa token baru ke model. Cache tidak menyimpan seluruh jawaban yang sudah disiapkan.",
    ),
    flow: [
      "Prefill prompt",
      t("Simpan K & V"),
      "Decode 1 token",
      t("Append · ulangi"),
    ],
  },
  analogy: {
    label: "ANNEX / VECTOR GEOMETRY",
    shape: t("proyeksi 3D dari ruang berdimensi tinggi"),
    story: t(
      "Vektor membantu membayangkan relasi antarrepresentasi. Aritmetika Tokyo − Jepang + Prancis merupakan contoh embedding statis, terpisah dari jalur inferensi Transformer.",
    ),
    watch: t(
      "Tiga sumbu hanya proyeksi ilustratif. Model sebenarnya memiliki ribuan fitur, dan representasi berubah mengikuti konteks.",
    ),
    flow: [t("Embedding statis"), t("Operasi vektor"), "Cosine similarity"],
  },
};
