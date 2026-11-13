import { create } from "zustand";
import {
  challengeKey,
  isRegionDone,
  isRegionOpen,
  isStationDone,
  regionById,
  regions,
  stationById,
  stations,
  totalChallenges,
  type RegionId,
  type StationId,
} from "./content";
import { SPEEDRUN_MINUTES, achievementById } from "./achievements";
import { books } from "./books";

const KEY = "neurolab-dunia3d-v2";
type Note = [object: number, place: number, color: number];
export type Quality = "tinggi" | "ringan";
export type View = "tp" | "fp";
export type Tool = "tangan" | "pemindai" | "balok";
export interface Block {
  id: number;
  x: number;
  y: number;
  z: number;
  token: number;
}
interface Saved {
  done: string[];
  started: boolean;
  note: Note;
  visited: StationId[];
  talked: RegionId[];
  quality: Quality | null;
  view: View;
  blocks: Block[];
  scanned: StationId[];
  hints: number;
  playTime: number;
  bestTime: number | null;
  finished: boolean;
  earned: string[];
  islands: RegionId[];
  booksRead: string[];
}
const ids = new Set(stations.map((s) => s.id));
const isRegion = (x: unknown): x is RegionId => regions.some((r) => r.id === x);
const num = (x: unknown, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
function load(): Saved {
  const empty: Saved = {
    done: [],
    started: false,
    note: [0, 0, 0],
    visited: [],
    talked: [],
    quality: null,
    view: "tp",
    blocks: [],
    scanned: [],
    hints: 0,
    playTime: 0,
    bestTime: null,
    finished: false,
    earned: [],
    islands: [],
    booksRead: [],
  };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && Array.isArray(raw.done))
      return {
        done: raw.done.filter((x: unknown) => typeof x === "string"),
        started: !!raw.started,
        note: Array.isArray(raw.note) && raw.note.length === 3 ? (raw.note.map((n: number) => Math.max(0, Math.min(3, n | 0))) as Note) : [0, 0, 0],
        visited: Array.isArray(raw.visited) ? raw.visited.filter((x: StationId) => ids.has(x)) : [],
        talked: Array.isArray(raw.talked) ? raw.talked.filter(isRegion) : [],
        quality: raw.quality === "ringan" || raw.quality === "tinggi" ? raw.quality : null,
        view: raw.view === "fp" ? "fp" : "tp",
        blocks: Array.isArray(raw.blocks)
          ? raw.blocks
              .filter((b: Block) => b && [b.id, b.x, b.y, b.z, b.token].every((v) => Number.isFinite(v)))
              .slice(-300)
          : [],
        scanned: Array.isArray(raw.scanned) ? raw.scanned.filter((x: StationId) => ids.has(x)) : [],
        hints: num(raw.hints),
        playTime: num(raw.playTime),
        bestTime: raw.bestTime == null ? null : num(raw.bestTime, 0) || null,
        finished: !!raw.finished,
        earned: Array.isArray(raw.earned) ? raw.earned.filter((x: string) => achievementById[x]) : [],
        islands: Array.isArray(raw.islands) ? raw.islands.filter(isRegion) : [],
        booksRead: Array.isArray(raw.booksRead) ? raw.booksRead.filter((x: string) => books[x]) : [],
      };
  } catch {
    /* storage may be blocked; the world still works for this visit */
  }
  return empty;
}

export interface Toast {
  key: string;
  kind: "insight" | "part" | "unlock" | "achievement";
  color: string;
  label: string;
  title: string;
  text: string;
}
export type Panel = "cards" | "finale" | "log" | "map" | "awards" | null;
export interface Scan {
  title: string;
  text: string;
  point: [number, number, number];
  n: number;
}

interface WorldState extends Omit<Saved, "done" | "quality"> {
  done: Set<string>;
  quality: Quality;
  focus: StationId | null;
  near: StationId | null;
  nearKeeper: RegionId | null;
  /** Bumped to move the walker in front of a station. */
  travel: { id: StationId; n: number } | null;
  tracked: StationId | null;
  dialog: { region: RegionId; line: number } | null;
  toasts: Toast[];
  panel: Panel;
  tool: Tool;
  blockToken: number;
  scan: Scan | null;
  /** The book open on a lectern: spread index and the quiz answer picked. */
  reading: { book: string; page: number; answer: number | null } | null;
  nearBook: string | null;
  /** What the companion drone is saying right now. */
  nara: { text: string; n: number; point?: boolean } | null;
  complete: (station: StationId, id: string) => void;
  setNote: (note: Note) => void;
  setFocus: (id: StationId | null) => void;
  setNear: (id: StationId | null) => void;
  setNearKeeper: (id: RegionId | null) => void;
  goTo: (id: StationId) => void;
  track: (id: StationId | null) => void;
  talk: (region: RegionId | null) => void;
  nextLine: () => void;
  start: () => void;
  dismiss: (key: string) => void;
  setPanel: (panel: Panel) => void;
  setQuality: (q: Quality) => void;
  setView: (v: View) => void;
  setTool: (t: Tool) => void;
  setBlockToken: (t: number) => void;
  addBlock: (b: Omit<Block, "id">) => void;
  removeBlock: (id: number) => void;
  setScan: (scan: Omit<Scan, "n">, station?: StationId) => void;
  say: (text: string, point?: boolean) => void;
  askedHint: () => void;
  tick: (seconds: number) => void;
  stepOn: (region: RegionId) => void;
  award: (id: string) => void;
  openBook: (book: string) => void;
  closeBook: () => void;
  turnPage: (step: number) => void;
  answer: (option: number) => void;
  setNearBook: (book: string | null) => void;
  reset: () => void;
}

const saved = load();
const defaultQuality = (): Quality => {
  const param = new URLSearchParams(location.search).get("grafik");
  if (param === "ringan" || param === "tinggi") return param;
  return innerWidth < 760 ? "ringan" : "tinggi";
};
const persist = (s: WorldState | (Saved & { done: Set<string> | string[] })) => {
  try {
    const data: Saved = {
      done: [...s.done],
      started: s.started,
      note: s.note,
      visited: s.visited,
      talked: s.talked,
      quality: s.quality,
      view: s.view,
      blocks: s.blocks,
      scanned: s.scanned,
      hints: s.hints,
      playTime: s.playTime,
      bestTime: s.bestTime,
      finished: s.finished,
      earned: s.earned,
      islands: s.islands,
      booksRead: s.booksRead,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
};

export const useWorld = create<WorldState>((set, get) => ({
  ...saved,
  done: new Set(saved.done),
  quality: saved.quality ?? defaultQuality(),
  focus: null,
  near: null,
  nearKeeper: null,
  travel: null,
  tracked: null,
  dialog: null,
  toasts: [],
  panel: null,
  tool: "tangan",
  blockToken: 2,
  scan: null,
  nara: null,
  reading: null,
  nearBook: null,
  complete(station, id) {
    const key = challengeKey(station, id);
    const state = get();
    if (state.done.has(key)) return;
    const s = stationById[station];
    const challenge = s.challenges.find((c) => c.id === id);
    if (!challenge) return;
    const done = new Set(state.done).add(key);
    const fresh: Toast[] = [{ key, kind: "insight", color: s.color, label: `Temuan baru · ${s.name}`, ...challenge.insight }];
    let line: string | null = null;
    if (isStationDone(done, station)) {
      if (s.part) fresh.push({ key: `part-${station}`, kind: "part", color: "#ffd166", label: "Komponen GPT-3 didapat", title: s.part.name, text: `Di GPT-3: ${s.part.gpt3}.` });
      const next = stations.find((x) => isRegionOpen(done, x.region) && !isStationDone(done, x.id));
      line = next ? `Misi ${s.name} beres! Berikutnya ${next.name}. Tekan H kalau butuh arah.` : "Semua misi selesai. GPT-3 bangun!";
    }
    for (const r of regions)
      if (!isRegionOpen(state.done, r.id) && isRegionOpen(done, r.id)) {
        fresh.push({ key: `open-${r.id}`, kind: "unlock", color: r.color, label: "Jembatan terbuka", title: `${r.name} · ${r.phase}`, text: "Ikuti tiang cahaya untuk menyeberang." });
        line = `Jembatan ke ${r.name} terbuka! Itu ${r.phase.toLowerCase()}. Ayo!`;
      }
    let finished = state.finished,
      bestTime = state.bestTime;
    if (done.size === totalChallenges && !finished) {
      finished = true;
      bestTime = bestTime === null ? state.playTime : Math.min(bestTime, state.playTime);
    }
    set({
      done,
      finished,
      bestTime,
      toasts: [...state.toasts, ...fresh].slice(-3),
      tracked: state.tracked === station && isStationDone(done, station) ? null : state.tracked,
    });
    if (line) get().say(line);
    // achievements that follow from progress
    const a = get().award;
    a("pertama");
    if (isRegionDone(done, "belajar")) a("bab1");
    if (isRegionDone(done, "optimasi")) a("bab2");
    if (isRegionDone(done, "berjalan")) a("bab3");
    if (finished) {
      a("gpt3");
      if (state.playTime < SPEEDRUN_MINUTES * 60) a("kilat");
      if (state.hints <= 3) a("mandiri");
    }
    persist(get());
  },
  setNote(note) {
    set({ note });
    persist(get());
  },
  setFocus(focus) {
    if (get().focus === focus) return;
    const visited = focus && !get().visited.includes(focus) ? [...get().visited, focus] : get().visited;
    set({ focus, visited, dialog: null });
    persist(get());
  },
  setNear(near) {
    if (get().near !== near) set({ near });
  },
  setNearKeeper(nearKeeper) {
    if (get().nearKeeper !== nearKeeper) set({ nearKeeper });
  },
  goTo(id) {
    const s = get();
    if (!isRegionOpen(s.done, stationById[id].region)) return;
    set({ travel: { id, n: (s.travel?.n ?? 0) + 1 }, panel: null });
    s.setFocus(id);
  },
  track(tracked) {
    set({ tracked });
  },
  talk(region) {
    if (!region) return set({ dialog: null });
    const talked = get().talked.includes(region) ? get().talked : [...get().talked, region];
    set({ dialog: { region, line: 0 }, talked, focus: null });
    persist(get());
  },
  nextLine() {
    const d = get().dialog;
    if (!d) return;
    const lines = regionById[d.region].keeper.lines;
    set({ dialog: d.line + 1 < lines.length ? { ...d, line: d.line + 1 } : null });
    // after the welcome, Nara takes off and stays with you
    if (d.region === "dermaga" && d.line + 1 >= lines.length)
      get().say("Aku ikut terbang bersamamu. Bingung harus apa? Tekan H atau tombol Tanya Nara, aku tunjukkan jalannya.");
  },
  start() {
    set({ started: true, dialog: get().talked.includes("dermaga") ? null : { region: "dermaga", line: 0 }, talked: [...new Set([...get().talked, "dermaga" as RegionId])] });
    persist(get());
  },
  dismiss(key) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.key !== key) }));
  },
  setPanel(panel) {
    set({ panel });
  },
  setQuality(quality) {
    set({ quality });
    persist(get());
  },
  setView(view) {
    if (get().view === view) return;
    // leaving first person drops the automatic focus
    set({ view, focus: view === "tp" ? null : get().focus });
    if (view === "fp") get().award("mata");
    persist(get());
  },
  setTool(tool) {
    set({ tool, scan: tool === "pemindai" ? get().scan : null });
  },
  setBlockToken(blockToken) {
    set({ blockToken });
  },
  addBlock(b) {
    const blocks = get().blocks;
    if (blocks.some((x) => x.x === b.x && x.y === b.y && x.z === b.z)) return;
    const id = (blocks.at(-1)?.id ?? 0) + 1;
    set({ blocks: [...blocks, { ...b, id }].slice(-300) });
    if (get().blocks.length >= 10) get().award("arsitek");
    persist(get());
  },
  removeBlock(id) {
    set({ blocks: get().blocks.filter((b) => b.id !== id) });
    persist(get());
  },
  setScan(scan, station) {
    const s = get();
    const scanned = station && !s.scanned.includes(station) ? [...s.scanned, station] : s.scanned;
    set({ scan: { ...scan, n: (s.scan?.n ?? 0) + 1 }, scanned });
    if (scanned.length === stations.length) get().award("pindai");
    persist(get());
  },
  say(text, point) {
    set((s) => ({ nara: { text, point, n: (s.nara?.n ?? 0) + 1 } }));
  },
  askedHint() {
    set((s) => ({ hints: s.hints + 1 }));
    persist(get());
  },
  tick(seconds) {
    const s = get();
    if (!s.started || s.finished) return;
    set({ playTime: s.playTime + seconds });
    if (Math.floor(s.playTime + seconds) % 5 === 0) persist(get());
  },
  stepOn(region) {
    const s = get();
    if (s.islands.includes(region)) return;
    const islands = [...s.islands, region];
    set({ islands });
    if (islands.length === regions.length) get().award("penjelajah");
    persist(get());
  },
  award(id) {
    const s = get();
    const a = achievementById[id];
    if (!a || s.earned.includes(id)) return;
    set({
      earned: [...s.earned, id],
      toasts: [...s.toasts, { key: `award-${id}`, kind: "achievement" as const, color: "#ffb347", label: "Pencapaian didapat", title: a.title, text: a.text }].slice(-3),
    });
    persist(get());
  },
  openBook(book) {
    if (!books[book]) return;
    set({ reading: { book, page: 0, answer: null }, focus: null, dialog: null, panel: null });
  },
  closeBook() {
    set({ reading: null });
  },
  turnPage(step) {
    const r = get().reading;
    if (!r) return;
    const b = books[r.book];
    const last = b.pages.length - (b.quiz ? 0 : 1);
    const page = Math.max(0, Math.min(last, r.page + step));
    if (page === r.page) return;
    set({ reading: { ...r, page } });
    // a book without a question is finished by reaching its last page
    if (!b.quiz && page === last) finishBook(r.book);
  },
  answer(option) {
    const r = get().reading;
    if (!r) return;
    const b = books[r.book];
    if (!b.quiz || r.page !== b.pages.length) return;
    set({ reading: { ...r, answer: option } });
    if (option === b.quiz.answer) finishBook(r.book);
  },
  setNearBook(nearBook) {
    if (get().nearBook !== nearBook) set({ nearBook });
  },
  reset() {
    // a new run: progress and the stopwatch restart, the record and achievements stay
    const s = get();
    const fresh = { done: new Set<string>(), started: true, note: [0, 0, 0] as Note, visited: [] as StationId[], talked: [] as RegionId[], hints: 0, playTime: 0, finished: false, scanned: [] as StationId[], islands: [] as RegionId[] };
    set({ ...fresh, toasts: [], focus: null, panel: null, tracked: null, dialog: null, nara: null });
    persist({ ...s, ...fresh });
  },
}));

function finishBook(book: string) {
  const s = useWorld.getState();
  if (s.booksRead.includes(book)) return;
  const booksRead = [...s.booksRead, book];
  useWorld.setState({
    booksRead,
    toasts: [...s.toasts, { key: `book-${book}`, kind: "insight" as const, color: books[book].color, label: "Buku tamat", title: books[book].title, text: books[book].subtitle }].slice(-3),
  });
  if (booksRead.length === Object.keys(books).length) s.award("kutu");
  persist(useWorld.getState());
}

/** True while the given station has the visitor's attention. */
export const useFocused = (id: StationId) => useWorld((s) => s.focus === id);
export const useDone = (id: StationId, challenge: string) => useWorld((s) => s.done.has(challengeKey(id, challenge)));
/** The next mission in story order whose island is open. */
export const nextStation = (done: Set<string>) => stations.find((s) => isRegionOpen(done, s.region) && !isStationDone(done, s.id)) ?? null;
export const activeMission = (s: Pick<WorldState, "done" | "tracked">) =>
  s.tracked && !isStationDone(s.done, s.tracked) ? stationById[s.tracked] : nextStation(s.done);
/** Machine buttons react only to the hand. */
export const useHand = () => useWorld((s) => s.tool === "tangan");
