import { create } from "zustand";
import { defaults, readLink, type LinkState } from "../navigation/state";
import {
  operations,
  stations,
  experiments,
  type StationId,
  type ExperimentId,
} from "../content/lessons";
import {
  PRESETS,
  VOCAB,
  forward,
  distribution,
  sample,
  LOCAL_LOGITS,
  effectiveIds,
} from "../simulation/engine.mjs";
type State = LinkState & {
  entered: boolean;
  mode: "3d" | "2d";
  camera: "guided" | "orbit" | "walk";
  playing: boolean;
  speed: number;
  quality: "low" | "medium" | "high";
  reducedMotion: boolean;
  overview: boolean;
  tab: "meaning" | "numbers" | "code";
  analogyCase: string;
  ids: number[];
  selected: number | null;
  cache: boolean;
  swapped: boolean;
  traced: boolean;
  finished: boolean;
  prefixBeforeDecode: number[] | null;
  decodedToken: number | null;
  completedStations: string[];
  patch: (value: Partial<State>) => void;
  navigate: (id: StationId, step?: number) => void;
  next: () => void;
  previous: () => void;
  experimentTo: (id: ExperimentId) => void;
  append: () => void;
  resetPrefix: () => void;
  replay: () => void;
};
const linked = readLink(location.hash);
export const useExperience = create<State>((set, get) => ({
  ...linked,
  entered: Boolean(location.hash.includes("station=")),
  mode: "3d",
  camera: "guided",
  playing: false,
  speed: 1,
  quality: matchMedia("(max-width: 760px)").matches ? "low" : "medium",
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  overview: false,
  tab: linked.tab,
  analogyCase: "capitals",
  ids:
    linked.experiment === "D"
      ? [...PRESETS[linked.suffix === "wide" ? "causalWide" : "causalTired"]]
      : linked.ids,
  selected: linked.selected,
  traced: false,
  finished: false,
  prefixBeforeDecode: null,
  decodedToken: null,
  completedStations: [],
  patch: (value) => set(value),
  navigate: (station, step = 0) =>
    set({
      station,
      step: Math.min(Math.max(step, 0), operations[station].length - 1),
      playing: false,
      overview: false,
      camera: "guided",
      column: 0,
    }),
  next: () => {
    const s = get();
    if (s.experiment === "A" && s.step === operations[s.station].length - 1)
      set({
        completedStations: [...new Set([...s.completedStations, s.station])],
      });
    if (s.experiment === "B" && s.station === "tokenizer" && s.step === 2) {
      s.experimentTo("A");
      return;
    }
    if (
      s.experiment === "C" &&
      s.local &&
      s.station === "attention" &&
      s.step === 5
    ) {
      set({ local: false, step: 0, token: 4, column: 0 });
      return;
    }
    if (s.station === "sampling" && s.step >= 2 && s.selected === null) {
      const logits =
        s.experiment === "F" ? LOCAL_LOGITS : forward(effectiveIds(s)).logits;
      const probabilities = distribution(
        logits,
        s.sampler === "greedy" ? 0 : s.temperature,
        s.topK,
        s.topP,
      );
      set({
        selected:
          s.sampler === "greedy" || s.temperature === 0
            ? logits.indexOf(Math.max(...logits))
            : sample(probabilities, s.seed),
      });
    }
    if (s.station === "cache" && s.step === 0 && s.selected !== null) {
      s.append();
      return;
    }
    if (
      s.station === "transformer" &&
      s.step === operations.transformer.length - 1 &&
      s.layer === 0 &&
      s.experiment === "A"
    ) {
      set({ layer: 1, step: 0, column: 0 });
      return;
    }
    if (s.step < operations[s.station].length - 1)
      set({ step: s.step + 1, column: 0 });
    else {
      const index = stations.findIndex((x) => x.id === s.station);
      if (index < 6)
        set({ station: stations[index + 1].id, step: 0, column: 0 });
      else set({ playing: false, finished: true });
    }
  },
  previous: () => {
    const s = get();
    if (s.station === "cache" && s.step === 1 && s.prefixBeforeDecode) {
      set({
        ids: s.prefixBeforeDecode,
        selected: s.decodedToken,
        prefixBeforeDecode: null,
        decodedToken: null,
        token: s.prefixBeforeDecode.length - 1,
        step: 0,
        playing: false,
      });
      return;
    }
    if (s.station === "transformer" && s.layer === 1 && s.step === 0) {
      set({
        layer: 0,
        step: operations.transformer.length - 1,
        playing: false,
      });
      return;
    }
    if (s.step > 0) set({ step: s.step - 1, playing: false, column: 0 });
    else {
      const index = stations.findIndex((x) => x.id === s.station);
      if (index > 0) {
        const station = stations[index - 1].id;
        set({
          station,
          step: operations[station].length - 1,
          playing: false,
          column: 0,
        });
      }
    }
  },
  experimentTo: (id) => {
    const station = experiments.find((e) => e.id === id)!.station;
    set({
      ...defaults,
      experiment: id,
      station,
      token: id === "D" ? 1 : id === "C" ? 2 : 4,
      local: id === "C",
      preset: id === "B" ? 1 : 0,
      ids: id === "D" ? [...PRESETS.causalTired] : [...PRESETS.journey],
      step: id === "C" || id === "D" ? 4 : id === "F" ? 2 : 0,
      playing: false,
      selected: null,
      swapped: false,
      overview: false,
      camera: "guided",
      finished: false,
      prefixBeforeDecode: null,
      decodedToken: null,
      completedStations: [],
    });
  },
  append: () => {
    const s = get();
    if (s.ids.length >= 12 || s.selected === null) return;
    const prefix = effectiveIds(s);
    set({
      ids: [...prefix, s.selected],
      prefixBeforeDecode: prefix,
      decodedToken: s.selected,
      swapped: false,
      token: prefix.length,
      selected: null,
      station: "cache",
      step: 1,
      playing: false,
      local: false,
    });
  },
  resetPrefix: () =>
    set({
      ids: [...PRESETS.journey],
      selected: null,
      token: 4,
      swapped: false,
      playing: false,
      step: 0,
      prefixBeforeDecode: null,
      decodedToken: null,
    }),
  replay: () => {
    const s = get();
    if (s.station === "cache" && s.prefixBeforeDecode)
      set({
        ids: s.prefixBeforeDecode,
        selected: s.decodedToken,
        prefixBeforeDecode: null,
        decodedToken: null,
        token: s.prefixBeforeDecode.length - 1,
      });
    set({ step: 0, playing: false });
  },
}));
export function tokenLabel(id: number) {
  return VOCAB[id].replaceAll(" ", "·");
}
