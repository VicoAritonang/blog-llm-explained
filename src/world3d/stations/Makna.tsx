import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { create } from "zustand";
import { Clickable, Label, Pulse } from "../kit";
import { category, categoryColor, embedding3d, neighbors, show, vocab, type Category } from "../model";
import { useDone, useFocused, useWorld } from "../store";

const ID = "makna" as const;
const RADIUS = 3.3;
const CENTER: THREE.Vector3Tuple = [0, 3.6, 0];
const KUNCI = vocab.indexOf(" kunci");

interface Local {
  selected: number | null;
  revealed: Category[];
}
const useLocal = create<Local>(() => ({ selected: null, revealed: [] }));

export function select(id: number | null) {
  const { complete } = useWorld.getState();
  if (id === null) return useLocal.setState({ selected: null });
  const cat = category(vocab[id]);
  const revealed = useLocal.getState().revealed;
  const next = revealed.includes(cat) ? revealed : [...revealed, cat];
  useLocal.setState({ selected: id, revealed: next });
  complete(ID, "pick");
  if (id === KUNCI) complete(ID, "neighbors");
  if (["benda", "tempat", "warna"].every((c) => next.includes(c as Category))) complete(ID, "groups");
}

function Galaxy() {
  const active = useFocused(ID);
  const { selected, revealed } = useLocal();
  const spin = useRef<THREE.Group>(null);
  const points = useMemo(() => embedding3d().map(([x, y, z]) => [x * RADIUS, y * RADIUS, z * RADIUS] as THREE.Vector3Tuple), []);
  const near = useMemo(() => (selected === null ? [] : neighbors(selected, 3)), [selected]);
  useFrame((_, dt) => {
    if (spin.current && selected === null) spin.current.rotation.y += dt * 0.12;
  });
  return (
    <group ref={spin} position={CENTER}>
      {points.map((p, id) => {
        const cat = category(vocab[id]);
        const known = revealed.includes(cat);
        const isSel = id === selected;
        const isNear = near.some((n) => n.id === id);
        const color = known ? categoryColor[cat] : "#c7d3d8";
        const dim = selected !== null && !isSel && !isNear;
        return (
          <Clickable key={id} position={p} enabled={active} onTap={() => select(isSel ? null : id)} lift={1.5} name={`star-${id}`}>
            <mesh>
              <sphereGeometry args={[isSel ? 0.24 : 0.16, 20, 14]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isSel || isNear ? 1.2 : dim ? 0.1 : 0.45} transparent opacity={dim ? 0.35 : 1} />
            </mesh>
            <Label text={show(vocab[id])} size={isSel ? 0.22 : 0.15} billboard position={[0, 0.32, 0]} color={dim ? "#6d7f85" : "#eaf6f3"} weight={isSel ? 800 : 650} />
          </Clickable>
        );
      })}
      {selected !== null &&
        near.map((n) => {
          const a = points[selected],
            b = points[n.id];
          const mid: THREE.Vector3Tuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.15, (a[2] + b[2]) / 2];
          return (
            <group key={n.id}>
              <Line points={[a, b]} color="#fff3b0" lineWidth={2 + n.sim * 4} transparent opacity={0.9} />
              <Label text={`kemiripan ${n.sim.toFixed(2)}`} size={0.12} billboard position={mid} color="#fff3b0" weight={700} />
            </group>
          );
        })}
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const picked = useDone(ID, "pick");
  const revealed = useLocal((s) => s.revealed);
  const selected = useLocal((s) => s.selected);
  return (
    <group>
      {/* projector pedestal */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[1.2, 1.6, 1.0, 32]} />
        <meshStandardMaterial color="#20363f" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.06, 32]} />
        <meshStandardMaterial color="#a99cf5" emissive="#a99cf5" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <coneGeometry args={[3.2, 2.0, 40, 1, true]} />
        <meshBasicMaterial color="#a99cf5" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Galaxy />
      {/* legend appears as groups are discovered */}
      <group position={[-3.9, 1.2, 1.8]}>
        {(["benda", "tempat", "warna", "struktur"] as Category[]).map((c, i) => (
          <Label key={c} text={revealed.includes(c) ? `● ${c}` : "○ ???"} size={0.2} position={[0, 0.9 - i * 0.32, 0]} anchor="left" color={revealed.includes(c) ? categoryColor[c] : "#6d7f85"} weight={750} />
        ))}
      </group>
      {selected !== null && <Label text={`${show(vocab[selected])} = 32 angka · garis kuning = 3 tetangga terdekat`} size={0.18} position={[0, 0.75, 2.6]} color="#fff3b0" weight={700} />}
      {active && !picked && <Pulse position={[0, 1.5, 0]} radius={1.1} arrow={false} />}
    </group>
  );
}

export function Controls() {
  const { selected } = useLocal();
  const quick = [" kunci", " laci", " biru", " tas", " merah"].map((w) => vocab.indexOf(w));
  return (
    <div className="w3-controls">
      {quick.map((id) => (
        <button key={id} type="button" className="w3-chip" aria-pressed={selected === id} onClick={() => select(selected === id ? null : id)}>
          {show(vocab[id])}
        </button>
      ))}
      {selected !== null && (
        <p className="w3-readout">
          Tetangga: {neighbors(selected, 3).map((n) => `${show(vocab[n.id])} (${n.sim.toFixed(2)})`).join(", ")}
        </p>
      )}
    </div>
  );
}
