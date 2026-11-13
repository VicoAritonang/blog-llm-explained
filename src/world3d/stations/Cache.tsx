// KV cache with the engine's real incremental forward pass: the counters are
// the positions the model actually recomputed or reused at each step.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Block, Clickable, Label, Pulse, PushButton } from "../kit";
import { EOS, model, noteAnswer, promptTokens, show, vocab } from "../model";
import { forward, softmax } from "../../simulation/story/engine.mjs";
import { kvCacheBytes } from "../../simulation/gpt3.mjs";
import { useDone, useFocused, useWorld } from "../store";
import { getTextures } from "../textures";

const ID = "cache" as const;
const LAYERS = model.profile.layers as number;
const GPT3_TOKEN = kvCacheBytes({ layers: 96, headWidth: 128, kvHeads: 96, context: 1 });
const GPT3_FULL = kvCacheBytes({ layers: 96, headWidth: 128, kvHeads: 96, context: 2048 });

interface Step {
  token: number;
  computed: number;
  reused: number;
}
interface Local {
  on: boolean;
  steps: Step[];
  /** Total positions computed for a finished answer, per mode. */
  totals: { off: number | null; on: number | null };
  answers: { off: string | null; on: string | null };
  plaque: boolean;
}
const useLocal = create<Local>(() => ({ on: false, steps: [], totals: { off: null, on: null }, answers: { off: null, on: null }, plaque: false }));
// the engine's cache object lives outside React
let cache: unknown = null;

export function toggleCache() {
  cache = null;
  useLocal.setState((s) => ({ on: !s.on, steps: [] }));
}
export function writeToken() {
  const s = useLocal.getState();
  if (s.steps.at(-1)?.token === EOS) {
    cache = null;
    return useLocal.setState({ steps: [] });
  }
  const { prompt } = noteAnswer(...useWorld.getState().note);
  const ids = [...promptTokens(prompt).map((t) => t.id), ...s.steps.map((x) => x.token)];
  const trace = forward(ids, model, s.on && cache ? { cache } : {});
  if (s.on) cache = trace.cache;
  const probs = softmax(trace.lastLogits) as number[];
  const token = probs.indexOf(Math.max(...probs));
  const steps = [...s.steps, { token, computed: trace.computedPositions as number, reused: trace.reusedPositions as number }];
  useLocal.setState({ steps });
  if (token === EOS) {
    const mode = s.on ? "on" : "off";
    const total = steps.reduce((t, x) => t + x.computed, 0);
    const text = steps.filter((x) => x.token !== EOS).map((x) => vocab[x.token]).join("");
    useLocal.setState((st) => ({ totals: { ...st.totals, [mode]: total }, answers: { ...st.answers, [mode]: text } }));
    useWorld.getState().complete(ID, s.on ? "cache" : "nocache");
  }
}
export function readPlaque() {
  useLocal.setState({ plaque: true });
  useWorld.getState().complete(ID, "gpt3");
}

/** One shelf per layer; one Key/Value box per position. */
function Shelves() {
  const { steps, on } = useLocal();
  const note = useWorld((s) => s.note);
  const promptLen = promptTokens(noteAnswer(...note).prompt).length;
  // positions the last forward pass covered: the prompt plus tokens written before it
  const positions = promptLen + Math.max(0, steps.length - 1);
  const last = steps.at(-1);
  // boxes computed in the latest step flash orange; reused ones glow teal
  const freshFrom = last ? (on ? positions - last.computed / LAYERS : 0) : positions;
  const tex = getTextures();
  const w = 0.24,
    gap = 0.04;
  const total = positions * (w + gap);
  return (
    <group position={[0, 0, -0.8]}>
      {Array.from({ length: LAYERS }, (_, l) => (
        <group key={l} position={[0, 1.2 + l * 1.25, 0]}>
          <mesh position={[0, -0.18, 0]}>
            <boxGeometry args={[7.6, 0.08, 0.9]} />
            <meshStandardMaterial map={tex.metal} color="#8fa2b5" metalness={0.7} roughness={0.35} />
          </mesh>
          <Label text={`lapisan ${l + 1}`} size={0.15} position={[-4.2, 0.2, 0.3]} color="#9fb7bd" weight={750} anchor="right" />
          {Array.from({ length: positions }, (_, i) => {
            const fresh = i >= freshFrom;
            return (
              <group key={i} position={[-total / 2 + i * (w + gap) + w / 2, 0.15, 0]}>
                <mesh position={[0, 0.12, -0.15]}>
                  <boxGeometry args={[w, 0.22, 0.22]} />
                  <meshStandardMaterial color={fresh ? "#ff9f5a" : "#58e0d0"} emissive={fresh ? "#ff7a3d" : "#2bb3a3"} emissiveIntensity={fresh && last ? 1.6 : 0.4} toneMapped={!fresh} />
                </mesh>
                <mesh position={[0, 0.12, 0.15]}>
                  <boxGeometry args={[w, 0.22, 0.22]} />
                  <meshStandardMaterial color={fresh ? "#ffc27a" : "#9ff0e6"} emissive={fresh ? "#ff9f5a" : "#58e0d0"} emissiveIntensity={fresh && last ? 1.2 : 0.3} toneMapped={!fresh} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
      <Label text={"kotak depan = Value · kotak belakang = Key · oranye = dihitung langkah ini"} size={0.13} position={[0, 3.95, 0.3]} color="#e8f1ef" weight={700} />
    </group>
  );
}

function Switch() {
  const active = useFocused(ID);
  const on = useLocal((s) => s.on);
  const arm = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (arm.current) arm.current.rotation.z = THREE.MathUtils.damp(arm.current.rotation.z, on ? -0.7 : 0.7, 8, dt);
  });
  return (
    <group position={[-3.6, 0.42, 2.0]}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.3, 0.6, 0.8]} />
        <meshStandardMaterial color="#2a3340" />
      </mesh>
      <Clickable enabled={active} onTap={toggleCache} name="cache-switch">
        <group ref={arm} position={[0, 0.6, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 1]} />
            <meshStandardMaterial color="#d6dde2" metalness={0.8} />
          </mesh>
          <mesh position={[0, 1.05, 0]}>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshStandardMaterial color={on ? "#58e0d0" : "#ff7a59"} emissive={on ? "#58e0d0" : "#ff7a59"} emissiveIntensity={0.8} />
          </mesh>
        </group>
      </Clickable>
      <Label text={on ? "CACHE: NYALA" : "CACHE: MATI"} size={0.17} position={[0, 0.3, 0.42]} weight={850} color={on ? "#58e0d0" : "#ff9f80"} />
    </group>
  );
}

function Plaque() {
  const active = useFocused(ID);
  const open = useLocal((s) => s.plaque);
  const mb = (b: number) => (b / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const gb = (b: number) => (b / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return (
    <group position={[4.3, 0.42, 1.6]} rotation={[0, -0.35, 0]}>
      <Clickable enabled={active} onTap={readPlaque} name="gpt3-plaque">
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[1.8, 1.4, 0.12]} />
          <meshStandardMaterial color="#c9a46e" metalness={0.7} roughness={0.35} />
        </mesh>
        <Label text="RAK GPT-3" size={0.17} position={[0, 1.55, 0.07]} color="#2a1d10" weight={900} />
        {open ? (
          <>
            <Label text={`${mb(GPT3_TOKEN)} MB / token`} size={0.16} position={[0, 1.2, 0.07]} color="#2a1d10" weight={800} />
            <Label text={`2.048 token = ${gb(GPT3_FULL)} GB`} size={0.14} position={[0, 0.9, 0.07]} color="#2a1d10" weight={750} />
            <Label text={"96 lapisan · K+V · 12.288 · 2 byte"} size={0.1} position={[0, 0.62, 0.07]} color="#4a3520" weight={700} />
          </>
        ) : (
          <Label text="sentuh untuk membaca" size={0.13} position={[0, 1.0, 0.07]} color="#4a3520" weight={700} />
        )}
      </Clickable>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.15, 0.4, 0.15]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const { steps, on, totals, answers } = useLocal();
  const last = steps.at(-1);
  const finished = last?.token === EOS;
  const nc = useDone(ID, "nocache"),
    c = useDone(ID, "cache"),
    g = useDone(ID, "gpt3");
  const written = steps.filter((x) => x.token !== EOS);
  return (
    <group>
      <Shelves />
      <Switch />
      <Plaque />
      {/* the answer so far */}
      <group position={[0.4, 0.95, 2.4]}>
        {written.map((x, i) => (
          <Block key={i} size={[0.9, 0.36, 0.2]} position={[-1.6 + i * 1.0, 0, 0]} color="#58e0d0" text={show(vocab[x.token])} textSize={0.16} />
        ))}
      </group>
      <Label
        text={last ? `langkah ini: ${last.computed} posisi dihitung · ${last.reused} dipakai ulang` : "tekan TULIS untuk menulis jawaban"}
        size={0.17}
        position={[0.4, 1.55, 2.4]}
        color={last && last.reused ? "#58e0d0" : "#ffd8b0"}
        weight={800}
      />
      {(totals.off !== null || totals.on !== null) && (
        <Label
          text={`total satu jawaban · tanpa cache: ${totals.off ?? "?"} · dengan cache: ${totals.on ?? "?"}${answers.off && answers.on ? (answers.off === answers.on ? " · jawaban identik" : " · jawaban berbeda!") : ""}`}
          size={0.15}
          position={[0.4, 0.2, 3.3]}
          color="#ffd166"
          weight={800}
        />
      )}
      <PushButton position={[-1.6, 0.42, 3.2]} radius={0.4} color={finished ? "#8aa3b8" : "#58e0d0"} label={finished ? "ULANG" : "TULIS 1 TOKEN"} labelSize={0.14} enabled={active} onPress={writeToken} name="cache-write" />
      {active && !nc && (on ? <Pulse position={[-3.6, 2.0, 2.0]} radius={0.5} /> : <Pulse position={[-1.6, 0.9, 3.2]} radius={0.5} />)}
      {active && nc && !c && (!on ? <Pulse position={[-3.6, 2.0, 2.0]} radius={0.5} /> : <Pulse position={[-1.6, 0.9, 3.2]} radius={0.5} />)}
      {active && nc && c && !g && <Pulse position={[4.3, 2.2, 1.6]} radius={0.5} />}
    </group>
  );
}

export function Controls() {
  const { on, steps } = useLocal();
  const finished = steps.at(-1)?.token === EOS;
  return (
    <div className="w3-controls">
      <button type="button" className="w3-chip" aria-pressed={on} onClick={toggleCache}>
        Cache {on ? "nyala" : "mati"}
      </button>
      <button type="button" className="w3-primary" onClick={writeToken}>
        {finished ? "Ulang" : "Tulis 1 token"}
      </button>
      <button type="button" className="w3-chip" onClick={readPlaque}>
        Baca rak GPT-3
      </button>
    </div>
  );
}
