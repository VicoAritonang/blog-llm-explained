// Books hold what the mini model cannot show by itself: history, scale,
// post-training, hardware, evaluation. Each ends with one check question.

export type Page = {
  heading: string;
  body: string[];
  timeline?: [string, string][];
  flow?: string[];
  stats?: [string, string][];
};
export type Quiz = {
  q: string;
  options: string[];
  answer: number;
  why: string;
};
export type Book = {
  title: string;
  subtitle: string;
  color: string;
  pages: Page[];
  quiz?: Quiz;
};

export const books: Record<string, Book> = {
  panduan: {
    title: "Buku Panduan Peneliti Baru",
    subtitle: "Cara bermain di NeuroLab",
    color: "#e9b949",
    pages: [
      {
        heading: "Selamat datang di NeuroLab",
        body: [
          "Kamu baru saja masuk ke laboratorium tempat sebuah model bahasa mini tinggal. Model ini sungguhan: ia sudah dilatih, punya 20.256 angka hasil belajar, dan berjalan langsung di browsermu.",
          "Tugasmu sederhana: bongkar cara kerjanya, satu quest demi satu quest.",
        ],
      },
      {
        heading: "Bergerak dan berinteraksi",
        body: [
          "Jalan dengan WASD atau tombol panah. Di HP, cukup ketuk lantai tujuanmu.",
          "Dekati benda bertanda lalu tekan E, Spasi, atau ketuk tombol yang muncul. Kamu juga bisa langsung mengklik benda; karaktermu akan berjalan ke sana.",
        ],
        flow: ["Dekati mesin", "Tekan E", "Kerjakan simulasi", "Dapat XP"],
      },
      {
        heading: "Quest, gerbang, dan level",
        body: [
          "Mesin bertanda ! adalah quest. Setiap quest berisi simulasi dan daftar tugas yang tercentang otomatis dari tindakanmu, bukan dari tombol “selesai”.",
          "Selesaikan semua quest di satu area untuk membuka gerbang ke level berikutnya. Sudah paham materinya? Terminal di dekat gerbang menyediakan ujian lompat.",
        ],
        stats: [
          ["Level 1", "Pemula"],
          ["Level 2", "Menengah"],
          ["Level 3", "Mahir"],
        ],
      },
      {
        heading: "Buku seperti ini",
        body: [
          "Ada hal yang tidak bisa diperlihatkan oleh model sekecil ini: sejarah, ukuran model raksasa, atau cara chatbot dilatih menjadi asisten. Hal-hal itu disimpan di buku pada podium.",
          "Membaca sampai halaman terakhir memberi XP, dan menjawab pertanyaan di akhir buku memberi bonus.",
        ],
      },
    ],
    quiz: {
      q: "Bagaimana cara membuka gerbang ke level berikutnya?",
      options: [
        "Membaca semua buku di area itu",
        "Menyelesaikan semua quest di area itu, atau lulus ujian lompat",
        "Menunggu beberapa menit",
      ],
      answer: 1,
      why: "Buku memberi XP tambahan, tetapi gerbang mengikuti quest. Ujian lompat disediakan untuk yang sudah paham.",
    },
  },

  sejarah: {
    title: "Dari Aturan ke Contoh",
    subtitle: "Sejarah singkat mesin yang berbahasa",
    color: "#7cc6a4",
    pages: [
      {
        heading: "Zaman aturan",
        body: [
          "Tahun 1966, ELIZA meniru seorang terapis hanya dengan pola dan aturan tertulis: kalau kalimat berisi “ibu”, tanyakan tentang keluarga. Banyak orang merasa dipahami, padahal tidak ada pemahaman di dalamnya.",
          "Masalah aturan: dunia terlalu luas. Setiap kalimat baru butuh aturan baru, persis seperti program biasa di quest pertama.",
        ],
      },
      {
        heading: "Belajar dari contoh",
        body: [
          "Pendekatan berikutnya membalik arah: alih-alih menulis aturan, biarkan mesin menemukan pola dari banyak sekali contoh teks.",
          "Makin banyak contoh dan makin besar mesinnya, makin banyak pola yang tertangkap, sampai pola itu cukup untuk menyusun paragraf yang lancar.",
        ],
        timeline: [
          ["1966", "ELIZA: chatbot berbasis aturan"],
          ["2013", "word2vec: kata menjadi daftar angka"],
          ["2017", "Transformer diperkenalkan"],
          ["2018–2019", "GPT dan GPT-2: menebak kata berikutnya dalam skala besar"],
          ["2020", "GPT-3 dengan 175 miliar angka"],
          ["2022", "ChatGPT dirilis ke publik"],
        ],
      },
      {
        heading: "Satu ide yang bertahan",
        body: [
          "Dari GPT pertama sampai chatbot hari ini, tugas latihannya tetap sama: tebak potongan teks berikutnya. Yang berubah adalah ukuran, jumlah data, dan pelatihan tambahan agar mesin mau mengikuti instruksi.",
          "Model mini di lab ini memakai ide yang sama, hanya jauh lebih kecil dan hanya untuk satu jenis catatan.",
        ],
      },
    ],
    quiz: {
      q: "Apa perbedaan utama ELIZA dengan LLM?",
      options: [
        "ELIZA lebih besar",
        "ELIZA mengikuti aturan tertulis, LLM belajar pola dari contoh",
        "ELIZA bisa mencari di internet",
      ],
      answer: 1,
      why: "ELIZA hanya mencocokkan pola yang ditulis manusia. LLM menyesuaikan angka-angkanya sendiri dari contoh teks.",
    },
  },

  data: {
    title: "Dari Mana LLM Belajar?",
    subtitle: "Teks, teks, dan lebih banyak teks",
    color: "#8db8e8",
    pages: [
      {
        heading: "Perpustakaan raksasa",
        body: [
          "Model besar dilatih pada teks dalam jumlah yang sulit dibayangkan: halaman web, buku, kode, dan artikel. GPT-3 melihat sekitar 300 miliar potongan teks selama latihan.",
          "Model mini di lab ini hanya melihat 336 catatan pendek. Prinsipnya sama: tebak potongan berikutnya, cek, perbaiki sedikit, ulangi.",
        ],
        stats: [
          ["Model mini", "336 contoh"],
          ["GPT-3", "±300 miliar potongan"],
        ],
      },
      {
        heading: "Batas waktu pengetahuan",
        body: [
          "Latihan berhenti pada satu titik. Peristiwa sesudah titik itu tidak ada di dalam angka-angkanya. Inilah yang disebut knowledge cutoff.",
          "Kalau chatbot bisa menjawab berita hari ini, biasanya ia sedang membaca hasil pencarian yang ditempel ke percakapan, bukan mengingatnya.",
        ],
      },
      {
        heading: "Belajar menjadi asisten",
        body: [
          "Model yang hanya menebak teks belum tentu mau menjawab pertanyaan dengan sopan. Ia dilatih lagi dengan contoh percakapan yang baik dan dengan penilaian manusia tentang jawaban mana yang lebih membantu.",
          "Tahap tambahan ini mengubah gaya dan sikapnya, tetapi tidak menambah pengetahuan baru dalam jumlah besar.",
        ],
        flow: ["Latihan besar: tebak teks", "Contoh percakapan", "Penilaian manusia", "Asisten"],
      },
    ],
    quiz: {
      q: "Chatbot menjawab berita yang terjadi kemarin. Penjelasan paling mungkin?",
      options: [
        "Model belajar sendiri setiap malam",
        "Aplikasinya mencari berita lalu menempelkannya ke percakapan",
        "Model menebak masa depan",
      ],
      answer: 1,
      why: "Angka hasil latihan tidak berubah saat dipakai. Informasi baru masuk lewat teks yang ditambahkan ke percakapan.",
    },
  },

  curiga: {
    title: "Kapan Harus Curiga",
    subtitle: "Memakai LLM dengan aman",
    color: "#f08a7e",
    pages: [
      {
        heading: "Lancar bukan berarti benar",
        body: [
          "LLM dilatih untuk menghasilkan teks yang masuk akal, bukan untuk memeriksa kebenaran. Hasilnya bisa terdengar sangat yakin walaupun keliru. Gejala ini sering disebut halusinasi.",
          "Yang paling rawan: angka spesifik, kutipan, nama orang, tautan, dan rujukan hukum atau medis.",
        ],
      },
      {
        heading: "Tiga kebiasaan baik",
        body: [
          "Minta sumbernya, lalu buka sumber itu sendiri. Sumber yang tidak bisa ditemukan adalah tanda bahaya.",
          "Jangan menempel data rahasia, kata sandi, atau data pribadi orang lain ke chatbot publik.",
          "Untuk keputusan penting, perlakukan jawabannya sebagai draf yang perlu dicek, bukan keputusan akhir.",
        ],
        flow: ["Tanya", "Minta sumber", "Cek sumber", "Putuskan"],
      },
    ],
    quiz: {
      q: "Chatbot memberi kutipan pasal undang-undang lengkap dengan nomornya. Apa langkah terbaik?",
      options: [
        "Langsung memakainya karena sangat spesifik",
        "Mencari pasal itu di sumber resmi sebelum memakainya",
        "Bertanya ulang sampai jawabannya sama dua kali",
      ],
      answer: 1,
      why: "Detail yang spesifik tetap bisa dikarang. Jawaban yang sama dua kali juga belum bukti. Sumber resmi adalah pemeriksanya.",
    },
  },

  transformer: {
    title: "Attention Is All You Need",
    subtitle: "Paper 2017 dalam lima menit",
    color: "#87e2c8",
    pages: [
      {
        heading: "Masalah sebelum 2017",
        body: [
          "Model bahasa sebelumnya (RNN, LSTM) membaca teks satu per satu secara berurutan. Sulit diparalelkan di GPU, dan informasi dari awal kalimat mudah memudar.",
          "Paper Vaswani dkk. (2017) membuang perulangan itu. Setiap posisi langsung “melihat” semua posisi lain lewat attention, sehingga semua token bisa dihitung bersamaan saat training.",
        ],
      },
      {
        heading: "Encoder, decoder, lalu decoder saja",
        body: [
          "Transformer asli untuk penerjemahan punya encoder (membaca kalimat sumber) dan decoder (menulis terjemahan).",
          "Keluarga GPT hanya memakai bagian decoder dengan mask kausal: setiap posisi hanya boleh melihat ke kiri. Model mini di pabrik ini memakai bentuk yang sama.",
        ],
        flow: ["Token", "Embedding + posisi", "N × (Attention → MLP)", "Logits"],
      },
      {
        heading: "Yang berubah sejak itu",
        body: [
          "Kerangkanya bertahan, detailnya bergeser: normalisasi dipindah ke depan blok (pre-norm), posisi absolut banyak diganti RoPE, dan attention dioptimalkan untuk memori.",
          "Kamu akan menemui perubahan ini lagi di Observatorium pada level berikutnya.",
        ],
      },
    ],
    quiz: {
      q: "Kenapa Transformer lebih cepat dilatih daripada RNN?",
      options: [
        "Parameternya selalu lebih sedikit",
        "Semua posisi bisa dihitung paralel karena tidak ada perulangan berurutan",
        "Ia tidak memakai GPU",
      ],
      answer: 1,
      why: "Attention menghubungkan semua posisi sekaligus. Saat training, seluruh urutan diproses bersamaan dengan mask kausal.",
    },
  },

  skala: {
    title: "Ukuran Itu Relatif",
    subtitle: "Model mini dibandingkan raksasa",
    color: "#b9a6f2",
    pages: [
      {
        heading: "Mesin yang sama, ukuran berbeda",
        body: [
          "Model mini di pabrik ini dan GPT-3 punya resep yang hampir sama: embedding, blok attention + MLP yang ditumpuk, lalu logits. Yang berbeda adalah ukurannya.",
        ],
        stats: [
          ["Parameter", "20.256 vs 175 miliar"],
          ["Blok", "2 vs 96"],
          ["Lebar vektor", "32 vs 12.288"],
          ["Vocabulary", "32 vs 50.257"],
          ["Konteks", "64 vs 2.048 token"],
        ],
      },
      {
        heading: "Mengapa model mini tetap berguna",
        body: [
          "Model kecil bisa diperiksa sampai ke angka terakhir. Setiap operasi yang kamu lihat di pabrik dijalankan sungguhan oleh browsermu, bukan animasi rekaan.",
          "Batasnya juga jelas: kemampuan yang hanya muncul pada skala besar, seperti menjawab pertanyaan umum atau belajar dari contoh di prompt, tidak bisa ditunjukkan di sini.",
        ],
      },
    ],
    quiz: {
      q: "Apa yang tidak bisa dibuktikan oleh model mini?",
      options: [
        "Bahwa mask kausal mencegah kebocoran dari kanan",
        "Bahwa KV cache menghasilkan logits yang sama",
        "Kemampuan menjawab pertanyaan umum seperti chatbot",
      ],
      answer: 2,
      why: "Operasi dasar bisa dibuktikan di model mini. Kemampuan umum butuh skala dan data yang jauh lebih besar.",
    },
  },

  asisten: {
    title: "Dari Base Model ke Asisten",
    subtitle: "Post-training: SFT, preferensi, dan system prompt",
    color: "#f2b880",
    pages: [
      {
        heading: "Base model hanya melanjutkan teks",
        body: [
          "Model hasil pretraining akan melanjutkan apa saja. Diberi pertanyaan, ia bisa saja membalas dengan pertanyaan lain, karena itulah yang sering muncul di data web.",
          "Post-training mengubah bobot sekali lagi agar perilakunya sesuai harapan.",
        ],
      },
      {
        heading: "Tahapan umum",
        body: [
          "SFT (supervised fine-tuning): latih pada contoh percakapan yang ditulis dengan baik.",
          "Preferensi: manusia membandingkan dua jawaban. Pada RLHF (InstructGPT, 2022) penilaian ini melatih reward model, lalu model dioptimalkan dengan reinforcement learning. Metode seperti DPO (2023) memakai pasangan preferensi secara langsung.",
        ],
        flow: ["Base model", "SFT", "Data preferensi", "RLHF / DPO", "Asisten"],
      },
      {
        heading: "Yang bukan post-training",
        body: [
          "System prompt, template chat, dan riwayat percakapan hanyalah teks input. Ia tidak mengubah bobot dan hilang saat percakapan selesai.",
          "Di Pos 11 investigasi, kamu memisahkan perubahan bobot dari perubahan input. Lab ini tidak punya pasangan checkpoint base/asisten, jadi bagian ini disajikan sebagai buku.",
        ],
      },
    ],
    quiz: {
      q: "Mana yang mengubah bobot model?",
      options: ["System prompt", "Riwayat percakapan", "Fine-tuning dengan data preferensi"],
      answer: 2,
      why: "Prompt dan riwayat hanyalah input. Fine-tuning, termasuk RLHF dan DPO, memperbarui parameter.",
    },
  },

  rag: {
    title: "Tool, RAG, dan Agent",
    subtitle: "Lapisan aplikasi di sekitar model",
    color: "#9fd3e6",
    pages: [
      {
        heading: "RAG: cari, tempel, jawab",
        body: [
          "Retrieval-augmented generation (Lewis dkk., 2020) menambahkan langkah pencarian sebelum generation. Dokumen yang relevan ditempel ke konteks, lalu model menjawab berdasarkan teks itu.",
          "Kualitasnya bergantung pada dua hal terpisah: apakah pencarian menemukan dokumen yang tepat, dan apakah model benar-benar memakainya.",
        ],
        flow: ["Pertanyaan", "Cari dokumen", "Tempel ke konteks", "Generate"],
      },
      {
        heading: "Tool calling dan agent",
        body: [
          "Model juga bisa dilatih menulis teks terstruktur yang berarti “panggil fungsi ini”. Aplikasi menjalankan fungsinya, lalu hasilnya ditambahkan ke konteks.",
          "Agent adalah perulangan dari pola itu: model memilih tool, aplikasi mengeksekusi, hasil kembali ke konteks, sampai tugas selesai.",
        ],
      },
      {
        heading: "Risiko yang ikut datang",
        body: [
          "Semua teks, termasuk isi dokumen dan hasil tool, masuk ke konteks yang sama dengan instruksimu. Dokumen yang berisi perintah tersembunyi bisa membelokkan model: inilah prompt injection.",
          "Batasi izin tool, minta konfirmasi untuk aksi penting, dan jangan menganggap instruksi di prompt sebagai pagar keamanan.",
        ],
      },
    ],
    quiz: {
      q: "Jawaban RAG salah karena dokumen yang ditemukan tidak relevan. Di mana masalahnya?",
      options: ["Di bobot model", "Di tahap pencarian (retrieval)", "Di temperature"],
      answer: 1,
      why: "Kegagalan retrieval berbeda dengan kegagalan generation. Evaluasi keduanya secara terpisah.",
    },
  },

  scaling: {
    title: "Hukum Skala",
    subtitle: "Kaplan 2020 dan Chinchilla 2022",
    color: "#e9b949",
    pages: [
      {
        heading: "Loss turun mengikuti pangkat",
        body: [
          "Kaplan dkk. (2020) menemukan bahwa loss model bahasa turun mulus mengikuti power law terhadap jumlah parameter N, jumlah token D, dan compute C, selama faktor lain tidak menjadi penghambat.",
          "Akibatnya, hasil model besar bisa diperkirakan dari serangkaian model kecil sebelum uang besar dikeluarkan.",
        ],
      },
      {
        heading: "Chinchilla mengoreksi alokasi",
        body: [
          "Hoffmann dkk. (2022) menunjukkan bahwa untuk compute tetap, parameter dan token sebaiknya dinaikkan seimbang. Model Chinchilla (70B, 1,4 triliun token) mengalahkan Gopher (280B) dengan compute serupa.",
          "Aturan praktis yang sering dikutip: sekitar 20 token per parameter. GPT-3 hanya sekitar 1,7.",
        ],
        stats: [
          ["GPT-3", "175B · 300B token"],
          ["Chinchilla", "70B · 1,4T token"],
        ],
      },
      {
        heading: "Mengapa banyak model melewati titik itu",
        body: [
          "Titik Chinchilla meminimalkan loss untuk anggaran training. Tetapi model yang dipakai jutaan kali juga punya biaya inference yang sebanding dengan N.",
          "Karena itu banyak model modern sengaja lebih kecil dan dilatih dengan jauh lebih banyak token daripada 20 per parameter.",
        ],
      },
    ],
    quiz: {
      q: "Menurut Chinchilla, GPT-3 seharusnya…",
      options: [
        "Lebih besar dengan token lebih sedikit",
        "Lebih kecil dengan token jauh lebih banyak",
        "Sama persis, sudah optimal",
      ],
      answer: 1,
      why: "Pada compute yang sama, sekitar 20 token per parameter menyarankan model ±51B dengan ±1T token.",
    },
  },

  gpu: {
    title: "Mengapa Butuh Banyak GPU",
    subtitle: "Memori, bandwidth, dan paralelisme",
    color: "#87e2c8",
    pages: [
      {
        heading: "Bobot saja sudah raksasa",
        body: [
          "175 miliar parameter pada fp16 (2 byte) berarti sekitar 350 GB hanya untuk bobot. Satu GPU 80 GB tidak cukup, bahkan untuk inference.",
          "Saat training, optimizer Adam menyimpan dua nilai tambahan per parameter dan biasanya salinan bobot fp32, sehingga kebutuhan memorinya beberapa kali lipat.",
        ],
        stats: [
          ["Bobot fp16", "±350 GB"],
          ["KV cache / token", "±4,7 MB"],
          ["Memori 1 GPU", "80 GB"],
        ],
      },
      {
        heading: "Memecah model",
        body: [
          "Tensor parallelism memotong satu perkalian matriks ke beberapa GPU (Megatron-LM, 2019). Pipeline parallelism membagi tumpukan blok ke beberapa GPU berurutan. Data parallelism menyalin model dan membagi batch, dan ZeRO membagi state optimizer agar tidak tersalin.",
        ],
        flow: ["Data parallel", "Tensor parallel", "Pipeline parallel", "ZeRO"],
      },
      {
        heading: "Decode dibatasi bandwidth",
        body: [
          "Saat menghasilkan satu token, GPU harus membaca seluruh bobot dan cache dari memori, tetapi hanya melakukan sedikit hitungan per byte. Kecepatannya lebih sering dibatasi bandwidth memori daripada FLOPs.",
          "Itulah alasan batching, KV cache yang ramping (GQA), dan kuantisasi penting untuk biaya serving.",
        ],
      },
    ],
    quiz: {
      q: "Kenapa decode satu token sering dibatasi bandwidth memori?",
      options: [
        "Setiap token membaca seluruh bobot dan cache dengan sedikit hitungan per byte",
        "GPU tidak bisa mengalikan matriks",
        "Tokenizer terlalu lambat",
      ],
      answer: 0,
      why: "Intensitas aritmetika decode rendah. Batching menaikkan jumlah hitungan per byte yang dibaca.",
    },
  },

  interpretasi: {
    title: "Membaca Isi Kepala Model",
    subtitle: "Interpretabilitas dan batasnya",
    color: "#b9a6f2",
    pages: [
      {
        heading: "Dari korelasi ke sebab",
        body: [
          "Heatmap attention menunjukkan ke mana bobot mengalir, bukan alasan sebuah jawaban. Untuk klaim sebab-akibat, peneliti melakukan intervensi: mengganti atau mematikan aktivasi lalu mengukur perubahan keluaran.",
          "Activation patching menukar aktivasi dari input lain pada satu titik. Ablation di Pos 07 adalah versi kasarnya.",
        ],
      },
      {
        heading: "Superposition dan fitur",
        body: [
          "Satu neuron sering aktif untuk banyak konsep sekaligus, karena model menyimpan lebih banyak fitur daripada jumlah dimensinya (superposition).",
          "Sparse autoencoder dilatih untuk mengurai aktivasi menjadi fitur yang lebih mudah dibaca. Riset ini masih aktif dan interpretasi fitur tetap perlu diuji.",
        ],
        flow: ["Aktivasi", "Sparse autoencoder", "Fitur", "Uji intervensi"],
      },
      {
        heading: "Pelajaran dari decoder mini",
        body: [
          "Di model mini, head 2 blok 2 membaca kata warna pada 64 dari 64 catatan. Itu temuan yang rapi, tetapi pada satu template sintetis. Jangan buru-buru memberi head itu jabatan umum.",
        ],
      },
    ],
    quiz: {
      q: "Bukti mana yang paling kuat bahwa sebuah komponen menyebabkan jawaban?",
      options: [
        "Heatmap attention yang terang",
        "Intervensi pada komponen itu mengubah keluaran secara konsisten",
        "Nama head yang terdengar masuk akal",
      ],
      answer: 1,
      why: "Korelasi hanya petunjuk. Intervensi yang terkendali menguji hubungan sebab-akibat.",
    },
  },

  evaluasi: {
    title: "Benchmark dan Kontaminasi",
    subtitle: "Membaca angka evaluasi dengan kritis",
    color: "#f08a7e",
    pages: [
      {
        heading: "Skor bukan kemampuan",
        body: [
          "Benchmark mengukur performa pada sekumpulan soal tertentu dengan format tertentu. Mengubah format prompt atau jumlah contoh bisa mengubah skor cukup jauh.",
          "Selalu tanyakan: berapa soal, format apa, berapa kali diulang, dan dibandingkan dengan apa?",
        ],
      },
      {
        heading: "Kontaminasi data",
        body: [
          "Model yang dilatih pada sebagian besar web bisa saja sudah melihat soal benchmark. Paper GPT-3 memeriksa tumpang tindih ini dan mengakui pemeriksaannya tidak sempurna.",
          "Split held-out di model mini menahan pasangan benda–lokasi dari training. Itu versi kecil dari prinsip yang sama.",
        ],
        stats: [
          ["Uji model mini", "112/112"],
          ["Kasus dua benda", "gagal"],
        ],
      },
      {
        heading: "Rata-rata menyembunyikan kegagalan",
        body: [
          "Skor agregat yang tinggi bisa menutupi kelompok soal yang selalu gagal. Periksa contoh per contoh, terutama yang gagal.",
        ],
      },
    ],
    quiz: {
      q: "Skor benchmark naik tajam pada model baru. Apa yang perlu dicek dulu?",
      options: [
        "Apakah soal benchmark mungkin ada di data latih",
        "Warna logo modelnya",
        "Tidak perlu dicek, skor selalu objektif",
      ],
      answer: 0,
      why: "Kontaminasi dan perubahan format bisa menaikkan skor tanpa kemampuan baru.",
    },
  },

  penutup: {
    title: "Peta yang Sudah Kamu Jelajahi",
    subtitle: "Ringkasan seluruh perjalanan",
    color: "#e9b949",
    pages: [
      {
        heading: "Satu kalimat, seluruh mesin",
        body: [
          "Teks dipotong menjadi token. Setiap token mengambil vektor dan posisinya. Attention memindahkan informasi antar-posisi, MLP mengolahnya per posisi, dan blok diulang. Logits menjadi distribusi, decoding memilih satu token, dan loop berulang sampai selesai.",
        ],
        flow: ["Token", "Embedding", "Attention", "MLP", "Logits", "Sampling", "Loop"],
      },
      {
        heading: "Di luar forward pass",
        body: [
          "Training menyetel bobot sekali di depan. Post-training membentuk perilaku. Aplikasi menambahkan template, riwayat, pencarian, dan tool. Skala menentukan biaya dan kemampuan.",
          "Dan di atas semuanya: jawaban yang lancar tetap perlu diperiksa.",
        ],
      },
    ],
  },
};
