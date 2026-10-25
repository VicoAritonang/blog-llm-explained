import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  makeWeights,
  forward,
  decode,
  fixture,
  validateFixture,
  PRESETS,
  LOCAL_ATTENTION,
  softmax,
  distribution,
  sample,
  TOKENIZER_PRESETS,
  tokenizePreset,
  bpeTrace,
  analogyResult,
  cosine,
  ANALOGY_CASES,
  matmul,
  transpose,
  gelu,
} from "../src/simulation/engine.mjs";
const near = (a, b, epsilon = 1e-10) =>
  assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const deepNear = (a, b) => {
  const x = a.flat(Infinity),
    y = b.flat(Infinity);
  assert.equal(x.length, y.length);
  x.forEach((v, i) => near(v, y[i]));
};
const weights = makeWeights(),
  result = forward(PRESETS.journey, weights);
test("fixture schema, finite values, shapes and lineage are valid", () => {
  const data = fixture();
  validateFixture(data);
  assert.equal(data.tensors.length, 88);
  assert.equal(data.modelProfile.width, 8);
  const bad = structuredClone(data);
  bad.tensors[0].values[0] = NaN;
  assert.throws(() => validateFixture(bad));
});
test("offline JSON fixture is exactly reproducible from seed 42", () => {
  for (const [id, input] of Object.entries(PRESETS)) {
    const offline = JSON.parse(
      fs.readFileSync(
        new URL(`../src/scenarios/${id}.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.deepEqual(offline, fixture(input));
  }
});
test("embedding uses lookup plus learned position by feature", () => {
  result.ids.forEach((id, i) =>
    result.X0[i].forEach((x, j) => near(x, weights.E[id][j] + weights.P[i][j])),
  );
});
test("LayerNorm uses feature statistics per row independently", () => {
  result.blocks.forEach((b) =>
    b.U.forEach((row, i) => {
      const input = b.input[i],
        mean = input.reduce((a, x) => a + x) / 8;
      const variance = input.reduce((a, x) => a + (x - mean) ** 2, 0) / 8;
      row.forEach((x, j) =>
        near(x, (input[j] - mean) / Math.sqrt(variance + 1e-5)),
      );
      near(
        row.reduce((a, x) => a + x),
        0,
      );
    }),
  );
});
test("known attention example gives canonical softmax and weighted sums", () => {
  const h = LOCAL_ATTENTION();
  deepNear(h.raw[2], [4, 2, 0]);
  deepNear(h.scaled[2], [2, 1, 0]);
  deepNear(
    h.A[2],
    [0.6652409557748218, 0.24472847105479764, 0.09003057317038046],
  );
  deepNear(
    h.Z[2],
    [0.6652409557748218, 0.4894569421095953, 0.2700917195111414, 0],
  );
  deepNear(h.A[1], [0.7310585786300049, 0.2689414213699951, 0]);
  deepNear(h.Z[1], [0.7310585786300049, 0.5378828427399902, 0, 0]);
});
test("every head has normalized nonnegative rows and exactly zero future weights", () => {
  result.blocks.forEach((b) =>
    b.heads.forEach((h) =>
      h.A.forEach((row, i) => {
        near(
          row.reduce((a, x) => a + x),
          1,
        );
        row.forEach((p, j) => {
          assert.ok(p >= 0);
          if (j > i) assert.equal(p, 0);
        });
      }),
    ),
  );
});
test("QKV, AV, concat and output projection match independent scalar loops", () => {
  result.blocks.forEach((b, layer) => {
    for (const name of ["Q", "K", "V"])
      b[name].forEach((row, i) =>
        row.forEach((v, j) => {
          let sum = 0;
          for (let d = 0; d < 8; d++)
            sum +=
              b.U[i][d] * weights.blocks[layer]["W" + name.toLowerCase()][d][j];
          near(v, sum);
        }),
      );
    b.heads.forEach((h) =>
      h.Z.forEach((row, i) =>
        row.forEach((v, j) => {
          let sum = 0;
          for (let t = 0; t < result.ids.length; t++)
            sum += h.A[i][t] * h.V[t][j];
          near(v, sum);
        }),
      ),
    );
    b.concat.forEach((row, i) =>
      deepNear(row, [...b.heads[0].Z[i], ...b.heads[1].Z[i]]),
    );
    deepNear(b.out, matmul(b.concat, weights.blocks[layer].Wo));
  });
});
test("both residual additions and full 8→32→8 MLP are mathematically correct", () => {
  result.blocks.forEach((b, layer) => {
    b.R.forEach((row, i) =>
      row.forEach((v, j) => near(v, b.input[i][j] + b.out[i][j])),
    );
    assert.equal(b.expanded[0].length, 32);
    deepNear(b.expanded, matmul(b.N, weights.blocks[layer].W1));
    deepNear(
      b.activation,
      b.expanded.map((row) => row.map(gelu)),
    );
    deepNear(b.M, matmul(b.activation, weights.blocks[layer].W2));
    b.X.forEach((row, i) =>
      row.forEach((v, j) => near(v, b.R[i][j] + b.M[i][j])),
    );
  });
});
test("final vocabulary projection ties E and last hidden state", () => {
  deepNear([result.logits], matmul([result.H.at(-1)], transpose(weights.E)));
});
test("suffix changes never change prefix hidden states or attention at it", () => {
  const a = forward(PRESETS.causalTired),
    b = forward(PRESETS.causalWide);
  a.blocks.forEach((block, l) => {
    deepNear(block.X.slice(0, 3), b.blocks[l].X.slice(0, 3));
    block.heads.forEach((h, head) =>
      deepNear(h.A[1], b.blocks[l].heads[head].A[1]),
    );
  });
  assert.notDeepEqual(a.blocks[1].X[3], b.blocks[1].X[3]);
});
test("cache decode matches full forward for every candidate and both layers", () => {
  for (let id = 0; id < 16; id++) {
    const cached = decode(id, result, weights),
      full = forward([...result.ids, id], weights);
    deepNear(cached.logits, full.logits);
    deepNear(cached.H, full.H.at(-1));
    cached.cache.forEach((c, l) => {
      deepNear(c.K, full.blocks[l].K);
      deepNear(c.V, full.blocks[l].V);
    });
  }
});
test("prefix edit invalidates cached K/V by producing new prefix activations", () => {
  const edited = forward([8, ...result.ids.slice(1)], weights);
  assert.notDeepEqual(edited.blocks[0].K, result.blocks[0].K);
  const newDecode = decode(5, edited, weights),
    full = forward([...edited.ids, 5], weights);
  deepNear(newDecode.logits, full.logits);
});
test("stable softmax handles large logits and masks without NaN", () => {
  deepNear(softmax([10002, 10001, 10000]), softmax([2, 1, 0]));
  assert.equal(softmax([2, 1, -Infinity])[2], 0);
});
test("temperature, top-k and top-p filter then renormalize correctly", () => {
  const logits = [3, 2, 1, 0];
  for (const t of [0.1, 0.5, 1, 2])
    for (const k of [0, 1, 3])
      for (const p of [0.05, 0.5, 1]) {
        const values = distribution(logits, t, k, p);
        near(
          values.reduce((a, v) => a + v),
          1,
        );
        assert.ok(values.every((x) => x >= 0));
        if (k) assert.ok(values.filter((x) => x > 0).length <= k);
      }
  deepNear(distribution(logits, 0), [1, 0, 0, 0]);
  assert.ok(distribution(logits, 0.5)[0] > distribution(logits, 2)[0]);
  assert.throws(() => distribution(logits, -1));
});
test("five shown candidates plus remaining mass equal one", () => {
  const p = distribution(result.logits).sort((a, b) => b - a);
  near(
    p.slice(0, 5).reduce((a, x) => a + x) + p.slice(5).reduce((a, x) => a + x),
    1,
  );
});
test("sampling is seed-reproducible and seeds can change choice", () => {
  const p = distribution(result.logits);
  assert.equal(sample(p, 42), sample(p, 42));
  assert.ok(
    new Set(Array.from({ length: 30 }, (_, i) => sample(p, i))).size > 1,
  );
});
test("all tokenizer presets reconstruct exact text, whitespace, offsets", () => {
  TOKENIZER_PRESETS.forEach((p) => {
    const tokens = tokenizePreset(p);
    assert.equal(tokens.map((t) => t.text).join(""), p.text);
    tokens.forEach((t) => assert.equal(p.text.slice(t.start, t.end), t.text));
    assert.ok(tokens.every((t) => t.id.startsWith("toy")));
  });
  assert.deepEqual(bpeTrace(), [["c", "a", "t"], ["ca", "t"], ["cat"]]);
});
test("analogy ranks by source cosine, not projected coordinates", () => {
  for (const [id, target] of [
    ["capitals", "Paris"],
    ["verbs", "swimming"],
    ["workplaces", "guru"],
  ]) {
    const a = analogyResult(id),
      source = ANALOGY_CASES.find((item) => item.id === id).vectors;
    assert.equal(a.ranking[0].word, target);
    a.ranking.forEach((r) => near(r.cosine, cosine(a.vector, source[r.word])));
    assert.notDeepEqual(a.vector, source[target]);
    const [first, subtract, add] = a.words;
    a.vector.forEach((x, i) =>
      near(x, source[first][i] - source[subtract][i] + source[add][i]),
    );
  }
});
test("decoder length and vocabulary bounds reject invalid inputs", () => {
  for (const ids of [[], [16], [-1], [1.5], Array(13).fill(0)])
    assert.throws(() => forward(ids));
  assert.throws(() => decode(1, forward(Array(12).fill(0))));
});
