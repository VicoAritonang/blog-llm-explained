import { t } from "../i18n/core.mjs";
import { create } from "zustand";
import { missions, evaluateTrial } from "../simulation/playground.mjs";
const storageKey = "neurolab-discoveries-v1";
function readDiscoveries(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(ids)
      ? [
          ...new Set(
            ids.filter(
              (id): id is string =>
                typeof id === "string" && missions.some((m) => m.id === id),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
type Trial = {
  passed: boolean;
  reason: string;
  reading: string;
  setting: number;
  prediction: number | null;
};
type Playground = {
  active: string | null;
  settings: Record<string, number>;
  predictions: Record<string, number>;
  completed: string[];
  trials: Record<string, Trial>;
  runs: number;
  start: (id: string) => void;
  configure: (id: string, value: number) => void;
  predict: (id: string, value: number) => void;
  cycle: (station: string) => string;
  run: () => Trial | null;
};
export const usePlayground = create<Playground>((set, get) => ({
  active: null,
  settings: Object.fromEntries(missions.map((m) => [m.id, 0])),
  predictions: {},
  completed: readDiscoveries(),
  trials: {},
  runs: 0,
  start: (id) => {
    if (missions.some((m) => m.id === id)) set({ active: id });
  },
  configure: (id, value) => {
    const m = missions.find((m) => m.id === id);
    if (
      m &&
      Number.isInteger(value) &&
      value >= 0 &&
      value < m.options.length
    ) {
      const trials = { ...get().trials };
      delete trials[id];
      set({ settings: { ...get().settings, [id]: value }, trials });
    }
  },
  predict: (id, value) => {
    if (missions.some((m) => m.id === id) && [0, 1].includes(value)) {
      const trials = { ...get().trials };
      delete trials[id];
      set({ predictions: { ...get().predictions, [id]: value }, trials });
    }
  },
  cycle: (station) => {
    const m = missions.find((m) => m.station === station);
    if (!m)
      return t(
        "Kalibrator bekerja di tokenizer, embedding, attention, Transformer, sampling, dan cache. Gunakan Lensa head pada Q/K/V.",
      );
    get().configure(m.id, (get().settings[m.id] + 1) % m.options.length);
    set({ active: m.id });
    return t(
      "{0}: {1}. {2}. Buka Misi untuk prediksi dan uji.",
      m.parameter,
      m.options[get().settings[m.id]],
      m.readings[get().settings[m.id]],
    );
  },
  run: () => {
    const s = get(),
      m = missions.find((m) => m.id === s.active);
    if (!m) return null;
    const setting = s.settings[m.id],
      prediction = s.predictions[m.id] ?? null;
    const result = {
      ...evaluateTrial(m.id, setting, prediction),
      reading: m.readings[setting],
      setting,
      prediction,
    };
    const completed = result.passed
      ? [...new Set([...s.completed, m.id])]
      : s.completed;
    if (result.passed)
      try {
        localStorage.setItem(storageKey, JSON.stringify(completed));
      } catch {
        /* Experiments remain usable when storage is unavailable. */
      }
    set({
      trials: { ...s.trials, [m.id]: result },
      completed,
      runs: s.runs + 1,
    });
    return result;
  },
}));
