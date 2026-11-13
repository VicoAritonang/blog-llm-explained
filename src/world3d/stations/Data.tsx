import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Clickable, Label, Pulse } from "../kit";
import { datasetMix } from "../../simulation/gpt3.mjs";
import { TRAINING, averageNoteTokens, words } from "../model";
import { useDone, useFocused, useWorld } from "../store";
import { getTextures } from "../textures";

const ID = "data" as const;
interface Source {
  name: string;
  tokens: number;
  weight: number;
  epochs: number;
}
const mix = datasetMix as Source[];
const colors = ["#8fd46b", "#6fc3ff", "#f2c46d", "#ff9f80", "#c9b6ff"];
const MOST = mix.reduce((b, s, i) => (s.epochs > mix[b].epochs ? i : b), 0);

interface Local {
  loaded: number[];
  picked: number | null;
  mini: boolean;
}
const useLocal = create<Local>(() => ({ loaded: [], picked: null, mini: false }));

export function touch(i: number) {
  const { loaded } = useLocal.getState();
  const { complete } = useWorld.getState();
  if (!loaded.includes(i)) {
    const next = [...loaded, i];
    useLocal.setState({ loaded: next, picked: i });
    if (next.length === mix.length) complete(ID, "load");
    return;
  }
  useLocal.setState({ picked: i });
  if (loaded.length === mix.length && i === MOST) complete(ID, "repeat");
}
export function openMini() {
  useLocal.setState({ mini: true });
  useWorld.getState().complete(ID, "mini");
}

const side = (tokens: number) => 0.45 + Math.cbrt(tokens / 410e9) * 1.25;
const slots = mix.map((_, i) => [-4.6 + (i % 3) * 1.85, i < 3 ? 0.42 : 2.35] as const);

function Crate({ i }: { i: number }) {
  const active = useFocused(ID);
  const { loaded, picked } = useLocal();
  const s = mix[i];
  const tex = getTextures();
  const isIn = loaded.includes(i);
  const size = side(s.tokens);
  const [x, y] = slots[i];
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = isIn ? 0.35 + Math.sin(clock.elapsedTime * 3 + i) * 0.15 : 0.05;
  });
  return (
    <group position={[x, y, 0.2 * (i % 2)]}>
      <Clickable enabled={active} onTap={() => touch(i)} name={`crate-${i}`}>
        <mesh position={[0, size / 2, 0]}>
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial ref={glow} map={tex.planks} color={colors[i]} emissive={colors[i]} roughness={0.8} />
        </mesh>
        <Label text={s.name.replace(" (difilter)", "")} size={0.16} position={[0, size + 0.32, 0]} weight={800} bg="rgba(10,24,30,0.8)" />
        <Label text={`${words(s.tokens)} token`} size={0.13} position={[0, size + 0.08, 0]} color="#e8f1ef" weight={700} />
        {isIn && loaded.length === mix.length && (
          <Label text={`dibaca ${s.epochs.toLocaleString("id-ID")}×`} size={picked === i ? 0.22 : 0.16} position={[0, size / 2, size / 2 + 0.02]} color="#0d1b20" bg={picked === i ? "#ffd166" : "#e8f1ef"} weight={850} />
        )}
      </Clickable>
    </group>
  );
}

function Hopper() {
  const loaded = useLocal((s) => s.loaded);
  const tex = getTextures();
  const share = loaded.reduce((t, i) => t + mix[i].weight, 0);
  const fill = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (fill.current) fill.current.scale.y = THREE.MathUtils.damp(fill.current.scale.y, Math.max(0.02, Math.min(1, share)), 4, dt);
  });
  return (
    <group position={[2.9, 0, -0.2]}>
      <mesh position={[0, 4.1, 0]}>
        <cylinderGeometry args={[1.7, 0.45, 1.8, 24, 1, true]} />
        <meshStandardMaterial map={tex.metal} normalMap={tex.metalNormal} color="#b9c6cf" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2.6, 3.2, 2.0]} />
        <meshStandardMaterial map={tex.metal} normalMap={tex.metalNormal} color="#5d7280" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* gauge: share of the 300 B token budget */}
      <mesh position={[0, 1.6, 1.01]}>
        <planeGeometry args={[0.7, 2.4]} />
        <meshBasicMaterial color="#13232a" />
      </mesh>
      <mesh ref={fill} position={[0, 0.4, 1.02]} scale={[1, 0.02, 1]}>
        <planeGeometry args={[0.6, 2.4]} />
        <meshBasicMaterial color="#8fd46b" toneMapped={false} />
      </mesh>
      {/* the stacked mixture */}
      {loaded.map((i, k) => {
        const below = loaded.slice(0, k).reduce((t, j) => t + mix[j].weight, 0);
        return (
          <group key={i} position={[-1.05, 0.4 + (below + mix[i].weight / 2) * 2.4, 1.02]}>
            <mesh>
              <planeGeometry args={[0.35, Math.max(0.03, mix[i].weight * 2.4 - 0.02)]} />
              <meshBasicMaterial color={colors[i]} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      <Label text="CORONG LATIHAN" size={0.17} position={[0, 3.45, 1.02]} weight={850} />
      <Label text={`${Math.round(Math.min(1, share) * 100)}% dari 300 miliar token`} size={0.17} position={[0, -0.05, 1.3]} color="#e8f1ef" weight={750} />
      {loaded.map((i) => (
        <Stream key={i} from={[slots[i][0] - 2.9, slots[i][1] + 0.6, 0.4]} color={colors[i]} />
      ))}
    </group>
  );
}

/** Little token cubes flowing from a crate into the funnel. */
function Stream({ from, color }: { from: THREE.Vector3Tuple; color: string }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, k) => {
      const t = (clock.elapsedTime * 0.5 + k / g.children.length) % 1;
      c.position.set(from[0] * (1 - t), from[1] + (4.6 - from[1]) * t + Math.sin(t * Math.PI) * 1.2, from[2] * (1 - t));
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 5 }, (_, k) => (
        <mesh key={k}>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function MiniCrate() {
  const active = useFocused(ID);
  const open = useLocal((s) => s.mini);
  const tokens = TRAINING.trainExamples * averageNoteTokens();
  return (
    <group position={[0.4, 0.42, 2.6]}>
      <Clickable enabled={active} onTap={openMini} name="mini-crate" lift={1.3}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <meshStandardMaterial color="#7be0c3" emissive="#7be0c3" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 0.3, 0]} visible={false}>
          <sphereGeometry args={[0.5]} />
        </mesh>
      </Clickable>
      <Label text={open ? `model mini: ${TRAINING.trainExamples} catatan · ±${words(tokens)} token` : "peti model mini"} size={0.15} position={[0, 0.65, 0]} color="#bff5e6" weight={800} bg="rgba(10,24,30,0.8)" />
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const loaded = useLocal((s) => s.loaded);
  const tex = getTextures();
  const load = useDone(ID, "load"),
    repeat = useDone(ID, "repeat"),
    mini = useDone(ID, "mini");
  const next = mix.findIndex((_, i) => !loaded.includes(i));
  return (
    <group>
      {/* shelf */}
      <mesh position={[-2.75, 2.25, -0.3]}>
        <boxGeometry args={[5.9, 0.12, 1.6]} />
        <meshStandardMaterial map={tex.planks} color="#c9a46e" />
      </mesh>
      {[-5.6, 0.1].map((x) => (
        <mesh key={x} position={[x, 2.0, -0.3]}>
          <boxGeometry args={[0.15, 3.3, 1.6]} />
          <meshStandardMaterial map={tex.bark} color="#8a6a4a" />
        </mesh>
      ))}
      {mix.map((_, i) => (
        <Crate key={i} i={i} />
      ))}
      <Hopper />
      <MiniCrate />
      {active && !load && next >= 0 && <Pulse position={[slots[next][0], slots[next][1] + side(mix[next].tokens) + 0.9, 0.2 * (next % 2)]} radius={0.5} arrow />}
      {active && load && !repeat && <Pulse position={[0, 0.5, 1.6]} radius={0.6} arrow={false} />}
      {active && load && repeat && !mini && <Pulse position={[0.4, 0.5, 2.6]} radius={0.4} />}
    </group>
  );
}

export function Controls() {
  const { loaded } = useLocal();
  return (
    <div className="w3-controls">
      {mix.map((s, i) => (
        <button key={s.name} type="button" className="w3-chip" aria-pressed={loaded.includes(i)} onClick={() => touch(i)}>
          {s.name}
          {loaded.length === mix.length && <small>dibaca {s.epochs.toLocaleString("id-ID")}×</small>}
        </button>
      ))}
      <button type="button" className="w3-chip" onClick={openMini}>
        Peti model mini
      </button>
    </div>
  );
}
