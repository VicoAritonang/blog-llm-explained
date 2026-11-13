import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Clickable, Label, Pulse, PushButton } from "../kit";
import { EOS, colors, noteAnswer, promptTokens, show, trace, vocab } from "../model";
import { softmax } from "../../simulation/story/engine.mjs";
import { useDone, useFocused, useWorld } from "../store";
import { getTextures } from "../textures";

const ID = "objektif" as const;

interface Local {
  open: number[];
  picked: number | null;
}
const useLocal = create<Local>(() => ({ open: [], picked: null }));

/** The training note, the loss the model pays at every position, and the answer span. */
function useSheet() {
  const note = useWorld((s) => s.note);
  return useMemo(() => {
    const { prompt, expected } = noteAnswer(...note);
    const promptLen = promptTokens(prompt).length;
    const ids = [...promptTokens(prompt + expected).map((t) => t.id), EOS];
    const logits: number[][] = trace(ids).logits;
    const loss = ids.map((id, i) => (i === 0 ? null : -Math.log(softmax(logits[i - 1])[id] as number)));
    let hardest = 1;
    loss.forEach((l, i) => {
      if (l !== null && l > (loss[hardest] ?? 0)) hardest = i;
    });
    const colorAt = ids.findIndex((id, i) => i >= promptLen && colors.includes(vocab[id].trim()));
    return { ids, loss, hardest, colorAt, promptLen, key: note.join("") };
  }, [note]);
}
let sheet: ReturnType<typeof useSheet> | null = null;

export function reveal(i: number) {
  const s = sheet;
  if (!s || i === 0) return;
  const { open } = useLocal.getState();
  useLocal.setState({ open: open.includes(i) ? open : [...open, i], picked: i });
  const { complete } = useWorld.getState();
  complete(ID, "guess");
  if (i === s.hardest) complete(ID, "hard");
  if (i === s.colorAt) complete(ID, "copy");
}
export function revealAll() {
  const s = sheet;
  if (!s) return;
  useLocal.setState({ open: s.ids.map((_, i) => i).slice(1) });
  useWorld.getState().complete(ID, "guess");
}
export function resetSheet() {
  useLocal.setState({ open: [], picked: null });
}

const lossColor = (l: number) => (l < 0.1 ? "#7be0c3" : l < 3 ? "#ffd166" : "#ff7a59");

function Belt() {
  const active = useFocused(ID);
  const s = useSheet();
  sheet = s;
  const { open, picked } = useLocal();
  // three display lines, broken at newline tokens
  const lines: number[][] = [[]];
  s.ids.forEach((id, i) => {
    if (vocab[id].startsWith("\n")) lines.push([]);
    lines.at(-1)!.push(i);
  });
  return (
    <group>
      {lines.map((line, row) => {
        const widths = line.map((i) => 0.24 + show(vocab[s.ids[i]]).length * 0.11);
        const total = widths.reduce((a, b) => a + b, 0) + 0.1 * (line.length - 1);
        let x = -total / 2;
        return line.map((i, k) => {
          const w = widths[k];
          const cx = x + w / 2;
          x += w + 0.1;
          const isOpen = open.includes(i) || i === 0;
          const l = s.loss[i];
          const answer = i >= s.promptLen;
          return (
            <group key={`${s.key}-${i}`} position={[cx, 2.9 - row * 1.15, 0]}>
              <Clickable enabled={active && i > 0} onTap={() => reveal(i)} name={`slot-${i}`}>
                <mesh>
                  <boxGeometry args={[w, 0.42, 0.26]} />
                  <meshStandardMaterial color={answer ? "#ffe3a3" : "#efe3c4"} emissive={picked === i ? "#ffffff" : "#000"} emissiveIntensity={0.25} />
                </mesh>
                {isOpen ? (
                  <Label text={show(vocab[s.ids[i]])} size={0.17} position={[0, 0, 0.14]} color="#0d1b20" weight={800} />
                ) : (
                  <Lid w={w} />
                )}
              </Clickable>
              {isOpen && l !== null && <LossBar loss={l} w={w} />}
            </group>
          );
        });
      })}
    </group>
  );
}

function Lid({ w }: { w: number }) {
  return (
    <group position={[0, 0, 0.14]}>
      <mesh>
        <boxGeometry args={[w + 0.04, 0.46, 0.04]} />
        <meshStandardMaterial color="#3d5560" roughness={0.6} />
      </mesh>
      <Label text="?" size={0.2} position={[0, 0, 0.03]} color="#ffd166" weight={900} />
    </group>
  );
}

/** A column under the token: how surprised the model was (cross-entropy). */
function LossBar({ loss, w }: { loss: number; w: number }) {
  const bar = useRef<THREE.Mesh>(null);
  const h = Math.min(0.62, 0.02 + loss * 0.045);
  useFrame((_, dt) => {
    if (bar.current) bar.current.scale.y = THREE.MathUtils.damp(bar.current.scale.y, 1, 6, dt);
  });
  return (
    <group position={[0, -0.25, 0.05]}>
      <mesh ref={bar} position={[0, -h / 2, 0]} scale={[1, 0.01, 1]}>
        <boxGeometry args={[Math.min(0.3, w * 0.6), h, 0.12]} />
        <meshStandardMaterial color={lossColor(loss)} emissive={lossColor(loss)} emissiveIntensity={0.6} />
      </mesh>
      <Label text={loss.toFixed(loss < 10 ? 1 : 0).replace(".", ",")} size={0.12} position={[0, -h - 0.12, 0.08]} color={lossColor(loss)} weight={800} />
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const tex = getTextures();
  const s = useSheet();
  const open = useLocal((st) => st.open);
  const guess = useDone(ID, "guess"),
    hard = useDone(ID, "hard"),
    copy = useDone(ID, "copy");
  const opened = s.loss.filter((l, i) => l !== null && open.includes(i)) as number[];
  const mean = opened.length ? opened.reduce((a, b) => a + b, 0) / opened.length : null;
  return (
    <group>
      {/* conveyor frame */}
      <mesh position={[0, 0.75, -0.3]}>
        <boxGeometry args={[9.4, 0.7, 1.4]} />
        <meshStandardMaterial map={tex.metal} normalMap={tex.metalNormal} color="#6d7f8a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.25, -0.25]}>
        <boxGeometry args={[9.6, 3.0, 0.12]} />
        <meshStandardMaterial color="#17262d" roughness={0.9} />
      </mesh>
      <Belt />
      <Label text="angka di bawah token = loss: seberapa terkejut model" size={0.17} position={[0, 4.1, 0]} color="#e8f1ef" weight={750} bg="rgba(10,24,30,0.8)" />
      {mean !== null && (
        <Label text={`rata-rata loss yang dibuka: ${mean.toFixed(2).replace(".", ",")} · 1 catatan = ${s.ids.length - 1} soal`} size={0.17} position={[0, 0.2, 1.1]} color="#ffd166" weight={750} />
      )}
      <PushButton position={[4.2, 0.42, 1.6]} radius={0.38} color="#ffd166" label="BUKA SEMUA" labelSize={0.14} enabled={active} onPress={revealAll} name="reveal-all" />
      <PushButton position={[3.1, 0.42, 1.8]} radius={0.24} color="#8aa3b8" label="TUTUP" labelSize={0.12} enabled={active} onPress={resetSheet} name="reveal-reset" />
      {active && !guess && <Pulse position={[0, 3.2, 0.4]} radius={0.5} />}
      {active && guess && !hard && <Pulse position={[4.2, 0.9, 1.6]} radius={0.45} />}
      {active && hard && !copy && <Pulse position={[0, 0.9, 0.6]} radius={0.5} arrow={false} />}
    </group>
  );
}

export function Controls() {
  const s = useSheet();
  sheet = s;
  return (
    <div className="w3-controls">
      <button type="button" className="w3-primary" onClick={revealAll}>
        Buka semua
      </button>
      <div className="w3-seg w3-seg-wrap" role="group" aria-label="Buka token per posisi">
        {s.ids.slice(1).map((id, k) => (
          <button key={k} type="button" onClick={() => reveal(k + 1)} aria-label={`Buka token posisi ${k + 1}${k + 1 >= s.promptLen ? " (jawaban)" : ""}`}>
            {k + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
