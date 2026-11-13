// Tools that act on the world: token blocks (build a sentence, the Oracle reads
// it) and the scanner. One handler on the world root dispatches by tool.
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "./store";
import { colors, category, categoryColor, neighbors, show, trace, vocab } from "./model";
import { softmax } from "../simulation/story/engine.mjs";
import { isStationDone, regionById, stationById, type RegionId, type StationId } from "./content";
import { islands, poses, regionAt } from "./world";
import { player } from "./player";
import { view } from "./view";

export const REACH = 14;

/* -------------------------------------------------------- block faces -- */
const faces = new Map<number, THREE.CanvasTexture>();
export function faceTexture(token: number) {
  const hit = faces.get(token);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const base = categoryColor[category(vocab[token])];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  // pixel-art bevel, like a voxel block
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, 0, 128, 10);
  ctx.fillRect(0, 0, 10, 128);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 118, 128, 10);
  ctx.fillRect(118, 0, 10, 128);
  const label = show(vocab[token]);
  let size = 40;
  ctx.font = `800 ${size}px "Source Sans 3 Variable", sans-serif`;
  while (ctx.measureText(label).width > 108 && size > 16) ctx.font = `800 ${(size -= 2)}px "Source Sans 3 Variable", sans-serif`;
  ctx.fillStyle = "#0d1b20";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 64, 60);
  ctx.font = `700 18px "Source Sans 3 Variable", sans-serif`;
  ctx.fillText(`#${token}`, 64, 98);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  faces.set(token, t);
  return t;
}

export function Blocks() {
  const blocks = useWorld((s) => s.blocks);
  return (
    <group>
      {blocks.map((b) => (
        <mesh key={b.id} position={[b.x, b.y, b.z]} name={`blok-${b.id}`} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial map={faceTexture(b.token)} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** The sentence the blocks spell, in the order they were placed, and the Oracle's guess. */
export function useSentence() {
  const blocks = useWorld((s) => s.blocks);
  return useMemo(() => {
    const ids = blocks.slice(-24).map((b) => b.token);
    if (!ids.length) return null;
    const probs = softmax(trace(ids).lastLogits) as number[];
    const top = probs.indexOf(Math.max(...probs));
    return { ids, top, p: probs[top] };
  }, [blocks]);
}
export function SentenceWatcher() {
  const sentence = useSentence();
  const award = useWorld((s) => s.award);
  useEffect(() => {
    if (sentence && colors.includes(vocab[sentence.top].trim()) && sentence.p > 0.5) award("bisik");
  }, [sentence, award]);
  return null;
}

/* ---------------------------------------------------------- placement -- */
const nearMachine = (x: number, z: number) => Object.values(poses).some((p) => Math.hypot(p.x - x, p.z - z) < 6.3);
const onIsland = (x: number, z: number) => islands.some((i) => Math.hypot(x - i.x, z - i.z) < i.r - 3);
function tryPlace(x: number, y: number, z: number) {
  const s = useWorld.getState();
  if (Math.hypot(x - player.pos.x, z - player.pos.z) > REACH) return s.say("Terlalu jauh. Balok hanya bisa dipasang dalam jangkauan tanganmu.");
  if (!onIsland(x, z) || nearMachine(x, z)) return s.say("Di sini tidak bisa: jangan menghalangi mesin atau jalan ke laut.");
  if (Math.hypot(x - player.pos.x, z - player.pos.z) < 0.9 && y < 2.5) return;
  if (y > 12.5) return;
  s.addBlock({ x, y, z, token: s.blockToken });
}
/** Keyboard and touch fallback: a block one step in front of the walker, stacked if taken. */
export function placeInFront() {
  const fx = Math.sin(view.yaw),
    fz = Math.cos(view.yaw);
  const x = Math.round(player.pos.x + fx * 3.5),
    z = Math.round(player.pos.z + fz * 3.5);
  const column = useWorld.getState().blocks.filter((b) => b.x === x && b.z === z);
  const y = column.length ? Math.max(...column.map((b) => b.y)) + 1 : 0.5;
  tryPlace(x, y, z);
}
/** Choose the next or previous token for the block in hand. */
export const cycleToken = (step: number) => {
  const s = useWorld.getState();
  s.setBlockToken((s.blockToken + step + vocab.length) % vocab.length);
};
export function removeLastBlock() {
  const last = useWorld.getState().blocks.at(-1);
  if (last) useWorld.getState().removeBlock(last.id);
}

/* ------------------------------------------------------------ scanning -- */
const landmarkText: Record<RegionId, [string, string]> = {
  dermaga: ["Mercusuar Dermaga", "Oracle di tengah dermaga adalah model mini sungguhan: 2 lapisan, 2 kepala attention, lebar 32, total 20.256 angka."],
  belajar: ["Pohon Pengetahuan", "Model tumbuh dari data seperti pohon dari tanah. GPT-3 membaca 300 miliar token sebelum bisa menulis satu kalimat."],
  optimasi: ["Tungku Gradien", "Di sini bobot ditempa: setiap langkah latihan sedikit menurunkan loss. Melatih GPT-3 butuh sekitar 3,14 × 10²³ operasi."],
  berjalan: ["Menara Inferensi", "Setelah latihan, bobot membeku. Setiap token jawaban adalah satu putaran melewati 96 lapisan GPT-3."],
  observatorium: ["Teleskop Observatorium", "Dari sini skala terlihat: GPT-3 berisi 175 miliar angka, sekitar 8,6 juta kali model mini."],
};
function scanStation(id: StationId, point: [number, number, number]) {
  const s = stationById[id];
  const region = regionById[s.region];
  const done = useWorld.getState().done;
  const count = s.challenges.filter((c) => done.has(`${id}.${c.id}`)).length;
  useWorld.getState().setScan(
    {
      title: `${s.name} · ${region.phase}`,
      text: `${s.hook}${s.part ? ` Di GPT-3: ${s.part.gpt3}.` : ""} Status: ${isStationDone(done, id) ? "selesai" : `${count}/${s.challenges.length} temuan`}.`,
      point,
    },
    id,
  );
}
export function scanObject(object: THREE.Object3D, point: THREE.Vector3) {
  const s = useWorld.getState();
  const at: [number, number, number] = [point.x, point.y, point.z];
  let o: THREE.Object3D | null = object;
  while (o) {
    const n = o.name;
    if (n.startsWith("station-")) return scanStation(n.slice(8) as StationId, at);
    if (n.startsWith("keeper-")) {
      const r = regionById[n.slice(7) as RegionId];
      return s.setScan({ title: `${r.keeper.name} · penjaga ${r.name}`, text: r.keeper.lines[0], point: at });
    }
    if (n.startsWith("landmark-")) {
      const [title, text] = landmarkText[n.slice(9) as RegionId];
      return s.setScan({ title, text, point: at });
    }
    if (n.startsWith("gate-")) {
      const r = regionById[n.slice(5) as RegionId];
      return s.setScan({ title: `Gerbang ${r.name}`, text: `Terkunci. Selesaikan semua misi di bab sebelumnya untuk membuka ${r.phase.toLowerCase()}.`, point: at });
    }
    if (n.startsWith("blok-")) {
      const b = s.blocks.find((x) => x.id === Number(n.slice(5)));
      if (b) {
        const near = neighbors(b.token, 2).map((x) => show(vocab[x.id])).join(", ");
        return s.setScan({ title: `Balok token ${show(vocab[b.token])} · nomor ${b.token}`, text: `Bagi model, token ini adalah 32 angka. Tetangga terdekatnya di ruang makna: ${near}.`, point: at });
      }
    }
    if (n === "nara") return s.setScan({ title: "Nara · drone pendamping", text: "Melayang dengan cahaya, tanpa baling-baling. Tekan H kapan saja dan Nara akan menunjukkan apa yang harus dilakukan.", point: at });
    if (n.startsWith("ground-")) {
      const r = regionById[n.slice(7) as RegionId];
      return s.setScan({ title: `${r.name} · ${r.phase}`, text: r.keeper.lines[0], point: at });
    }
    o = o.parent;
  }
}
/** Fallback for keyboards and touch: scan whatever is closest. */
export function scanNearest() {
  const s = useWorld.getState();
  const at: [number, number, number] = [player.pos.x, 1.5, player.pos.z];
  if (s.near) return scanStation(s.near, [poses[s.near].x, 2, poses[s.near].z]);
  const r = regionAt(player.pos.x, player.pos.z);
  if (r) {
    const [title, text] = landmarkText[r];
    return s.setScan({ title, text, point: at });
  }
  s.setScan({ title: "Jembatan", text: "Setiap jembatan menghubungkan satu fase hidup LLM dengan fase berikutnya.", point: at });
}

/* ------------------------------------------------------------ dispatch -- */
const named = (o: THREE.Object3D | null, prefix: string) => {
  while (o) {
    if (o.name.startsWith(prefix)) return o;
    o = o.parent;
  }
  return null;
};
/** Wraps the world: scanner and block clicks land here unless a machine took them. */
export function Interact({ children }: { children: ReactNode }) {
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    const s = useWorld.getState();
    if (s.tool === "pemindai") {
      e.stopPropagation();
      scanObject(e.object, e.point);
      return;
    }
    if (s.tool !== "balok") return;
    e.stopPropagation();
    if (e.shiftKey) return remove(e);
    const block = named(e.object, "blok-");
    if (block && e.face) {
      const n = e.face.normal;
      tryPlace(Math.round(block.position.x + n.x), block.position.y + Math.round(n.y), Math.round(block.position.z + n.z));
    } else if (named(e.object, "ground-")) tryPlace(Math.round(e.point.x), 0.5, Math.round(e.point.z));
  };
  const remove = (e: ThreeEvent<MouseEvent>) => {
    const block = named(e.object, "blok-");
    if (!block) return;
    e.stopPropagation();
    useWorld.getState().removeBlock(Number(block.name.slice(5)));
  };
  return (
    <group
      onClick={onClick}
      onContextMenu={(e) => {
        if (useWorld.getState().tool === "balok") remove(e);
      }}
    >
      {children}
    </group>
  );
}

/** A beam from the walker to whatever was just scanned. */
export function ScanBeam() {
  const scan = useWorld((s) => s.scan);
  const ref = useRef<THREE.Group>(null);
  const born = useRef(0);
  const last = useRef(0);
  useFrame(({ clock, camera }) => {
    const g = ref.current;
    if (!g || !scan) return;
    if (scan.n !== last.current) {
      last.current = scan.n;
      born.current = clock.elapsedTime;
    }
    const age = clock.elapsedTime - born.current;
    g.visible = age < 0.9;
    if (!g.visible) return;
    const from = new THREE.Vector3(player.pos.x, 1.3 + player.y, player.pos.z);
    if (useWorld.getState().view === "fp") from.copy(camera.position).add(new THREE.Vector3(0, -0.3, 0));
    const to = new THREE.Vector3(...scan.point);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const len = from.distanceTo(to);
    const beam = g.children[0] as THREE.Mesh;
    beam.position.copy(mid);
    beam.scale.set(1, len, 1);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    const ring = g.children[1] as THREE.Mesh;
    ring.position.copy(to);
    ring.scale.setScalar(0.3 + age * 2.5);
    (ring.material as THREE.MeshBasicMaterial).opacity = 1 - age / 0.9;
    (beam.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - age / 0.9);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh>
        <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
        <meshBasicMaterial color="#9ff5e4" transparent toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.5, 0.03, 8, 40]} />
        <meshBasicMaterial color="#9ff5e4" transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The region under the walker's feet counts towards the explorer achievement. */
export function IslandTracker() {
  const tick = useRef(0);
  useFrame((_, dt) => {
    tick.current += dt;
    if (tick.current < 0.5) return;
    tick.current = 0;
    const r = regionAt(player.pos.x, player.pos.z);
    if (r && useWorld.getState().started) useWorld.getState().stepOn(r);
  });
  return null;
}
