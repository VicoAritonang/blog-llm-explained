import test from "node:test";
import assert from "node:assert/strict";
import model from "../src/simulation/story/checkpoint.json" with { type: "json" };
import evaluation from "../src/simulation/story/evaluation.json" with { type: "json" };
import {
  forward,
  tokenize,
  decode,
  generate,
} from "../src/simulation/story/engine.mjs";
import { cases } from "../src/simulation/story/cases.mjs";
import {
  objects,
  places,
  colors,
  notePrompt,
  expectedAnswer,
  isHeldOut,
  totalNotes,
} from "../src/simulation/story/notes.mjs";
import {
  gpt3,
  gpt3Models,
  datasetMix,
  epochsFromWeight,
  parameterBreakdown,
  trainingFlops,
  pfDays,
  averageVisible,
  forwardFlops,
  kvCacheBytes,
  weightBytes,
  batchWhereCacheExceedsWeights,
  computeOptimal,
  demonstrationsThatFit,
  PAPER_TOTAL_FLOPS,
  PAPER_PF_DAYS,
  TRAINING_TOKENS,
} from "../src/simulation/gpt3.mjs";
import {
  corpora,
  probes,
  mixes,
  pretokenize,
  trainBPE,
  encode,
  tokensPerWord,
} from "../src/simulation/bpe.mjs";

const ids = (text) => tokenize(text, model).map((t) => t.id);
const each = (fn) => {
  for (let o = 0; o < objects.length; o++)
    for (let p = 0; p < places.length; p++)
      for (let c = 0; c < colors.length; c++) fn(o, p, c);
};

test("note builder reproduces the trained prompt format", () => {
  assert.equal(notePrompt(0, 0, 0), cases.blue.prompt);
  assert.equal(notePrompt(0, 0, 1), cases.green.prompt);
  assert.equal(notePrompt(1, 1, 2), cases.transfer.prompt);
  assert.equal(notePrompt(0, 3, 3), cases.heldout.prompt);
});
test("every note a beginner can build gets the answer the lab promises", () => {
  let count = 0;
  each((o, p, c) => {
    const output = generate(ids(notePrompt(o, p, c)), model).output;
    assert.equal(decode(output, model), `${expectedAnswer(p, c)}<eos>`);
    count++;
  });
  assert.equal(count, totalNotes);
});
test("held-out badge agrees with the published evaluation split", () => {
  const split = new Map(
    evaluation
      .filter((e) => e.promptIds.length === 18)
      .map((e) => [e.promptIds.join(), e.split]),
  );
  each((o, p, c) => {
    const key = ids(notePrompt(o, p, c)).join();
    assert.equal(split.get(key), isHeldOut(o, p) ? "held-out" : "train");
  });
});
test("the focus mission's claim holds: block 2 head 2 reads the color word in every note", () => {
  let otherHead = 0;
  each((o, p, c) => {
    const run = generate(ids(notePrompt(o, p, c)), model);
    const context = run.steps[2].ids;
    const heads = forward(context, model).blocks[1].heads;
    const focus = (row) => model.vocab[context[row.indexOf(Math.max(...row))]];
    assert.equal(focus(heads[1].A.at(-1)), ` ${colors[c]}`);
    const colorPosition = context.findIndex(
      (id) => model.vocab[id] === ` ${colors[c]}`,
    );
    assert.ok(heads[1].A.at(-1)[colorPosition] > 0.9);
    if (focus(heads[0].A.at(-1)) === ` ${colors[c]}`) otherHead++;
  });
  // Quoted in the Mahir notes as evidence that heads hold no fixed job.
  assert.equal(otherHead, 48);
});
test("beginner verification cases keep their real, unflattering outputs", () => {
  const out = (key) =>
    decode(generate(ids(cases[key].prompt), model).output, model);
  assert.equal(out("missing"), " di laci kuning.<eos>");
  assert.equal(out("two"), " di laci kuning.<eos>");
  assert.equal(out("conflict"), " di laci biru.<eos>");
});

test("parameter accounting reproduces every entry of Appendix D", () => {
  for (const m of gpt3Models) {
    const total = parameterBreakdown(m).total / 1e6;
    assert.ok(
      Math.abs(total - m.appendix) / m.appendix < 0.005,
      `${m.name}: ${total} vs ${m.appendix}`,
    );
  }
});
test("13B: only the n_heads × d_head width matches Appendix D", () => {
  const m = gpt3Models.find((x) => x.id === "13b");
  assert.equal(m.heads * m.headWidth, m.width);
  const printed = parameterBreakdown({ ...m, width: m.tableWidth }).total / 1e6;
  assert.ok(Math.abs(printed - m.appendix) / m.appendix > 0.005);
});
test("6ND reproduces the paper's total compute", () => {
  const flops = trainingFlops(gpt3.appendix * 1e6, TRAINING_TOKENS);
  assert.ok(Math.abs(flops - PAPER_TOTAL_FLOPS) / PAPER_TOTAL_FLOPS < 0.002);
  assert.ok(Math.abs(pfDays(flops) - PAPER_PF_DAYS) / PAPER_PF_DAYS < 0.002);
});
test("dataset epochs: size-based figures match where the paper's do", () => {
  const near = (name, tolerance) => {
    const d = datasetMix.find((x) => x.name.startsWith(name));
    return Math.abs(epochsFromWeight(d) - d.epochs) <= tolerance;
  };
  assert.ok(near("Common Crawl", 0.01));
  assert.ok(near("Books2", 0.01));
  // The lab shows this gap instead of hiding it.
  assert.ok(!near("WebText2", 0.3));
  assert.ok(!near("Wikipedia", 0.3));
});
test("attention accounting matches the paper's under-10% simplification", () => {
  assert.equal(averageVisible(4), 2.5);
  assert.equal(averageVisible(4, 2), (1 + 2 + 2 + 2) / 4);
  const dense = forwardFlops(gpt3, 2048);
  assert.ok(dense.share > 0.01 && dense.share < 0.1);
  assert.ok(forwardFlops(gpt3, 2048, 256).attention < dense.attention);
  assert.ok(forwardFlops(gpt3, 32768).share > dense.share);
});
test("KV cache and memory figures", () => {
  const seq = { layers: 96, headWidth: 128, kvHeads: 96, context: 2048 };
  assert.equal(kvCacheBytes({ ...seq, context: 1 }), 4718592);
  assert.ok(Math.abs(kvCacheBytes(seq) / 1e9 - 9.66) < 0.01);
  assert.equal(kvCacheBytes({ ...seq, kvHeads: 8 }) * 12, kvCacheBytes(seq));
  assert.ok(Math.abs(weightBytes(174.6e9) / 1e9 - 349.2) < 0.1);
  assert.equal(
    batchWhereCacheExceedsWeights(gpt3, {
      kvHeads: 96,
      context: 2048,
      bytes: 2,
    }),
    37,
  );
});
test("compute-optimal split conserves the budget at 20 tokens per parameter", () => {
  const { parameters, tokens } = computeOptimal(PAPER_TOTAL_FLOPS);
  assert.ok(Math.abs(6 * parameters * tokens - PAPER_TOTAL_FLOPS) < 1e18);
  assert.ok(Math.abs(tokens / parameters - 20) < 1e-9);
  assert.ok(parameters > 50e9 && parameters < 52e9);
});
test("demonstrations that fit the window match the paper's 10 to 100", () => {
  assert.equal(demonstrationsThatFit(20), 97);
  assert.equal(demonstrationsThatFit(190), 10);
  assert.equal(demonstrationsThatFit(4000), 0);
});

test("BPE is lossless on any text, including characters outside the corpus", () => {
  const merges = trainBPE(mixes.mixed.corpus);
  for (const text of [
    probes.id,
    probes.en,
    "  dua  spasi\nbaris baru",
    "日本語 café 🙂",
    "",
  ]) {
    assert.equal(encode(text, merges).join(""), text);
    assert.equal(pretokenize(text).join(""), text);
  }
});
test("BPE merges are deterministic, ordered by frequency, and shrink the text", () => {
  const merges = trainBPE(corpora.id);
  assert.deepEqual(merges, trainBPE(corpora.id));
  assert.ok(merges[0].count >= merges[1].count);
  const sizes = [0, 20, 100, merges.length].map(
    (steps) => encode(probes.id, merges, steps).length,
  );
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] < sizes[i - 1]);
});
test("token cost follows the training mix, which is the lab's claim", () => {
  const en = trainBPE(mixes.en.corpus),
    id = trainBPE(mixes.id.corpus);
  assert.ok(tokensPerWord(probes.id, en) > tokensPerWord(probes.en, en));
  assert.ok(tokensPerWord(probes.en, id) > tokensPerWord(probes.id, id));
});
