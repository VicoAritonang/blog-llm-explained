// Small but real byte-pair encoding, trained in the browser. It merges Unicode
// characters rather than UTF-8 bytes, so it shows the algorithm, not GPT-2's
// actual vocabulary or token IDs.
export const corpora = {
  id: `Kunci cadangan ada di laci meja kerja.
Kami belajar membaca data setiap hari di kantor.
Program ini membaca berkas dan menulis hasilnya ke layar.
Tim kami memperbaiki kesalahan pada aplikasi kemarin malam.
Pengguna menyimpan catatan penting di dalam folder baru.
Mesin ini menghitung peluang untuk kata berikutnya.
Saya menulis kode sebelum rapat dimulai pagi ini.
Sistem mengirim pesan ketika pekerjaan sudah selesai.
Data yang besar membutuhkan waktu lebih lama untuk dibaca.
Mereka membangun layanan baru untuk pelanggan di kota ini.
Setiap permintaan dicatat agar mudah diperiksa nanti.
Kesalahan kecil dapat membuat seluruh proses berhenti.
Dokumen itu menjelaskan cara memasang aplikasi di komputer.
Pengembang memeriksa hasil pengujian sebelum perubahan dikirim.
Model belajar dari banyak contoh yang sudah dikumpulkan.
Jawaban yang lancar belum tentu benar dan perlu diperiksa.
Kami menyimpan salinan data di tempat yang berbeda.
Perubahan kecil pada masukan dapat mengubah keluaran program.
Pelanggan bertanya tentang harga layanan bulan depan.
Laporan harian dikirim ke semua anggota tim setiap sore.`,
  en: `The spare key is in the drawer of the work desk.
We learn to read data every day at the office.
This program reads the file and writes the result to the screen.
Our team fixed the bug in the application last night.
The user saves important notes inside a new folder.
This machine computes the probability of the next word.
I write the code before the meeting starts this morning.
The system sends a message when the job is finished.
Large data needs more time to be read.
They build a new service for customers in this city.
Every request is logged so it is easy to check later.
A small mistake can make the whole process stop.
That document explains how to install the application on a computer.
Developers check the test results before the change is sent.
The model learns from many examples that were collected.
A fluent answer is not always correct and needs to be checked.
We keep a copy of the data in a different place.
A small change to the input can change the program output.
The customer asks about the price of the service next month.
A daily report is sent to all team members every afternoon.`,
};
// Translations of each other, and absent from both corpora, so the comparison
// below measures the tokenizer rather than memorised sentences.
export const probes = {
  id: "Aplikasi ini menyimpan pesan pelanggan dan memeriksa kesalahan setiap hari.",
  en: "This application saves customer messages and checks for mistakes every day.",
};
export const mixes = {
  en: { label: "Hanya Inggris", corpus: corpora.en },
  mixed: { label: "Campuran", corpus: `${corpora.en}\n${corpora.id}` },
  id: { label: "Hanya Indonesia", corpus: corpora.id },
};

// Words keep their leading space, as GPT-2's pre-tokenizer does, so joining the
// pieces always restores the original text.
export const pretokenize = (text) => text.match(/\s*[^\s]+|\s+$/g) ?? [];

export function trainBPE(corpus, limit = 300) {
  const words = new Map();
  for (const word of pretokenize(corpus))
    words.set(word, (words.get(word) ?? 0) + 1);
  let entries = [...words].map(([word, count]) => ({
    symbols: [...word],
    count,
  }));
  const merges = [];
  while (merges.length < limit) {
    const pairs = new Map();
    for (const { symbols, count } of entries)
      for (let i = 0; i < symbols.length - 1; i++) {
        const key = `${symbols[i]}\u0000${symbols[i + 1]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + count);
      }
    let bestKey = null,
      bestCount = 1;
    for (const [key, count] of pairs)
      if (
        count > bestCount ||
        (count === bestCount && bestKey && key < bestKey)
      ) {
        bestKey = key;
        bestCount = count;
      }
    if (!bestKey) break;
    const [left, right] = bestKey.split("\u0000");
    merges.push({ left, right, merged: left + right, count: bestCount });
    entries = entries.map(({ symbols, count }) => ({
      symbols: applyMerge(symbols, left, right),
      count,
    }));
  }
  return merges;
}

function applyMerge(symbols, left, right) {
  const out = [];
  for (let i = 0; i < symbols.length; i++) {
    if (symbols[i] === left && symbols[i + 1] === right) {
      out.push(left + right);
      i++;
    } else out.push(symbols[i]);
  }
  return out;
}

export function encode(text, merges, steps = merges.length) {
  return pretokenize(text).flatMap((word) => {
    let symbols = [...word];
    for (const { left, right } of merges.slice(0, steps))
      symbols = applyMerge(symbols, left, right);
    return symbols;
  });
}

export const wordCount = (text) =>
  text.trim().split(/\s+/).filter(Boolean).length;
export const tokensPerWord = (text, merges, steps = merges.length) =>
  wordCount(text) ? encode(text, merges, steps).length / wordCount(text) : 0;
