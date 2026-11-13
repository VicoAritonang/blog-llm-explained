// What Nara says when asked for help. Location first, then the exact object to touch.
import { challengeKey, isStationDone, regionById, stationById, type StationId } from "./content";
import { poses, regionAt } from "./world";

/** One concrete tip per challenge: which object, which action. */
export const tips: Record<string, string> = {
  "tanya.ask": "Tombol oranye besar di kanan bertuliskan TANYA. Tekan saja!",
  "tanya.color": "Klik drum WARNA sampai warnanya berganti, lalu tekan TANYA lagi. Lihat apakah jawabannya ikut berubah.",
  "tanya.unseen": "Putar drum TEMPAT. Pasangan seperti kunci cadangan + lemari tidak pernah dilihat saat latihan; tekan TANYA dan perhatikan bintang kuning.",
  "data.load": "Klik setiap peti di rak. Isinya akan mengalir ke corong latihan di kanan.",
  "data.repeat": "Lihat label 'dibaca ...×' di depan peti. Sentuh peti dengan angka terbesar: yang kecil tapi berkualitas.",
  "data.mini": "Ada kubus hijau kecil di lantai depan: itu seluruh data model mini. Sentuh dia.",
  "token.slice": "Tarik tuas kuning di kanan rak. Catatanmu akan terpotong jadi balok bernomor.",
  "token.merge": "Kamus Inggris tidak cukup. Tekan INDONESIA, lalu +50 GABUNG beberapa kali sampai potongan di bawah 30.",
  "token.language": "Setelah 150 gabungan atau lebih, tekan bergantian INGGRIS dan INDONESIA. Grafik di layar akan membandingkannya.",
  "objektif.guess": "Klik salah satu tutup bertanda tanya di sabuk.",
  "objektif.hard": "Tekan BUKA SEMUA, lalu cari angka loss terbesar. Klik token itu.",
  "objektif.copy": "Baris ketiga adalah jawaban. Buka warna di sana dan bandingkan loss-nya dengan warna di catatan.",
  "makna.pick": "Sentuh salah satu bintang yang melayang di atas proyektor.",
  "makna.neighbors": "Cari bintang bertuliskan ·kunci. Garis kuning akan menunjuk tetangganya.",
  "makna.groups": "Sentuh satu benda, satu tempat (misalnya ·laci), dan satu warna (misalnya ·biru). Legenda di kiri akan terisi.",
  "latih.nudge": "Catatan bilang tas merah. Sentuh tiang MERAH sebagai jawaban benar, lalu tekan LATIH beberapa kali.",
  "latih.valley": "Tekan JALAN di depan lembah. Bola akan menggelinding mengikuti gradien.",
  "latih.overshoot": "Tekan + sampai ukuran langkah di atas 2, lalu JALAN. Bola akan terpental.",
  "komputasi.fire": "Tarik salah satu tuas di kiri atau kanan tungku.",
  "komputasi.gpt3": "Tarik tuas PARAMETER sampai GPT-3 175B dan tuas TOKEN sampai 300 miliar.",
  "komputasi.compare": "Sekarang putar kedua tuas sampai kembali ke model mini dan lihat selisihnya.",
  "selaras.judge": "Di dua podium ada dua jawaban. Tekan PILIH pada yang menurutmu lebih baik.",
  "selaras.honest": "Saat 'tidak diketahui' muncul, pilih dia. Kalau tidak ada, pilih yang paling sedikit mengarang.",
  "sorot.beam": "Klik salah satu tiang token di panggung. Sorotan akan muncul ke token sebelumnya.",
  "sorot.colorhead": "Klik tiang oranye kedua di bagian jawaban (tempat sebelum warna), lalu coba lampu Lapisan 2 · A dan B.",
  "sorot.mute": "Klik kotak STEKER di atas kedua lampu Lapisan 2. Jawaban di depan akan berubah.",
  "peluang.first": "Tekan tombol TULIS 1 TOKEN di kanan depan arena.",
  "peluang.eos": "Terus tekan TULIS sampai muncul balok <berhenti>.",
  "peluang.hot": "Klik kenop di tengah sampai SUHU 3,5 atau 5, lalu tulis lagi. Ulangi sampai bola mendarat di tiang pendek.",
  "cache.nocache": "Pastikan tuas CACHE: MATI, lalu tekan TULIS 1 TOKEN sampai jawaban selesai.",
  "cache.cache": "Tarik tuas jadi CACHE: NYALA, lalu tulis jawaban yang sama. Bandingkan kotak oranye di rak.",
  "cache.gpt3": "Sentuh papan kuningan RAK GPT-3 di kanan.",
  "bukti.hallucinate": "Ambil kaset merah muda 'Tanpa lokasi' dari rak kiri.",
  "bukti.fail": "Coba kaset biru 'Dua benda'. Bandingkan jawabannya dengan catatan.",
  "bukti.retrieve": "Saat kaset 'Tanpa lokasi' terpasang, tarik laci ARSIP yang menyala di kanan.",
  "skala.grow": "Tekan tombol paling kanan, 175B, di deretan depan.",
  "skala.mini": "Cari cincin hijau kecil bertanda ? di lantai: model mini terlalu kecil untuk dilihat.",
  "rakit.train": "Pikirkan urutan hidup model: data dulu, lalu dipotong, lalu soal tebakan, baru optimizer, komputasi, dan penyelarasan.",
  "rakit.run": "Saat berjalan: konteks masuk, dipotong, jadi vektor, lewat attention dengan cache, lalu diundi jadi token.",
};

export interface HintContext {
  done: Set<string>;
  mission: StationId | null;
  focus: StationId | null;
  near: StationId | null;
  fp: boolean;
  player: { x: number; z: number };
  yaw: number;
}

/** A direction word relative to where the camera looks. */
function direction(dx: number, dz: number, yaw: number) {
  let a = Math.atan2(dx, dz) - yaw;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  const d = Math.abs(a);
  if (d < 0.5) return "tepat di depanmu";
  if (d > 2.6) return "di belakangmu";
  return a < 0 ? (d < 1.6 ? "di depan kanan" : "di kananmu") : d < 1.6 ? "di depan kiri" : "di kirimu";
}

export function hint(c: HintContext): string {
  if (!c.mission) return "Semua misi sudah selesai! Buka panel Pencapaian (K) dan coba pecahkan rekor waktumu.";
  const s = stationById[c.mission];
  if (c.focus && c.focus !== c.mission) {
    const here = stationById[c.focus];
    const open = here.challenges.find((ch) => !c.done.has(challengeKey(here.id, ch.id)));
    if (open && !isStationDone(c.done, here.id)) return tips[challengeKey(here.id, open.id)] ?? open.label;
  }
  if (c.focus === c.mission) {
    const open = s.challenges.find((ch) => !c.done.has(challengeKey(s.id, ch.id)));
    return open ? tips[challengeKey(s.id, open.id)] ?? open.label : "Mesin ini selesai. Ayo ke misi berikutnya!";
  }
  const p = poses[c.mission];
  const dx = p.x - c.player.x,
    dz = p.z - c.player.z;
  const dist = Math.round(Math.hypot(dx, dz));
  if (c.near === c.mission) return c.fp ? `${s.name} sudah dekat. Melangkah ke depannya, lalu bidik tombol yang berdenyut.` : `Kita sudah di depan ${s.name}. Tekan E atau klik mesinnya untuk masuk.`;
  const here = regionAt(c.player.x, c.player.z);
  const region = regionById[s.region];
  const where = here === s.region ? "" : ` di ${region.name}`;
  return `Misi berikutnya: ${s.name}${where}, ${dist} meter ${direction(dx, dz, c.yaw)}. Ikuti tiang cahaya ${s.region === "dermaga" ? "di tengah dermaga" : "di seberang jembatan"}.`;
}
