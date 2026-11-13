import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import * as THREE from "three";
import { create } from "zustand";
import { Block, Clickable, Label, Pulse } from "../kit";
import { answer, colors, noteAnswer, paint, promptTokens, show, trace, vocab } from "../model";
import { useDone, useFocused, useWorld } from "../store";

const ID = "sorot" as const;
export const lampNames = ["Lapisan 1 · A", "Lapisan 1 · B", "Lapisan 2 · A", "Lapisan 2 · B"];
const lampColors = ["#6fc3ff", "#a99cf5", "#ff9f80", "#ffd166"];
const heads = ["0.0", "0.1", "1.0", "1.1"];

interface Local {
  query: number | null;
  lamp: number;
  muted: number[];
}
const useLocal = create<Local>(() => ({ query: null, lamp: 0, muted: [] }));

/** Prompt plus the model's own answer, and its attention maps. */
function useStage() {
  const note = useWorld((s) => s.note);
  return useMemo(() => {
    const { prompt, expected } = noteAnswer(...note);
    const ids = promptTokens(prompt).map((t) => t.id);
    const answerIds = promptTokens(expected).map((t) => t.id);
    const all = [...ids, ...answerIds];
    const t = trace(all);
    const maps: number[][][] = [0, 1].flatMap((l) => [0, 1].map((h) => t.blocks[l].heads[h].A));
    const colorIdx = ids.indexOf(vocab.indexOf(` ${colors[note[2]]}`));
    return { ids: all, promptLen: ids.length, maps, colorIdx, colorWord: colors[note[2]], prompt };
  }, [note]);
}
let stageCache: ReturnType<typeof useStage> | null = null;

function check() {
  const { query, lamp } = useLocal.getState();
  const s = stageCache;
  if (!s || query === null) return;
  const { complete } = useWorld.getState();
  complete(ID, "beam");
  if (query === s.promptLen + 1 && s.maps[lamp][query][s.colorIdx] > 0.5) complete(ID, "colorhead");
}
export function setQuery(q: number | null) {
  useLocal.setState({ query: q });
  check();
}
export function setLamp(lamp: number) {
  useLocal.setState({ lamp });
  check();
}
export function toggleMute(lamp: number) {
  const muted = useLocal.getState().muted;
  useLocal.setState({ muted: muted.includes(lamp) ? muted.filter((m) => m !== lamp) : [...muted, lamp] });
}
function useMutedAnswer(prompt: string) {
  const muted = useLocal((s) => s.muted);
  return useMemo(() => answer(prompt, { mutedHeads: muted.map((m) => heads[m]) }), [prompt, muted]);
}

const layout = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const t = -1.72 + (3.44 * i) / Math.max(1, n - 1);
    return [5.2 * Math.sin(t), 0.45, 1.3 - 3.4 * Math.cos(t)] as THREE.Vector3Tuple;
  });

function Pillars() {
  const active = useFocused(ID);
  const stage = useStage();
  stageCache = stage;
  const { query, lamp } = useLocal();
  const spots = useMemo(() => layout(stage.ids.length), [stage.ids.length]);
  const weights = query === null ? null : stage.maps[lamp][query];
  return (
    <group>
      {stage.ids.map((id, i) => {
        const isAnswer = i >= stage.promptLen;
        const future = query !== null && i > query;
        const w = weights && !future ? weights[i] : 0;
        const h = 0.7 + (isAnswer ? 0.25 : 0);
        const base = isAnswer ? "#ff9f80" : "#d9e4e8";
        const p = spots[i];
        return (
          <Clickable key={i} position={p} enabled={active} onTap={() => setQuery(query === i ? null : i)} name={`pillar-${i}`}>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[0.42, h, 0.42]} />
              <meshStandardMaterial
                color={i === query ? "#ffffff" : base}
                emissive={i === query ? "#ffffff" : w > 0.05 ? lampColors[lamp] : base}
                emissiveIntensity={i === query ? 0.8 : 0.15 + w * 1.6}
                transparent
                opacity={future ? 0.18 : 1}
              />
            </mesh>
            <Label text={show(vocab[id])} size={0.16} billboard position={[0, h + 0.28 + (i % 2) * 0.26, 0]} color={future ? "#4f6066" : isAnswer ? "#ffc7b5" : "#eaf6f3"} weight={700} />
            {w >= 0.05 && <Label text={`${Math.round(w * 100)}%`} size={0.14} billboard position={[0, -0.12, 0.35]} color={lampColors[lamp]} weight={800} />}
          </Clickable>
        );
      })}
      {weights &&
        query !== null &&
        weights.slice(0, query + 1).map((w, j) => {
          if (w < 0.02 || j === query) return null;
          const a = spots[query],
            b = spots[j];
          const top = (v: THREE.Vector3Tuple): THREE.Vector3Tuple => [v[0], v[1] + 1.05, v[2]];
          const dist = Math.hypot(a[0] - b[0], a[2] - b[2]);
          const mid: THREE.Vector3Tuple = [(a[0] + b[0]) / 2, 1.6 + dist * 0.35, (a[2] + b[2]) / 2];
          return <QuadraticBezierLine key={`${query}-${j}-${lamp}`} start={top(a)} end={top(b)} mid={mid} color={lampColors[lamp]} lineWidth={1 + w * 10} transparent opacity={0.25 + Math.min(0.75, w * 1.5)} />;
        })}
      {query !== null && (
        <Label
          text={query >= stage.promptLen ? `“${show(vocab[stage.ids[query]])}” sedang menebak token berikutnya` : `token “${show(vocab[stage.ids[query]])}” hanya bisa melihat ke belakang`}
          size={0.2}
          position={[0, 0.25, 2.9]}
          color="#ffe1d6"
          weight={750}
        />
      )}
    </group>
  );
}

function Lamp({ index }: { index: number }) {
  const active = useFocused(ID);
  const { lamp, muted } = useLocal();
  const off = muted.includes(index);
  const on = lamp === index && !off;
  const bulb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (bulb.current) (bulb.current.material as THREE.MeshStandardMaterial).emissiveIntensity = off ? 0 : on ? 2 + Math.sin(clock.elapsedTime * 5) * 0.3 : 0.5;
  });
  const color = lampColors[index];
  const x = -3 + index * 2;
  return (
    <group position={[x, 4.6, -1.2]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2]} />
        <meshStandardMaterial color="#8aa3b8" />
      </mesh>
      <Clickable enabled={active} onTap={() => setLamp(index)} name={`lamp-${index}`}>
        <mesh rotation={[0.35, 0, 0]}>
          <coneGeometry args={[0.45, 0.6, 24, 1, true]} />
          <meshStandardMaterial color={off ? "#3a2a2a" : "#2a3d45"} side={THREE.DoubleSide} metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh ref={bulb} position={[0, -0.18, 0.06]}>
          <sphereGeometry args={[0.2, 20, 14]} />
          <meshStandardMaterial color={off ? "#402020" : color} emissive={color} toneMapped={false} />
        </mesh>
        {on && (
          <mesh position={[0, -1.6, 0.6]} rotation={[0.35, 0, 0]}>
            <coneGeometry args={[1.2, 2.8, 24, 1, true]} />
            <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}
      </Clickable>
      <Label text={lampNames[index]} size={0.15} position={[0, 0.5, 0.2]} color={off ? "#ff8f8f" : color} weight={800} />
      {/* the plug */}
      <Clickable enabled={active} onTap={() => toggleMute(index)} position={[0, 1.15, 0.15]} name={`plug-${index}`} lift={1.25}>
        <mesh>
          <boxGeometry args={[0.36, 0.22, 0.2]} />
          <meshStandardMaterial color={off ? "#ff5a5a" : "#4fd17f"} emissive={off ? "#ff5a5a" : "#4fd17f"} emissiveIntensity={0.6} />
        </mesh>
        <Label text={off ? "TERCABUT" : "STEKER"} size={0.1} position={[0, 0.24, 0.02]} color="#eaf6f3" weight={800} />
      </Clickable>
    </group>
  );
}

function Verdict() {
  const stage = useStage();
  const muted = useLocal((s) => s.muted);
  const result = useMutedAnswer(stage.prompt);
  const color = result.tokens.find((t) => colors.includes(t.text.trim()))?.text.trim();
  const wrong = color !== stage.colorWord;
  const complete = useWorld((s) => s.complete);
  useEffect(() => {
    if (wrong && muted.length) complete(ID, "mute");
  }, [wrong, muted.length, complete]);
  return (
    <group position={[0, 0, 3.6]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[4.6, 0.7, 0.9]} />
        <meshStandardMaterial color="#20363f" />
      </mesh>
      <Label text={muted.length ? `jawaban tanpa ${muted.length} lampu:` : "jawaban model:"} size={0.15} position={[-2.1, 1.3, 0]} anchor="left" color="#9fb7bd" weight={700} />
      <Block size={[2.6, 0.45, 0.2]} position={[-0.6, 0.95, 0.3]} color={wrong ? "#ff5a5a" : "#7be0c3"} text={result.text.trim()} textSize={0.22} />
      {color && <mesh position={[1.25, 0.95, 0.3]}><sphereGeometry args={[0.2, 20, 14]} /><meshStandardMaterial color={paint[color]} emissive={paint[color]} emissiveIntensity={0.6} /></mesh>}
      <Label text={`${Math.round(result.confidence * 100)}% yakin`} size={0.15} position={[1.6, 0.95, 0.42]} anchor="left" color="#eaf6f3" weight={750} />
      {muted.length >= 2 && !wrong && stage.colorWord === "merah" && (
        <Label text="Tanpa lampu, tebakan bawaan model adalah merah. Ganti warna catatan." size={0.14} position={[0, 0.05, 0.5]} color="#ffd166" weight={700} />
      )}
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const stage = useStage();
  const { lamp, query } = useLocal();
  const beam = useDone(ID, "beam"),
    found = useDone(ID, "colorhead"),
    muted = useDone(ID, "mute");
  const spots = layout(stage.ids.length);
  const target = stage.promptLen + 1;
  return (
    <group>
      {/* stage floor */}
      <mesh position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.0, 48]} />
        <meshStandardMaterial color="#1c2f37" roughness={0.9} />
      </mesh>
      {/* gantry */}
      <mesh position={[0, 5.85, -1.2]}>
        <boxGeometry args={[8.4, 0.12, 0.2]} />
        <meshStandardMaterial color="#8aa3b8" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-4.2, 4.2].map((x) => (
        <mesh key={x} position={[x, 3.15, -1.2]}>
          <boxGeometry args={[0.16, 5.4, 0.16]} />
          <meshStandardMaterial color="#8aa3b8" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Lamp key={i} index={i} />
      ))}
      <Pillars />
      <Verdict />
      {active && !beam && <Pulse position={[spots[target][0], 0.5, spots[target][2]]} radius={0.5} />}
      {active && beam && !found && (query !== target ? <Pulse position={[spots[target][0], 0.5, spots[target][2]]} radius={0.5} /> : <Pulse position={[-3 + ((lamp + 1) % 4) * 2, 3.7, -1.2]} radius={0.5} arrow={false} />)}
      {active && found && !muted && <Pulse position={[-3 + lamp * 2, 5.0, -1.05]} radius={0.35} />}
    </group>
  );
}

export function Controls() {
  const { lamp, muted, query } = useLocal();
  const note = useWorld((s) => s.note);
  const setNote = useWorld((s) => s.setNote);
  const stage = useStage();
  stageCache = stage;
  return (
    <div className="w3-controls">
      <div className="w3-seg" role="group" aria-label="Pilih lampu attention">
        {lampNames.map((name, i) => (
          <button key={name} type="button" aria-pressed={lamp === i} onClick={() => setLamp(i)}>
            {name}
          </button>
        ))}
      </div>
      <div className="w3-seg" role="group" aria-label="Steker lampu">
        {lampNames.map((name, i) => (
          <button key={name} type="button" aria-pressed={muted.includes(i)} onClick={() => toggleMute(i)}>
            {muted.includes(i) ? "Pasang" : "Cabut"} {name.replace("Lapisan ", "L")}
          </button>
        ))}
      </div>
      {stage && (
        <button type="button" className="w3-chip" aria-pressed={query === stage.promptLen + 1} onClick={() => setQuery(stage.promptLen + 1)}>
          Sorot dari {show(vocab[stage.ids[stage.promptLen + 1]])} (jawaban)
        </button>
      )}
      <button type="button" className="w3-chip" onClick={() => setNote([note[0], note[1], (note[2] + 1) % 4])}>
        <small>warna catatan</small>
        {colors[note[2]]} {"↻"}
      </button>
    </div>
  );
}
