// The 3D world's insight cards make claims about the real checkpoint. These
// tests keep each claim true if the model is ever retrained.
import test from "node:test";
import assert from "node:assert/strict";
import model from "../src/simulation/story/checkpoint.json" with { type: "json" };
import { forward, tokenize, softmax, maxDifference } from "../src/simulation/story/engine.mjs";
import { cases } from "../src/simulation/story/cases.mjs";
import { colors, places, notePrompt, expectedAnswer, isHeldOut } from "../src/simulation/story/notes.mjs";
import { encode, mixes, probes, trainBPE } from "../src/simulation/bpe.mjs";
import { datasetMix, trainingFlops, pfDays, kvCacheBytes } from "../src/simulation/gpt3.mjs";

const ids = (text) => tokenize(text, model).map((t) => t.id);
function greedy(prompt, mutedHeads = []) {
  const seq = ids(prompt),
    out = [],
    probs = [];
  for (let i = 0; i < 8; i++) {
    const p = softmax(forward(seq, model, { mutedHeads }).lastLogits);
    const best = p.indexOf(Math.max(...p));
    if (model.vocab[best] === "<eos>") break;
    out.push(model.vocab[best]);
    probs.push(p[best]);
    seq.push(best);
  }
  return { text: out.join(""), probs };
}
const notes = [];
for (let o = 0; o < 4; o++) for (let p = 0; p < 4; p++) for (let c = 0; c < 4; c++) notes.push([o, p, c]);

test("muting no heads leaves the forward pass unchanged", () => {
  const seq = ids(cases.blue.prompt);
  assert.equal(maxDifference(forward(seq, model).logits, forward(seq, model, { mutedHeads: [] }).logits), 0);
});

test("Mesin Tanya: held-out note/place pairs are still answered correctly", () => {
  const held = notes.filter(([o, p]) => isHeldOut(o, p));
  assert.ok(held.length > 0);
  for (const [o, p, c] of held) assert.equal(greedy(notePrompt(o, p, c)).text, expectedAnswer(p, c));
});

test("Panggung Sorot: for every note a layer-2 head copies the colour", () => {
  for (const [o, p, c] of notes) {
    const prompt = ids(notePrompt(o, p, c));
    const trace = forward([...prompt, ...ids(expectedAnswer(p, c))], model);
    const query = prompt.length + 1;
    const color = prompt.indexOf(model.vocab.indexOf(` ${colors[c]}`));
    const best = Math.max(...[0, 1].map((h) => trace.blocks[1].heads[h].A[query][color]));
    assert.ok(best > 0.9, `note ${o}${p}${c}: ${best}`);
  }
});

test("Panggung Sorot: one layer-2 head alone is not enough to break it, both are", () => {
  let survivedOne = 0;
  for (const [o, p, c] of notes) {
    const prompt = notePrompt(o, p, c);
    const both = greedy(prompt, ["1.0", "1.1"]).text;
    if (colors[c] !== "merah") assert.notEqual(both.trim().split(" ")[2], colors[c] + ".", `note ${o}${p}${c}`);
    if (greedy(prompt, ["1.1"]).text === expectedAnswer(p, c) || greedy(prompt, ["1.0"]).text === expectedAnswer(p, c)) survivedOne++;
  }
  assert.ok(survivedOne > notes.length / 2);
});

test("Ruang Bukti: no location, yet a confident location", () => {
  const { text, probs } = greedy(cases.missing.prompt);
  assert.match(text, new RegExp(`^ di (${places.join("|")}) (${colors.join("|")})\\.$`));
  const confidence = Math.exp(probs.reduce((s, p) => s + Math.log(p), 0) / probs.length);
  assert.ok(confidence > 0.8, String(confidence));
  assert.notEqual(greedy(cases.two.prompt).text, cases.two.support, "two-object case should fail");
  assert.equal(greedy(cases.green.prompt).text, cases.green.support, "retrieved note grounds the answer");
});

test("Pemotong Token: an English-trained tokenizer splits Indonesian far more", () => {
  const en = encode(probes.id, trainBPE(mixes.en.corpus, 200)).length;
  const id = encode(probes.id, trainBPE(mixes.id.corpus, 200)).length;
  assert.ok(id < 30, `id ${id}`);
  assert.ok(en >= 30 && en >= id * 2, `en ${en} vs id ${id}`);
});

// ---- Archipelago: claims made by the new missions ---------------------------
const EOS = model.vocab.indexOf("<eos>");
const lossAt = (text) => {
  const seq = [...ids(text), EOS];
  const logits = forward(seq, model).logits;
  return seq.map((id, i) => (i ? -Math.log(softmax(logits[i - 1])[id]) : null));
};

test("Gudang Data: Wikipedia is the source read most often, Common Crawl less than once", () => {
  const most = datasetMix.reduce((a, b) => (b.epochs > a.epochs ? b : a));
  assert.equal(most.name, "Wikipedia");
  assert.ok(datasetMix.find((d) => d.name.startsWith("Common Crawl")).epochs < 1);
  assert.equal(model.training.trainExamples, 336);
});

test("Sabuk Tebakan: the mini model was trained on answer positions only, and it shows", () => {
  assert.match(model.training.objective, /answer positions/);
  const prompt = ids(cases.blue.prompt).length;
  const loss = lossAt(cases.blue.prompt + cases.blue.support);
  const answer = loss.slice(prompt);
  const before = loss.slice(1, prompt);
  assert.ok(Math.max(...answer) < 0.05, `answer loss ${Math.max(...answer)}`);
  assert.ok(Math.max(...before) > 5, `prompt loss ${Math.max(...before)}`);
});

test("Tungku Komputasi: 6·N·D reproduces GPT-3's compute and dwarfs the mini model", () => {
  const gpt3 = trainingFlops(175e9, 300e9);
  assert.ok(Math.abs(gpt3 / 3.14e23 - 1) < 0.01);
  assert.ok(Math.abs(pfDays(gpt3) - 3640) < 20);
  let tokens = 0;
  for (let o = 0; o < 4; o++) for (let p = 0; p < 4; p++) for (let c = 0; c < 4; c++) tokens += ids(notePrompt(o, p, c) + expectedAnswer(p, c)).length + 1;
  const mini = trainingFlops(model.training.parameterCount, model.training.steps * model.training.batchSize * (tokens / 64));
  assert.ok(mini > 1e11 && mini < 1e12, String(mini));
  assert.ok(gpt3 / mini > 1e12, "more than a trillion times");
});

test("Aula Penyelarasan: the model starts out preferring the hallucination", () => {
  const logProb = (answer) => {
    const prompt = ids(cases.missing.prompt);
    const tail = [...ids(answer), EOS];
    const logits = forward([...prompt, ...tail], model).logits;
    return tail.reduce((s, id, k) => s + Math.log(softmax(logits[prompt.length + k - 1])[id]), 0);
  };
  const [halu, honest, other] = [" di laci kuning.", " tidak diketahui.", " di tas merah."].map(logProb);
  assert.ok(halu > other && other > honest, `${halu} ${other} ${honest}`);
});

test("Gudang Cache: GPT-3 keeps about 4.7 MB per token, 9.7 GB for a full context", () => {
  const perToken = kvCacheBytes({ layers: 96, headWidth: 128, kvHeads: 96, context: 1 });
  assert.ok(Math.abs(perToken / 1e6 - 4.72) < 0.01);
  assert.ok(Math.abs(kvCacheBytes({ layers: 96, headWidth: 128, kvHeads: 96, context: 2048 }) / 1e9 - 9.66) < 0.01);
});
