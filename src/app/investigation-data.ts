import model from "../simulation/story/checkpoint.json";
import evaluation from "../simulation/story/evaluation.json";
import { cases } from "../simulation/story/cases.mjs";
import {
  tokenize,
  generate,
  forward,
  distribution,
} from "../simulation/story/engine.mjs";
export { model, evaluation, cases };
export type CaseId = keyof typeof cases;
export const visible = (text: string) =>
  text.replaceAll(" ", "·").replaceAll("\n", "↵");
export const fmt = (n: number) =>
  !Number.isFinite(n)
    ? "−∞"
    : n === 0
      ? "0"
      : Math.abs(n) < 0.0001
        ? n.toExponential(2)
        : n.toFixed(4);
export const percent = (n: number) =>
  n > 0 && n < 0.0001 ? "<0.01%" : `${(n * 100).toFixed(2)}%`;
// Reader-facing form for the level paths; the inspector keeps numeric notation.
export const percentId = (n: number) => percent(n).replace(".", ",");
export const promptIds = (id: CaseId) =>
  tokenize(cases[id].prompt, model).map((t: { id: number }) => t.id);
const runs = new Map<CaseId, ReturnType<typeof generate>>();
export function getRun(id: CaseId) {
  if (!runs.has(id)) runs.set(id, generate(promptIds(id), model));
  return runs.get(id)!;
}
export function getTrace(id: CaseId, step: number) {
  const run = getRun(id);
  return forward(run.steps[Math.min(step, run.steps.length - 1)].ids, model);
}
export function tracePacket(
  caseId: CaseId,
  step: number,
  layer: number,
  head: number,
  position: number,
  trace: ReturnType<typeof forward>,
  policy: {
    temperature: number;
    topK: number;
    topP: number;
    seed: number;
    greedy: boolean;
  },
) {
  const run = getRun(caseId),
    promptLength = promptIds(caseId).length;
  return {
    version: 1,
    source: "live-model",
    modelId: model.version,
    checkpoint: model.checkpoint,
    tokenizer: model.tokenizer,
    profile: model.profile,
    vocabulary: model.vocab,
    case: cases[caseId],
    promptLength,
    generationStep: step,
    layer,
    head,
    position,
    tokens: trace.ids.map((id: number, p: number) => ({
      id,
      position: p,
      text: model.vocab[id],
      source: p < promptLength ? "prompt" : "generated",
    })),
    generationHistory: run.steps.slice(0, step),
    historyPolicy:
      "greedy with the normal architecture; diagnostics reuse this frozen prefix",
    status: step === run.steps.length - 1 ? run.stop : "paused",
    policy,
    selection: distribution(trace.lastLogits, policy),
    trace,
    serialization:
      "Masked -Infinity scores are null in JSON; causal config and column > row identify these entries.",
  };
}
export type Evidence = {
  lesson: number;
  checkpoint: string;
  prediction: string;
  changed: string;
  controls: string;
  observation: string;
  conclusion: string;
  reflection: string;
  status: "observed" | "explained";
  caseId: CaseId;
  step: number;
  layer: number;
  head: number;
  position: number;
  diagnosticMask?: boolean;
  ablation?: string;
  trainingUpdates?: number;
  policy?: {
    temperature: number;
    topK: number;
    topP: number;
    seed: number;
    greedy: boolean;
  };
};
export const BOOK_KEY = "neurolab-evidence-v2";
export function readBook(): Evidence[] {
  try {
    const data = JSON.parse(localStorage.getItem(BOOK_KEY) || "[]");
    return Array.isArray(data)
      ? data.filter(
          (e): e is Evidence =>
            e &&
            e.checkpoint === model.checkpoint &&
            Number.isInteger(e.lesson) &&
            e.lesson >= 0 &&
            e.lesson < 14 &&
            e.caseId in cases &&
            typeof e.observation === "string" &&
            typeof e.prediction === "string" &&
            typeof e.conclusion === "string" &&
            typeof e.reflection === "string" &&
            ["observed", "explained"].includes(e.status) &&
            [e.step, e.layer, e.head, e.position].every(Number.isInteger) &&
            e.step >= 0 &&
            e.step < 8 &&
            e.layer >= 0 &&
            e.layer < 2 &&
            e.head >= 0 &&
            e.head < 2 &&
            e.position >= 0 &&
            e.position < 64 &&
            (e.diagnosticMask === undefined ||
              typeof e.diagnosticMask === "boolean") &&
            (e.ablation === undefined ||
              ["none", "attention", "mlp", "residual"].includes(e.ablation)) &&
            (e.trainingUpdates === undefined ||
              (Number.isInteger(e.trainingUpdates) &&
                e.trainingUpdates >= 0 &&
                e.trainingUpdates <= 1000)) &&
            (!e.policy ||
              (Number.isFinite(e.policy.temperature) &&
                e.policy.temperature >= 0 &&
                e.policy.temperature <= 4 &&
                Number.isInteger(e.policy.topK) &&
                e.policy.topK >= 0 &&
                e.policy.topK <= 32 &&
                e.policy.topP > 0 &&
                e.policy.topP <= 1 &&
                Number.isInteger(e.policy.seed) &&
                typeof e.policy.greedy === "boolean")),
        )
      : [];
  } catch {
    return [];
  }
}
export function downloadJSON(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
