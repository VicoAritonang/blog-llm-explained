import { create } from "zustand";
import {
  challengeKey,
  stationById,
  stations,
  type StationId,
} from "./content";

const KEY = "neurolab-dunia3d-v1";
type Note = [object: number, place: number, color: number];
interface Saved {
  done: string[];
  started: boolean;
  note: Note;
}
function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && Array.isArray(raw.done))
      return {
        done: raw.done.filter((x: unknown) => typeof x === "string"),
        started: !!raw.started,
        note:
          Array.isArray(raw.note) && raw.note.length === 3
            ? (raw.note.map((n: number) => Math.max(0, Math.min(3, n | 0))) as Note)
            : [0, 0, 0],
      };
  } catch {
    /* storage may be blocked; the world still works for this visit */
  }
  return { done: [], started: false, note: [0, 0, 0] };
}

export interface Toast {
  key: string;
  station: StationId;
  title: string;
  text: string;
}

interface WorldState {
  done: Set<string>;
  started: boolean;
  /** The shared note: every station reads the same prompt. */
  note: Note;
  focus: StationId | null;
  near: StationId | null;
  /** Bumped to move the player in front of a station. */
  travel: { id: StationId; n: number } | null;
  toasts: Toast[];
  panel: "cards" | "finale" | null;
  complete: (station: StationId, id: string) => void;
  setNote: (note: Note) => void;
  setFocus: (id: StationId | null) => void;
  setNear: (id: StationId | null) => void;
  goTo: (id: StationId) => void;
  start: () => void;
  dismiss: (key: string) => void;
  setPanel: (panel: WorldState["panel"]) => void;
  reset: () => void;
}

const saved = load();
const persist = (s: Pick<WorldState, "done" | "started" | "note">) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ done: [...s.done], started: s.started, note: s.note }),
    );
  } catch {
    /* ignore */
  }
};

export const useWorld = create<WorldState>((set, get) => ({
  done: new Set(saved.done),
  started: saved.started,
  note: saved.note,
  focus: null,
  near: null,
  travel: null,
  toasts: [],
  panel: null,
  complete(station, id) {
    const key = challengeKey(station, id);
    const state = get();
    if (state.done.has(key)) return;
    const challenge = stationById[station].challenges.find((c) => c.id === id);
    if (!challenge) return;
    const done = new Set(state.done).add(key);
    const toast = { key, station, ...challenge.insight };
    set({ done, toasts: [...state.toasts.slice(-1), toast] });
    persist({ ...get(), done });
  },
  setNote(note) {
    set({ note });
    persist(get());
  },
  setFocus(focus) {
    if (get().focus !== focus) set({ focus });
  },
  setNear(near) {
    if (get().near !== near) set({ near });
  },
  goTo(id) {
    set((s) => ({ travel: { id, n: (s.travel?.n ?? 0) + 1 }, focus: id }));
  },
  start() {
    set({ started: true });
    persist(get());
  },
  dismiss(key) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.key !== key) }));
  },
  setPanel(panel) {
    set({ panel });
  },
  reset() {
    const fresh = { done: new Set<string>(), started: true, note: [0, 0, 0] as Note };
    set({ ...fresh, toasts: [], focus: null, panel: null });
    persist(fresh);
  },
}));

/** True while the given station has the visitor's attention. */
export const useFocused = (id: StationId) => useWorld((s) => s.focus === id);
export const useDone = (id: StationId, challenge: string) =>
  useWorld((s) => s.done.has(challengeKey(id, challenge)));
export const nextStation = (done: Set<string>) =>
  stations.find((s) =>
    s.challenges.some((c) => !done.has(challengeKey(s.id, c.id))),
  ) ?? null;
