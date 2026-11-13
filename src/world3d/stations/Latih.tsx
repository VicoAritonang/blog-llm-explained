import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { create } from "zustand";
import { Clickable, Label, Pulse, PushButton, fmtPct } from "../kit";
import { lossHistory, paint } from "../model";
import { softmax } from "../../simulation/story/engine.mjs";
import { useDone, useFocused, useWorld } from "../store";

const ID = "latih" as const;
const words = ["biru", "hijau", "merah"];
const CORRECT = 2;
const START = [2, 1, 0];
const RATE = 1.2;

// Loss valley: an elongated bowl, so large steps bounce across the narrow axis.
const f = (x: number, y: number) => 0.08 * x * x + 0.5 * y * y;
const grad = (x: number, y: number) => [0.16 * x, 1.0 * y];
const BALL0: [number, number] = [-4.5, 2.2];
const SCALE = 0.44;
// The valley is drawn over x ∈ [-5, 5], y ∈ [-3, 3].
const YMAX = 3;
const height = (x: number, y: number) => Math.min(f(x, y), 7) * 0.2;

interface Local {
  logits: number[];
  target: number | null;
  lastGrad: number[] | null;
  stepN: number;
  ball: [number, number];
  trail: [number, number][];
  rate: number;
  auto: boolean;
  flung: number | null;
}
const fresh = () => ({ ball: BALL0, trail: [BALL0], flung: null, auto: false });
const useLocal = create<Local>(() => ({ logits: START, target: null, lastGrad: null, stepN: 0, rate: 0.6, ...fresh() }));

export function pickTarget(i: number) {
  useLocal.setState({ target: i });
}
export function trainStep() {
  const { logits, target, stepN } = useLocal.getState();
  if (target === null) return;
  const p = softmax(logits);
  const g = p.map((v: number, i: number) => v - Number(i === target));
  const next = logits.map((z, i) => z - RATE * g[i]);
  useLocal.setState({ logits: next, lastGrad: g, stepN: stepN + 1 });
  if (target === CORRECT && softmax(next)[CORRECT] > 0.9) useWorld.getState().complete(ID, "nudge");
}
export function resetLogits() {
  useLocal.setState({ logits: START, lastGrad: null, stepN: 0 });
}
export function descend() {
  const { ball, trail, rate, flung } = useLocal.getState();
  if (flung !== null) return;
  const [gx, gy] = grad(...ball);
  const next: [number, number] = [ball[0] - rate * gx, ball[1] - rate * gy];
  const { complete } = useWorld.getState();
  if (Math.abs(next[0]) > 5.2 || Math.abs(next[1]) > YMAX + 0.2) {
    useLocal.setState({ flung: performance.now(), auto: false, ball: next });
    complete(ID, "overshoot");
    return;
  }
  useLocal.setState({ ball: next, trail: [...trail.slice(-60), next] });
  if (f(...next) < 0.05) {
    complete(ID, "valley");
    useLocal.setState({ auto: false });
  }
}
export function resetBall() {
  useLocal.setState(fresh());
}
export function setRate(rate: number) {
  useLocal.setState({ rate: Math.round(Math.max(0.1, Math.min(2.4, rate)) * 10) / 10 });
}
export function toggleAuto() {
  const s = useLocal.getState();
  if (s.flung !== null || f(...s.ball) < 0.05) resetBall();
  useLocal.setState((st) => ({ auto: !st.auto }));
}

function Logits() {
  const active = useFocused(ID);
  const { logits, target, lastGrad, stepN } = useLocal();
  const p = softmax(logits) as number[];
  const loss = target === null ? null : -Math.log(p[target]);
  return (
    <group position={[-3.0, 0, 0.6]}>
      <Label text={"“...ada di tas merah.”  Jawaban: di tas ___"} size={0.2} position={[0, 3.55, 0]} weight={700} />
      {words.map((w, i) => {
        const x = (i - 1) * 1.1;
        const h = 0.1 + p[i] * 2.6;
        const g = lastGrad?.[i] ?? 0;
        return (
          <group key={w} position={[x, 0.45, 0]}>
            <Clickable enabled={active} onTap={() => pickTarget(i)} name={`logit-${w}`}>
              <mesh position={[0, h / 2, 0]}>
                <boxGeometry args={[0.7, h, 0.7]} />
                <meshStandardMaterial color={paint[w]} emissive={paint[w]} emissiveIntensity={target === i ? 0.7 : 0.25} />
              </mesh>
              <Label text={w} size={0.2} position={[0, 0.2, 0.37]} color="#0d1b20" weight={800} />
            </Clickable>
            <Label text={fmtPct(p[i])} size={0.2} billboard position={[0, h + 0.3, 0]} weight={800} />
            {target === i && (
              <group position={[0.42, h + 0.55, 0]}>
                <mesh position={[0, 0.2, 0]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.8]} />
                  <meshStandardMaterial color="#eaf6f3" />
                </mesh>
                <mesh position={[0.18, 0.45, 0]}>
                  <boxGeometry args={[0.34, 0.22, 0.02]} />
                  <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={0.6} side={THREE.DoubleSide} />
                </mesh>
              </group>
            )}
            {lastGrad && Math.abs(g) > 0.02 && <GradArrow key={stepN} up={g < 0} size={Math.abs(g)} y={h + 0.95} />}
          </group>
        );
      })}
      <Label
        text={target === null ? "sentuh tiang jawaban yang benar" : loss! < 0.11 && target !== CORRECT ? `model kini yakin “${words[target]}”, padahal catatan bilang merah` : `loss = ${loss!.toFixed(2).replace(".", ",")}`}
        size={0.18}
        position={[0, 0.05, 0.9]}
        color={target !== null && target !== CORRECT && loss! < 0.11 ? "#ff9f9f" : "#ffe7a3"}
        weight={750}
      />
    </group>
  );
}

function GradArrow({ up, size, y }: { up: boolean; size: number; y: number }) {
  const ref = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    ref.current.position.y = y + (up ? 1 : -1) * t * 0.6;
    ref.current.visible = t < 1.1;
  });
  const s = 0.4 + size * 1.2;
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh rotation={[up ? 0 : Math.PI, 0, 0]} scale={[s, s, s]}>
        <coneGeometry args={[0.2, 0.4, 16]} />
        <meshBasicMaterial color={up ? "#7be0c3" : "#ff7a7a"} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Valley() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(10 * SCALE, 2 * YMAX * SCALE, 48, 30);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors: number[] = [];
    const low = new THREE.Color("#1d8f7f"),
      high = new THREE.Color("#ffb347"),
      c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / SCALE,
        y = pos.getZ(i) / SCALE;
      const h = height(x, y);
      pos.setY(i, h);
      c.copy(low).lerp(high, Math.sqrt(Math.min(1, h / 1.3)));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const { trail, auto } = useLocal();
  const ball = useRef<THREE.Mesh>(null);
  const acc = useRef(0);
  useFrame((_, dt) => {
    const s = useLocal.getState();
    if (s.auto) {
      acc.current += dt;
      if (acc.current > 0.22) {
        acc.current = 0;
        descend();
      }
    }
    const m = ball.current;
    if (!m) return;
    const [x, y] = s.ball;
    if (s.flung !== null) {
      const t = (performance.now() - s.flung) / 1000;
      m.position.set(Math.max(-6, Math.min(6, x)) * SCALE, 2 + t * 4, Math.max(-6, Math.min(6, y)) * SCALE);
      if (t > 1.6) resetBall();
      return;
    }
    const tx = x * SCALE,
      tz = y * SCALE,
      ty = height(x, y) + 0.2;
    m.position.x = THREE.MathUtils.damp(m.position.x, tx, 10, dt);
    m.position.z = THREE.MathUtils.damp(m.position.z, tz, 10, dt);
    m.position.y = THREE.MathUtils.damp(m.position.y, ty, 10, dt);
  });
  const line = trail.map(([x, y]) => [x * SCALE, height(x, y) + 0.06, y * SCALE] as THREE.Vector3Tuple);
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0.005, 0]}>
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.07} />
      </mesh>
      {line.length > 1 && <Line points={line} color="#fff3b0" lineWidth={2.5} />}
      <mesh ref={ball} position={[BALL0[0] * SCALE, height(...BALL0) + 0.2, BALL0[1] * SCALE]}>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#fff3b0" emissiveIntensity={auto ? 1.4 : 0.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.28, 32]} />
        <meshBasicMaterial color="#7be0c3" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Curve() {
  const pts = useMemo(() => {
    const maxStep = lossHistory.at(-1)!.step;
    const logs = lossHistory.map((h) => Math.log10(h.trainLoss));
    const lo = Math.min(...logs),
      hi = Math.max(...logs);
    return lossHistory.map((h, i) => [-3.2 + (h.step / maxStep) * 6.4, -0.75 + ((logs[i] - lo) / (hi - lo)) * 1.5, 0.08] as THREE.Vector3Tuple);
  }, []);
  const first = lossHistory[0].trainLoss,
    last = lossHistory.at(-1)!.trainLoss;
  return (
    <group position={[0, 4.7, -2.6]}>
      <mesh>
        <boxGeometry args={[7.4, 2.3, 0.1]} />
        <meshStandardMaterial color="#0f1d23" />
      </mesh>
      <Line points={pts} color="#ffd166" lineWidth={3} />
      <Label text={`Latihan model mini sungguhan: loss ${first.toFixed(2).replace(".", ",")} → ${last.toFixed(4).replace(".", ",")} dalam ${lossHistory.at(-1)!.step.toLocaleString("id-ID")} langkah`} size={0.17} position={[0, 0.95, 0.08]} color="#9fb7bd" weight={700} />
    </group>
  );
}

export function Scene() {
  const active = useFocused(ID);
  const { target, rate, auto } = useLocal();
  const nudge = useDone(ID, "nudge"),
    valley = useDone(ID, "valley"),
    over = useDone(ID, "overshoot");
  return (
    <group>
      <mesh position={[-3, 0.43, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.9, 6]} />
        <meshStandardMaterial color="#1c2f37" />
      </mesh>
      <Logits />
      <PushButton position={[-3.0, 0.42, 2.3]} color="#ffd166" label="LATIH 1 LANGKAH" labelSize={0.16} radius={0.42} enabled={active && target !== null} onPress={trainStep} name="train" />
      <PushButton position={[-4.5, 0.42, 2.3]} color="#8aa3b8" label="ULANG" labelSize={0.13} radius={0.26} enabled={active} onPress={resetLogits} name="train-reset" />
      <group position={[2.6, 0.45, 0.4]}>
        <Valley />
        <Label text="lembah loss" size={0.2} position={[0, 1.9, -1.7]} color="#9fb7bd" weight={750} />
      </group>
      <group position={[2.6, 0.42, 3.4]}>
        <PushButton position={[-0.9, 0, 0]} color={auto ? "#ff7a59" : "#7be0c3"} label={auto ? "BERHENTI" : "JALAN"} labelSize={0.14} radius={0.32} enabled={active} onPress={toggleAuto} name="descend-auto" />
        <PushButton position={[0.2, 0, 0]} color="#c5e86c" label="1 LANGKAH" labelSize={0.13} radius={0.28} enabled={active} onPress={descend} name="descend" />
        <PushButton position={[1.2, 0, -0.4]} color="#8aa3b8" label={"−"} labelSize={0.2} radius={0.2} enabled={active} onPress={() => setRate(rate - 0.3)} name="rate-down" />
        <PushButton position={[1.9, 0, -0.4]} color="#ff9f80" label="+" labelSize={0.2} radius={0.2} enabled={active} onPress={() => setRate(rate + 0.3)} name="rate-up" />
        <Label text={`ukuran langkah ${rate.toFixed(1).replace(".", ",")}`} size={0.17} position={[1.55, 0.5, -0.4]} weight={800} color={rate > 2 ? "#ff9f80" : "#eaf6f3"} />
      </group>
      <Curve />
      {active && target === null && <Pulse position={[-1.9, 1.2, 0.6]} radius={0.5} />}
      {active && target !== null && !nudge && <Pulse position={[-3.0, 0.8, 2.3]} radius={0.5} />}
      {active && nudge && !valley && <Pulse position={[1.7, 0.8, 3.4]} radius={0.45} />}
      {active && nudge && valley && !over && <Pulse position={[4.5, 0.6, 3.0]} radius={0.3} />}
    </group>
  );
}

export function Controls() {
  const { target, rate, auto } = useLocal();
  return (
    <div className="w3-controls">
      <div className="w3-seg" role="group" aria-label="Jawaban yang dilatih">
        {words.map((w, i) => (
          <button key={w} type="button" aria-pressed={target === i} onClick={() => pickTarget(i)}>
            {w}
          </button>
        ))}
      </div>
      <button type="button" className="w3-primary" onClick={trainStep} disabled={target === null}>
        Latih 1 langkah
      </button>
      <label className="w3-range">
        <span>
          Ukuran langkah <b>{rate.toFixed(1).replace(".", ",")}</b>
        </span>
        <input type="range" min={0.1} max={2.4} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
      </label>
      <button type="button" className="w3-chip" onClick={toggleAuto}>
        {auto ? "Berhenti" : "Gulirkan bola"}
      </button>
    </div>
  );
}
