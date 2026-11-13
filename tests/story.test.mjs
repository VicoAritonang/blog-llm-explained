import test from "node:test";
import assert from "node:assert/strict";
import model from "../src/simulation/story/checkpoint.json" with { type: "json" };
import references from "../src/simulation/story/reference.json" with { type: "json" };
import evaluation from "../src/simulation/story/evaluation.json" with { type: "json" };
import {
  forward,
  tokenize,
  decode,
  generate,
  distribution,
  maxDifference,
  biasTraining,
  attentionExample,
} from "../src/simulation/story/engine.mjs";
import { cases, retrieve } from "../src/simulation/story/cases.mjs";
const ids = (key) => tokenize(cases[key].prompt, model).map((t) => t.id);
test("story tokenizer reconstructs whitespace, IDs and repeated pieces exactly", () => {
  for (const c of Object.values(cases))
    assert.equal(
      decode(
        tokenize(c.prompt, model).map((t) => t.id),
        model,
      ),
      c.prompt,
    );
  assert.equal(ids("blue")[2], ids("blue")[13]);
  assert.throws(() => tokenize("unknown café", model));
});
test("JS decoder agrees with independent NumPy logits at every prompt position", () => {
  for (const ref of references)
    assert.ok(
      maxDifference(forward(ref.ids, model).logits, ref.logits) < 1e-10,
    );
});
test("all published selected answers are actual autoregressive outputs, including held-out combination", () => {
  for (const c of Object.values(cases).filter(
    (c) => c.support && c.id !== "two",
  )) {
    const result = generate(
      tokenize(c.prompt, model).map((t) => t.id),
      model,
    );
    assert.equal(result.stop, "eos");
    assert.equal(decode(result.output.slice(0, -1), model), c.support);
    assert.equal(result.steps[1].ids.at(-1), result.steps[0].token);
  }
});
test("diagnostic two-object case preserves the actual model failure instead of overriding output", () => {
  const result = generate(ids("two"), model);
  assert.equal(decode(result.output.slice(0, -1), model), " di laci kuning.");
  assert.notEqual(decode(result.output.slice(0, -1), model), cases.two.support);
});
test("split has no prompt overlap and evaluation exposes failures as well as success", () => {
  const train = new Set(
    evaluation
      .filter((e) => e.split === "train")
      .map((e) => JSON.stringify(e.promptIds)),
  );
  const held = evaluation.filter((e) => e.split === "held-out");
  assert.equal(train.size, 336);
  assert.equal(held.length, 112);
  for (const e of held) assert.ok(!train.has(JSON.stringify(e.promptIds)));
  for (const e of evaluation)
    assert.equal(
      e.correct,
      JSON.stringify(e.predicted) === JSON.stringify(e.expected),
    );
});
test('all held-out recorded answers can be reproduced by the browser inference engine', () => {
  for (const row of evaluation.filter(e=>e.split==='held-out')) {
    assert.deepEqual(generate(row.promptIds,model).output,row.predicted);
  }
});
test("causal prefix, same first-layer final query, and changed later contextual representation", () => {
  const a = forward([...ids("blue"), 5, 6], model),
    b = forward([...ids("green"), 5, 6], model);
  for (let l = 0; l < 2; l++)
    assert.equal(
      maxDifference(
        a.blocks[l].output.slice(0, 7),
        b.blocks[l].output.slice(0, 7),
      ),
      0,
    );
  assert.equal(maxDifference(a.blocks[0].Q.at(-1), b.blocks[0].Q.at(-1)), 0);
  assert.ok(maxDifference(a.blocks[1].Q.at(-1), b.blocks[1].Q.at(-1)) > 0.001);
  const unmasked = forward(ids("blue"), model, { causal: false });
  const unmaskedB = forward(ids("green"), model, { causal: false });
  assert.ok(
    maxDifference(unmasked.blocks[1].output[0], unmaskedB.blocks[1].output[0]) >
      0,
  );
});
test("attention rows sum to one, mask is zero, diagonal is allowed, Value sums and residuals agree", () => {
  const trace = forward(ids("blue"), model);
  for (const b of trace.blocks)
    for (const h of b.heads)
      h.A.forEach((row, i) => {
        assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-12);
        assert.ok(row[i] > 0);
        for (let j = i + 1; j < row.length; j++) assert.equal(row[j], 0);
        for (let c = 0; c < model.profile.headWidth; c++)
          assert.ok(
            Math.abs(
              row.reduce((s, a, j) => s + a * h.v[j][c], 0) - h.Z[i][c],
            ) < 1e-12,
          );
      });
  for (const b of trace.blocks)
    b.output.forEach((r, i) =>
      r.forEach((x, c) =>
        assert.ok(Math.abs(x - b.R[i][c] - b.mlp[i][c]) < 1e-12),
      ),
    );
});
test("real incremental KV cache preserves logits and invalidates edited suffix/model/config", () => {
  const prefix = ids("blue"),
    first = forward(prefix, model),
    next = [...prefix, 5];
  const cached = forward(next, model, { cache: first.cache }),
    full = forward(next, model);
  assert.equal(cached.start, prefix.length);
  assert.equal(cached.computedPositions, 2);
  assert.ok(maxDifference(cached.lastLogits, full.lastLogits) < 1e-10);
  const edited = [...ids("green"), 5],
    invalidated = forward(edited, model, { cache: cached.cache });
  assert.equal(invalidated.start, 7);
  assert.ok(
    maxDifference(invalidated.lastLogits, forward(edited, model).lastLogits) <
      1e-10,
  );
  assert.equal(
    forward(next, model, { cache: first.cache, causal: false }).start,
    0,
  );
  assert.equal(
    forward(next, { ...model, checkpoint: "different" }, { cache: first.cache })
      .start,
    0,
  );
});
test("decoding filters full vocabulary with deterministic seed and handles greedy zero temperature", () => {
  const z = [2, 1, 0, -1],
    low = distribution(z, { temperature: 0.5 }),
    high = distribution(z, { temperature: 2 });
  assert.ok(low.probabilities[0] > high.probabilities[0]);
  assert.equal(distribution(z, { temperature: 0 }).selected, 0);
  assert.equal(
    distribution(z, { seed: 5 }).selected,
    distribution(z, { seed: 5 }).selected,
  );
  const filtered = distribution(z, { topK: 2, topP: 0.8 });
  assert.equal(filtered.probabilities[2], 0);
  assert.ok(
    Math.abs(filtered.probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-12,
  );
  assert.throws(() => distribution(z, { temperature: -1 }));
});
test("separate operator examples compute real gradients and Value intervention", () => {
  const result = biasTraining();
  assert.ok(Math.abs(result.lossBefore - 0.40760596444438046) < 1e-12);
  assert.ok(result.lossAfter < result.lossBefore);
  const a = attentionExample(),
    b = attentionExample(true);
  assert.deepEqual(a.weights, b.weights);
  assert.deepEqual(a.output, [1.5, 1.5]);
  assert.deepEqual(b.output, [0.5, 1.5]);
});
test("retrieval is an explicit local application action", () => {
  assert.equal(retrieve("Di mana kunci cadangan?")[0].id, "arsip-01");
  assert.equal(retrieve("pesawat").length, 0);
});
