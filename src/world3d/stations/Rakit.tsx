// Finale: assemble GPT-3's two pipelines from the parts earned on the islands.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Block, Clickable, Label, Pulse } from "../kit";
import { isStationDone, parts, stationById } from "../content";
import { useDone, useFocused, useWorld } from "../store";
import { getTextures } from "../textures";

const ID = "rakit" as const;
type Row = "train" | "run";
export const order: Record<Row, string[]> = {
  train: ["korpus", "tokenizer", "objektif", "optimizer", "komputasi", "selaras"],
  run: ["konteks", "tokenizer", "embedding", "attention", "cache", "sampling"],
};
const partById = Object.fromEntries(parts.map((p) => [p.id, p]));
// a fixed, shuffled tray so the order is never given away
const tray = ["attention", "korpus", "sampling", "optimizer", "konteks", "embedding", "selaras", "tokenizer", "cache", "objektif", "komputasi"];

interface Local {
  placed: Record<Row, string[]>;
  wrong: { id: string; at: number } | null;
  mistakes: number;
}
const useLocal = create<Local>(() => ({ placed: { train: [], run: [] }, wrong: null, mistakes: 0 }));
const activeRow = (placed: Local["placed"]): Row | null =>
  placed.train.length < order.train.length ? "train" : placed.run.length < order.run.length ? "run" : null;

export function place(id: string) {
  const { placed } = useLocal.getState();
  const row = activeRow(placed);
  if (!row) return;
  const owned = isStationDone(useWorld.getState().done, partById[id].station);
  if (!owned) return;
  if (order[row][placed[row].length] !== id) {
    useLocal.setState((st) => ({ wrong: { id, at: performance.now() }, mistakes: st.mistakes + 1 }));
    return;
  }
  const next = { ...placed, [row]: [...placed[row], id] };
  useLocal.setState({ placed: next, wrong: null });
  const { complete } = useWorld.getState();
  if (next.train.length === order.train.length) complete(ID, "train");
  if (next.run.length === order.run.length) {
    complete(ID, "run");
    if (next.train.length === order.train.length && useLocal.getState().mistakes === 0) useWorld.getState().award("sempurna");
  }
}
export function resetBlueprint() {
  useLocal.setState({ placed: { train: [], run: [] }, wrong: null, mistakes: 0 });
}
/** Parts still in the tray: the tokenizer is needed by both rows. */
const inTray = (placed: Local["placed"]) =>
  tray.filter((id) => (id === "tokenizer" ? !(placed.train.includes(id) && placed.run.includes(id)) : !placed.train.includes(id) && !placed.run.includes(id)));

function Chip({ id, x, z }: { id: string; x: number; z: number }) {
  const active = useFocused(ID);
  const done = useWorld((s) => s.done);
  const wrong = useLocal((s) => s.wrong);
  const p = partById[id];
  const owned = isStationDone(done, p.station);
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const t = wrong?.id === id ? (performance.now() - wrong.at) / 1000 : 9;
    g.current.position.x = x + (t < 0.5 ? Math.sin(t * 50) * 0.08 * (1 - t * 2) : 0);
  });
  const color = stationById[p.station].color;
  return (
    <group ref={g} position={[x, 1.22, z]}>
      <Clickable enabled={active && owned} onTap={() => place(id)} name={`part-${id}`} lift={1.12}>
        <Block size={[1.55, 0.36, 0.5]} color={owned ? color : "#3d4a50"} text={owned ? p.name : "?"} textSize={p.name.length > 16 ? 0.11 : 0.14} emissive={owned ? 0.35 : 0} />
      </Clickable>
    </group>
  );
}

function RowSlots({ row, z, title }: { row: Row; z: number; title: string }) {
  const placed = useLocal((s) => s.placed[row]);
  const current = activeRow(useLocal.getState().placed);
  const n = order[row].length;
  const tex = getTextures();
  return (
    <group position={[0, 0, z]}>
      <Label text={title} size={0.2} position={[-5.4, 2.3, 0]} anchor="left" color={row === "train" ? "#ffb070" : "#6fc3ff"} weight={850} />
      {order[row].map((id, i) => {
        const x = -4.6 + i * 1.85;
        const filled = i < placed.length;
        const p = partById[id];
        const isNext = current === row && i === placed.length;
        return (
          <group key={i} position={[x, 1.55, 0]}>
            <mesh>
              <boxGeometry args={[1.7, 0.5, 0.6]} />
              <meshStandardMaterial map={tex.metal} color={filled ? stationById[p.station].color : isNext ? "#4a5a64" : "#2a3238"} emissive={filled ? stationById[p.station].color : "#000"} emissiveIntensity={filled ? 0.5 : 0} metalness={0.5} roughness={0.4} />
            </mesh>
            <Label text={filled ? p.name : `${i + 1}`} size={filled ? (p.name.length > 16 ? 0.11 : 0.14) : 0.2} position={[0, 0, 0.31]} color={filled ? "#0d1b20" : "#7d8c92"} weight={850} />
            {filled && <Label text={p.gpt3} size={0.1} position={[0, 0.45, 0.1]} color="#f4efe6" weight={700} bg="rgba(10,24,30,0.75)" />}
            {i < n - 1 && (
              <mesh position={[0.92, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[0.09, 0.18, 8]} />
                <meshBasicMaterial color={filled ? "#ffffff" : "#56656b"} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** GPT-3 as 96 thin layers. Trained: they light up. Running: a token climbs through them. */
function Hologram() {
  const placed = useLocal((s) => s.placed);
  const trained = placed.train.length === order.train.length,
    running = placed.run.length === order.run.length;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const color = useRef(new THREE.Color());
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    // the travelling token: one pass through all 96 layers every 2.4 s
    const at = ((t / 2.4) % 1) * 96;
    for (let i = 0; i < 96; i++) {
      const o = dummy.current;
      o.position.set(0, i * 0.045, 0);
      o.rotation.set(0, t * (running ? 0.6 : 0.15) + i * 0.012, 0);
      o.scale.setScalar(1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const glow = running ? Math.max(0, 1 - Math.abs(i - at) / 4) : 0;
      if (!trained) color.current.set("#4f6670");
      else color.current.set("#7fa04a").lerp(new THREE.Color("#e6fbff"), glow);
      m.setColorAt(i, color.current);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <group position={[0, 1.2, -3.4]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, 96]}>
        <boxGeometry args={[2.0, 0.022, 2.0]} />
        <meshBasicMaterial transparent opacity={trained ? 0.85 : 0.45} toneMapped={false} />
      </instancedMesh>
      <Label
        text={running ? "GPT-3 berjalan: satu token melewati 96 lapisan" : trained ? "175 miliar angka beku · siap dijalankan" : "cetak biru GPT-3 · 96 lapisan"}
        size={0.22}
        billboard
        position={[0, 5.2, 0]}
        color={running ? "#9fe8ff" : trained ? "#e6f7b8" : "#c9d6da"}
        weight={850}
        bg="rgba(10,24,30,0.8)"
      />
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const placed = useLocal((s) => s.placed);
  const wrong = useLocal((s) => s.wrong);
  const tex = getTextures();
  const trainDone = useDone(ID, "train"),
    runDone = useDone(ID, "run");
  const left = inTray(placed);
  const row = activeRow(placed);
  const nextId = row ? order[row][placed[row].length] : null;
  const nextAt = nextId ? left.indexOf(nextId) : -1;
  return (
    <group>
      {/* blueprint table */}
      <mesh position={[0, 0.7, 0.6]}>
        <boxGeometry args={[11.6, 0.6, 5.2]} />
        <meshStandardMaterial map={tex.planks} color="#9a7b58" />
      </mesh>
      <mesh position={[0, 1.01, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[11.2, 4.8]} />
        <meshStandardMaterial color="#1f4f7a" roughness={0.9} />
      </mesh>
      <RowSlots row="train" z={-0.6} title="JALUR LATIH (fase belajar + optimasi)" />
      <RowSlots row="run" z={0.7} title="JALUR JALAN (fase berjalan)" />
      {left.map((id, i) => (
        <Chip key={id} id={id} x={-4.7 + (i % 6) * 1.88} z={2.2 + Math.floor(i / 6) * 0.65} />
      ))}
      <Hologram />
      {wrong && (
        <Label text="Belum urutannya. Apa yang harus terjadi lebih dulu?" size={0.18} position={[0, 2.3, 3.6]} color="#ff9f80" weight={800} bg="rgba(10,24,30,0.85)" />
      )}
      {/* the correct part only lights up after a wrong try */}
      {active && wrong && !(trainDone && runDone) && nextAt >= 0 && <Pulse position={[-4.7 + (nextAt % 6) * 1.88, 1.3, 2.2 + Math.floor(nextAt / 6) * 0.65]} radius={0.55} arrow={false} />}
    </group>
  );
}

export function Controls() {
  const placed = useLocal((s) => s.placed);
  const done = useWorld((s) => s.done);
  return (
    <div className="w3-controls">
      <p className="w3-readout">
        Latih: {placed.train.map((id) => partById[id].name).join(" → ") || "kosong"}
        <br />
        Jalan: {placed.run.map((id) => partById[id].name).join(" → ") || "kosong"}
      </p>
      {inTray(placed).map((id) => (
        <button key={id} type="button" className="w3-chip" disabled={!isStationDone(done, partById[id].station)} onClick={() => place(id)}>
          {partById[id].name}
        </button>
      ))}
      <button type="button" className="w3-chip" onClick={resetBlueprint}>
        Ulang
      </button>
    </div>
  );
}
