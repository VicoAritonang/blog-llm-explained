// Books on lecterns. Walk up, open the book, turn its pages by touching them,
// and answer the question on the last spread to finish it. Pages are painted
// on canvases, so the book lives in the world rather than in an overlay.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { books, type Book, type Page } from "./books";
import { useWorld } from "./store";
import { isRegionOpen } from "./content";
import { lecterns, type Lectern } from "./world";
import { Label, useHoverCursor } from "./kit";
import { getTextures } from "./textures";
import { player } from "./player";

const W = 900,
  H = 1200;
const FONT = '"Source Sans 3 Variable", "Segoe UI", sans-serif';
export const spreadCount = (b: Book) => b.pages.length + (b.quiz ? 1 : 0);

/* --------------------------------------------------------- page painting -- */
let parchment: HTMLCanvasElement | null = null;
function paper() {
  if (parchment) return parchment;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < W * H; i++) {
    const x = i % W,
      y = (i / W) | 0;
    const edge = Math.min(x, W - x, y, H - y) / 90;
    const n = 0.94 + rnd() * 0.05 - Math.max(0, 1 - edge) * 0.12;
    img.data[i * 4] = 246 * n;
    img.data[i * 4 + 1] = 236 * n;
    img.data[i * 4 + 2] = 212 * n;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return (parchment = c);
}
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(/\s+/),
    lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
/** Paragraphs, shrinking the type until they fit the space left. */
function paragraphs(ctx: CanvasRenderingContext2D, texts: string[], top: number, bottom: number) {
  let size = 38;
  for (; size > 18; size -= 2) {
    ctx.font = `600 ${size}px ${FONT}`;
    const height = texts.reduce((h, t) => h + wrap(ctx, t, W - 150).length * size * 1.45 + size * 0.7, 0);
    if (top + height < bottom) break;
  }
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.fillStyle = "#22180c";
  let y = top;
  for (const t of texts) {
    for (const l of wrap(ctx, t, W - 150)) {
      ctx.fillText(l, 75, y);
      y += size * 1.45;
    }
    y += size * 0.7;
  }
  return y;
}
function frame(color: string, folio: string) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(paper(), 0, 0);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.globalAlpha = 1;
  ctx.textBaseline = "top";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillStyle = "#8a7356";
  ctx.textAlign = "center";
  ctx.fillText(folio, W / 2, H - 80);
  ctx.textAlign = "left";
  return { c, ctx };
}
function heading(ctx: CanvasRenderingContext2D, text: string, color: string, y = 90) {
  ctx.font = `800 46px ${FONT}`;
  ctx.fillStyle = "#2a1d10";
  const lines = wrap(ctx, text, W - 150);
  lines.forEach((l, i) => ctx.fillText(l, 75, y + i * 54));
  const end = y + lines.length * 54 + 12;
  ctx.fillStyle = color;
  ctx.fillRect(75, end, 120, 6);
  return end + 40;
}
function visual(ctx: CanvasRenderingContext2D, page: Page, color: string, top: number) {
  let y = top;
  if (page.flow) {
    ctx.font = `700 26px ${FONT}`;
    page.flow.forEach((step, i) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(110, y, W - 220, 62);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#2a1d10";
      ctx.fillText(step, 140, y + 16);
      if (i < page.flow!.length - 1) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 12, y + 68);
        ctx.lineTo(W / 2 + 12, y + 68);
        ctx.lineTo(W / 2, y + 84);
        ctx.fill();
      }
      y += 92;
    });
  }
  if (page.timeline) {
    for (const [when, what] of page.timeline) {
      ctx.font = `800 28px ${FONT}`;
      ctx.fillStyle = color;
      ctx.fillText(when, 75, y);
      ctx.font = `600 28px ${FONT}`;
      ctx.fillStyle = "#22180c";
      const lines = wrap(ctx, what, W - 330);
      lines.forEach((l, i) => ctx.fillText(l, 255, y + i * 36));
      y += Math.max(1, lines.length) * 36 + 22;
    }
  }
  if (page.stats) {
    for (const [k, v] of page.stats) {
      ctx.font = `600 26px ${FONT}`;
      ctx.fillStyle = "#5a4630";
      ctx.fillText(k, 75, y);
      ctx.font = `800 30px ${FONT}`;
      ctx.fillStyle = "#2a1d10";
      ctx.textAlign = "right";
      ctx.fillText(v, W - 75, y - 2);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(90,70,48,0.25)";
      ctx.fillRect(75, y + 42, W - 150, 2);
      y += 66;
    }
  }
  return y;
}
const letters = "ABCD";
export const OPTION_TOP = 250,
  OPTION_ROW = 200;
/** Left and right sides of one spread. */
function paintSpread(b: Book, spread: number, answer: number | null) {
  const total = spreadCount(b);
  if (spread === b.pages.length && b.quiz) {
    const q = b.quiz;
    const left = frame(b.color, `${spread * 2 + 1}`);
    let y = heading(left.ctx, "Uji pemahaman", b.color);
    y = paragraphs(left.ctx, [q.q], y + 10, 760);
    if (answer !== null) {
      left.ctx.font = `800 30px ${FONT}`;
      left.ctx.fillStyle = answer === q.answer ? "#2f7a3a" : "#a33a2a";
      left.ctx.fillText(answer === q.answer ? "Tepat! Buku tamat." : "Belum tepat, coba pilihan lain.", 75, y + 10);
      if (answer === q.answer) paragraphs(left.ctx, [q.why], y + 70, 1080);
    } else {
      left.ctx.font = `600 24px ${FONT}`;
      left.ctx.fillStyle = "#8a7356";
      left.ctx.fillText("Sentuh salah satu jawaban di halaman kanan.", 75, y + 10);
    }
    const right = frame(b.color, `${spread * 2 + 2}`);
    q.options.forEach((opt, i) => {
      const top = OPTION_TOP + i * OPTION_ROW;
      const picked = answer === i,
        good = picked && i === q.answer;
      right.ctx.fillStyle = picked ? (good ? "rgba(47,122,58,0.22)" : "rgba(163,58,42,0.2)") : "rgba(90,70,48,0.08)";
      right.ctx.fillRect(70, top, W - 140, OPTION_ROW - 30);
      right.ctx.strokeStyle = picked ? (good ? "#2f7a3a" : "#a33a2a") : b.color;
      right.ctx.lineWidth = 3;
      right.ctx.strokeRect(70, top, W - 140, OPTION_ROW - 30);
      right.ctx.font = `800 40px ${FONT}`;
      right.ctx.fillStyle = b.color;
      right.ctx.fillText(letters[i], 95, top + 22);
      right.ctx.font = `600 28px ${FONT}`;
      right.ctx.fillStyle = "#2a1d10";
      wrap(right.ctx, opt, W - 290)
        .slice(0, 3)
        .forEach((l, k) => right.ctx.fillText(l, 160, top + 26 + k * 38));
    });
    return [left.c, right.c];
  }
  const page = b.pages[spread];
  const left = frame(b.color, `${spread * 2 + 1}`);
  if (spread === 0) {
    left.ctx.font = `700 22px ${FONT}`;
    left.ctx.fillStyle = b.color;
    left.ctx.fillText(b.subtitle.toUpperCase(), 75, 70);
  }
  const top = heading(left.ctx, page.heading, b.color, spread === 0 ? 110 : 90);
  const hasVisual = !!(page.flow || page.timeline || page.stats);
  // without a picture, the text runs on across the spread
  const split = hasVisual ? page.body.length : Math.ceil(page.body.length / 2);
  paragraphs(left.ctx, page.body.slice(0, split), top, H - 120);
  const right = frame(b.color, `${spread * 2 + 2}`);
  let y = 100;
  if (hasVisual) y = visual(right.ctx, page, b.color, 110);
  else y = paragraphs(right.ctx, page.body.slice(split), 110, H - 160);
  right.ctx.font = `700 24px ${FONT}`;
  right.ctx.fillStyle = "#8a7356";
  right.ctx.textAlign = "right";
  right.ctx.fillText(spread < total - 1 ? "sentuh halaman ini untuk lanjut →" : "akhir buku", W - 75, Math.max(y + 20, H - 150));
  right.ctx.textAlign = "left";
  return [left.c, right.c];
}

/* ----------------------------------------------------------- the lectern -- */
function Lectern({ l }: { l: Lectern }) {
  const book = books[l.book];
  const read = useWorld((s) => s.booksRead.includes(l.book));
  const open = useWorld((s) => isRegionOpen(s.done, l.region));
  const reading = useWorld((s) => s.reading?.book === l.book);
  const openBook = useWorld((s) => s.openBook);
  const tex = getTextures();
  const floater = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  useHoverCursor(hover && open && !reading);
  useFrame(({ clock }) => {
    const g = floater.current;
    if (!g) return;
    g.position.y = 1.75 + Math.sin(clock.elapsedTime * 1.6 + l.x) * 0.08;
    g.rotation.y = clock.elapsedTime * 0.6;
  });
  return (
    <group
      position={[l.x, 0, l.z]}
      rotation={[0, l.angle, 0]}
      name={`lectern-${l.book}`}
      onClick={(e) => {
        if (e.delta > 8 || !open || reading || useWorld.getState().tool !== "tangan") return;
        e.stopPropagation();
        openBook(l.book);
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {/* stone foot, wooden stand, slanted top */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.65, 0.24, 8]} />
        <meshStandardMaterial map={tex.rock} color="#c9bca8" roughness={1} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.32, 0.9, 0.32]} />
        <meshStandardMaterial map={tex.bark} color="#8a6a4a" />
      </mesh>
      {/* the reading surface leans towards the reader, who stands on the +z side */}
      <mesh position={[0, 1.15, 0.05]} rotation={[0.45, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 0.08, 1.0]} />
        <meshStandardMaterial map={tex.planks} color="#a07a52" />
      </mesh>
      {!reading && (
        <group ref={floater}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.66, 0.12]} />
            <meshStandardMaterial color={book.color} emissive={book.color} emissiveIntensity={read ? 0.15 : 0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.0]} scale={[0.92, 0.94, 1.05]}>
            <boxGeometry args={[0.5, 0.66, 0.12]} />
            <meshStandardMaterial color="#f4ecd8" />
          </mesh>
        </group>
      )}
      {!reading && open && (
        <Billboard position={[0, 2.55, 0]}>
          <Label text={book.title} size={0.17} bg="rgba(10,24,30,0.82)" color={book.color} weight={800} />
          <Label text={read ? "✓ tamat" : "buku · sentuh untuk membaca"} size={0.12} position={[0, -0.26, 0]} color="#e8f1ef" weight={700} />
        </Billboard>
      )}
      {reading && <OpenBook id={l.book} />}
      <mesh position={[0, 1.4, 0]} visible={false}>
        <cylinderGeometry args={[0.8, 0.8, 2.6, 8]} />
      </mesh>
    </group>
  );
}

/** The open book on the lectern top. Touch the right page to go on, the left to go back. */
function OpenBook({ id }: { id: string }) {
  const b = books[id];
  const reading = useWorld((s) => s.reading);
  const turnPage = useWorld((s) => s.turnPage);
  const answer = useWorld((s) => s.answer);
  const page = reading?.page ?? 0;
  const picked = reading?.answer ?? null;
  const textures = useMemo(() => {
    const [l, r] = paintSpread(b, page, picked);
    return [l, r].map((c) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    });
  }, [b, page, picked]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  // the leaf that flips over the spine when the page changes
  const leaf = useRef<THREE.Group>(null);
  const flip = useRef({ t: 1, dir: 1 });
  const last = useRef(page);
  if (last.current !== page) {
    flip.current = { t: 0, dir: page > last.current ? 1 : -1 };
    last.current = page;
  }
  useFrame((_, dt) => {
    const f = flip.current;
    f.t = Math.min(1, f.t + dt * 2.2);
    if (!leaf.current) return;
    leaf.current.visible = f.t < 1;
    const a = f.dir > 0 ? f.t * Math.PI : (1 - f.t) * Math.PI;
    leaf.current.rotation.y = -a;
  });
  const pw = 0.62,
    ph = pw * (H / W);
  const onRight = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    if (b.quiz && page === b.pages.length) {
      const y = (1 - (e.uv?.y ?? 0)) * H;
      const i = Math.floor((y - OPTION_TOP) / OPTION_ROW);
      if (i >= 0 && i < b.quiz.options.length) answer(i);
      return;
    }
    turnPage(1);
  };
  const onLeft = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    turnPage(-1);
  };
  return (
    <group position={[0, 1.215, 0.075]} rotation={[0.45 - Math.PI / 2, 0, 0]}>
      {/* cover boards */}
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[pw * 2 + 0.08, ph + 0.08, 0.02]} />
        <meshStandardMaterial color={b.color} roughness={0.6} />
      </mesh>
      {/* pages are unlit paper so the type stays crisp under any light */}
      <mesh position={[-pw / 2, 0, 0.006]} onClick={onLeft}>
        <planeGeometry args={[pw, ph]} />
        <meshBasicMaterial map={textures[0]} toneMapped={false} />
      </mesh>
      <mesh position={[pw / 2, 0, 0.006]} onClick={onRight} name="book-right">
        <planeGeometry args={[pw, ph]} />
        <meshBasicMaterial map={textures[1]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={[0.012, ph]} />
        <meshBasicMaterial color="#b9a888" />
      </mesh>
      <group ref={leaf} position={[0, 0, 0.012]} visible={false}>
        <mesh position={[pw / 2, 0, 0]}>
          <planeGeometry args={[pw, ph]} />
          <meshStandardMaterial color="#f1e6cc" side={THREE.DoubleSide} roughness={0.95} />
        </mesh>
      </group>
      <pointLight position={[0, -0.2, 0.9]} intensity={2.2} distance={3} color="#fff1d8" />
    </group>
  );
}

export function Library() {
  return (
    <>
      {lecterns.map((l) => (
        <Lectern key={l.book} l={l} />
      ))}
    </>
  );
}

/** Nearest open lectern, for the E prompt. */
export function nearestBook(done: Set<string>) {
  let best: string | null = null,
    bestD = 3.6;
  for (const l of lecterns) {
    const d = Math.hypot(player.pos.x - l.x, player.pos.z - l.z);
    if (d < bestD && isRegionOpen(done, l.region)) {
      bestD = d;
      best = l.book;
    }
  }
  return best;
}

/** Plain text of a spread, for screen readers and the page-text fallback. */
export function spreadText(id: string, spread: number) {
  const b = books[id];
  if (b.quiz && spread === b.pages.length) return `Uji pemahaman. ${b.quiz.q}`;
  const p = b.pages[spread];
  const extra = [
    ...(p.flow ? [p.flow.join(" → ")] : []),
    ...(p.timeline ?? []).map(([a, c]) => `${a}: ${c}`),
    ...(p.stats ?? []).map(([a, c]) => `${a}: ${c}`),
  ];
  return [p.heading, ...p.body, ...extra].join(" ");
}
