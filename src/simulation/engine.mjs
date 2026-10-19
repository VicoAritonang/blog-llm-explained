/** Small, deterministic pre-norm decoder. No DOM, renderer, or network dependency. */
export const PROFILE = Object.freeze({
  width: 8,
  heads: 2,
  headWidth: 4,
  ff: 32,
  layers: 2,
  maxTokens: 12,
  vocabulary: 16,
});
export const VOCAB = [
  "The",
  " cat",
  " sat",
  " on",
  " the",
  " mat",
  ".",
  " a",
  " dog",
  " is",
  " it",
  " was",
  " tired",
  " wide",
  " street",
  " animal",
];
export const PRESETS = {
  journey: [0, 1, 2, 3, 4],
  causalTired: [15, 10, 11, 12],
  causalWide: [15, 10, 11, 13],
};
export function effectiveIds(state) {
  const ids =
    state.experiment === "D"
      ? [...PRESETS[state.suffix === "wide" ? "causalWide" : "causalTired"]]
      : [...state.ids];
  if (state.swapped && ids.length > 1) [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids;
}
export const TOKENIZER_PRESETS = [
  {
    id: "journey",
    title: "Kalimat sederhana",
    text: "The cat sat on the",
    pieces: ["The", " cat", " sat", " on", " the"],
    ids: ["toy:0", "toy:1", "toy:2", "toy:3", "toy:4"],
  },
  {
    id: "subword",
    title: "Kata & subword",
    text: "cat cats unhelpful",
    pieces: ["cat", " cat", "s", " un", "help", "ful"],
    ids: [
      "toy-bpe:0",
      "toy-bpe:1",
      "toy-bpe:2",
      "toy-bpe:3",
      "toy-bpe:4",
      "toy-bpe:5",
    ],
  },
  {
    id: "space",
    title: "Spasi awal",
    text: "cat cat",
    pieces: ["cat", " cat"],
    ids: ["toy-bpe:0", "toy-bpe:1"],
  },
  {
    id: "indonesia",
    title: "Bahasa Indonesia",
    text: "Saya belajar bahasa",
    pieces: ["Saya", " bel", "ajar", " bahasa"],
    ids: ["toy-id:0", "toy-id:1", "toy-id:2", "toy-id:3"],
  },
];
export function tokenizePreset(preset) {
  let offset = 0;
  return preset.pieces.map((text, position) => {
    const token = {
      text,
      position,
      id: preset.ids[position],
      start: offset,
      end: offset + text.length,
    };
    offset += text.length;
    return token;
  });
}
export const BPE = {
  input: ["c", "a", "t"],
  ranks: [
    ["c", "a"],
    ["ca", "t"],
  ],
};
export function bpeTrace() {
  let pieces = [...BPE.input];
  const trace = [pieces];
  for (const [left, right] of BPE.ranks) {
    const index = pieces.findIndex(
      (p, i) => p === left && pieces[i + 1] === right,
    );
    if (index >= 0)
      pieces = [
        ...pieces.slice(0, index),
        left + right,
        ...pieces.slice(index + 2),
      ];
    trace.push(pieces);
  }
  return trace;
}
export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
export const transpose = (a) => a[0].map((_, c) => a.map((row) => row[c]));
export const add = (a, b) => a.map((row, i) => row.map((x, j) => x + b[i][j]));
export const matmul = (a, b) =>
  a.map((row) => transpose(b).map((column) => dot(row, column)));
export const project = (a, w, bias) =>
  matmul(a, w).map((row) => row.map((x, i) => x + bias[i]));
export function layerNorm(a) {
  return a.map((row) => {
    const mean = row.reduce((s, x) => s + x, 0) / row.length;
    const variance = row.reduce((s, x) => s + (x - mean) ** 2, 0) / row.length;
    return row.map((x) => (x - mean) / Math.sqrt(variance + 1e-5));
  });
}
export const gelu = (x) =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
export function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((x) => (x === -Infinity ? 0 : Math.exp(x - max)));
  const total = exps.reduce((s, x) => s + x, 0);
  return exps.map((x) => x / total);
}
export function makeWeights(seed = 42) {
  const rng = random(seed);
  const matrix = (rows, cols, scale = 0.45) =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (rng() * 2 - 1) * scale),
    );
  const bias = (n) => Array(n).fill(0);
  return {
    seed,
    E: matrix(16, 8),
    P: matrix(12, 8, 0.18),
    blocks: Array.from({ length: 2 }, () => ({
      Wq: matrix(8, 8),
      Wk: matrix(8, 8),
      Wv: matrix(8, 8),
      Wo: matrix(8, 8),
      W1: matrix(8, 32, 0.25),
      W2: matrix(32, 8, 0.18),
      bq: bias(8),
      bk: bias(8),
      bv: bias(8),
      bo: bias(8),
      b1: bias(32),
      b2: bias(8),
    })),
  };
}
export function attention(q, k, v, startPosition = 0) {
  const raw = matmul(q, transpose(k));
  const scaled = raw.map((row) => row.map((x) => x / 2));
  const mask = scaled.map((row, i) => row.map((_, j) => j > i + startPosition));
  const A = scaled.map((row, i) =>
    softmax(row.map((x, j) => (mask[i][j] ? -Infinity : x))),
  );
  return { raw, scaled, mask, A, Z: matmul(A, v) };
}
export function forward(ids, weights = makeWeights()) {
  if (
    !ids.length ||
    ids.length > 12 ||
    ids.some((id) => !Number.isInteger(id) || id < 0 || id >= 16)
  )
    throw new Error("Urutan fixture tidak valid");
  const embeddings = ids.map((id) => weights.E[id]);
  const positions = ids.map((_, i) => weights.P[i]);
  const X0 = add(embeddings, positions);
  let X = X0;
  const blocks = weights.blocks.map((w) => {
    const input = X,
      U = layerNorm(X);
    const Q = project(U, w.Wq, w.bq),
      K = project(U, w.Wk, w.bk),
      V = project(U, w.Wv, w.bv);
    const heads = [0, 1].map((h) => {
      const select = (a) => a.map((row) => row.slice(h * 4, h * 4 + 4));
      const q = select(Q),
        k = select(K),
        v = select(V);
      return { Q: q, K: k, V: v, ...attention(q, k, v) };
    });
    const concat = input.map((_, i) => heads.flatMap((h) => h.Z[i]));
    const out = project(concat, w.Wo, w.bo),
      R = add(X, out),
      N = layerNorm(R);
    const expanded = project(N, w.W1, w.b1),
      activation = expanded.map((row) => row.map(gelu)),
      M = project(activation, w.W2, w.b2);
    X = add(R, M);
    return {
      input,
      U,
      Q,
      K,
      V,
      heads,
      concat,
      out,
      R,
      N,
      expanded,
      activation,
      M,
      X,
    };
  });
  const H = layerNorm(X),
    logits = weights.E.map((row) => dot(H.at(-1), row));
  return { ids: [...ids], embeddings, positions, X0, blocks, H, logits };
}
/** Incremental decode: old K/V are reused, only the new row enters each sublayer. */
export function decode(id, prefix, weights = makeWeights()) {
  const position = prefix.ids.length;
  if (position >= 12 || !Number.isInteger(id) || id < 0 || id >= 16)
    throw new Error("Batas urutan demonstrasi tercapai");
  let X = add([weights.E[id]], [weights.P[position]]);
  const cache = [];
  weights.blocks.forEach((w, layer) => {
    const U = layerNorm(X),
      Q = project(U, w.Wq, w.bq),
      K = project(U, w.Wk, w.bk),
      V = project(U, w.Wv, w.bv);
    const fullK = [...prefix.blocks[layer].K, ...K],
      fullV = [...prefix.blocks[layer].V, ...V];
    const heads = [0, 1].map((h) =>
      attention(
        Q.map((r) => r.slice(h * 4, h * 4 + 4)),
        fullK.map((r) => r.slice(h * 4, h * 4 + 4)),
        fullV.map((r) => r.slice(h * 4, h * 4 + 4)),
        position,
      ),
    );
    const out = project([heads.flatMap((h) => h.Z[0])], w.Wo, w.bo),
      R = add(X, out),
      N = layerNorm(R);
    X = add(
      R,
      project(
        project(N, w.W1, w.b1).map((row) => row.map(gelu)),
        w.W2,
        w.b2,
      ),
    );
    cache.push({ K: fullK, V: fullV });
  });
  const H = layerNorm(X);
  return { cache, H: H[0], logits: weights.E.map((row) => dot(H[0], row)) };
}
export function distribution(logits, temperature = 1, topK = 0, topP = 1) {
  if (
    !Number.isFinite(temperature) ||
    temperature < 0 ||
    !Number.isInteger(topK) ||
    topK < 0 ||
    topK > logits.length ||
    topP <= 0 ||
    topP > 1
  )
    throw new Error("Parameter sampling tidak valid");
  if (temperature === 0)
    return logits.map((_, i) =>
      i === logits.indexOf(Math.max(...logits)) ? 1 : 0,
    );
  const base = softmax(logits.map((x) => x / temperature));
  let ranked = base.map((p, id) => ({ p, id })).sort((a, b) => b.p - a.p);
  if (topK > 0) ranked = ranked.slice(0, topK);
  const kMass = ranked.reduce((s, x) => s + x.p, 0);
  let mass = 0;
  ranked = ranked.filter((x) => {
    const keep = mass < topP;
    mass += x.p / kMass;
    return keep;
  });
  const total = ranked.reduce((s, x) => s + x.p, 0);
  return base.map((_, id) => (ranked.find((x) => x.id === id)?.p ?? 0) / total);
}
export function sample(probabilities, seed = 42) {
  const value = random(seed)();
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (value < cumulative) return i;
  }
  return probabilities.length - 1;
}
export const LOCAL_LOGITS = [
  0.2, 0.1, -1, -0.8, 0.5, 3, 1.5, -0.4, 2.2, -0.3, -0.7, -1.1, -0.6, -0.9, 0.3,
  -0.5,
];
export const LOCAL_ATTENTION = () => {
  const q = [
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [2, 0, 0, 0],
  ];
  const k = [
    [2, 0, 0, 0],
    [1, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const v = [
    [1, 0, 0, 0],
    [0, 2, 0, 0],
    [0, 0, 3, 0],
  ];
  return { Q: q, K: k, V: v, ...attention(q, k, v) };
};
export const ANALOGY = {
  king: [1.1, 0.8, 0.3, 0.2],
  man: [0.8, 0.1, 0.2, -0.1],
  woman: [0.1, 0.6, 0.3, 0.1],
  queen: [0.42, 1.28, 0.41, 0.39],
  cat: [-0.6, 0.2, 0.8, 0.1],
  street: [0.2, -0.7, 0.2, 0.8],
};
export const cosine = (a, b) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b));
export function analogyResult() {
  const vector = ANALOGY.king.map(
    (x, i) => x - ANALOGY.man[i] + ANALOGY.woman[i],
  );
  return {
    vector,
    ranking: Object.entries(ANALOGY)
      .map(([word, v]) => ({ word, cosine: cosine(vector, v) }))
      .sort((a, b) => b.cosine - a.cosine),
  };
}
export function tensor(id, values, sourceTensorIds, operation, mask) {
  const matrix = Array.isArray(values[0]);
  return {
    id,
    shape: matrix ? [values.length, values[0].length] : [values.length],
    values: values.flat(),
    sourceTensorIds,
    operation,
    ...(mask
      ? { maskedIndices: mask.flat().flatMap((x, i) => (x ? [i] : [])) }
      : {}),
  };
}
export function fixture(ids = PRESETS.journey, seed = 42) {
  const weights = makeWeights(seed),
    result = forward(ids, weights);
  const tensors = [
    tensor("E", weights.E, [], "deterministic weights"),
    tensor("P", weights.P, [], "learned position demo"),
    tensor("embedding", result.embeddings, ["E", "ids"], "lookup"),
    tensor("position", result.positions, ["P"], "lookup"),
    tensor("X0", result.X0, ["embedding", "position"], "add"),
  ];
  result.blocks.forEach((b, l) => {
    const prefix = `L${l + 1}.`,
      input = l === 0 ? "X0" : `L${l}.X`;
    const save = (name, values, sources, operation, mask) =>
      tensors.push(tensor(prefix + name, values, sources, operation, mask));
    Object.entries(weights.blocks[l]).forEach(([name, values]) =>
      save(name, values, [], "weights; bias = 0"),
    );
    save("U", b.U, [input], "LayerNorm; gamma=1, beta=0, epsilon=1e-5");
    for (const name of ["Q", "K", "V"])
      save(
        name,
        b[name],
        [
          prefix + "U",
          prefix + "W" + name.toLowerCase(),
          prefix + "b" + name.toLowerCase(),
        ],
        "matmul + bias",
      );
    b.heads.forEach((h, head) => {
      const hId = `H${head + 1}.`;
      for (const name of ["Q", "K", "V"])
        save(hId + name, h[name], [prefix + name], "split heads");
      save(
        hId + "raw",
        h.raw,
        [prefix + hId + "Q", prefix + hId + "K"],
        "Q @ K.T",
      );
      save(hId + "scaled", h.scaled, [prefix + hId + "raw"], "divide sqrt(4)");
      save(
        hId + "masked",
        h.scaled,
        [prefix + hId + "scaled"],
        "causal mask; maskedIndices encode -Infinity",
        h.mask,
      );
      save(hId + "A", h.A, [prefix + hId + "masked"], "stable softmax");
      save(hId + "Z", h.Z, [prefix + hId + "A", prefix + hId + "V"], "A @ V");
    });
    save(
      "concat",
      b.concat,
      [prefix + "H1.Z", prefix + "H2.Z"],
      "concat heads",
    );
    save(
      "out",
      b.out,
      [prefix + "concat", prefix + "Wo", prefix + "bo"],
      "matmul + bias",
    );
    save("R", b.R, [input, prefix + "out"], "residual add");
    save("N", b.N, [prefix + "R"], "LayerNorm");
    save(
      "expanded",
      b.expanded,
      [prefix + "N", prefix + "W1", prefix + "b1"],
      "matmul + bias",
    );
    save("activation", b.activation, [prefix + "expanded"], "GELU");
    save(
      "M",
      b.M,
      [prefix + "activation", prefix + "W2", prefix + "b2"],
      "matmul + bias",
    );
    save("X", b.X, [prefix + "R", prefix + "M"], "residual add");
  });
  tensors.push(
    tensor("H", result.H, ["L2.X"], "final LayerNorm"),
    tensor("logits", result.logits, ["H", "E"], "H[last] @ E.T"),
    tensor("probabilities", softmax(result.logits), ["logits"], "softmax"),
  );
  const stationFor = (id) =>
    id === "H" || id === "logits" || id === "probabilities"
      ? "sampling"
      : ["embedding", "position", "X0"].includes(id)
        ? "embedding"
        : /\.H[12]\./.test(id) || /\.(concat|out)$/.test(id)
          ? "attention"
          : /\.(U|Q|K|V)$/.test(id)
            ? "qkv"
            : "transformer";
  const steps = tensors
    .filter((t) => t.sourceTensorIds.length)
    .map((t) => ({
      id: `step:${t.id}`,
      station: stationFor(t.id),
      durationMs: 2700,
      fromTensorIds: t.sourceTensorIds,
      toTensorIds: [t.id],
      narrationKey: t.operation,
    }));
  return {
    kind: "pipeline",
    provenance:
      "Bobot mainan deterministik; tidak berasal dari GPT-2. Tidak dilatih untuk bahasa.",
    modelProfile: PROFILE,
    tokenizerProfile: "toy vocabulary lookup; bukan byte-level BPE GPT-2",
    seed,
    schemaVersion: 1,
    contentVersion: "1.0.0",
    inputs: { ids, text: ids.map((id) => VOCAB[id]).join("") },
    weights,
    tensors,
    steps,
    result,
  };
}
export function validateFixture(data) {
  if (
    data.schemaVersion !== 1 ||
    data.kind !== "pipeline" ||
    data.tensors.length < 70
  )
    throw new Error("Schema fixture tidak valid");
  const ids = new Set([...data.tensors.map((t) => t.id), "ids"]);
  for (const t of data.tensors) {
    if (
      t.shape.reduce((a, b) => a * b, 1) !== t.values.length ||
      t.values.some((x) => !Number.isFinite(x))
    )
      throw new Error(`Tensor ${t.id} tidak valid`);
    if (t.sourceTensorIds.some((id) => !ids.has(id)))
      throw new Error(`Lineage ${t.id} tidak valid`);
    if (t.maskedIndices?.some((i) => i < 0 || i >= t.values.length))
      throw new Error("Mask tidak valid");
  }
  return data;
}
