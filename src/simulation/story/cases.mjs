const prompt = (note) =>
  `Catatan: ${note}.\nPertanyaan: Di mana kunci cadangan?\nJawaban:`;
export const cases = {
  blue: {
    id: "blue",
    title: "Kunci · laci biru",
    prompt: prompt("kunci cadangan ada di laci biru"),
    support: " di laci biru.",
    provenance: "Contoh terpilih; kombinasi termasuk data latihan.",
  },
  green: {
    id: "green",
    title: "Kunci · laci hijau",
    prompt: prompt("kunci cadangan ada di laci hijau"),
    support: " di laci hijau.",
    provenance: "Pembanding warna; hanya ID posisi 7 berubah.",
  },
  location: {
    id: "location",
    title: "Kunci · tas biru",
    prompt: prompt("kunci cadangan ada di tas biru"),
    support: " di tas biru.",
    provenance: "Pembanding lokasi; hanya ID lokasi berubah.",
  },
  transfer: {
    id: "transfer",
    title: "Kartu · tas merah",
    prompt:
      "Catatan: kartu akses ada di tas merah.\nPertanyaan: Di mana kartu akses?\nJawaban:",
    support: " di tas merah.",
    provenance:
      "Transfer untuk pengunjung; bukan klaim contoh ini di luar data latihan.",
  },
  heldout: {
    id: "heldout",
    title: "Kunci · lemari kuning",
    prompt: prompt("kunci cadangan ada di lemari kuning"),
    support: " di lemari kuning.",
    provenance:
      "Kombinasi benda–lokasi ditahan dari training, termasuk semua warnanya.",
  },
  missing: {
    id: "missing",
    title: "Lokasi tidak diberikan",
    prompt: prompt("kunci cadangan"),
    support: null,
    provenance:
      "Diagnostik di luar distribusi latihan. Tidak ada lokasi yang mendukung jawaban.",
  },
  conflict: {
    id: "conflict",
    title: "Dua catatan bertentangan",
    prompt: prompt(
      "kunci cadangan ada di laci biru; kunci cadangan ada di tas hijau",
    ),
    support: null,
    provenance:
      "Dua klaim tanpa waktu/sumber pembeda. Di luar tugas latihan; jawaban tidak menyelesaikan pertentangan.",
  },
  two: {
    id: "two",
    title: "Dua benda · cari kunci",
    prompt: prompt(
      "kartu akses ada di tas merah; kunci cadangan ada di laci biru",
    ),
    support: " di laci biru.",
    provenance: "Dua benda; lokasi benda yang ditanyakan harus dibedakan.",
  },
};
export const archive = [
  {
    id: "arsip-01",
    title: "Catatan penjaga · 28 Oktober 2026, 08.00",
    subject: "kunci cadangan",
    note: "kunci cadangan ada di laci hijau",
    caseId: "green",
  },
  {
    id: "arsip-02",
    title: "Daftar perlengkapan · 27 Oktober 2026",
    subject: "buku catatan",
    note: "buku catatan ada di kotak kuning",
    caseId: null,
  },
];
export function retrieve(query) {
  const words = query
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  return archive
    .map((doc) => ({
      ...doc,
      score: words.filter((word) => doc.subject.includes(word)).length,
    }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score);
}
