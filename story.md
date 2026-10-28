# NeuroLab — Di Balik Satu Jawaban

> **Sebuah investigasi interaktif: bagaimana angka yang dipelajari dari teks dapat menghasilkan jawaban, satu token demi satu token.**

Dokumen rancangan cerita, kurikulum, misi, dan visualisasi. Ditulis 27 Oktober 2026 berdasarkan peninjauan repository. Ini adalah spesifikasi pengalaman yang diusulkan, bukan deskripsi fitur yang sudah selesai dibuat.

Bahasa utama: Indonesia. Kedalaman: semi teknis. Pengunjung tidak perlu memahami kalkulus, tetapi bersedia membandingkan angka, mengikuti diagram, dan mencoba eksperimen.

**Panduan membaca:** mulai dari [keputusan utama](#1-keputusan-utama), [audit](#2-audit-pengalaman-yang-ada), dan [cerita induk](#3-cerita-induk-kasus-kunci-cadangan). Untuk merancang pengalaman, baca [peta pos](#5-peta-belajar-ruang-dan-durasi), [alat](#6-perangkat-penyelidik), [tata visual](#7-tata-bahasa-visual-3d), dan [skenario setiap pos](#9-skenario-lengkap-per-pos). Untuk produksi, mulai dari [kontrak data](#4-kontrak-kejujuran-simulasi), [berkas kasus](#10-berkas-kasus-yang-konsisten-dari-awal-sampai-akhir), [pemetaan proyek](#15-pemetaan-dari-proyek-yang-sekarang), serta [kriteria penerimaan](#17-uji-ketajaman-cerita-sebelum-dianggap-selesai).

## 1. Keputusan utama

Lab perlu mempunyai satu pertanyaan yang membuat orang ingin terus berjalan:

> **“Bagaimana mesin bisa menjawab pertanyaan tentang sesuatu yang baru saja saya ceritakan, padahal ia hanya menghasilkan token berikutnya?”**

Pengunjung berperan sebagai penyelidik. Mereka mengikuti satu kasus, membuat dugaan, membuka mesin, dan mengumpulkan bukti. Tujuan akhirnya bukan menghafal nama Q/K/V, melainkan mampu menjelaskan hubungan antara konteks, perhitungan, kemampuan yang dipelajari, dan jawaban yang terlihat di layar.

Keputusan editorial untuk versi berikutnya:

1. Mulai dari fenomena yang ingin dijelaskan: sebuah jawaban berubah ketika satu informasi dalam konteks diubah.
2. Bawa kasus yang sama melalui tokenisasi, representasi, attention, blok, distribusi, dan generation. Contoh kecil lain hanya dipakai untuk membongkar operasi tertentu.
3. Setiap pos mempunyai satu pertanyaan, satu aksi yang bermakna, dan satu bukti yang dibawa ke pos berikutnya.
4. Tampilkan alur besar sebelum membuka detail. Q/K/V, attention, residual, dan MLP harus terlihat sebagai bagian di dalam blok Transformer yang berulang.
5. Jadikan training bagian inti cerita. Inference menjelaskan cara mesin menghitung; training menjelaskan dari mana kemampuan dan parameter perhitungannya berasal.
6. Akhiri dengan batas pengetahuan dan bukti. Kelancaran bahasa, probabilitas token, dan kebenaran klaim adalah hal yang berbeda.
7. Pertahankan eksplorasi 3D, tetapi sediakan tur terpandu sebagai pintu masuk. Kemampuan mengendalikan kamera tidak menjadi prasyarat belajar.
8. Ganti penghargaan karena menekan sakelar yang tepat menjadi penghargaan karena membuat prediksi, mengamati perubahan, dan menjelaskan hasil.
9. Semua angka dalam satu percobaan harus berasal dari satu sumber perhitungan atau satu rekaman perhitungan yang konsisten.
10. Gunakan model decoder kecil dengan profil yang dinyatakan jelas. Perbandingan dengan model besar menjadi materi lanjutan, bukan label dominan di setiap mesin.

**Kalimat yang ingin kita dengar dari pengunjung setelah selesai:**

> “Teks menjadi token lalu vektor. Setiap posisi mengambil informasi dari konteks yang boleh diakses dan memperbarui representasinya melalui beberapa blok. Representasi terakhir menghasilkan skor untuk token berikutnya. Token terpilih masuk lagi ke konteks. Cara menghitungnya memakai bobot yang dipelajari saat training, sedangkan percakapan ini mengubah konteks dan aktivasi. Karena yang diprediksi adalah kelanjutan token, jawaban yang lancar tetap perlu diperiksa.”

## 2. Audit pengalaman yang ada

### 2.1 Dasar peninjauan dan batasnya

Peninjauan mencakup `README.md`, konten dalam `src/content/`, mesin dalam `src/simulation/engine.mjs`, misi dalam `src/simulation/playground.mjs`, navigasi `src/store/experience.ts`, panel misi, petunjuk, instrumen utama, dan exhibit sandbox. Dokumen lama dalam `docs/` serta screenshot tersimpan dipakai sebagai konteks historis.

Pemeriksaan browser lokal pada source aktif terhalang error resolusi CSS font `@fontsource-variable/source-sans-3/wght.css`. Build `dist/` yang tersedia masih memuat materi GPT-2 dari versi terdahulu. Karena itu, diagnosis berikut adalah audit konten, struktur interaksi, dan pemetaan visual dari source; bukan klaim sudah melakukan usability test lengkap pada versi aktif. Tidak ada perbaikan aplikasi dalam pekerjaan ini.

### 2.2 Yang sudah layak dipertahankan

- Ada mesin numerik deterministik yang dapat diperiksa, bukan hanya animasi.
- Pembedaan token ID dan posisi, mask kausal, weighted sum Value, residual, serta cache sudah ditulis cukup hati-hati.
- Mode Makna / Angka / Kode mendukung kedalaman bertahap.
- Pemindai, pelacak token, pergantian head, jeda, dan kalibrator sudah memberi dasar interaksi.
- Eksperimen suffix berubah tetapi prefix tetap merupakan contoh kausalitas yang sangat kuat.
- Fallback 2D, reduced motion, perpindahan langsung, dan dukungan bahasa merupakan fondasi akses yang baik.
- Annex analogi sudah diberi batas bahwa ia bukan mekanisme literal model menjawab.

Masalahnya bukan kekurangan istilah teknis. Yang kurang adalah alasan bagi pengunjung untuk membutuhkan istilah-istilah itu, hubungan antarbukti, dan hasil belajar yang dapat ditunjukkan lewat tindakan.

### 2.3 Masalah yang perlu diubah

| Temuan dari repository | Dampak pedagogis yang diperkirakan | Keputusan cerita |
|---|---|---|
| Urutan utama mengikuti daftar tokenizer → embedding → QKV → attention → Transformer | Pengunjung mengenal komponen sebelum memahami masalah yang diselesaikannya | Buka dengan pertanyaan dan perubahan jawaban; komponen muncul saat diperlukan |
| Kasus utama `The cat sat on the`, sementara misi memakai contoh lain | Hubungan antara eksperimen dan jawaban akhir mudah terputus | Satu berkas kasus Indonesia yang terus terlihat |
| `makeWeights()` menghasilkan bobot deterministik yang tidak dilatih untuk bahasa | Output tidak dapat dijadikan bukti pemahaman semantik | Pisahkan status mesin lama dari kebutuhan rekaman/model terlatih untuk cerita baru |
| `candidateFixtures` berisi persentase sampling yang ditulis terpisah | Pengunjung tidak bisa menelusuri tabung probabilitas ke logits yang sama | Hitung distribusi dari logits aktif; hindari persentase yang sekadar diganti |
| `evaluateTrial()` mencocokkan setting target dan pilihan jawaban | Sukses dapat diraih lewat mengenali instruksi atau mencoba pilihan | Nilai prediksi, bukti teramati, dan transfer ke contoh baru |
| Panel menampilkan hasil fixture sebelum bagian “Prediksi” | Jawaban prediksi bisa terbaca sebelum percobaan | Simpan prediksi sebelum menjalankan kondisi pembanding |
| Kalibrator mengganti instrumen dengan sandbox yang memakai fixture tersendiri | Terasa seperti dua mesin yang tidak saling menjelaskan | Misi mengendalikan objek dan data yang sama dengan inspector |
| Label 96 head / lebar 12.288 hadir dekat matriks mainan dua head | Skala referensi mudah tertukar dengan angka yang sedang dihitung | Profil aktif menjadi label utama; skala besar di annex |
| QKV dan attention tampil sebagai area sebelum “Transformer” | Bisa terbaca seolah QKV/attention dilakukan sekali di luar tumpukan blok | Tampilkan bingkai blok induk yang selalu menaungi seluruh suboperasi |
| Tur pada `experience.next()` mengulang bagian Transformer ketika pindah ke blok kedua | Pengunjung bisa mengira blok kedua hanya mengulang residual/MLP, walau mesin menghitung blok penuh | Saat naik layer, overview mengulang siklus blok lengkap, termasuk attention |
| Tower, aliran cahaya, dan lattice MLP sebagian berfungsi sebagai skema | Gerakan dapat terasa seperti bukti numerik walau tidak memetakan operasi tertentu | Bedakan gerakan orientasi, urutan operasi, dan data dengan legenda eksplisit |
| Progres pemindaian dan koleksi melengkapi dunia | Bisa menggeser fokus ke kunjungan lokasi | Progres utama berupa bukti konsep; koleksi dekoratif menjadi opsional |
| Training, pembentukan asisten, dan hubungan dengan sumber eksternal belum menjadi jalur inti | Jawaban “dari mana kecerdasannya?” masih kosong | Tambahkan bab training, post-training, dan bukti eksternal |

Ini merupakan hipotesis desain berdasarkan inspeksi, bukan hasil pengukuran terhadap pengunjung nyata.

## 3. Cerita induk: kasus kunci cadangan

### 3.1 Kasus yang dibawa dari awal

Di meja masuk terdapat catatan singkat:

```text
Catatan: kunci cadangan ada di laci biru.
Pertanyaan: Di mana kunci cadangan?
Jawaban:
```

Sistem menampilkan proses menghasilkan jawaban. Pada satu titik, layar berhenti:

```text
Jawaban: di laci ▌
```

Pengunjung diberi dua salinan kasus. Pada salinan B, kata `biru` di catatan diganti menjadi `hijau`. Pertanyaan tetap sama.

Pertanyaan pembuka:

> “Jika kita hanya mengganti warna laci, bagian mana di dalam mesin yang harus berubah agar jawaban ikut menyesuaikan?”

Pilihan dugaan awal yang masuk akal:

- Mesin mencari jawaban lengkap dalam sebuah daftar.
- Bobot mesin langsung ditulis ulang ketika kita mengubah catatan.
- Informasi baru mengubah perhitungan menggunakan bobot yang sama.

Tidak perlu langsung memberi skor. Simpan dugaan sebagai sesuatu yang akan ditinjau kembali pada akhir perjalanan.

### 3.2 Mengapa kasus ini dipilih

- Konteksnya konkret dan tidak membutuhkan pengetahuan dunia.
- Pengunjung bisa menentukan jawaban yang sesuai catatan tanpa harus percaya kepada model.
- Mengganti satu warna menghasilkan percobaan pembanding yang mudah dipahami.
- Ada token berulang, misalnya ` kunci`, ` cadangan`, ` di`, dan ` laci`, untuk membedakan identitas token dari posisi dan representasinya.
- Jawabannya cukup pendek untuk menyaksikan beberapa langkah generation hingga selesai.
- Kasus bisa diperluas menjadi dua benda, catatan bertentangan, atau informasi yang hilang.
- Klaim “sesuai catatan” dapat dibedakan dari klaim “benar di dunia nyata”. Model tidak melihat laci sesungguhnya.

### 3.3 Posisi pengunjung dan suara narator

Pengunjung adalah penyelidik yang memperoleh akses ke mesin transparan. Tidak ada karakter profesor yang terus menjelaskan istilah, alarm palsu, atau ancaman lab akan meledak.

Narator bertugas mengarahkan perhatian:

> “Simpan dugaanmu. Kita akan mengikuti perubahan yang benar-benar dapat diukur.”

> “Dua kartu ini memiliki ID yang sama. Mengapa hasil akhirnya bisa berbeda?”

> “Garis paling tebal belum cukup untuk menjelaskan jawaban. Mari lihat angka yang dibawanya.”

> “Kamu sudah melihat mesin bekerja. Sekarang kita perlu menjelaskan siapa yang menentukan angka-angka di dalamnya.”

Rasa ingin tahu datang dari kontradiksi yang terpecahkan. Puncak cerita adalah ketika pengunjung bisa memperkirakan akibat perubahan yang belum pernah dicontohkan.

### 3.4 Empat babak

| Babak | Pertanyaan penggerak | Perubahan pemahaman |
|---|---|---|
| I — Pesan masuk | Apa yang sebenarnya masuk ke model? | Dari kalimat utuh menjadi urutan token dan vektor |
| II — Konteks bekerja | Bagaimana catatan memengaruhi token jawaban? | Dari vektor terpisah menjadi representasi kontekstual melalui blok |
| III — Jawaban terbentuk | Bagaimana satu hitungan menjadi kalimat, dan dari mana kemampuan menghitungnya? | Distribusi, loop, cache, lalu pembelajaran bobot |
| IV — Jawaban diperiksa | Mengapa bisa membantu, mengikuti instruksi, dan tetap salah? | Pisahkan model, aplikasi, konteks, dan bukti eksternal |

## 4. Kontrak kejujuran simulasi

Bagian ini menentukan apakah cerita benar-benar menjelaskan mekanisme atau hanya membuat pertunjukan yang meyakinkan.

### 4.1 Tiga jenis materi yang harus terlihat berbeda

| Jenis | Label di layar | Boleh digunakan untuk |
|---|---|---|
| Perhitungan model aktif atau rekaman hasil model | **Hasil model mini** / **Rekaman perhitungan** | Menelusuri token, matriks, attention, logits, dan output yang saling konsisten |
| Contoh operasi dengan angka yang dipilih untuk mudah dihitung | **Contoh hitung terpisah** | Memahami dot product, softmax, residual, loss |
| Metafora dan skema | **Skema operasi** / **Proyeksi visual** | Menjelaskan bentuk hubungan, nesting, arah, dan orientasi |

Label pendek muncul dekat visual. Detail asal data tersedia satu klik. Jangan mengubur perbedaan ini hanya dalam footer atau README.

Contoh hitung kecil tidak boleh diam-diam mengganti tensor kasus utama. Saat contoh dibuka, kasus utama dijeda, breadcrumb berubah, dan tombol **“Kembali ke kasus kunci”** mengembalikan state semula.

### 4.2 Sumber kebenaran untuk cerita utama

Target versi cerita ini adalah satu decoder mini yang telah dilatih pada tugas bahasa sintetis terbatas, atau rekaman tensor dari decoder tersebut. Semua tampilan satu kasus mengacu kepada hasil yang sama. Model mini itu bukan model percakapan umum dan bukan replika kemampuan LLM besar.

**Keputusan penyajian:** tur terpandu dapat memakai rekaman perhitungan yang diekspor terlebih dahulu. Ini menjaga angka bisa diaudit dan tidak mengharuskan training atau pemuatan model besar di browser. Percobaan hanya menawarkan varian yang memiliki rekaman valid. Jika inference lokal ditambahkan, jalurnya harus menghasilkan struktur data yang sama.

Implikasinya:

- Jangan menampilkan input bebas jika mesin hanya mendukung beberapa kasus.
- Penggantian warna harus memuat atau menghitung keseluruhan trace varian yang benar; tidak cukup mengganti teks jawaban.
- Matriks, garis, tabung probabilitas, catatan, dan feedback misi harus memakai `case + model + step + layer + head + position` yang sama.
- Persentase pada cerita utama baru ditulis setelah checkpoint dan tokenizer benar-benar dipilih serta hasilnya diukur.
- Jika model menghasilkan jawaban salah, tampilkan hasil itu. Jangan menambahkan aturan tersembunyi untuk membuat cerita “berhasil”.

Mesin saat ini, dengan bobot acak deterministik, tetap berguna sebagai meja pemeriksaan matematika. Ia belum memenuhi syarat menjadi bukti bahwa model bisa menggunakan catatan berbahasa Indonesia.

### 4.3 Profil arsitektur yang diusulkan

Gunakan satu profil pedagogis pre-norm, decoder-only, causal dense self-attention, MLP dengan GELU, learned absolute position, dan final normalization. Tied embedding boleh dipakai, tetapi harus dinyatakan sebagai pilihan profil, bukan sifat semua LLM.

Titik awal untuk eksperimen pengembangan: dua blok, dua head, lebar 16, lebar MLP 64, kapasitas konteks sekurangnya 64 token, dan vocabulary kecil yang mencakup seluruh kasus. Ini usulan ukuran, **bukan klaim bahwa ukuran tersebut sudah dilatih atau pasti memadai**. Bila kemampuan yang dibutuhkan belum tercapai, ukuran atau dataset harus disesuaikan; jangan mengarang interpretasi aktivasi.

Inspector mengambil shape dari model yang benar-benar dipakai. Contoh hitung dua atau tiga dimensi di dokumen ini bukan potongan yang diklaim berasal dari profil tersebut.

Pemilihan pre-norm dan learned position membuat hubungan dengan mesin sekarang mudah ditelusuri. Implementasi publik [GPT-2](https://github.com/openai/gpt-2/blob/master/src/model.py) dapat menjadi referensi untuk susunan operasi; nama GPT-2 bukan merek kemampuan model mini.

### 4.4 Syarat kasus utama layak dipakai

Sebelum produksi konten numerik, sebuah checkpoint harus diperiksa pada pasangan warna, pasangan lokasi, dan kombinasi benda–lokasi yang tidak identik dengan contoh training. Catat hasil yang benar dan salah, serta split data yang digunakan.

Kasus pembuka boleh dipilih karena mudah dijelaskan, tetapi harus dilabeli contoh terpilih, bukan angka akurasi umum. Jika dua head tidak menunjukkan peran semantik yang rapi, gunakan pola yang sesungguhnya dan jelaskan bahwa setiap head tidak memiliki jabatan manusia yang pasti.

Setiap trace menyimpan minimal:

- Identitas dan versi model, tokenizer, serta checkpoint.
- Teks, potongan, ID, posisi, dan batas prompt/keluaran.
- Representasi per layer, Q/K/V, skor sebelum mask, bobot sesudah softmax, output attention, residual, dan MLP.
- Logits penuh, transformasi sampling, seed bila digunakan, token yang dipilih, dan alasan berhenti.
- Perbandingan cache versus hitung ulang jika dipakai dalam misi.
- Penanda apakah data direkam atau dihitung langsung.

### 4.5 Klaim yang sengaja tidak dibuat

Lab menjelaskan mekanisme komputasi, bukan membuktikan bahwa kita sudah mengetahui seluruh representasi internal, penalaran, atau penyebab setiap jawaban LLM besar. Attention menunjukkan bagaimana Value dicampur pada head tertentu. Interpretasi semantik dan klaim kausal tentang output memerlukan pemeriksaan tambahan.

## 5. Peta belajar, ruang, dan durasi

### 5.1 Daftar pos

Nomor berikut adalah urutan belajar. Tidak semuanya harus menjadi ruangan fisik terpisah. Pos 04–07 adalah beberapa cara melihat **blok Transformer yang sama**.

| Pos | Judul yang dibaca pengunjung | Inti | Bukti yang dibawa pulang |
|---|---|---|---|
| 00 | Satu kata berubah, jawaban ikut berubah | Hook dan dugaan awal | Pertanyaan investigasi |
| 01 | Mesin tidak menerima kalimat utuh | Tokenisasi | Teks dapat direkonstruksi dari token |
| 02 | Nomor menjadi daftar angka | Lookup embedding | ID bukan nilai makna |
| 03 | Token yang sama, tempat yang berbeda | Posisi | Embedding dasar sama; representasi masukan dapat berbeda |
| 04 | Bagaimana informasi bisa bertemu? | Q/K/V | Pencocokan dan informasi yang dibawa punya peran berbeda |
| 05 | Jangan membaca jawaban dari masa depan | Causal mask | Suffix tidak dapat mengubah prefix yang identik |
| 06 | Cocok belum berarti selesai | Softmax dan weighted sum | Attention menghasilkan vektor campuran |
| 07 | Satu blok memperbarui, blok berikutnya melanjutkan | MLP, normalization, residual, kedalaman | Seluruh blok berulang; satu layer bukan satu token |
| 08 | Dari representasi ke satu pilihan | Logits dan decoding policy | Probabilitas berbeda dari fakta dan dari token terpilih |
| 09 | Satu pilihan menjadi konteks baru | Autoregresi dan KV cache | Loop menghasilkan jawaban; cache menghemat pekerjaan |
| 10 | Siapa yang mengatur angka di mesin? | Training | Loss mengarahkan pembaruan bobot |
| 11 | Mengapa mesin bisa menjadi asisten? | Post-training dan format percakapan | Kemampuan melanjutkan teks dan perilaku asisten terkait tetapi berbeda |
| 12 | Jawaban lancar, bukti belum tentu ada | Grounding, konteks, tools | Sumber eksternal harus masuk ke alur untuk dipakai |
| 13 | Buktikan pemahamanmu | Kasus transfer | Penjelasan utuh dengan bukti |

### 5.2 Denah konseptual

```text
MEJA KASUS [00]
       |
PESAN MASUK [01—03]
       |
┌──────── BLOK TRANSFORMER [04—07] ────────┐
│ norma → QKV → mask → campur V → tambah  │
│ norma → MLP → tambah                    │
└────────────────────────────────────────┘
       | ulangi dengan bobot layer berikutnya
PILIHAN [08] ──→ TAMBAH TOKEN [09]
       ^               |
       └── putaran model berikutnya ──────┘
                       |
                 MEJA JAWABAN
                       |
       ASAL KEMAMPUAN [10] → ASISTEN [11]
                       |
                  BUKTI [12]
                       |
                  KASUS BARU [13]
```

Loop fisik harus terlihat. Jalur training merupakan kilas balik tentang asal parameter, bukan operasi yang dijalankan setiap kali pengguna mengirim pesan. Rak cache menempel di dalam area layer, bukan menjadi pusat “ingatan” yang terpisah dari perhitungan.

### 5.3 Tiga kedalaman tanpa tiga kurikulum terpisah

| Rute | Durasi rancangan, perlu diuji | Cara menyajikan |
|---|---|---|
| Tur kilat | 10–15 menit | Semua babak hadir; operasi matematis dipadatkan, tiga eksperimen inti, training ringkas, satu kasus akhir |
| Investigasi utama | 35–50 menit | Seluruh pos, percobaan pembanding, satu derivasi attention, satu pembaruan training |
| Bedah mesin | 60–90+ menit | Seluruh detail shape, rumus, pseudocode, ablation, dan annex |

Dokumen boleh besar. Layar pada suatu saat harus tetap kecil: satu pertanyaan, satu aksi utama, satu hasil yang sedang dibandingkan.

Tur kilat tetap menjelaskan training dan batas kebenaran. Menghapus keduanya akan membuat rute pendek memberi gambaran yang timpang tentang cara kerja LLM.

## 6. Perangkat penyelidik

Alat adalah cara berpikir. Setiap alat harus membantu menjawab pertanyaan tertentu, bukan sekadar mengganti efek tangan atau membuka menu.

| Alat | Pertanyaan yang dijawab | Interaksi utama | Evolusi dari proyek |
|---|---|---|---|
| **Pemindai angka** | “Apa objek ini dan dari mana nilainya?” | Klik token, sel, bobot, atau batang; lihat input → operasi → output | Pertajam Pemindai |
| **Penanda posisi** | “Saya sedang mengikuti posisi yang mana?” | Pin satu posisi; identitas, layer, dan representasinya tetap terlacak | Pertajam Pelacak token |
| **Lensa konteks** | “Siapa boleh memengaruhi posisi ini dan bagaimana?” | Pilih query/head; bedakan mask, skor, bobot, dan kontribusi Value | Perluas Lensa head |
| **Pengendali langkah** | “Apa yang terjadi sebelum dan sesudah operasi ini?” | Jeda, satu operasi, satu blok, satu token keluaran | Pertajam Pengendali waktu |
| **Pembanding A/B** | “Apa akibat satu perubahan?” | Bekukan A, ubah satu variabel B, catat prediksi, jalankan, lihat selisih | Ubah fungsi utama Kalibrator |

**Buku bukti** menyimpan hasil percobaan, bukan inventaris barang. Setiap kartu memuat dugaan awal, variabel yang diubah, kondisi yang dipertahankan, hasil, dan kesimpulan satu kalimat.

Tombol kontekstual seperti **“Bandingkan warna”** boleh otomatis memilih alat yang sesuai. Hotbar tetap tersedia untuk eksplorasi, tetapi pengunjung tidak perlu menghafal lima tombol sebelum mendapat pengalaman pertama yang bermakna.

Interaksi baru diperkenalkan ketika dibutuhkan:

1. Pembuka: bandingkan dua kasus.
2. Token: pilih dan pindai.
3. Embedding: ikuti identitas posisi.
4. Attention: buka lensa konteks.
5. Blok dan generation: gunakan satu langkah.

Jangan meminta pengunjung mengganti alat tanpa perubahan pada pertanyaan yang sedang diselidiki.

## 7. Tata bahasa visual 3D

### 7.1 Tiga sumbu yang tidak boleh tercampur

Pada overview, tetapkan arah yang konsisten:

- **Kiri → kanan:** posisi dalam urutan token.
- **Bawah → atas:** kedalaman layer.
- **Timeline terpisah:** langkah generation, yaitu berapa token baru yang telah dipilih.

Fitur vektor ditampilkan sebagai strip kecil atau panel yang bisa diperbesar, bukan menjadi sumbu keempat yang tidak dijelaskan. Perpindahan kamera tidak mengubah arti arah. Ketika ruang lokal diputar, kompas sumbu dan label tetap tersedia.

Dengan demikian pengunjung dapat membedakan “posisi ke-7”, “layer ke-2”, dan “token keluaran ke-3”. Ketiganya bukan satu ukuran kemajuan.

### 7.2 Identitas, warna, dan besar angka

| Unsur visual | Makna yang tetap |
|---|---|
| Label `pos 07 · id 14` | Posisi dan identitas vocabulary; bukan nilai vektor |
| Outline putih dan nomor | Posisi yang dipilih; tidak bergantung pada warna |
| Panel kecil bertanda +/− | Komponen vektor; panjang menyatakan magnitudo |
| Q cyan, K ungu, V amber | Jenis proyeksi; huruf selalu ditampilkan |
| Arsir abu-abu dan simbol kunci | Koneksi yang dilarang mask |
| Lebar koneksi + angka | Bobot attention untuk head/baris yang sedang dipilih |
| Batang tegak berlabel persen | Probabilitas kandidat; sumbu dan total jelas |
| Bingkai solid | Parameter model yang tetap selama inference |
| Isi panel yang berubah | Aktivasi dari input saat ini |
| Kontur A/B | Dua percobaan yang dibandingkan |

Warna token tidak boleh sekaligus berarti probabilitas, peran Q/K/V, dan besarnya aktivasi. Gunakan nomor, bentuk, outline, serta label agar tampilan tetap dapat dibaca tanpa membedakan seluruh warna.

### 7.3 Yang benar-benar membutuhkan ruang

3D paling berguna untuk:

- Membuka nesting blok dan menunjukkan jalur residual yang bercabang lalu bertemu.
- Memperlihatkan banyak posisi tetap ada sepanjang layer.
- Menunjukkan pertemuan beberapa aliran Value pada satu posisi query.
- Menempatkan rak cache pada layer yang memilikinya.
- Menampilkan dua run A/B berdampingan dengan kamera yang terkunci.
- Menarik satu irisan dari volume tensor, lalu memeriksanya di panel datar.

Teks, matriks numerik, loss curve, tabel kandidat, dan kalkulasi rinci lebih jelas pada panel 2D yang menempel pada objek. Tidak perlu mengubah setiap angka menjadi kubus yang harus didekati dengan kamera.

### 7.4 Gerakan harus menjelaskan suatu peristiwa

| Gerakan | Arti yang diizinkan | Yang harus dicegah |
|---|---|---|
| Token terbelah | Batas potongan tokenizer sedang diperlihatkan | Seolah tokenizer memilih batas berdasarkan pemahaman kalimat |
| Baris embedding terangkat | Lookup baris oleh token ID | Seolah ID berubah menjadi koordinat makna |
| Strip angka bergabung | Penjumlahan komponen | Gelombang dekoratif yang diklaim sebagai penjumlahan |
| Value bergerak menuju query | Visualisasi weighted sum | Kata asli dipindahkan atau hilang dari posisi asal |
| Dua jalur bertemu di `+` | Penjumlahan residual | Residual menjadi penyaring kebenaran |
| Layer tersorot bergantian | Urutan pembaruan representasi | Tiap layer mengeluarkan satu kata |
| Token terpilih masuk ke rel | Output menjadi bagian input berikutnya | Seluruh jawaban sudah tersedia di belakang mesin |
| Isi rak lama tetap | K/V prefix digunakan kembali | Masa lalu ditulis ulang setiap ada token baru |
| Panah balik training | Aliran gradien | Teks jawaban berjalan mundur ke prompt |

Kecepatan animasi merupakan kecepatan penjelasan. Jangan menyebutnya waktu komputasi atau latensi perangkat kecuali benar-benar diukur.

### 7.5 Aturan kamera dan kepadatan

Kamera terpandu memperlihatkan input, operasi aktif, dan output dalam satu framing. Sebelum zoom ke sel, ada label posisi/layer/head. Setelah zoom keluar, objek terpilih tetap memiliki identitas yang sama.

Tampilkan satu head dan satu query pada awal penjelasan attention. Overview semua koneksi dibuka setelah pengunjung mengerti satu koneksi. Maksimal beberapa angka penting disorot; sisanya dapat diredupkan tanpa disembunyikan dari inspector.

Mode reduced motion memakai perubahan state dan highlight. Mode 2D membawa tugas, angka, dan bukti yang sama. Tidak ada konsep yang hanya bisa diketahui dengan melihat sesuatu di belakang objek.

## 8. Ritme setiap misi

Semua pos menggunakan pola berikut, dengan variasi bentuk agar tidak terasa seperti ujian berulang:

1. **Lihat kondisi awal.** Apa yang sudah diketahui dan apa yang belum?
2. **Buat prediksi.** Apa yang akan berubah? Apa yang seharusnya tetap?
3. **Lakukan satu perubahan.** Variabel lain dikunci atau ditampilkan dengan jelas.
4. **Jalankan.** Perlihatkan hasil aktual, termasuk hasil yang tidak sesuai harapan.
5. **Tunjuk bukti.** Pilih sel, vektor, token, atau perbandingan yang mendukung kesimpulan.
6. **Jelaskan kembali.** Pilih atau susun hubungan sebab-akibat, lalu bawa ke kasus lain.

Jawaban salah bukan kegagalan eksplorasi. Contoh feedback:

> “Kamu memperkirakan semua posisi berubah. Pada perbandingan ini, posisi sebelum edit tetap sama. Coba buka mask untuk mencari jalur yang dapat membawa perubahan.”

Jika dugaan awal salah tetapi penjelasan setelah observasi benar, misi tetap selesai. Tidak ada penalti karena berhipotesis. Jika memilih **“Tunjukkan demonstrasi”**, pengguna tetap dapat melanjutkan, dengan status bukti “sudah diamati”, bukan “sudah dijelaskan sendiri”.

## 9. Skenario lengkap per pos

### Pos 00 — Satu kata berubah, jawaban ikut berubah

**Pertanyaan:** Mengapa perubahan kecil dalam catatan dapat mengubah jawaban?

**Pembuka di layar:**

> “Kunci cadangan ada di laci biru. Kamu tahu jawabannya karena bisa membaca catatan. Sekarang lihat apa yang harus dilakukan mesin untuk menghasilkan jawaban yang sesuai.”

**Adegan:** meja kasus berada di tengah pandangan. Dua kartu konteks memiliki satu perbedaan yang disorot. Terminal jawaban berhenti setelah `di laci`. Seluruh mesin di belakangnya masih berupa siluet dengan tiga label sederhana: pesan masuk, pengolah konteks, pilihan berikutnya.

**Misi — Bekukan sebelum satu pilihan.** Pengunjung memilih dugaan, menjalankan dua kasus terpilih, lalu menandai apa yang berbeda: konteks dan distribusi kandidat. Identitas checkpoint ditampilkan tetap. Hasil mengikuti trace yang tersedia; jika varian tidak menghasilkan kelanjutan yang diharapkan, narator menyebutnya sebagai kegagalan model, bukan menutupinya.

**Bukti:** kartu awal “Input bisa mengubah perhitungan tanpa mengganti bobot.” Kesimpulan ini baru dibuktikan lebih rinci di pos berikutnya; di pembuka ia menjadi hipotesis investigasi.

**Transisi:**

> “Sebelum mencari tempat perubahan itu bekerja, kita perlu melihat apa yang sebenarnya masuk ke mesin.”

**Batas:** jangan menjelaskan seluruh arsitektur dalam intro. Jangan menampilkan 96 layer, semua hotkey, rumus attention, atau formulir konfigurasi sekaligus.

### Pos 01 — Mesin tidak menerima kalimat utuh

**Pertanyaan:** Apa unit yang diproses model?

**Narasi:**

> “Tulisan di layar terasa seperti kalimat. Di batas masuk model, tulisan ini sudah diubah menjadi daftar token. Setiap token mempunyai ID dalam vocabulary. Ada token berupa kata, bagian kata, spasi, atau tanda baca.”

**Adegan:** teks kasus membentang di atas rel. Saat dipisahkan, setiap kapsul tetap memuat teks aslinya, termasuk whitespace. Sebuah stempel menambahkan ID; rel di bawahnya memberi nomor posisi. Dua jenis nomor memiliki label berbeda.

**Misi — Susun kembali pesan.** Lepaskan beberapa kapsul, lalu susun kembali persis seperti input. Tampilkan penghitung karakter dan pemeriksaan rekonstruksi. Setelah berhasil, bandingkan sebuah kata utuh dengan contoh subword `bel` + `ajar` pada kartu contoh terpisah.

**Prediksi:** Apakah lebih banyak token selalu berarti lebih banyak kata? Tidak. Apakah memecah satu kata mengubah teks ketika hasilnya digabung ulang? Tidak, pada tokenizer lossless yang dipakai contoh ini.

**Pembacaan penting:** token ID adalah indeks vocabulary, bukan nomor urut. ID yang lebih besar tidak berarti makna lebih rumit.

**Bukti:** pengunjung menunjuk dua token ` kunci` dengan ID sama tetapi posisi berbeda, lalu merekonstruksi input tanpa kehilangan spasi atau tanda baca.

**Contoh yang perlu hadir:**

- Token berulang pada dua lokasi dalam kasus utama.
- Kata yang terpecah menjadi lebih dari satu token pada tokenizer contoh.
- Whitespace yang terlihat sebagai `·` dan newline sebagai `↵` ketika mode inspeksi aktif.
- Teks Unicode seperti `café` atau emoji pada annex tokenizer, hanya jika segmentasi profil tersebut benar-benar diverifikasi.

**Catatan teknis:** segmentasi bergantung pada tokenizer dan vocabulary. Jangan menggambarkan pemotongan manual yang tampak linguistik sebagai hasil tokenizer model tertentu. BPE menggabungkan unit berdasarkan aturan yang telah diperoleh sebelumnya; detail subword dapat dirujuk ke [Sennrich dkk.](https://arxiv.org/abs/1508.07909).

**Transisi:**

> “Mesin sekarang punya ID. Tetapi menghitung 7 ditambah 14 tidak menjelaskan hubungan dua token. Untuk itu, setiap ID mengambil sebuah representasi.”

### Pos 02 — Nomor menjadi daftar angka

**Pertanyaan:** Bagaimana ID token menjadi sesuatu yang dapat diolah jaringan?

**Narasi:**

> “ID bekerja seperti nomor baris. Ia memilih satu baris dari tabel embedding. Baris itu berisi banyak angka yang dipelajari selama training. Angka-angka ini memberi model bahan untuk melakukan perhitungan berikutnya.”

**Adegan:** tabel embedding berdiri seperti laci arsip. Kapsul tidak masuk ke ruang tiga sumbu “makna”, melainkan menyorot satu baris. Baris tersebut disalin menjadi strip fitur. Tabel parameter tetap di tempat; aktivasi bergerak ke jalur berikutnya.

**Misi — Temukan dua salinan yang sama.** Pin dua kemunculan token yang sama dari kasus utama. Sebelum posisi ditambahkan, bandingkan embedding dasarnya. Selisih komponen harus nol untuk ID yang sama pada checkpoint yang sama.

**Aksi tambahan:** pilih token warna lain. Baris lookup berubah, tetapi tabel parameter tidak berubah. Ini memperkenalkan pembedaan parameter dan aktivasi secara konkret.

**Bukti:** pengunjung menghubungkan `ID → baris E → vektor`, kemudian menjawab: “Mengubah input memilih baris lain; itu bukan proses belajar ulang tabel.”

**Detail angka opsional:**

```text
Contoh hitung terpisah:
E[id_biru] = [0.2, -0.5, 0.8, 0.1]
E[id_biru] = [0.2, -0.5, 0.8, 0.1]  ← kemunculan lain, hasil lookup sama
```

Jangan memberi nama pasti pada empat komponen itu, misalnya “warna”, “benda”, “cerdas”, “emosi”. Fitur yang dipelajari tidak otomatis dapat diterjemahkan menjadi kategori manusia per sumbu.

**Transisi:**

> “Dua token yang sama mendapat embedding yang sama. Bagaimana mesin membedakan `laci` di catatan dari `laci` yang baru muncul dalam jawaban?”

### Pos 03 — Token yang sama, tempat yang berbeda

**Pertanyaan:** Bagaimana urutan masuk ke representasi?

**Narasi:**

> “Pada profil ini, posisi juga memiliki vektor. Vektor token dan vektor posisi dijumlahkan. Token yang sama tetap mengambil baris embedding yang sama, tetapi lokasinya memberi kontribusi berbeda.”

**Adegan:** dua strip embedding identik diletakkan di lokasi berbeda. Masing-masing menerima strip posisi. Komponen bergerak menuju tanda `+`; hasilnya terbentuk per elemen. Warna token tidak berubah identitas, sementara angka representasi berubah.

**Misi — Pindahkan, lalu cari yang tetap.** Pada salinan eksperimen, pindahkan satu kapsul ke posisi lain. Pengunjung memprediksi tiga hal secara terpisah: ID, embedding dasar, dan representasi sesudah penambahan posisi.

**Contoh hitung terpisah:**

```text
E      = [ 0.2, -0.5,  0.8,  0.1]
P[2]   = [ 0.1,  0.0, -0.2,  0.3]
X[2]   = [ 0.3, -0.5,  0.6,  0.4]

P[5]   = [-0.1,  0.2,  0.0,  0.1]
X[5]   = [ 0.1, -0.3,  0.8,  0.2]
```

**Kasus transfer:** bandingkan `kunci di laci; kartu di tas` dan `kartu di laci; kunci di tas`. Isi token serupa, hubungan yang dinyatakan berubah. Hasil semantik model harus diamati, bukan diasumsikan pasti benar setelah sebuah sakelar posisi dinyalakan.

**Bukti:** “ID tidak menjadi nomor posisi. Representasi masukan menggabungkan identitas token dan informasi posisi.”

**Batas penting:** jangan berkata “tanpa positional embedding, decoder sama sekali tidak bisa membedakan urutan”. Mask kausal sendiri memberi struktur urutan. Misi ini menunjukkan kontribusi posisi eksplisit pada profil terpilih, bukan teorema bahwa semua arsitektur tanpa positional embedding buta urutan.

Beberapa arsitektur memakai mekanisme posisi lain. Misalnya, [RoPE](https://arxiv.org/abs/2104.09864) memasukkan posisi melalui rotasi pada representasi query/key. Perbandingan ini cukup satu panel lanjutan; jangan mencampur kedua mekanisme di jalur utama.

**Transisi:**

> “Sekarang setiap posisi punya representasi. Tetapi representasi awal `laci` belum mengambil informasi dari catatan. Di sinilah perhitungan antarposisi mulai bekerja.”

### Pos 04 — Bagaimana informasi bisa bertemu?

**Pertanyaan:** Bagaimana satu posisi menentukan campuran informasi dari posisi lain?

**Narasi:**

> “Attention membuat sebuah posisi dapat menggabungkan informasi dari posisi yang diizinkan. Untuk menghitung campurannya, representasi diproyeksikan menjadi Query, Key, dan Value. Query dan Key menentukan skor pasangan. Value menyediakan angka yang akan dicampurkan.”

**Adegan:** kamera masuk ke bingkai **blok 1**, bukan ke mesin yang berdiri di luar Transformer. Panel posisi terakhir menjadi fokus, tetapi posisi lain tetap terlihat. Setelah normalization, setiap strip memiliki tiga proyeksi berlabel Q, K, V. Pelat `WQ`, `WK`, `WV` terlihat sebagai parameter tetap.

**Misi — Temukan asal satu skor.** Pengunjung memilih satu sel output Q. Pemindai memperlihatkan satu baris input, satu kolom bobot, perkalian pasangan, lalu penjumlahan. Setelah itu, pilih pasangan query/key untuk melihat sebuah dot product.

**Pertanyaan transfer:** jika hanya Value dalam contoh operator diubah sementara Q/K tetap, apakah skor kecocokan ikut berubah? Tidak. Jika Key diubah, skor dapat berubah. Intervensi ini diberi label contoh operator, sebab dalam forward pass normal Q/K/V sama-sama berasal dari representasi dan bobot model.

**Bukti:** pengunjung dapat menghubungkan Q/K dengan pembobotan, V dengan isi campuran. Mereka tidak perlu menghafal seluruh matriks.

**Yang jangan diklaim:**

- Query bukan pertanyaan bahasa Indonesia yang disembunyikan di dalam vektor.
- Key bukan dokumen dalam database eksternal.
- Value bukan jawaban jadi.
- Tiga proyeksi bukan tiga agen yang berunding.
- Head 1 tidak otomatis “head warna” dan head 2 tidak otomatis “head tata bahasa”.

**Transisi:**

> “Skor pasangan sudah dapat dihitung. Tetapi ada informasi yang tidak boleh digunakan: jawaban yang belum dihasilkan.”

### Pos 05 — Jangan membaca jawaban dari masa depan

**Pertanyaan:** Mengapa model tidak boleh melihat token di sebelah kanannya?

**Narasi:**

> “Saat menghasilkan token berikutnya, masa depan memang belum ada. Saat latihan, seluruh contoh sudah tersedia. Mask memastikan posisi yang sedang belajar memprediksi tetap tidak dapat membaca target dari sebelah kanan.”

**Adegan:** sebuah matriks memiliki baris query dan kolom key yang jelas. Diagonal masih terbuka; segitiga di atasnya diarsir. Penutup diletakkan pada skor sebelum softmax. Perubahan `−∞ → 0` diperlihatkan dalam dua tahap, dengan label “skor” dan “bobot”.

**Misi — Ubah masa depan, periksa masa lalu.** Tampilkan dua urutan dengan prefix identik sampai posisi yang dipilih. Ubah token setelahnya. Prediksikan apakah representasi posisi terpilih berubah. Jalankan keduanya dengan bobot, posisi, dan mode inference yang sama.

**Hasil yang wajib dapat dibuktikan:** aktivasi prefix identik pada decoder kausal deterministik dalam toleransi numerik. Token setelah edit dapat berubah. Ini menjadi pondasi penjelasan cache nanti.

**Eksperimen tambahan:** buka mask pada salinan diagnostik. Kemungkinan pengaruh dari masa depan kini tersedia. Labeli **“arsitektur diubah untuk demonstrasi kebocoran”**; jangan menyebut hasil tanpa mask sebagai cara kerja normal model tersebut.

**Bukti:** pengunjung menunjuk jalur yang ditutup dan posisi diagonal yang tetap boleh diakses.

**Kesalahan umum yang harus diantisipasi:** membaca token di posisi sekarang bukan kebocoran. Representasi posisi sekarang digunakan untuk memprediksi token berikutnya, bukan menebak token yang sudah menjadi input posisi itu.

**Transisi:**

> “Kita sudah tahu jalur mana yang boleh dipakai. Sekarang kita akan menghitung berapa besar campuran dari setiap jalur.”

### Pos 06 — Cocok belum berarti selesai

**Pertanyaan:** Apa yang dihasilkan attention: kata, hubungan, atau angka baru?

**Narasi:**

> “Skor belum merupakan probabilitas. Softmax mengubah satu baris skor yang diizinkan menjadi bobot dengan jumlah satu. Setiap bobot mengalikan sebuah Value. Hasil perkalian itu dijumlahkan menjadi vektor baru untuk posisi query.”

**Adegan:** satu query dan tiga Value yang valid diperbesar. Koneksi mempunyai angka bobot. Strip Value disalin, dikalikan, lalu dijumlahkan. Sumbernya tetap ada; tidak ada token yang dimakan atau berpindah identitas.

**Misi — Rakit satu campuran.** Buka contoh hitung berikut. Pengunjung memilih bobot, memeriksa satu komponen, lalu menyusun output.

```text
Contoh hitung terpisah; satu head dengan d_head = 2.

q  = [√2, 0]
k1 = [ln(2), 0]      v1 = [2, 0]
k2 = [0, 1]          v2 = [0, 4]
k3 = [0, -1]         v3 = [2, 2]
k4 = [10, 0]         v4 = [99, 99]   ← posisi masa depan

q · k / √2          = [ln(2), 0, 0, 10]
sesudah mask       = [ln(2), 0, 0, −∞]
sesudah softmax    = [0.50, 0.25, 0.25, 0.00]

z = 0.50[2,0] + 0.25[0,4] + 0.25[2,2] + 0[99,99]
  = [1.5, 1.5]
```

Mask membuat Value masa depan tidak berkontribusi walaupun skor mentahnya sangat besar. Angka tersebut dipilih untuk menunjukkan mekanisme, bukan hasil dari kasus kunci.

**Percobaan kedua:** ubah `v1` menjadi `[0,0]` dengan Q/K tetap. Bobot masih `[0.50,0.25,0.25,0]`, tetapi output menjadi `[0.5,1.5]`. Pengunjung melihat mengapa bobot besar saja tidak menyatakan besarnya seluruh pengaruh terhadap jawaban.

**Kembali ke kasus utama:** pilih satu query/head, lalu cocokkan matriks bobot dengan satu campuran Value aktual. Jika attention menyebar ke banyak token, tampilkan sebaran itu; jangan menggambar satu garis “jawaban” secara manual.

**Multi-head:** dua head menjadi dua panel berdampingan. Hasil `[1,2]` dan `[3,4]` pada contoh kecil digabung menjadi `[1,2,3,4]`, bukan dijumlahkan menjadi `[4,6]`. Proyeksi output kemudian mencampur fitur hasil concat.

**Bukti:** “Attention menghasilkan vektor campuran, bukan memilih satu kata dari prompt.”

**Batas interpretasi:** attention map bukan penjelasan lengkap atau bukti tunggal penyebab jawaban. [Jain dan Wallace](https://arxiv.org/abs/1902.10186) menunjukkan masalah menggunakan bobot attention sebagai penjelasan pada model/tugas yang mereka uji. Di lab, heatmap dipakai sebagai pembacaan operasi; klaim pengaruh output harus disertai intervensi dan batas cakupannya.

**Transisi:**

> “Posisi ini kini menerima campuran informasi. Campuran itu masih harus digabungkan dengan representasinya sendiri dan diolah lagi.”

### Pos 07 — Satu blok memperbarui, blok berikutnya melanjutkan

**Pertanyaan:** Apa yang terjadi sesudah attention, dan mengapa ada banyak layer?

**Narasi:**

> “Attention adalah satu bagian blok. Hasilnya ditambahkan ke aliran representasi. MLP kemudian mengolah fitur di tiap posisi. Hasil MLP juga ditambahkan. Blok berikutnya mengulangi susunan operasi dengan parameter layer itu sendiri.”

**Adegan:** kamera keluar sedikit sehingga seluruh blok terlihat. Ada dua cabang dan dua simpul penjumlahan. Aliran representasi utama diberi nomor posisi; cabang attention menghubungkan posisi, cabang MLP bekerja pada setiap posisi secara terpisah.

**Misi — Pasang operasi pada jalurnya.** Pengunjung menempatkan attention, normalization, MLP, dan dua penjumlahan pada diagram kecil. Kemudian pengendali langkah memperlihatkan data melalui susunan yang benar.

**Detail semi teknis:**

```text
R      = X + Attention(LayerNorm(X))
X_next = R + MLP(LayerNorm(R))
```

Rumus ini menyatakan profil pre-norm yang dipilih. Ia bukan definisi universal setiap Transformer.

**Tiga pembesaran wajib:**

1. Residual: `[1.0,0.9,1.0] + [0.2,-0.1,0.3] = [1.2,0.8,1.3]`. Dua input sama-sama berkontribusi; hasil tidak selalu lebih besar dan tidak otomatis lebih benar.
2. MLP: `16 → 64 → 16` jika itulah profil aktif. Tiap posisi memakai bobot MLP yang sama dalam layer tersebut, tetapi inputnya berbeda. GELU memberi transformasi nonlinier; menggambar semua nilai negatif mati adalah ilustrasi yang keliru untuk GELU.
3. Normalization: pembacaan statistik dilakukan pada fitur satu posisi, bukan merata-ratakan token berbeda. Contoh `[1,3]` dinormalkan sekitar `[-1,1]` sebelum affine terlatih, dengan epsilon kecil pada penyebut.

**Percobaan transfer:** hapus kontribusi attention atau MLP pada salinan diagnostik. Amati perbedaan vektor dan logits. Tidak ada janji bahwa satu ablation pasti membuat token pilihan berubah atau bahwa efeknya selalu menurunkan satu ukuran pada setiap contoh.

**Kedalaman:** saat naik ke layer kedua, pengunjung melihat keseluruhan blok berulang: normalization, QKV, attention, residual, normalization, MLP, residual. Jangan melompat dari MLP layer pertama ke MLP layer kedua.

**Bukti:** pengunjung menunjuk bagian yang mencampur informasi antarposisi dan bagian yang mengolah fitur per posisi. Mereka juga membedakan layer ke-2 dari token keluaran ke-2.

**Batas:** residual menyediakan jalur penjumlahan dan membantu optimisasi model dalam training. Ia tidak menjamin semua informasi asli tetap dapat dipulihkan tanpa perubahan, dan tidak mencegah halusinasi. MLP bukan lemari fakta dengan satu fakta per neuron.

**Transisi:**

> “Semua blok telah memperbarui representasi. Model belum mengeluarkan kata. Kita masih punya sebuah vektor di posisi terakhir.”

### Pos 08 — Dari representasi ke satu pilihan

**Pertanyaan:** Bagaimana sebuah vektor berubah menjadi token yang terlihat?

**Narasi:**

> “Setelah normalization terakhir, proyeksi vocabulary menghasilkan satu skor untuk setiap kandidat token. Skor ini disebut logits. Aturan decoding mengubah atau memakai skor itu untuk memilih satu token.”

**Adegan:** strip posisi terakhir masuk ke papan vocabulary. Muncul logits dengan garis nol dan nilai negatif/positif. Baru setelah tombol softmax ditekan, tampilan berubah menjadi probabilitas. Dua bentuk grafik tidak dicampur.

**Misi — Mesin sama, pilihan bisa berbeda.** Bekukan input, checkpoint, dan logits. Pengunjung membandingkan greedy dengan sampling, lalu dua temperature. Pembanding mencatat apa yang tetap dan apa yang berubah.

**Contoh hitung terpisah, vocabulary hanya tiga kandidat:**

| Logits tetap `[2,1,0]` | Kandidat A | Kandidat B | Kandidat C |
|---|---:|---:|---:|
| Temperature 0.5 | 86.68% | 11.73% | 1.59% |
| Temperature 1 | 66.52% | 24.47% | 9.00% |
| Temperature 2 | 50.65% | 30.72% | 18.63% |

Angka dibulatkan. Dalam kasus utama, jika hanya tiga kandidat teratas yang terlihat, sisa massa probabilitas wajib ditampilkan sebagai **“token lain”**. Jangan menormalisasi ulang tiga batang dan menyebutnya distribusi penuh.

**Pembuktian:** temperature positif mengubah ketajaman distribusi; pada logits tetap, urutan ranking tidak berubah. Greedy memilih argmax tanpa undian. Sampling memakai distribusi; satu pengambilan acak dapat memilih kandidat yang bukan terbesar.

Top-k dan top-p menjadi panel lanjut: tandai kandidat yang dibuang, lalu tunjukkan normalisasi ulang. Sebutkan urutan operasi filter yang dipakai implementasi. Temperature nol ditangani sebagai pilihan greedy pada antarmuka, bukan pembagian logits dengan nol.

**Kembali ke cerita:** lanjutkan kasus `Jawaban: di laci`. Pilih token sesuai decoding policy dan rekaman yang sah. Tampilkan apa yang dipilih, bukan apa yang diinginkan penulis naskah.

**Bukti:** pengunjung dapat memisahkan logits, probabilitas, aturan pemilihan, dan token yang akhirnya masuk ke output.

**Kalimat penting di layar:**

> “Probabilitas token mengukur kelanjutan menurut model dan konfigurasi ini. Angka tersebut bukan peluang bahwa seluruh kalimat benar.”

**Transisi:**

> “Kita baru mendapatkan satu token. Untuk mendapatkan kalimat, token ini harus ikut dalam perhitungan berikutnya.”

### Pos 09 — Satu pilihan menjadi konteks baru

**Pertanyaan:** Bagaimana proses yang memilih satu token bisa menghasilkan jawaban panjang?

**Narasi:**

> “Token terpilih ditambahkan ke urutan. Model kemudian menghitung distribusi untuk token setelahnya. Pengulangan ini membentuk jawaban. Perhitungan prompt disebut prefill; langkah-langkah token baru disebut decode.”

**Adegan:** token warna yang terpilih bergerak ke ujung rel, bukan ke daftar jawaban yang terpisah dari input. Timeline generation bertambah satu. Semua layer dilalui kembali untuk posisi baru. Rak K/V pada tiap layer menyimpan baris yang sudah dihitung.

**Misi A — Bangun dua putaran.** Pengunjung menyusun kartu `distribusi → pilih → tambah ke konteks → hitung lagi`, lalu menjalankan dua langkah. Konteks aktif berubah pada layar, sementara identitas checkpoint tetap.

Perlihatkan token akhir khusus bila model menghasilkannya, serta penghentian karena batas panjang. Jangan menganggap tanda titik selalu berarti stop. Hentikan run yang mencapai kapasitas dengan penjelasan; jangan memotong konteks diam-diam.

**Misi B — Hemat kerja, pertahankan hasil.** Jalankan prefix identik dengan cache dan tanpa cache. Bandingkan logits sebelum sampling. Secara matematis hasilnya setara; pada implementasi numerik gunakan toleransi yang dinyatakan. Jangan hanya membandingkan dua token acak dari seed berbeda.

**Apa yang ditampilkan:**

- Prefill memproses posisi prompt dengan mask; animasi tidak menyiratkan prompt wajib diproses satu token per pemanggilan model.
- Logits posisi terakhir prompt menghasilkan token keluaran pertama.
- Token terpilih baru dihitung K/V-nya ketika diproses pada putaran berikutnya, bukan pada saat baru diundi.
- Dalam decode dengan cache, proyeksi serta MLP posisi lama tidak perlu diulang untuk memperoleh posisi baru.
- Query baru tetap berinteraksi dengan K/V yang diizinkan; konteks panjang masih mempunyai biaya.

**Contoh penghematan:** pada satu langkah dengan empat posisi prefix dan satu posisi baru, bandingkan “lima posisi dihitung ulang” dengan “satu posisi baru dihitung, empat K/V prefix dipakai ulang”. Ini hitungan pekerjaan konseptual, bukan klaim latensi lima kali lebih cepat.

**Misi C — Edit masa lalu.** Ubah token pada posisi `r`. Cache sebelum edit dapat dipakai hanya jika seluruh dependensinya tetap cocok. Cache untuk posisi `r` dan sesudahnya dihitung ulang. Cache hanya sah untuk model, token, posisi, dan konfigurasi yang kompatibel.

**Bukti:** “Cache menyimpan hasil antara K/V per layer. Ia tidak menyimpan jawaban lengkap, bukan bobot, dan bukan bukti bahwa model belajar permanen dari percakapan.”

**Rujukan teknis:** prinsip penggunaan ulang K/V dan kaitannya dengan mask kausal dijelaskan dalam [dokumentasi cache Transformers](https://huggingface.co/docs/transformers/main/cache_explanation).

**Transisi:**

> “Sekarang kita dapat mengikuti sebuah jawaban dari awal sampai selesai. Tetapi masih ada satu pertanyaan besar: dari mana bobot yang membuat hitungan ini berguna?”

### Pos 10 — Siapa yang mengatur angka di mesin?

**Pertanyaan:** Bagaimana model memperoleh kemampuan dari contoh teks?

**Narasi:**

> “Sebelum digunakan, parameter model dilatih. Teks menyediakan contoh token berikutnya. Prediksi dibandingkan dengan target, lalu selisihnya digunakan untuk memperbarui parameter. Proses ini diulang pada banyak contoh.”

**Adegan:** mesin yang sama terlihat dalam mode training. Pelat parameter yang sebelumnya terkunci kini dapat berubah. Jalur forward tetap berwarna sama seperti sebelumnya; jalur gradien memakai pola garis berbeda. Mesin tidak diganti menjadi metafora mesin lain.

**Contoh target bergeser:**

```text
Urutan contoh: [Catatan] [:] [ kunci] [ cadangan] ...

input posisi 0 → prediksi token posisi 1
input sampai 1 → prediksi token posisi 2
input sampai 2 → prediksi token posisi 3
...
```

Dalam training kausal, banyak posisi dapat dihitung dalam satu forward pass dengan mask. Target berasal dari teks latihan. Tidak perlu manusia menulis satu pertanyaan/jawaban untuk setiap contoh pretraining.

**Misi A — Temukan kebocoran.** Kaitkan kembali mask dengan target bergeser. Jika prediksi dapat membaca token target di sebelah kanan, tugas latihan bisa diselesaikan dengan kebocoran, bukan dengan pola yang diperlukan saat generation.

**Misi B — Turunkan loss satu contoh.** Untuk tiga kandidat dan target A, tampilkan:

```text
Contoh hitung terpisah:
logits z       = [2, 1, 0]
p              ≈ [0.665241, 0.244728, 0.090031]
loss           = -ln(p_target) ≈ 0.407606
gradien ke z   = p - one_hot(target)
               ≈ [-0.334759, 0.244728, 0.090031]
```

Pengunjung memilih arah pembaruan. Untuk menunjukkan arah secara sederhana, gunakan tiga bias output sebagai parameter contoh dengan learning rate 0.5. Setelah satu langkah, logits menjadi sekitar `[2.167380, 0.877636, -0.045015]`, probabilitas A menjadi sekitar `0.722137`, dan loss menjadi sekitar `0.325541`.

Label wajib: **“Demo pembaruan tiga bias output; bukan seluruh backpropagation Transformer.”** Pada model penuh, gradien mengalir melalui operasi ke parameter yang dilatih, termasuk embedding dan proyeksi. Optimizer menentukan pembaruannya. Menampilkan logit berubah saja tidak cukup untuk mengklaim sudah memperlihatkan seluruh training.

**Misi C — Hafal contoh atau pelajari pola?** Tampilkan dua set kartu: latihan dan uji yang ditahan. Pengunjung menguji kombinasi benda–lokasi baru. Grafik training loss dan hasil set uji berdampingan. Perbaikan pada contoh latihan tidak menjamin generalisasi.

Jangan menjanjikan loss turun setiap langkah untuk setiap contoh, atau satu pembaruan memperbaiki semua kemampuan sekaligus. Gunakan hasil rekaman yang nyata untuk kurva model mini.

**Pembedaan yang harus dapat dilakukan:**

| Saat training | Saat inference biasa dalam lab |
|---|---|
| Target diketahui dari data latihan | Token berikutnya belum diketahui |
| Loss dan gradien digunakan | Tidak ada pembaruan bobot |
| Parameter model dapat berubah | Aktivasi berubah mengikuti konteks |
| Optimizer memperbarui parameter | Decoding policy memilih output |

**Dari next-token ke kemampuan:** banyak jenis teks memuat tata bahasa, fakta, kode, contoh pemecahan masalah, dan hubungan antarhal. Belajar memprediksi teks dapat membentuk representasi yang berguna untuk berbagai tugas. Tujuan next-token menjelaskan sinyal latih, bukan berarti kemampuan model terbatas pada autocomplete dangkal; juga tidak menjamin kemampuan tertentu pasti muncul pada setiap model.

**Bukti:** pengunjung dapat menjelaskan mengapa memasukkan contoh ke prompt dapat mengubah jawaban walau bobot tetap, dan bagaimana proses tersebut berbeda dari fine-tuning. [Brown dkk.](https://arxiv.org/abs/2005.14165) merupakan contoh penelitian penggunaan model lewat konteks tanpa pembaruan gradien pada tugas yang diuji.

**Transisi:**

> “Model yang mempelajari teks belum otomatis menjadi asisten yang mengikuti kebutuhanmu. Ada proses dan lapisan aplikasi lain di atas kemampuan dasarnya.”

### Pos 11 — Mengapa mesin bisa menjadi asisten?

**Pertanyaan:** Mengapa aplikasi percakapan menjawab instruksi, bukan sekadar meneruskan dokumen?

**Narasi:**

> “Kemampuan dasar model dan kebiasaan menjawabnya dibentuk oleh tahap pelatihan. Contoh instruksi–respons serta sinyal preferensi dapat mengarahkan perilaku agar lebih berguna. Aplikasi juga menyusun pesan dan penanda peran menjadi input untuk model.”

**Adegan:** satu sisi menampilkan proses training lanjutan; sisi lain menampilkan perakitan input saat percakapan. Tiga kartu pesan—instruksi sistem, pengguna, dan asisten—disusun menjadi urutan dengan penanda sesuai format model. Penanda ini tetap masuk ke pipeline token, bukan jalur telepati di luar mesin.

**Misi — Kelompokkan apa yang berubah.** Pengunjung menempatkan tindakan ke tiga kategori:

- Menambahkan “jawab singkat” pada prompt: mengubah konteks.
- Melatih model pada contoh respons: mengubah bobot lewat training.
- Mengatur temperature: mengubah cara memilih dari skor.
- Menyimpan dan mengirim ringkasan percakapan: tindakan aplikasi yang mengubah input berikutnya.

**Kasus perbandingan:** berikan contoh base model yang melanjutkan format teks dan model sesudah instruction tuning yang mengikuti permintaan. Jika pasangan checkpoint nyata belum tersedia, sajikan sebagai penjelasan konseptual berlabel, tanpa angka kemenangan atau demo palsu.

Tampilkan supervised fine-tuning dan pembelajaran dari preferensi sebagai dua jenis pendekatan. Jangan mengajarkan bahwa semua model asisten memiliki pipeline yang sama atau bahwa RLHF wajib untuk setiap sistem. [Ouyang dkk.](https://arxiv.org/abs/2203.02155) memberi satu contoh konkret yang menggabungkan demonstrasi dan umpan balik manusia.

**Bukti:** pengunjung membedakan konteks, parameter, konfigurasi decoding, dan orkestrasi aplikasi.

**Batas:** format peran dan post-training membantu perilaku mengikuti instruksi; keduanya bukan jaminan kepatuhan sempurna, kebenaran sempurna, atau pemahaman niat pengguna tanpa kesalahan.

**Transisi:**

> “Sistem bisa menjadi lebih berguna sebagai asisten. Tetapi apa yang terjadi jika informasi yang ditanyakan tidak ada di catatan?”

### Pos 12 — Jawaban lancar, bukti belum tentu ada

**Pertanyaan:** Kapan jawaban punya dasar yang dapat diperiksa?

**Narasi:**

> “Model dapat menghasilkan kalimat yang masuk akal meskipun informasi yang diperlukan belum tersedia. Kita perlu memeriksa sumber yang dipakai, bukan hanya seberapa lancar kalimatnya.”

**Adegan:** meja kasus kembali. Kali ini ada tiga tempat berbeda: parameter model, konteks aktif, dan arsip dokumen eksternal. Ketiganya tidak digambar sebagai satu gudang ingatan.

**Misi A — Informasi yang tidak diberikan.** Hapus lokasi kunci dari catatan, kemudian tanyakan lokasinya. Tunjukkan sumber informasi yang tersedia dan hasil model sebenarnya. Jangan menjamin model pasti mengarang atau pasti berkata tidak tahu; kedua perilaku adalah hasil yang perlu diamati.

Pertanyaan penilaian: “Apakah keluaran ini didukung oleh catatan?” Ini dapat dijawab walau model memberikan probabilitas tinggi atau kalimat yang terdengar yakin.

**Misi B — Dua catatan bertentangan.** Tampilkan catatan lama dan baru yang berlawanan, lengkap dengan penanda sumber/waktu yang jelas. Pengunjung memilih informasi yang relevan dan memeriksa apakah jawaban mengacu kepadanya. Jangan mengajarkan bahwa model selalu memprioritaskan teks terakhir atau selalu memilih tanggal terbaru dengan benar.

**Misi C — Ambil bukti dari arsip.** Sebuah panel aplikasi mengambil dokumen tentang lokasi kunci dari koleksi lokal dan memasukkan kutipannya ke konteks. Setelah itu, model menjalankan pipeline yang sama. Dokumen tidak muncul dari parameter atau dari KV cache.

```text
pertanyaan
    → aplikasi mencari dokumen
    → cuplikan relevan dimasukkan ke konteks
    → model menghasilkan jawaban
    → pengguna memeriksa kecocokan klaim dengan sumber
```

Ini adalah skema retrieval-augmented generation. Implementasi pendidikan tidak harus memakai vector database; pencarian lokal yang dapat dilihat sudah cukup untuk menjelaskan batas antara retrieval dan generation. [Lewis dkk.](https://arxiv.org/abs/2005.11401) menjadi referensi primer untuk penggabungan model generatif dengan informasi yang diambil dari sumber eksternal.

**Misi D, opsional — Minta kalkulator.** Beri operasi aritmetika, tampilkan permintaan tool terstruktur, eksekusi kalkulator oleh aplikasi, hasil yang dikembalikan, lalu kelanjutan respons. Tool bukan head tambahan dalam Transformer; aplikasi menjalankan aksi dan hasilnya menjadi input baru.

**Empat laci yang harus dibedakan:**

| Tempat | Isinya | Perubahan dalam percakapan |
|---|---|---|
| Bobot model | Parameter hasil training | Tetap pada inference biasa |
| Konteks | Token yang sedang diproses | Bertambah atau disusun ulang oleh aplikasi |
| KV cache | Aktivasi K/V yang dapat dipakai ulang | Bertambah atau dibatalkan sesuai validitas prefix |
| Penyimpanan aplikasi / dokumen | Riwayat, ringkasan, berkas, hasil retrieval | Hanya memengaruhi model jika dimasukkan atau diakses melalui alur aplikasi |

**Bukti:** pengunjung menandai sebuah klaim sebagai didukung, bertentangan, atau tidak memiliki bukti dalam sumber yang tersedia. Ketepatan label ini tidak bergantung pada gaya bahasa jawaban.

**Batas penting:** informasi yang ada dalam konteks belum tentu dipakai dengan tepat. RAG dapat gagal pada pencarian, pilihan cuplikan, penalaran, atau atribusi. Model yang menulis nama sumber belum membuktikan sumber tersebut mendukung klaim.

Untuk lab, bedakan juga “sesuai catatan” dari “kunci memang berada di sana saat ini”. Kebenaran dunia nyata memerlukan sumber yang benar dan relevan, bukan sekadar pemrosesan teks yang konsisten.

**Transisi:**

> “Sekarang giliranmu. Kasus berikut menggunakan kata yang berbeda. Gunakan bukti yang telah kamu kumpulkan untuk menjelaskan apa yang terjadi.”

### Pos 13 — Buktikan pemahamanmu

**Pertanyaan:** Bisakah pengunjung memakai model mentalnya pada kasus baru?

**Kasus transfer:**

```text
Catatan: kartu akses ada di tas merah.
Pertanyaan: Di mana kartu akses?
Jawaban:
```

Kasus ini harus masuk cakupan model/trace yang disiapkan. Jangan menguji input yang tidak didukung lalu menilai ketidakmampuan simulator sebagai kesalahan pengguna.

**Misi akhir — Rekonstruksi satu jawaban.** Tidak ada tutorial langkah demi langkah pada percobaan pertama. Pengunjung mendapat lima tugas:

1. Pilih posisi yang menghasilkan distribusi token berikutnya setelah prefix diproses.
2. Ubah warna tas dan tunjukkan mana yang tetap: checkpoint/bobot; mana yang mungkin berubah: aktivasi, logits, dan token pilihan.
3. Temukan satu jalur yang ditutup mask dan jelaskan mengapa.
4. Perkirakan apa yang bisa dipakai ulang oleh cache setelah token ditambahkan, lalu setelah prefix diedit.
5. Nilai apakah jawaban didukung catatan, termasuk ketika lokasi sengaja dihapus.

**Penutupan dengan penjelasan pengguna:** susun kartu mekanisme menjadi cerita pendek, atau jawab dengan kalimat sendiri. Jika tidak ada sistem penilai bahasa bebas yang valid, gunakan rubrik mandiri dan contoh jawaban; jangan berpura-pura memahami jawaban bebas dengan pencocokan kata sederhana.

**Rubrik:**

| Aspek | Bukti pemahaman |
|---|---|
| Representasi | Memisahkan teks, token ID, posisi, dan vektor |
| Konteks | Menjelaskan bahwa attention mencampurkan Value dari posisi yang diizinkan |
| Komputasi | Menempatkan attention dan MLP di dalam blok berulang |
| Generation | Menjelaskan logits → policy → satu token → append → ulangi |
| Pembelajaran | Memisahkan training bobot dari inference memakai konteks |
| Keandalan | Memeriksa dukungan sumber, tidak menyamakan probabilitas dengan fakta |

Penyelesaian tur berarti seluruh babak sudah dialami. Status **“dapat menjelaskan”** diberikan per aspek ketika ada bukti tugas transfer, bukan hanya karena semua lokasi pernah dikunjungi.

**Narasi penutup:**

> “Di awal, kamu melihat sebuah jawaban. Sekarang kamu bisa menunjuk apa yang berubah ketika catatan berubah, apa yang dipelajari sebelum percakapan, dan bagian mana yang masih memerlukan bukti dari luar. Kamu tidak perlu menghafal setiap matriks untuk mengikuti mekanismenya.”

Layar akhir memperlihatkan dugaan awal pengunjung dan penjelasan barunya. Tawarkan replay bukti, bedah angka, atau baca artikel. Tautan portofolio hadir setelah penutupan pembelajaran.

## 10. Berkas kasus yang konsisten dari awal sampai akhir

### 10.1 Tokenisasi pedagogis yang bisa dipakai untuk naskah

Tabel berikut adalah **rancangan vocabulary mainan**, bukan hasil tokenizer GPT, bukan data dari engine yang sekarang, dan belum merupakan tokenizer model terlatih. Tujuannya menetapkan kasus yang dapat direkonstruksi dan dibicarakan tanpa berganti contoh. Model cerita yang kelak dilatih harus memakai vocabulary ini atau tabel final yang menggantikannya secara konsisten.

ID dipilih untuk mudah dibaca; urutan ID tidak mengandung arti semantik. Spasi awal adalah bagian token. Tanda `\n` berarti satu karakter newline dalam teks asli.

| Posisi prompt | Potongan | ID mainan |
|---:|---|---:|
| 0 | `Catatan` | 0 |
| 1 | `:` | 1 |
| 2 | ` kunci` | 2 |
| 3 | ` cadangan` | 3 |
| 4 | ` ada` | 4 |
| 5 | ` di` | 5 |
| 6 | ` laci` | 6 |
| 7 | ` biru` | 7 |
| 8 | `.` | 8 |
| 9 | `\nPertanyaan` | 9 |
| 10 | `:` | 1 |
| 11 | ` Di` | 10 |
| 12 | ` mana` | 11 |
| 13 | ` kunci` | 2 |
| 14 | ` cadangan` | 3 |
| 15 | `?` | 12 |
| 16 | `\nJawaban` | 13 |
| 17 | `:` | 1 |

Varian warna menggunakan ` hijau` dengan ID 14. Token lain yang diperlukan, termasuk token akhir, didaftarkan pada vocabulary final. Subword dapat ditunjukkan di meja tokenizer terpisah; profil sederhana ini tidak boleh dinamai BPE jika tidak benar-benar menjalankan algoritme tersebut.

Kegunaan tabel ini:

- Posisi 2 dan 13 memilih baris embedding token yang sama.
- Posisi 1, 10, dan 17 memiliki token `:` yang sama pada konteks berbeda.
- Mengganti ` biru` dengan ` hijau` mengubah satu ID tanpa menggeser panjang prefix.
- Jika output yang dihasilkan adalah ` di` lalu ` laci`, keduanya menempati posisi 18 dan 19. Representasi posisi 19 menghasilkan distribusi token untuk posisi 20.
- ` laci` di posisi 6 dan 19 memiliki embedding dasar yang sama, tetapi posisi dan konteks sebelumnya berbeda.

Seluruh penggunaan istilah “posisi terakhir” merujuk kepada urutan aktif saat itu. Pada awal generation, posisi terakhir adalah 17. Setelah dua token ditambahkan, posisi terakhir adalah 19. Angka ini harus berpindah di HUD agar pengunjung tidak mengira satu posisi tetap memproduksi semua token.

### 10.2 Prefix jawaban tidak boleh diselundupkan

Kalimat `Jawaban: di laci` pada adegan pembuka harus berasal dari salah satu dari dua keadaan yang dijelaskan kepada pengunjung:

1. Model telah menghasilkan ` di` dan ` laci` dalam dua langkah yang direkam; replay memperlihatkan keduanya.
2. Pengunjung sedang menyelidiki prompt yang memang sudah berakhir dengan `Jawaban: di laci`; layar memberi label **“prefix jawaban diberikan sebagai input”**.

Pilihan utama adalah keadaan pertama setelah checkpoint yang sesuai tersedia. Jangan mengetikkan sebagian jawaban secara tersembunyi lalu mengklaim model telah menghasilkannya.

### 10.3 Perubahan satu warna: prediksi yang lebih tajam

Jalankan A dan B dengan posisi, checkpoint, dan konfigurasi yang sama. Satu-satunya perbedaan adalah ID pada posisi 7. Kedua run dibandingkan pada prefix jawaban yang identik. Untuk generasi lebih panjang, hentikan perbandingan lokal ketika output yang ditambahkan sudah berbeda, atau buat cabang eksperimen baru dengan penjelasan.

| Titik pengamatan | Prediksi struktural |
|---|---|
| Tabel parameter | Tetap |
| Embedding lookup posisi selain 7 | Tetap |
| Embedding lookup posisi 7 | Mengambil baris token lain |
| Vektor posisi seluruh urutan | Tetap, karena panjang dan indeks sama |
| Representasi masukan posisi terakhir yang tokennya sama | Tetap sebelum contextual mixing |
| Query posisi terakhir pada layer pertama | Tetap pada profil pre-norm ini, karena input lokalnya identik |
| K/V posisi 7 pada layer pertama | Dapat berubah karena input posisinya berubah |
| Hasil attention posisi terakhir layer pertama | Dapat berubah melalui informasi dari posisi 7 |
| Query posisi terakhir pada layer berikutnya | Dapat berubah karena representasinya sudah menerima konteks |
| Semua aktivasi posisi sebelum 7 | Tetap dalam decoder kausal deterministik |
| Logits akhir | Dapat berubah; besar dan arah perubahannya harus diukur |
| Token terpilih | Bisa sama walau logits berubah; bergantung pada distribusi dan policy |

Ini salah satu demonstrasi terpenting dalam seluruh lab. Pengunjung dapat melihat **di operasi mana perbedaan pertama muncul**, tanpa mengarang bahwa suatu dimensi bernama “warna laci”.

Pada visual A/B, gunakan highlight selisih yang berasal dari data. Bedakan “tidak berubah”, “berubah kecil”, dan “berubah besar” dengan nilai atau skala yang tetap. Jangan menormalisasi warna masing-masing panel secara independen sehingga perubahan terlihat lebih besar atau lebih kecil dari sebenarnya.

### 10.4 Rekaman bercabang dan pilihan yang didukung

Rekaman perhitungan bukan video yang bebas menerima semua input. Karena itu:

- Setiap aksi yang ditawarkan harus memiliki hasil terhitung yang sah.
- Jalur terpandu memakai policy yang telah ditentukan dan trace lengkap hingga berhenti.
- Eksperimen sampling dapat mengambil banyak sampel dari satu distribusi beku tanpa mengklaim telah menghitung kelanjutannya.
- Jika sampel akan ditambahkan ke konteks, jalur itu harus tersedia dalam rekaman bercabang atau dapat dihitung oleh engine.
- Jika tidak tersedia, nyatakan **“contoh ini membandingkan pilihan satu token”** dan jangan menampilkan kelanjutan buatan.
- Ablation dan eksperimen tanpa mask juga membutuhkan trace tersendiri atau perhitungan nyata; animasi saja tidak cukup.

Pembatasan kasus yang jelas lebih berguna daripada kotak input yang tampak serba bisa tetapi hasilnya tidak dapat ditelusuri.

## 11. Bank contoh krusial

Contoh berikut bukan daftar dekorasi tambahan. Masing-masing menutup celah pemahaman tertentu. Jalur utama cukup memakai yang relevan; sisanya tersedia melalui **“Coba kasus lain”**.

| Contoh | Dugaan keliru yang diuji | Tindakan dan bukti | Tempat |
|---|---|---|---|
| Dua ` kunci` di satu prompt | Token ID adalah nomor posisi | ID sama, posisi berbeda, lookup dasar sama | 01–03 |
| `bel` + `ajar` | Satu token selalu satu kata | Potongan kembali menjadi teks asli; jumlah kata tidak sama dengan token | 01 |
| Kunci/laci dan kartu/tas ditukar | Isi token saja cukup; urutan tidak penting | Tunjukkan perubahan hubungan dan perhitungan dengan posisi yang jelas | 03 |
| Warna biru diganti hijau | Model harus dilatih ulang agar memakai fakta baru | Bobot tetap, aktivasi dan logits dibandingkan | 04–08 |
| Suffix diubah setelah posisi terpilih | Semua token saling melihat dua arah | Selisih prefix nol pada decoder kausal | 05 |
| Skor masa depan sangat besar | Skor tinggi bisa menembus mask | `−∞` menjadi bobot nol, V masa depan tidak ikut campuran | 05–06 |
| Q/K tetap, V berubah | Attention map sudah menentukan seluruh output | Bobot sama, hasil weighted sum berbeda | 06 |
| Dua output head pendek | Multi-head berarti voting kata | Concat lalu proyeksi; tidak ada pemungutan suara token | 06 |
| Putus residual | Residual hanya jalan pintas animasi | Bandingkan `F(x)` dengan `x + F(x)` | 07 |
| Dua layer, satu output token | Jumlah layer sama dengan jumlah kata keluaran | Semua layer dilalui sebelum satu distribusi berikutnya | 07–09 |
| Logits sama, temperature berbeda | Temperature mengubah pengetahuan | Parameter dan logits tetap, probabilitas berubah | 08 |
| Logits berubah sedikit, argmax sama | Jawaban sama berarti semua perhitungan sama | Inspector memperlihatkan selisih walau token sama | 08 |
| Cache on/off, prefix sama | Cache memberi model informasi tambahan | Logits setara, pekerjaan berbeda | 09 |
| Prefix diedit setelah cache tersedia | Semua cache selalu aman digunakan ulang | Tunjukkan bagian yang dependensinya batal | 09 |
| Contoh baru dalam prompt | Percakapan langsung mengubah bobot | Konteks berubah; checkpoint tetap | 10 |
| Training loss turun, hasil uji belum membaik | Latihan berhasil berarti pasti generalisasi | Bandingkan dua kelompok data | 10 |
| Lokasi kunci dihilangkan | Kalimat yakin berarti punya bukti | Evaluasi dukungan konteks, bukan nada jawaban | 12 |
| Dua sumber bertentangan | Teks terbaru selalu dipatuhi dengan benar | Periksa sumber relevan dan hasil aktual | 12 |
| Dokumen diambil dari arsip | LLM selalu mencari internet saat menjawab | Perlihatkan langkah retrieval sebagai tindakan aplikasi | 12 |
| Riwayat penting tidak dikirim lagi | Model pasti menyimpan seluruh percakapan | Panel “konteks yang diterima model” memperlihatkan apa yang hilang | Annex / 12 |

### 11.1 Contoh kata bermakna ganda yang aman secara kausal

Gunakan sebagai annex representasi kontekstual:

```text
A: Saat sarapan, ia makan apel.
B: Sebelum upacara, ia mengikuti apel.
```

Pada tokenizer yang memberi token ` apel` sama, embedding lookup token itu sama. Representasi setelah blok dapat berbeda karena prefix berbeda. Gunakan hasil model terlatih jika ingin memperlihatkan representasi semantik aktual; engine acak hanya dapat memperlihatkan ketergantungan numerik pada konteks.

**Hindari contoh yang salah arah:**

```text
Ia melihat apel merah.
Ia melihat apel pagi.
```

Jika semua token sampai `apel` identik, kata setelahnya tidak boleh mengubah representasi `apel` pada decoder kausal ini. Kalimat utuh mungkin dimaknai berbeda oleh manusia, tetapi itu tidak membenarkan menggambar pengaruh mundur dari suffix.

### 11.2 Fakta baru yang hanya ada dalam prompt

Contoh alternatif:

```text
Dalam permainan ini, “doru” berarti kotak kuning.
Benda yang dimaksud kata “doru” berwarna ...
```

Contoh ini berguna untuk membedakan pemakaian konteks dari pembaruan bobot. Namun kemampuan model mini melakukannya tidak boleh diasumsikan. Pilih checkpoint dan contoh yang telah diuji, tampilkan kegagalannya bila ada, dan jelaskan bahwa penggunaan konteks tidak menjamin pembelajaran permanen.

### 11.3 Informasi penting keluar dari konteks

Tampilkan daftar riwayat yang dimiliki aplikasi di sebelah daftar token yang benar-benar dikirim ke model. Hilangkan catatan lokasi dari input aktif, lalu bandingkan dengan keadaan ketika ringkasannya dimasukkan kembali.

Jangan mengatakan model “lupa karena lelah”. Informasi itu mungkin tidak lagi berada dalam input yang diproses. Sebaliknya, ketika informasi masih ada, model tetap bisa gagal memanfaatkannya; panjang konteks dan kualitas penggunaan konteks adalah dua hal berbeda.

## 12. Contoh storyboard pembuka

Durasi berikut adalah sasaran ritme, bukan video wajib. Pengunjung dapat membaca, menjeda, atau langsung menjalankan aksi. Total sasaran sekitar dua sampai tiga menit sebelum mereka sudah melakukan eksperimen pertama dan memasuki tokenisasi.

| Beat | Visual | Narasi / teks layar | Aksi dan tujuan |
|---|---|---|---|
| 1, sekitar 0–15 detik | Catatan lokasi kunci dan pertanyaan | “Bagaimana mesin bisa menjawab berdasarkan catatan yang baru diberikan?” | Satu tombol: **Mulai investigasi** |
| 2, sekitar 15–35 detik | Jawaban terbentuk lalu berhenti di `di laci` | “Kita berhenti sebelum pilihan berikutnya.” | **Lihat kandidat** memperlihatkan distribusi dari trace |
| 3, sekitar 35–60 detik | Salinan kasus B, satu kata warna disorot | “Jika warna laci berubah, apa yang harus berubah di dalam mesin?” | Simpan dugaan; tidak menampilkan hasil B dulu |
| 4, sekitar 60–90 detik | A/B berdampingan, hasil terukur muncul | “Bobotnya sama. Inputnya berbeda. Kita akan mencari kapan perbedaannya mulai memengaruhi perhitungan.” | Pilih satu perbedaan yang teramati |
| 5, sekitar 90–120 detik | Peta tiga bagian, jalur menuju tokenizer menyala | “Pertama, kita perlu melihat bentuk pesan ketika diterima model.” | **Buka pesan** membawa kamera ke Pos 01 |
| 6, sekitar 120–180 detik | Teks menjadi kapsul dengan spasi, ID, dan posisi | “Dua kapsul ini sama, tetapi berada di tempat berbeda.” | Pilih dua kemunculan token yang sama |

Tidak ada lore tambahan yang perlu diingat. Catatan kunci adalah satu-satunya cerita dunia luar; semua objek lain membantu menyelidiki perhitungannya.

### 12.1 Contoh naskah transisi yang menyambung

Ini versi pendek yang dapat dibaca berurutan untuk memeriksa apakah seluruh perjalanan memiliki logika:

> “Satu perubahan pada catatan dapat mengubah jawaban. Untuk mencari sebabnya, kita mulai dari pesan yang masuk. Pesan dipecah menjadi token. ID token memilih baris angka dari tabel embedding. Posisi memberi informasi tentang tempat tiap token berada.
>
> Angka awal ini belum cukup: satu posisi perlu memakai informasi dari konteksnya. Di dalam sebuah blok, Query dan Key menghasilkan skor pasangan. Mask menutup posisi yang tidak boleh diakses. Softmax mengubah skor menjadi bobot, lalu bobot itu mencampurkan Value.
>
> Campuran ditambahkan ke representasi yang sudah ada. MLP mengolah fitur di setiap posisi, kemudian hasilnya ditambahkan lagi. Blok berikutnya melanjutkan pembaruan dengan bobotnya sendiri.
>
> Di akhir tumpukan, representasi posisi terakhir menghasilkan skor kandidat token. Aturan decoding memilih satu token. Token itu masuk ke konteks, lalu proses berulang. K/V dari prefix dapat digunakan kembali karena masa depan tidak mengubah perhitungan prefix yang identik.
>
> Kita sudah melihat cara model menghitung. Parameter yang membuat hitungan itu berguna diperoleh melalui training: prediksi dibandingkan dengan target, loss dihitung, dan parameter diperbarui. Pada inference biasa, parameter tetap; konteks mengubah aktivasi. Pelatihan lanjutan serta format aplikasi membantu model berperilaku sebagai asisten.
>
> Namun kelanjutan yang mungkin menurut model belum tentu benar. Sumber yang relevan, hasil tool, dan pemeriksaan bukti menentukan seberapa jauh sebuah jawaban layak dipercaya.”

## 13. Konten setiap layar dan buku bukti

### 13.1 Anatomi layar pos

Setiap pos cukup memiliki:

1. Judul berupa pertanyaan atau konflik yang bisa dipahami.
2. Satu kalimat penghubung dengan kasus utama.
3. Visual operasi aktif beserta input/output dan identitas state.
4. Satu tombol aksi utama dengan kata kerja konkret.
5. Hasil yang membandingkan prediksi dan observasi.
6. Kesimpulan singkat serta tombol menuju pertanyaan berikutnya.

Lapisan **Angka** membuka shape, nilai, serta derivasi. Lapisan **Kode** membuka pseudocode yang sesuai dengan operasi dan model aktif. Lapisan **Asal data** menunjukkan status rekaman, contoh hitung, atau skema. Semua itu bisa dibuka tanpa memulai ulang pos.

Contoh HUD ringkas:

```text
Kasus: kunci cadangan · A: biru
Input aktif: prompt + 2 token keluaran
Posisi dipilih: 19 · token “ laci”
Blok: 1/2 · Head: 1/2 · Langkah: campurkan Value
Sumber: rekaman model mini [versi]
```

Tampilkan hanya bidang yang relevan. Pemula tidak perlu melihat head pada tokenizer atau seed pada lookup embedding.

### 13.2 Buku bukti yang tumbuh sepanjang cerita

| Kartu bukti | Kalimat pengingat | Artefak yang bisa dibuka ulang |
|---|---|---|
| Pesan dapat dibongkar | “Token bukan selalu kata.” | Tokenisasi dan rekonstruksi |
| Identitas berbeda dari lokasi | “ID sama dapat muncul di posisi berbeda.” | Dua lookup dan kontribusi posisi |
| Konteks mengubah perhitungan | “Bobot tetap; aktivasi dapat berubah.” | A/B dan titik perubahan pertama |
| Masa depan ditutup | “Prefix identik tetap identik.” | Selisih tensor dan mask |
| Attention mencampur Value | “Bobot bukan seluruh informasi.” | Weighted sum yang dibuka komponennya |
| Blok memperbarui representasi | “Semua posisi tetap ada sepanjang layer.” | Diagram blok dan dua residual |
| Output dipilih bertahap | “Satu distribusi menghasilkan satu pilihan.” | Dua langkah generation |
| Kerja lama bisa dipakai ulang | “Cache mengubah pekerjaan, bukan menambah pengetahuan.” | Perbandingan cache on/off |
| Kemampuan dipelajari | “Training memperbarui parameter.” | Satu langkah loss/gradien dan hasil uji |
| Jawaban perlu bukti | “Kelancaran bukan verifikasi.” | Klaim dan sumber pendukung |

Satu kartu menyimpan bukti lokal dari percobaan, bukan klaim bahwa semua model selalu berperilaku sama. Misalnya, “varian ini memilih hijau” tidak diperluas menjadi “model selalu mengikuti perubahan konteks dengan benar”.

### 13.3 Teks tombol yang disarankan

| Hindari jika tidak cukup spesifik | Pakai sesuai konteks |
|---|---|
| Lanjut | Lihat bagaimana ID menjadi vektor |
| Aktifkan | Terapkan mask, lalu hitung ulang |
| Benar! | Prediksimu cocok: prefix tidak berubah |
| Salah! | Periksa posisi yang berubah; bobot model tetap sama |
| Jalankan simulasi | Bandingkan kedua warna |
| Buka detail | Telusuri asal angka 0.25 |
| Selesaikan misi | Simpan bukti dan jelaskan hasil |

### 13.4 Glosarium bertahap

Istilah muncul ketika objeknya sudah terlihat:

| Istilah | Penjelasan pendek |
|---|---|
| Token | Unit teks yang mempunyai ID dalam vocabulary |
| Vocabulary | Daftar unit yang dikenali tokenizer/model |
| Vektor | Daftar angka dengan panjang tertentu |
| Tensor | Susunan angka dengan satu atau lebih sumbu |
| Shape | Ukuran setiap sumbu susunan angka |
| Parameter / bobot model | Angka yang dipelajari saat training dan dipakai untuk menghitung |
| Aktivasi | Angka yang dihasilkan perhitungan untuk input tertentu |
| Embedding | Representasi vektor yang diperoleh melalui lookup token pada profil ini |
| Head | Satu jalur proyeksi dan pencampuran attention |
| Attention weight | Koefisien pencampur Value; berbeda dari parameter model |
| Residual | Penjumlahan masukan dengan keluaran cabang perhitungan |
| Logit | Skor mentah sebuah kandidat token |
| Softmax | Operasi yang mengubah skor menjadi bobot dengan jumlah satu; skor berhingga memberi bobot positif |
| Sampling | Mengambil pilihan berdasarkan distribusi |
| Autoregresi | Menambahkan output ke urutan untuk memprediksi output berikutnya |
| Loss | Ukuran ketidakcocokan prediksi dengan target latihan |
| Gradien | Informasi perubahan loss terhadap perubahan suatu nilai/parameter |
| Inference | Menggunakan model untuk menghitung output dengan parameter yang tersedia |
| Grounding | Menghubungkan jawaban dengan informasi atau bukti yang relevan |

Untuk skor yang dimask menjadi `−∞`, softmax menghasilkan bobot nol; catatan ini muncul di Pos 05. Bobot yang sangat kecil juga dapat dibulatkan menjadi nol oleh representasi numerik atau tampilan, sehingga inspector membedakannya dari nol yang diwajibkan mask.

## 14. Annex: kedalaman tanpa memutus cerita

### A. Geometri representasi

Pertahankan ruang vektor sebagai eksplorasi tambahan. Ubah pusat pembahasannya menjadi pertanyaan **“Apa yang hilang ketika ribuan fitur digambar dalam tiga dimensi?”**

Perlihatkan sumber vektor, metode proyeksi yang dipakai, dan ketidakpastian membaca jarak setelah proyeksi. Jika hanya mengambil tiga komponen, sebut “tiga komponen terpilih”; jangan menamakannya PCA. Jika memakai PCA, fit proyeksi bersama untuk perbandingan A/B, bukan merotasi ruang secara terpisah lalu menafsirkan perpindahannya.

Analogi Tokyo − Jepang + Prancis boleh tetap menjadi contoh historis/geometris dengan label fixture atau embedding terukur. Ia bukan bukti bahwa model menjawab pertanyaan dengan aritmetika kata seperti itu, bukan hubungan universal, dan bukan target belajar utama.

### B. Mengapa disebut “large”?

Bedakan jumlah parameter, dimensi fitur, banyaknya layer, banyaknya head, panjang konteks, dan jumlah data latihan. Gunakan perbandingan skala untuk memperjelas besarnya kerja, bukan membuat pengunjung menghafal spesifikasi satu model.

Angka GPT-3 yang sudah ada dapat dipindahkan ke kartu historis dengan sumber dan profil. Jangan merender jutaan kubus seolah jumlahnya merepresentasikan setiap parameter. Jika objek mewakili sekelompok parameter, tulis agregasinya.

### C. Variasi arsitektur

Panel singkat menyebut bahwa pilihan posisi, normalisasi, MLP, attention, dan sharing bobot dapat berbeda antararsitektur. RoPE, RMSNorm, gated MLP, GQA, atau MoE merupakan pintu belajar berikutnya, bukan istilah yang wajib dikenalkan sekaligus pada tur inti.

Jika materi ini dikembangkan, setiap variasi membutuhkan rujukan dan pemetaan operasi sendiri. Jangan sekadar mengganti label mesin profil utama lalu mengklaim telah menggambarkan semua LLM modern.

### D. Batas konteks dan biaya

Tunjukkan jumlah posisi, jumlah elemen attention pada dense prefill, serta pertumbuhan cache. Untuk multi-head attention biasa pada profil lab, ukuran K/V secara konseptual sebanding dengan:

```text
2 × jumlah layer × jumlah posisi × jumlah KV head × dimensi head × bytes per nilai
```

Jumlah KV head sama dengan jumlah query head pada profil MHA ini. Arsitektur lain dapat berbeda. Rumus ini menghitung penyimpanan tensor K/V, bukan seluruh memori aplikasi, dan bukan pengukur latensi.

### E. Membaca angka tanpa menghafal rumus

Sediakan ulang contoh dot product, softmax, concat, normalization, dan residual. Setiap rumus memiliki satu contoh yang dapat dihitung manual, label dimensi, serta pemetaan ke objek visual. Kalkulus tetap opsional.

## 15. Pemetaan dari proyek yang sekarang

### 15.1 Stasiun dan konten

| Bagian sekarang | Arah perubahan | Pos tujuan |
|---|---|---|
| Tokenizer | Pertahankan mesin dan inspeksi; ganti kasus utama, perjelas profil tokenizer | 01 |
| Embedding + posisi | Pecah menjadi dua beat belajar, gunakan lookup dan penjumlahan nyata | 02–03 |
| Q/K/V | Tempatkan jelas di dalam bingkai blok; satu derivasi lebih penting dari tiga papan dekoratif | 04 |
| Causal attention | Pisahkan izin akses dari bobot dan kontribusi | 05–06 |
| Transformer | Perlihatkan keseluruhan siklus layer, termasuk attention pada layer berikutnya | 07 |
| Sampling | Kaitkan batang dengan logits aktif dan sisakan massa kandidat tersembunyi | 08 |
| KV cache | Tempelkan cache per layer pada loop; tambah invalidasi prefix | 09 |
| Analogi | Jadikan annex, dahulukan konteks dan batas proyeksi | Annex A |
| Misi fixture | Jadikan aksi pada state/trace yang sama dengan instrumen | Semua pos |
| Lencana / kristal | Hubungkan dengan kartu bukti atau jadikan dekorasi opsional | Buku bukti |
| Hint | Ubah dari instruksi kontrol menjadi prediksi dan perhatian pada bukti | Semua pos |
| Training | Konten baru pada mesin yang sudah dikenal | 10 |
| Post-training / aplikasi | Konten baru untuk membedakan model dan produk asisten | 11 |
| Bukti / retrieval / tools | Konten baru dengan arsip lokal yang konkret | 12 |
| Checkpoint akhir | Tambahkan transfer kasus dan rubrik penjelasan | 13 |

### 15.2 Misi lama menjadi misi baru

| Misi lama | Yang tetap berguna | Transformasi yang dibutuhkan |
|---|---|---|
| Bukan satu kata, satu token | Rekonstruksi teks | Pengunjung membuktikan identitas teks, bukan memilih satu setting target |
| Urutan yang hilang | Lookup dan posisi | Prediksi apa yang berubah dan tetap; hindari klaim absolut tentang model tanpa posisi |
| Tutup kebocoran masa depan | Eksperimen mask | Pasangkan dengan prefix invariance serta target training yang bergeser |
| Jembatan residual | Penjumlahan input dengan sublayer | Inspeksi komponen dan perbandingan hasil, bukan hanya menyambungkan pipa |
| Lebih beragam, bukan lebih benar | Intuisi temperature | Gunakan softmax dari logits tetap dan pilihan berulang |
| Simpan pekerjaan prefix | Reuse K/V | Verifikasi logits setara dan tunjukkan batas validitas cache |

### 15.3 Materi yang harus dipensiunkan dari jalur inti

- Narasi “ikuti satu token” jika visual menyiratkan seluruh prompt menghilang dan hanya satu kapsul melintasi model. Kita mengikuti **satu posisi dalam urutan**, dengan konteks lain tetap tersedia.
- Tampilan ukuran referensi besar pada panel yang sebenarnya sedang memperlihatkan tensor kecil.
- Persentase kualitatif yang menyamar sebagai hasil transformasi temperature numerik.
- Head yang diberi peran semantik tetap tanpa bukti dari model aktif.
- Gerakan neuron acak yang diberi makna “model sedang memahami”.
- Misi dengan satu target setting yang sudah tertulis terang dalam perintah dan jawaban dapat dibaca sebelum prediksi.
- Quiz yang seluruhnya dapat dijawab dengan mengulang istilah tanpa menafsirkan perubahan data.

## 16. Urutan pengembangan yang disarankan

Ini urutan untuk pekerjaan berikutnya. Dokumen ini tidak meminta perubahan kode sekarang.

### Tahap 1 — Buktikan bahwa kasus utuh dapat diajarkan

Siapkan satu kasus, satu varian warna, tokenizer yang jelas, dan satu sumber hasil numerik. Bangun storyboard tipis untuk pembuka → token → blok sebagai gambaran besar → kandidat → loop → asal bobot → bukti.

**Kriteria selesai:** seseorang dapat menjelaskan hubungan input, bobot, aktivasi, dan output setelah melihat rangkaian ini. Jika belum bisa, penambahan geometri dan lore belum menjadi prioritas.

### Tahap 2 — Jadikan eksperimen benar-benar terhubung

Satukan state misi dan inspector secara konseptual. Lengkapi perbandingan A/B, trace yang konsisten, suffix invariance, serta distribusi sampling yang dihitung. Pilih satu derivasi attention yang jelas dan satu loop decode yang lengkap.

**Kriteria selesai:** setiap klaim perubahan mempunyai bukti yang dapat dibuka; tidak ada jawaban yang disisipkan agar naskah terlihat benar.

### Tahap 3 — Lengkapi sebab kemampuan dan batasnya

Tambahkan training, hasil uji generalisasi, format asisten, sumber eksternal, dan kasus akhir. Pastikan narasi training menggunakan mesin yang sama secara konsep sehingga penjelasan tidak terasa seperti topik tambahan yang terpisah.

**Kriteria selesai:** pengunjung bisa membedakan belajar saat training, memakai konteks, memakai cache, dan mengambil dokumen.

### Tahap 4 — Perkuat pengalaman ruang

Perbaiki nesting blok, arah sumbu, loop, kamera, panel angka, dan pemetaan gerakan. Pertahankan eksplorasi bebas sebagai pilihan. Jika ruang lama cukup, tidak perlu membangun 14 aula terpisah.

**Kriteria selesai:** tanpa membuka uraian panjang, pengunjung dapat menunjuk input, operasi aktif, output, dan tempatnya dalam gambaran besar.

### Tahap 5 — Perluas konten berdasarkan kebutuhan nyata

Tambahkan annex, kasus lain, perbandingan arsitektur, serta rute mendalam setelah pengujian menunjukkan inti cerita bekerja. Terjemahan Inggris mengikuti istilah dan identitas kasus yang sama; jangan menerjemahkan token kasus di tengah trace tanpa mengganti datanya.

## 17. Uji ketajaman cerita sebelum dianggap selesai

### 17.1 Uji dengan calon pengunjung

Mulai dengan 5–8 orang dari audiens yang berbeda: orang yang memakai chatbot tetapi belum mengenal ML, pengembang umum, dan pembaca dengan dasar data/ML. Jumlah ini untuk menemukan hambatan desain awal, bukan menghasilkan kesimpulan statistik tentang seluruh populasi.

Catat pengetahuan awal secara singkat. Minta mereka berpikir keras sambil menjalankan tur, tetapi jangan menjelaskan jawaban ketika mereka tersesat. Tandai titik ketika mereka meminta bantuan, mengulang kontrol, atau menyimpulkan sesuatu yang tidak sesuai.

Pertanyaan setelah tur menggunakan contoh baru:

1. “Saya mengganti warna pada catatan. Apakah model harus dilatih ulang?”
2. “Token yang sama muncul dua kali. Apa yang sama dan apa yang mungkin berbeda?”
3. “Saya mengubah kata setelah posisi yang dipilih. Mengapa posisi itu tetap atau berubah?”
4. “Apa yang bercampur pada attention?”
5. “Dua layer menghasilkan berapa token dalam satu langkah generation dasar?”
6. “Mengapa logits bisa sama tetapi hasil sampling berbeda?”
7. “Apa yang dihemat cache, dan kapan cache tidak lagi valid?”
8. “Apa yang berubah saat training?”
9. “Jawaban terdengar yakin. Bukti apa yang masih perlu diperiksa?”

Minta peserta menunjuk objek atau membuka bukti ketika menjawab. Penjelasan spontan lebih bernilai daripada memilih definisi yang baru saja dibaca.

### 17.2 Tanda bahwa sebuah pos belum bekerja

- Peserta menyebut nama alat, tetapi tidak bisa menyebut apa yang berubah.
- Peserta mengira mengganti input selalu mengubah bobot.
- Peserta mengira setiap head memilih satu kata atau setiap layer menghasilkan satu kata.
- Peserta mengira attention menyalin kata utuh ke jawaban.
- Peserta tidak dapat membedakan probabilitas sebelum sampling dari satu hasil pengambilan.
- Peserta menyebut cache sebagai tempat semua pengetahuan model.
- Peserta mengerti urutan komponen tetapi tidak tahu dari mana parameter berasal.
- Peserta menyimpulkan bahwa jawaban bersumber selalu benar atau bahwa model pasti mencari internet.

Ketika ini terjadi, perbaiki aksi dan visual yang menghasilkan miskonsepsi, bukan sekadar menambah paragraf peringatan.

### 17.3 Kriteria penerimaan isi dan visual

| Pemeriksaan | Kondisi yang harus dipenuhi |
|---|---|
| Rekonstruksi token | Potongan mengembalikan teks yang dimaksud profil; whitespace terlihat saat inspeksi |
| Identitas token | ID, posisi, layer, dan langkah generation tidak tertukar |
| Lookup | Token ID sama mengambil embedding dasar sama pada checkpoint sama |
| Posisi | Mekanisme sesuai profil; tidak mencampur learned position dengan RoPE |
| Mask | Posisi masa depan memiliki bobot nol; diagonal tetap diizinkan |
| Prefix invariance | Perubahan suffix tidak memengaruhi prefix identik pada mode deterministik |
| Softmax | Normalisasi per baris yang benar; total bobot sekitar satu |
| Weighted sum | Nilai output cocok dengan bobot × Value, termasuk komponen negatif |
| Multi-head | Concat dan proyeksi ditunjukkan, tidak berubah menjadi voting token |
| Blok | QKV/attention/MLP/residual terlihat berada di dalam setiap layer |
| Normalization | Statistik diambil pada sumbu fitur posisi yang sesuai profil |
| LM head | Distribusi berikutnya berasal dari posisi terakhir konteks aktif |
| Kandidat | Probabilitas penuh dan massa “token lain” tidak menyesatkan |
| Sampling | Input/logits/temperature/filter/seed diketahui untuk perbandingan |
| Loop | Token terpilih menjadi input berikutnya; alasan berhenti terlihat |
| Cache | Membandingkan logits sebelum sampling; invalidasi dependensi ditunjukkan |
| Training | Target, loss, gradien, dan parameter dibedakan; tidak mengaku logits demo sebagai seluruh backprop |
| Trace | Label “terukur”, “contoh hitung”, dan “skema” cocok dengan sumber data |
| Semantik | Tidak ada klaim head/dimensi bermakna pasti tanpa bukti |
| Kamera | Makna sumbu tidak berubah diam-diam; objek tetap dapat dilacak |
| Akses | Misi dan bukti tersedia pada 2D, keyboard, sentuh, serta reduced motion |
| Penilaian | Prediksi dibuat sebelum hasil pembanding dibuka; kesalahan awal bisa direvisi |
| Batas pengetahuan | Dukungan catatan dibedakan dari kebenaran dunia nyata |

Daftar ini untuk penulis dan pengembang. Pengunjung tidak perlu membaca checklist sebelum masuk lab.

### 17.4 Ukuran keberhasilan

Ukuran utama adalah kemampuan menjelaskan dan memindahkan konsep ke kasus baru. Durasi kunjungan, jumlah klik, stasiun yang dipindai, atau lencana yang terkumpul hanya indikator pendukung.

Hipotesis penerimaan awal: setidaknya empat dari lima peserta awal dapat menyelesaikan kasus transfer inti tanpa penjelasan langsung dari fasilitator, dan dapat menjelaskan perbedaan bobot, konteks, serta cache dengan kata-kata sendiri. Ini target desain yang harus diuji, bukan hasil yang telah dicapai.

Jika tur terlalu panjang, padatkan pengulangan operasi atau pindahkan detail rumus ke kedalaman kedua. Jangan menghilangkan hubungan sebab-akibat, training, atau pemeriksaan bukti hanya agar angka completion naik.

## 18. Rujukan dan batas penggunaannya

Sumber primer berikut mendukung mekanisme teknis. Cerita kunci cadangan, contoh angka kecil, misi, denah, dan keputusan interaksi dalam dokumen ini adalah rancangan baru, bukan hasil penelitian yang diklaim sudah tervalidasi.

| Sumber | Dipakai untuk | Batas pemakaian |
|---|---|---|
| [Attention Is All You Need — Vaswani dkk.](https://arxiv.org/html/1706.03762v7) | Scaled dot-product attention, multi-head, position-wise feed-forward | Arsitektur paper asli encoder–decoder; tidak disamakan dengan seluruh profil decoder pre-norm lab |
| [Implementasi GPT-2](https://github.com/openai/gpt-2/blob/master/src/model.py) | Referensi susunan decoder, learned positions, normalization, residual, GELU, dan output | Referensi operasi, bukan sumber bobot atau bukti kemampuan simulator |
| [Neural Machine Translation of Rare Words with Subword Units — Sennrich dkk.](https://arxiv.org/abs/1508.07909) | Latar subword dan BPE | Segmentasi nyata tetap harus diverifikasi pada tokenizer yang dipilih |
| [How caching works — Hugging Face Transformers](https://huggingface.co/docs/transformers/main/cache_explanation) | Penggunaan ulang K/V dan dependensi prefix | Sesuaikan dengan tipe attention/model; rumus dan trace lokal tetap diverifikasi |
| [Language Models are Few-Shot Learners — Brown dkk.](https://arxiv.org/abs/2005.14165) | Contoh penggunaan konteks untuk tugas tanpa gradient update; referensi skala historis | Tidak membuktikan model mini mempunyai kemampuan serupa |
| [Training language models to follow instructions with human feedback — Ouyang dkk.](https://arxiv.org/abs/2203.02155) | Contoh instruction tuning dan umpan balik preferensi | Satu pendekatan, bukan prosedur universal seluruh asisten |
| [Retrieval-Augmented Generation — Lewis dkk.](https://arxiv.org/abs/2005.11401) | Pemisahan informasi dalam parameter dan sumber yang diambil | Tidak menganggap retrieval menjamin kebenaran |
| [Attention is not Explanation — Jain & Wallace](https://arxiv.org/abs/1902.10186) | Kehati-hatian menafsirkan attention sebagai alasan output | Temuan pada model/tugas yang diteliti, bukan dalil bahwa attention tidak pernah informatif |
| [RoFormer — Su dkk.](https://arxiv.org/abs/2104.09864) | Contoh alternatif penyandian posisi dengan rotasi | Materi perbandingan; bukan mekanisme learned position pada jalur utama |

Sumber diperiksa pada 27 Oktober 2026. Saat implementasi, catat versi atau commit untuk model, tokenizer, dan rekaman agar angka yang dilihat pengunjung dapat direproduksi.

## 19. Prinsip penutup untuk menjaga arah

Sebuah objek 3D layak masuk jika membantu pengunjung melihat hubungan yang sebelumnya sulit dibayangkan. Sebuah misi layak masuk jika menghasilkan bukti yang tidak bisa diperoleh hanya dengan membaca nama komponen. Sebuah penjelasan layak masuk jika menjawab pertanyaan yang sudah muncul dalam perjalanan.

Ukuran ketajaman cerita ini adalah kemampuan pengunjung menjawab tiga pertanyaan dengan bukti:

> **Apa yang berubah ketika input berubah?**
>
> **Dari mana mesin memperoleh cara menghitungnya?**
>
> **Apa yang masih harus diperiksa sebelum mempercayai jawabannya?**

Jika ketiganya terjawab, lab berhasil mengubah eksplorasi visual menjadi pemahaman tentang cara kerja LLM.
