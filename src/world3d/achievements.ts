// Achievements and the speed-run record. Each one is earned by doing, never by reading.
export interface Achievement {
  id: string;
  title: string;
  text: string;
}
export const SPEEDRUN_MINUTES = 25;
export const achievements: Achievement[] = [
  { id: "pertama", title: "Temuan pertama", text: "Dapatkan kartu temuan pertamamu." },
  { id: "bab1", title: "Lulus Fase Belajar", text: "Selesaikan semua misi di Hutan Data." },
  { id: "bab2", title: "Lulus Fase Optimasi", text: "Selesaikan semua misi di Pegunungan Loss." },
  { id: "bab3", title: "Lulus Fase Berjalan", text: "Selesaikan semua misi di Kota Inferensi." },
  { id: "gpt3", title: "GPT-3 bangun", text: "Selesaikan ke-39 tantangan." },
  { id: "kilat", title: "Pelari kilat", text: `Selesaikan semua misi dalam waktu kurang dari ${SPEEDRUN_MINUTES} menit.` },
  { id: "mandiri", title: "Mandiri", text: "Selesaikan semua misi dengan paling banyak 3 petunjuk dari Nara." },
  { id: "sempurna", title: "Cetak biru sempurna", text: "Rakit kedua jalur GPT-3 tanpa satu pun salah pasang." },
  { id: "pindai", title: "Pemindai ulung", text: "Pindai ke-14 mesin dengan Pemindai." },
  { id: "arsitek", title: "Arsitek kata", text: "Pasang 10 balok token." },
  { id: "bisik", title: "Pembisik Oracle", text: "Susun balok sampai Oracle menebak sebuah warna dengan peluang di atas 50%." },
  { id: "penjelajah", title: "Penjelajah", text: "Injak kelima pulau dengan kakimu sendiri." },
  { id: "mata", title: "Mata pertama", text: "Jelajahi dunia dalam mode orang pertama." },
  { id: "kutu", title: "Kutu buku", text: "Tamatkan ke-12 buku di mimbar seluruh pulau." },
];
export const achievementById = Object.fromEntries(achievements.map((a) => [a.id, a])) as Record<string, Achievement>;

export const clock = (seconds: number) => {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    r = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(r)}` : `${two(m)}:${two(r)}`;
};
