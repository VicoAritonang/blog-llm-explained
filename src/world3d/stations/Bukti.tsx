import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Block, Clickable, Label, Pulse, Slide } from "../kit";
import { answer, cases, retrieve } from "../model";
import { useDone, useFocused, useWorld } from "../store";

const ID = "bukti" as const;
type Tape = "missing" | "conflict" | "two";
const tapes: { id: Tape; label: string; color: string }[] = [
  { id: "missing", label: "Tanpa lokasi", color: "#ff7aa8" },
  { id: "conflict", label: "Dua catatan bertentangan", color: "#f2c46d" },
  { id: "two", label: "Dua benda", color: "#6fc3ff" },
];
const SLOT: THREE.Vector3Tuple = [0, 1.95, 0.55];

interface Local {
  inserted: Tape | null;
  retrieved: boolean;
}
const useLocal = create<Local>(() => ({ inserted: null, retrieved: false }));

export function insert(id: Tape) {
  useLocal.setState({ inserted: id, retrieved: false });
  const { complete } = useWorld.getState();
  if (id === "missing") complete(ID, "hallucinate");
  if (id === "two") complete(ID, "fail");
}
export function fetchArchive() {
  if (useLocal.getState().inserted !== "missing") return;
  useLocal.setState({ retrieved: true });
  useWorld.getState().complete(ID, "retrieve");
}

const noteLine = (prompt: string) => prompt.split("\n")[0];
function useRun() {
  const { inserted, retrieved } = useLocal();
  return useMemo(() => {
    if (!inserted) return null;
    const doc = retrieved ? retrieve("kunci cadangan")[0] : null;
    const c = doc ? cases.green : cases[inserted];
    const result = answer(c.prompt);
    const verdict = doc
      ? { text: `sumber: ${doc.title} ✓`, tone: "#7be0c3" }
      : inserted === "missing"
        ? { text: "lokasi di catatan: TIDAK ADA", tone: "#ff8f8f" }
        : inserted === "conflict"
          ? { text: "dua lokasi berbeda, tanpa keterangan mana yang benar", tone: "#ffd166" }
          : result.text === c.support
            ? { text: "sesuai catatan", tone: "#7be0c3" }
            : { text: `SALAH: catatan bilang “${c.support!.trim()}”`, tone: "#ff8f8f" };
    return { note: noteLine(c.prompt), result, verdict, doc };
  }, [inserted, retrieved]);
}

function Screen() {
  const run = useRun();
  return (
    <group position={[0, 3.75, -0.5]}>
      <mesh>
        <boxGeometry args={[6.4, 1.9, 0.14]} />
        <meshStandardMaterial color="#0f1d23" />
      </mesh>
      {!run ? (
        <Label text="masukkan kaset ke mesin" size={0.24} position={[0, 0, 0.08]} color="#6d7f85" weight={700} />
      ) : (
        <group position={[-2.95, 0, 0.08]}>
          <Label text={run.note} size={0.19} position={[0, 0.6, 0]} anchor="left" color="#c7d3d8" weight={650} />
          <Label text={`Jawaban:${run.result.text}`} size={0.3} position={[0, 0.12, 0]} anchor="left" weight={800} />
          <Label text={run.verdict.text} size={0.18} position={[0, -0.34, 0]} anchor="left" color={run.verdict.tone} weight={750} />
          {/* confidence meter */}
          <mesh position={[1.5, -0.72, 0]}>
            <planeGeometry args={[3, 0.16]} />
            <meshBasicMaterial color="#25414a" />
          </mesh>
          <mesh position={[run.result.confidence * 1.5, -0.72, 0.005]}>
            <planeGeometry args={[3 * run.result.confidence, 0.16]} />
            <meshBasicMaterial color={run.doc ? "#7be0c3" : "#ff7aa8"} toneMapped={false} />
          </mesh>
          <Label text={`model ${Math.round(run.result.confidence * 100)}% yakin`} size={0.16} position={[3.2, -0.72, 0]} anchor="left" color="#eaf6f3" weight={750} />
        </group>
      )}
    </group>
  );
}

function Tapes() {
  const active = useFocused(ID);
  const inserted = useLocal((s) => s.inserted);
  return (
    <group>
      <mesh position={[-4.0, 1.6, -0.2]}>
        <boxGeometry args={[1.9, 2.4, 0.5]} />
        <meshStandardMaterial color="#20363f" />
      </mesh>
      {tapes.map((t, i) => {
        const home: THREE.Vector3Tuple = [-4.0, 2.4 - i * 0.72, 0.15];
        const isIn = inserted === t.id;
        return (
          <Slide key={t.id} to={isIn ? SLOT : home} speed={6}>
            <Clickable enabled={active && !isIn} onTap={() => insert(t.id)} name={`tape-${t.id}`}>
              <Block size={[1.7, 0.5, 0.3]} color={t.color} text={t.label} textSize={t.label.length > 14 ? 0.12 : 0.17} />
            </Clickable>
          </Slide>
        );
      })}
      <Label text="KASET CATATAN" size={0.15} position={[-4.0, 3.05, 0.1]} color="#9fb7bd" weight={800} />
    </group>
  );
}

function Archive() {
  const active = useFocused(ID);
  const { inserted, retrieved } = useLocal();
  const drawer = useRef<THREE.Group>(null);
  const ready = inserted === "missing";
  useFrame((_, dt) => {
    if (drawer.current) drawer.current.position.z = THREE.MathUtils.damp(drawer.current.position.z, retrieved ? 0.7 : 0.26, 6, dt);
  });
  return (
    <group position={[4.0, 0, -0.2]}>
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[1.8, 2.3, 1.0]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
      </mesh>
      <Clickable enabled={active && ready && !retrieved} onTap={fetchArchive} name="archive">
        <group ref={drawer} position={[0, 1.3, 0.26]}>
          <mesh>
            <boxGeometry args={[1.5, 0.6, 0.6]} />
            <meshStandardMaterial color={ready ? "#8a6f52" : "#6b5843"} emissive={ready && !retrieved ? "#ffd166" : "#000"} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.31]}>
            <boxGeometry args={[0.4, 0.08, 0.04]} />
            <meshStandardMaterial color="#d8c39a" metalness={0.6} />
          </mesh>
        </group>
      </Clickable>
      <Label text="ARSIP" size={0.2} position={[0, 2.95, 0.1]} color="#e8d4b0" weight={800} />
      {retrieved && (
        <Slide to={[-3.6, 2.15, 0.9]} from={[0, 1.6, 0.8]} speed={3}>
          <mesh rotation={[-0.2, 0, 0.05]}>
            <boxGeometry args={[0.9, 0.04, 0.65]} />
            <meshStandardMaterial color="#f4efe2" emissive="#f4efe2" emissiveIntensity={0.3} />
          </mesh>
        </Slide>
      )}
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const inserted = useLocal((s) => s.inserted);
  const h = useDone(ID, "hallucinate"),
    fail = useDone(ID, "fail"),
    ret = useDone(ID, "retrieve");
  return (
    <group>
      {/* machine */}
      <mesh position={[0, 1.4, -0.2]}>
        <boxGeometry args={[3.4, 2.0, 1.5]} />
        <meshStandardMaterial color="#2b2433" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.95, 0.56]}>
        <boxGeometry args={[1.9, 0.18, 0.05]} />
        <meshStandardMaterial color="#0b0b10" />
      </mesh>
      <mesh position={[0, 2.42, -0.2]}>
        <boxGeometry args={[3.5, 0.06, 1.6]} />
        <meshStandardMaterial color="#ff7aa8" emissive="#ff7aa8" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 2.9, -0.5]}>
        <boxGeometry args={[0.3, 1.0, 0.3]} />
        <meshStandardMaterial color="#2b2433" />
      </mesh>
      <Screen />
      <Tapes />
      <Archive />
      {active && !h && <Pulse position={[-4.0, 2.75, 0.4]} radius={0.5} />}
      {active && h && !ret && inserted === "missing" && <Pulse position={[4.0, 1.75, 0.8]} radius={0.5} />}
      {active && h && ret && !fail && <Pulse position={[-4.0, 1.3, 0.4]} radius={0.5} />}
    </group>
  );
}

export function Controls() {
  const { inserted, retrieved } = useLocal();
  return (
    <div className="w3-controls">
      {tapes.map((t) => (
        <button key={t.id} type="button" className="w3-chip" aria-pressed={inserted === t.id} onClick={() => insert(t.id)}>
          Kaset: {t.label}
        </button>
      ))}
      <button type="button" className="w3-primary" onClick={fetchArchive} disabled={inserted !== "missing" || retrieved}>
        Ambil dari arsip
      </button>
    </div>
  );
}
