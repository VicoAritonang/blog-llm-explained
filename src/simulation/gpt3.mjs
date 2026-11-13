// Published GPT-3 figures and the closed-form accounting built on them. Nothing
// here loads weights: every number is either quoted from the paper or derived
// from those quoted dimensions. Source: https://arxiv.org/abs/2005.14165
export const CONTEXT = 2048;
export const TRAINING_TOKENS = 300e9;
// GPT-3 reuses the GPT-2 tokenizer ("reversible tokenization"), whose vocabulary
// has 50,257 entries. The GPT-3 paper does not restate the number.
export const VOCABULARY = 50257;
export const MINI_PARAMETERS = 20256;
export const PAPER_TOTAL_FLOPS = 3.14e23;
export const PAPER_PF_DAYS = 3640;

// `appendix` is Table D.1 (millions of parameters). `tableWidth` is only set
// where Table 2.1 prints a width that disagrees with n_heads × d_head.
export const gpt3Models = [
  {
    id: "small",
    name: "Small",
    layers: 12,
    width: 768,
    heads: 12,
    headWidth: 64,
    batch: 0.5e6,
    rate: 6e-4,
    appendix: 125,
  },
  {
    id: "medium",
    name: "Medium",
    layers: 24,
    width: 1024,
    heads: 16,
    headWidth: 64,
    batch: 0.5e6,
    rate: 3e-4,
    appendix: 356,
  },
  {
    id: "large",
    name: "Large",
    layers: 24,
    width: 1536,
    heads: 16,
    headWidth: 96,
    batch: 0.5e6,
    rate: 2.5e-4,
    appendix: 760,
  },
  {
    id: "xl",
    name: "XL",
    layers: 24,
    width: 2048,
    heads: 24,
    headWidth: 128,
    batch: 1e6,
    rate: 2e-4,
    appendix: 1320,
  },
  {
    id: "2.7b",
    name: "2.7B",
    layers: 32,
    width: 2560,
    heads: 32,
    headWidth: 80,
    batch: 1e6,
    rate: 1.6e-4,
    appendix: 2650,
  },
  {
    id: "6.7b",
    name: "6.7B",
    layers: 32,
    width: 4096,
    heads: 32,
    headWidth: 128,
    batch: 2e6,
    rate: 1.2e-4,
    appendix: 6660,
  },
  {
    id: "13b",
    name: "13B",
    layers: 40,
    width: 5120,
    tableWidth: 5140,
    heads: 40,
    headWidth: 128,
    batch: 2e6,
    rate: 1e-4,
    appendix: 12850,
  },
  {
    id: "175b",
    name: "175B",
    layers: 96,
    width: 12288,
    heads: 96,
    headWidth: 128,
    batch: 3.2e6,
    rate: 0.6e-4,
    appendix: 174600,
  },
];
export const gpt3 = gpt3Models[gpt3Models.length - 1];

// Table 2.2. Printed weights sum to 101% because each one is rounded.
export const datasetMix = [
  { name: "Common Crawl (difilter)", tokens: 410e9, weight: 0.6, epochs: 0.44 },
  { name: "WebText2", tokens: 19e9, weight: 0.22, epochs: 2.9 },
  { name: "Books1", tokens: 12e9, weight: 0.08, epochs: 1.9 },
  { name: "Books2", tokens: 55e9, weight: 0.08, epochs: 0.43 },
  { name: "Wikipedia", tokens: 3e9, weight: 0.03, epochs: 3.4 },
];
export const epochsFromWeight = (d, tokens = TRAINING_TOKENS) =>
  (d.weight * tokens) / d.tokens;

// Tables 3.2 and 3.3, GPT-3 175B, accuracy in percent.
export const fewShotResults = [
  { task: "LAMBADA", zero: 76.2, one: 72.5, few: 86.4 },
  { task: "StoryCloze", zero: 83.2, one: 84.7, few: 87.7 },
  { task: "HellaSwag", zero: 78.9, one: 78.1, few: 79.3 },
  { task: "TriviaQA", zero: 64.3, one: 68.0, few: 71.2 },
  { task: "WebQuestions", zero: 14.4, one: 25.3, few: 41.5 },
  { task: "NaturalQuestions", zero: 14.6, one: 23.0, few: 29.9 },
];

export function parameterBreakdown(
  { layers, width },
  { vocabulary = VOCABULARY, context = CONTEXT } = {},
) {
  const parts = {
    tokenEmbedding: vocabulary * width,
    positionEmbedding: context * width,
    attention: layers * (4 * width * width + 4 * width),
    mlp: layers * (8 * width * width + 5 * width),
    norm: layers * 4 * width + 2 * width,
  };
  return {
    ...parts,
    total: Object.values(parts).reduce((sum, value) => sum + value, 0),
  };
}

export const trainingFlops = (parameters, tokens) => 6 * parameters * tokens;
export const pfDays = (flops) => flops / (1e15 * 86400);

// Mean number of keys one query reads across a sequence of `context` positions.
export function averageVisible(context, window = context) {
  const band = Math.min(window, context);
  return (
    (band * (band + 1)) / 2 / context + ((context - band) * band) / context
  );
}

// Forward FLOPs per token: 2 per matmul parameter, plus QKᵀ and A·V at 2·d per
// visible key each. `window` sets the band on every second layer.
export function forwardFlops(model, context, window = context) {
  const parts = parameterBreakdown(model),
    matmul = 2 * (parts.attention + parts.mlp + parts.tokenEmbedding),
    dense = Math.ceil(model.layers / 2),
    banded = model.layers - dense,
    attention =
      4 *
      model.width *
      (dense * averageVisible(context) +
        banded * averageVisible(context, window));
  return { matmul, attention, share: attention / (matmul + attention) };
}

export function kvCacheBytes({
  layers,
  headWidth,
  kvHeads,
  context,
  batch = 1,
  bytes = 2,
}) {
  return 2 * layers * kvHeads * headWidth * context * batch * bytes;
}
export const weightBytes = (parameters, bytes = 2) => parameters * bytes;

// Smallest batch whose cache outgrows the weights it serves.
export function batchWhereCacheExceedsWeights(model, options) {
  const perSequence = kvCacheBytes({
    layers: model.layers,
    headWidth: model.headWidth,
    batch: 1,
    ...options,
  });
  return Math.ceil(
    weightBytes(parameterBreakdown(model).total, options.bytes) / perSequence,
  );
}

// Chinchilla's fit lands near 20 tokens per parameter (70B on 1.4T tokens).
export const CHINCHILLA_RATIO = 20;
export function computeOptimal(flops, ratio = CHINCHILLA_RATIO) {
  const parameters = Math.sqrt(flops / (6 * ratio));
  return { parameters, tokens: parameters * ratio };
}

export const demonstrationsThatFit = (
  exampleTokens,
  questionTokens = 100,
  context = CONTEXT,
) => Math.max(0, Math.floor((context - questionTokens) / exampleTokens));
