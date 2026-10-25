export default {
  Pemindai: "Scanner",
  "Pindai instrumen": "Scan instrument",
  "Arahkan ke instrumen untuk membaca mekanisme, angka, dan kode di catatan lapangan.":
    "Aim at an instrument to read mechanisms, numbers, and code in the field journal.",
  "Pelacak token": "Token tracer",
  "Lacak token berikutnya": "Trace next token",
  "Pilih satu posisi token. Sorotan pada matriks dan jalur attention mengikuti token itu.":
    "Select a token position. Matrix highlights and attention paths follow that token.",
  "Lensa head": "Head lens",
  "Ganti attention head": "Switch attention head",
  "Gunakan pada Q/K/V, attention, atau Transformer untuk membandingkan dua head demo.":
    "Use at Q/K/V, attention, or the Transformer to compare two demo heads.",
  "Pengendali waktu": "Time controller",
  "Jeda / jalankan sinyal": "Pause / run signals",
  "Bekukan aliran sinyal di seluruh lab. Tekan R untuk maju satu operasi dan periksa perubahannya.":
    "Freeze signal flow throughout the lab. Press R to advance one operation and inspect the change.",
  Kalibrator: "Calibrator",
  "Ubah konfigurasi eksperimen": "Change experiment configuration",
  "Ubah model eksperimen dengan E. Buka Misi [F] untuk membuat prediksi, menguji, dan meraih lencana.":
    "Change the experiment model with E. Open Missions [F] to predict, test, and earn badges.",
  "Pilih Pemindai [1], arahkan bidikan ke kapsul, lalu tekan E. Perhatikan bahwa ID token berbeda dari posisi token.":
    "Choose Scanner [1], aim at a capsule, then press E. A token ID differs from its position.",
  "Pilih Pelacak token [2], lalu tekan E. Lihat bagaimana satu baris embedding mewakili token yang sedang dibawa.":
    "Choose Token tracer [2], then press E. See how one embedding row represents the selected token.",
  "Pilih Lensa head [3], lalu tekan E. Query, Key, dan Value berasal dari input yang sama melalui tiga proyeksi berbeda.":
    "Choose Head lens [3], then press E. Query, Key, and Value come from the same input through three different projections.",
  "Gunakan Pelacak token [2] untuk mengganti Query, lalu Lensa head [3] untuk membandingkan pola. Posisi masa depan tetap tertutup.":
    "Use Token tracer [2] to change the Query, then Head lens [3] to compare patterns. Future positions remain masked.",
  "Gunakan Pengendali waktu [4] untuk menjeda. Tekan R untuk menelusuri residual, normalisasi, ekspansi MLP, GELU, dan proyeksi balik.":
    "Use Time controller [4] to pause. Press R to explore residuals, normalization, MLP expansion, GELU, and projection back.",
  "Pindai terminal [1]. Di tab Eksperimen, ubah temperature, pilih token, lalu tambahkan ke urutan. Probabilitas bukan kepastian fakta.":
    "Scan the terminal [1]. In Experiments, change temperature, choose a token, and append it. Probability is not factual certainty.",
  "Pindai rak [1] dan buka Eksperimen. Bandingkan prefill dan decode: K/V lama dipakai ulang, Query token baru tetap dihitung.":
    "Scan the rack [1] and open Experiments. Compare prefill and decoding: old K/V are reused, while the new Query is still computed.",
  "Pindai annex [1]. Hubungan vektor ini adalah ilustrasi embedding statis, terpisah dari jalur inferensi Transformer.":
    "Scan the annex [1]. These relationships illustrate static embeddings, separate from Transformer inference.",
  "Tabel angka; geser horizontal untuk semua kolom":
    "Number table; scroll horizontally for all columns",
  "· klik sel untuk derivasi": "· click a cell for derivation",
  "{0}, baris {1}, kolom {2}: {3}": "{0}, row {1}, column {2}: {3}",
  "minus tak hingga; masa depan belum tersedia":
    "negative infinity; future position unavailable",
  "Masa depan: j > i. Mask mengganti skor dengan −∞; softmax memberi bobot 0 tepat.":
    "Future position: j > i. The mask replaces the score with −∞; softmax assigns exactly zero weight.",
  "Skor scaled = {0}. Softmax stabil: exp(s − max) / Σ exp(s − max) = {1} / {2} = {3}. Σ bobot baris = {4}.":
    "Scaled score = {0}. Stable softmax: exp(s − max) / Σ exp(s − max) = {1} / {2} = {3}. Row weight sum = {4}.",
  "Kolom di tabel kontribusi adalah komponen Value; bobot attention sendiri tidak sama dengan kontribusi.":
    "Contribution-table columns are Value components; attention weights differ from contributions.",
  "Bias = {0}. Jumlah + bias = {1}. Bobot tetap pada fixture seed 42.":
    "Bias = {0}. Sum + bias = {1}. Weights stay fixed in the seed-42 fixture.",
  "Embedding token + embedding posisi. ID hanya memilih baris.":
    "Token embedding + position embedding. The ID only selects a row.",
  "Residual mempertahankan input dengan penjumlahan elemen demi elemen.":
    "A residual retains the input through elementwise addition.",
  "x = {0}; mean = {1}; variance = {2}; gamma=1; beta=0. Hasil = {3}. Statistik meliputi 8 fitur satu token, bukan seluruh urutan.":
    "x = {0}; mean = {1}; variance = {2}; gamma=1; beta=0. Result = {3}. Statistics cover one token's 8 features rather than the entire sequence.",
  "Input {0} → output {1}. Aproksimasi tanh mengikuti GPT-2.":
    "Input {0} → output {1}. The tanh approximation follows GPT-2.",
  "Tied embedding: matriks input digunakan lagi untuk proyeksi output. Logit = {0}.":
    "Tied embedding: the input matrix is reused for output projection. Logit = {0}.",
  "Temperature = {0}; mode {1}; top-k {2}; top-p {3}. Hasil setelah filter dan renormalisasi: {4}. Σ p = {5}.":
    "Temperature = {0}; mode {1}; top-k {2}; top-p {3}. After filtering and renormalization: {4}. Σ p = {5}.",
  "Greedy/T=0 memilih logit tertinggi. Vektor one-hot hanya menandai pilihan: nilai sel = {0}. Tidak ada pembagian dengan temperature 0; ini bukan softmax pada T positif.":
    "Greedy/T=0 selects the highest logit. A one-hot vector marks the choice: cell value = {0}. No division by temperature 0 occurs; this is not softmax at positive T.",
  "Kolom 0–3 berasal dari head 1; kolom 4–7 berasal dari head 2.":
    "Columns 0–3 come from head 1; columns 4–7 come from head 2.",
  "Lookup/vektor ilustratif. Periksa sumber dan shape untuk melihat asal angka ini.":
    "Illustrative lookup/vector. Inspect sources and shape to find where this value comes from.",
  "DERIVASI SEL [": "CELL DERIVATION [",
  Pasangan: "Pair",
  Bobot: "Weight",
  "Hasil ×": "Product ×",
  Jumlah: "Sum",
  "Nilai presisi penuh:": "Full-precision value:",
  "−∞ (mask terpisah di JSON)": "−∞ (mask stored separately in JSON)",
  "Inspector pembelajaran": "Learning inspector",
  "CATATAN LAB": "LAB JOURNAL",
  "Di balik angka.": "Behind the numbers.",
  "Kedalaman pembelajaran": "Learning depth",
  Makna: "Meaning",
  Angka: "Numbers",
  Kode: "Code",
  "Telusuri satu angka": "Trace one number",
  "Baris: {0}, lalu hasil. Kolom: empat dimensi vektor mainan.":
    "Rows: {0}, then the result. Columns: four toy-vector dimensions.",
  "Baris = posisi token; kolom mengikuti tensor aktif. Batch tunggal B=1 disembunyikan.":
    "Rows = token positions; columns follow the active tensor. Single batch B=1 is omitted.",
  "PSEUDOCODE · TIDAK DIEKSEKUSI": "PSEUDOCODE · NOT EXECUTED",
  "Lihat implementasi GPT-2": "View GPT-2 implementation",
  "Provenance & sumber tensor": "Provenance & tensor sources",
  "contoh lokal": "local example",
  "logits lokal": "local logits",
  "Dimensi 8 · 2 head × 4 · MLP 32 · 2 blok. Bias 0. Angka mainan deterministik, bukan aktivasi atau prediksi GPT-2.":
    "Width 8 · 2 heads × 4 · MLP 32 · 2 blocks. Zero bias. Deterministic toy numbers rather than GPT-2 activations or predictions.",
  "Sumber:": "Source:",
  "lookup vocabulary mainan": "toy vocabulary lookup",
  "Vignette ini berdiri sendiri dan tidak berasal dari hidden state pipeline.":
    "This vignette stands alone and does not come from pipeline hidden states.",
  "Operasi mengikuti pipeline GPT-2; bobot demo tidak dilatih untuk bahasa.":
    "Operations follow the GPT-2 pipeline; demo weights are not trained for language.",
  "ANGKA SIMULASI · DIMENSI DIPERKECIL":
    "SIMULATED NUMBERS · REDUCED DIMENSIONS",
  Posisi: "Position",
  "Urutan token": "Token sequence",
  "CONTOH LOGITS LOKAL · TERKURASI": "CURATED LOCAL LOGITS EXAMPLE",
  "PIPELINE · VOCABULARY MAINAN 16": "PIPELINE · TOY VOCABULARY OF 16",
  Probabilitas: "Probability",
  "Lainnya (11)": "Others (11)",
  Semua: "All",
  "Pilih argmax": "Select argmax",
  "Ambil satu sampel": "Draw one sample",
  "Terpilih:": "Selected:",
  "Masukkan ke urutan": "Append to sequence",
  "Lima kandidat + lainnya = 100%. Filter top-k/top-p dihitung ulang dan dinormalisasi. Distribusi lebih datar memberi variasi; probabilitas bukan jaminan kebenaran.":
    "Five candidates + others = 100%. Top-k/top-p filters are recomputed and normalized. A flatter distribution adds variety; probability does not guarantee truth.",
  " Pada greedy/T=0, bar one-hot menandai argmax, bukan softmax pada temperature positif.":
    " In greedy/T=0, one-hot bars mark argmax rather than softmax at positive temperature.",
  "TOKENIZER MAINAN · PRESET OFFLINE": "TOY TOKENIZER · OFFLINE PRESETS",
  "Preset tokenizer": "Tokenizer preset",
  "potongan + lookup": "pieces + lookup",
  "siap dipisahkan": "ready to split",
  "spasi awal": "leading space",
  "tanpa spasi awal": "no leading space",
  "Zoom merge BPE mainan": "Inspect toy BPE merges",
  "Aturan yang sudah dipelajari: (c,a) → ca, lalu (ca,t) → cat. Ini contoh merge; bukan vocabulary byte-level GPT-2.":
    "Learned rules: (c,a) → ca, then (ca,t) → cat. This illustrates merging rather than GPT-2's byte-level vocabulary.",
  "Merge berikutnya": "Next merge",
  "Ulangi merge": "Restart merges",
  "· menandai spasi asli. Menggabungkan semua potongan merekonstruksi input persis; ID tidak diklaim sebagai ID GPT-2.":
    "· marks an original space. Joining all pieces reconstructs the exact input; IDs are not GPT-2 IDs.",
  "Pulihkan posisi": "Restore positions",
  "Tukar posisi 0 ↔ 1": "Swap positions 0 ↔ 1",
  "Embedding token tetap saat token dipindah. Position embedding mengikuti posisi baru. Koordinat demo bukan sumbu makna universal.":
    "Token embeddings stay fixed when tokens move. Position embeddings follow the new positions. Demo coordinates are not universal semantic axes.",
  "CONTOH LOKAL · q = [2,0,0,0]": "LOCAL EXAMPLE · q = [2,0,0,0]",
  "PIPELINE · HEAD {0} · BLOK {1}": "PIPELINE · HEAD {0} · BLOCK {1}",
  "Gunakan pipeline": "Use pipeline",
  "Contoh [2,1,0]": "Example [2,1,0]",
  "Urutan mainan pendek; bukan token BPE GPT-2. Klik":
    "Short toy sequence rather than GPT-2 BPE tokens. Click",
  "it (posisi 1)": "it (position 1)",
  "kata akhir (posisi 3)": "last word (position 3)",
  "masa depan belum tersedia": "future position unavailable",
  "Skor / bobot": "Score / weight",
  "Belum tersedia": "Unavailable",
  "Bobot setelah mask =": "Weight after masking =",
  "Σ bobot baris": "Σ row weights",
  "Telusuri weighted sum": "Trace weighted sum",
  "Query di baris, Key di kolom. Skor bukan probabilitas. Memilih sel membuka derivasi dan kontribusi Value.":
    "Queries are rows; Keys are columns. Scores are not probabilities. Selecting a cell opens its derivation and Value contributions.",
  "12 PELAT ILUSTRATIF · 2 BLOK DEMO NUMERIK":
    "12 ILLUSTRATIVE PLATES · 2 NUMERICAL DEMO BLOCKS",
  "Blok referensi; tidak ada angka fixture":
    "Reference block; no fixture values",
  "Buka blok numerik": "Open numerical block",
  "X awal": "Initial X",
  "X berikutnya": "Next X",
  "Kurva GELU: halus, nilai negatif tidak seluruhnya nol":
    "GELU curve: smooth, with negative values not all zero",
  "Expansion 8 → 32 → 8. Aktivasi kontinu; satu neuron tidak mewakili satu fakta.":
    "Expansion 8 → 32 → 8. Activations are continuous; one neuron does not represent one fact.",
  "AKTIVASI PER URUTAN · BUKAN WEIGHTS":
    "PER-SEQUENCE ACTIVATIONS · NOT WEIGHTS",
  "{0} · posisi {1} · {2}": "{0} · position {1} · {2}",
  "Tanpa cache": "Without cache",
  "baris diproyeksikan ulang / 2 blok": "rows reprojected / 2 blocks",
  "Dengan cache": "With cache",
  "baris baru / 2 blok": "new rows / 2 blocks",
  "Penghitung pekerjaan ilustratif untuk langkah decode berikutnya, bukan latency. Estimasi cache Float32 saat ini:":
    "Illustrative work counts for the next decoding step, not latency. Current Float32 cache estimate:",
  "byte total.": "bytes total.",
  "Decode satu token": "Decode one token",
  "Decode incremental dan forward penuh dihitung terpisah. Selisih logit maksimum:":
    "Incremental decoding and full forward pass are computed separately. Maximum logit difference:",
  "K/V prefix dipakai ulang.": "Prefix K/V are reused.",
  "Mode tanpa cache memproyeksikan ulang prefix; hasil tetap sama.":
    "Without caching, the prefix is reprojected; results remain the same.",
  "Batas 12 token demo tercapai. Reset prefix untuk mulai lagi.":
    "The 12-token demo limit is reached. Reset the prefix to restart.",
  "CONTOH LOKAL · WORD EMBEDDINGS STATIS":
    "LOCAL EXAMPLE · STATIC WORD EMBEDDINGS",
  "Pilih contoh analogi": "Choose analogy example",
  "{0} dikurangi {1} ditambah {2}, mendekati {3}. Proyeksi dimensi 1 dan 2.":
    "{0} minus {1} plus {2}, close to {3}. Projection of dimensions 1 and 2.",
  "dimensi 1": "dimension 1",
  "dimensi 2": "dimension 2",
  Mendekati: "Close to",
  "pada fixture ini. Vektor dirancang untuk ilustrasi, bukan diukur dari model terlatih. Ranking cosine memakai empat dimensi sumber; diagram dan lab hanya menampilkan proyeksi dua dimensi. Relasi ini tidak berlaku universal.":
    "in this fixture. Vectors illustrate relationships rather than measurements from a trained model. Cosine ranking uses four source dimensions; the diagram and lab display a two-dimensional projection. The relationship is not universal.",
  "Apa bedanya dengan representasi kontekstual GPT?":
    "How does this differ from GPT's contextual representations?",
  "Query · pola dicocokkan": "Query · matching patterns",
  "Key · pola ditawarkan": "Key · offered patterns",
  "Value · informasi dibawa": "Value · carried information",
  "Telusuri proyeksi": "Trace projection",
  "Q, K, V berasal dari LayerNorm input yang sama, memakai tiga matriks bobot terlatih yang berbeda. Semua bobot demo dibuat deterministik, bukan bobot GPT-2.":
    "Q, K, and V come from the same LayerNorm input through three different learned matrices. Demo weights are deterministic rather than GPT-2 weights.",
  "16 kandidat workbench · probabilitas":
    "16 workbench candidates · probabilities",
  "Kandidat: {0}": "Candidate: {0}",
  "Terpilih: {0}": "Selected: {0}",
  "Potongan teks, bukan selalu satu kata":
    "Text pieces, not always whole words",
  "N × 12.288 · skala referensi": "N × 12,288 · reference scale",
  "LN(X) · tiga proyeksi terlatih": "LN(X) · three learned projections",
  "Causal dense head · pindai untuk memeriksa angka":
    "Causal dense head · scan to inspect numbers",
  "Prefix dipakai ulang · Q token baru": "Prefix reused · new token Query",
  "ANNEX · di luar jalur inferensi": "ANNEX · outside the inference pipeline",
  "SATU DECODER BLOCK · DIULANG 96×": "ONE DECODER BLOCK · REPEATED 96 TIMES",
  "3D tidak tersedia.": "3D is unavailable.",
  "Buka mode 2D": "Open 2D mode",
  "MLP · ekspansi 49.152 fitur": "MLP · expansion to 49,152 features",
  "Aliran ke atas · workbench blok": "Upward flow · workbench block",
  "Mouse bebas: seret dunia untuk melihat, lalu gunakan WASD. Esc melepas kendali.":
    "Mouse is free: drag to look, then use WASD. Esc releases control.",
  "Seret dunia untuk melihat dan gunakan WASD untuk berjalan.":
    "Drag the world to look and use WASD to walk.",
  "Dunia lab 3D. Klik untuk kendali, WASD berjalan, E gunakan alat, H hint, Esc lepas mouse.":
    "3D lab world. Click to control, WASD to walk, E to use a tool, H for hints, Esc to release the mouse.",
  "Mouse tetap bebas. Seret layar untuk melihat; WASD tetap bisa digunakan.":
    "The mouse remains free. Drag to look; WASD remains available.",
  "Belum ada": "Not set",
  "MASA LALU + SAAT INI / 3 JALUR VALID": "PAST + PRESENT / 3 VALID PATHS",
  "2 FUTURE LINKS / KEBOCORAN": "2 FUTURE LINKS / LEAKAGE",
  "F(x) / TANPA INPUT": "F(x) / WITHOUT INPUT",
  "4 PASANG LAMA / 1 PASANG BARU": "4 RETAINED PAIRS / 1 NEW PAIR",
  "5 POSISI DIPROYEKSIKAN ULANG": "5 POSITIONS REPROJECTED",
  "WebGL tidak tersedia. Gunakan mode diagram untuk menjelajahi semua instrumen.":
    "WebGL is unavailable. Use diagram mode to explore every instrument.",
  "Waktu dijeda. Tekan R untuk maju satu operasi.":
    "Time paused. Press R to advance one operation.",
  "Sinyal mengalir kembali.": "Signals are flowing again.",
  "Dekati instrumen dan arahkan bidikan ke bagian tengahnya.":
    "Move closer to an instrument and aim at its center.",
  "Melacak posisi {0} pada vignette Q/K/V.":
    "Tracing position {0} in the Q/K/V vignette.",
  "Melacak {0} · posisi {1}. Sorotan matriks mengikuti token ini.":
    "Tracing {0} · position {1}. Matrix highlights follow this token.",
  "Lensa head digunakan pada Q/K/V, causal attention, atau blok Transformer.":
    "Use the head lens at Q/K/V, causal attention, or the Transformer block.",
  "Head demo {0} aktif. Perhatikan perubahan proyeksi dan bobot attention.":
    "Demo head {0} active. Inspect the changed projections and attention weights.",
  "Tahap berikutnya: {0}. Ikuti penanda atau buka peta [M].":
    "Next stage: {0}. Follow the marker or open the map [M].",
  "Perjalanan satu token selesai. Jelajahi lagi dengan alat lain atau pilih eksperimen di catatan.":
    "One token's journey is complete. Explore with other tools or choose an experiment in the journal.",
  "Kalibrator bekerja di tokenizer, embedding, attention, Transformer, sampling, dan cache. Gunakan Lensa head pada Q/K/V.":
    "The Calibrator works at tokenizer, embedding, attention, Transformer, sampling, and cache. Use the Head lens at Q/K/V.",
  "{0}: {1}. {2}. Buka Misi untuk prediksi dan uji.":
    "{0}: {1}. {2}. Open Missions to predict and test.",
  "Kalimat sederhana": "Simple sentence",
  "Kata & subword": "Words & subwords",
  "Spasi awal": "Leading spaces",
  "Bahasa Indonesia": "Indonesian",
  "Ibu kota dan negara": "Capitals and countries",
  "Bentuk kata kerja bahasa Inggris": "English verb forms",
  "Profesi dan tempat kerja": "Professions and workplaces",
  "word vectors mainan statis: {0}": "static toy word vectors: {0}",
  "logits lokal terkurasi; pipeline terpisah":
    "curated local logits; separate pipeline",
  "concept-vignette · contoh lokal": "concept vignette · local example",
};
