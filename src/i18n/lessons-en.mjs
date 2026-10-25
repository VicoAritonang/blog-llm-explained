export default {
  "teks → N ID token": "text → N token IDs",
  "Kalimat masuk sebagai potongan teks. Tokenizer mengubah setiap potongan menjadi ID vocabulary; satu token tidak selalu satu kata.":
    "The tokenizer maps text pieces to vocabulary IDs. A token is not always a whole word.",
  "Kapsul terpisah menunjukkan batas token. Warnanya mengikuti posisi token sepanjang perjalanan.":
    "Separate capsules show token boundaries. Colors follow token positions through the journey.",
  "Teks UTF-8": "UTF-8 text",
  "ID vocabulary": "Vocabulary IDs",
  "Setiap ID mengambil satu vektor dari tabel embedding. Tambahkan embedding posisi, sehingga token yang sama di posisi berbeda memiliki representasi masukan berbeda.":
    "Each ID retrieves an embedding vector. Adding a position embedding gives the same token different input representations at different positions.",
  "Kolom cahaya adalah fitur vektor. Warna merupakan ilustrasi nilai, bukan sumbu makna yang dapat diberi nama.":
    "Light columns represent vector features. Colors illustrate values rather than named semantic axes.",
  "+ Posisi terlatih": "+ Learned position",
  "96 head × 128 fitur": "96 heads × 128 features",
  "Di dalam setiap blok, LayerNorm menormalkan fitur per token. Tiga proyeksi terlatih menghasilkan Query, Key, dan Value, lalu fitur dibagi menjadi beberapa head. Stasiun Q/K/V, attention, dan residual/MLP membedah bagian dari blok yang sama.":
    "Within each block, LayerNorm normalizes features per token. Three learned projections produce Query, Key, and Value, then split features into heads. These stations examine parts of the same block.",
  "Satu aliran bercabang tiga: Query mencari kecocokan, Key dicocokkan, Value membawa informasi.":
    "One stream branches three ways: Queries look for matches, Keys are matched, and Values carry information.",
  "Split 96 head": "Split into 96 heads",
  "QKᵀ menghasilkan skor pasangan token. Skor dibagi √128, posisi masa depan ditutup, lalu softmax menghasilkan bobot untuk mencampurkan Value.":
    "QKᵀ produces token-pair scores. Scores are divided by √128, future positions are masked, and softmax produces weights to mix Values.",
  "Garis hanya menuju posisi saat ini dan sebelumnya. Ketebalan menunjukkan bobot contoh; head lain dapat memiliki pola berbeda.":
    "Lines point only to current and preceding positions. Thickness illustrates weights; other heads may have different patterns.",
  "Hasil attention ditambahkan ke residual stream. LayerNorm kedua dan MLP dengan GELU mengolah fitur per token, lalu residual kedua ditambahkan. Blok ini diulang 96 kali dengan bobot berbeda.":
    "Attention output is added to the residual stream. A second LayerNorm and an MLP with GELU process features per token, followed by a second residual addition. The block repeats 96 times with different weights.",
  "Jalur luar melewati cabang attention dan MLP: inilah residual. 96 pelat di belakang mewakili kedalaman model, bukan 96 langkah decoding.":
    "The outer paths bypass attention and MLP: these are residual connections. The 96 plates represent model depth rather than decoding steps.",
  "posisi terakhir → logits vocabulary": "last position → vocabulary logits",
  "Setelah blok terakhir, final LayerNorm dan LM head memetakan representasi posisi terakhir ke logits vocabulary. Temperature dan filter mengubah distribusi sebelum satu token dipilih.":
    "After the last block, final LayerNorm and the LM head map the final-position representation to vocabulary logits. Temperature and filters change the distribution before a token is selected.",
  "Batang adalah kandidat token. Pilihan menambah satu token ke konteks; model tidak menghasilkan satu kalimat sekaligus.":
    "Bars represent candidate tokens. Selecting one adds a token to context; the model does not generate a sentence all at once.",
  "Pilih 1 token": "Select 1 token",
  "Prefill memproses prompt. Ketika decode, K dan V token lama disimpan per layer; Query token baru membaca cache itu. Token terpilih ditambahkan ke input dan proses berulang hingga batas atau token akhir.":
    "Prefill processes the prompt. During decoding, previous Keys and Values are retained per layer. The new Query reads the cache. The selected token is appended and the process repeats until a limit or end token.",
  "Rak menyimpan dua aliran: K dan V. Jalur balik membawa token baru ke model. Cache tidak menyimpan seluruh jawaban yang sudah disiapkan.":
    "Racks retain K and V streams. The return path carries the new token into the model. The cache does not store prepared answers.",
  "Simpan K & V": "Retain K & V",
  "Append · ulangi": "Append · repeat",
  "proyeksi 3D dari ruang berdimensi tinggi":
    "projection from a higher-dimensional space",
  "Vektor membantu membayangkan relasi antarrepresentasi. Aritmetika Tokyo − Jepang + Prancis merupakan contoh embedding statis, terpisah dari jalur inferensi Transformer.":
    "Vectors illustrate relationships between representations. Tokyo − Japan + France is a static-embedding example, separate from Transformer inference.",
  "Tiga sumbu hanya proyeksi ilustratif. Model sebenarnya memiliki ribuan fitur, dan representasi berubah mengikuti konteks.":
    "The axes are illustrative projections. Real models have thousands of features; contextual representations change with context.",
  "Embedding statis": "Static embeddings",
  "Operasi vektor": "Vector arithmetic",
  "Teks → token": "Text → tokens",
  "Bagaimana teks menjadi sesuatu yang bisa dihitung?":
    "How does text become something a model can calculate with?",
  "Model melihat ID token. Satu token dapat berupa kata, potongan kata, tanda baca, atau karakter dengan spasi awal.":
    "A model sees token IDs. Tokens can be words, word pieces, punctuation, or characters including a leading space.",
  "Embedding & posisi": "Embedding & position",
  "Token → vektor": "Token → vector",
  "Bagaimana ID token mendapatkan representasi?":
    "How does a token ID acquire a representation?",
  "ID memilih satu baris embedding. Vektor posisi terlatih ditambahkan agar model mengetahui urutan. ID itu sendiri bukan angka makna.":
    "An ID selects an embedding row. Adding a learned position vector encodes order. The ID itself is not a numerical measure of meaning.",
  "Tiga proyeksi": "Three projections",
  "Mengapa satu vektor menjadi tiga?": "Why does one vector become three?",
  "Query mencocokkan pola, Key menawarkan pola untuk dicocokkan, dan Value membawa informasi yang akan dicampurkan. Ketiganya proyeksi terlatih dari representasi yang sama.":
    "Queries match patterns, Keys offer patterns to match, and Values carry information to mix. All three are learned projections of the same representation.",
  "Pilih konteks": "Select context",
  "Token mana yang boleh memengaruhi token ini?":
    "Which tokens may influence this token?",
  "Skor Query–Key dibagi akar dimensi head. Posisi masa depan ditutup, lalu softmax membentuk bobot yang mencampurkan Value.":
    "Query–Key scores are divided by the square root of head dimension. Future positions are masked, then softmax produces weights to mix Values.",
  "Blok Transformer": "Transformer block",
  "Perbarui representasi": "Update the representation",
  "Apa yang terjadi setelah attention?": "What happens after attention?",
  "Setiap blok memiliki attention dan MLP. Dua residual mempertahankan jalur input. LayerNorm bekerja sepanjang dimensi fitur setiap token.":
    "Each block contains attention and an MLP. Two residual connections retain input paths. LayerNorm operates across each token's feature dimension.",
  "Token berikutnya": "Next token",
  "Vektor → probabilitas": "Vector → probabilities",
  "Bagaimana satu token akhirnya dipilih?": "How is a token finally selected?",
  "Representasi posisi terakhir melewati final LayerNorm dan proyeksi vocabulary yang berbagi embedding. Greedy memilih logit terbesar; sampling mengambil satu pilihan dari distribusi.":
    "The final-position representation passes through final LayerNorm and a vocabulary projection tied to the embedding. Greedy selects the largest logit; sampling draws from the distribution.",
  "Gunakan kembali prefix": "Reuse the prefix",
  "Haruskah masa lalu dihitung lagi?": "Must the past be computed again?",
  "K/V lama pada setiap layer dapat dipakai kembali. Hanya token baru yang menghasilkan Query, Key, dan Value baru. Cache adalah aktivasi urutan ini, bukan bobot atau memori lintas pengguna.":
    "Previous Keys and Values can be reused at each layer. Only the new token produces new Query, Key, and Value vectors. The cache contains this sequence's activations rather than weights or shared user memory.",
  "Analogi vektor": "Vector analogies",
  "Annex eksplorasi": "Exploration annex",
  "Bisakah hubungan kata menjadi hubungan geometris?":
    "Can word relationships become geometric relationships?",
  "Aritmetika vektor dapat memperlihatkan relasi pada word embeddings statis. Contoh lokal ini bukan mekanisme literal GPT menjawab dan bukan hubungan universal.":
    "Vector arithmetic illustrates relationships in static word embeddings. This example is not the literal mechanism by which GPT answers, and the relationship is not universal.",
  "Perjalanan satu token": "One token's journey",
  "Dari teks hingga token berikutnya": "From text to the next token",
  "TUR UTAMA": "MAIN TOUR",
  "8–12 menit": "8–12 minutes",
  "Mikroskop subword": "Subword microscope",
  "Kata, spasi, dan bahasa": "Words, spaces, and language",
  "3 menit": "3 minutes",
  "Telusuri attention": "Trace attention",
  "Bongkar satu dot product": "Inspect one dot product",
  "4 menit": "4 minutes",
  "Bisakah it melihat masa depan?": "Can it see the future?",
  "Ubah suffix, periksa prefix": "Change the suffix, inspect the prefix",
  "Aritmetika vektor": "Vector arithmetic",
  "Tokyo − Jepang + Prancis": "Tokyo − Japan + France",
  "Logits sama, pilihan berbeda": "Same logits, different choices",
  "Gunakan kembali masa lalu": "Reuse the past",
  "Prefill, decode, dan KV cache": "Prefill, decoding, and KV cache",
  "Teks masukan": "Input text",
  "Teks adalah titik awal. Profil ini memakai vocabulary mainan, bukan tokenizer GPT-2.":
    "Text is the starting point. This profile uses a toy vocabulary rather than the GPT-2 tokenizer.",
  "Pisahkan token": "Split tokens",
  "Spasi awal termasuk isi token. Preset menyimpan potongan dan offsets yang dapat direkonstruksi.":
    "Leading spaces belong to tokens. Presets retain pieces and offsets that reconstruct the input.",
  "Posisi 0, 1, 2, … berbeda dari ID vocabulary. ID tidak menunjukkan besar atau kecilnya makna.":
    "Positions 0, 1, 2, … differ from vocabulary IDs. An ID does not measure the strength of meaning.",
  "Lookup posisi": "Position lookup",
  "Satu ID memilih satu baris dari matriks embedding terlatih; fixture ini memiliki 16 baris.":
    "An ID selects a learned embedding row; this fixture has 16 rows.",
  "GPT-2 memakai learned position embeddings. Angka posisi di sini juga lookup, bukan sinusoidal.":
    "GPT-2 uses learned position embeddings. Positions here also use lookups rather than sinusoidal encoding.",
  "Tambahkan posisi": "Add position",
  "Penjumlahan dilakukan elemen demi elemen. Menukar urutan mempertahankan embedding token, tetapi mengganti kontribusi posisinya.":
    "Addition is elementwise. Swapping order preserves token embeddings but changes position contributions.",
  "Hitung mean dan variance delapan fitur setiap token. Demo memakai gamma=1 dan beta=0.":
    "Compute the mean and variance across each token's eight features. The demo uses gamma=1 and beta=0.",
  "Proyeksi Query": "Query projection",
  "Klik angka hasil untuk menelusuri delapan pasangan perkalian antara baris input dan kolom bobot.":
    "Click an output to inspect eight multiplication pairs between an input row and a weight column.",
  "Proyeksi Key": "Key projection",
  "Key membentuk pola yang dicocokkan oleh Query. Bobot model tetap; aktivasi bergantung pada input.":
    "Keys form patterns matched by Queries. Weights stay fixed; activations depend on input.",
  "Proyeksi Value": "Value projection",
  "Value adalah informasi yang dicampurkan setelah bobot attention tersedia.":
    "Values carry the information mixed once attention weights are available.",
  "Pisahkan dua head": "Split two heads",
  "Lebar 8 dibagi menjadi 2 head × 4 fitur. Mengganti head juga mengganti K, V, skor, dan hasilnya.":
    "Width 8 is split into 2 heads × 4 features. Changing heads changes Keys, Values, scores, and outputs.",
  "Kalikan Q × K": "Multiply Q × K",
  "Setiap sel membandingkan satu baris Query dan satu baris Key. Klik sel untuk melihat semua perkalian.":
    "Each cell compares one Query row with one Key row. Click to inspect all multiplications.",
  "Jumlahkan dot product": "Sum the dot product",
  "Empat hasil perkalian dijumlahkan menjadi satu skor. Skor belum merupakan probabilitas.":
    "Four products are summed into one score. Scores are not yet probabilities.",
  "Pembagian oleh √d_head menjaga skala skor. Dalam demonstrasi ini √4 = 2.":
    "Dividing by √d_head controls score scale. Here, √4 = 2.",
  "Posisi masa depan belum tersedia. −∞ menjadi bobot nol tepat sesudah softmax.":
    "Future positions are unavailable. A score of −∞ becomes exactly zero weight after softmax.",
  "Softmax per baris": "Row-wise softmax",
  "Normalisasi dilakukan sepanjang kolom Key, bukan seluruh matriks. Jumlah setiap baris adalah 1.":
    "Normalize across Key columns rather than the entire matrix. Every row sums to 1.",
  "Campurkan Value": "Mix Values",
  "Bobot attention dan kontribusi Value adalah dua hal berbeda. Klik output untuk melihat weighted sum.":
    "Attention weights and Value contributions are different. Click an output to inspect its weighted sum.",
  "Gabungkan head": "Concatenate heads",
  "Dua output dengan lebar 4 digabung kembali menjadi lebar 8.":
    "Two width-4 outputs are concatenated back to width 8.",
  "Proyeksi output": "Output projection",
  "Proyeksi output terlatih mencampurkan fitur antarhead sebelum residual add.":
    "A learned output projection mixes features across heads before residual addition.",
  "Residual menambahkan representasi awal ke keluaran attention. Input tidak dibuang.":
    "The residual adds the initial representation to the attention output, retaining the input.",
  "LayerNorm kedua bekerja pada keluaran residual, per token sepanjang fitur.":
    "The second LayerNorm operates on residual output across features per token.",
  "Perluas 8 → 32": "Expand 8 → 32",
  "MLP memperluas dimensi fitur empat kali. Operasinya tetap dilakukan terpisah di setiap token.":
    "The MLP expands the feature dimension fourfold, independently per token.",
  "Aktivasi GELU": "GELU activation",
  "GELU adalah kurva halus; nilai negatif tidak seluruhnya diubah menjadi nol.":
    "GELU is a smooth curve; negative values are not all set to zero.",
  "Kembali 32 → 8": "Project 32 → 8",
  "Proyeksi kedua mengembalikan dimensi agar penjumlahan residual memiliki shape yang sama.":
    "The second projection restores the dimension for matching residual shapes.",
  "Setiap blok memiliki dua residual dan kedua sublayer. Skala referensi GPT-3: 96 blok; hitungan fixture: 2 blok.":
    "Every block has two residuals and both sublayers. GPT-3 reference: 96 blocks; fixture: 2 blocks.",
  "Normalisasi final mengikuti dua blok demo. Hanya posisi terakhir yang dipakai untuk token berikutnya.":
    "Final normalization follows the two demo blocks. Only the final position is used for the next token.",
  "Proyeksi vocabulary": "Vocabulary projection",
  "Bobot output berbagi matriks embedding. Logits adalah skor mentah 16 token, bukan persentase.":
    "Output weights share the embedding matrix. Logits are raw scores for 16 tokens rather than percentages.",
  "Distribusi probabilitas": "Probability distribution",
  "Temperature positif mengubah bentuk distribusi. Temperature 0 memakai argmax tanpa membagi nol.":
    "Positive temperature changes distribution shape. Temperature 0 uses argmax without dividing by zero.",
  "Pilih satu token": "Select one token",
  "Greedy deterministik; sampling dapat memilih hasil berbeda. Probabilitas tinggi tidak menjamin fakta benar.":
    "Greedy decoding is deterministic; sampling may choose different outputs. High probability does not guarantee factual correctness.",
  "Simpan prefix K/V": "Store prefix K/V",
  "Prefill menghitung prompt dengan causal mask, lalu menyimpan aktivasi K/V pada setiap layer.":
    "Prefill processes the prompt with a causal mask and stores K/V activations per layer.",
  "Decode token baru": "Decode a new token",
  "Query baru melihat seluruh Key yang tersedia. K/V prefix tidak diproyeksikan ulang.":
    "The new Query sees all available Keys. Prefix K/V are not projected again.",
  "Ulangi autoregresi": "Repeat autoregression",
  "Token baru menjadi bagian input berikutnya. Edit prefix membatalkan cache yang bergantung padanya.":
    "The new token joins the next input. Prefix edits invalidate the dependent cache.",
  "Vektor sumber": "Source vectors",
  "Ini word vectors mainan statis empat dimensi, terpisah dari pipeline Transformer.":
    "These are four-dimensional static toy word vectors, separate from Transformer inference.",
  "Penjumlahan dan pengurangan berlangsung pada vektor sumber. Lab menampilkan proyeksi dua dimensi; ranking memakai empat dimensi sumber.":
    "Arithmetic operates on source vectors. The lab displays a two-dimensional projection.",
  "Hasil mendekati target contoh terpilih pada fixture ini. Tidak identik tepat dan tidak berlaku universal.":
    "The result approaches the selected target in this fixture. It is not identical or universal.",
  "Dalam Z = A V, vektor apa yang dicampurkan?":
    "In Z = A V, which vectors are mixed?",
  "Key: karena cocok dengan Query": "Keys: because they match Queries",
  "Value: dengan bobot attention": "Values: using attention weights",
  "ID token: dijumlahkan langsung": "Token IDs: added directly",
  "Query dan Key menentukan bobot. Value membawa informasi yang dijumlahkan dengan bobot tersebut.":
    "Queries and Keys determine weights. Values carry the information summed with those weights.",
  "Suffix setelah it berubah. Apa yang terjadi pada representasi it?":
    "The suffix after it changes. What happens to its representation?",
  "Tetap sama karena prefix identik":
    "Unchanged because the prefix is identical",
  "Berubah karena semua token saling melihat":
    "Changed because all tokens see each other",
  "Cache mengubahnya secara acak": "The cache changes it randomly",
  "Causal mask menutup masa depan. Dalam decoder, posisi it hanya dipengaruhi prefix sampai posisi itu.":
    "Causal masking blocks the future. The position of it is influenced only by the prefix up to that position.",
  "Apa yang disimpan KV cache?": "What does the KV cache store?",
  "Bobot model dari training": "Model weights from training",
  "Ingatan semua pengguna": "Every user's memories",
  "Aktivasi Key dan Value prefix per layer":
    "Prefix Key and Value activations per layer",
  "Cache menyimpan aktivasi urutan yang sedang diproses. Bobot tetap, dan edit prefix membatalkan cache.":
    "The cache retains current-sequence activations. Weights stay fixed; prefix edits invalidate the cache.",
  "Unit vocabulary; tidak selalu satu kata.":
    "A vocabulary unit, not always a whole word.",
  "Array angka multidimensi. Shape menyatakan panjang tiap sumbu.":
    "A multidimensional numeric array. Shape specifies the length of each axis.",
  "Parameter terlatih yang tetap selama inference. Demo memakai bobot mainan.":
    "Learned parameters fixed during inference. The demo uses toy weights.",
  Aktivasi: "Activations",
  "Angka hasil perhitungan yang bergantung pada input.":
    "Calculated values that depend on input.",
  "Skor vocabulary sebelum softmax.": "Vocabulary scores before softmax.",
  Autoregresi: "Autoregression",
  "Token keluaran ditambahkan ke input, lalu proses diulang.":
    "The output token is appended to input and the process repeats.",
  "Satu proyeksi attention; bukan peran semantik universal.":
    "An attention projection rather than a universal semantic role.",
  "Penjumlahan input dengan output sublayer.":
    "Addition of input and sublayer output.",
  "GPT-2 · implementasi referensi": "GPT-2 · reference implementation",
  "Pre-norm, learned position, GELU, residual, dan tied embedding.":
    "Pre-norm, learned positions, GELU, residuals, and tied embeddings.",
  "Dasar scaled dot-product dan multi-head attention.":
    "Foundations of scaled dot-product and multi-head attention.",
  "Latar word embeddings statis dan hubungan geometris.":
    "Background on static word embeddings and geometry.",
  "Perbedaan prefill, decode, dan pemakaian ulang K/V.":
    "Prefill, decoding, and K/V reuse.",
  "Skala 175B: 96 blok, lebar 12.288, 96 head, konteks 2.048; attention dense dan locally banded sparse bergantian.":
    "175B scale: 96 blocks, width 12,288, 96 heads, context 2,048; alternating dense and locally banded sparse attention.",
};
