// Thin, typed layer over the trained mini decoder. Every number the 3D world
// shows is computed here, live, from the same checkpoint the tests verify.
import checkpoint from "../simulation/story/checkpoint.json";
import {
  tokenize,
  forward,
  distribution,
  softmax,
  dot,
} from "../simulation/story/engine.mjs";
import {
  objects,
  places,
  colors,
  noteText,
  notePrompt,
  isHeldOut,
  expectedAnswer,
} from "../simulation/story/notes.mjs";
import { cases, retrieve } from "../simulation/story/cases.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const model: any = checkpoint;
export const vocab: string[] = model.vocab;
export const EOS = vocab.indexOf("<eos>");
export const PARAMETERS: number = model.training.parameterCount;
export const lossHistory: { step: number; trainLoss: number }[] =
  model.training.history;
export { objects, places, colors, noteText, notePrompt, isHeldOut, cases, retrieve };

export interface Token {
  id: number;
  text: string;
}
/** How a token reads on a block: spaces and newlines made visible. */
export const show = (text: string) =>
  text === "<eos>"
    ? "<berhenti>"
    : text.replace(/^ /, "·").replace(/\n/g, "↵");
export const promptTokens = (text: string): Token[] =>
  tokenize(text, model).map((t: Token) => ({ id: t.id, text: t.text }));

export interface Answer {
  tokens: (Token & { p: number })[];
  text: string;
  /** Geometric mean of the chosen tokens' probabilities. */
  confidence: number;
}
/** Greedy answer, optionally with some attention heads switched off. */
export function answer(
  prompt: string,
  { mutedHeads = [] as string[], limit = 8 } = {},
): Answer {
  const ids = promptTokens(prompt).map((t) => t.id);
  const tokens: Answer["tokens"] = [];
  for (let i = 0; i < limit; i++) {
    const probs = softmax(forward(ids, model, { mutedHeads }).lastLogits);
    let best = 0;
    probs.forEach((p: number, j: number) => {
      if (p > probs[best]) best = j;
    });
    tokens.push({ id: best, text: vocab[best], p: probs[best] });
    if (best === EOS) break;
    ids.push(best);
  }
  const content = tokens.filter((t) => t.id !== EOS);
  const confidence = Math.exp(
    content.reduce((s, t) => s + Math.log(t.p), 0) / Math.max(1, content.length),
  );
  return { tokens, text: content.map((t) => t.text).join(""), confidence };
}
export const noteAnswer = (o: number, p: number, c: number) => ({
  prompt: notePrompt(o, p, c) as string,
  expected: expectedAnswer(p, c) as string,
  heldOut: isHeldOut(o, p) as boolean,
});

/** Full trace (attention maps per layer/head) for a token sequence. */
export function trace(ids: number[], mutedHeads: string[] = []) {
  return forward(ids, model, { mutedHeads });
}

/** Next-token distribution with a temperature; 0 means always the top one. */
export function nextToken(ids: number[], temperature: number, seed: number) {
  const logits = forward(ids, model).lastLogits;
  const d = distribution(logits, {
    temperature,
    seed,
    greedy: temperature === 0,
  });
  return {
    probabilities: (temperature === 0 ? d.base : d.probabilities) as number[],
    base: d.base as number[],
    selected: d.selected as number,
  };
}

// --- Embedding geometry -----------------------------------------------------
const E: number[][] = model.weights.E;
const cosine = (a: number[], b: number[]) =>
  dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b));
export function neighbors(id: number, count = 3) {
  return E.map((row, j) => ({ id: j, sim: cosine(E[id], row) }))
    .filter((x) => x.id !== id)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, count);
}
let projected: [number, number, number][] | null = null;
/** First three principal components of the embedding table, scaled to ±1. */
export function embedding3d() {
  if (projected) return projected;
  const n = E.length,
    d = E[0].length;
  const mean = Array.from({ length: d }, (_, c) => E.reduce((s, r) => s + r[c], 0) / n);
  const X = E.map((r) => r.map((v, c) => v - mean[c]));
  const C = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) / n),
  );
  const components: number[][] = [];
  for (let k = 0; k < 3; k++) {
    let v = Array.from({ length: d }, (_, i) => Math.sin(i * 1.7 + k + 1));
    for (let it = 0; it < 200; it++) {
      let w = C.map((row) => dot(row, v));
      for (const u of components) {
        const proj = dot(w, u);
        w = w.map((x, i) => x - proj * u[i]);
      }
      const len = Math.sqrt(dot(w, w)) || 1;
      v = w.map((x) => x / len);
    }
    components.push(v);
  }
  const pts = X.map((r) => components.map((u) => dot(r, u)));
  // Standardise each axis, then compress the radius so a few outliers do not
  // squeeze everything else into the middle. Directions are kept as they are.
  const std = [0, 1, 2].map((k) => Math.sqrt(pts.reduce((s, p) => s + p[k] ** 2, 0) / n) || 1);
  const z = pts.map((p) => p.map((x, k) => x / std[k]));
  const radii = z.map((p) => Math.hypot(...p) || 1e-9);
  const order = radii.map((r, i) => [r, i]).sort((a, b) => a[0] - b[0]);
  const rank = new Array(n);
  order.forEach(([, i], k) => (rank[i] = k));
  // Radius by rank: nearer the centre stays nearer, but evenly spread.
  projected = z.map((p, i) => {
    const target = 0.3 + (0.7 * rank[i]) / (n - 1);
    return p.map((x) => (x / radii[i]) * target) as [number, number, number];
  });
  return projected;
}

export type Category = "benda" | "tempat" | "warna" | "struktur";
export function category(text: string): Category {
  const t = text.trim();
  if (["kunci", "cadangan", "kartu", "akses", "buku", "catatan", "dompet", "kecil"].includes(t))
    return "benda";
  if (["laci", "tas", "kotak", "lemari"].includes(t)) return "tempat";
  if (["biru", "hijau", "merah", "kuning"].includes(t)) return "warna";
  return "struktur";
}
export const categoryColor: Record<Category, string> = {
  benda: "#7be0c3",
  tempat: "#f2c46d",
  warna: "#ff7aa8",
  struktur: "#8aa3b8",
};
/** Display colour for a colour word, so the world can paint with it. */
export const paint: Record<string, string> = {
  biru: "#4f9dff",
  hijau: "#4fd17f",
  merah: "#ff5a5a",
  kuning: "#ffd23f",
};
