import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Clickable, Label, Pulse, PushButton } from "../kit";
import { gpt3Models } from "../../simulation/gpt3.mjs";
import { PARAMETERS } from "../model";
import { useDone, useFocused, useWorld } from "../store";

const ID = "skala" as const;
// Footprint side grows with width and height with layers, so the tower's
// volume is proportional to its parameter count (about 12 · layers · width²).
const SIDE = 3.6 / 12288;
const LAYER = 0.075;
const MINI = { layers: 2, width: 32 };
interface Model {
  id: string;
  name: string;
  layers: number;
  width: number;
  appendix: number;
}
const models = gpt3Models as Model[];

interface Local {
  pick: number;
  lens: boolean;
}
const useLocal = create<Local>(() => ({ pick: 0, lens: false }));

export function choose(i: number) {
  useLocal.setState({ pick: i });
  if (models[i].id === "175b" || i === models.length - 1) useWorld.getState().complete(ID, "grow");
}
export function findMini() {
  useLocal.setState({ lens: true });
  useWorld.getState().complete(ID, "mini");
}

const words = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} miliar`
    : n >= 1e6
      ? `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} juta`
      : n.toLocaleString("id-ID");

function Tower() {
  const pick = useLocal((s) => s.pick);
  const m = models[pick];
  const shown = useRef(0);
  const group = useRef<THREE.Group>(null);
  const side = m.width * SIDE;
  useFrame((_, dt) => {
    shown.current = Math.min(m.layers, shown.current + dt * 40);
    if (shown.current > m.layers) shown.current = m.layers;
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, i) => (c.visible = i < shown.current));
  });
  const last = useRef(pick);
  if (last.current !== pick) {
    last.current = pick;
    shown.current = 0;
  }
  return (
    <group ref={group} position={[0, 0.45, -0.6]}>
      {Array.from({ length: m.layers }, (_, i) => (
        <mesh key={`${pick}-${i}`} position={[0, LAYER * (i + 0.5), 0]} visible={false}>
          <boxGeometry args={[side, LAYER * 0.82, side]} />
          <meshStandardMaterial color={i % 2 ? "#c5e86c" : "#9fd14f"} emissive="#c5e86c" emissiveIntensity={0.18 + (i / m.layers) * 0.3} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

function Mini() {
  const active = useFocused(ID);
  const lens = useLocal((s) => s.lens);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.15);
  });
  const side = MINI.width * SIDE;
  const at: THREE.Vector3Tuple = [2.7, 0.45, 1.4];
  return (
    <group position={at}>
      {/* the model itself, true to scale */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, LAYER * (i + 0.5), 0]}>
          <boxGeometry args={[side, LAYER * 0.82, side]} />
          <meshStandardMaterial color="#7be0c3" emissive="#7be0c3" emissiveIntensity={1} toneMapped={false} />
        </mesh>
      ))}
      <Clickable enabled={active} onTap={findMini} name="mini-model" lift={1.2}>
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.25, 0.4, 32]} />
          <meshBasicMaterial color="#7be0c3" transparent opacity={lens ? 0.5 : 0.9} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.45, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Clickable>
      {lens && (
        <group position={[0, 1.9, 0]}>
          <mesh>
            <sphereGeometry args={[0.9, 32, 24]} />
            <meshStandardMaterial color="#bff5e6" transparent opacity={0.12} roughness={0.05} metalness={0.2} depthWrite={false} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.9, 0.04, 8, 48]} />
            <meshStandardMaterial color="#c9d6da" metalness={0.8} />
          </mesh>
          {[0, 1].map((i) => (
            <mesh key={i} position={[0, (i - 0.5) * 0.36, 0]}>
              <boxGeometry args={[side * 60, LAYER * 0.82 * 60 * 0.5, side * 60]} />
              <meshStandardMaterial color="#7be0c3" emissive="#7be0c3" emissiveIntensity={0.6} />
            </mesh>
          ))}
          <Label text="model mini, diperbesar 60×" size={0.14} billboard position={[0, 1.15, 0]} color="#bff5e6" weight={750} />
        </group>
      )}
      <Label text={lens ? `${PARAMETERS.toLocaleString("id-ID")} angka · 2 lapisan · lebar 32` : "?"} size={lens ? 0.14 : 0.3} billboard position={[0, lens ? 0.55 : 0.75, 0]} color="#7be0c3" weight={800} />
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const pick = useLocal((s) => s.pick);
  const m = models[pick];
  const params = m.appendix * 1e6;
  const grow = useDone(ID, "grow"),
    mini = useDone(ID, "mini");
  return (
    <group>
      <Tower />
      <Mini />
      <group position={[0, 0, 0]}>
        <mesh position={[-2.75, 5.45, -0.75]}>
          <boxGeometry args={[4.1, 2.8, 0.1]} />
          <meshStandardMaterial color="#0f1d23" transparent opacity={0.88} />
        </mesh>
        <Label text={`GPT-3 ${m.name}`} size={0.32} position={[-4.6, 6.6, -0.6]} anchor="left" weight={800} color="#e6f7b8" />
        <Label text={`${words(params)} angka`} size={0.5} position={[-4.6, 5.9, -0.6]} anchor="left" weight={800} />
        <Label text={`${m.layers} lapisan · lebar ${m.width.toLocaleString("id-ID")}`} size={0.22} position={[-4.6, 5.3, -0.6]} anchor="left" color="#9fb7bd" weight={700} />
        <Label text={`≈ ${Math.round(params / PARAMETERS).toLocaleString("id-ID")} × model mini`} size={0.26} position={[-4.6, 4.8, -0.6]} anchor="left" color="#7be0c3" weight={800} />
        <Label text="volume menara sebanding dengan jumlah angka" size={0.15} position={[-4.6, 4.35, -0.6]} anchor="left" color="#6d8a90" weight={650} />
      </group>
      <group position={[0, 0.42, 3.6]}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[7.6, 0.3, 1.0]} />
          <meshStandardMaterial color="#20363f" />
        </mesh>
        {models.map((mm, i) => (
          <PushButton key={mm.id} position={[-3.15 + i * 0.9, 0.2, 0]} radius={0.27} color={i === pick ? "#c5e86c" : "#5b6d72"} label={mm.name} labelSize={0.13} enabled={active} onPress={() => choose(i)} name={`gpt3-${mm.id}`} />
        ))}
      </group>
      {active && !grow && <Pulse position={[3.15, 1.0, 3.6]} radius={0.38} />}
      {active && grow && !mini && <Pulse position={[2.7, 0.5, 1.4]} radius={0.6} />}
    </group>
  );
}

export function Controls() {
  const pick = useLocal((s) => s.pick);
  return (
    <div className="w3-controls">
      <div className="w3-seg w3-seg-wrap" role="group" aria-label="Ukuran GPT-3">
        {models.map((m, i) => (
          <button key={m.id} type="button" aria-pressed={pick === i} onClick={() => choose(i)}>
            {m.name}
          </button>
        ))}
      </div>
      <button type="button" className="w3-chip" onClick={findMini}>
        Cari model mini
      </button>
    </div>
  );
}
