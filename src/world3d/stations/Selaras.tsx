// Preference tuning, shown on three candidate answers. The starting scores are
// the mini model's real log-probabilities; the updates are a worked example
// and never touch the checkpoint.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Clickable, Label, Pulse, fmtPct } from "../kit";
import { EOS, cases, promptTokens, trace } from "../model";
import { softmax } from "../../simulation/story/engine.mjs";
import { useDone, useFocused, useWorld } from "../store";
import { getTextures } from "../textures";

const ID = "selaras" as const;
const candidates = [
  { text: " di laci kuning.", label: "di laci kuning.", color: "#ff7a59", note: "tebakan model" },
  { text: " tidak diketahui.", label: "tidak diketahui.", color: "#7be0c3", note: "jujur" },
  { text: " di tas merah.", label: "di tas merah.", color: "#f2c46d", note: "tebakan lain" },
];
const HONEST = 1;
const RATE = 9;
const pairs: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 2],
];

/** log P(answer | missing-location note) under the mini model. */
function logProb(answer: string) {
  const prompt = promptTokens(cases.missing.prompt).map((t) => t.id);
  const tail = [...promptTokens(answer).map((t) => t.id), EOS];
  const logits: number[][] = trace([...prompt, ...tail]).logits;
  return tail.reduce((s, id, k) => s + Math.log(softmax(logits[prompt.length + k - 1])[id] as number), 0);
}
let start: number[] | null = null;
const startScores = () => (start ??= candidates.map((c) => logProb(c.text)));

interface Local {
  scores: number[] | null;
  pair: number;
  votes: number;
}
const useLocal = create<Local>(() => ({ scores: null, pair: 0, votes: 0 }));
const scoresNow = () => useLocal.getState().scores ?? startScores();

export function vote(winner: number) {
  const { pair, votes } = useLocal.getState();
  const [a, b] = pairs[pair];
  const loser = winner === a ? b : a;
  const s = [...scoresNow()];
  // a DPO-style nudge: the further the loser leads, the bigger the push
  const margin = s[winner] - s[loser];
  const push = RATE * (1 - 1 / (1 + Math.exp(-margin)));
  s[winner] += push;
  s[loser] -= push;
  useLocal.setState({ scores: s, pair: (pair + 1) % pairs.length, votes: votes + 1 });
  const { complete } = useWorld.getState();
  complete(ID, "judge");
  if ((softmax(s) as number[])[HONEST] > 0.5) complete(ID, "honest");
}
export function resetVotes() {
  useLocal.setState({ scores: null, pair: 0, votes: 0 });
}

function Pillar({ i, p }: { i: number; p: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const target = 0.08 + p * 3.2;
  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    m.scale.y = THREE.MathUtils.damp(m.scale.y, target, 5, dt);
    m.position.y = 0.45 + m.scale.y / 2;
  });
  const c = candidates[i];
  return (
    <group position={[-3.4 + i * 1.2, 0, -1.4]}>
      <mesh ref={mesh}>
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.35} />
      </mesh>
      <Label text={fmtPct(p)} size={0.2} billboard position={[0, 0.45 + target + 0.35, 0]} weight={850} />
      <Label text={c.label} size={0.13} position={[0, 0.25, 0.42]} color="#e8f1ef" weight={750} bg="rgba(10,24,30,0.8)" />
    </group>
  );
}

function Podium({ slot, idx }: { slot: number; idx: number }) {
  const active = useFocused(ID);
  const c = candidates[idx];
  const tex = getTextures();
  return (
    <group position={[0.8 + slot * 2.9, 0, 0.8]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[1.1, 1.25, 1.2, 8]} />
        <meshStandardMaterial map={tex.tiles} color="#efe6d8" />
      </mesh>
      <mesh position={[0, 1.9, -0.6]}>
        <boxGeometry args={[2.4, 1.1, 0.1]} />
        <meshStandardMaterial color="#14181c" />
      </mesh>
      <Label text={`“Di mana kunci cadangan?”`} size={0.12} position={[0, 2.25, -0.54]} color="#9fb7bd" weight={700} />
      <Label text={c.label} size={0.24} position={[0, 1.9, -0.54]} weight={850} color={c.color} />
      <Clickable enabled={active} onTap={() => vote(idx)} name={`vote-${idx}`}>
        <mesh position={[0, 1.35, 0.1]}>
          <cylinderGeometry args={[0.42, 0.42, 0.2, 24]} />
          <meshStandardMaterial color="#7be0c3" emissive="#7be0c3" emissiveIntensity={0.6} />
        </mesh>
        <Label text="PILIH" size={0.14} position={[0, 1.47, 0.1]} rotation={[-Math.PI / 2, 0, 0]} color="#0d1b20" weight={900} />
      </Clickable>
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const { pair, votes } = useLocal();
  const scores = useLocal((s) => s.scores) ?? startScores();
  const p = softmax(scores) as number[];
  const judge = useDone(ID, "judge"),
    honest = useDone(ID, "honest");
  const [a, b] = pairs[pair];
  return (
    <group>
      <mesh position={[-2.2, 0.43, -1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, 1.6]} />
        <meshStandardMaterial color="#2a2530" />
      </mesh>
      {candidates.map((_, i) => (
        <Pillar key={i} i={i} p={p[i]} />
      ))}
      <Label text="peluang model untuk tiap jawaban" size={0.16} position={[-2.2, 4.4, -1.4]} color="#e8f1ef" weight={750} bg="rgba(10,24,30,0.8)" />
      <Label text={'Catatan: "kunci cadangan." (tanpa lokasi)'} size={0.16} position={[2.25, 3.2, 0.2]} color="#ffd1e0" weight={750} bg="rgba(10,24,30,0.8)" />
      <Podium slot={0} idx={a} />
      <Podium slot={1} idx={b} />
      <Label text={votes ? `${votes} pilihan juri` : "kamu juri: mana jawaban yang lebih baik?"} size={0.17} position={[2.25, 0.2, 2.6]} color="#ffd166" weight={800} />
      <Label text={"skor awal = log-peluang asli model mini · pembaruan adalah contoh hitung"} size={0.11} position={[-2.2, 0.2, 0.0]} color="#9fb7bd" weight={650} />
      {active && !judge && <Pulse position={[0.8 + (a === HONEST ? 0 : 2.9), 1.6, 0.9]} radius={0.5} />}
      {active && judge && !honest && <Pulse position={[0.8 + (a === HONEST ? 0 : b === HONEST ? 2.9 : 0), 1.6, 0.9]} radius={0.5} arrow={a === HONEST || b === HONEST} />}
    </group>
  );
}

export function Controls() {
  const { pair } = useLocal();
  const [a, b] = pairs[pair];
  return (
    <div className="w3-controls">
      {[a, b].map((i) => (
        <button key={i} type="button" className="w3-chip" onClick={() => vote(i)}>
          Pilih “{candidates[i].label}”
        </button>
      ))}
      <button type="button" className="w3-chip" onClick={resetVotes}>
        Ulang
      </button>
    </div>
  );
}
