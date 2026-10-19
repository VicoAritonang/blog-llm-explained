import {
  stations,
  operations,
  experiments,
  type StationId,
  type ExperimentId,
} from "../content/lessons";
export type LinkState = {
  experiment: ExperimentId;
  station: StationId;
  step: number;
  head: number;
  layer: number;
  token: number;
  column: number;
  seed: number;
  temperature: number;
  topK: number;
  topP: number;
  sampler: "greedy" | "sample";
  suffix: "tired" | "wide";
  local: boolean;
  preset: number;
  ids: number[];
  swapped: boolean;
  cache: boolean;
  selected: number | null;
  tab: "meaning" | "numbers" | "code";
};
export const defaults: LinkState = {
  experiment: "A",
  station: "tokenizer",
  step: 0,
  head: 0,
  layer: 0,
  token: 4,
  column: 0,
  seed: 42,
  temperature: 1,
  topK: 0,
  topP: 1,
  sampler: "sample",
  suffix: "tired",
  local: false,
  preset: 0,
  ids: [0, 1, 2, 3, 4],
  swapped: false,
  cache: true,
  selected: null,
  tab: "meaning",
};
export function readLink(hash: string): LinkState {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const experiment =
    experiments.find((x) => x.id === p.get("experiment"))?.id ??
    defaults.experiment;
  const station =
    stations.find((x) => x.id === p.get("station"))?.id ?? defaults.station;
  const number = (
    key: string,
    fallback: number,
    min: number,
    max: number,
    integer = true,
  ) => {
    const value = p.has(key) ? Number(p.get(key)) : fallback;
    return Number.isFinite(value) && (!integer || Number.isInteger(value))
      ? Math.max(min, Math.min(max, value))
      : fallback;
  };
  const supplied = p.get("ids")?.split(",").map(Number);
  const ids =
    supplied &&
    supplied.length > 0 &&
    supplied.length <= 12 &&
    supplied.every((x) => Number.isInteger(x) && x >= 0 && x < 16)
      ? supplied
      : [...defaults.ids];
  return {
    experiment,
    station,
    step: number("step", 0, 0, operations[station].length - 1),
    head: number("head", 0, 0, 1),
    layer: number("layer", 0, 0, 1),
    token: number("token", 4, 0, 11),
    column: number("column", 0, 0, 31),
    seed: number("seed", 42, 0, 4294967295),
    temperature: number("temperature", 1, 0, 2, false),
    topK: number("topK", 0, 0, 16),
    topP: number("topP", 1, 0.05, 1, false),
    sampler: p.get("sampler") === "greedy" ? "greedy" : "sample",
    suffix: p.get("suffix") === "wide" ? "wide" : "tired",
    local: p.get("local") === "1",
    preset: number("preset", 0, 0, 3),
    ids,
    swapped: p.get("swapped") === "1",
    cache: p.get("cache") !== "0",
    selected:
      p.get("selected") === "null" || !p.has("selected")
        ? null
        : number("selected", 0, 0, 15),
    tab:
      p.get("tab") === "numbers" || p.get("tab") === "code"
        ? (p.get("tab") as "numbers" | "code")
        : "meaning",
  };
}
export function writeLink(state: LinkState) {
  const p = new URLSearchParams();
  (Object.keys(defaults) as (keyof LinkState)[]).forEach((key) => {
    const value = state[key];
    p.set(
      key,
      typeof value === "boolean" ? (value ? "1" : "0") : String(value),
    );
  });
  return "#" + p.toString();
}
