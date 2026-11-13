// The NeuroLab world: one tile grid, four rooms joined by gates.
// Pure data and helpers only, so node --test can import it directly.

export const COLS = 84;
export const ROWS = 24;

export type LevelKey = "pemula" | "menengah" | "mahir";
export type ZoneId = 0 | 1 | 2 | 3;
export type Zone = {
  id: ZoneId;
  level: LevelKey | null;
  name: string;
  tagline: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

export const zones: Zone[] = [
  {
    id: 0,
    level: "pemula",
    name: "Taman Kata",
    tagline: "Tempat mesin belajar menebak kata",
    x0: 1,
    x1: 24,
    y0: 1,
    y1: 22,
  },
  {
    id: 1,
    level: "menengah",
    name: "Pabrik Token",
    tagline: "Satu kalimat dibongkar di sepanjang ban berjalan",
    x0: 26,
    x1: 50,
    y0: 1,
    y1: 22,
  },
  {
    id: 2,
    level: "mahir",
    name: "Observatorium Skala",
    tagline: "Mengaudit raksasa 175 miliar parameter",
    x0: 52,
    x1: 72,
    y0: 1,
    y1: 22,
  },
  {
    id: 3,
    level: null,
    name: "Aula Arsitek",
    tagline: "Seluruh mesin sudah kamu bongkar",
    x0: 74,
    x1: 82,
    y0: 6,
    y1: 16,
  },
];

// Gate n joins zone n to zone n + 1 and sits in the wall column between them.
export type Gate = { id: 0 | 1 | 2; x: number; ys: [number, number] };
export const gates: Gate[] = [
  { id: 0, x: 25, ys: [10, 11] },
  { id: 1, x: 51, ys: [10, 11] },
  { id: 2, x: 73, ys: [10, 11] },
];

export const SPAWN = { x: 4.5, y: 11.5 };
// The conveyor in the token factory: walkable floor that carries tokens.
export const BELT = { y: 11, x0: 27, x1: 50 };

export type DecorSprite =
  | "plant"
  | "tree"
  | "shelf"
  | "crate"
  | "rack"
  | "lamp"
  | "holo"
  | "bench";

type Base = { id: string; x: number; y: number; zone: ZoneId };
export type QuestObject = Base & {
  kind: "quest";
  level: LevelKey;
  mission: string;
};
export type BookObject = Base & { kind: "book"; book: string };
export type NpcObject = Base & { kind: "npc" };
export type ExamObject = Base & { kind: "exam"; gate: 0 | 1 | 2 };
export type TrophyObject = Base & { kind: "trophy" };
export type DecorObject = Base & {
  kind: "decor";
  sprite: DecorSprite;
  w?: number;
  h?: number;
};
export type WorldObject =
  | QuestObject
  | BookObject
  | NpcObject
  | ExamObject
  | TrophyObject
  | DecorObject;
export type Interactable = Exclude<WorldObject, DecorObject>;

const quest = (
  zone: ZoneId,
  level: LevelKey,
  mission: string,
  x: number,
  y: number,
): QuestObject => ({ id: `q-${mission}`, kind: "quest", zone, level, mission, x, y });
const book = (zone: ZoneId, id: string, x: number, y: number): BookObject => ({
  id: `b-${id}`,
  kind: "book",
  zone,
  book: id,
  x,
  y,
});
const decor = (
  zone: ZoneId,
  sprite: DecorSprite,
  x: number,
  y: number,
  w = 1,
  h = 1,
): DecorObject => ({
  id: `d-${sprite}-${x}-${y}`,
  kind: "decor",
  zone,
  sprite,
  x,
  y,
  w,
  h,
});

export const objects: WorldObject[] = [
  // Level 1 · Taman Kata. Quests run clockwise and end on the central plaza.
  { id: "npc-0", kind: "npc", zone: 0, x: 6, y: 9 },
  quest(0, "pemula", "aturan", 7, 5),
  quest(0, "pemula", "kata", 12, 4),
  quest(0, "pemula", "belajar", 17, 5),
  quest(0, "pemula", "baca", 20, 15),
  quest(0, "pemula", "acak", 14, 18),
  quest(0, "pemula", "lancar", 8, 17),
  quest(0, "pemula", "pulang", 13, 11),
  book(0, "panduan", 3, 8),
  book(0, "sejarah", 3, 16),
  book(0, "data", 22, 4),
  book(0, "curiga", 22, 20),
  { id: "exam-0", kind: "exam", zone: 0, gate: 0, x: 23, y: 13 },
  decor(0, "plant", 10, 8),
  decor(0, "plant", 16, 8),
  decor(0, "plant", 10, 14),
  decor(0, "plant", 16, 14),
  decor(0, "tree", 2, 2),
  decor(0, "tree", 2, 21),
  decor(0, "tree", 18, 21),
  decor(0, "tree", 23, 1),
  decor(0, "bench", 5, 21, 2, 1),
  decor(0, "shelf", 8, 1, 2, 1),
  decor(0, "shelf", 14, 1, 2, 1),

  // Level 2 · Pabrik Token. Stations follow the forward pass along the belt.
  { id: "npc-1", kind: "npc", zone: 1, x: 28, y: 14 },
  quest(1, "menengah", "tokenizer", 30, 8),
  quest(1, "menengah", "lookup", 33, 14),
  quest(1, "menengah", "attention", 36, 8),
  quest(1, "menengah", "blok", 39, 14),
  quest(1, "menengah", "decoding", 42, 8),
  quest(1, "menengah", "loop", 45, 14),
  quest(1, "menengah", "training", 34, 19),
  quest(1, "menengah", "aplikasi", 42, 19),
  quest(1, "menengah", "transfer", 48, 7),
  book(1, "transformer", 28, 3),
  book(1, "skala", 39, 3),
  book(1, "asisten", 38, 20),
  book(1, "rag", 47, 20),
  { id: "exam-1", kind: "exam", zone: 1, gate: 1, x: 49, y: 14 },
  decor(1, "rack", 31, 1),
  decor(1, "rack", 32, 1),
  decor(1, "rack", 43, 1),
  decor(1, "rack", 44, 1),
  decor(1, "crate", 27, 20),
  decor(1, "crate", 27, 21),
  decor(1, "crate", 50, 2),
  decor(1, "crate", 30, 21),
  decor(1, "lamp", 26, 6),
  decor(1, "lamp", 50, 17),

  // Level 3 · Observatorium Skala. A ring around the GPT-3 hologram.
  { id: "npc-2", kind: "npc", zone: 2, x: 54, y: 13 },
  decor(2, "holo", 61, 10, 3, 3),
  quest(2, "mahir", "parameter", 58, 6),
  quest(2, "mahir", "compute", 62, 5),
  quest(2, "mahir", "attention-gpt3", 66, 6),
  quest(2, "mahir", "kv", 68, 11),
  quest(2, "mahir", "icl", 66, 16),
  quest(2, "mahir", "verifikasi", 62, 17),
  quest(2, "mahir", "sesudah", 58, 16),
  book(2, "scaling", 54, 3),
  book(2, "gpu", 70, 3),
  book(2, "interpretasi", 54, 20),
  book(2, "evaluasi", 70, 20),
  { id: "exam-2", kind: "exam", zone: 2, gate: 2, x: 71, y: 13 },
  decor(2, "lamp", 52, 8),
  decor(2, "lamp", 72, 17),
  decor(2, "shelf", 60, 22, 2, 1),
  decor(2, "shelf", 64, 22, 2, 1),
  decor(2, "rack", 57, 1),
  decor(2, "rack", 67, 1),

  // Aula Arsitek
  { id: "npc-3", kind: "npc", zone: 3, x: 76, y: 8 },
  { id: "trophy", kind: "trophy", zone: 3, x: 80, y: 10 },
  book(3, "penutup", 77, 14),
  decor(3, "plant", 75, 6),
  decor(3, "plant", 82, 6),
  decor(3, "plant", 75, 16),
  decor(3, "plant", 82, 16),
];

export const interactables = objects.filter(
  (o): o is Interactable => o.kind !== "decor",
);
export const questObjects = objects.filter(
  (o): o is QuestObject => o.kind === "quest",
);
export const bookObjects = objects.filter(
  (o): o is BookObject => o.kind === "book",
);

export const zoneAt = (x: number): ZoneId | null => {
  const z = zones.find((zone) => x >= zone.x0 && x <= zone.x1);
  return z ? z.id : null;
};

/** Floor tiles: true inside a room or on a gate tile. Walls are false. */
export function buildFloor(): boolean[][] {
  const floor = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (const z of zones)
    for (let y = z.y0; y <= z.y1; y++)
      for (let x = z.x0; x <= z.x1; x++) floor[y][x] = true;
  for (const g of gates) for (const y of g.ys) floor[y][g.x] = true;
  return floor;
}

/** Tiles covered by a solid object. */
export function buildSolids(): Map<number, WorldObject> {
  const solids = new Map<number, WorldObject>();
  for (const o of objects) {
    const w = o.kind === "decor" ? (o.w ?? 1) : 1,
      h = o.kind === "decor" ? (o.h ?? 1) : 1;
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) solids.set(key(o.x + dx, o.y + dy), o);
  }
  return solids;
}
export const key = (x: number, y: number) => y * COLS + x;

export type Walkable = (x: number, y: number) => boolean;

/** Breadth-first path on the tile grid, 8-way without cutting corners. */
export function findPath(
  walkable: Walkable,
  from: { x: number; y: number },
  goals: { x: number; y: number }[],
): { x: number; y: number }[] | null {
  const goalSet = new Set(goals.filter((g) => walkable(g.x, g.y)).map((g) => key(g.x, g.y)));
  if (!goalSet.size) return null;
  const start = key(from.x, from.y);
  const prev = new Map<number, number>([[start, -1]]);
  const queue = [start];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  while (queue.length) {
    const cur = queue.shift()!;
    if (goalSet.has(cur)) {
      const path: { x: number; y: number }[] = [];
      for (let k = cur; k !== -1 && k !== start; k = prev.get(k)!)
        path.unshift({ x: k % COLS, y: Math.floor(k / COLS) });
      return path;
    }
    const cx = cur % COLS,
      cy = Math.floor(cur / COLS);
    for (const [dx, dy] of dirs) {
      const nx = cx + dx,
        ny = cy + dy;
      if (!walkable(nx, ny)) continue;
      if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy)))
        continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      prev.set(k, cur);
      queue.push(k);
    }
  }
  return null;
}

/** Tiles from which an object can be used. */
export function approachTiles(o: { x: number; y: number }) {
  const out: { x: number; y: number }[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (dx || dy) out.push({ x: o.x + dx, y: o.y + dy });
  // Prefer standing in front (below) the object.
  return out.sort((a, b) => (b.y - a.y) * 2 + Math.abs(a.x - o.x) - Math.abs(b.x - o.x));
}

// Real token ids from the trained mini decoder (src/simulation/story/checkpoint.json).
export const beltTokens: [string, number][] = [
  ["Catatan", 0],
  [":", 1],
  [" kunci", 2],
  [" cadangan", 3],
  [" ada", 4],
  [" di", 5],
  [" laci", 6],
  [" biru", 7],
  [".", 8],
];
