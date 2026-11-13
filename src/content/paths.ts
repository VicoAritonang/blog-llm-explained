export type LevelId = "pemula" | "menengah" | "mahir";
export type LabId =
  | "rules"
  | "nextword"
  | "training"
  | "focus"
  | "dice"
  | "verify"
  | "final"
  | "bpe"
  | "params"
  | "compute"
  | "sparse"
  | "kv"
  | "icl"
  | "lineage";
export type Task = {
  id: string;
  label: string;
  guide: string;
  post?: number;
};
export type Source = { label: string; url: string };
export type Mission = {
  id: string;
  title: string;
  short: string;
  goal: string;
  lab?: LabId;
  posts?: number[];
  lens?: [string, string][];
  production?: string[];
  tasks: Task[];
  wrap: string;
  sources?: Source[];
};
export type Level = {
  id: LevelId;
  name: string;
  audience: string;
  who: string;
  learn: string;
  duration: string;
  reason: string;
  noteLabel: string;
  tab: "Makna" | "Angka";
};

export const GUIDE_NAME = "Nara";

export const levels: Record<LevelId, Level> = {
  pemula: {
    id: "pemula",
    name: "Pemula",
    audience: "Non-teknis",
    who: "Kamu memakai ChatGPT atau sejenisnya, tetapi tidak berlatar teknis. Tidak perlu bisa coding.",
    learn:
      "Bedanya dengan program biasa, cara mesin belajar, dan kapan jawabannya perlu dicek.",
    duration: "7 misi · ±30 menit",
    reason:
      "Jalur ini tidak memakai kode. Istilah baru dijelaskan tepat saat kamu membutuhkannya.",
    noteLabel: "CATATAN PEMANDU",
    tab: "Makna",
  },
  menengah: {
    id: "menengah",
    name: "Menengah",
    audience: "Teknis, belum AI/ML",
    who: "Kamu nyaman dengan kode, API, atau data, tetapi belum pernah membongkar isi model.",
    learn:
      "Tokenizer, embedding, attention, decoding, KV cache, training, sampai RAG, dengan padanan dari dunia software.",
    duration: "9 misi · ±60 menit",
    reason:
      "Kamu sudah paham cara kerja software, jadi jalur ini memakainya sebagai pijakan untuk membongkar mesinnya.",
    noteLabel: "CATATAN ENGINEER",
    tab: "Makna",
  },
  mahir: {
    id: "mahir",
    name: "Mahir",
    audience: "AI/ML",
    who: "Kamu sudah paham backprop dan Transformer, lalu ingin angka dan alasannya.",
    learn:
      "Audit GPT-3: parameter, compute, data, attention, KV cache, in-context learning, dan apa yang berubah sesudahnya.",
    duration: "7 misi · ±60 menit",
    reason:
      "Kamu menjawab pertanyaan ML dan Transformer dengan tepat, jadi dasar-dasarnya dilewati.",
    noteLabel: "CATATAN RISET",
    tab: "Angka",
  },
};
export const levelOrder: LevelId[] = ["pemula", "menengah", "mahir"];
export const isLevel = (value: string | null): value is LevelId =>
  value !== null && value in levels;

export type Question = {
  id: string;
  text: string;
  code?: string;
  options: { label: string; correct?: boolean }[];
};
export const UNSURE = "Belum tahu";
export const questions: Question[] = [
  {
    id: "kode",
    text: "Menurutmu, apa yang dilakukan baris ini?",
    code: "harga.filter(h => h > 100).length",
    options: [
      { label: "Mengubah semua harga menjadi 100" },
      { label: "Menghitung berapa harga yang di atas 100", correct: true },
      { label: "Menghapus harga di atas 100 dari database" },
      { label: UNSURE },
    ],
  },
  {
    id: "sistem",
    text: "Sebuah API lambat karena permintaan yang sama dihitung ulang terus. Perbaikan apa yang paling masuk akal?",
    options: [
      { label: "Menyimpan hasilnya di cache", correct: true },
      { label: "Memperbesar resolusi layar pengguna" },
      { label: "Mengganti nama endpoint-nya" },
      { label: UNSURE },
    ],
  },
  {
    id: "ml",
    text: "Loss data latih terus turun, tetapi loss validasi mulai naik. Apa yang paling mungkin terjadi?",
    options: [
      { label: "Learning rate terlalu kecil, model belum belajar" },
      { label: "Data validasinya terlalu bersih" },
      { label: "Model mulai overfitting", correct: true },
      { label: UNSURE },
    ],
  },
  {
    id: "transformer",
    text: "Saat decoding di Transformer, mengapa K dan V token lama disimpan di cache, sedangkan Q-nya tidak?",
    options: [
      { label: "K dan V adalah bobot model, jadi nilainya tetap" },
      { label: "Q terlalu besar untuk muat di memori" },
      {
        label:
          "Mask kausal membuat K/V lama tidak berubah, dan langkah baru hanya butuh Q token terakhir",
        correct: true,
      },
      { label: UNSURE },
    ],
  },
];
export type Answers = Record<string, number>;
const isCorrect = (id: string, answers: Answers) => {
  const question = questions.find((q) => q.id === id)!;
  return question.options[answers[id]]?.correct === true;
};
// Adaptive: nobody sees an ML question without any software footing, and
// nobody sees the Transformer question after missing the overfitting one.
export function nextQuestion(answers: Answers): Question | null {
  const next = (id: string) => questions.find((q) => q.id === id)!;
  if (answers.kode === undefined) return next("kode");
  if (answers.sistem === undefined) return next("sistem");
  if (!isCorrect("kode", answers) && !isCorrect("sistem", answers)) return null;
  if (answers.ml === undefined) return next("ml");
  if (!isCorrect("ml", answers)) return null;
  if (answers.transformer === undefined) return next("transformer");
  return null;
}
export function recommendLevel(answers: Answers): LevelId {
  if (!isCorrect("kode", answers) && !isCorrect("sistem", answers))
    return "pemula";
  return isCorrect("ml", answers) && isCorrect("transformer", answers)
    ? "mahir"
    : "menengah";
}

const paper: Source = {
  label: "Brown dkk. 2020, Language Models are Few-Shot Learners",
  url: "https://arxiv.org/abs/2005.14165",
};

const pemula: Mission[] = [
  {
    id: "aturan",
    title: "Adu dua mesin: program biasa dan LLM",
    short: "Program biasa vs LLM",
    goal: "Temukan bedanya mesin yang ditulis aturannya dengan mesin yang belajar dari contoh.",
    lab: "rules",
    tasks: [
      {
        id: "aturan-kenal",
        label: "Jalankan catatan yang sudah punya aturan",
        guide:
          "Halo, aku Nara. Kita mulai dengan dua mesin. Yang kiri program biasa: ia hanya menuruti aturan yang ditulis orang. Yang kanan model bahasa mini. Tekan “Jalankan kedua mesin” untuk catatan yang sudah terisi.",
      },
      {
        id: "aturan-buntu",
        label: "Temukan catatan yang membuat program biasa buntu",
        guide:
          "Dua-duanya bisa menjawab. Sekarang ganti benda, tempat, atau warnanya, lalu jalankan lagi. Cari catatan yang belum ada di daftar aturan.",
      },
      {
        id: "aturan-tulis",
        label: "Tulis satu aturan baru untuk program biasa",
        guide:
          "Program biasa buntu karena tidak ada yang menulis aturannya. Bantu dia: tekan “Tulis aturan untuk catatan ini”. Lihat juga berapa catatan yang masih belum tercakup.",
      },
      {
        id: "aturan-lemari",
        label: "Uji catatan yang tidak pernah dilihat model saat belajar",
        guide:
          "Sekarang ujian untuk model. Pilih “kunci cadangan” dan “lemari”. Pasangan ini sengaja disembunyikan saat model belajar, jadi ia tidak bisa sekadar mengingat contoh.",
      },
    ],
    wrap: "Program biasa mengikuti aturan yang ditulis orang, satu per satu. Di dalam LLM tidak ada yang menulis aturan “cari warnanya”. Yang ada angka-angka yang terbentuk dari contoh. Programmer tentu bisa menulis aturan yang lebih cerdik, tetapi aturan itu tetap ditulis manusia.",
  },
  {
    id: "kata",
    title: "Jawaban lahir satu potong demi satu potong",
    short: "Satu potong per langkah",
    goal: "Ikuti mesin menyusun jawaban dan rasakan bahwa ia tidak punya kalimat yang sudah jadi.",
    lab: "nextword",
    tasks: [
      {
        id: "kata-tebak",
        label: "Tebak potongan berikutnya sebelum mesin memilih",
        guide:
          "Mesin tidak menyiapkan kalimat utuh. Di setiap langkah ia menghitung peluang untuk potongan teks berikutnya. Potongan ini disebut token. Coba tebak dulu: potongan mana yang akan ia pilih?",
      },
      {
        id: "kata-selesai",
        label: "Ikuti jawaban sampai mesin memilih berhenti",
        guide:
          "Perhatikan angkanya, lalu lanjutkan langkah demi langkah. Mesin juga harus memilih kapan berhenti, dan “berhenti” adalah satu pilihan seperti potongan lainnya.",
      },
      {
        id: "kata-ulang",
        label: "Ulangi dengan catatan warna lain",
        guide:
          "Sekarang pilih warna lain pada catatan dan susun lagi. Mesinnya sama persis. Perhatikan langkah mana yang berubah.",
      },
    ],
    wrap: "Setiap kata di ChatGPT muncul dengan cara ini: hitung peluang, pilih satu potongan, tambahkan ke teks, ulangi. Itu juga alasan jawabannya muncul sedikit demi sedikit di layar.",
  },
  {
    id: "belajar",
    title: "Saksikan mesin belajar dari kesalahan",
    short: "Cara mesin belajar",
    goal: "Lihat apa arti “belajar” bagi mesin: angka-angkanya digeser sedikit demi sedikit.",
    lab: "training",
    tasks: [
      {
        id: "belajar-putar",
        label: "Putar latihan sampai langkah terakhir",
        guide:
          "Mesin ini punya 20.256 angka yang awalnya acak. Saat itu keyakinannya pada jawaban benar sekitar 3%, setara menebak buta dari 32 potongan. Geser latihannya sampai akhir dan perhatikan garisnya.",
      },
      {
        id: "belajar-koreksi",
        label: "Koreksi mesin contoh tiga kali",
        guide:
          "Apa yang terjadi di setiap langkah? Coba sendiri pada mesin contoh dengan tiga pilihan. Tekan “Koreksi sekali” tiga kali: setiap koreksi menggeser angka agar jawaban benar sedikit lebih mungkin.",
      },
      {
        id: "belajar-uji",
        label: "Uji mesin pada contoh yang disembunyikan",
        guide:
          "Nilai bagus pada soal latihan belum berarti apa-apa. Tekan “Uji pada contoh tersembunyi” untuk melihat hasil pada soal yang tidak pernah ia lihat.",
      },
    ],
    wrap: "Belajar bagi mesin artinya: tebak, ukur salahnya, geser angka sedikit, lalu ulangi berkali-kali. Tidak ada yang mengajarinya kalimat demi kalimat. Hasil 112 dari 112 di sini hanya berlaku untuk tugas sempit ini, bukan bukti ia menguasai bahasa.",
  },
  {
    id: "baca",
    title: "Intip mesin saat membaca catatanmu",
    short: "Membaca, bukan mengingat",
    goal: "Buktikan bahwa jawaban mengikuti catatanmu, sementara isi mesin tidak berubah sama sekali.",
    lab: "focus",
    tasks: [
      {
        id: "baca-ganti",
        label: "Ganti warna di catatan",
        guide:
          "Kamu mungkin mengira mesin “mengingat” ceritamu. Mari periksa. Ganti warnanya dan lihat jawaban serta sidik jari mesin di bawahnya.",
      },
      {
        id: "baca-sorot",
        label: "Nyalakan sorotan perhatian mesin",
        guide:
          "Jawabannya berubah, sidik jarinya tetap. Lalu dari mana ia tahu warnanya? Nyalakan sorotan untuk melihat bagian teks yang dibaca salah satu bagian mesin saat memilih warna.",
      },
      {
        id: "baca-hapus",
        label: "Hapus catatan, lalu tanya lagi",
        guide:
          "Sekarang tekan “Hapus catatan”. Kalau mesin benar-benar mengingat, ia harusnya masih tahu jawabanmu.",
      },
    ],
    wrap: "Mesin tidak menyimpan ceritamu. Ia membaca ulang teks yang dikirim setiap kali menjawab, dan chatbot terasa “ingat” karena aplikasinya mengirim ulang riwayat obrolan. Apakah ini “berpikir”? Di model mini ini yang terlihat hanya perhitungan. Para ahli masih berdebat tentang model besar, tetapi mekanisme dasarnya sama.",
  },
  {
    id: "acak",
    title: "Atur keberanian mesin",
    short: "Mengapa jawaban berubah",
    goal: "Pahami mengapa pertanyaan yang sama bisa mendapat jawaban berbeda.",
    lab: "dice",
    tasks: [
      {
        id: "acak-normal",
        label: "Tanya beberapa kali pada keberanian rendah",
        guide:
          "Mesin memilih dari peluang, dan pemilihan itu bisa diberi unsur undian. Mulai dari keberanian rendah: tekan “Tanya 6 kali”.",
      },
      {
        id: "acak-panas",
        label: "Naikkan keberanian ke 3 atau lebih, lalu tanya lagi",
        guide:
          "Enam jawaban yang sama. Sekarang geser keberanian ke 3 atau lebih dan tanya lagi. Pengaturan ini aslinya bernama temperature.",
      },
      {
        id: "acak-ngawur",
        label: "Temukan jawaban yang melenceng dari catatan",
        guide:
          "Cari jawaban yang tidak sesuai catatan. Tanya lagi kalau belum muncul.",
      },
    ],
    wrap: "Isi mesin sama, catatannya sama, hanya undiannya yang lebih berani. Chatbot sungguhan biasanya memakai sedikit unsur undian supaya jawabannya tidak kaku, jadi wajar kalau pertanyaan yang sama dijawab berbeda. Mesin mini ini sangat yakin karena tugasnya sempit.",
  },
  {
    id: "lancar",
    title: "Periksa jawaban yang terdengar meyakinkan",
    short: "Lancar belum tentu benar",
    goal: "Latih kebiasaan terpenting saat memakai AI: membandingkan jawaban dengan sumbernya.",
    lab: "verify",
    tasks: [
      {
        id: "lancar-kosong",
        label: "Periksa jawaban saat lokasi tidak pernah diberikan",
        guide:
          "Semua jawaban di bawah asli dari mesin. Mulai dari kasus pertama: baca catatannya, baca jawabannya, lalu putuskan statusnya.",
      },
      {
        id: "lancar-keliru",
        label: "Temukan jawaban yang salah membaca catatan",
        guide:
          "Mesin tetap menyebut lokasi meski tidak pernah diberi tahu. Inilah yang biasa disebut halusinasi. Kasus kedua lebih licik: catatannya ada, jadi bacalah pelan-pelan.",
      },
      {
        id: "lancar-konflik",
        label: "Tangani dua catatan yang bertentangan",
        guide:
          "Mesin bisa 99,96% yakin dan tetap keliru, jadi keyakinan bukan bukti. Kasus terakhir: dua catatan saling bertentangan.",
      },
    ],
    wrap: "Mesin dilatih untuk melanjutkan teks, bukan untuk jujur saat tidak tahu. Kelancaran dan keyakinan bukan tanda kebenaran. Untuk hal penting, minta sumbernya, lalu periksa sendiri.",
  },
  {
    id: "pulang",
    title: "Bawa pulang peta jawaban",
    short: "Kartu ringkasan",
    goal: "Susun semua temuanmu menjadi penjelasan yang bisa kamu ceritakan ke orang lain.",
    lab: "final",
    tasks: [
      {
        id: "pulang-urut",
        label: "Urutkan perjalanan sebuah jawaban",
        guide:
          "Misi terakhir. Susun kelima kejadian ini sesuai urutannya, dari mesin belajar sampai kamu memeriksa jawaban.",
      },
      {
        id: "pulang-mitos",
        label: "Pisahkan fakta dari mitos",
        guide:
          "Urutannya tepat. Sekarang tandai enam pernyataan ini. Semua sudah pernah kamu buktikan atau bantah sendiri di misi tadi.",
      },
      {
        id: "pulang-kartu",
        label: "Tulis satu kalimat untuk temanmu",
        guide:
          "Terakhir, tulis dengan kata-katamu sendiri: kalau teman bertanya “LLM itu apa?”, apa jawabanmu?",
      },
    ],
    wrap: "Selesai. Sekarang kamu bisa menjelaskan cara kerja LLM tanpa satu rumus pun. Mau melihat jeroannya? Jalur Menengah membuka mesin yang sama.",
  },
];

const menengah: Mission[] = [
  {
    id: "tokenizer",
    title: "Dari string ke array ID",
    short: "Tokenizer",
    goal: "Latih tokenizer BPE sungguhan dan lihat mengapa biaya token bergantung pada data latihnya.",
    lab: "bpe",
    posts: [1],
    lens: [
      [
        "Lexer memecah kode memakai grammar",
        "Tokenizer memecah teks memakai merge yang dipelajari dari frekuensi",
      ],
      [
        "Kamus ditulis tangan",
        "Vocabulary hasil training, tetap saat inference",
      ],
      [
        "Encoding bersifat reversible",
        "decode(encode(x)) === x, termasuk spasi",
      ],
    ],
    production: [
      "Harga API dan batas konteks dihitung dalam token, bukan karakter atau kata.",
      "Bahasa yang jarang muncul di data latih tokenizer terpecah lebih banyak, jadi lebih mahal dan menghabiskan konteks lebih cepat.",
      "Hitung token memakai tokenizer milik modelnya. Tokenizer tiap model berbeda.",
    ],
    tasks: [
      {
        id: "bpe-merge",
        label: "Jalankan minimal 5 merge",
        guide:
          "BPE dimulai dari karakter, lalu berulang kali menggabungkan pasangan paling sering. Tekan “Merge berikutnya” dan amati token pada teks di bawahnya.",
      },
      {
        id: "bpe-teks",
        label: "Tokenisasi teksmu sendiri",
        guide:
          "Ganti teks contoh dengan apa saja: nama variabel, URL, atau bahasa daerah. Perhatikan bagian yang terpecah paling kecil.",
      },
      {
        id: "bpe-bahasa",
        label: "Bandingkan tokenizer Inggris dan Indonesia",
        guide:
          "Latih ulang dengan “Hanya Inggris”, lalu “Hanya Indonesia”. Dua kalimat uji punya arti sama. Bandingkan token per kata pada tabelnya.",
      },
      {
        id: "tokenizer-pos",
        post: 1,
        label: "Jelaskan rekonstruksi token di Pos 01",
        guide:
          "Tokenizer model mini berbeda: longest-match pada vocabulary 32 token. Buka Pos 01 dan buktikan bahwa teksnya bisa dikembalikan persis.",
      },
    ],
    wrap: "Tokenizer adalah komponen terpisah dan dilatih lebih dulu. Model tidak pernah melihat huruf, hanya ID. Itu juga menjelaskan mengapa model sering kesulitan menghitung huruf dalam satu kata.",
  },
  {
    id: "lookup",
    title: "ID menjadi vektor",
    short: "Embedding & posisi",
    goal: "Pahami embedding sebagai indexing biasa, dan alasan posisi harus ditambahkan.",
    posts: [2, 3],
    lens: [
      [
        "array[id]",
        "E[id]: satu baris tabel berukuran vocabulary × lebar model",
      ],
      [
        "Baris tabel database",
        "Vektor yang nilainya dipelajari, bukan didefinisikan",
      ],
      ["Index loop", "Vektor posisi P[pos] yang dijumlahkan ke E[id]"],
    ],
    production: [
      "Embedding di sini adalah input internal model. Embedding API untuk pencarian adalah keluaran model lain dengan tujuan berbeda.",
      "Skema posisi membatasi panjang konteks. Learned absolute position tidak punya baris untuk posisi di luar kapasitasnya.",
    ],
    tasks: [
      {
        id: "lookup-embedding",
        post: 2,
        label: "Buktikan dua token sama mengambil baris yang sama",
        guide:
          "Mulai dari Pos 02. Pilih dua kemunculan “ kunci” dan bandingkan selisih embedding-nya.",
      },
      {
        id: "lookup-posisi",
        post: 3,
        label: "Buktikan X = E[id] + P[pos] berbeda per posisi",
        guide:
          "Kalau embedding-nya sama, urutan harus datang dari tempat lain. Periksa penjumlahannya di Pos 03.",
      },
    ],
    wrap: "Lapisan pertama model hanyalah lookup plus penjumlahan. Tidak ada pemahaman di sini. Semua hubungan antar-token dibangun oleh lapisan sesudahnya.",
  },
  {
    id: "attention",
    title: "Attention sebagai soft lookup",
    short: "Q · K · V",
    goal: "Lihat attention sebagai dictionary lookup yang hasilnya campuran, bukan satu nilai.",
    posts: [4, 5, 6],
    lens: [
      [
        "dict[key]: cocok persis, satu nilai",
        "softmax(q·K)·V: semua key dinilai, nilainya dicampur",
      ],
      ["Query database", "Q: vektor pencari yang dihitung dari token saat ini"],
      [
        "Access control",
        "Mask kausal: skor posisi masa depan menjadi −∞ sebelum softmax",
      ],
    ],
    production: [
      "Biaya attention tumbuh kuadratik terhadap panjang urutan, sehingga konteks panjang terasa mahal.",
      "Heatmap attention bukan penjelasan lengkap, jadi jangan menjadikannya bukti di log debugging.",
    ],
    tasks: [
      {
        id: "attention-qkv",
        post: 4,
        label: "Telusuri satu angka Q, K, dan V",
        guide:
          "Di Pos 04, pilih posisi, blok, dan head. Bedakan angka untuk mencocokkan (Q, K) dari angka yang dibawa (V).",
      },
      {
        id: "attention-mask",
        post: 5,
        label: "Buktikan prefix tidak terpengaruh token di kanannya",
        guide:
          "Pos 05 menjawab satu pertanyaan: bisakah perubahan di kanan bocor ke kiri? Bandingkan aktivasi prefix-nya.",
      },
      {
        id: "attention-mix",
        post: 6,
        label: "Hitung satu campuran Value",
        guide:
          "Attention menghasilkan vektor, bukan kata. Di Pos 06, ikuti bobot softmax sampai ke hasil campurannya.",
      },
    ],
    wrap: "Attention adalah satu-satunya tempat informasi berpindah antar-posisi. Mask kausal jugalah yang membuat K/V token lama tetap sah untuk disimpan. Itu akan terpakai di misi cache.",
  },
  {
    id: "blok",
    title: "Satu blok, diulang berkali-kali",
    short: "Blok Transformer",
    goal: "Susun urutan operasi satu blok dan buktikan pentingnya residual.",
    posts: [7],
    lens: [
      [
        "Middleware chain",
        "Blok yang ditumpuk: tiap blok memperbarui representasi yang sama",
      ],
      ["x += f(x)", "Residual: keluaran cabang dijumlahkan ke aliran utama"],
      [
        "Map per elemen",
        "MLP: bekerja per posisi, tanpa komunikasi antar-token",
      ],
    ],
    production: [
      "Jumlah layer berbeda dari jumlah token: seluruh tumpukan dilewati untuk setiap token yang dihasilkan.",
      "Mayoritas parameter dan FLOPs model besar berada di matmul blok, bukan di embedding.",
    ],
    tasks: [
      {
        id: "blok-susun",
        post: 7,
        label: "Pasang urutan blok dan coba ablation",
        guide:
          "Di Pos 07, susun operasinya, lalu putuskan residual pada salinan diagnostik dan lihat akibatnya.",
      },
    ],
    wrap: "Satu blok memuat komunikasi antar-token (attention), komputasi per token (MLP), dan dua residual. Model besar mengulang pola yang sama puluhan kali dengan bobot berbeda.",
  },
  {
    id: "decoding",
    title: "Parameter API yang sebenarnya",
    short: "Logits & sampling",
    goal: "Pahami apa yang benar-benar diubah oleh temperature, top-k, dan top-p.",
    posts: [8],
    lens: [
      ["Fungsi murni", "logits: keluaran deterministik model untuk satu input"],
      [
        "Random dengan seed",
        "Sampling: mengundi dari distribusi yang sudah dibentuk",
      ],
      [
        "Filter sebelum memilih",
        "top-k dan top-p memangkas kandidat, lalu dinormalisasi ulang",
      ],
    ],
    production: [
      "Temperature 0 berarti greedy, tetapi hasil API tetap bisa berbeda karena batching dan pembulatan floating point.",
      "Untuk ekstraksi data, turunkan temperature. Untuk variasi ide, naikkan secukupnya.",
      "Probabilitas token bukan skor kebenaran jawaban. Jangan memakainya sebagai confidence tanpa kalibrasi.",
    ],
    tasks: [
      {
        id: "decoding-sampling",
        post: 8,
        label: "Bandingkan aturan decoding pada logits yang sama",
        guide:
          "Di Pos 08, bekukan logits lalu ubah temperature dan top-k/top-p. Perhatikan bagian yang berubah dan yang tidak.",
      },
    ],
    wrap: "Model hanya menghasilkan logits. Temperature, top-k, dan top-p adalah kode di luar forward pass. Mengubahnya tidak menambah pengetahuan, hanya mengubah cara memilih.",
  },
  {
    id: "loop",
    title: "Loop generation dan KV cache",
    short: "Generation & cache",
    goal: "Lihat generation sebagai while loop, dan KV cache sebagai memoization.",
    posts: [9],
    lens: [
      ["while (!done)", "Autoregresi: pilih token, append, hitung lagi"],
      ["Memoization", "KV cache: hasil K/V prefix disimpan per layer"],
      ["Cache invalidation", "Edit di posisi r membatalkan cache mulai r"],
    ],
    production: [
      "Time to first token didominasi prefill. Kecepatan sesudahnya ditentukan oleh decode per token.",
      "Prompt caching memakai ulang prefix yang sama, jadi taruh bagian statis di awal dan bagian yang berubah di akhir.",
      "Streaming bukan efek UI: token memang lahir satu per satu dari loop ini.",
    ],
    tasks: [
      {
        id: "loop-cache",
        post: 9,
        label: "Buktikan logits dengan cache setara hitung ulang",
        guide:
          "Di Pos 09, jalankan generation sampai EOS, lalu bandingkan jumlah kerja dan logits dengan dan tanpa cache.",
      },
    ],
    wrap: "Cache mengurangi kerja tanpa mengubah hasil. Harganya memori yang tumbuh seiring panjang konteks. Itu sebabnya konteks panjang membatasi jumlah pengguna per GPU.",
  },
  {
    id: "training",
    title: "Training dan inference",
    short: "Training",
    goal: "Pisahkan apa yang terjadi saat training dari apa yang terjadi saat kamu memanggil model.",
    posts: [10],
    lens: [
      ["Build time", "Training: bobot dihitung, mahal, sekali jalan"],
      ["Runtime", "Inference: bobot read-only, konteks berubah"],
      ["Test suite", "Held-out split: mengukur data yang tidak dilihat"],
    ],
    production: [
      "Percakapan pengguna tidak otomatis mengubah bobot. Penyimpanan data untuk training berikutnya adalah kebijakan penyedia layanan.",
      "Fine-tuning mengubah bobot. Prompt dan RAG hanya mengubah input.",
    ],
    tasks: [
      {
        id: "training-gradien",
        post: 10,
        label: "Jalankan satu langkah gradient descent",
        guide:
          "Di Pos 10, perbarui bias contoh dan lihat loss turun. Perhatikan labelnya: demo ini terpisah dari checkpoint utama.",
      },
    ],
    wrap: "Bobot adalah artefak build. Semua yang kamu kirim saat runtime hanyalah input. Pemisahan ini menjawab banyak pertanyaan tentang privasi, memori, dan biaya.",
  },
  {
    id: "aplikasi",
    title: "Dari model ke aplikasi",
    short: "Chat & RAG",
    goal: "Bongkar chatbot menjadi string yang dirakit, dan RAG menjadi pencarian plus konkatenasi.",
    posts: [11, 12],
    lens: [
      [
        "Template engine",
        "Chat template: system, user, dan riwayat dirakit jadi satu urutan token",
      ],
      [
        "Stateless API",
        "Model tidak punya sesi. Riwayat dikirim ulang setiap panggilan",
      ],
      [
        "Search + concat",
        "RAG: cari dokumen, tempel cuplikan ke konteks, generate",
      ],
    ],
    production: [
      "Kegagalan RAG sering terjadi di pencarian, jadi evaluasi retrieval terpisah dari generation.",
      "Teks dari dokumen masuk ke konteks yang sama dengan instruksi. Itulah akar prompt injection.",
    ],
    tasks: [
      {
        id: "aplikasi-kategori",
        post: 11,
        label: "Kelompokkan konteks, parameter, decoding, dan aplikasi",
        guide:
          "Di Pos 11, tentukan letak tiap perubahan: konteks, parameter, decoding, atau lapisan aplikasi.",
      },
      {
        id: "aplikasi-rag",
        post: 12,
        label: "Jalankan retrieval lokal dan periksa klaimnya",
        guide:
          "Di Pos 12, cari dokumen lokal, masukkan cuplikannya ke konteks, lalu lihat kasus dua benda yang tetap gagal.",
      },
    ],
    wrap: "Sebagian besar perilaku “pintar” chatbot dirakit di lapisan aplikasi: template, riwayat, pencarian, dan tool. Model di tengahnya tetap fungsi dari token ke logits.",
  },
  {
    id: "transfer",
    title: "Debug kasus baru",
    short: "Kasus transfer",
    goal: "Gunakan seluruh rantai sebab-akibat untuk menjelaskan kasus kartu akses.",
    posts: [13],
    tasks: [
      {
        id: "transfer-kasus",
        post: 13,
        label: "Selesaikan kasus kartu akses",
        guide:
          "Pos terakhir. Prediksi dulu akibat perubahan input, temperature, cache, dan hilangnya sumber, lalu jelaskan dengan kata-katamu sendiri.",
      },
    ],
    wrap: "Kamu sudah melewati seluruh pipeline dari string sampai sumber. Mau tahu bagaimana semua ini bekerja di skala 175 miliar parameter? Lanjutkan ke jalur Mahir.",
  },
];

const mahir: Mission[] = [
  {
    id: "parameter",
    title: "Audit parameter GPT-3",
    short: "Parameter",
    goal: "Rekonstruksi 175B dari dimensi yang dipublikasikan dan temukan ke mana parameternya pergi.",
    lab: "params",
    tasks: [
      {
        id: "param-175",
        label: "Bongkar 175B per komponen",
        guide:
          "Semua angka di sini dihitung dari dimensi di Table 2.1. Pilih 175B. Perhatikan bahwa N ≈ 12·L·d² menjelaskan hampir semuanya, dan MLP memegang dua kali lipat parameter attention.",
      },
      {
        id: "param-small",
        label: "Bandingkan porsi embedding pada model terkecil",
        guide:
          "Pilih Small. Berapa porsi embedding-nya dibanding 175B? Implikasinya: hitungan parameter model kecil tidak bisa dibandingkan begitu saja.",
      },
      {
        id: "param-13b",
        label: "Temukan anomali pada baris 13B",
        guide:
          "Pilih 13B, lalu pakai lebar yang tercetak di Table 2.1. Bandingkan dengan Appendix D dan dengan n_heads × d_head. Angka mana yang konsisten?",
      },
    ],
    wrap: "Hitungan tertutup ini cocok dengan Appendix D untuk kedelapan model dalam 0,5%. Lebar 5140 pada baris 13B tidak konsisten dengan 40×128 dan dengan total parameternya, jadi kemungkinan besar salah cetak. Jumlah vocabulary 50.257 diambil dari tokenizer GPT-2.",
    sources: [paper],
  },
  {
    id: "compute",
    title: "Anggaran compute dan data",
    short: "Compute & data",
    goal: "Ulangi 3,14×10²³ FLOPs, lalu tanyakan apakah anggaran itu dialokasikan dengan baik.",
    lab: "compute",
    tasks: [
      {
        id: "compute-rumus",
        label: "Hitung ulang total compute dengan 6ND",
        guide:
          "Mulai dari C ≈ 6ND: 2 FLOPs per parameter untuk forward, 4 untuk backward. Tekan “Hitung ulang dari 6ND” dan bandingkan dengan Table D.1. Paper mengabaikan attention di sini.",
      },
      {
        id: "compute-isoflop",
        label: "Geser alokasi ke sekitar 20 token per parameter",
        guide:
          "Tahan C tetap dan geser N. GPT-3 ada di sekitar 1,7 token per parameter. Cari titik yang mendekati rasio Chinchilla.",
      },
      {
        id: "compute-data",
        label: "Bandingkan epoch hitungan sendiri dengan Table 2.2",
        guide:
          "Bobot sampling tidak proporsional terhadap ukuran. Tekan “Hitung epoch dari bobot”. Dua baris cocok, dua baris tidak.",
      },
    ],
    wrap: "Pada C yang sama, rasio 20 token per parameter menyarankan model sekitar 51B dengan sekitar 1T token. Rasio itu berasal dari fit Chinchilla untuk meminimalkan loss training saja. Banyak model modern sengaja dilatih lebih lama dari titik itu karena biaya inference ikut N. Selisih epoch pada WebText2 dan Wikipedia tidak dijelaskan paper. Bobotnya sendiri dibulatkan dan berjumlah 101%.",
    sources: [
      paper,
      {
        label: "Hoffmann dkk. 2022 (Chinchilla)",
        url: "https://arxiv.org/abs/2203.15556",
      },
      {
        label: "Kaplan dkk. 2020, Scaling Laws",
        url: "https://arxiv.org/abs/2001.08361",
      },
    ],
  },
  {
    id: "attention-gpt3",
    title: "Dense dan locally banded",
    short: "Pola attention",
    goal: "Ukur apa yang sebenarnya dihemat oleh attention bergantian pada konteks 2.048.",
    lab: "sparse",
    tasks: [
      {
        id: "att-band",
        label: "Bandingkan mask dense dan banded",
        guide:
          "GPT-3 berselang-seling antara dense dan locally banded sparse, mirip Sparse Transformer. Ganti ke layer banded dan ubah lebar band-nya.",
      },
      {
        id: "att-share",
        label: "Ukur porsi attention pada konteks 2.048",
        guide:
          "Paper menyebut attention di bawah 10% compute. Lihat angkanya untuk 175B: pada d = 12.288, matmul jauh mendominasi. Pilih konteks 2.048.",
      },
      {
        id: "att-panjang",
        label: "Naikkan konteks ke 32.768",
        guide:
          "GPT-3 berhenti di 2.048, tetapi coba konteks hipotetis 32.768. Kapan suku kuadratik mulai berarti?",
      },
    ],
    wrap: "Pada skala dan konteks GPT-3, FLOPs attention kecil karena d sangat besar. Masalah kuadratik baru menekan saat konteks jauh lebih panjang, dan bottleneck-nya kemudian lebih sering IO memori. Paper tidak mempublikasikan lebar band, jadi nilainya di sini asumsi yang bisa kamu ubah.",
    sources: [
      paper,
      {
        label: "Child dkk. 2019 (Sparse Transformer)",
        url: "https://arxiv.org/abs/1904.10509",
      },
    ],
  },
  {
    id: "kv",
    title: "KV cache dan biaya serving",
    short: "KV cache",
    goal: "Hitung kapan cache mengalahkan bobot sebagai konsumen memori, lalu buktikan cache-nya di model mini.",
    lab: "kv",
    posts: [9],
    tasks: [
      {
        id: "kv-batch",
        label: "Temukan batch saat KV cache melampaui bobot",
        guide:
          "Pada fp16, GPT-3 butuh sekitar 4,7 MB KV per token dan sekitar 349 GB untuk bobot. Naikkan batch sampai cache melampaui bobotnya.",
      },
      {
        id: "kv-gqa",
        label: "Terapkan GQA dengan 8 KV head",
        guide:
          "GPT-3 memakai 96 KV head. Coba 8 head sebagai skenario hipotetis, lalu lihat lagi batas batch-nya.",
      },
      {
        id: "kv-bukti",
        post: 9,
        label: "Buktikan kesetaraan cache pada decoder mini",
        guide:
          "Dari rumus ke bukti. Di Pos 09, bandingkan logits dengan dan tanpa cache: selisihnya harus di bawah toleransi 1e−10.",
      },
    ],
    wrap: "Decode cenderung dibatasi bandwidth memori, karena setiap token membaca bobot dan seluruh cache. GQA mengecilkan cache lurus sebanding dengan jumlah KV head. Kualitasnya perlu diuji: pada paper GQA, checkpoint MHA di-uptrain sekitar 5% compute awal.",
    sources: [
      {
        label: "Ainslie dkk. 2023 (GQA)",
        url: "https://arxiv.org/abs/2305.13245",
      },
    ],
  },
  {
    id: "icl",
    title: "In-context learning tanpa gradien",
    short: "In-context learning",
    goal: "Baca klaim utama paper GPT-3 dengan kritis, lalu lihat mekanismenya di model mini.",
    lab: "icl",
    posts: [0],
    tasks: [
      {
        id: "icl-tugas",
        label: "Bandingkan zero-, one-, dan few-shot pada 3 tugas",
        guide:
          "Few-shot di paper berarti K contoh di konteks, tanpa pembaruan bobot. Lihat beberapa tugas dan perhatikan seberapa beragam keuntungannya.",
      },
      {
        id: "icl-lambada",
        label: "Temukan tugas tempat one-shot lebih buruk dari zero-shot",
        guide:
          "Tidak semua kurva naik. Cari tugas dengan penurunan dari zero-shot ke one-shot. Paper menduga model perlu beberapa contoh untuk mengenali pola fill-in-the-blank.",
      },
      {
        id: "icl-bukti",
        post: 0,
        label: "Buktikan logits berubah sementara checkpoint tetap",
        guide:
          "Di Pos 00, satu ID warna berubah: logits berbeda, parameter sama. Decoder mini ini tidak melakukan ICL, tetapi menunjukkan jalurnya: adaptasi lewat aktivasi.",
      },
    ],
    wrap: "ICL terjadi di forward pass, dibatasi n_ctx, dan hilang setelah konteksnya hilang. Paper melaporkan benchmark dengan pemeriksaan kontaminasi yang diakuinya tidak sempurna. Decoder mini dilatih pada satu template, jadi jangan membaca ICL dari sini.",
    sources: [paper],
  },
  {
    id: "verifikasi",
    title: "Verifikasi di decoder mini",
    short: "Ablation & trace",
    goal: "Pakai model yang bisa diperiksa penuh untuk menguji klaim mekanistik, dan catat batasnya.",
    posts: [5, 6, 7, 10],
    lens: [
      ["2 blok · 2 head · d = 32", "96 blok · 96 head · d = 12.288"],
      ["Pre-norm, learned position, GELU", "Sama dengan keluarga GPT-2/GPT-3"],
      ["Dense causal attention", "Dense dan banded bergantian"],
      [
        "20.256 parameter, data sintetis",
        "174,6 miliar parameter, 300 miliar token",
      ],
    ],
    tasks: [
      {
        id: "verif-mask",
        post: 5,
        label: "Uji kebocoran saat mask dibuka",
        guide:
          "Di Pos 05, buka mask pada salinan diagnostik dan unduh tensornya. Ini diagnostik, bukan mode normal model.",
      },
      {
        id: "verif-head",
        post: 6,
        label: "Periksa spesialisasi head",
        guide:
          "Saat memilih warna, head 2 blok 2 membaca kata warna pada 64 dari 64 catatan. Head 1 hanya 48 dari 64. Cek sendiri di Pos 06, lalu tanyakan: apakah ini cukup untuk memberi head itu jabatan?",
      },
      {
        id: "verif-ablasi",
        post: 7,
        label: "Jalankan ablation attention, MLP, dan residual",
        guide:
          "Di Pos 07, matikan tiap cabang pada salinan diagnostik dan bandingkan Δ logits-nya.",
      },
      {
        id: "verif-train",
        post: 10,
        label: "Tinjau bukti training",
        guide:
          "Di Pos 10, tiga bias hanyalah demo. Backprop penuh ada di scripts/train-story-model.py, dengan pemeriksaan finite differences pada 13 probe.",
      },
    ],
    wrap: "Decoder mini cocok untuk menguji operasi, bukan kemampuan. Sebuah head yang konsisten pada satu template sintetis bukan bukti fitur umum, dan korelasi attention belum sama dengan kausalitas.",
    sources: [
      {
        label: "Implementasi GPT-2",
        url: "https://github.com/openai/gpt-2/blob/master/src/model.py",
      },
    ],
  },
  {
    id: "sesudah",
    title: "Apa yang berubah setelah GPT-3",
    short: "Sesudah GPT-3",
    goal: "Petakan tiap perubahan arsitektur dan training ke hambatan yang ingin diatasinya.",
    lab: "lineage",
    posts: [11],
    tasks: [
      {
        id: "lineage-cocok",
        label: "Cocokkan tiap perubahan dengan hambatannya",
        guide:
          "Delapan perubahan, delapan hambatan. Banyak model modern memakai kombinasi ini, tetapi tidak semua. Cocokkan, lalu tekan “Periksa pemetaan”.",
      },
      {
        id: "lineage-post",
        post: 11,
        label: "Bedakan post-training dari konteks dan aplikasi",
        guide:
          "GPT-3 base tidak dilatih mengikuti instruksi. Di Pos 11, pisahkan efek parameter, konteks, decoding, dan aplikasi.",
      },
    ],
    wrap: "Tulang punggung decoder bertahan, sementara bagian di sekitarnya berubah untuk memori, throughput, dan perilaku. GPT-3 tetap referensi yang berguna karena detailnya dipublikasikan.",
    sources: [
      {
        label: "Ouyang dkk. 2022 (InstructGPT)",
        url: "https://arxiv.org/abs/2203.02155",
      },
      { label: "Su dkk. 2021 (RoPE)", url: "https://arxiv.org/abs/2104.09864" },
      {
        label: "Dao dkk. 2022 (FlashAttention)",
        url: "https://arxiv.org/abs/2205.14135",
      },
      {
        label: "Fedus dkk. 2021 (Switch Transformer)",
        url: "https://arxiv.org/abs/2101.03961",
      },
    ],
  },
];

export const missions: Record<LevelId, Mission[]> = { pemula, menengah, mahir };

// Pos-level notes shown inside the investigation when a level opens it.
export const postNotes: Record<"menengah" | "mahir", Record<number, string>> = {
  menengah: {
    1: "Anggap ini lexer dengan kamus tetap. Algoritmanya longest-match, bukan BPE yang kamu latih tadi, tetapi kontraknya sama: lossless dan reversible.",
    2: "Ini cuma E[id]. Tidak ada fungsi yang dipanggil, hanya indexing ke tabel yang nilainya hasil training.",
    3: "Tanpa P[pos], dua token sama punya input identik. Penjumlahannya elementwise, ID token tidak berubah.",
    4: "Bayangkan dict lookup yang tidak pernah miss: setiap key mendapat skor. Q dan K menentukan skor, V adalah isinya.",
    5: "Ini access control di level tensor: skor posisi kanan diganti −∞ sebelum softmax, jadi bobotnya tepat nol.",
    6: "Keluaran attention adalah weighted sum, bukan satu entri. Heatmap menunjukkan bobot, bukan alasan.",
    7: "Polanya x += f(x), dua kali per blok. Coba putuskan residual dan lihat aliran utamanya hilang.",
    8: "Slider ini padanan parameter temperature, top_k, dan top_p di API. Logits-nya tidak berubah.",
    9: "Ini memoization. Tes yang penting: hasil dengan cache harus setara dengan hitung ulang.",
    10: "Ini build time. Demo tiga bias memakai rumus gradien yang sama, tetapi terpisah dari checkpoint.",
    11: "Tanya untuk setiap perubahan: apakah bobot berubah, atau hanya input dan kode di sekitarnya?",
    12: "RAG di sini sengaja eksplisit: search, lalu tempel ke prompt. Gagal retrieval berbeda dengan gagal generation.",
    13: "Perlakukan seperti postmortem: bedakan sebab di input, decoding, cache, dan sumber.",
  },
  mahir: {
    0: "Fungsinya tetap, inputnya berbeda: jalur ini yang dipakai ICL, walaupun decoder mini tidak menunjukkan ICL.",
    5: "Unduh tensor pada mode diagnostik. Perhatikan: tanpa mask, prefix berubah dan K/V lama tidak lagi sah di-cache.",
    6: "Hasil pengukuran 64 catatan: head 2 blok 2 selalu membaca kata warna (bobot ≥ 0,90), head 1 hanya 48 dari 64 dan sisanya ke “.”. Ini korelasi pada satu template.",
    7: "Bandingkan Δ logits antar-ablation, tetapi ingat ini intervensi kasar, bukan activation patching per head.",
    9: "Bukti kesetaraan numerik ada di sini, dengan toleransi 1e−10. Bandingkan juga posisi × layer yang dihitung.",
    10: "Demo ini hanya softmax + bias. Bukti gradien penuh ada di scripts/check-story-gradients.py.",
    11: "Tidak ada pasangan checkpoint base/instruction di sini. Panel ini skema, bukan hasil eksperimen.",
  },
};

export const allTasks = (level: LevelId) =>
  missions[level].flatMap((mission) => mission.tasks);
export const findMission = (level: LevelId, id: string | null) =>
  missions[level].find((mission) => mission.id === id) ?? null;
export const nextLevel = (level: LevelId): LevelId | null =>
  levelOrder[levelOrder.indexOf(level) + 1] ?? null;
