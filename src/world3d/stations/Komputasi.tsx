import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Clickable, Label, Pulse } from "../kit";
import { pfDays, trainingFlops } from "../../simulation/gpt3.mjs";
import { PARAMETERS, miniTrainingTokens, sci, words } from "../model";
import { useDone, useFocused, useWorld } from "../store";
import { getTextures } from "../textures";

const ID = "komputasi" as const;
const params = [PARAMETERS, 125e6, 1.3e9, 13e9, 175e9];
const paramNames = ["model mini", "GPT-3 Small", "GPT-3 XL", "GPT-3 13B", "GPT-3 175B"];
const tokens = [miniTrainingTokens(), 1e9, 30e9, 300e9];
const GPT3 = trainingFlops(175e9, 300e9);
const MINI = trainingFlops(PARAMETERS, miniTrainingTokens());

interface Local {
  n: number;
  d: number;
}
const useLocal = create<Local>(() => ({ n: 0, d: 0 }));

function after(n: number, d: number) {
  useLocal.setState({ n, d });
  const { complete, done } = useWorld.getState();
  complete(ID, "fire");
  if (n === params.length - 1 && d === tokens.length - 1) complete(ID, "gpt3");
  if (done.has(`${ID}.gpt3`) && n === 0 && d === 0) complete(ID, "compare");
}
export const cycleN = (step = 1) => after((useLocal.getState().n + step + params.length) % params.length, useLocal.getState().d);
export const cycleD = (step = 1) => after(useLocal.getState().n, (useLocal.getState().d + step + tokens.length) % tokens.length);
export const setBoth = (n: number, d: number) => after(n, d);

function Lever({ x, value, count, label, sub, onTap, name }: { x: number; value: number; count: number; label: string; sub: string; onTap: () => void; name: string }) {
  const active = useFocused(ID);
  const arm = useRef<THREE.Group>(null);
  const tex = getTextures();
  useFrame((_, dt) => {
    if (arm.current) arm.current.rotation.x = THREE.MathUtils.damp(arm.current.rotation.x, -0.9 + (value / (count - 1)) * 1.8, 7, dt);
  });
  return (
    <group position={[x, 0.42, 1.2]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.0, 0.9, 1.0]} />
        <meshStandardMaterial map={tex.metal} normalMap={tex.metalNormal} color="#59646e" metalness={0.7} roughness={0.35} />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[0.55, 0.3 + (i / (count - 1)) * 0.5, 0]}>
          <boxGeometry args={[0.06, 0.04, 0.3]} />
          <meshBasicMaterial color={i <= value ? "#ffb347" : "#3a4048"} toneMapped={false} />
        </mesh>
      ))}
      <Clickable enabled={active} onTap={onTap} name={name}>
        <group ref={arm} position={[0, 0.9, 0]}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.5]} />
            <meshStandardMaterial color="#d6dde2" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.26, 20, 14]} />
            <meshStandardMaterial color="#ff7a3d" emissive="#ff7a3d" emissiveIntensity={0.6} />
          </mesh>
        </group>
      </Clickable>
      <Label text={label} size={0.18} position={[0, 0.62, 0.52]} weight={850} bg="rgba(10,24,30,0.85)" />
      <Label text={sub} size={0.14} position={[0, 0.28, 0.52]} color="#ffd8b0" weight={750} bg="rgba(10,24,30,0.85)" />
    </group>
  );
}

function Furnace() {
  const { n, d } = useLocal();
  const flops = trainingFlops(params[n], tokens[d]);
  // flame size on a log scale between the mini model and GPT-3
  const level = THREE.MathUtils.clamp((Math.log10(flops) - Math.log10(MINI)) / (Math.log10(GPT3) - Math.log10(MINI)), 0, 1);
  const flame = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const tex = getTextures();
  useFrame(({ clock }, dt) => {
    const g = flame.current;
    if (!g) return;
    const s = THREE.MathUtils.damp(g.scale.x, 0.25 + level * 1.6, 3, dt);
    g.scale.set(s, s * (1 + Math.sin(clock.elapsedTime * 9) * 0.06), s);
    g.children.forEach((c, i) => (c.rotation.y = clock.elapsedTime * (0.8 + i * 0.4)));
    if (light.current) light.current.intensity = 10 + level * 90 + Math.sin(clock.elapsedTime * 13) * 5;
  });
  return (
    <group position={[0, 0, -0.6]}>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[2.0, 2.4, 2.6, 10]} />
        <meshStandardMaterial map={tex.rock} normalMap={tex.rockNormal} color="#7b6656" roughness={1} />
      </mesh>
      <mesh position={[0, 1.2, 1.9]}>
        <boxGeometry args={[1.4, 1.2, 0.5]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff7a3d" emissiveIntensity={0.6 + level * 3} toneMapped={false} />
      </mesh>
      <group ref={flame} position={[0, 2.6, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.9 + i * 0.25, 0]}>
            <coneGeometry args={[1.0 - i * 0.25, 2.2 - i * 0.4, 7]} />
            <meshStandardMaterial color={["#ff5a1f", "#ff9f3d", "#ffe08a"][i]} emissive={["#ff5a1f", "#ff9f3d", "#ffe08a"][i]} emissiveIntensity={2.4} transparent opacity={0.85 - i * 0.15} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 4, 1]} color="#ff8a3d" distance={18} />
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const { n, d } = useLocal();
  const flops = trainingFlops(params[n], tokens[d]);
  const fire = useDone(ID, "fire"),
    gpt3 = useDone(ID, "gpt3"),
    compare = useDone(ID, "compare");
  return (
    <group>
      <Furnace />
      <Lever x={-3.3} value={n} count={params.length} label="PARAMETER" sub={`${words(params[n])} · ${paramNames[n]}`} onTap={() => cycleN()} name="lever-params" />
      <Lever x={3.3} value={d} count={tokens.length} label="TOKEN LATIHAN" sub={`${words(tokens[d])} token`} onTap={() => cycleD()} name="lever-tokens" />
      {/* the reading board */}
      <group position={[0, 5.6, -1.2]}>
        <mesh>
          <boxGeometry args={[8.2, 1.9, 0.12]} />
          <meshStandardMaterial color="#14181c" />
        </mesh>
        <Label text={`6 × ${words(params[n])} × ${words(tokens[d])} =`} size={0.24} position={[0, 0.55, 0.07]} color="#ffd8b0" weight={750} />
        <Label text={`${sci(flops)} operasi`} size={0.46} position={[0, 0.0, 0.07]} weight={850} color="#ffffff" />
        <Label
          text={`≈ ${pfDays(flops) >= 1 ? Math.round(pfDays(flops)).toLocaleString("id-ID") : pfDays(flops).toExponential(1).replace(".", ",")} petaflop/s-hari · ${flops >= GPT3 * 0.99 ? "setara GPT-3 (paper: 3,14 × 10²³)" : `${sci(GPT3 / flops, 1)} kali lebih kecil dari GPT-3`}`}
          size={0.18}
          position={[0, -0.55, 0.07]}
          color={flops >= GPT3 * 0.99 ? "#ffd166" : "#c9d6da"}
          weight={750}
        />
      </group>
      {active && !fire && <Pulse position={[-3.3, 2.9, 1.2]} radius={0.5} />}
      {active && fire && !gpt3 && <Pulse position={[n < params.length - 1 ? -3.3 : 3.3, 2.9, 1.2]} radius={0.5} />}
      {active && gpt3 && !compare && <Pulse position={[n ? -3.3 : 3.3, 2.9, 1.2]} radius={0.5} />}
    </group>
  );
}

export function Controls() {
  const { n, d } = useLocal();
  return (
    <div className="w3-controls">
      <div className="w3-seg w3-seg-wrap" role="group" aria-label="Jumlah parameter">
        {params.map((p, i) => (
          <button key={i} type="button" aria-pressed={n === i} onClick={() => setBoth(i, d)}>
            {paramNames[i]}
          </button>
        ))}
      </div>
      <div className="w3-seg w3-seg-wrap" role="group" aria-label="Jumlah token latihan">
        {tokens.map((t, i) => (
          <button key={i} type="button" aria-pressed={d === i} onClick={() => setBoth(n, i)}>
            {words(t)} token
          </button>
        ))}
      </div>
    </div>
  );
}
