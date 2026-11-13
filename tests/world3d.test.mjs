// The 3D world's insight cards make claims about the real checkpoint. These
// tests keep each claim true if the model is ever retrained.
import test from "node:test";
import assert from "node:assert/strict";
import model from "../src/simulation/story/checkpoint.json" with { type: "json" };
import { forward, tokenize, softmax, maxDifference } from "../src/simulation/story/engine.mjs";
import { cases } from "../src/simulation/story/cases.mjs";
import { colors, places, notePrompt, expectedAnswer, isHeldOut } from "../src/simulation/story/notes.mjs";
import { encode, mixes, probes, trainBPE } from "../src/simulation/bpe.mjs";

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
