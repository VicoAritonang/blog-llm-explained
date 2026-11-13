import type { Quiz } from "./books";

// Skip exams for visitors who already know a level. Every answer must be right;
// a wrong answer shows why and sends the visitor back to the quests.
export const exams: Quiz[][] = [
  [
    {
      q: "Model mini menjawab benar untuk pasangan benda–tempat yang tidak pernah ia lihat saat belajar. Artinya…",
      options: [
        "Ia punya aturan tertulis untuk setiap catatan",
        "Ia menangkap pola dari contoh, bukan menghafal daftar jawaban",
        "Ia mencari jawabannya di internet",
      ],
      answer: 1,
      why: "Tidak ada aturan atau internet di model mini. Pola dari 336 contoh cukup untuk kombinasi baru.",
    },
    {
      q: "Bagaimana sebuah jawaban LLM terbentuk?",
      options: [
        "Seluruh kalimat dipilih sekaligus dari daftar jawaban",
        "Satu potong teks per langkah; setiap potong ditambahkan ke teks lalu langkah berikutnya dihitung",
        "Disalin dari kalimat di data latihan",
      ],
      answer: 1,
      why: "Generation adalah perulangan: tebak satu potong, tambahkan, ulangi.",
    },
    {
      q: "Saat temperature dinaikkan…",
      options: [
        "Model menjadi lebih pintar",
        "Pilihan yang kurang mungkin lebih sering terpilih",
        "Angka hasil belajar model berubah",
      ],
      answer: 1,
      why: "Temperature hanya mengubah cara mengundi, bukan isi model.",
    },
    {
      q: "Jawaban yang lancar dan terdengar yakin…",
      options: [
        "Pasti benar",
        "Belum tentu benar dan perlu dicek ke sumber",
        "Hanya muncul ketika model ragu",
      ],
      answer: 1,
      why: "Model dilatih menghasilkan teks yang masuk akal, bukan memeriksa kebenaran.",
    },
  ],
  [
    {
      q: "Keluaran softmax(QKᵀ/√d)·V untuk satu posisi adalah…",
      options: [
        "Satu Value milik key yang paling cocok",
        "Campuran berbobot dari Value di semua posisi yang boleh dilihat",
        "Probabilitas token berikutnya",
      ],
      answer: 1,
      why: "Attention adalah soft lookup: semua key diberi bobot, Value dicampur.",
    },
    {
      q: "Mask kausal bekerja dengan cara…",
      options: [
        "Mengganti skor posisi di kanan dengan −∞ sebelum softmax",
        "Menghapus token yang tidak penting",
        "Menyembunyikan prompt dari pengguna",
      ],
      answer: 0,
      why: "Bobot posisi masa depan menjadi tepat nol setelah softmax.",
    },
    {
      q: "Mengapa KV cache aman dipakai ulang di decoder?",
      options: [
        "Karena model berhenti belajar",
        "Karena mask kausal membuat K/V token lama tidak berubah saat token baru ditambahkan",
        "Karena cache menyimpan logits akhir",
      ],
      answer: 1,
      why: "Token baru tidak bisa memengaruhi posisi di kirinya, jadi K/V lama tetap sah.",
    },
    {
      q: "Parameter temperature, top_k, dan top_p di API…",
      options: [
        "Mengubah logits yang dihasilkan forward pass",
        "Mengubah cara memilih dari distribusi; logits-nya tetap",
        "Melatih ulang sebagian bobot",
      ],
      answer: 1,
      why: "Decoding adalah kode di luar forward pass.",
    },
  ],
  [
    {
      q: "Parameter non-embedding decoder Transformer standar kira-kira…",
      options: ["N ≈ 12·L·d²", "N ≈ L·d", "N ≈ vocab × d"],
      answer: 0,
      why: "4d² untuk attention dan 8d² untuk MLP berlebar 4d, dikali L blok.",
    },
    {
      q: "Compute training C ≈ 6ND berasal dari…",
      options: [
        "6 GPU per miliar parameter",
        "±2 FLOPs per parameter per token untuk forward dan ±4 untuk backward",
        "6 epoch data",
      ],
      answer: 1,
      why: "Backward kira-kira dua kali forward.",
    },
    {
      q: "Grouped-query attention (GQA) menghemat memori KV cache dengan…",
      options: [
        "Berbagi K/V di antara beberapa query head",
        "Mengompres bobot ke 4-bit",
        "Membuang token lama dari konteks",
      ],
      answer: 0,
      why: "Ukuran cache sebanding dengan jumlah KV head.",
    },
    {
      q: "Few-shot in-context learning di GPT-3 terjadi lewat…",
      options: [
        "Aktivasi di dalam forward pass, tanpa pembaruan bobot",
        "Fine-tuning singkat untuk setiap prompt",
        "Database contoh yang disimpan di server",
      ],
      answer: 0,
      why: "Contoh di prompt hanya mengubah input; bobot tetap.",
    },
  ],
];
