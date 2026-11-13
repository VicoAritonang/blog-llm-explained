// Procedural, tileable textures painted on a canvas at start-up. No image
// files and no network: every surface detail is generated here.
import * as THREE from "three";

const SIZE = 256;
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
/** Periodic value noise: wraps at the canvas edge so tiles never show seams. */
function noiseField(seed: number, cells: number) {
  const r = rng(seed);
  const grid = Array.from({ length: cells * cells }, r);
  const at = (x: number, y: number) => grid[((y + cells) % cells) * cells + ((x + cells) % cells)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (u: number, v: number) => {
    const x = u * cells,
      y = v * cells;
    const x0 = Math.floor(x),
      y0 = Math.floor(y);
    const fx = smooth(x - x0),
      fy = smooth(y - y0);
    const a = at(x0, y0),
      b = at(x0 + 1, y0),
      c = at(x0, y0 + 1),
      d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
function fbm(seed: number, octaves = 4, base = 4) {
  const layers = Array.from({ length: octaves }, (_, i) => noiseField(seed + i * 101, base << i));
  return (u: number, v: number) => {
    let total = 0,
      amp = 0.5,
      norm = 0;
    for (const n of layers) {
      total += n(u, v) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return total / norm;
  };
}

type Painter = (ctx: CanvasRenderingContext2D, size: number) => void;
function make(paint: Painter, { repeat = 1, color = true }: { repeat?: number; color?: boolean } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  paint(ctx, SIZE);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Fill pixels from a function returning [r, g, b] in 0–255. */
function pixels(fn: (u: number, v: number) => [number, number, number]): Painter {
  return (ctx, size) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const [r, g, b] = fn(x / size, y / size);
        const i = (y * size + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  };
}
/** Height field to tangent-space normal map. */
function normalFrom(height: (u: number, v: number) => number, strength: number) {
  const e = 1 / SIZE;
  return make(
    pixels((u, v) => {
      const dx = (height(u + e, v) - height(u - e, v)) * strength;
      const dy = (height(u, v + e) - height(u, v - e)) * strength;
      const len = Math.hypot(dx, dy, 1);
      return [((-dx / len) * 0.5 + 0.5) * 255, ((-dy / len) * 0.5 + 0.5) * 255, (1 / len) * 255];
    }),
    { color: false },
  );
}

let cache: ReturnType<typeof build> | null = null;
export const getTextures = () => (cache ??= build());

function build() {
  // Ground detail: soft mottling plus grass speckle, multiplied over vertex colour.
  const g1 = fbm(11, 4, 4),
    g2 = noiseField(19, 64);
  const groundHeight = (u: number, v: number) => g1(u, v) * 0.6 + g2(u, v) * 0.4;
  const ground = make(
    pixels((u, v) => {
      const m = 0.72 + g1(u, v) * 0.38 + (g2(u, v) - 0.5) * 0.22;
      return [m * 235, m * 245, m * 225];
    }),
  );
  const groundNormal = normalFrom(groundHeight, 6);

  // Stone tiles for plazas and paths.
  const t1 = fbm(31, 3, 8);
  const tileHeight = (u: number, v: number) => {
    const n = 4,
      x = (u * n) % 1,
      y = (((v * n) % 1) + (Math.floor(u * n) % 2 ? 0.5 : 0)) % 1;
    const edge = Math.min(x, 1 - x, y, 1 - y);
    return Math.min(1, edge * 22) * (0.85 + t1(u, v) * 0.15);
  };
  const tiles = make(
    pixels((u, v) => {
      const h = tileHeight(u, v),
        n = t1(u * 2 % 1, v * 2 % 1);
      const c = h < 0.5 ? 0.45 : 0.78 + n * 0.22;
      return [c * 228, c * 218, c * 200];
    }),
  );
  const tilesNormal = normalFrom(tileHeight, 3);

  // Wooden planks for bridges and docks.
  const w1 = noiseField(41, 8),
    w2 = fbm(43, 3, 4);
  const planks = make(
    pixels((u, v) => {
      const row = Math.floor(v * 6),
        y = (v * 6) % 1;
      const seam = y < 0.06 ? 0.45 : 1;
      const grain = 0.82 + Math.sin((u * 40 + w2(u, v) * 9 + row * 3) * 1.3) * 0.06 + w1(u, (row + 0.5) / 6) * 0.18;
      const c = grain * seam;
      return [c * 196, c * 140, c * 92];
    }),
  );
  const planksNormal = normalFrom((u, v) => ((v * 6) % 1 < 0.06 ? 0 : 1) + w2(u, v) * 0.3, 4);

  // Rock for cliffs and mountains.
  const r1 = fbm(53, 5, 3);
  const rockHeight = (u: number, v: number) => Math.abs(r1(u, v) * 2 - 1);
  const rock = make(
    pixels((u, v) => {
      const h = rockHeight(u, v);
      const c = 0.55 + h * 0.45;
      return [c * 200, c * 186, c * 172];
    }),
  );
  const rockNormal = normalFrom(rockHeight, 8);

  // Brushed metal plates with seams and rivets for machines.
  const m1 = noiseField(61, 128);
  const metalHeight = (u: number, v: number) => {
    const x = (u * 2) % 1,
      y = (v * 2) % 1;
    const seam = Math.min(x, 1 - x, y, 1 - y) < 0.012 ? 0 : 1;
    const rivet = [0.06, 0.94].some((a) => [0.06, 0.94].some((b) => Math.hypot(x - a, y - b) < 0.02)) ? 1.4 : 1;
    return seam * rivet;
  };
  const metal = make(
    pixels((u, v) => {
      const h = metalHeight(u, v);
      const brush = 0.86 + m1(u * 0.1, v) * 0.14;
      const c = (h === 0 ? 0.55 : h > 1 ? 1.05 : 1) * brush;
      return [c * 220, c * 226, c * 232];
    }),
  );
  const metalNormal = normalFrom(metalHeight, 2);

  // Building facade with lit windows for the city.
  const f1 = rng(71);
  const lit = Array.from({ length: 64 }, () => f1() < 0.45);
  const windows = make((ctx, size) => {
    ctx.fillStyle = "#2a3340";
    ctx.fillRect(0, 0, size, size);
    const n = 8,
      cell = size / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const on = lit[y * n + x];
        ctx.fillStyle = on ? (x + y) % 3 ? "#ffd99a" : "#9fe8ff" : "#1a2028";
        ctx.fillRect(x * cell + cell * 0.2, y * cell + cell * 0.18, cell * 0.6, cell * 0.55);
      }
  });

  // Bark and foliage.
  const b1 = fbm(81, 3, 4);
  const bark = make(pixels((u, v) => {
    const c = 0.6 + Math.abs(Math.sin(u * 30 + b1(u, v) * 6)) * 0.3;
    return [c * 150, c * 110, c * 80];
  }));
  const leaf = fbm(91, 4, 6);
  const foliage = make(pixels((u, v) => {
    const c = 0.7 + leaf(u, v) * 0.45;
    return [c * 230, c * 245, c * 220];
  }));

  return { ground, groundNormal, tiles, tilesNormal, planks, planksNormal, rock, rockNormal, metal, metalNormal, windows, bark, foliage };
}

/** A copy with its own repeat, sharing the canvas. */
export function tiled(t: THREE.Texture, repeat: number, repeatY = repeat) {
  const c = t.clone();
  c.repeat.set(repeat, repeatY);
  c.needsUpdate = true;
  return c;
}
