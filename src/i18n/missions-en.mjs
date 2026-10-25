export default {
  "Bukan satu kata, satu token": "Not one word, one token",
  "Pecah kata terpanjang menjadi dua bagian dan pertahankan teks asal.":
    "Split the longest word into two pieces while preserving the original text.",
  Segmentasi: "Segmentation",
  "Potongan utuh": "Whole pieces",
  "Pisah subword": "Split subword",
  "Teks tetap sama, jumlah token berubah":
    "Text stays the same, token count changes",
  "Teks asli ikut berubah": "The original text also changes",
  "Batas token tidak harus sama dengan batas kata. Dua segmentasi bisa merekonstruksi teks yang sama. Ini fixture ilustratif, bukan tokenizer GPT-3.":
    "Token boundaries need not match word boundaries. Two segmentations can reconstruct the same text. This fixture is an illustration, not the GPT-3 tokenizer.",
  "4 keping • teks: The curious cat sleeps":
    "4 pieces • text: The curious cat sleeps",
  "5 keping • teks: The curious cat sleeps":
    "5 pieces • text: The curious cat sleeps",
  "Urutan yang hilang": "The missing order",
  "Aktifkan penanda posisi pada tiga token agar urutannya dapat dibedakan.":
    "Enable position markers on three tokens to distinguish their order.",
  "Informasi posisi": "Position information",
  "Tanpa posisi": "Without positions",
  "Posisi aktif": "Positions enabled",
  "ID token menjadi nomor posisi": "Token IDs become position numbers",
  "Vektor posisi ditambahkan ke embedding":
    "Position vectors are added to embeddings",
  "Embedding token yang sama tetap berasal dari baris lookup yang sama. Penambahan vektor posisi memberi informasi tentang lokasi token di urutan.":
    "The same token embedding still comes from the same lookup row. Adding a position vector supplies information about its location in the sequence.",
  "3 embedding • penanda urutan tidak aktif":
    "3 embeddings • order markers disabled",
  "3 embedding + 3 vektor posisi": "3 embeddings + 3 position vectors",
  "Tutup kebocoran masa depan": "Block future leakage",
  "Pasang causal mask: Query pada posisi 2 hanya boleh melihat posisi 0, 1, dan 2.":
    "Apply a causal mask: the Query at position 2 may only see positions 0, 1, and 2.",
  "Mask dilepas": "Mask removed",
  "Mask terpasang": "Mask applied",
  "Dua posisi masa depan mendapat bobot nol":
    "Two future positions receive zero weight",
  "Semua posisi menjadi tidak terlihat": "Every position becomes invisible",
  "Mask memberi skor −∞ sebelum softmax pada posisi masa depan. Bobot untuk posisi tersebut menjadi nol. Posisi saat ini tetap boleh diakses.":
    "The mask assigns −∞ to future-position scores before softmax. Their weights become zero; the current position remains accessible.",
  "5 jalur terbuka • 2 jalur masa depan bocor":
    "5 open paths • 2 future paths leak",
  "3 jalur valid • 2 jalur masa depan diblokir":
    "3 valid paths • 2 future paths blocked",
  "Jembatan residual": "The residual bridge",
  "Sambungkan jalur input langsung ke penjumlahan setelah sublayer.":
    "Connect the direct input path to the addition after the sublayer.",
  "Jalur residual": "Residual path",
  "Jalur terputus": "Path disconnected",
  "Jalur tersambung": "Path connected",
  "Residual menggantikan attention": "The residual replaces attention",
  "Input ditambahkan ke hasil sublayer":
    "The input is added to the sublayer output",
  "Keluaran residual adalah x + F(x). Jalur ini mempertahankan kontribusi input dan mendukung aliran gradien saat training; ia tidak menjamin fakta atau mencegah halusinasi.":
    "A residual output is x + F(x). This path retains the input contribution and supports gradient flow during training. It does not guarantee facts or prevent hallucinations.",
  "Lebih beragam, bukan lebih benar": "More diverse, not more correct",
  "Pilih temperature hangat untuk meratakan distribusi tiga kandidat ilustratif.":
    "Select a warm temperature to flatten the distribution of three illustrative candidates.",
  "Dingin · 0.3": "Cold · 0.3",
  "Netral · 1.0": "Neutral · 1.0",
  "Hangat · 1.8": "Warm · 1.8",
  "Distribusi lebih rata, kebenaran tidak dijamin":
    "A flatter distribution; truth is not guaranteed",
  "Semua jawaban pasti lebih akurat": "Every answer becomes more accurate",
  "Temperature mengubah ketajaman distribusi sebelum sampling. Di sini tinggi tabung memakai fixture kualitatif, bukan hasil softmax numerik. Tab Angka di catatan menyediakan perhitungan model mainan.":
    "Temperature changes distribution sharpness before sampling. Tube heights use qualitative fixtures rather than numerical softmax outputs. The Numbers tab in the journal provides toy-model calculations.",
  "Fixture kandidat A/B/C: 90% / 8% / 2%":
    "Candidate fixture A/B/C: 90% / 8% / 2%",
  "Fixture kandidat A/B/C: 60% / 25% / 15%":
    "Candidate fixture A/B/C: 60% / 25% / 15%",
  "Fixture kandidat A/B/C: 40% / 33% / 27%":
    "Candidate fixture A/B/C: 40% / 33% / 27%",
  "Simpan pekerjaan prefix": "Save prefix work",
  "Aktifkan KV cache untuk memakai kembali K/V empat token lama saat satu token baru datang.":
    "Enable KV caching to reuse K/V for four previous tokens when one new token arrives.",
  "Cache nonaktif": "Cache disabled",
  "Cache aktif": "Cache enabled",
  "Query baru tidak lagi dihitung": "The new Query is no longer computed",
  "K/V lama dipakai ulang; Query baru tetap dihitung":
    "Previous K/V are reused; the new Query is still computed",
  "Cache menyimpan K/V per layer untuk prefix urutan ini, bukan bobot atau ingatan lintas pengguna. Query baru tetap berinteraksi dengan seluruh K/V yang diizinkan. Ini hitungan kerja ilustratif, bukan benchmark latensi.":
    "The cache retains K/V per layer for this sequence's prefix rather than weights or shared user memory. The new Query still interacts with every permitted K/V. These are illustrative work counts rather than latency benchmarks.",
  "5 posisi diproyeksikan ulang • 0 pasangan K/V dipakai ulang":
    "5 positions reprojected • 0 K/V pairs reused",
  "1 posisi baru diproyeksikan • 4 pasangan K/V dipakai ulang":
    "1 new position projected • 4 K/V pairs reused",
  "Pilih prediksi terlebih dahulu, lalu jalankan uji.":
    "Choose a prediction first, then run the test.",
  "Belum sesuai tujuan. Teramati: {0}. Ubah {1} dan coba lagi.":
    "The goal is not met yet. Observed: {0}. Change {1} and try again.",
  "Konfigurasi sudah sesuai, tetapi prediksi belum cocok. {0}":
    "The configuration is correct, but the prediction does not match. {0}",
};
