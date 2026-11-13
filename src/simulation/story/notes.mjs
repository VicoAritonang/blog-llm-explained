// The note grammar the checkpoint was trained on. Order matches
// scripts/train-story-model.py: the held-out split is computed from these indices.
export const objects = [
  "kunci cadangan",
  "kartu akses",
  "buku catatan",
  "dompet kecil",
];
export const places = ["laci", "tas", "kotak", "lemari"];
export const colors = ["biru", "hijau", "merah", "kuning"];

export const noteText = (o, p, c) =>
  `${objects[o]} ada di ${places[p]} ${colors[c]}`;
export const notePrompt = (o, p, c) =>
  `Catatan: ${noteText(o, p, c)}.\nPertanyaan: Di mana ${objects[o]}?\nJawaban:`;
export const expectedAnswer = (p, c) => ` di ${places[p]} ${colors[c]}.`;
// Whole object/location pairs were withheld from training, for every color.
export const isHeldOut = (o, p) => (o + p) % 4 === 3;
export const totalNotes = objects.length * places.length * colors.length;
