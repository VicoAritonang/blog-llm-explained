// Geography of the archipelago: islands, bridges, where each machine stands,
// and which ground can be walked on. Units are metres; +z points south.
import { regionGate, stations, stationsIn, type RegionId, type StationId } from "./content";

export interface Island {
  id: RegionId;
  x: number;
  z: number;
  r: number;
  /** Visual biome. */
  biome: "dock" | "forest" | "mountain" | "city" | "summit";
  ground: string;
  /** Ring radius the machines stand on. */
  ring: number;
}
export const islands: Island[] = [
  { id: "dermaga", x: 0, z: 0, r: 26, biome: "dock", ground: "#6f9c62", ring: 0 },
  { id: "belajar", x: -112, z: -6, r: 38, biome: "forest", ground: "#5d9a4a", ring: 19 },
  { id: "optimasi", x: -6, z: -118, r: 38, biome: "mountain", ground: "#8a7660", ring: 19 },
  { id: "berjalan", x: 112, z: -6, r: 38, biome: "city", ground: "#5f6b78", ring: 19 },
  { id: "observatorium", x: 0, z: 104, r: 27, biome: "summit", ground: "#a8b49a", ring: 0 },
];
export const islandById = Object.fromEntries(islands.map((i) => [i.id, i])) as Record<RegionId, Island>;

export interface Bridge {
  /** The island this bridge leads to; it opens with that island. */
  to: RegionId;
  from: RegionId;
  a: [number, number];
  b: [number, number];
}
function bridgeBetween(from: RegionId, to: RegionId): Bridge {
  const A = islandById[from],
    B = islandById[to];
  const dx = B.x - A.x,
    dz = B.z - A.z,
    d = Math.hypot(dx, dz);
  const ux = dx / d,
    uz = dz / d;
  // ends sit a little inside each coast so the deck meets solid ground
  return {
    from,
    to,
    a: [A.x + ux * (A.r - 4), A.z + uz * (A.r - 4)],
    b: [B.x - ux * (B.r - 4), B.z - uz * (B.r - 4)],
  };
}
export const bridges: Bridge[] = (["belajar", "optimasi", "berjalan", "observatorium"] as RegionId[]).map((to) =>
  bridgeBetween("dermaga", to),
);
export const BRIDGE_HALF = 2.1;

export interface Pose {
  x: number;
  z: number;
  /** Rotation about y; the machine's front faces (sin, cos) of this angle. */
  angle: number;
  dir: [number, number];
}
const facing = (angle: number): Pose["dir"] => [Math.sin(angle), Math.cos(angle)];

/** Where each machine stands. Island machines face outwards towards the coast path. */
export const poses = {} as Record<StationId, Pose>;
for (const island of islands) {
  const list = stationsIn(island.id);
  if (island.id === "dermaga") {
    poses.tanya = { x: 0, z: -3, angle: 0, dir: facing(0) };
    continue;
  }
  if (island.id === "observatorium") {
    // both face north, towards the bridge from the dock
    poses.skala = { x: island.x - 10, z: island.z + 2, angle: Math.PI, dir: facing(Math.PI) };
    poses.rakit = { x: island.x + 10, z: island.z + 2, angle: Math.PI, dir: facing(Math.PI) };
    continue;
  }
  // the bridge arrives from the dock; keep that side clear
  const entry = Math.atan2(-island.x, -island.z);
  const spread = list.length === 3 ? [55, 180, 305] : [48, 128, 232, 312];
  list.forEach((s, i) => {
    const a = entry + (spread[i] * Math.PI) / 180;
    poses[s.id] = { x: island.x + Math.sin(a) * island.ring, z: island.z + Math.cos(a) * island.ring, angle: a, dir: facing(a) };
  });
}
export const keeperSpot = (id: RegionId): [number, number] => {
  const i = islandById[id];
  if (id === "dermaga") return [5.5, 13];
  if (id === "observatorium") return [i.x, i.z - 13];
  const entry = Math.atan2(-i.x, -i.z);
  return [i.x + Math.sin(entry) * 26, i.z + Math.cos(entry) * 26];
};
export const SPAWN: [number, number] = [0, 17];
/** A spot in front of a machine where the walker stops. */
export const frontOf = (id: StationId, distance = 9): [number, number] => {
  const p = poses[id];
  return [p.x + p.dir[0] * distance, p.z + p.dir[1] * distance];
};
export const STATION_RADIUS = 5.7;

const segmentDistance = (px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) => {
  const dx = bx - ax,
    dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};

export function regionAt(x: number, z: number): RegionId | null {
  for (const i of islands) if (Math.hypot(x - i.x, z - i.z) < i.r) return i.id;
  return null;
}

/** Ground the visitor may stand on, given which islands are open. */
export function walkable(x: number, z: number, open: (r: RegionId) => boolean) {
  for (const i of islands) {
    if (Math.hypot(x - i.x, z - i.z) < i.r - 3 && open(i.id)) return true;
  }
  for (const b of bridges) {
    if (segmentDistance(x, z, b.a, b.b) < BRIDGE_HALF - 0.4) {
      if (open(b.to)) return true;
      // a locked bridge can be walked up to its gate, not past it
      const t = Math.hypot(x - b.a[0], z - b.a[1]) / Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
      if (t < 0.12) return true;
    }
  }
  return false;
}

/** Solid things the walker slides around. */
export const obstacles: { x: number; z: number; r: number }[] = [
  ...stations.map((s) => ({ x: poses[s.id].x, z: poses[s.id].z, r: STATION_RADIUS })),
  ...islands.filter((i) => i.ring).map((i) => ({ x: i.x, z: i.z, r: 6 })),
  { x: 0, z: 117, r: 4.5 },
];

export const gateOf = regionGate;
export const distance2d = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

/* -------------------------------------------------------------- library -- */
/** Which island keeps which book. */
export const shelf: Record<RegionId, string[]> = {
  dermaga: ["sejarah", "curiga"],
  belajar: ["data", "transformer"],
  optimasi: ["scaling", "gpu", "asisten"],
  berjalan: ["rag", "interpretasi"],
  observatorium: ["skala", "evaluasi", "penutup"],
};
export interface Lectern extends Pose {
  book: string;
  region: RegionId;
}
/**
 * Lecterns stand between the machines, facing outwards so the reader stays
 * clear of every machine's camera and of the path in from the bridge.
 */
export const lecterns: Lectern[] = [];
for (const island of islands) {
  const books = shelf[island.id];
  if (island.id === "dermaga") {
    [
      [-11, 5],
      [11, 5],
    ].forEach(([x, z], i) => {
      const angle = Math.atan2(x, z);
      lecterns.push({ book: books[i], region: island.id, x, z, angle, dir: facing(angle) });
    });
    continue;
  }
  if (island.id === "observatorium") {
    [
      [-19, 98],
      [19, 98],
      [0, 93],
    ].forEach(([x, z], i) => {
      const angle = Math.atan2(x - island.x, z - (island.z + 6));
      lecterns.push({ book: books[i], region: island.id, x, z, angle, dir: facing(angle) });
    });
    continue;
  }
  const entry = Math.atan2(-island.x, -island.z);
  const angles = stationsIn(island.id)
    .map((s) => poses[s.id].angle)
    .sort((a, b) => a - b);
  const gaps = angles.map((a, i) => (a + (angles[(i + 1) % angles.length] + (i === angles.length - 1 ? Math.PI * 2 : 0))) / 2);
  const away = gaps.filter((g) => Math.cos(g - entry) < 0.8);
  // not enough gaps: the spot behind the island's landmark, opposite the bridge
  const spots = away.map((a) => [a, 11.5]);
  while (spots.length < books.length) spots.push([entry + Math.PI + (spots.length - away.length) * 0.5, 9.5]);
  books.forEach((book, i) => {
    const [a, r] = spots[i];
    lecterns.push({ book, region: island.id, x: island.x + Math.sin(a) * r, z: island.z + Math.cos(a) * r, angle: a, dir: facing(a) });
  });
}
for (const l of lecterns) obstacles.push({ x: l.x, z: l.z, r: 0.9 });
export const lecternOf = (book: string) => lecterns.find((l) => l.book === book)!;
/** Where the reader stands. */
export const readerSpot = (book: string): [number, number] => {
  const l = lecternOf(book);
  return [l.x + l.dir[0] * 2.2, l.z + l.dir[1] * 2.2];
};
