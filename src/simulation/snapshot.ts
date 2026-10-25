import { t } from "../i18n/core.mjs";
import journey from "../scenarios/journey.json";
import {
  forward,
  LOCAL_ATTENTION,
  LOCAL_LOGITS,
  distribution,
  analogyResult,
  validateFixture,
  effectiveIds,
  TOKENIZER_PRESETS,
} from "./engine.mjs";
import { FixtureSchema } from "./schema";
import { operations } from "../content/lessons";
import type { LinkState } from "../navigation/state";
export type Matrix = number[][];
export const baseFixture = validateFixture(journey);
FixtureSchema.parse(journey);
export const weights = journey.weights;
export function getSnapshot(
  state: LinkState & { ids: number[]; swapped: boolean; analogyCase?: string },
) {
  const ids = effectiveIds(state);
  const result = forward(ids, weights);
  const b = result.blocks[state.layer],
    h = b.heads[state.head];
  const local =
    state.experiment === "C" &&
    state.local &&
    state.station === "attention" &&
    state.step <= 5;
  const attention = local ? LOCAL_ATTENTION() : h;
  const op = operations[state.station][state.step];
  const aKeys = ["raw", "scaled", "masked", "A", "Z", "headQ"];
  let values: Matrix;
  let sources: string[] = [],
    tensorId = op.tensor,
    mask: boolean[][] | undefined;
  const key = op.tensor;
  if (key === "ids") {
    const preset = TOKENIZER_PRESETS[state.preset];
    values = [preset.ids.map((id: string) => +id.split(":")[1])];
    sources = [`preset ${preset.title}; profil ${preset.ids[0].split(":")[0]}`];
  } else if (key === "embedding") {
    values = result.embeddings;
    sources = ["E: [16,8]", "ids"];
  } else if (key === "position") {
    values = result.positions;
    sources = ["P: [12,8]", "positions"];
  } else if (key === "X0") {
    values = result.X0;
    sources = ["embedding", "position"];
  } else if (key === "H") {
    values = result.H;
    sources = ["L2.X"];
  } else if (key === "logits" || key === "probabilities") {
    const logits = state.experiment === "F" ? LOCAL_LOGITS : result.logits;
    values = [
      key === "logits"
        ? logits
        : distribution(
            logits,
            state.sampler === "greedy" ? 0 : state.temperature,
            state.topK,
            state.topP,
          ),
    ];
    sources =
      state.experiment === "F"
        ? [t("logits lokal terkurasi; pipeline terpisah")]
        : ["H[last]", "E.T: [8,16]"];
  } else if (key === "analogy") {
    const example = analogyResult(state.analogyCase);
    values = [...Object.values(example.vectors), example.vector] as Matrix;
    sources = [t("word vectors mainan statis: {0}", example.title)];
  } else if (aKeys.includes(key)) {
    values =
      key === "headQ"
        ? attention.Q
        : key === "masked"
          ? attention.scaled
          : (attention[key as keyof typeof attention] as Matrix);
    if (key === "masked") mask = attention.mask;
    tensorId = `${local ? "local" : `L${state.layer + 1}`}.H${state.head + 1}.${key}`;
    sources =
      key === "Z"
        ? ["A", "V"]
        : key === "headQ"
          ? ["Q: split heads"]
          : ["Q", "K", "causal mask (j > i)"];
  } else {
    values = b[key as keyof typeof b] as Matrix;
    tensorId = `L${state.layer + 1}.${key}`;
    sources =
      journey.tensors.find((t) => t.id === tensorId)?.sourceTensorIds ?? [];
  }
  const rows = values.length,
    columns = values[0].length;
  const row = Math.min(state.token, rows - 1),
    column = Math.min(state.column, columns - 1);
  const provenance =
    local ||
    (state.experiment === "F" &&
      state.station === "sampling" &&
      state.step >= 1) ||
    state.station === "analogy"
      ? t("concept-vignette · contoh lokal")
      : "pipeline · seed 42 · v1.0.0";
  return {
    ids,
    result,
    b,
    h,
    attention,
    op,
    values,
    mask,
    sources,
    tensorId,
    row,
    column,
    provenance,
    local,
  };
}
export type Snapshot = ReturnType<typeof getSnapshot>;
export const fmt = (x: number, precision = 4) =>
  Math.abs(x) < 10 ** -precision ? "0" : x.toFixed(precision);
