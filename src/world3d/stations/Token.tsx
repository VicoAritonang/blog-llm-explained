import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { Block, Clickable, Label, Pulse, PushButton, Slide } from "../kit";
import { category, categoryColor, noteAnswer, promptTokens, show } from "../model";
import { encode, mixes, probes, trainBPE } from "../../simulation/bpe.mjs";
import { useDone, useFocused, useWorld } from "../store";

const ID = "token" as const;
type Dict = "en" | "id";
const MAX = 200;
const merges: Record<Dict, { merged: string }[]> = { en: [], id: [] };
const getMerges = (d: Dict) => {
  if (!merges[d].length) merges[d] = trainBPE(mixes[d].corpus, MAX);
  return merges[d];
};
const encodeProbe = (d: Dict, steps: number): string[] => encode(probes.id, getMerges(d), steps);

interface Local {
  sliced: boolean;
  dict: Dict;
  steps: number;
  target: number;
  seen: Record<Dict, number | null>;
}
const useLocal = create<Local>(() => ({ sliced: false, dict: "en", steps: 0, target: 0, seen: { en: null, id: null } }));

export function toggleSlice() {
  useLocal.setState((s) => ({ sliced: !s.sliced }));
  useWorld.getState().complete(ID, "slice");
}
export function setDict(dict: Dict) {
  useLocal.setState({ dict });
  record();
}
export function setSteps(target: number) {
  useLocal.setState({ target: Math.max(0, Math.min(MAX, target)) });
}
function record() {
  const { dict, steps, seen } = useLocal.getState();
  const count = encodeProbe(dict, steps).length;
  const { complete } = useWorld.getState();
  if (count < 30) complete(ID, "merge");
  if (steps >= 150) {
    const next = { ...seen, [dict]: count };
    useLocal.setState({ seen: next });
    if (next.en !== null && next.id !== null) complete(ID, "language");
  }
}

/** Merges advance one by one so the chips visibly fuse. */
function Stepper() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    const { steps, target } = useLocal.getState();
    if (steps === target) return;
    acc.current += dt;
    if (acc.current < 0.03) return;
    acc.current = 0;
    const delta = Math.sign(target - steps) * Math.max(1, Math.round(Math.abs(target - steps) / 12));
    useLocal.setState({ steps: steps + delta });
    if (steps + delta === target) record();
  });
  return null;
}

const chipColors = ["#f2c46d", "#7be0c3", "#a99cf5", "#ff9f80", "#6fc3ff", "#c5e86c"];
function Screen() {
  const { dict, steps, seen } = useLocal();
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 560;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const pieces = encodeProbe(dict, steps);
  useEffect(() => {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0e1b21";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '700 40px "Source Sans 3 Variable", sans-serif';
    ctx.fillStyle = "#9fb7bd";
    ctx.textBaseline = "middle";
    ctx.fillText(`Kamus dilatih dari teks ${dict === "en" ? "INGGRIS" : "INDONESIA"} · ${steps} gabungan`, 40, 48);
    ctx.textAlign = "right";
    ctx.fillStyle = pieces.length < 30 ? "#7be0c3" : "#ffd166";
    ctx.font = '800 64px "Source Sans 3 Variable", sans-serif';
    ctx.fillText(`${pieces.length}`, canvas.width - 210, 52);
    ctx.font = '700 34px "Source Sans 3 Variable", sans-serif';
    ctx.fillStyle = "#9fb7bd";
    ctx.fillText("potongan", canvas.width - 40, 56);
    ctx.textAlign = "left";
    let x = 40,
      y = 140;
    ctx.font = '650 40px "Source Sans 3 Variable", sans-serif';
    pieces.forEach((piece, i) => {
      const label = piece.replace(/ /g, "·");
      const w = ctx.measureText(label).width + 22;
      if (x + w > canvas.width - 40) {
        x = 40;
        y += 72;
      }
      ctx.fillStyle = chipColors[i % chipColors.length];
      ctx.beginPath();
      ctx.roundRect(x, y - 28, w, 56, 10);
      ctx.fill();
      ctx.fillStyle = "#0d1b20";
      ctx.fillText(label, x + 11, y + 2);
      x += w + 8;
    });
    // comparison bars once both dictionaries were tried
    const bars = (["en", "id"] as Dict[]).filter((d) => seen[d] !== null);
    bars.forEach((d, i) => {
      const n = seen[d]!;
      const by = canvas.height - 70 + i * 34 - (bars.length - 1) * 17;
      ctx.fillStyle = "#9fb7bd";
      ctx.font = '700 26px "Source Sans 3 Variable", sans-serif';
      ctx.fillText(d === "en" ? "kamus Inggris" : "kamus Indonesia", 40, by);
      ctx.fillStyle = d === "en" ? "#ffd166" : "#7be0c3";
      ctx.fillRect(260, by - 11, n * 18, 22);
      ctx.fillStyle = "#eaf6f3";
      ctx.fillText(String(n), 270 + n * 18, by);
    });
    texture.needsUpdate = true;
  }, [canvas, texture, pieces, dict, steps, seen]);
  return (
    <mesh>
      <planeGeometry args={[8.4, 8.4 * (560 / 1600)]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Rack() {
  const note = useWorld((s) => s.note);
  const sliced = useLocal((s) => s.sliced);
  const tokens = useMemo(() => promptTokens(noteAnswer(...note).prompt), [note]);
  // break into display lines at newline tokens
  const lines: (typeof tokens)[] = [[]];
  tokens.forEach((t) => {
    if (t.text.startsWith("\n")) lines.push([]);
    lines.at(-1)!.push(t);
  });
  const gap = sliced ? 0.14 : 0;
  return (
    <group>
      {lines.map((line, row) => {
        const widths = line.map((t) => 0.2 + show(t.text).length * 0.115);
        const total = widths.reduce((a, b) => a + b, 0) + gap * (line.length - 1);
        let x = -total / 2;
        return line.map((t, i) => {
          const w = widths[i];
          const at: THREE.Vector3Tuple = [x + w / 2, 2.6 - row * 0.66, 0];
          x += w + gap;
          const color = sliced ? categoryColor[category(t.text)] : "#efe3c4";
          return (
            <Slide key={`${row}-${i}-${t.id}`} to={at} speed={6 + i * 0.4}>
              <Block size={[w, 0.46, 0.24]} color={color} emissive={sliced ? 0.3 : 0.08} text={sliced ? show(t.text) : t.text.replace("\n", "")} textSize={0.2} sub={sliced ? `#${t.id}` : undefined} />
            </Slide>
          );
        });
      })}
      <Label text={sliced ? `${tokens.length} token · model hanya melihat nomornya` : "satu catatan utuh"} size={0.2} position={[0, 0.95, 0.2]} color={sliced ? "#f2c46d" : "#9fb7bd"} weight={750} />
    </group>
  );
}

function Blade() {
  const sliced = useLocal((s) => s.sliced);
  const blade = useRef<THREE.Mesh>(null);
  const t = useRef(1);
  const last = useRef(sliced);
  if (last.current !== sliced) {
    last.current = sliced;
    t.current = 0;
  }
  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt * 1.6);
    if (blade.current) blade.current.position.y = 3.4 - Math.sin(t.current * Math.PI) * 2.6;
  });
  return (
    <mesh ref={blade} position={[0, 3.4, 0.25]}>
      <boxGeometry args={[7.6, 0.05, 0.5]} />
      <meshStandardMaterial color="#dfe9ec" emissive="#f2c46d" emissiveIntensity={0.6} metalness={0.9} roughness={0.2} />
    </mesh>
  );
}

function Lever() {
  const active = useFocused(ID);
  const sliced = useLocal((s) => s.sliced);
  const arm = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (arm.current) arm.current.rotation.x = THREE.MathUtils.damp(arm.current.rotation.x, sliced ? 0.9 : -0.5, 8, dt);
  });
  return (
    <group position={[4.6, 0.4, 0.4]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 1, 0.6]} />
        <meshStandardMaterial color="#25414a" />
      </mesh>
      <Clickable enabled={active} onTap={toggleSlice} name="lever">
        <group ref={arm} position={[0, 1, 0]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 1.4]} />
            <meshStandardMaterial color="#c9d6da" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <sphereGeometry args={[0.24, 24, 16]} />
            <meshStandardMaterial color="#f2c46d" emissive="#f2c46d" emissiveIntensity={0.5} />
          </mesh>
        </group>
      </Clickable>
      <Label text={sliced ? "SATUKAN" : "POTONG"} size={0.18} position={[0, 0.5, 0.32]} weight={800} />
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const dict = useLocal((s) => s.dict);
  const target = useLocal((s) => s.target);
  const sliced = useDone(ID, "slice"),
    merged = useDone(ID, "merge"),
    compared = useDone(ID, "language");
  return (
    <group>
      <Stepper />
      {/* rack frame */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[8.2, 0.7, 1.6]} />
        <meshStandardMaterial color="#20363f" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.95, -0.25]}>
        <boxGeometry args={[8, 2.1, 0.1]} />
        <meshStandardMaterial color="#13232a" roughness={0.9} />
      </mesh>
      {[-4, 4].map((x) => (
        <mesh key={x} position={[x, 2.2, 0]}>
          <boxGeometry args={[0.16, 2.8, 0.3]} />
          <meshStandardMaterial color="#f2c46d" emissive="#f2c46d" emissiveIntensity={0.25} />
        </mesh>
      ))}
      <Rack />
      <Blade />
      <Lever />
      {/* tokenizer training wall */}
      <group position={[0, 4.85, -1.4]}>
        <mesh position={[0, 0, -0.08]}>
          <boxGeometry args={[8.7, 3.3, 0.12]} />
          <meshStandardMaterial color="#20363f" />
        </mesh>
        <Screen />
      </group>
      <group position={[0, 0, 1.45]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[7.6, 0.3, 1.0]} />
          <meshStandardMaterial color="#25414a" />
        </mesh>
        <PushButton position={[-3.1, 0.62, 0]} radius={0.3} color={dict === "en" ? "#ffd166" : "#5b6d72"} label="INGGRIS" labelSize={0.15} enabled={active} onPress={() => setDict("en")} name="dict-en" />
        <PushButton position={[-1.9, 0.62, 0]} radius={0.3} color={dict === "id" ? "#7be0c3" : "#5b6d72"} label="INDONESIA" labelSize={0.15} enabled={active} onPress={() => setDict("id")} name="dict-id" />
        <PushButton position={[1.9, 0.62, 0]} radius={0.3} color="#f2c46d" label="+50 GABUNG" labelSize={0.15} enabled={active} onPress={() => setSteps(target + 50)} name="merge-more" />
        <PushButton position={[3.1, 0.62, 0]} radius={0.3} color="#8aa3b8" label="ULANG" labelSize={0.15} enabled={active} onPress={() => setSteps(0)} name="merge-reset" />
      </group>
      {active && !sliced && <Pulse position={[4.6, 3.0, 0.4]} radius={0.5} />}
      {active && sliced && !merged && <Pulse position={[dict === "en" && target >= MAX ? -1.9 : 1.9, 1.0, 1.45]} radius={0.45} />}
      {active && sliced && merged && !compared && <Pulse position={[dict === "en" ? -1.9 : -3.1, 1.0, 1.45]} radius={0.45} />}
    </group>
  );
}

export function Controls() {
  const { dict, target, sliced } = useLocal();
  return (
    <div className="w3-controls">
      <button type="button" className="w3-chip" onClick={toggleSlice}>
        {sliced ? "Satukan" : "Potong catatan"}
      </button>
      <div className="w3-seg" role="group" aria-label="Kamus tokenizer">
        <button type="button" aria-pressed={dict === "en"} onClick={() => setDict("en")}>
          Kamus Inggris
        </button>
        <button type="button" aria-pressed={dict === "id"} onClick={() => setDict("id")}>
          Kamus Indonesia
        </button>
      </div>
      <label className="w3-range">
        <span>
          Gabungan <b>{target}</b>
        </span>
        <input type="range" min={0} max={MAX} step={10} value={target} onChange={(e) => setSteps(Number(e.target.value))} />
      </label>
    </div>
  );
}
