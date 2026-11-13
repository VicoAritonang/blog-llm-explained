import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Block, Clickable, Label, Pulse, PushButton, Slide, fmtPct } from "../kit";
import { EOS, noteAnswer, nextToken, promptTokens, show, vocab } from "../model";
import { useDone, useFocused, useWorld } from "../store";

const ID = "peluang" as const;
const R = 3.7;
const N = vocab.length;
const angleOf = (i: number) => (i / N) * Math.PI * 2;
const temps = [0, 1, 2, 3.5, 5];

interface Local {
  temperature: number;
  generated: number[];
  spin: { from: number; to: number; t0: number; token: number; top: number } | null;
  ball: number;
}
const useLocal = create<Local>(() => ({ temperature: 1, generated: [], spin: null, ball: 0 }));

let promptIds: number[] = [];
const context = () => [...promptIds, ...useLocal.getState().generated];
const finished = () => useLocal.getState().generated.at(-1) === EOS;

export function setTemperature(t: number) {
  useLocal.setState({ temperature: Math.round(Math.max(0, Math.min(5, t)) * 10) / 10 });
}
export function cycleTemperature() {
  const t = useLocal.getState().temperature;
  setTemperature(temps.find((x) => x > t + 0.05) ?? 0);
}
export function write() {
  const s = useLocal.getState();
  if (s.spin) return;
  // The mini model holds 64 tokens; a long hot-temperature ramble starts over.
  if (finished() || context().length >= 60) return reset();
  const next = nextToken(context(), s.temperature, (Math.random() * 2 ** 31) | 0);
  const top = next.base.indexOf(Math.max(...next.base));
  const from = s.ball;
  const turns = Math.PI * 2 * 2;
  const delta = (((angleOf(next.selected) - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  useLocal.setState({ spin: { from, to: from + turns + delta, t0: performance.now(), token: next.selected, top } });
}
export function reset() {
  useLocal.setState({ generated: [], spin: null });
}
function commit() {
  const s = useLocal.getState();
  if (!s.spin) return;
  const { token, top, to } = s.spin;
  useLocal.setState({ generated: [...s.generated, token], spin: null, ball: to % (Math.PI * 2) });
  const { complete } = useWorld.getState();
  complete(ID, "first");
  if (token === EOS) complete(ID, "eos");
  if (token !== top) complete(ID, "hot");
}

function Pillar({ i, p, kept }: { i: number; p: number; kept: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const label = useRef<THREE.Group>(null);
  const a = angleOf(i);
  const target = 0.08 + p * 2.5;
  useFrame((_, dt) => {
    if (!mesh.current) return;
    const y = THREE.MathUtils.damp(mesh.current.scale.y, target, 7, dt);
    mesh.current.scale.y = y;
    mesh.current.position.y = 0.45 + y / 2;
    if (label.current) label.current.position.y = 0.45 + y + 0.3;
  });
  const color = i === EOS ? "#8aa3b8" : "#6fc3ff";
  return (
    <group position={[Math.sin(a) * R, 0, Math.cos(a) * R]}>
      <mesh ref={mesh}>
        <boxGeometry args={[0.38, 1, 0.38]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15 + p * 1.5} transparent opacity={kept ? 1 : 0.3} />
      </mesh>
      <group ref={label}>
        <Label text={show(vocab[i])} size={p > 0.1 ? 0.2 : 0.12} billboard color={p > 0.1 ? "#ffffff" : "#8fb2c2"} weight={p > 0.1 ? 800 : 600} />
        {p >= 0.01 && <Label text={fmtPct(p)} size={0.14} billboard position={[0, 0.25, 0]} color="#bfe6ff" weight={750} />}
      </group>
    </group>
  );
}

function Ball() {
  const ball = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = useLocal.getState();
    let a = s.ball;
    if (s.spin) {
      const t = Math.min(1, (performance.now() - s.spin.t0) / 1800);
      const ease = 1 - (1 - t) ** 3;
      a = s.spin.from + (s.spin.to - s.spin.from) * ease;
      if (t >= 1) commit();
    }
    if (ball.current) {
      ball.current.position.set(Math.sin(a) * (R + 0.75), 0.75, Math.cos(a) * (R + 0.75));
      ball.current.rotation.x += 0.2;
    }
  });
  return (
    <mesh ref={ball}>
      <sphereGeometry args={[0.24, 24, 16]} />
      <meshStandardMaterial color="#ffffff" emissive="#fff3b0" emissiveIntensity={1.2} toneMapped={false} />
    </mesh>
  );
}

function Dial() {
  const active = useFocused(ID);
  const t = useLocal((s) => s.temperature);
  const knob = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (knob.current) knob.current.rotation.y = THREE.MathUtils.damp(knob.current.rotation.y, -(t / 5) * Math.PI * 1.5 + Math.PI * 0.75, 8, dt);
  });
  return (
    <group position={[0, 0.45, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[1.25, 1.4, 0.6, 40]} />
        <meshStandardMaterial color="#20363f" />
      </mesh>
      <Clickable enabled={active} onTap={cycleTemperature} name="dial">
        <group ref={knob} position={[0, 0.75, 0]}>
          <mesh>
            <cylinderGeometry args={[0.8, 0.85, 0.35, 32]} />
            <meshStandardMaterial color={t >= 3 ? "#ff7a59" : t === 0 ? "#6fc3ff" : "#ffd166"} emissive={t >= 3 ? "#ff7a59" : t === 0 ? "#6fc3ff" : "#ffd166"} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 0.2, 0.55]}>
            <boxGeometry args={[0.12, 0.08, 0.5]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" />
          </mesh>
        </group>
      </Clickable>
      <Label text={`SUHU ${t.toFixed(1).replace(".", ",")}`} size={0.22} billboard position={[0, 1.55, 0]} weight={800} color={t >= 3 ? "#ffb39f" : "#eaf6f3"} />
    </group>
  );
}

function Output() {
  const generated = useLocal((s) => s.generated);
  const head = promptIds.slice(-2);
  let x = 0;
  const items = [...head.map((id) => ({ id, own: false })), ...generated.map((id) => ({ id, own: true }))].map((t, i) => {
    const label = show(vocab[t.id]);
    const w = 0.3 + label.length * 0.13;
    const at: THREE.Vector3Tuple = [x + w / 2, 0, 0];
    x += w + 0.08;
    return { ...t, label, w, at, i };
  });
  return (
    <group position={[-x / 2, 0.95, 4.9]}>
      {items.map((t) => (
        <Slide key={t.i} to={t.at} from={t.own ? [x / 2, 1.8, -4] : undefined}>
          <Block size={[t.w, 0.42, 0.24]} color={!t.own ? "#3d5560" : t.id === EOS ? "#8aa3b8" : "#6fc3ff"} text={t.label} textColor={t.own ? "#0d1b20" : "#d6e3e7"} textSize={0.19} />
        </Slide>
      ))}
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const note = useWorld((s) => s.note);
  promptIds = useMemo(() => promptTokens(noteAnswer(...note).prompt).map((t) => t.id), [note]);
  const { temperature, generated, spin } = useLocal();
  const dist = useMemo(() => nextToken([...promptIds, ...generated], temperature, 1), [note, generated, temperature]);
  const done = generated.at(-1) === EOS;
  const first = useDone(ID, "first"),
    eos = useDone(ID, "eos"),
    hot = useDone(ID, "hot");
  return (
    <group>
      <mesh position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R - 0.5, R + 1.05, 64]} />
        <meshStandardMaterial color="#173039" roughness={0.9} />
      </mesh>
      {vocab.map((_, i) => (
        <Pillar key={i} i={i} p={done ? 0 : dist.probabilities[i]} kept={dist.probabilities[i] > 0 || temperature === 0} />
      ))}
      <Ball />
      <Dial />
      <Output />
      <PushButton position={[3.6, 0.42, 5.2]} color={done ? "#8aa3b8" : "#6fc3ff"} label={done ? "ULANG" : "TULIS 1 TOKEN"} labelSize={0.17} onPress={write} enabled={active && !spin} radius={0.45} name="write" />
      {active && !first && <Pulse position={[3.6, 0.9, 5.2]} radius={0.55} />}
      {active && first && !eos && !spin && <Pulse position={[3.6, 0.9, 5.2]} radius={0.55} />}
      {active && eos && !hot && temperature < 3 && <Pulse position={[0, 1.6, 0]} radius={1.2} arrow={false} />}
      {active && eos && !hot && temperature >= 3 && !spin && <Pulse position={[3.6, 0.9, 5.2]} radius={0.55} />}
    </group>
  );
}

export function Controls() {
  const { temperature, generated, spin } = useLocal();
  const done = generated.at(-1) === EOS;
  return (
    <div className="w3-controls">
      <label className="w3-range">
        <span>
          Suhu <b>{temperature.toFixed(1).replace(".", ",")}</b>
        </span>
        <input type="range" min={0} max={5} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
      </label>
      <button type="button" className="w3-primary" onClick={write} disabled={!!spin}>
        {done ? "Ulang" : "Tulis 1 token"}
      </button>
      {generated.length > 0 && !done && (
        <button type="button" className="w3-chip" onClick={reset}>
          Hapus
        </button>
      )}
    </div>
  );
}
