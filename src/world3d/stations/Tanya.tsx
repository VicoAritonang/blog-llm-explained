import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Block, Clickable, DelayedSlide, Label, Pulse, PushButton } from "../kit";
import { answer, colors, noteAnswer, noteText, objects, paint, places, show, type Answer } from "../model";
import { useDone, useFocused, useWorld } from "../store";

const ID = "tanya" as const;
interface Local {
  result: (Answer & { heldOut: boolean; correct: boolean; n: number }) | null;
  colorsSeen: number[];
}
const useLocal = create<Local>(() => ({ result: null, colorsSeen: [] }));

const slots = [objects, places, colors] as readonly string[][];
const headers = ["BENDA", "TEMPAT", "WARNA"];

export function spin(slot: number) {
  const { note, setNote } = useWorld.getState();
  const next = [...note] as typeof note;
  next[slot] = (next[slot] + 1) % 4;
  setNote(next);
  useLocal.setState({ result: null });
}
export function ask() {
  const { note, complete } = useWorld.getState();
  const [o, p, c] = note;
  const { prompt, expected, heldOut } = noteAnswer(o, p, c);
  const result = answer(prompt);
  const correct = result.text === expected;
  const prev = useLocal.getState();
  const colorsSeen = prev.colorsSeen.includes(c) || !correct ? prev.colorsSeen : [...prev.colorsSeen, c];
  useLocal.setState({ result: { ...result, heldOut, correct, n: (prev.result?.n ?? 0) + 1 }, colorsSeen });
  complete(ID, "ask");
  if (colorsSeen.length >= 2) complete(ID, "color");
  if (heldOut && correct) complete(ID, "unseen");
}

function Drum({ slot, x }: { slot: number; x: number }) {
  const value = useWorld((s) => s.note[slot]);
  const active = useFocused(ID);
  const drum = useRef<THREE.Group>(null);
  const target = useRef(0);
  const last = useRef(value);
  if (last.current !== value) {
    last.current = value;
    target.current += Math.PI / 2;
  }
  useFrame((_, dt) => {
    if (drum.current) drum.current.rotation.x = THREE.MathUtils.damp(drum.current.rotation.x, target.current, 7, dt);
  });
  const word = slots[slot][value];
  const tint = slot === 2 ? paint[word] : slot === 0 ? "#7be0c3" : "#f2c46d";
  return (
    <group position={[x, 0, 0]}>
      <Label text={headers[slot]} size={0.18} position={[0, 2.75, 0.2]} color="#9fb7bd" weight={800} />
      <Clickable enabled={active} onTap={() => spin(slot)} name={`drum-${slot}`}>
        <group ref={drum} position={[0, 1.85, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.55, 0.55, 1.75, 4]} />
            <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.25} roughness={0.5} flatShading />
          </mesh>
          {[-0.92, 0.92].map((side) => (
            <mesh key={side} position={[side, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.62, 0.62, 0.08, 24]} />
              <meshStandardMaterial color="#25414a" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
        <Label text={word} size={word.length > 8 ? 0.18 : 0.26} position={[0, 1.85, 0.6]} color="#0d1b20" bg="#eaf6f3" weight={750} />
      </Clickable>
    </group>
  );
}

function Output() {
  const result = useLocal((s) => s.result);
  if (!result) return null;
  let x = -3.2;
  const blocks = result.tokens.map((t, i) => {
    const label = show(t.text);
    const w = 0.34 + label.length * 0.16;
    const at: [number, number, number] = [x + w / 2, 0, 0];
    x += w + 0.1;
    const isEos = t.text === "<eos>";
    return (
      <DelayedSlide key={`${result.n}-${i}`} delay={i * 0.32} to={at} from={[3.1, -2.2, 0.4]}>
        <Block size={[w, 0.5, 0.3]} color={isEos ? "#53656b" : "#7be0c3"} text={label} textColor={isEos ? "#eaf6f3" : "#0d1b20"} sub={`${Math.round(t.p * 100)}%`} />
      </DelayedSlide>
    );
  });
  const delay = result.tokens.length * 0.32;
  return (
    <group position={[0, 3.5, 0.9]}>
      {blocks}
      <DelayedSlide delay={delay} to={[0.4, 0.75, 0]}>
        <Label
          text={
            !result.correct
              ? "✗ tidak sesuai catatan"
              : result.heldOut
                ? "★ kombinasi ini TIDAK ADA di data latihan"
                : "✓ sesuai catatan · kombinasi ini ada di data latihan"
          }
          size={0.2}
          color={result.heldOut && result.correct ? "#ffd166" : result.correct ? "#9fe8d2" : "#ff9f9f"}
          weight={750}
        />
      </DelayedSlide>
    </group>
  );
}



export function Scene() {
  const active = useFocused(ID);
  const note = useWorld((s) => s.note);
  const asked = useDone(ID, "ask"),
    color = useDone(ID, "color"),
    unseen = useDone(ID, "unseen");
  const text = noteText(...note);
  return (
    <group>
      {/* console */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[8.2, 1.1, 2.2]} />
        <meshStandardMaterial color="#20363f" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <boxGeometry args={[8.3, 0.06, 2.3]} />
        <meshStandardMaterial color="#7be0c3" emissive="#7be0c3" emissiveIntensity={0.6} />
      </mesh>
      <group position={[-1.3, 0, -0.1]}>
        <Drum slot={0} x={-2.1} />
        <Drum slot={1} x={0} />
        <Drum slot={2} x={2.1} />
      </group>
      <PushButton position={[3.1, 1.5, 0.3]} color="#ff7a59" label="TANYA" onPress={ask} enabled={active} radius={0.6} labelSize={0.26} name="ask" />
      {/* note board */}
      <group position={[0, 5.1, -0.9]}>
        <mesh>
          <boxGeometry args={[8.6, 1.25, 0.12]} />
          <meshStandardMaterial color="#0f1d23" roughness={0.9} />
        </mesh>
        <Label text={`Catatan: ${text}.`} size={0.3} position={[-4.0, 0.22, 0.07]} anchor="left" weight={700} />
        <Label text={`Pertanyaan: Di mana ${objects[note[0]]}?   Jawaban:`} size={0.24} position={[-4.0, -0.26, 0.07]} anchor="left" color="#9fb7bd" />
      </group>
      <Output />
      {active && !asked && <Pulse position={[3.1, 1.9, 0.3]} />}
      {active && asked && !color && <Pulse position={[0.8, 2.6, 0.5]} radius={0.9} />}
      {active && asked && color && !unseen && <Pulse position={[-1.3, 2.6, 0.5]} radius={0.9} />}
    </group>
  );
}

export function Controls() {
  const note = useWorld((s) => s.note);
  return (
    <div className="w3-controls">
      {headers.map((h, i) => (
        <button key={h} type="button" className="w3-chip" onClick={() => spin(i)}>
          <small>{h.toLowerCase()}</small>
          {slots[i][note[i]]} <span aria-hidden="true">{"↻"}</span>
        </button>
      ))}
      <button type="button" className="w3-primary" onClick={ask}>
        Tanya
      </button>
    </div>
  );
}
