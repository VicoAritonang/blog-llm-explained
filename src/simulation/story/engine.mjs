/** Pure, inspectable inference. All views use this trace, including diagnostics. */
export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const dot = (a, b) => sum(a.map((x, i) => x * b[i]));
export const add = (a, b) => a.map((row, i) => row.map((x, j) => x + b[i][j]));
export const maxDifference = (a, b) => {
  const aa = a.flat(Infinity),
    bb = b.flat(Infinity);
  if (aa.length !== bb.length) throw new Error("Shape mismatch");
  return Math.max(0, ...aa.map((x, i) => Math.abs(x - bb[i])));
};
export function softmax(values) {
  const max = Math.max(...values);
  if (!Number.isFinite(max))
    throw new Error("Softmax requires an allowed finite score");
  const exps = values.map((x) => Math.exp(x - max));
  const total = sum(exps);
  return exps.map((x) => x / total);
}
export function tokenize(text, model) {
  const candidates = model.vocab
    .map((piece, id) => ({ piece, id }))
    .filter((x) => x.piece !== "<eos>")
    .sort((a, b) => b.piece.length - a.piece.length);
  const tokens = [];
  let offset = 0;
  while (offset < text.length) {
    const match = candidates.find((x) => text.startsWith(x.piece, offset));
    if (!match)
      throw new Error(`Teks di luar vocabulary pada karakter ${offset}`);
    tokens.push({
      id: match.id,
      text: match.piece,
      position: tokens.length,
      start: offset,
      end: offset + match.piece.length,
    });
    offset += match.piece.length;
  }
  return tokens;
}
export const decode = (ids, model) => ids.map((id) => model.vocab[id]).join("");
const linear = (x, w, b) =>
  x.map((row) =>
    b.map((bias, j) => bias + sum(row.map((v, i) => v * w[i][j]))),
  );
const norm = (x, g, b) =>
  x.map((row) => {
    const mean = sum(row) / row.length;
    const variance = sum(row.map((v) => (v - mean) ** 2)) / row.length;
    return row.map(
      (v, i) => ((v - mean) / Math.sqrt(variance + 1e-5)) * g[i] + b[i],
    );
  });
export const gelu = (x) =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

export function forward(ids, model, options = {}) {
  const p = model.profile,
    w = model.weights;
  if (
    !ids.length ||
    ids.length > p.maxTokens ||
    ids.some((id) => !Number.isInteger(id) || id < 0 || id >= p.vocabulary)
  )
    throw new Error("Urutan di luar kapasitas/vocabulary model");
  const config = {
    causal: options.causal !== false,
    attention: options.attention !== false,
    mlp: options.mlp !== false,
    residual: options.residual !== false,
    // "layer.head" pairs whose output is zeroed: a per-head ablation.
    muted: [...(options.mutedHeads ?? [])].sort(),
  };
  const signature = JSON.stringify(config);
  const prior = options.cache;
  let start = 0;
  if (
    prior &&
    config.causal &&
    prior.checkpoint === model.checkpoint &&
    prior.signature === signature
  ) {
    while (
      start < Math.min(prior.ids.length, ids.length - 1) &&
      prior.ids[start] === ids[start]
    )
      start++;
  }
  const active = ids.slice(start);
  const embeddings = active.map((id) => w.E[id].slice());
  const positions = active.map((_, i) => w.P[start + i].slice());
  const X0 = add(embeddings, positions);
  let x = X0;
  const blocks = [];
  const cacheBlocks = [];
  for (let l = 0; l < p.layers; l++) {
    const input = x;
    const u = norm(x, w[`${l}.ln1.g`], w[`${l}.ln1.b`]);
    const project = (a, name) =>
      linear(a, w[`${l}.${name}.w`], w[`${l}.${name}.b`]);
    const Q = project(u, "q");
    const K = [
      ...(start ? prior.blocks[l].K.slice(0, start) : []),
      ...project(u, "k"),
    ];
    const V = [
      ...(start ? prior.blocks[l].V.slice(0, start) : []),
      ...project(u, "v"),
    ];
    const heads = Array.from({ length: p.heads }, (_, h) => {
      const slice = (row) => row.slice(h * p.headWidth, (h + 1) * p.headWidth);
      const q = Q.map(slice),
        k = K.map(slice),
        v = V.map(slice);
      const scores = q.map((row) =>
        k.map((key) => dot(row, key) / Math.sqrt(p.headWidth)),
      );
      const masked = scores.map((row, i) =>
        row.map((s, j) => (config.causal && j > start + i ? -Infinity : s)),
      );
      const A = masked.map(softmax);
      const silent = config.muted.includes(`${l}.${h}`);
      const Z = A.map((row) =>
        Array.from({ length: p.headWidth }, (_, c) =>
          silent ? 0 : sum(row.map((a, j) => a * v[j][c])),
        ),
      );
      return { q, k, v, scores, masked, A, Z };
    });
    const concat = active.map((_, i) => heads.flatMap((h) => h.Z[i]));
    const attention = project(concat, "o").map((row) =>
      row.map((v) => (config.attention ? v : 0)),
    );
    const R = config.residual ? add(input, attention) : attention;
    const normalized = norm(R, w[`${l}.ln2.g`], w[`${l}.ln2.b`]);
    const hidden = project(normalized, "up");
    const activated = hidden.map((row) => row.map(gelu));
    const mlp = project(activated, "down").map((row) =>
      row.map((v) => (config.mlp ? v : 0)),
    );
    x = config.residual ? add(R, mlp) : mlp;
    blocks.push({
      input,
      normalizedInput: u,
      Q,
      K,
      V,
      heads,
      concat,
      attention,
      R,
      normalized,
      hidden,
      activated,
      mlp,
      output: x,
    });
    cacheBlocks.push({ K, V });
  }
  const final = norm(x, w["final.g"], w["final.b"]);
  const logits = final.map((row) =>
    w.E.map((embedding, id) => dot(row, embedding) + w["out.b"][id]),
  );
  return {
    ids: ids.slice(),
    start,
    embeddings,
    positions,
    X0,
    blocks,
    final,
    logits,
    lastLogits: logits.at(-1),
    config,
    checkpoint: model.checkpoint,
    source: "live-model",
    computedPositions: active.length * p.layers,
    reusedPositions: start * p.layers,
    cache: {
      checkpoint: model.checkpoint,
      signature,
      ids: ids.slice(),
      blocks: cacheBlocks,
    },
  };
}

export function distribution(
  logits,
  { temperature = 1, topK = 0, topP = 1, seed = 42, greedy = false } = {},
) {
  if (
    !logits.length ||
    logits.some((v) => !Number.isFinite(v)) ||
    !Number.isFinite(temperature) ||
    temperature < 0 ||
    !Number.isInteger(topK) ||
    topK < 0 ||
    !(topP > 0 && topP <= 1)
  )
    throw new Error("Invalid decoding configuration");
  const ranked = logits
    .map((value, id) => ({ id, value }))
    .sort((a, b) => b.value - a.value || a.id - b.id);
  const base = softmax(logits);
  const tempered = softmax(logits.map((x) => x / (temperature || 1)));
  let kept = ranked.slice(0, topK || ranked.length).map((x) => x.id);
  const afterKTotal = sum(kept.map((id) => tempered[id]));
  let mass = 0;
  kept = kept.filter((id) => {
    const include = mass < topP;
    mass += tempered[id] / afterKTotal;
    return include;
  });
  const normalizer = sum(kept.map((id) => tempered[id]));
  const probabilities = tempered.map((v, id) =>
    kept.includes(id) ? v / normalizer : 0,
  );
  let state = seed >>> 0;
  state += 0x6d2b79f5;
  let r = Math.imul(state ^ (state >>> 15), state | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  const draw = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  let cumulative = 0,
    selected = kept.at(-1);
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (draw < cumulative) {
      selected = i;
      break;
    }
  }
  if (greedy || temperature === 0) selected = ranked[0].id;
  return {
    base,
    tempered,
    probabilities,
    selected,
    draw,
    kept,
    order: "temperature → top-k → top-p → renormalization",
    greedy: greedy || temperature === 0,
  };
}
/**
 * @param {number[]} promptIds
 * @param {any} model
 * @param {{ limit?: number, temperature?: number, topK?: number, topP?: number, seed?: number, greedy?: boolean }} [options]
 */
export function generate(promptIds, model, { limit = 8, ...policy } = {}) {
  const ids = [...promptIds],
    steps = [];
  let stop = "length";
  for (let i = 0; i < limit; i++) {
    if (ids.length >= model.profile.maxTokens) {
      stop = "capacity";
      break;
    }
    const trace = forward(ids, model);
    const choice = distribution(trace.lastLogits, {
      greedy: true,
      ...policy,
      seed: (policy.seed ?? 42) + i,
    });
    steps.push({
      ids: [...ids],
      logits: trace.lastLogits,
      token: choice.selected,
      policy: choice,
    });
    if (model.vocab[choice.selected] === "<eos>") {
      stop = "eos";
      break;
    }
    ids.push(choice.selected);
  }
  return {
    promptIds: [...promptIds],
    ids,
    steps,
    output: steps.map((s) => s.token),
    stop,
  };
}
export function biasTraining(logits = [2, 1, 0], target = 0, rate = 0.5) {
  const before = softmax(logits),
    gradient = before.map((p, i) => p - Number(i === target));
  const updated = logits.map((z, i) => z - rate * gradient[i]);
  const after = softmax(updated);
  return {
    logits,
    before,
    gradient,
    updated,
    after,
    lossBefore: -Math.log(before[target]),
    lossAfter: -Math.log(after[target]),
    rate,
    target,
  };
}
export function attentionExample(zeroValue = false) {
  const scores = [Math.log(2), 0, 0, 10],
    masked = [...scores.slice(0, 3), -Infinity];
  const weights = softmax(masked),
    values = [zeroValue ? [0, 0] : [2, 0], [0, 4], [2, 2], [99, 99]];
  const output = [0, 1].map((c) =>
    sum(weights.map((a, j) => a * values[j][c])),
  );
  return { scores, masked, weights, values, output };
}
