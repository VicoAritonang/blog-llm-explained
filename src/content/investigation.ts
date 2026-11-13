export type Lesson = {
  title: string;
  short: string;
  act: number;
  question: string;
  story: string;
  action: string;
  prediction: string;
  choices: string[];
  evidence: string[];
  answer: number;
  takeaway: string;
  code: string;
  transition: string;
};
export const acts = [
  "Pesan masuk",
  "Konteks bekerja",
  "Jawaban terbentuk",
  "Jawaban diperiksa",
];
export const lessons: Lesson[] = [
  {
    title: "Satu kata berubah, jawaban ikut berubah",
    short: "Meja kasus",
    act: 0,
    question:
      "Bagaimana mesin menjawab tentang sesuatu yang baru saja kita ceritakan?",
    story:
      "Catatan menyebut laci biru. Model menghasilkan “di” dan “laci” dalam dua langkah. Kita berhenti tepat sebelum pilihan warna. Salinan B hanya mengganti biru menjadi hijau.",
    action: "Bandingkan kedua warna",
    prediction: "Apa yang perlu berubah agar jawabannya mengikuti catatan?",
    choices: [
      "Daftar jawaban lengkap yang disimpan",
      "Bobot model ditulis ulang",
      "Aktivasi dari konteks, dengan bobot yang sama",
    ],
    evidence: [
      "Checkpoint sama, tetapi logits A/B berbeda",
      "Semua angka di mesin tetap sama",
      "Bobot model berubah setelah membaca catatan",
    ],
    answer: 0,
    takeaway:
      "Input dapat mengubah perhitungan dan jawaban tanpa mengganti bobot. Ini contoh terpilih dari model tugas sintetis, bukan chatbot umum.",
    code: "A = forward(tokenize(catatanBiru), checkpoint)\nB = forward(tokenize(catatanHijau), checkpoint)\ncompare(A.logits, B.logits)",
    transition: "Pertama, lihat bentuk pesan ketika diterima mesin.",
  },
  {
    title: "Mesin tidak menerima kalimat utuh",
    short: "Tokenisasi",
    act: 0,
    question: "Apa unit yang benar-benar masuk ke model?",
    story:
      "Tokenizer profil ini mencocokkan potongan vocabulary terpanjang. Spasi awal dan newline ikut tersimpan. Ia bukan BPE dan tidak memotong berdasarkan pemahaman kalimat.",
    action: "Periksa rekonstruksi",
    prediction: "Dua kemunculan “ kunci” akan memiliki…",
    choices: [
      "ID yang sama, posisi berbeda",
      "ID berbeda karena posisinya berbeda",
      "Nilai ID sama dengan nomor posisinya",
    ],
    evidence: [
      "Teks kembali persis, termasuk spasi dan newline",
      "Token ID menunjukkan tingkat kecerdasan kata",
      "Setiap token selalu satu kata",
    ],
    answer: 0,
    takeaway:
      "Token adalah unit vocabulary. ID memilih identitas; posisi menunjukkan tempat. Contoh terpisah “bel” + “ajar” tetap membentuk satu kata.",
    code: 'pieces = longestMatch(text, vocabulary)\nids = pieces.map(piece => vocabulary.indexOf(piece))\nassert(pieces.join("") === text)',
    transition:
      "ID belum cukup untuk menghitung hubungan. Setiap ID mengambil daftar angka.",
  },
  {
    title: "Nomor menjadi daftar angka",
    short: "Embedding",
    act: 0,
    question: "Bagaimana ID berubah menjadi bahan perhitungan?",
    story:
      "ID memilih satu baris tabel embedding yang dipelajari saat training. Bandingkan dua kemunculan token yang sama: tabelnya tetap, salinan barisnya identik.",
    action: "Bandingkan dua lookup",
    prediction: "Sebelum posisi ditambahkan, dua token “ kunci” memiliki…",
    choices: [
      "Embedding sama",
      "Embedding berbeda karena urutan",
      "Tidak ada representasi numerik",
    ],
    evidence: [
      "Selisih embedding kedua posisi = 0",
      "ID yang besar memiliki makna lebih rumit",
      "Tabel embedding dilatih ulang untuk setiap pesan",
    ],
    answer: 0,
    takeaway:
      "Mengubah input memilih baris lain. Itu bukan proses belajar ulang. Komponen vektor tidak diberi nama makna manusia tanpa bukti.",
    code: "embedding = E[tokenId]\n// Parameter E tetap selama inference.\n// Dua ID sama mengambil baris yang sama.",
    transition:
      "Kalau embedding sama, bagaimana tempatnya dalam urutan dibedakan?",
  },
  {
    title: "Token yang sama, tempat yang berbeda",
    short: "Posisi",
    act: 0,
    question: "Apa yang berubah ketika token dipindahkan?",
    story:
      "Profil ini menjumlahkan embedding token dan learned positional embedding. Pindahkan lookup token yang sama ke posisi lain dan periksa hasil penjumlahan per komponen.",
    action: "Bandingkan representasi masukan",
    prediction: "Ketika ID yang sama berada di posisi lain…",
    choices: [
      "ID dan E tetap; E + P dapat berubah",
      "ID harus berubah",
      "Semua angkanya harus tetap",
    ],
    evidence: [
      "E sama, P dan X berbeda",
      "Posisi mengganti seluruh tabel E",
      "Decoder tanpa posisi pasti buta urutan",
    ],
    answer: 0,
    takeaway:
      "X = E[id] + P[pos]. Mask kausal juga memberi struktur urutan. Arsitektur lain dapat memakai posisi berbeda, misalnya rotasi Q/K pada RoPE.",
    code: "X[pos] = E[ids[pos]] + P[pos]\n// Penjumlahan per fitur, bukan mengubah token ID.",
    transition:
      "Representasi awal belum mengambil informasi dari posisi lain. Kita masuk ke blok.",
  },
  {
    title: "Bagaimana informasi bisa bertemu?",
    short: "Query · Key · Value",
    act: 1,
    question: "Apa bedanya angka pencocokan dan angka yang dibawa?",
    story:
      "Di dalam setiap blok, LayerNorm dilanjutkan tiga proyeksi. Query dan Key menentukan skor pasangan. Value menyediakan fitur yang dicampur. Pilih query, head, dan komponen untuk menelusuri asal satu angka.",
    action: "Telusuri satu proyeksi",
    prediction: "Jika hanya Value pada contoh operator diubah, Q/K tetap…",
    choices: [
      "Skor Q · K tetap; campuran dapat berubah",
      "Skor Q · K pasti berubah",
      "Head memilih satu jawaban lengkap",
    ],
    evidence: [
      "Q berasal dari input ternormalisasi × WQ + bias",
      "Query adalah kalimat pertanyaan tersembunyi",
      "Head 1 selalu bertugas mencari warna",
    ],
    answer: 0,
    takeaway:
      "Q/K mengatur pembobotan; V menyediakan isi campuran. Head tidak otomatis memiliki jabatan semantik yang tetap.",
    code: "U = LayerNorm(X)\nQ = U @ Wq + bq\nK = U @ Wk + bk\nV = U @ Wv + bv\nscore[i,j] = dot(Q[i], K[j]) / sqrt(d_head)",
    transition:
      "Pasangan bisa dihitung, tetapi tidak semua posisi boleh dibaca.",
  },
  {
    title: "Jangan membaca jawaban dari masa depan",
    short: "Mask kausal",
    act: 1,
    question: "Bisakah perubahan di kanan memengaruhi prefix di kiri?",
    story:
      "A dan B hanya berbeda pada posisi warna. Semua posisi sebelumnya memiliki prefix yang sama. Mask menutup skor di kanan sebelum softmax; posisi diagonal tetap boleh dibaca.",
    action: "Uji prefix yang identik",
    prediction: "Mengganti warna pada posisi 7 akan membuat posisi 0–6…",
    choices: [
      "Tetap identik pada semua layer",
      "Ikut berubah pada semua layer",
      "Kehilangan token ID",
    ],
    evidence: [
      "Selisih maksimum aktivasi prefix = 0",
      "Diagonal attention selalu tertutup",
      "Skor besar dapat menembus mask",
    ],
    answer: 0,
    takeaway:
      "Posisi sekarang memprediksi token berikutnya. Saat training, mask mencegah posisi itu membaca target masa depan yang sudah tersedia dalam contoh.",
    code: "scores[i,j] = dot(q[i], k[j]) / sqrt(d_head)\nif j > i: scores[i,j] = -Infinity\nA[i] = softmax(scores[i])",
    transition:
      "Sesudah izin akses ditentukan, berapa banyak Value dari tiap posisi yang dicampur?",
  },
  {
    title: "Cocok belum berarti selesai",
    short: "Campuran Value",
    act: 1,
    question: "Apa yang sebenarnya dihasilkan attention?",
    story:
      "Softmax membuat bobot satu baris berjumlah satu. Setiap bobot mengalikan Value, lalu hasilnya dijumlahkan. Inspector dan koneksi 3D menggunakan baris yang sama.",
    action: "Hitung satu campuran",
    prediction: "Dengan bobot sama, mengubah Value dapat…",
    choices: [
      "Mengubah vektor hasil campuran",
      "Tidak mungkin mengubah hasil",
      "Memindahkan kata asli keluar dari prompt",
    ],
    evidence: [
      "Z[c] = jumlah A[j] × V[j,c]",
      "Attention langsung mengeluarkan satu kata",
      "Dua head melakukan voting jawaban",
    ],
    answer: 0,
    takeaway:
      "Attention menghasilkan vektor. Hasil tiap head di-concat lalu diproyeksikan. Heatmap saja bukan penjelasan lengkap penyebab suatu jawaban.",
    code: "A = softmax(mask(scores))\nZ = A @ V\nattention = concat(Z_head0, Z_head1) @ Wo + bo",
    transition:
      "Campuran masih harus bergabung dengan aliran representasi dan melewati MLP.",
  },
  {
    title: "Satu blok memperbarui, blok berikutnya melanjutkan",
    short: "Blok lengkap",
    act: 1,
    question:
      "Mengapa melewati dua layer belum berarti menghasilkan dua token?",
    story:
      "Attention mencampur informasi antarposisi. MLP mengolah fitur per posisi dengan bobot yang sama dalam satu layer. Dua jalur residual menambahkan hasil cabang ke aliran utama.",
    action: "Periksa susunan blok",
    prediction: "Ketika berpindah ke layer kedua…",
    choices: [
      "Seluruh blok berulang dengan bobot layer itu",
      "Hanya MLP yang dijalankan lagi",
      "Satu kata baru sudah otomatis keluar",
    ],
    evidence: [
      "Dua residual menjumlahkan input dan keluaran cabang",
      "Residual menjamin semua jawaban benar",
      "MLP memindahkan token antarposisi",
    ],
    answer: 0,
    takeaway:
      "Profil pre-norm: R = X + Attention(LN(X)); X berikut = R + MLP(LN(R)). Normalization bekerja pada fitur satu posisi. GELU tidak mematikan semua nilai negatif.",
    code: "for block in blocks:\n  R = X + attention(layerNorm(X))\n  X = R + linear(gelu(linear(layerNorm(R))))\n// Semua blok dilalui sebelum distribusi token berikutnya.",
    transition:
      "Di ujung tumpukan masih ada vektor. Bagaimana menjadi pilihan token?",
  },
  {
    title: "Dari representasi ke satu pilihan",
    short: "Logits & sampling",
    act: 2,
    question: "Mengapa skor yang sama bisa menghasilkan pilihan berbeda?",
    story:
      "Final LayerNorm dan proyeksi vocabulary menghasilkan logits. Bekukan logits, lalu ubah temperature atau aturan pemilihan. Top-k diterapkan sebelum top-p dan distribusi dinormalisasi ulang.",
    action: "Bandingkan aturan decoding",
    prediction: "Temperature positif pada logits tetap mengubah…",
    choices: [
      "Ketajaman probabilitas, bukan ranking logits",
      "Pengetahuan dalam bobot model",
      "Peluang seluruh kalimat benar",
    ],
    evidence: [
      "Logits tetap; distribusi berubah",
      "Probabilitas token sama dengan kebenaran fakta",
      "Sampling selalu memilih kandidat terbesar",
    ],
    answer: 0,
    takeaway:
      "Greedy memilih argmax. Sampling mengundi distribusi. Probabilitas token bukan peluang bahwa seluruh jawaban benar. Kandidat tersembunyi tetap dihitung sebagai “token lain”.",
    code: "logits = LayerNorm(X[-1]) @ E.T + bias\np = softmax(logits / temperature)\np = renormalize(top_p(top_k(p)))\ntoken = sample(p, seed) // atau argmax(logits)",
    transition:
      "Satu pilihan belum menjadi kalimat. Token ini perlu masuk lagi ke konteks.",
  },
  {
    title: "Satu pilihan menjadi konteks baru",
    short: "Generation & cache",
    act: 2,
    question: "Apa yang diulang, dan apa yang bisa dipakai lagi?",
    story:
      "Prefill menghitung prompt. Setiap decode memilih satu token, menambahkannya ke konteks, lalu menghitung lagi. Cache menyimpan K/V per layer; token baru tetap melewati semua blok.",
    action: "Bandingkan cache dan hitung ulang",
    prediction: "Untuk prefix yang sama, cache seharusnya…",
    choices: [
      "Mengurangi posisi dihitung, dengan logits setara",
      "Menambahkan pengetahuan baru",
      "Menyimpan seluruh jawaban jadi",
    ],
    evidence: [
      "Logits setara dalam toleransi 1e−10; pekerjaan berbeda",
      "Tanda titik selalu menghentikan model",
      "Cache tetap sah setelah seluruh prompt diedit",
    ],
    answer: 0,
    takeaway:
      "K/V token terpilih baru dihitung pada putaran berikutnya. Edit pada posisi r membatalkan cache mulai r. EOS atau batas panjang menghentikan loop; konteks tidak dipotong diam-diam.",
    code: "while not stopped:\n  logits, cache = forward(context, cache)\n  next = choose(logits[-1])\n  if next == EOS: break\n  context.append(next)",
    transition:
      "Mesin sudah bekerja. Dari mana angka parameter yang membuatnya berguna?",
  },
  {
    title: "Siapa yang mengatur angka di mesin?",
    short: "Training",
    act: 2,
    question: "Apa bedanya belajar dari contoh dan membaca prompt baru?",
    story:
      "Training membandingkan prediksi token berikutnya dengan target. Loss memberi sinyal gradien untuk optimizer. Model lab dilatih pada jawaban sintetis; gradien memperbarui seluruh parameter, termasuk embedding dan proyeksi.",
    action: "Perbarui tiga bias contoh",
    prediction: "Satu langkah gradient descent mengubah…",
    choices: [
      "Parameter contoh mengikuti gradien loss",
      "Hanya teks prompt",
      "Semua fakta menjadi benar",
    ],
    evidence: [
      "Bias diperbarui; loss target contoh turun",
      "Percakapan biasa otomatis mengubah checkpoint",
      "Training loss rendah menjamin semua kasus baru benar",
    ],
    answer: 0,
    takeaway:
      "Demo tiga bias terpisah dari checkpoint. Model penuh memakai backprop melalui semua operasi. Hasil uji kombinasi yang ditahan lebih berguna daripada hanya melihat training loss.",
    code: "target[t] = tokens[t+1]\nloss = -log(p[target])\ndz = p - one_hot(target)\nbias -= learning_rate * dz\n// Demo bias, bukan seluruh backprop Transformer.",
    transition:
      "Memprediksi teks dan berperilaku sebagai asisten masih perlu dibedakan.",
  },
  {
    title: "Mengapa mesin bisa menjadi asisten?",
    short: "Model & aplikasi",
    act: 3,
    question: "Apakah semua perubahan perilaku berarti bobot dilatih ulang?",
    story:
      "Contoh instruksi–respons dan sinyal preferensi dapat membentuk perilaku lewat post-training. Aplikasi menyusun pesan dan penanda peran menjadi input. Tidak semua asisten memakai pipeline training yang sama.",
    action: "Periksa pengelompokan",
    prediction: "Menambahkan “jawab singkat” dalam pesan mengubah…",
    choices: [
      "Konteks yang diterima model",
      "Parameter lewat optimizer",
      "Ukuran vocabulary",
    ],
    evidence: [
      "Prompt, parameter, decoding, dan aplikasi punya fungsi berbeda",
      "RLHF wajib untuk setiap model",
      "Penanda peran berada di luar pipeline token",
    ],
    answer: 0,
    takeaway:
      "Panel ini skema konseptual. Tidak ada pasangan checkpoint base/instruction yang diklaim sedang dibandingkan. Format percakapan dan post-training tidak menjamin kebenaran.",
    code: "messages = [system, user, assistant_history]\ninput = tokenizer(chat_template(messages))\noutput = model.generate(input, decoding_policy)",
    transition:
      "Perilaku membantu belum cukup. Apakah catatan benar-benar mendukung klaimnya?",
  },
  {
    title: "Jawaban lancar, bukti belum tentu ada",
    short: "Bukti & retrieval",
    act: 3,
    question: "Apa yang boleh disimpulkan jika lokasi tidak pernah diberikan?",
    story:
      "Buka kasus tanpa lokasi atau dua catatan yang bertentangan. Tampilkan hasil asli model, lalu cari dokumen lokal. Aplikasi memasukkan cuplikan yang ditemukan ke konteks sebelum inference baru.",
    action: "Periksa jawaban tanpa lokasi",
    prediction: "Jika model menyebut lokasi tanpa sumber, klaim itu…",
    choices: [
      "Belum didukung oleh konteks",
      "Pasti benar karena lancar",
      "Pasti berasal dari internet",
    ],
    evidence: [
      "Dokumen baru memengaruhi model setelah dimasukkan ke input",
      "KV cache adalah arsip pengetahuan permanen",
      "Nama sumber yang ditulis model membuktikan klaimnya",
    ],
    answer: 0,
    takeaway:
      "Sesuai catatan berbeda dari benar di dunia nyata. Retrieval dapat gagal; sumber yang masuk pun belum tentu digunakan dengan benar. Periksa klaim, sumber, dan waktunya.",
    code: "documents = localSearch(question)\ncontext = selectedExcerpt + question\nanswer = generate(tokenize(context))\nverifyClaimsAgainstSource(answer, documents)",
    transition:
      "Sekarang gunakan hubungan sebab-akibat ini pada kasus kartu akses.",
  },
  {
    title: "Buktikan pemahamanmu",
    short: "Kasus transfer",
    act: 3,
    question: "Bisakah kamu menjelaskan kasus baru dengan bukti?",
    story:
      "Kartu akses ada di tas merah. Sebelum melihat keluaran, prediksikan akibat perubahan input, temperature, cache, dan hilangnya sumber. Gunakan angka dari eksperimen, lalu jelaskan hubungan yang kamu temukan.",
    action: "Jalankan kasus kartu akses",
    prediction: "Jika warna diganti tanpa training baru…",
    choices: [
      "Konteks dan aktivasi berubah, checkpoint tetap",
      "Semua parameter harus diperbarui",
      "Tidak ada angka yang berubah",
    ],
    evidence: [
      "Token → vektor → blok → logits → pilihan → konteks baru",
      "Setiap layer menghasilkan satu kata",
      "Jawaban lancar tidak memerlukan sumber",
    ],
    answer: 0,
    takeaway:
      "Bobot dipelajari saat training. Konteks mengubah aktivasi saat inference. Cache memakai ulang hasil antara. Kepercayaan pada jawaban tetap membutuhkan bukti.",
    code: "text → tokens → embeddings + positions\n→ repeated transformer blocks → logits\n→ decoding → append token → repeat\n// Learned parameters ≠ context ≠ cache ≠ external source",
    transition:
      "Buka kembali bukti, revisi penjelasan, atau lanjutkan eksplorasi bebas.",
  },
];
export const routes = {
  quick: {
    name: "Tur kilat",
    duration: "10–15 menit",
    steps: [0, 1, 3, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  main: {
    name: "Investigasi utama",
    duration: "35–50 menit",
    steps: lessons.map((_, i) => i),
  },
  deep: {
    name: "Bedah mesin",
    duration: "60–90 menit",
    steps: lessons.map((_, i) => i),
  },
};
