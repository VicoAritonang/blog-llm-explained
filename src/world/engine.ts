// Canvas renderer and movement for the NeuroLab world. Runs fully client-side,
// draws only the visible tiles each frame and sleeps while a window is open.
import {
  BELT,
  COLS,
  ROWS,
  approachTiles,
  beltTokens,
  buildFloor,
  buildSolids,
  findPath,
  gates,
  interactables,
  key,
  objects,
  zoneAt,
  zones,
  type DecorObject,
  type Gate,
  type Interactable,
  type WorldObject,
  type ZoneId,
} from "./map";

export const T = 48;
export type GateTarget = {
  kind: "gate";
  id: string;
  gate: Gate;
  x: number;
  y: number;
};
export type Target = Interactable | GateTarget;
export type Marker =
  | { kind: "new" }
  | { kind: "progress"; done: number; total: number }
  | { kind: "done" }
  | { kind: "book"; read: boolean }
  | { kind: "talk" }
  | { kind: "exam"; open: boolean }
  | { kind: "star" }
  | { kind: "none" };
export type RenderState = {
  markers: Record<string, Marker>;
  labels: Record<string, string>;
  gates: boolean[];
  recommended: string | null;
  unlockedZone: number; // highest zone the player may enter
};
export type EngineEvents = {
  onNear: (t: Target | null) => void;
  onInteract: (t: Target) => void;
  onZone: (z: ZoneId) => void;
};

const accent = ["#8fd694", "#5fd4e0", "#b9a6f2", "#e9b949"];
const GOLD = "#ffcf4a";
const gateTargets: GateTarget[] = gates.map((g) => ({
  kind: "gate",
  id: `gate-${g.id}`,
  gate: g,
  x: g.x,
  y: g.ys[0],
}));

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  spin: number;
};
type Floater = { x: number; y: number; text: string; color: string; life: number };

const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export class WorldEngine {
  private ctx: CanvasRenderingContext2D;
  private floor = buildFloor();
  private solids = buildSolids();
  private w = 0;
  private h = 0;
  private dpr = 1;
  private scale = 1;
  private cam = { x: 0, y: 0 };
  private keys = new Set<string>();
  private path: { x: number; y: number }[] = [];
  private pending: Target | null = null;
  private near: Target | null = null;
  private hover: Target | null = null;
  private zone: ZoneId | null = null;
  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private paused = false;
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private beltPhase = 0;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private cleanup: (() => void)[] = [];
  state: RenderState = {
    markers: {},
    labels: {},
    gates: [false, false, false],
    recommended: null,
    unlockedZone: 0,
  };
  player = { x: 4.5, y: 11.5, dir: 1 as 1 | -1, facing: "down" as "down" | "up" | "side", moving: false, step: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private events: EngineEvents,
    start: { x: number; y: number },
  ) {
    this.ctx = canvas.getContext("2d")!;
    const tx = Math.floor(start.x),
      ty = Math.floor(start.y);
    if (this.walkable(tx, ty)) {
      this.player.x = start.x;
      this.player.y = start.y;
    }
    this.cam = { x: this.player.x * T, y: this.player.y * T };
    this.bind();
    this.resize();
  }

  // ---------- public API ----------
  setState(state: RenderState) {
    this.state = state;
    if (!this.running) this.frame(performance.now());
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    this.keys.clear();
    this.path = [];
    this.pending = null;
    if (paused) this.stopLoop();
    else this.startLoop();
  }
  destroy() {
    this.stopLoop();
    this.cleanup.forEach((fn) => fn());
  }
  position() {
    return { x: this.player.x, y: this.player.y };
  }
  interactNear() {
    if (this.near) this.events.onInteract(this.near);
  }
  /** Walk to an object and use it on arrival. */
  goTo(id: string, use = true) {
    const target = [...interactables, ...gateTargets].find((o) => o.id === id);
    if (!target) return;
    this.walkTo(target, use);
  }
  teleport(id: string) {
    const target = interactables.find((o) => o.id === id);
    if (!target) return;
    const spot = approachTiles(target).find((t) => this.walkable(t.x, t.y));
    if (!spot) return;
    this.player.x = spot.x + 0.5;
    this.player.y = spot.y + 0.5;
    this.path = [];
    this.cam = { x: this.player.x * T, y: this.player.y * T };
    this.burst(this.player.x, this.player.y, [accent[target.zone], "#ffffff"], 18);
    this.frame(performance.now());
  }
  burst(x: number, y: number, colors: string[], count = 40) {
    if (this.reduced) count = Math.min(count, 10);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2,
        s = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y: y - 0.6,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 4,
        life: 0,
        max: 0.9 + Math.random() * 0.8,
        color: colors[i % colors.length],
        size: 0.07 + Math.random() * 0.08,
        spin: Math.random() * 6,
      });
    }
    this.startLoop();
  }
  floatText(text: string, color = GOLD) {
    this.floaters.push({ x: this.player.x, y: this.player.y - 1.2, text, color, life: 0 });
    this.startLoop();
  }

  // ---------- setup ----------
  private bind() {
    const down = (e: KeyboardEvent) => {
      if (this.paused || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el && el.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
      const k = e.key.toLowerCase();
      const moveKey = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k);
      // Only steer when the world is on screen; otherwise arrows scroll the page.
      if (moveKey && this.canvas.getBoundingClientRect().bottom < 120) return;
      if (moveKey) {
        e.preventDefault();
        this.keys.add(k);
        this.path = [];
        this.pending = null;
        this.startLoop();
      } else if ((k === "e" || k === "enter" || k === " ") && this.near) {
        e.preventDefault();
        this.events.onInteract(this.near);
      }
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    const blur = () => this.keys.clear();
    const pointer = (e: PointerEvent) => {
      if (this.paused) return;
      const hit = this.pick(e);
      if (hit.target) this.walkTo(hit.target, true);
      else if (this.walkable(hit.tx, hit.ty)) {
        const p = findPath(this.walkable, this.tile(), [{ x: hit.tx, y: hit.ty }]);
        if (p) {
          this.path = p;
          this.pending = null;
          this.startLoop();
        }
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const hit = this.pick(e);
      if (hit.target !== this.hover) {
        this.hover = hit.target;
        this.canvas.style.cursor = hit.target ? "pointer" : "default";
        if (!this.running) this.frame(performance.now());
      }
    };
    const visibility = () => (document.hidden ? this.stopLoop() : this.startLoop());
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", blur);
    this.canvas.addEventListener("pointerdown", pointer);
    this.canvas.addEventListener("pointermove", move);
    document.addEventListener("visibilitychange", visibility);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.canvas);
    this.cleanup.push(
      () => removeEventListener("keydown", down),
      () => removeEventListener("keyup", up),
      () => removeEventListener("blur", blur),
      () => this.canvas.removeEventListener("pointerdown", pointer),
      () => this.canvas.removeEventListener("pointermove", move),
      () => document.removeEventListener("visibilitychange", visibility),
      () => ro.disconnect(),
    );
  }
  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    const across = this.w < 600 ? 9 : this.w < 1000 ? 14 : 21;
    this.scale = Math.min(this.w / (across * T), this.h / (10 * T));
    this.frame(performance.now());
  }
  private startLoop() {
    if (this.running || this.paused || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  private stopLoop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  // ---------- world rules ----------
  walkable = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS || !this.floor[y][x]) return false;
    if (this.solids.has(key(x, y))) return false;
    const gate = gates.find((g) => g.x === x && g.ys.includes(y));
    return gate ? !!this.state.gates[gate.id] : true;
  };
  private tile() {
    return { x: Math.floor(this.player.x), y: Math.floor(this.player.y) };
  }
  private pick(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const wx = (e.clientX - r.left - this.w / 2) / this.scale + this.cam.x,
      wy = (e.clientY - r.top - this.h / 2) / this.scale + this.cam.y;
    const tx = Math.floor(wx / T),
      ty = Math.floor(wy / T);
    // Sprites rise above their tile, so a click just above one still counts.
    const target =
      interactables.find((o) => o.x === tx && (o.y === ty || o.y === ty + 1)) ??
      gateTargets.find((g) => g.gate.x === tx && g.gate.ys.includes(ty)) ??
      null;
    return { tx, ty, target };
  }
  private walkTo(target: Target, use: boolean) {
    if (this.reach(target)) {
      if (use) this.events.onInteract(target);
      return;
    }
    const goals =
      target.kind === "gate"
        ? target.gate.ys.flatMap((y) => [
            { x: target.gate.x - 1, y },
            { x: target.gate.x + 1, y },
          ])
        : approachTiles(target);
    const p = findPath(this.walkable, this.tile(), goals);
    if (!p) return;
    this.path = p;
    this.pending = use ? target : null;
    this.startLoop();
  }
  private center(t: Target) {
    return t.kind === "gate"
      ? { x: t.gate.x + 0.5, y: t.gate.ys[1] }
      : { x: t.x + 0.5, y: t.y + 0.5 };
  }
  private reach(t: Target) {
    const c = this.center(t);
    return Math.hypot(c.x - this.player.x, c.y - this.player.y) <= (t.kind === "gate" ? 1.8 : 1.75);
  }
  private blocked(x: number, y: number, r: number) {
    for (const [dx, dy] of [
      [-r, -r],
      [r, -r],
      [-r, r],
      [r, r],
    ])
      if (!this.walkable(Math.floor(x + dx), Math.floor(y + dy))) return true;
    return false;
  }

  // ---------- update ----------
  private update(dt: number) {
    const p = this.player;
    let vx = 0,
      vy = 0;
    const k = this.keys;
    if (k.has("a") || k.has("arrowleft")) vx -= 1;
    if (k.has("d") || k.has("arrowright")) vx += 1;
    if (k.has("w") || k.has("arrowup")) vy -= 1;
    if (k.has("s") || k.has("arrowdown")) vy += 1;
    if (!vx && !vy && this.path.length) {
      const next = this.path[0];
      const dx = next.x + 0.5 - p.x,
        dy = next.y + 0.5 - p.y,
        d = Math.hypot(dx, dy);
      if (d < 0.12) {
        this.path.shift();
        if (!this.path.length && this.pending) {
          const t = this.pending;
          this.pending = null;
          if (this.reach(t)) this.events.onInteract(t);
        }
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }
    const len = Math.hypot(vx, vy);
    p.moving = len > 0;
    if (len) {
      const speed = 4.6 * dt;
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
      const r = 0.28;
      if (!this.blocked(p.x + vx, p.y, r)) p.x += vx;
      if (!this.blocked(p.x, p.y + vy, r)) p.y += vy;
      p.step += dt * 10;
      if (Math.abs(vx) > Math.abs(vy) * 0.8) {
        p.facing = "side";
        p.dir = vx > 0 ? 1 : -1;
      } else p.facing = vy < 0 ? "up" : "down";
    }

    // Nearest usable thing within reach.
    let best: Target | null = null,
      bestD = Infinity;
    for (const o of [...interactables, ...gateTargets]) {
      if (o.kind === "gate" && this.state.gates[o.gate.id]) continue;
      const c = this.center(o),
        d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestD && this.reach(o)) {
        best = o;
        bestD = d;
      }
    }
    if (best !== this.near) {
      this.near = best;
      this.events.onNear(best);
    }
    const z = zoneAt(Math.floor(p.x));
    if (z !== null && z !== this.zone) {
      this.zone = z;
      this.events.onZone(z);
    }

    for (const q of this.particles) {
      q.life += dt;
      q.vy += 12 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.98;
      q.spin += dt * 8;
    }
    this.particles = this.particles.filter((q) => q.life < q.max);
    for (const f of this.floaters) {
      f.life += dt;
      f.y -= dt * 0.9;
    }
    this.floaters = this.floaters.filter((f) => f.life < 1.6);
    this.beltPhase += dt * (this.reduced ? 0.4 : 1.1);

    // Camera eases toward the player and stays inside the map.
    const tx = p.x * T,
      ty = p.y * T;
    const ease = this.reduced ? 1 : 1 - Math.pow(0.0008, dt);
    this.cam.x += (tx - this.cam.x) * ease;
    this.cam.y += (ty - this.cam.y) * ease;
    const halfW = this.w / 2 / this.scale,
      halfH = this.h / 2 / this.scale;
    const mapW = COLS * T,
      mapH = ROWS * T;
    this.cam.x = mapW < halfW * 2 ? mapW / 2 : Math.min(Math.max(this.cam.x, halfW), mapW - halfW);
    this.cam.y = mapH < halfH * 2 ? mapH / 2 : Math.min(Math.max(this.cam.y, halfH), mapH - halfH);
  }

  // ---------- draw ----------
  private frame(now: number) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.draw();
  }

  private draw() {
    const c = this.ctx,
      s = this.scale;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = "#060d12";
    c.fillRect(0, 0, this.w, this.h);
    c.setTransform(
      this.dpr * s,
      0,
      0,
      this.dpr * s,
      this.dpr * (this.w / 2 - this.cam.x * s),
      this.dpr * (this.h / 2 - this.cam.y * s),
    );
    const x0 = Math.max(0, Math.floor((this.cam.x - this.w / 2 / s) / T) - 1),
      x1 = Math.min(COLS - 1, Math.ceil((this.cam.x + this.w / 2 / s) / T) + 1),
      y0 = Math.max(0, Math.floor((this.cam.y - this.h / 2 / s) / T) - 1),
      y1 = Math.min(ROWS - 1, Math.ceil((this.cam.y + this.h / 2 / s) / T) + 1);

    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (this.floor[y][x]) this.drawFloor(x, y);
        else if (this.nearFloor(x, y)) this.drawWall(x, y);
      }
    this.drawZoneOverlays(x0, x1);
    this.drawBelt(x0, x1);
    this.drawRecommendedRing();

    const drawables: { y: number; draw: () => void }[] = [];
    for (const o of objects) {
      if (o.x + 3 < x0 || o.x - 1 > x1 || o.y + 3 < y0 || o.y - 2 > y1) continue;
      const h = o.kind === "decor" ? (o.h ?? 1) : 1;
      drawables.push({ y: o.y + h, draw: () => this.drawObject(o) });
    }
    for (const g of gates) drawables.push({ y: g.ys[1] + 1, draw: () => this.drawGate(g) });
    drawables.push({ y: this.player.y + 0.3, draw: () => this.drawPlayer() });
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());

    for (const o of interactables) {
      if (o.x < x0 - 1 || o.x > x1 + 1 || o.y < y0 - 1 || o.y > y1 + 2) continue;
      this.drawMarker(o);
    }
    this.drawLabels();
    this.drawParticles();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawOffscreenArrow();
  }

  private nearFloor(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && this.floor[ny][nx]) return true;
      }
    return false;
  }

  private drawFloor(x: number, y: number) {
    const c = this.ctx,
      px = x * T,
      py = y * T,
      h = hash(x, y),
      z = zoneAt(x);
    const gate = gates.find((g) => g.x === x && g.ys.includes(y));
    if (gate) {
      c.fillStyle = "#1b2a31";
      c.fillRect(px, py, T, T);
      return;
    }
    if (z === 0) {
      const plaza = (x >= 9 && x <= 17 && y >= 7 && y <= 15) || (y >= 10 && y <= 12);
      if (plaza) {
        c.fillStyle = (x + y) % 2 ? "#3a4a43" : "#36453f";
        c.fillRect(px, py, T, T);
        c.strokeStyle = "rgba(0,0,0,.18)";
        c.lineWidth = 1;
        c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      } else {
        c.fillStyle = h > 0.5 ? "#21483a" : "#1f4436";
        c.fillRect(px, py, T, T);
        if (h > 0.62) {
          c.fillStyle = "#2e604b";
          const gx = px + 8 + h * 26,
            gy = py + 10 + ((h * 97) % 1) * 24;
          c.fillRect(gx, gy, 2, 6);
          c.fillRect(gx + 4, gy + 2, 2, 5);
          c.fillRect(gx - 4, gy + 3, 2, 4);
        }
        if (h < 0.05) {
          c.fillStyle = ["#f7c782", "#f08a7e", "#cfe7ff"][Math.floor(h * 60)];
          c.beginPath();
          c.arc(px + 24, py + 24, 3, 0, Math.PI * 2);
          c.fill();
        }
      }
    } else if (z === 1) {
      c.fillStyle = (x + y) % 2 ? "#1c2a33" : "#1a2730";
      c.fillRect(px, py, T, T);
      c.strokeStyle = "#24343e";
      c.lineWidth = 1;
      c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      c.fillStyle = "#2c3e49";
      for (const [ox, oy] of [
        [5, 5],
        [T - 7, 5],
        [5, T - 7],
        [T - 7, T - 7],
      ])
        c.fillRect(px + ox, py + oy, 2, 2);
    } else if (z === 2) {
      c.fillStyle = (x + y) % 2 ? "#141b36" : "#121933";
      c.fillRect(px, py, T, T);
      if (h > 0.7) {
        const tw = 0.5 + 0.5 * Math.sin(this.time * 2 + h * 40);
        c.fillStyle = `rgba(220,226,255,${0.25 + tw * 0.5})`;
        c.fillRect(px + h * 40, py + ((h * 71) % 1) * 40, 2, 2);
      }
    } else {
      c.fillStyle = (x + y) % 2 ? "#2e2618" : "#2b2416";
      c.fillRect(px, py, T, T);
      if (y === 11) {
        c.fillStyle = "#6b2a2a";
        c.fillRect(px, py + 6, T, T - 12);
        c.fillStyle = "#c79a3a";
        c.fillRect(px, py + 6, T, 2);
        c.fillRect(px, py + T - 8, T, 2);
      }
    }
  }

  private drawWall(x: number, y: number) {
    const c = this.ctx,
      px = x * T,
      py = y * T;
    const below = y + 1 < ROWS && this.floor[y + 1][x];
    const z = zoneAt(x) ?? zoneAt(x - 1) ?? zoneAt(x + 1) ?? 0;
    const tops = ["#264536", "#2a3a45", "#262d52", "#4a3b20"];
    const fronts = ["#132a1f", "#17232b", "#171c38", "#2d2412"];
    c.fillStyle = tops[z];
    c.fillRect(px, py, T, T);
    c.fillStyle = "rgba(255,255,255,.06)";
    c.fillRect(px, py, T, 3);
    if (z === 0) {
      // Hedge bumps
      c.fillStyle = "#335c46";
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(px + 8 + i * 16, py + 14 + hash(x, y + i) * 6, 10, 0, Math.PI * 2);
        c.fill();
      }
    }
    if (below) {
      c.fillStyle = fronts[z];
      c.fillRect(px, py + T * 0.5, T, T * 0.5);
      c.fillStyle = "rgba(0,0,0,.25)";
      c.fillRect(px, py + T - 4, T, 4);
      if (z === 1 && x % 3 === 0) {
        c.fillStyle = "#e9b949";
        c.fillRect(px + 6, py + T * 0.62, T - 12, 3);
      }
      if (z === 2 && x % 4 === 1) {
        c.fillStyle = "rgba(185,166,242,.5)";
        c.fillRect(px + 20, py + T * 0.58, 8, 12);
      }
    }
  }

  private drawZoneOverlays(x0: number, x1: number) {
    const c = this.ctx;
    // Observatory ring around the hologram.
    if (x1 >= 52 && x0 <= 72) {
      c.save();
      c.strokeStyle = "rgba(185,166,242,.22)";
      c.lineWidth = 3;
      c.setLineDash([10, 12]);
      c.lineDashOffset = -this.time * 12;
      c.beginPath();
      c.ellipse(62.5 * T, 11.5 * T, 6.4 * T, 6.4 * T, 0, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = "rgba(185,166,242,.1)";
      c.beginPath();
      c.ellipse(62.5 * T, 11.5 * T, 4 * T, 4 * T, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    // Garden plaza ring.
    if (x0 <= 18 && x1 >= 8) {
      c.strokeStyle = "rgba(143,214,148,.25)";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(13.5 * T, 11.5 * T, 2.2 * T, 2.2 * T, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }

  private drawBelt(x0: number, x1: number) {
    if (x1 < BELT.x0 || x0 > BELT.x1) return;
    const c = this.ctx,
      y = BELT.y * T;
    const a = Math.max(BELT.x0, x0),
      b = Math.min(BELT.x1, x1);
    c.fillStyle = "#0e151a";
    c.fillRect(a * T, y + 6, (b - a + 1) * T, T - 12);
    // Chevrons show the direction of the forward pass.
    c.strokeStyle = "rgba(95,212,224,.18)";
    c.lineWidth = 2;
    const off = ((this.beltPhase * T) % 24) - 24;
    for (let px = a * T + off; px < (b + 1) * T; px += 24) {
      c.beginPath();
      c.moveTo(px, y + 14);
      c.lineTo(px + 8, y + T / 2);
      c.lineTo(px, y + T - 14);
      c.stroke();
    }
    for (let px = a * T; px < (b + 1) * T; px += 12) {
      c.fillStyle = Math.floor(px / 12) % 2 ? "#e9b949" : "#1a1a1a";
      c.fillRect(px, y + 4, 12, 3);
      c.fillRect(px, y + T - 7, 12, 3);
    }
    // Tokens change form as they pass each station of the pipeline.
    const span = (BELT.x1 - BELT.x0 + 1) * T,
      gap = 1.6 * T;
    const count = Math.ceil(span / gap);
    for (let i = 0; i < count; i++) {
      const pos = (this.beltPhase * 38 + i * gap) % span;
      const wx = BELT.x0 * T + pos,
        tile = wx / T;
      if (tile < x0 - 1 || tile > x1 + 1) continue;
      const [text, id] = beltTokens[i % beltTokens.length];
      this.drawBeltToken(wx, y + T / 2, tile, text, id, i);
    }
  }
  private drawBeltToken(x: number, y: number, tile: number, text: string, id: number, i: number) {
    const c = this.ctx;
    const hue = (id * 47) % 360;
    c.save();
    c.font = "700 11px 'Source Sans 3 Variable', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    if (tile < 30) {
      // Raw text before the tokenizer.
      const label = text.trim() || "·";
      c.fillStyle = "rgba(255,255,255,.9)";
      c.fillText(label, x, y);
    } else if (tile < 33) {
      // Token chip with its real id.
      roundRect(c, x - 17, y - 10, 34, 20, 5);
      c.fillStyle = `hsl(${hue} 55% 32%)`;
      c.fill();
      c.fillStyle = "#fff";
      c.fillText(`#${id}`, x, y);
    } else if (tile < 42) {
      // Vector after embedding: a few bars, then mixed by attention.
      const mixed = tile >= 36;
      for (let k = 0; k < 5; k++) {
        const v = Math.sin(id * 3.1 + k * 1.7 + (mixed ? tile * 0.8 : 0));
        c.fillStyle = mixed ? `hsl(${(hue + k * 30) % 360} 70% 62%)` : `hsl(${hue} 65% 58%)`;
        c.fillRect(x - 12 + k * 5, y - Math.abs(v) * 12, 4, Math.abs(v) * 12 + 2);
      }
      if (mixed && i % 2 === 0) {
        c.strokeStyle = "rgba(95,212,224,.35)";
        c.beginPath();
        c.arc(x, y - 4, 14, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
    } else {
      // Logits become a chosen token at the end of the line.
      const out = [" di", " laci", " biru", "."][i % 4];
      roundRect(c, x - 18, y - 10, 36, 20, 10);
      c.fillStyle = "#e9b949";
      c.fill();
      c.fillStyle = "#1a1405";
      c.fillText(out.trim() || out, x, y);
    }
    c.restore();
  }

  private drawRecommendedRing() {
    const id = this.state.recommended;
    const o = id && interactables.find((t) => t.id === id);
    if (!o) return;
    const c = this.ctx,
      pulse = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(this.time * 4);
    c.save();
    c.strokeStyle = `rgba(255,207,74,${0.35 + pulse * 0.4})`;
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse((o.x + 0.5) * T, (o.y + 0.85) * T, T * (0.62 + pulse * 0.12), T * (0.3 + pulse * 0.06), 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  private shadow(x: number, y: number, w: number) {
    const c = this.ctx;
    c.fillStyle = "rgba(0,0,0,.35)";
    c.beginPath();
    c.ellipse(x, y, w, w * 0.35, 0, 0, Math.PI * 2);
    c.fill();
  }

  private drawObject(o: WorldObject) {
    const cx = (o.x + 0.5) * T,
      base = (o.y + 1) * T - 6;
    switch (o.kind) {
      case "quest":
        return this.drawStation(cx, base, o.zone, o.id);
      case "book":
        return this.drawLectern(cx, base, o.zone, o.id);
      case "npc":
        return this.drawNara(cx, base);
      case "exam":
        return this.drawKiosk(cx, base, o.gate);
      case "trophy":
        return this.drawTrophy(cx, base);
      case "decor":
        return this.drawDecor(o);
    }
  }

  private drawStation(cx: number, base: number, zone: ZoneId, id: string) {
    const c = this.ctx,
      a = accent[zone];
    const marker = this.state.markers[id];
    const done = marker?.kind === "done";
    const hovered = this.hover?.id === id || this.near?.id === id;
    this.shadow(cx, base, T * 0.46);
    const w = T * 0.86,
      h = T * 1.15,
      left = cx - w / 2,
      top = base - h;
    // Cabinet
    roundRect(c, left, top, w, h, 8);
    c.fillStyle = zone === 0 ? "#3d2f24" : zone === 1 ? "#24323c" : "#252b4d";
    c.fill();
    roundRect(c, left, top, w, h * 0.42, 8);
    c.fillStyle = zone === 0 ? "#57432f" : zone === 1 ? "#33454f" : "#343c69";
    c.fill();
    if (hovered) {
      c.strokeStyle = a;
      c.lineWidth = 2.5;
      roundRect(c, left - 2, top - 2, w + 4, h + 4, 10);
      c.stroke();
    }
    // Screen
    const sx = left + 6,
      sy = top + 7,
      sw = w - 12,
      sh = h * 0.5;
    roundRect(c, sx, sy, sw, sh, 5);
    c.fillStyle = "#08141a";
    c.fill();
    c.save();
    c.globalAlpha = done ? 0.55 : 1;
    c.fillStyle = a;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const v = 0.35 + 0.55 * Math.abs(Math.sin(this.time * (1.2 + i * 0.3) + i * 2 + cx));
      const bh = (sh - 10) * (this.reduced ? 0.6 : v);
      c.fillRect(sx + 5 + i * ((sw - 10) / n), sy + sh - 5 - bh, (sw - 10) / n - 3, bh);
    }
    c.restore();
    c.fillStyle = `${a}33`;
    c.fillRect(sx, sy, sw, 3);
    // Buttons / LEDs
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i === 0 ? a : i === 1 ? "#f08a7e" : "#e9b949";
      const on = (Math.floor(this.time * 2 + i + cx) % 3) !== 0 || this.reduced;
      c.globalAlpha = on ? 1 : 0.35;
      c.beginPath();
      c.arc(left + 12 + i * 10, top + h * 0.78, 3, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    if (zone === 1) {
      // Pipe into the floor
      c.fillStyle = "#3b4f5b";
      c.fillRect(cx + w / 2 - 8, top + 10, 5, h - 10);
    }
    if (zone === 2) {
      c.strokeStyle = `${a}aa`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, top - 4, 9, Math.PI, 0);
      c.stroke();
      c.beginPath();
      c.moveTo(cx, top - 4);
      c.lineTo(cx, top);
      c.stroke();
    }
  }

  private drawLectern(cx: number, base: number, zone: ZoneId, id: string) {
    const c = this.ctx;
    const m = this.state.markers[id];
    const unread = m?.kind === "book" && !m.read;
    const hovered = this.hover?.id === id || this.near?.id === id;
    this.shadow(cx, base, T * 0.34);
    c.fillStyle = "#5a3d26";
    c.fillRect(cx - 4, base - T * 0.62, 8, T * 0.6);
    c.fillStyle = "#4a3120";
    roundRect(c, cx - 14, base - 6, 28, 6, 3);
    c.fill();
    // Slanted top with an open book
    c.save();
    c.translate(cx, base - T * 0.7);
    c.fillStyle = "#6b4a2e";
    roundRect(c, -20, -8, 40, 14, 3);
    c.fill();
    c.fillStyle = "#f3ead8";
    c.beginPath();
    c.moveTo(-17, -6);
    c.quadraticCurveTo(-8, -11, 0, -6);
    c.quadraticCurveTo(8, -11, 17, -6);
    c.lineTo(17, 3);
    c.quadraticCurveTo(8, -1, 0, 3);
    c.quadraticCurveTo(-8, -1, -17, 3);
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -6);
    c.lineTo(0, 3);
    c.stroke();
    c.fillStyle = "rgba(60,60,80,.4)";
    for (let i = 0; i < 3; i++) {
      c.fillRect(-14, -3 + i * 2.5, 11, 1);
      c.fillRect(3, -3 + i * 2.5, 11, 1);
    }
    c.restore();
    if (unread || hovered) {
      const glow = this.reduced ? 0.4 : 0.3 + 0.25 * Math.sin(this.time * 3 + cx);
      c.fillStyle = hovered ? `${accent[zone]}66` : `rgba(207,231,255,${glow})`;
      c.beginPath();
      c.ellipse(cx, base - T * 0.72, 26, 12, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  private drawNara(cx: number, base: number) {
    const c = this.ctx;
    const bob = this.reduced ? 0 : Math.sin(this.time * 2.4) * 4;
    this.shadow(cx, base, T * 0.3);
    const y = base - T * 0.75 + bob;
    c.strokeStyle = "#8ce3ca";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx, y - 18);
    c.lineTo(cx, y - 26);
    c.stroke();
    c.fillStyle = "#f7c782";
    c.beginPath();
    c.arc(cx, y - 27, 3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#173a3a";
    c.beginPath();
    c.arc(cx, y, 18, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#8ce3ca";
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.arc(cx, y, 10, 0, Math.PI * 2);
    c.stroke();
    const look = Math.max(-1, Math.min(1, (this.player.x * T - cx) / 200));
    c.fillStyle = "#f7c782";
    c.beginPath();
    c.arc(cx + 3 + look * 3, y - 2, 4, 0, Math.PI * 2);
    c.fill();
    // little hover jets
    c.fillStyle = `rgba(140,227,202,${0.25 + 0.2 * Math.sin(this.time * 9)})`;
    c.beginPath();
    c.ellipse(cx, y + 22, 8, 3, 0, 0, Math.PI * 2);
    c.fill();
  }

  private drawKiosk(cx: number, base: number, gate: number) {
    const c = this.ctx,
      open = this.state.gates[gate];
    this.shadow(cx, base, T * 0.3);
    roundRect(c, cx - 13, base - T * 1.0, 26, T * 1.0, 6);
    c.fillStyle = "#2b3440";
    c.fill();
    roundRect(c, cx - 9, base - T * 0.9, 18, 18, 4);
    c.fillStyle = open ? "#173a2a" : "#3a2a12";
    c.fill();
    c.fillStyle = open ? "#8fd694" : GOLD;
    c.font = "800 14px 'Source Sans 3 Variable', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(open ? "✓" : "?", cx, base - T * 0.9 + 9);
  }

  private drawTrophy(cx: number, base: number) {
    const c = this.ctx;
    this.shadow(cx, base, T * 0.4);
    c.fillStyle = "#3a3020";
    roundRect(c, cx - 18, base - 22, 36, 22, 4);
    c.fill();
    const glow = this.reduced ? 0.4 : 0.3 + 0.2 * Math.sin(this.time * 2);
    c.fillStyle = `rgba(233,185,73,${glow})`;
    c.beginPath();
    c.arc(cx, base - 46, 26, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#e9b949";
    c.beginPath();
    c.moveTo(cx - 14, base - 62);
    c.lineTo(cx + 14, base - 62);
    c.quadraticCurveTo(cx + 13, base - 38, cx, base - 34);
    c.quadraticCurveTo(cx - 13, base - 38, cx - 14, base - 62);
    c.fill();
    c.fillRect(cx - 3, base - 34, 6, 8);
    c.fillRect(cx - 9, base - 27, 18, 5);
    c.strokeStyle = "#e9b949";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx - 15, base - 54, 6, Math.PI * 0.5, Math.PI * 1.5);
    c.arc(cx + 15, base - 54, 6, Math.PI * 1.5, Math.PI * 0.5);
    c.stroke();
  }

  private drawDecor(o: DecorObject) {
    const c = this.ctx,
      w = (o.w ?? 1) * T,
      h = (o.h ?? 1) * T,
      left = o.x * T,
      top = o.y * T,
      cx = left + w / 2,
      base = top + h - 6;
    switch (o.sprite) {
      case "plant": {
        this.shadow(cx, base, 16);
        c.fillStyle = "#8a5a3b";
        roundRect(c, cx - 11, base - 16, 22, 16, 4);
        c.fill();
        c.fillStyle = "#3f8f5c";
        for (const [dx, dy, r] of [
          [-7, -24, 10],
          [7, -26, 10],
          [0, -34, 11],
        ]) {
          c.beginPath();
          c.arc(cx + dx, base + dy, r, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = "#5bb07a";
        c.beginPath();
        c.arc(cx - 2, base - 36, 5, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case "tree": {
        this.shadow(cx, base, 22);
        c.fillStyle = "#6b4a2e";
        c.fillRect(cx - 5, base - 26, 10, 26);
        c.fillStyle = "#2f7a4f";
        c.beginPath();
        c.arc(cx, base - 44, 24, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#3c9461";
        c.beginPath();
        c.arc(cx - 7, base - 52, 13, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case "bench": {
        this.shadow(cx, base, w / 2.4);
        c.fillStyle = "#7a5636";
        roundRect(c, left + 8, base - 22, w - 16, 8, 3);
        c.fill();
        roundRect(c, left + 8, base - 36, w - 16, 8, 3);
        c.fill();
        c.fillStyle = "#4a3120";
        c.fillRect(left + 12, base - 14, 5, 14);
        c.fillRect(left + w - 17, base - 14, 5, 14);
        break;
      }
      case "shelf": {
        c.fillStyle = "#4a3120";
        c.fillRect(left + 4, top - T * 0.5, w - 8, T * 1.3);
        const colors = ["#c0504d", "#4f81bd", "#9bbb59", "#e9b949", "#8064a2", "#4bacc6"];
        for (let row = 0; row < 3; row++)
          for (let i = 0; i * 9 < w - 20; i++) {
            const hh = 10 + hash(o.x * 7 + i, row) * 6;
            c.fillStyle = colors[(i + row * 2 + o.x) % colors.length];
            c.fillRect(left + 10 + i * 9, top - T * 0.5 + 6 + row * 20 + (16 - hh), 7, hh);
          }
        break;
      }
      case "crate": {
        this.shadow(cx, base, 20);
        c.fillStyle = "#7a5a33";
        c.fillRect(left + 7, base - 34, w - 14, 34);
        c.strokeStyle = "#5a3f20";
        c.lineWidth = 3;
        c.strokeRect(left + 8.5, base - 32.5, w - 17, 31);
        c.beginPath();
        c.moveTo(left + 9, base - 32);
        c.lineTo(left + w - 9, base - 2);
        c.stroke();
        break;
      }
      case "rack": {
        c.fillStyle = "#151d24";
        c.fillRect(left + 6, top - T * 0.4, w - 12, T * 1.3);
        for (let i = 0; i < 6; i++) {
          c.fillStyle = "#222d36";
          c.fillRect(left + 9, top - T * 0.4 + 4 + i * 10, w - 18, 7);
          const on = (Math.floor(this.time * 3 + i * 1.7 + o.x) % 4) !== 0 || this.reduced;
          c.fillStyle = on ? (i % 2 ? "#5fd4e0" : "#8fd694") : "#2a3a42";
          c.fillRect(left + w - 16, top - T * 0.4 + 6 + i * 10, 3, 3);
        }
        break;
      }
      case "lamp": {
        this.shadow(cx, base, 12);
        c.fillStyle = "#2b3440";
        c.fillRect(cx - 2, base - 50, 4, 50);
        const glow = 0.25 + 0.1 * Math.sin(this.time * 1.5 + o.x);
        c.fillStyle = `rgba(255,230,170,${glow})`;
        c.beginPath();
        c.arc(cx, base - 54, 22, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#ffe6aa";
        c.beginPath();
        c.arc(cx, base - 54, 6, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case "holo":
        this.drawHolo(cx, top + h / 2);
        break;
    }
  }

  private drawHolo(cx: number, cy: number) {
    const c = this.ctx,
      t = this.reduced ? 0 : this.time;
    c.save();
    c.fillStyle = "#1d2448";
    c.beginPath();
    c.ellipse(cx, cy + 40, 64, 26, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#b9a6f2";
    c.lineWidth = 2;
    c.stroke();
    // Light cone
    const g = c.createLinearGradient(0, cy + 40, 0, cy - 70);
    g.addColorStop(0, "rgba(185,166,242,.35)");
    g.addColorStop(1, "rgba(185,166,242,0)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx - 54, cy + 38);
    c.lineTo(cx + 54, cy + 38);
    c.lineTo(cx + 34, cy - 70);
    c.lineTo(cx - 34, cy - 70);
    c.fill();
    // 96 stacked layers, drawn as thin slabs
    for (let i = 0; i < 24; i++) {
      const yy = cy + 26 - i * 3.6;
      const wob = Math.sin(t * 1.5 + i * 0.4) * 3;
      c.strokeStyle = `rgba(214,204,255,${0.25 + (i % 4 === 0 ? 0.35 : 0)})`;
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(cx, yy, 30 + wob, 7, 0, 0, Math.PI * 2);
      c.stroke();
    }
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = `rgba(185,166,242,${0.5 - k * 0.12})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(cx, cy - 20, 46 + k * 8, 14 + k * 3, t * 0.6 + k, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = "#efeaff";
    c.font = "800 16px 'Source Sans 3 Variable', sans-serif";
    c.textAlign = "center";
    c.fillText("GPT-3 · 175B", cx, cy - 78);
    c.font = "600 10px 'Source Sans 3 Variable', sans-serif";
    c.fillStyle = "rgba(239,234,255,.7)";
    c.fillText("96 blok · d = 12.288", cx, cy - 64);
    c.restore();
  }

  private drawGate(g: Gate) {
    const c = this.ctx,
      open = this.state.gates[g.id],
      left = g.x * T,
      top = g.ys[0] * T,
      h = T * 2;
    const a = accent[g.id + 1];
    // Pillars
    c.fillStyle = "#3a4a55";
    roundRect(c, left + 2, top - T * 0.55, T - 4, 14, 4);
    c.fill();
    roundRect(c, left + 2, top + h - 12, T - 4, 14, 4);
    c.fill();
    if (!open) {
      c.save();
      c.globalAlpha = 0.85;
      c.fillStyle = "rgba(255,120,90,.12)";
      c.fillRect(left + 4, top, T - 8, h);
      for (let i = 0; i < 5; i++) {
        const phase = this.reduced ? 0 : Math.sin(this.time * 6 + i);
        c.strokeStyle = `rgba(255,140,100,${0.45 + phase * 0.25})`;
        c.lineWidth = 2;
        c.beginPath();
        const x = left + 8 + i * ((T - 16) / 4);
        c.moveTo(x, top + 2);
        c.lineTo(x, top + h - 2);
        c.stroke();
      }
      c.restore();
      // Lock badge
      const cy = top + h / 2;
      c.fillStyle = "#24161a";
      c.beginPath();
      c.arc(left + T / 2, cy, 14, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#ff8c64";
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = "#ff8c64";
      c.fillRect(left + T / 2 - 6, cy - 2, 12, 9);
      c.beginPath();
      c.arc(left + T / 2, cy - 2, 4.5, Math.PI, 0);
      c.stroke();
    } else {
      const glow = this.reduced ? 0.25 : 0.2 + 0.1 * Math.sin(this.time * 3);
      c.fillStyle = `${a}${Math.round(glow * 255)
        .toString(16)
        .padStart(2, "0")}`;
      c.fillRect(left, top, T, h);
    }
  }

  private drawPlayer() {
    const c = this.ctx,
      p = this.player,
      cx = p.x * T,
      base = p.y * T + 10;
    const walk = p.moving && !this.reduced ? Math.sin(p.step) : 0;
    const bob = Math.abs(walk) * 2.5;
    this.shadow(cx, base, 14);
    // Legs
    c.fillStyle = "#24324a";
    c.fillRect(cx - 7, base - 12 + Math.max(0, walk) * 3, 5, 12 - Math.max(0, walk) * 3);
    c.fillRect(cx + 2, base - 12 + Math.max(0, -walk) * 3, 5, 12 - Math.max(0, -walk) * 3);
    // Lab coat
    const top = base - 34 - bob;
    roundRect(c, cx - 11, top, 22, 24, 7);
    c.fillStyle = "#eef4f2";
    c.fill();
    c.fillStyle = "#5fd4e0";
    c.fillRect(cx - 1, top + 3, 2, 18);
    if (p.facing !== "up") {
      c.fillStyle = "#87e2c8";
      c.fillRect(cx + (p.facing === "side" ? p.dir * 4 - 2 : 4), top + 7, 4, 5);
    }
    // Head
    const hy = top - 9;
    c.fillStyle = "#f1c9a5";
    c.beginPath();
    c.arc(cx, hy, 10, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#2b1d16";
    c.beginPath();
    if (p.facing === "up") c.arc(cx, hy, 10.5, 0, Math.PI * 2);
    else c.arc(cx, hy - 3, 10.5, Math.PI * 1.02, Math.PI * 1.98);
    c.fill();
    if (p.facing !== "up") {
      c.fillStyle = "#1a1a1a";
      const ex = p.facing === "side" ? p.dir * 4 : 0;
      c.fillRect(cx - 4 + ex, hy, 2, 3);
      c.fillRect(cx + 2 + ex, hy, 2, 3);
    }
  }

  private drawMarker(o: Interactable) {
    const m = this.state.markers[o.id];
    if (!m || m.kind === "none") return;
    const c = this.ctx;
    const rec = this.state.recommended === o.id;
    const bounce = this.reduced ? 0 : Math.sin(this.time * 3.2 + o.x) * (rec ? 5 : 2.5);
    const cx = (o.x + 0.5) * T,
      cy = o.y * T - T * 0.55 + bounce - (o.kind === "trophy" ? 18 : 0);
    c.save();
    c.textAlign = "center";
    c.textBaseline = "middle";
    const bubble = (fill: string, stroke: string, r = 12) => {
      c.fillStyle = fill;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = stroke;
      c.lineWidth = 2;
      c.stroke();
    };
    switch (m.kind) {
      case "new":
        bubble(GOLD, "#7a5a00", rec ? 14 : 12);
        c.fillStyle = "#2a1d00";
        c.font = "900 17px 'Source Sans 3 Variable', sans-serif";
        c.fillText("!", cx, cy + 1);
        break;
      case "progress": {
        bubble("#0f2229", "#2f5560", 13);
        c.strokeStyle = "#5fd4e0";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * m.done) / m.total);
        c.stroke();
        c.fillStyle = "#e1edf0";
        c.font = "800 10px 'Source Sans 3 Variable', sans-serif";
        c.fillText(`${m.done}/${m.total}`, cx, cy + 1);
        break;
      }
      case "done":
        bubble("#1f5a3a", "#8fd694", 11);
        c.strokeStyle = "#d8ffd9";
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(cx - 5, cy);
        c.lineTo(cx - 1, cy + 4);
        c.lineTo(cx + 5, cy - 4);
        c.stroke();
        break;
      case "book":
        if (m.read) break;
        bubble("#16314a", "#8db8e8", 12);
        c.fillStyle = "#cfe7ff";
        c.beginPath();
        c.moveTo(cx, cy - 3);
        c.quadraticCurveTo(cx - 4, cy - 6, cx - 8, cy - 5);
        c.lineTo(cx - 8, cy + 5);
        c.quadraticCurveTo(cx - 4, cy + 4, cx, cy + 6);
        c.quadraticCurveTo(cx + 4, cy + 4, cx + 8, cy + 5);
        c.lineTo(cx + 8, cy - 5);
        c.quadraticCurveTo(cx + 4, cy - 6, cx, cy - 3);
        c.fill();
        c.strokeStyle = "#16314a";
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(cx, cy - 3);
        c.lineTo(cx, cy + 6);
        c.stroke();
        break;
      case "talk":
        c.fillStyle = "#e1edf0";
        roundRect(c, cx - 15, cy - 9 - 6, 30, 18, 8);
        c.fill();
        c.fillStyle = "#173a3a";
        for (let i = -1; i <= 1; i++) {
          c.beginPath();
          c.arc(cx + i * 7, cy - 6, 2.2, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case "exam":
        if (m.open) break;
        bubble("#3a2a12", GOLD, 11);
        c.fillStyle = GOLD;
        c.font = "900 13px 'Source Sans 3 Variable', sans-serif";
        c.fillText("?", cx, cy + 1);
        break;
      case "star": {
        c.fillStyle = GOLD;
        star(c, cx, cy, 12, 5);
        c.fill();
        break;
      }
    }
    if (rec) {
      c.fillStyle = GOLD;
      c.beginPath();
      c.moveTo(cx - 7, cy - 26);
      c.lineTo(cx + 7, cy - 26);
      c.lineTo(cx, cy - 18);
      c.fill();
    }
    c.restore();
  }

  private drawLabels() {
    const c = this.ctx,
      p = this.player;
    c.save();
    c.font = "700 12px 'Source Sans 3 Variable', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const o of interactables) {
      const label = this.state.labels[o.id];
      if (!label) continue;
      const d = Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y);
      const focus = this.hover?.id === o.id || this.near?.id === o.id;
      if (!focus && d > 3.2) continue;
      const alpha = focus ? 1 : Math.max(0, Math.min(1, (3.2 - d) / 1.2)) * 0.85;
      const cx = (o.x + 0.5) * T,
        cy = (o.y + 1) * T + 10;
      const tw = c.measureText(label).width + 16;
      c.globalAlpha = alpha;
      roundRect(c, cx - tw / 2, cy - 10, tw, 20, 10);
      c.fillStyle = focus ? "rgba(8,20,26,.95)" : "rgba(8,20,26,.75)";
      c.fill();
      if (focus) {
        c.strokeStyle = accent[o.zone];
        c.lineWidth = 1.5;
        c.stroke();
      }
      c.fillStyle = "#e9f3f2";
      c.fillText(label, cx, cy + 1);
    }
    c.restore();
  }

  private drawParticles() {
    const c = this.ctx;
    for (const q of this.particles) {
      c.save();
      c.globalAlpha = 1 - q.life / q.max;
      c.translate(q.x * T, q.y * T);
      c.rotate(q.spin);
      c.fillStyle = q.color;
      c.fillRect((-q.size * T) / 2, (-q.size * T) / 4, q.size * T, (q.size * T) / 2);
      c.restore();
    }
    c.save();
    c.textAlign = "center";
    c.font = "900 18px 'Source Sans 3 Variable', sans-serif";
    for (const f of this.floaters) {
      c.globalAlpha = Math.min(1, 2 - f.life * 1.25);
      c.lineWidth = 4;
      c.strokeStyle = "rgba(0,0,0,.6)";
      c.strokeText(f.text, f.x * T, f.y * T);
      c.fillStyle = f.color;
      c.fillText(f.text, f.x * T, f.y * T);
    }
    c.restore();
  }

  private drawOffscreenArrow() {
    const id = this.state.recommended;
    const o = id && interactables.find((t) => t.id === id);
    if (!o) return;
    const sx = ((o.x + 0.5) * T - this.cam.x) * this.scale + this.w / 2,
      sy = ((o.y + 0.5) * T - this.cam.y) * this.scale + this.h / 2;
    const m = 56;
    if (sx > m && sx < this.w - m && sy > m && sy < this.h - m) return;
    const cx = this.w / 2,
      cy = this.h / 2,
      ang = Math.atan2(sy - cy, sx - cx);
    const ex = Math.min(Math.max(sx, m), this.w - m),
      ey = Math.min(Math.max(sy, m + 40), this.h - m - 40);
    const c = this.ctx;
    c.save();
    c.translate(ex, ey);
    c.rotate(ang);
    c.fillStyle = GOLD;
    c.strokeStyle = "rgba(0,0,0,.5)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(-8, -11);
    c.lineTo(-3, 0);
    c.lineTo(-8, 11);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, n: number) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * 0.45 : r,
      a = (i * Math.PI) / n - Math.PI / 2;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

export const zoneAccent = accent;
export { zones };
