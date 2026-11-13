// Everything a visitor reads in the 3D world. Text is short on purpose: the
// machine is the lesson, and an insight is only shown after the visitor has
// produced the effect it describes.
export type StationId =
  | "tanya"
  | "data"
  | "token"
  | "objektif"
  | "makna"
  | "latih"
  | "komputasi"
  | "selaras"
  | "sorot"
  | "peluang"
  | "cache"
  | "bukti"
  | "skala"
  | "rakit";

export type RegionId = "dermaga" | "belajar" | "optimasi" | "berjalan" | "observatorium";

export interface Challenge {
  id: string;
  label: string;
  insight: { title: string; text: string };
}
/** A GPT-3 component the visitor earns by finishing a mission. */
export interface Part {
  id: string;
  name: string;
  /** What this part looks like inside GPT-3 (paper figures). */
  gpt3: string;
}
export interface Station {
  id: StationId;
  name: string;
  region: RegionId;
  /** One question that frames the machine. */
  hook: string;
  /** What the region's keeper says when the visitor first steps in. */
  brief: string;
  color: string;
  challenges: Challenge[];
  part?: Part;
  /** Camera framing when the visitor steps in. */
  frame: { distance: number; height: number; lookY: number };
}

export interface Region {
  id: RegionId;
  name: string;
  /** The phase of a model's life this island teaches. */
  phase: string;
  chapter: string;
  color: string;
  keeper: { name: string; lines: string[] };
}

export const regions: Region[] = [
  {
    id: "dermaga",
    name: "Dermaga Awal",
    phase: "Prolog",
    chapter: "Prolog · Oracle yang tertidur",
    color: "#7be0c3",
    keeper: {
      name: "Nara",
      lines: [
        "Selamat datang, insinyur! Di tengah dermaga ada Oracle: model bahasa mini yang sungguh berjalan.",
        "Coba tanyai dia dulu. Lalu seberangi jembatan barat: setiap pulau adalah satu fase hidup sebuah LLM.",
        "Kumpulkan komponen GPT-3 dari setiap misi. Di Observatorium selatan, kita rakit semuanya.",
      ],
    },
  },
  {
    id: "belajar",
    name: "Hutan Data",
    phase: "Fase Belajar",
    chapter: "Bab 1 · Fase Belajar",
    color: "#8fd46b",
    keeper: {
      name: "Pustakawan Lexa",
      lines: [
        "Di hutan ini model belajar membaca. Sebelum pintar, ia hanya angka acak.",
        "Kumpulkan teks, potong jadi token, lalu ajari satu tugas saja: tebak token berikutnya.",
      ],
    },
  },
  {
    id: "optimasi",
    name: "Pegunungan Loss",
    phase: "Fase Optimasi",
    chapter: "Bab 2 · Fase Optimasi",
    color: "#ff9f5a",
    keeper: {
      name: "Pandai Besi Gradi",
      lines: [
        "Di pegunungan ini bobot ditempa. Setiap kesalahan memberi arah untuk memperbaiki.",
        "Turuni lembah loss, nyalakan tungku komputasi, lalu jinakkan model agar menjadi asisten.",
      ],
    },
  },
  {
    id: "berjalan",
    name: "Kota Inferensi",
    phase: "Fase Berjalan",
    chapter: "Bab 3 · Fase Berjalan",
    color: "#6fc3ff",
    keeper: {
      name: "Masinis Tera",
      lines: [
        "Bobotnya sudah jadi dan tidak berubah lagi. Di kota ini model bekerja: membaca konteks, menyorot, lalu mengundi token.",
        "Setiap jawaban yang kamu lihat di aplikasi chat lahir dari putaran yang sama, ribuan kali per detik.",
      ],
    },
  },
  {
    id: "observatorium",
    name: "Observatorium GPT-3",
    phase: "Finale",
    chapter: "Finale · Bangunkan GPT-3",
    color: "#c5e86c",
    keeper: {
      name: "Astronom Vega",
      lines: [
        "Kamu sudah melihat model mini belajar, ditempa, dan berjalan. GPT-3 adalah resep yang sama, hanya raksasa.",
        "Pasang komponen yang kamu kumpulkan ke cetak biru. Urutannya harus benar.",
      ],
    },
  },
];
export const regionById = Object.fromEntries(regions.map((r) => [r.id, r])) as Record<RegionId, Region>;

export const stations: Station[] = [
  {
    id: "tanya",
    name: "Oracle Tanya",
    region: "dermaga",
    hook: "Oracle ini sebuah model bahasa sungguhan. Ubah catatannya, lalu tanyai.",
    brief: "Putar drumnya, tekan TANYA. Semua yang kamu lihat dihitung model mini ini.",
    color: "#7be0c3",
    frame: { distance: 11, height: 5.0, lookY: 2.6 },
    challenges: [
      {
        id: "ask",
        label: "Tekan tombol TANYA",
        insight: {
          title: "Model menebak, bukan mencari",
          text: "Jawaban keluar potongan demi potongan. Setiap potongan adalah tebakan paling mungkin berikutnya, sampai model memilih tanda berhenti.",
        },
      },
      {
        id: "color",
        label: "Putar drum WARNA dan buat jawabannya ikut berubah",
        insight: {
          title: "Jawaban ikut konteks",
          text: "Program yang sama, angka yang sama, catatan berbeda: jawaban berubah. Model membaca seluruh teks masukan setiap kali menebak.",
        },
      },
      {
        id: "unseen",
        label: "Temukan kombinasi yang tidak pernah dilihat saat latihan",
        insight: {
          title: "Belajar pola, bukan menghafal",
          text: "Pasangan benda dan tempat ini disembunyikan selama latihan, tapi jawabannya tetap benar. Model mempelajari aturan “salin lokasi dari catatan”.",
        },
      },
    ],
  },
  // ---- Fase Belajar ---------------------------------------------------------
  {
    id: "data",
    name: "Gudang Data",
    region: "belajar",
    hook: "Dari mana sebuah model belajar bahasa?",
    brief: "Setiap peti berisi teks sungguhan yang dipakai melatih GPT-3. Masukkan ke corong.",
    color: "#8fd46b",
    frame: { distance: 12, height: 5.6, lookY: 2.0 },
    part: { id: "korpus", name: "Korpus", gpt3: "300 miliar token dari 5 sumber" },
    challenges: [
      {
        id: "load",
        label: "Masukkan kelima peti data ke corong",
        insight: {
          title: "Model hanya tahu isi datanya",
          text: "GPT-3 dilatih pada 300 miliar token dari web, buku, dan Wikipedia. Apa yang tidak ada di teks ini tidak bisa ia pelajari.",
        },
      },
      {
        id: "repeat",
        label: "Sentuh peti yang dibaca berulang paling sering",
        insight: {
          title: "Kualitas dipilih, bukan ukuran",
          text: "Wikipedia hanya 3 miliar token tapi dibaca 3,4 kali. Common Crawl berisi 410 miliar token tapi belum habis dibaca sekali (0,44×). Sumber berkualitas sengaja diulang.",
        },
      },
      {
        id: "mini",
        label: "Bandingkan dengan peti kecil milik model mini",
        insight: {
          title: "Data kecil, kemampuan sempit",
          text: "Model mini hanya melihat 336 catatan sintetis. Karena itu ia hanya bisa satu tugas: menjawab lokasi barang. Luasnya data menentukan luasnya kemampuan.",
        },
      },
    ],
  },
  {
    id: "token",
    name: "Pemotong Token",
    region: "belajar",
    hook: "Model tidak membaca huruf. Apa yang sebenarnya ia baca?",
    brief: "Sebelum dipelajari, teks harus dipotong. Tarik tuasnya.",
    color: "#f2c46d",
    frame: { distance: 11, height: 5.0, lookY: 2.4 },
    part: { id: "tokenizer", name: "Tokenizer", gpt3: "BPE dengan 50.257 token" },
    challenges: [
      {
        id: "slice",
        label: "Tarik tuas: potong catatanmu",
        insight: {
          title: "Teks menjadi nomor",
          text: "Kata, spasi, dan tanda baca menjadi potongan bernomor. Model hanya melihat deret nomor ini, tidak pernah melihat hurufnya.",
        },
      },
      {
        id: "merge",
        label: "Latih kamus: gabungkan pasangan sampai di bawah 30 potongan",
        insight: {
          title: "Pasangan yang sering muncul digabung",
          text: "Tokenizer belajar sendiri dari teks: pasangan huruf yang paling sering muncul dijadikan satu potongan, berulang-ulang. GPT-3 memakai kamus BPE berisi 50.257 potongan.",
        },
      },
      {
        id: "language",
        label: "Bandingkan kamus Inggris dan Indonesia pada kalimat yang sama",
        insight: {
          title: "Bahasa juga punya harga",
          text: "Kamus yang dilatih dari teks Inggris memotong kalimat Indonesia jauh lebih kecil-kecil. Lebih banyak token berarti lebih lambat, lebih mahal, dan konteks lebih cepat penuh.",
        },
      },
    ],
  },
  {
    id: "objektif",
    name: "Sabuk Tebakan",
    region: "belajar",
    hook: "Apa tugas yang dipelajari model selama latihan?",
    brief: "Tugasnya cuma satu: tebak token berikutnya. Buka tutup tiap token dan lihat seberapa terkejut model.",
    color: "#ffd166",
    frame: { distance: 12, height: 5.4, lookY: 2.0 },
    part: { id: "objektif", name: "Target token berikutnya", gpt3: "setiap posisi dari 300 miliar token adalah satu soal" },
    challenges: [
      {
        id: "guess",
        label: "Buka tutup satu token",
        insight: {
          title: "Teksnya sendiri adalah kunci jawaban",
          text: "Setiap posisi bisa menjadi soal: dari token sebelumnya, tebak token ini. Tidak perlu label buatan manusia. Angka di bawah token adalah loss: makin tinggi, makin terkejut model.",
        },
      },
      {
        id: "hard",
        label: "Temukan token yang paling mengejutkan model",
        insight: {
          title: "Yang tidak dilatih tetap mengejutkan",
          text: "Model mini hanya dilatih pada posisi jawaban, jadi teks catatan dan pertanyaan tetap mengejutkannya. GPT-3 dilatih di setiap posisi, sehingga pola kalimat biasa pun ia pelajari.",
        },
      },
      {
        id: "copy",
        label: "Buka warna di bagian jawaban",
        insight: {
          title: "Yang dilatih: hampir pasti",
          text: "Di posisi jawaban, loss nyaris nol: warna tinggal disalin dari catatan. Latihan memperkecil loss tepat di posisi yang dihitung.",
        },
      },
    ],
  },
  {
    id: "makna",
    name: "Galaksi Makna",
    region: "belajar",
    hook: "Setiap token adalah satu titik di ruang 32 dimensi. Siapa tetangganya?",
    brief: "Posisi bintang-bintang ini terbentuk sendiri selama latihan. Sentuh salah satunya.",
    color: "#a99cf5",
    frame: { distance: 10, height: 4.6, lookY: 3.5 },
    part: { id: "embedding", name: "Embedding", gpt3: "12.288 angka per token" },
    challenges: [
      {
        id: "pick",
        label: "Sentuh satu bintang token",
        insight: {
          title: "Token adalah deret angka",
          text: "Setiap nomor token diganti dengan 32 angka hasil latihan (di GPT-3: 12.288 angka). Galaksi ini memproyeksikannya ke 3 dimensi; garis kuning dihitung dari angka aslinya.",
        },
      },
      {
        id: "neighbors",
        label: "Cari tetangga terdekat “kunci”",
        insight: {
          title: "Kedekatan terbentuk sendiri",
          text: "Tetangga terdekat “kunci” adalah “kartu”, sesama benda. Tidak ada yang mengajarkannya: kata yang muncul di posisi serupa didorong berdekatan selama latihan. Di model sekecil ini polanya belum rapi, jadi “?” dan “Di” ikut mendekat.",
        },
      },
      {
        id: "groups",
        label: "Ungkap tiga kelompok: benda, tempat, warna",
        insight: {
          title: "Makna adalah arah dan jarak",
          text: "Kata dengan peran mirip berkumpul. Bagi model, “makna” bukan definisi kamus, melainkan posisi di ruang angka.",
        },
      },
    ],
  },
  // ---- Fase Optimasi --------------------------------------------------------
  {
    id: "latih",
    name: "Bengkel Gradien",
    region: "optimasi",
    hook: "Bagaimana 20.256 angka acak berubah menjadi model yang bisa menjawab?",
    brief: "Setiap kesalahan menunjukkan arah perbaikan. Tempa bobotnya selangkah demi selangkah.",
    color: "#ffd166",
    frame: { distance: 12, height: 6.6, lookY: 1.8 },
    part: { id: "optimizer", name: "Optimizer Adam", gpt3: "Adam, β₁ 0,9 · β₂ 0,95" },
    challenges: [
      {
        id: "nudge",
        label: "Pilih jawaban benar, tarik tuas LATIH sampai peluangnya di atas 90%",
        insight: {
          title: "Satu langkah gradien",
          text: "Setiap langkah: naikkan skor jawaban benar, turunkan yang lain, sebanding dengan besar kesalahannya. Model mini mengulang ini 1.800 kali untuk 20.256 angka sekaligus.",
        },
      },
      {
        id: "valley",
        label: "Gulirkan bola ke dasar lembah loss",
        insight: {
          title: "Loss adalah ketinggian",
          text: "Latihan berarti menuruni lembah kesalahan selangkah demi selangkah. Arah turun dihitung dari gradien.",
        },
      },
      {
        id: "overshoot",
        label: "Perbesar langkah sampai bola terpental",
        insight: {
          title: "Langkah terlalu besar",
          text: "Learning rate yang terlalu besar melompati dasar lembah dan makin menjauh. Memilih ukuran langkah adalah bagian penting melatih model.",
        },
      },
    ],
  },
  {
    id: "komputasi",
    name: "Tungku Komputasi",
    region: "optimasi",
    hook: "Berapa banyak hitungan untuk melatih GPT-3?",
    brief: "Biaya latihan kira-kira 6 × jumlah parameter × jumlah token. Atur kedua tuasnya.",
    color: "#ff7a3d",
    frame: { distance: 12, height: 5.6, lookY: 2.4 },
    part: { id: "komputasi", name: "Komputasi", gpt3: "≈ 3,14 × 10²³ operasi" },
    challenges: [
      {
        id: "fire",
        label: "Gerakkan salah satu tuas tungku",
        insight: {
          title: "Dua tuas, satu api",
          text: "Setiap token latihan melewati setiap parameter: sekali maju, dua kali mundur untuk gradien. Karena itu biayanya sekitar 6 × parameter × token.",
        },
      },
      {
        id: "gpt3",
        label: "Nyalakan tungku setara GPT-3: 175 miliar parameter, 300 miliar token",
        insight: {
          title: "3,14 × 10²³",
          text: "6 × 175 miliar × 300 miliar ≈ 3,15 × 10²³ operasi, hampir persis 3,14 × 10²³ di paper GPT-3. Itu sekitar 3.640 petaflop/s-hari: mesin 1 petaflop butuh sepuluh tahun.",
        },
      },
      {
        id: "compare",
        label: "Turunkan kedua tuas ke ukuran model mini",
        insight: {
          title: "Selisih miliaran kali",
          text: "Model mini cukup sekitar 10¹¹ operasi, selesai dalam hitungan detik. GPT-3 butuh lebih dari satu triliun kali lipatnya. Skala adalah sebagian besar biaya LLM.",
        },
      },
    ],
  },
  {
    id: "selaras",
    name: "Aula Penyelarasan",
    region: "optimasi",
    hook: "Model pandai melanjutkan teks. Bagaimana membuatnya menjadi asisten yang jujur?",
    brief: "Setelah belajar dari internet, model dilatih lagi dengan pilihan manusia. Jadilah juri.",
    color: "#ff7aa8",
    frame: { distance: 11, height: 5.2, lookY: 2.2 },
    part: { id: "selaras", name: "Penyelarasan", gpt3: "Dipakai di InstructGPT (2022), bukan GPT-3 asli" },
    challenges: [
      {
        id: "judge",
        label: "Pilih jawaban yang lebih baik",
        insight: {
          title: "Manusia menjadi penilai",
          text: "Setiap pilihan juri menaikkan peluang jawaban yang disukai dan menurunkan yang ditolak. Ini inti dari fine-tuning dengan umpan balik manusia.",
        },
      },
      {
        id: "honest",
        label: "Latih sampai model lebih memilih “tidak diketahui”",
        insight: {
          title: "Dari pelanjut teks ke asisten",
          text: "GPT-3 asli (2020) hanya melanjutkan teks. Versi lanjutan seperti InstructGPT (2022) dilatih lagi dengan pilihan manusia agar menuruti instruksi dan lebih jujur. Angka di aula ini adalah contoh hitung; bobot model mini tidak diubah.",
        },
      },
    ],
  },
  // ---- Fase Berjalan --------------------------------------------------------
  {
    id: "sorot",
    name: "Panggung Sorot",
    region: "berjalan",
    hook: "Saat menulis satu token, ke token mana model melihat?",
    brief: "Ini attention. Setiap lampu adalah satu kepala. GPT-3 punya 96 lapisan, masing-masing 96 kepala.",
    color: "#ff9f80",
    frame: { distance: 12, height: 6.8, lookY: 1.8 },
    part: { id: "attention", name: "Blok attention", gpt3: "96 lapisan × 96 kepala" },
    challenges: [
      {
        id: "beam",
        label: "Pilih satu tiang token dan lihat sorotannya",
        insight: {
          title: "Attention: memilih apa yang dilihat",
          text: "Setiap token mengirim sorotan ke token sebelumnya. Sorotan tebal berarti informasi dari token itu lebih banyak diambil. Token tidak pernah bisa melihat ke depan.",
        },
      },
      {
        id: "colorhead",
        label: "Temukan lampu yang menyorot warna di catatan saat model akan menulis warna",
        insight: {
          title: "Kepala penyalin",
          text: "Tepat sebelum menulis warna, satu kepala attention mengarahkan hampir seluruh sorotannya ke warna di catatan. Ia bekerja seperti mesin fotokopi.",
        },
      },
      {
        id: "mute",
        label: "Cabut steker lampu sampai model salah warna",
        insight: {
          title: "Kemampuan tinggal di bobot",
          text: "Dua kepala di lapisan 2 sama-sama bisa menyalin warna: cabut satu, yang lain mengambil alih. Cabut keduanya, model tetap menjawab dengan yakin, tapi warnanya salah.",
        },
      },
    ],
  },
  {
    id: "peluang",
    name: "Arena Peluang",
    region: "berjalan",
    hook: "Model tidak memilih satu kata. Ia memberi peluang untuk setiap kata.",
    brief: "Di GPT-3 ada 50.257 tiang, bukan 32. Putar suhunya dan lihat bola mendarat.",
    color: "#6fc3ff",
    frame: { distance: 13.5, height: 8.6, lookY: 1.0 },
    part: { id: "sampling", name: "Logits & sampling", gpt3: "Peluang untuk 50.257 token" },
    challenges: [
      {
        id: "first",
        label: "Tulis satu token",
        insight: {
          title: "Semua tiang, satu pilihan",
          text: "Setiap langkah, model menghitung peluang untuk seluruh potongan di kamusnya, mengundi satu, lalu memasukkannya kembali sebagai masukan langkah berikutnya.",
        },
      },
      {
        id: "eos",
        label: "Lanjutkan sampai model memilih <berhenti>",
        insight: {
          title: "Berhenti juga sebuah token",
          text: "Tidak ada aturan “selesai kalau ada titik”. Model belajar bahwa setelah jawaban lengkap, token <berhenti> adalah tebakan paling mungkin.",
        },
      },
      {
        id: "hot",
        label: "Naikkan suhu dan buat bola mendarat di tiang yang bukan tertinggi",
        insight: {
          title: "Suhu meratakan peluang",
          text: "Model mini ini sangat yakin, jadi butuh suhu tinggi sebelum ia mulai “ngawur”. Suhu tinggi berarti jawaban lebih beragam, juga lebih sering salah.",
        },
      },
    ],
  },
  {
    id: "cache",
    name: "Gudang Cache",
    region: "berjalan",
    hook: "Kenapa token pertama lambat, tapi token berikutnya cepat?",
    brief: "Setiap token baru membutuhkan Key dan Value semua token lama. Simpan atau hitung ulang?",
    color: "#58e0d0",
    frame: { distance: 11.5, height: 5.6, lookY: 2.2 },
    part: { id: "cache", name: "KV cache", gpt3: "≈ 4,7 MB per token" },
    challenges: [
      {
        id: "nocache",
        label: "Matikan cache, tulis jawaban sampai selesai",
        insight: {
          title: "Menghitung ulang semuanya",
          text: "Tanpa cache, setiap token baru membuat model memproses ulang seluruh teks dari awal. Pekerjaannya tumbuh setiap langkah.",
        },
      },
      {
        id: "cache",
        label: "Nyalakan cache, tulis jawaban yang sama",
        insight: {
          title: "Simpan, jangan ulangi",
          text: "Dengan cache, Key dan Value token lama disimpan; hanya token baru yang dihitung. Jawabannya identik, pekerjaannya jauh lebih sedikit.",
        },
      },
      {
        id: "gpt3",
        label: "Baca label rak GPT-3",
        insight: {
          title: "Memori adalah batasnya",
          text: "Di GPT-3, cache satu token = 2 × 96 lapisan × 12.288 angka × 2 byte ≈ 4,7 MB. Konteks penuh 2.048 token ≈ 9,7 GB untuk satu percakapan saja.",
        },
      },
    ],
  },
  {
    id: "bukti",
    name: "Ruang Bukti",
    region: "berjalan",
    hook: "Model selalu menjawab. Tapi apakah jawabannya berdasar?",
    brief: "Konteks adalah satu-satunya yang dibaca model saat berjalan. Isi dengan bukti.",
    color: "#ff7aa8",
    frame: { distance: 10.5, height: 4.8, lookY: 1.8 },
    part: { id: "konteks", name: "Jendela konteks", gpt3: "2.048 token" },
    challenges: [
      {
        id: "hallucinate",
        label: "Masukkan kaset “Tanpa lokasi”",
        insight: {
          title: "Yakin tanpa bukti",
          text: "Catatan tidak menyebut lokasi, tapi model tetap menjawab dengan yakin. Model dilatih untuk melanjutkan teks, bukan untuk berkata “tidak tahu”.",
        },
      },
      {
        id: "fail",
        label: "Temukan kaset yang membuat model salah",
        insight: {
          title: "Batas data latihan",
          text: "Dua benda dalam satu catatan tidak pernah ada di data latihan. Model tersandung dan menjawab lokasi yang tidak tertulis.",
        },
      },
      {
        id: "retrieve",
        label: "Ambil dokumen dari lemari arsip untuk catatan tanpa lokasi",
        insight: {
          title: "Beri bukti, bukan tebakan",
          text: "Inilah ide RAG: cari dokumen yang relevan, masukkan ke konteks, lalu biarkan model menyalinnya. Jawaban kini punya sumber yang bisa diperiksa.",
        },
      },
    ],
  },
  // ---- Finale ---------------------------------------------------------------
  {
    id: "skala",
    name: "Menara Skala",
    region: "observatorium",
    hook: "Model mini ini punya 20.256 angka. Seberapa besar GPT-3?",
    brief: "Volume menara sebanding dengan jumlah angkanya. Bangun dan bandingkan.",
    color: "#c5e86c",
    frame: { distance: 13, height: 6.0, lookY: 3.4 },
    challenges: [
      {
        id: "grow",
        label: "Bangun menara GPT-3 175B",
        insight: {
          title: "Resep sama, skala berbeda",
          text: "GPT-3 memakai bahan yang sama: token, embedding, attention, MLP, peluang. Bedanya 96 lapisan, lebar 12.288 angka, dan 300 miliar token latihan.",
        },
      },
      {
        id: "mini",
        label: "Cari model mini di kaki menara",
        insight: {
          title: "8,6 juta model mini",
          text: "Satu GPT-3 setara sekitar 8,6 juta model mini. Skala membawa kemampuan baru, tetapi mekanisme di setiap lapisannya adalah yang baru saja kamu mainkan.",
        },
      },
    ],
  },
  {
    id: "rakit",
    name: "Cetak Biru GPT-3",
    region: "observatorium",
    hook: "Bisakah kamu menyusun GPT-3 dari komponen yang kamu kumpulkan?",
    brief: "Dua jalur: bagaimana GPT-3 dilatih, dan bagaimana ia berjalan. Pasang komponennya berurutan.",
    color: "#c5e86c",
    frame: { distance: 13, height: 6.4, lookY: 2.8 },
    challenges: [
      {
        id: "train",
        label: "Susun jalur LATIH: dari data sampai penyelarasan",
        insight: {
          title: "Hidup sebuah LLM, bagian 1",
          text: "Korpus dipotong jadi token, setiap posisi menjadi soal tebak-token, optimizer menurunkan loss dengan komputasi raksasa, lalu penyelarasan membentuk perilakunya. Hasilnya: 175 miliar angka yang beku.",
        },
      },
      {
        id: "run",
        label: "Susun jalur JALAN: dari konteks sampai token berikutnya",
        insight: {
          title: "Hidup sebuah LLM, bagian 2",
          text: "Saat berjalan, bobot tidak berubah. Konteks dipotong jadi token, menjadi vektor, melewati 96 blok attention dengan cache, lalu diundi menjadi satu token. Ulangi untuk setiap token jawaban.",
        },
      },
    ],
  },
];

export const stationById = Object.fromEntries(stations.map((s) => [s.id, s])) as Record<StationId, Station>;
export const challengeKey = (station: StationId, id: string) => `${station}.${id}`;
export const totalChallenges = stations.reduce((n, s) => n + s.challenges.length, 0);
export const stationsIn = (region: RegionId) => stations.filter((s) => s.region === region);
export const parts = stations.flatMap((s) => (s.part ? [{ ...s.part, station: s.id }] : []));

export const isStationDone = (done: Set<string>, id: StationId) =>
  stationById[id].challenges.every((c) => done.has(challengeKey(id, c.id)));
export const isRegionDone = (done: Set<string>, region: RegionId) =>
  stationsIn(region).every((s) => isStationDone(done, s.id));

/** Each island opens when the previous chapter is finished. */
const gate: Record<RegionId, RegionId | null> = {
  dermaga: null,
  belajar: "dermaga",
  optimasi: "belajar",
  berjalan: "optimasi",
  observatorium: "berjalan",
};
export const isRegionOpen = (done: Set<string>, region: RegionId): boolean => {
  const before = gate[region];
  return before === null || (isRegionOpen(done, before) && isRegionDone(done, before));
};
export const regionGate = gate;
