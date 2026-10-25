import { t } from "../i18n/core.mjs";
export const missions = [
  {
    id: "pieces",
    station: "tokenizer",
    title: t("Bukan satu kata, satu token"),
    tag: "01 / TOKEN ENGINEER",
    goal: t(
      "Pecah kata terpanjang menjadi dua bagian dan pertahankan teks asal.",
    ),
    parameter: t("Segmentasi"),
    options: [t("Potongan utuh"), t("Pisah subword")],
    target: 1,
    choices: [
      t("Teks tetap sama, jumlah token berubah"),
      t("Teks asli ikut berubah"),
    ],
    answer: 0,
    lesson: t(
      "Batas token tidak harus sama dengan batas kata. Dua segmentasi bisa merekonstruksi teks yang sama. Ini fixture ilustratif, bukan tokenizer GPT-3.",
    ),
    readings: [
      t("4 keping • teks: The curious cat sleeps"),
      t("5 keping • teks: The curious cat sleeps"),
    ],
  },
  {
    id: "positions",
    station: "embedding",
    title: t("Urutan yang hilang"),
    tag: "02 / POSITION KEEPER",
    goal: t(
      "Aktifkan penanda posisi pada tiga token agar urutannya dapat dibedakan.",
    ),
    parameter: t("Informasi posisi"),
    options: [t("Tanpa posisi"), t("Posisi aktif")],
    target: 1,
    choices: [
      t("ID token menjadi nomor posisi"),
      t("Vektor posisi ditambahkan ke embedding"),
    ],
    answer: 1,
    lesson: t(
      "Embedding token yang sama tetap berasal dari baris lookup yang sama. Penambahan vektor posisi memberi informasi tentang lokasi token di urutan.",
    ),
    readings: [
      t("3 embedding • penanda urutan tidak aktif"),
      t("3 embedding + 3 vektor posisi"),
    ],
  },
  {
    id: "causal",
    station: "attention",
    title: t("Tutup kebocoran masa depan"),
    tag: "03 / CAUSAL GUARDIAN",
    goal: t(
      "Pasang causal mask: Query pada posisi 2 hanya boleh melihat posisi 0, 1, dan 2.",
    ),
    parameter: "Causal mask",
    options: [t("Mask dilepas"), t("Mask terpasang")],
    target: 1,
    choices: [
      t("Dua posisi masa depan mendapat bobot nol"),
      t("Semua posisi menjadi tidak terlihat"),
    ],
    answer: 0,
    lesson: t(
      "Mask memberi skor −∞ sebelum softmax pada posisi masa depan. Bobot untuk posisi tersebut menjadi nol. Posisi saat ini tetap boleh diakses.",
    ),
    readings: [
      t("5 jalur terbuka • 2 jalur masa depan bocor"),
      t("3 jalur valid • 2 jalur masa depan diblokir"),
    ],
  },
  {
    id: "residual",
    station: "transformer",
    title: t("Jembatan residual"),
    tag: "04 / CIRCUIT BUILDER",
    goal: t("Sambungkan jalur input langsung ke penjumlahan setelah sublayer."),
    parameter: t("Jalur residual"),
    options: [t("Jalur terputus"), t("Jalur tersambung")],
    target: 1,
    choices: [
      t("Residual menggantikan attention"),
      t("Input ditambahkan ke hasil sublayer"),
    ],
    answer: 1,
    lesson: t(
      "Keluaran residual adalah x + F(x). Jalur ini mempertahankan kontribusi input dan mendukung aliran gradien saat training; ia tidak menjamin fakta atau mencegah halusinasi.",
    ),
    readings: [
      "Fixture: F(x) = [0.2, −0.1, 0.3]",
      "Fixture: x + F(x) = [1.2, 0.9, 1.3]",
    ],
  },
  {
    id: "temperature",
    station: "sampling",
    title: t("Lebih beragam, bukan lebih benar"),
    tag: "05 / DISTRIBUTION PILOT",
    goal: t(
      "Pilih temperature hangat untuk meratakan distribusi tiga kandidat ilustratif.",
    ),
    parameter: "Temperature",
    options: [t("Dingin · 0.3"), t("Netral · 1.0"), t("Hangat · 1.8")],
    target: 2,
    choices: [
      t("Distribusi lebih rata, kebenaran tidak dijamin"),
      t("Semua jawaban pasti lebih akurat"),
    ],
    answer: 0,
    lesson: t(
      "Temperature mengubah ketajaman distribusi sebelum sampling. Di sini tinggi tabung memakai fixture kualitatif, bukan hasil softmax numerik. Tab Angka di catatan menyediakan perhitungan model mainan.",
    ),
    readings: [
      t("Fixture kandidat A/B/C: 90% / 8% / 2%"),
      t("Fixture kandidat A/B/C: 60% / 25% / 15%"),
      t("Fixture kandidat A/B/C: 40% / 33% / 27%"),
    ],
  },
  {
    id: "memory",
    station: "cache",
    title: t("Simpan pekerjaan prefix"),
    tag: "06 / CACHE ARCHITECT",
    goal: t(
      "Aktifkan KV cache untuk memakai kembali K/V empat token lama saat satu token baru datang.",
    ),
    parameter: "KV cache",
    options: [t("Cache nonaktif"), t("Cache aktif")],
    target: 1,
    choices: [
      t("Query baru tidak lagi dihitung"),
      t("K/V lama dipakai ulang; Query baru tetap dihitung"),
    ],
    answer: 1,
    lesson: t(
      "Cache menyimpan K/V per layer untuk prefix urutan ini, bukan bobot atau ingatan lintas pengguna. Query baru tetap berinteraksi dengan seluruh K/V yang diizinkan. Ini hitungan kerja ilustratif, bukan benchmark latensi.",
    ),
    readings: [
      t("5 posisi diproyeksikan ulang • 0 pasangan K/V dipakai ulang"),
      t("1 posisi baru diproyeksikan • 4 pasangan K/V dipakai ulang"),
    ],
  },
];
export function evaluateTrial(id, setting, prediction) {
  const m = missions.find((m) => m.id === id);
  if (
    !m ||
    !Number.isInteger(setting) ||
    setting < 0 ||
    setting >= m.options.length ||
    ![0, 1].includes(prediction)
  )
    return {
      passed: false,
      reason: t("Pilih prediksi terlebih dahulu, lalu jalankan uji."),
    };
  if (setting !== m.target)
    return {
      passed: false,
      reason: t(
        "Belum sesuai tujuan. Teramati: {0}. Ubah {1} dan coba lagi.",
        m.readings[setting],
        m.parameter.toLowerCase(),
      ),
    };
  if (prediction !== m.answer)
    return {
      passed: false,
      reason: t(
        "Konfigurasi sudah sesuai, tetapi prediksi belum cocok. {0}",
        m.lesson,
      ),
    };
  return { passed: true, reason: m.lesson };
}
export const candidateFixtures = [
  [0.9, 0.08, 0.02],
  [0.6, 0.25, 0.15],
  [0.4, 0.33, 0.27],
];
