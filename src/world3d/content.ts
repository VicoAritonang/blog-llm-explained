// Everything a visitor reads in the 3D world. Text is short on purpose: the
// station is the lesson, and an insight is only shown after the visitor has
// produced the effect it describes.
export type StationId =
  | "tanya"
  | "token"
  | "makna"
  | "sorot"
  | "peluang"
  | "latih"
  | "bukti"
  | "skala";

export interface Challenge {
  id: string;
  label: string;
  insight: { title: string; text: string };
}
export interface Station {
  id: StationId;
  name: string;
  /** One question that frames the machine. */
  hook: string;
  color: string;
  challenges: Challenge[];
  /** Camera framing when the visitor steps in. */
  frame: { distance: number; height: number; lookY: number };
}

export const stations: Station[] = [
  {
    id: "tanya",
    name: "Mesin Tanya",
    hook: "Mesin ini sebuah model bahasa sungguhan. Ubah catatannya, lalu tanyai.",
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
  {
    id: "token",
    name: "Pemotong Token",
    hook: "Model tidak membaca huruf. Apa yang sebenarnya ia baca?",
    color: "#f2c46d",
    frame: { distance: 11, height: 5.0, lookY: 2.4 },
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
          text: "Tokenizer belajar sendiri dari teks: pasangan huruf yang paling sering muncul dijadikan satu potongan, berulang-ulang.",
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
    id: "makna",
    name: "Galaksi Makna",
    hook: "Setiap token adalah satu titik di ruang 32 dimensi. Siapa tetangganya?",
    color: "#a99cf5",
    frame: { distance: 10, height: 4.6, lookY: 3.5 },
    challenges: [
      {
        id: "pick",
        label: "Sentuh satu bintang token",
        insight: {
          title: "Token adalah deret angka",
          text: "Setiap nomor token diganti dengan 32 angka hasil latihan. Galaksi ini memproyeksikan 32 dimensi itu ke 3 dimensi supaya terlihat; garis kuning dihitung dari 32 angka aslinya.",
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
  {
    id: "sorot",
    name: "Panggung Sorot",
    hook: "Saat menulis satu token, ke token mana model melihat?",
    color: "#ff9f80",
    frame: { distance: 12, height: 6.8, lookY: 1.8 },
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
    hook: "Model tidak memilih satu kata. Ia memberi peluang untuk setiap kata.",
    color: "#6fc3ff",
    frame: { distance: 13.5, height: 8.6, lookY: 1.0 },
    challenges: [
      {
        id: "first",
        label: "Tulis satu token",
        insight: {
          title: "32 tiang, satu pilihan",
          text: "Setiap langkah, model menghitung peluang untuk seluruh 32 potongan di kamusnya, mengundi satu, lalu memasukkannya kembali sebagai masukan langkah berikutnya.",
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
    id: "latih",
    name: "Bengkel Latihan",
    hook: "Bagaimana 20.256 angka acak berubah menjadi model yang bisa menjawab?",
    color: "#ffd166",
    frame: { distance: 12, height: 6.6, lookY: 1.8 },
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
    id: "bukti",
    name: "Ruang Bukti",
    hook: "Model selalu menjawab. Tapi apakah jawabannya berdasar?",
    color: "#ff7aa8",
    frame: { distance: 10.5, height: 4.8, lookY: 1.8 },
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
  {
    id: "skala",
    name: "Menara Skala",
    hook: "Model mini ini punya 20.256 angka. Seberapa besar model sungguhan?",
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
];

export const stationById = Object.fromEntries(
  stations.map((s) => [s.id, s]),
) as Record<StationId, Station>;
export const challengeKey = (station: StationId, id: string) =>
  `${station}.${id}`;
export const totalChallenges = stations.reduce(
  (n, s) => n + s.challenges.length,
  0,
);

// Stations sit on a ring facing outwards; the walking road runs outside them.
export const RING = 19;
export const ROAD = 27;
export const ISLAND = 34;
export function stationPose(index: number) {
  const angle = (index / stations.length) * Math.PI * 2;
  return {
    angle,
    x: Math.sin(angle) * RING,
    z: Math.cos(angle) * RING,
    out: [Math.sin(angle), Math.cos(angle)] as const,
  };
}
