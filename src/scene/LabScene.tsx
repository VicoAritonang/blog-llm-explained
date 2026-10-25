import { t } from "../i18n/core.mjs";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import * as T from "three";
import { stations, type StationId } from "../content/lessons";
import { useExperience } from "../store/experience";
import type { Snapshot } from "../simulation/snapshot";
import {
  VOCAB,
  distribution,
  LOCAL_LOGITS,
  TOKENIZER_PRESETS,
  analogyResult,
} from "../simulation/engine.mjs";

type Point = [number, number, number];
const colors = ["#65e2e3", "#a79cff", "#ffc778", "#86e2b2", "#e7a2c5"];
const positions: Record<StationId, Point> = {
  tokenizer: [-13, 0, 0],
  embedding: [-8, 0, 0],
  qkv: [-3, 0, 0],
  attention: [2, 0, 0],
  transformer: [7, 0, 0],
  sampling: [12, 0, 0],
  cache: [7, 0, -6],
  analogy: [-8, 0, -6],
};
const v = (point: Point) => new T.Vector3(...point);

function Label({
  at,
  children,
  className = "",
  scale = 8,
}: {
  at: Point;
  children: ReactNode;
  className?: string;
  scale?: number;
}) {
  return (
    <Html position={at} center distanceFactor={scale} zIndexRange={[20, 0]}>
      <div className={`signal-label ${className}`}>{children}</div>
    </Html>
  );
}
function Solid({
  at,
  size,
  color,
  glass = false,
}: {
  at: Point;
  size: Point;
  color: string;
  glass?: boolean;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.35}
        transparent={glass}
        opacity={glass ? 0.16 : 1}
        depthWrite={!glass}
        emissive={color}
        emissiveIntensity={0.13}
      />
    </mesh>
  );
}

// One draw call for a tensor, with individual cell colors and picking.
function Tensor({
  at,
  rows = 5,
  cols = 8,
  color = colors[0],
  values,
  masked = false,
  size = [2.8, 2.1],
  onPick,
}: {
  at: Point;
  rows?: number;
  cols?: number;
  color?: string;
  values?: number[][];
  masked?: boolean;
  size?: [number, number];
  onPick?: (row: number, col: number) => void;
}) {
  const ref = useRef<T.InstancedMesh>(null),
    selectedRow = useExperience((s) => s.token);
  const reduced = useExperience((s) => s.reducedMotion),
    { invalidate } = useThree();
  const targets = useRef<
    { position: T.Vector3; scale: T.Vector3; color: T.Color }[]
  >([]);
  const current = useRef<
    { position: T.Vector3; scale: T.Vector3; color: T.Color }[]
  >([]);
  const transform = useMemo(() => new T.Object3D(), []);
  useEffect(() => {
    if (!ref.current) return;
    const dummy = new T.Object3D(),
      maximum = Math.max(1, ...(values?.flat().map(Math.abs) ?? [1]));
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const hidden = masked && col > row;
        const value = values?.[row]?.[col] ?? Math.sin(row * 3.1 + col * 1.7);
        dummy.position.set(
          at[0] + ((col - (cols - 1) / 2) * size[0]) / cols,
          at[1] + (((rows - 1) / 2 - row) * size[1]) / rows,
          at[2],
        );
        dummy.scale.set(
          (size[0] / cols) * 0.78,
          (size[1] / rows) * 0.72,
          hidden ? 0.018 : 0.06 + (Math.abs(value) / maximum) * 0.15,
        );
        const index = row * cols + col;
        targets.current[index] = {
          position: dummy.position.clone(),
          scale: dummy.scale.clone(),
          color: new T.Color(
            hidden ? "#1a303e" : value < 0 ? colors[1] : color,
          ).multiplyScalar(
            hidden
              ? 1
              : (row === selectedRow ? 0.8 : 0.35) +
                  (Math.abs(value) / maximum) * 0.6,
          ),
        };
        if (!current.current[index])
          current.current[index] = {
            position: dummy.position.clone().add(new T.Vector3(0, 0, 0.4)),
            scale: dummy.scale.clone().multiplyScalar(0.1),
            color: targets.current[index].color.clone(),
          };
      }
    targets.current.length = rows * cols;
    current.current.length = rows * cols;
    invalidate();
  }, [
    rows,
    cols,
    color,
    values,
    masked,
    at[0],
    at[1],
    at[2],
    size[0],
    size[1],
    selectedRow,
  ]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    let moving = false;
    const ease = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 8);
    targets.current.forEach((target, i) => {
      const cell = current.current[i];
      cell.position.lerp(target.position, ease);
      cell.scale.lerp(target.scale, ease);
      cell.color.lerp(target.color, ease);
      moving ||=
        cell.position.distanceToSquared(target.position) +
          cell.scale.distanceToSquared(target.scale) +
          Math.abs(cell.color.r - target.color.r) +
          Math.abs(cell.color.g - target.color.g) +
          Math.abs(cell.color.b - target.color.b) >
        0.000001;
      transform.position.copy(cell.position);
      transform.scale.copy(cell.scale);
      transform.updateMatrix();
      ref.current!.setMatrixAt(i, transform.matrix);
      ref.current!.setColorAt(i, cell.color);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    if (moving) invalidate();
  });
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, rows * cols]}
      onClick={
        onPick
          ? (e) => {
              e.stopPropagation();
              if (e.instanceId !== undefined)
                onPick(Math.floor(e.instanceId / cols), e.instanceId % cols);
            }
          : undefined
      }
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        roughness={0.35}
        metalness={0.25}
        emissive="#33596b"
        emissiveIntensity={0.25}
      />
    </instancedMesh>
  );
}
function Connections({
  segments,
  color = colors[0],
  opacity = 0.3,
}: {
  segments: Point[][];
  color?: string;
  opacity?: number;
}) {
  const geometry = useMemo(
    () =>
      new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(
          segments.flatMap((pair) => pair.flat()),
          3,
        ),
      ),
    [segments],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

// A presentation clock moves packets; no model-sized tensors are allocated.
export function Stream({
  points,
  color = colors[0],
  count = 8,
  radius = 0.025,
}: {
  points: Point[];
  color?: string;
  count?: number;
  radius?: number;
}) {
  const curve = useMemo(
    () => new T.CatmullRomCurve3(points.map(v)),
    [JSON.stringify(points)],
  );
  const geometry = useMemo(
    () => new T.TubeGeometry(curve, 48, radius, 5, false),
    [curve, radius],
  );
  const particles = useRef<T.InstancedMesh>(null),
    phase = useRef(0);
  const dummy = useMemo(() => new T.Object3D(), []),
    point = useMemo(() => new T.Vector3(), []);
  const { invalidate } = useThree();
  const playing = useExperience((s) => s.playing),
    reduced = useExperience((s) => s.reducedMotion),
    speed = useExperience((s) => s.speed);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, dt) => {
    if (playing && !reduced && !document.hidden)
      phase.current += Math.min(dt, 0.05) * 0.16 * speed;
    if (particles.current)
      for (let i = 0; i < count; i++) {
        curve.getPointAt((phase.current + i / count) % 1, point);
        dummy.position.copy(point);
        dummy.scale.setScalar(i % 3 === 0 ? 0.095 : 0.055);
        dummy.updateMatrix();
        particles.current.setMatrixAt(i, dummy.matrix);
      }
    if (particles.current) particles.current.instanceMatrix.needsUpdate = true;
    if (playing && !reduced && !document.hidden) invalidate();
  });
  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
      <instancedMesh ref={particles} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Token({
  id,
  index,
  total,
  split,
  detail,
  text,
}: {
  id: number;
  index: number;
  total: number;
  split: boolean;
  detail: boolean;
  text?: string;
}) {
  const ref = useRef<T.Group>(null),
    { invalidate } = useThree();
  const s = useExperience();
  const target = useMemo(
    () =>
      new T.Vector3(
        (index - (total - 1) / 2) * (split ? 0.63 : 0.51),
        1.8 + (split ? (index % 2) * 0.23 : 0),
        0,
      ),
    [index, total, split],
  );
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (s.reducedMotion) ref.current.position.copy(target);
    else ref.current.position.lerp(target, 1 - Math.exp(-dt * 5));
    if (ref.current.position.distanceToSquared(target) > 0.00001) invalidate();
  });
  return (
    <group
      ref={ref}
      position={target}
      onClick={(e) => {
        e.stopPropagation();
        s.patch({ token: index, tab: "numbers" });
      }}
    >
      <Solid
        at={[0, 0, 0]}
        size={[0.48, 0.55, 0.45]}
        color={colors[index % colors.length]}
      />
      {detail && (
        <>
          <Label at={[0, 0.6, 0]} scale={7}>
            {(text ?? VOCAB[id]).replaceAll(" ", "·")}
          </Label>
          <Label at={[0, -0.55, 0]} scale={6} className="muted">
            {split ? `ID ${id}` : `pos ${index}`}
          </Label>
        </>
      )}
    </group>
  );
}
function MLP({ detail }: { detail: boolean }) {
  const graph = useMemo(() => {
    const nodes = [4, 10, 4].map((count, layer) =>
      Array.from(
        { length: count },
        (_, i): Point => [
          (layer - 1) * 1.1,
          1.5 + (i - (count - 1) / 2) * 0.18,
          0.9,
        ],
      ),
    );
    return {
      nodes: nodes.flat(),
      segments: nodes
        .slice(0, 2)
        .flatMap((layer, i) =>
          layer.flatMap((from) => nodes[i + 1].map((to) => [from, to])),
        ),
    };
  }, []);
  const dots = useRef<T.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new T.Object3D();
    graph.nodes.forEach((point, i) => {
      dummy.position.set(...point);
      dummy.scale.setScalar(0.065);
      dummy.updateMatrix();
      dots.current?.setMatrixAt(i, dummy.matrix);
    });
    if (dots.current) dots.current.instanceMatrix.needsUpdate = true;
  }, [graph]);
  return (
    <group>
      <Connections segments={graph.segments} color={colors[2]} />
      <instancedMesh
        ref={dots}
        args={[undefined, undefined, graph.nodes.length]}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={colors[2]} />
      </instancedMesh>
      {detail && (
        <Label at={[0, 0.25, 1]} className="amber">
          MLP · EXPAND → GELU → PROJECT
        </Label>
      )}
    </group>
  );
}
function Transformer({ detail }: { detail: boolean }) {
  const stack = useRef<T.InstancedMesh>(null),
    s = useExperience();
  useEffect(() => {
    const dummy = new T.Object3D();
    for (let i = 0; i < 96; i++) {
      dummy.position.set(
        detail ? 2.35 : 0,
        0.5 + i * 0.047,
        detail ? -1.7 : -0.65,
      );
      dummy.scale.set(detail ? 0.7 : 2.6, 0.022, detail ? 0.7 : 1.5);
      dummy.updateMatrix();
      stack.current?.setMatrixAt(i, dummy.matrix);
      stack.current?.setColorAt(
        i,
        new T.Color(i < 48 ? colors[0] : colors[1]).multiplyScalar(
          i % 8 === 0 ? 0.8 : 0.28,
        ),
      );
    }
    if (stack.current) {
      stack.current.instanceMatrix.needsUpdate = true;
      if (stack.current.instanceColor)
        stack.current.instanceColor.needsUpdate = true;
    }
  }, [detail]);
  return (
    <group>
      <instancedMesh ref={stack} args={[undefined, undefined, 96]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.6} roughness={0.3} />
      </instancedMesh>
      {detail ? (
        <>
          <Stream
            points={[
              [0, 0.4, 0.5],
              [0, 2.3, 0.5],
              [0, 5.8, 0.5],
            ]}
            count={14}
          />
          <Stream
            points={[
              [0, 0.5, 0.5],
              [-1.6, 0.6, 0.5],
              [-1.6, 2.8, 0.5],
              [0, 2.95, 0.5],
            ]}
            color={colors[2]}
            count={8}
          />
          <Stream
            points={[
              [0, 2.95, 0.5],
              [1.65, 3.05, 0.5],
              [1.65, 5.6, 0.5],
              [0, 5.8, 0.5],
            ]}
            color={colors[2]}
            count={8}
          />
          {[
            { y: 1.1, text: "LayerNorm 1", active: false },
            {
              y: 1.95,
              text: "Multi-head attention · WO",
              active: s.step === 0,
            },
            { y: 3.5, text: "LayerNorm 2", active: s.step === 1 },
          ].map((item) => (
            <group key={item.text}>
              <Solid
                at={[0, item.y, 0.5]}
                size={[2.3, 0.38, 0.38]}
                color={item.active ? colors[0] : "#315765"}
              />
              <Label at={[0, item.y, 0.77]} scale={6}>
                {item.text}
              </Label>
            </group>
          ))}
          <group position={[0, 3, -0.4]}>
            <MLP detail={false} />
          </group>
          <Label at={[0, 4.8, 1]} scale={6} className="amber">
            12.288 → GELU → 12.288
          </Label>
          <Label at={[0, 4.1, 1]} scale={6} className="muted">
            {t("MLP · ekspansi 49.152 fitur")}
          </Label>
          {[2.95, 5.8].map((y) => (
            <group key={y}>
              <mesh position={[0, y, 0.5]}>
                <sphereGeometry args={[0.2, 16, 12]} />
                <meshBasicMaterial color={colors[2]} />
              </mesh>
              <Label at={[0, y, 0.74]} scale={6}>
                +
              </Label>
            </group>
          ))}
          <Label at={[-1.8, 2, 0.5]} className="amber" scale={5}>
            RESIDUAL 1
          </Label>
          <Label at={[1.9, 4.7, 0.5]} className="amber" scale={5}>
            RESIDUAL 2
          </Label>
          <Label at={[2.4, 5.35, -1.7]} scale={6}>
            × 96
          </Label>
          <Label at={[0, -0.15, 1]} className="muted">
            {t("Aliran ke atas · workbench blok")}
            {s.layer + 1} / 2
          </Label>
        </>
      ) : (
        <>
          <Solid at={[0, 3.15, 0.8]} size={[2.8, 0.5, 0.35]} color="#47747e" />
          <MLP detail={false} />
          <Stream
            points={[
              [-1.75, 0.45, 0.8],
              [-2, 2.5, 0.8],
              [-1.75, 4.7, 0.8],
              [0, 4.9, 0.2],
              [1.75, 4.7, 0.8],
              [2, 2.5, 0.8],
              [1.75, 0.45, 0.8],
            ]}
            color={colors[2]}
            count={12}
          />
        </>
      )}
    </group>
  );
}
function Distribution({ p, detail }: { p: Snapshot; detail: boolean }) {
  const bars = useRef<T.InstancedMesh>(null),
    heights = useRef(new Float32Array(16));
  const { invalidate } = useThree(),
    s = useExperience(),
    dummy = useMemo(() => new T.Object3D(), []);
  const probs: number[] = useMemo(
    () =>
      distribution(
        s.experiment === "F" ? LOCAL_LOGITS : p.result.logits,
        s.sampler === "greedy" ? 0 : s.temperature,
        s.topK,
        s.topP,
      ),
    [p.result.logits, s.experiment, s.sampler, s.temperature, s.topK, s.topP],
  );
  const max = Math.max(...probs),
    winner = probs.indexOf(max);
  useFrame((_, dt) => {
    if (!bars.current) return;
    let moving = false;
    probs.forEach((value, i) => {
      const target = 0.05 + (value / max) * 2.65;
      heights.current[i] = s.reducedMotion
        ? target
        : T.MathUtils.lerp(heights.current[i], target, 1 - Math.exp(-dt * 5));
      moving ||= Math.abs(heights.current[i] - target) > 0.001;
      dummy.position.set((i - 7.5) * 0.22, 0.65 + heights.current[i] / 2, 0);
      dummy.scale.set(0.15, heights.current[i], 0.3);
      dummy.updateMatrix();
      bars.current!.setMatrixAt(i, dummy.matrix);
      bars.current!.setColorAt(
        i,
        new T.Color(
          i === s.selected ? "#ffffff" : i === winner ? colors[2] : colors[3],
        ),
      );
    });
    bars.current.instanceMatrix.needsUpdate = true;
    if (bars.current.instanceColor)
      bars.current.instanceColor.needsUpdate = true;
    if (moving) invalidate();
  });
  return (
    <group>
      <instancedMesh ref={bars} args={[undefined, undefined, 16]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          emissive="#2e715e"
          emissiveIntensity={0.35}
          roughness={0.3}
        />
      </instancedMesh>
      {detail && (
        <>
          <Label at={[0, 4.15, 0]}>FINAL LN → LM HEAD → SOFTMAX</Label>
          <Label at={[0, 0.15, 0]} className="muted">
            {t("16 kandidat workbench · probabilitas")}
          </Label>
          <Label at={[0, 3.55, 0.6]} className="amber">
            {s.selected === null
              ? t("Kandidat: {0}", VOCAB[winner])
              : t("Terpilih: {0}", VOCAB[s.selected])}
          </Label>
        </>
      )}
    </group>
  );
}
export function Instrument({
  id,
  p,
  detail,
}: {
  id: StationId;
  p: Snapshot;
  detail: boolean;
}) {
  const s = useExperience(),
    n = Math.min(p.attention.A.length, 8),
    row = Math.min(p.row, n - 1);
  const preset = s.experiment === "B" ? TOKENIZER_PRESETS[s.preset] : null;
  const tokenPoint = (i: number): Point => [(i - (n - 1) / 2) * 0.48, 0.9, 1];
  if (id === "tokenizer")
    return (
      <group>
        <Solid
          at={[0, 1.9, -0.5]}
          size={[3.7, 2.3, 0.12]}
          color="#234254"
          glass
        />
        {(preset ? preset.ids.map((id: string) => +id.split(":")[1]) : p.ids)
          .slice(0, 8)
          .map((token: number, i: number) => (
            <Token
              key={i}
              id={token}
              text={preset?.pieces[i]}
              index={i}
              total={Math.min(preset?.ids.length ?? p.ids.length, 8)}
              split={s.step > 0}
              detail={detail}
            />
          ))}
        {detail && (
          <>
            <Label at={[0, 3.35, 0]}>TEXT → BPE → IDs</Label>
            <Label at={[0, 0.65, 0]} className="muted">
              {t("Potongan teks, bukan selalu satu kata")}
            </Label>
          </>
        )}
      </group>
    );
  if (id === "embedding")
    return (
      <group>
        <Tensor
          at={[-0.55, 2, -0.35]}
          values={p.result.embeddings}
          size={[2.5, 2.4]}
        />
        <Tensor
          at={[0.55, 2, 0.45]}
          values={p.result.positions}
          color={colors[2]}
          size={[2.5, 2.4]}
        />
        <Stream
          points={[
            [-1.6, 0.5, 0],
            [0, 0.7, 1],
            [1.6, 1, 0],
          ]}
          color={colors[2]}
          count={5}
        />
        {detail && (
          <>
            <Label at={[-0.8, 3.65, -0.4]}>TOKEN EMBEDDING</Label>
            <Label at={[0.7, 0.45, 1.1]} className="amber">
              + LEARNED POSITION
            </Label>
            <Label at={[0, 4.2, 0]} className="muted">
              {t("N × 12.288 · skala referensi")}
            </Label>
          </>
        )}
      </group>
    );
  if (id === "qkv")
    return (
      <group>
        {(["Q", "K", "V"] as const).map((name, i) => (
          <group key={name}>
            <Tensor
              at={[(i - 1) * 1.25, 2.1, 0]}
              cols={4}
              values={p.h[name]}
              color={colors[i]}
              size={[0.95, 2]}
            />
            <Stream
              points={[
                [0, 0.45, 0],
                [(i - 1) * 0.7, 0.7, 0.2],
                [(i - 1) * 1.25, 1.1, 0],
              ]}
              color={colors[i]}
              count={4}
            />
            {detail && (
              <Label
                at={[(i - 1) * 1.25, 3.4, 0]}
                className={i === 2 ? "amber" : ""}
              >
                {name}
              </Label>
            )}
          </group>
        ))}
        {detail && (
          <>
            <Label at={[0, 0.1, 0.6]} className="muted">
              {t("LN(X) · tiga proyeksi terlatih")}
            </Label>
            <Label at={[0, 4.15, 0]}>SPLIT → 96 HEAD</Label>
          </>
        )}
      </group>
    );
  if (id === "attention")
    return (
      <group>
        <Tensor
          at={[0, 2.6, -0.3]}
          rows={detail ? p.values.length : n}
          cols={detail ? p.values[0].length : n}
          values={detail ? p.values : p.attention.A}
          masked={!detail || ["masked", "A"].includes(p.op.tensor)}
          size={[2.8, 2.4]}
          onPick={(token, column) =>
            s.patch({ token, column, tab: "numbers", traced: true })
          }
        />
        {Array.from({ length: n }, (_, i) => (
          <mesh key={i} position={tokenPoint(i)}>
            <sphereGeometry args={[i === row ? 0.15 : 0.09, 12, 8]} />
            <meshBasicMaterial color={colors[i % 5]} />
          </mesh>
        ))}
        {(detail && s.step >= 4 ? p.attention.A[row].slice(0, n) : []).map(
          (weight: number, i: number) =>
            weight > 0 && (
              <Stream
                key={i}
                points={[
                  tokenPoint(i),
                  [
                    (tokenPoint(i)[0] + tokenPoint(row)[0]) / 2,
                    1.45 + weight * 1.1,
                    1.5,
                  ],
                  tokenPoint(row),
                ]}
                radius={0.009 + weight * 0.035}
                count={3}
                color={colors[i % 5]}
              />
            ),
        )}
        {detail && (
          <>
            <Label at={[0, 4.35, -0.3]}>QKᵀ / √d → MASK → SOFTMAX</Label>
            <Label at={[0, 0.25, 1]} className="muted">
              {t("Causal dense head · pindai untuk memeriksa angka")}
            </Label>
          </>
        )}
      </group>
    );
  if (id === "transformer") return <Transformer detail={detail} />;
  if (id === "sampling") return <Distribution p={p} detail={detail} />;
  if (id === "cache")
    return (
      <group>
        {[0, 1].map((i) => (
          <group key={i}>
            <Solid
              at={[i === 0 ? -0.85 : 0.85, 2, -0.25]}
              size={[1.4, 3.3, 0.45]}
              color="#284855"
              glass
            />
            <Tensor
              at={[i === 0 ? -0.85 : 0.85, 2, 0]}
              rows={Math.min(p.ids.length, 8)}
              cols={4}
              values={i === 0 ? p.b.K : p.b.V}
              color={colors[i + 1]}
              size={[1.15, 2.7]}
            />
            {detail && (
              <Label
                at={[i === 0 ? -0.85 : 0.85, 4, 0]}
                className={i ? "amber" : ""}
              >
                {i ? "VALUE CACHE" : "KEY CACHE"}
              </Label>
            )}
          </group>
        ))}
        <Stream
          points={[
            [-1.7, 0.3, 0],
            [-1.5, 0.8, 1],
            [1.5, 0.8, 1],
            [1.7, 0.3, 0],
          ]}
          color={colors[3]}
          count={6}
        />
        {detail && (
          <Label at={[0, -0.1, 0]} className="muted">
            {t("Prefix dipakai ulang · Q token baru")}
          </Label>
        )}
      </group>
    );
  const example = analogyResult(s.analogyCase);
  const points: Point[] = example.points.map((point: number[]) => [
    point[0] * 2,
    0.6 + point[1] * 2,
    0,
  ]);
  const target: Point = [
    example.vectors[example.target][0] * 2,
    0.6 + example.vectors[example.target][1] * 2,
    0,
  ];
  return (
    <group>
      <Connections
        segments={[
          [
            [-1.5, 0.6, 0],
            [1.8, 0.6, 0],
          ],
          [
            [0, 0.6, 0],
            [0, 3.7, 0],
          ],
          [
            [0, 0.6, -1.4],
            [0, 0.6, 1.4],
          ],
        ]}
        opacity={0.25}
      />
      {[0, 1, 2].map((i) => (
        <Stream
          key={i}
          points={[points[i], points[i + 1]]}
          color={colors[i]}
          count={4}
        />
      ))}
      <mesh position={target}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color="#88d9ab" />
      </mesh>
      {detail && (
        <>
          <Label at={[points[1][0], points[1][1] + 0.3, 0]}>
            {example.words[0]}
          </Label>
          <Label
            at={[
              (points[1][0] + points[2][0]) / 2,
              (points[1][1] + points[2][1]) / 2 - 0.2,
              0.1,
            ]}
          >
            − {example.words[1]}
          </Label>
          <Label at={[points[2][0] - 0.4, points[2][1] + 0.3, 0.1]}>
            + {example.words[2]}
          </Label>
          <Label at={[target[0], target[1] + 0.4, 0]} className="amber">
            ≈ {example.target}
          </Label>
          <Label at={[0, 0, 0]} className="muted">
            {t("ANNEX · di luar jalur inferensi")}
          </Label>
        </>
      )}
    </group>
  );
}

function CameraRig() {
  const s = useExperience(),
    { camera, gl, invalidate, size } = useThree();
  const orbit = useRef<any>(null),
    walk = useRef<PointerLockControls | null>(null);
  const keys = useRef(new Set<string>()),
    transitioning = useRef(true);
  const focus = useMemo(
    () =>
      v(positions[s.station]).add(
        new T.Vector3(0, s.station === "transformer" ? 2.8 : 2, 0),
      ),
    [s.station],
  );
  const destination = useMemo(
    () =>
      s.overview
        ? new T.Vector3(
            1,
            10,
            Math.max(16, 31 / ((0.87 * size.width) / size.height)),
          )
        : focus
            .clone()
            .add(
              new T.Vector3(
                3.1,
                2.8,
                Math.max(8.8, 7 / (size.width / size.height)),
              ),
            ),
    [focus, s.overview, size.width, size.height],
  );
  const target = useMemo(
    () => (s.overview ? new T.Vector3(0, 1, -1.6) : focus),
    [focus, s.overview],
  );
  useEffect(() => {
    transitioning.current = true;
    if (s.reducedMotion) {
      camera.position.copy(destination);
      orbit.current?.target.copy(target);
      orbit.current?.update();
      transitioning.current = false;
    }
    invalidate();
  }, [destination, target, s.reducedMotion, s.camera, camera, invalidate]);
  useEffect(() => {
    const controls = new PointerLockControls(camera, gl.domElement);
    walk.current = controls;
    const click = () => {
      if (useExperience.getState().camera === "walk") controls.lock();
    };
    const unlock = () => {
      keys.current.clear();
      if (useExperience.getState().camera === "walk")
        useExperience.getState().patch({ camera: "guided" });
    };
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,select,textarea,button,[contenteditable]",
        )
      )
        return;
      if (
        useExperience.getState().camera === "walk" &&
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        keys.current.add(e.code);
        e.preventDefault();
        invalidate();
      }
      if (useExperience.getState().camera === "walk" && e.code === "Home") {
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 2, 0);
        invalidate();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code),
      blur = () => keys.current.clear();
    const rejected = () => useExperience.getState().patch({ camera: "orbit" });
    controls.addEventListener("unlock", unlock);
    gl.domElement.addEventListener("click", click);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("pointerlockerror", rejected);
    return () => {
      controls.removeEventListener("unlock", unlock);
      controls.dispose();
      gl.domElement.removeEventListener("click", click);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("pointerlockerror", rejected);
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (s.camera !== "walk" && walk.current?.isLocked) walk.current.unlock();
  }, [s.camera]);
  useFrame((_, dt) => {
    if (s.camera !== "walk" && transitioning.current && orbit.current) {
      const ease = 1 - Math.exp(-Math.min(dt, 0.1) * 3.2);
      camera.position.lerp(destination, ease);
      orbit.current.target.lerp(target, ease);
      orbit.current.update();
      if (camera.position.distanceToSquared(destination) < 0.0001)
        transitioning.current = false;
      else invalidate();
    }
    if (
      s.camera === "walk" &&
      walk.current?.isLocked &&
      keys.current.size &&
      !document.hidden
    ) {
      const forward =
        Number(keys.current.has("KeyW") || keys.current.has("ArrowUp")) -
        Number(keys.current.has("KeyS") || keys.current.has("ArrowDown"));
      const side =
        Number(keys.current.has("KeyD") || keys.current.has("ArrowRight")) -
        Number(keys.current.has("KeyA") || keys.current.has("ArrowLeft"));
      const distance =
        (Math.min(dt, 0.05) * 4) / Math.max(1, Math.hypot(forward, side));
      walk.current.moveForward(forward * distance);
      walk.current.moveRight(side * distance);
      camera.position.x = T.MathUtils.clamp(camera.position.x, -20, 20);
      camera.position.z = T.MathUtils.clamp(camera.position.z, -12, 16);
      camera.position.y = T.MathUtils.clamp(camera.position.y, 1.6, 10);
      invalidate();
    }
  });
  return (
    <OrbitControls
      ref={orbit}
      enabled={s.camera === "orbit"}
      enableDamping
      dampingFactor={0.07}
      minDistance={4}
      maxDistance={65}
      maxPolarAngle={Math.PI * 0.49}
      onStart={() => {
        transitioning.current = false;
      }}
    />
  );
}
function World({ p }: { p: Snapshot }) {
  const s = useExperience(),
    { gl, invalidate } = useThree();
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      s.patch({ playing: false, mode: "2d" });
    };
    const visible = () => invalidate();
    gl.domElement.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", visible);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [gl, s.patch, invalidate]);
  useFrame(() => {
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
  });
  return (
    <>
      <color attach="background" args={["#091621"]} />
      <fog attach="fog" args={["#091621", 38, 90]} />
      <ambientLight intensity={1.2} />
      <hemisphereLight args={["#bad9ff", "#10202d", 2]} />
      <directionalLight position={[-5, 14, 8]} intensity={3} color="#b7e2ee" />
      <directionalLight position={[10, 5, -8]} intensity={2} color="#b8a3ff" />
      <gridHelper
        args={[90, 90, "#25414e", "#152a38"]}
        position={[0, -0.06, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial
          color="#0b1924"
          metalness={0.5}
          roughness={0.55}
        />
      </mesh>
      <CameraRig />
      {stations.slice(0, 5).map((station, i) => (
        <Stream
          key={station.id}
          points={[
            [positions[station.id][0] + 1.8, 0.18, 0],
            [positions[station.id][0] + 2.5, 0.18, 0],
            [positions[stations[i + 1].id][0] - 1.8, 0.18, 0],
          ]}
          count={5}
          color={i < 2 ? colors[0] : colors[2]}
        />
      ))}
      <Stream
        points={[
          [12, 0.2, 1.6],
          [12, 0.2, 4],
          [0, 0.2, 4],
          [-8, 0.2, 4],
          [-8, 0.2, 1.7],
        ]}
        color={colors[3]}
        count={22}
      />
      <Stream
        points={[
          [-3, 0.2, -1.5],
          [-3, 0.2, -3.2],
          [7, 0.2, -3.2],
          [7, 0.2, -4.5],
        ]}
        color={colors[1]}
        count={12}
      />
      <Stream
        points={[
          [5.5, 0.2, -6],
          [2, 0.2, -6],
          [2, 0.2, -1.7],
        ]}
        color={colors[2]}
        count={10}
      />
      {s.overview && (
        <>
          <Connections
            segments={[
              [
                [-5.2, 0.3, -1.8],
                [-5.2, 6, -1.8],
              ],
              [
                [-5.2, 6, -1.8],
                [9.2, 6, -1.8],
              ],
              [
                [9.2, 6, -1.8],
                [9.2, 0.3, -1.8],
              ],
            ]}
            color={colors[1]}
            opacity={0.5}
          />
          <Label at={[2, 6.4, -1.8]} scale={20}>
            {t("SATU DECODER BLOCK · DIULANG 96×")}
          </Label>
          <Label at={[2.4, 0.5, -6]} className="muted" scale={14}>
            K/V → ATTENTION
          </Label>
          <Label at={[-1, 0.3, 4.3]} className="overview-title" scale={18}>
            ↻ +1 TOKEN → EMBEDDING → DECODE
          </Label>
        </>
      )}
      {stations.map((station, index) => (
        <group key={station.id} position={positions[station.id]}>
          <mesh
            position={[0, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              s.navigate(station.id);
            }}
          >
            <cylinderGeometry args={[2, 2.1, 0.12, 48]} />
            <meshStandardMaterial
              color={station.id === s.station ? "#254958" : "#152936"}
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.075, 0]}>
            <ringGeometry
              args={[1.96, station.id === s.station ? 2.015 : 1.975, 64]}
            />
            <meshBasicMaterial
              color={station.color}
              transparent
              opacity={station.id === s.station ? 0.9 : 0.3}
            />
          </mesh>
          {s.overview || station.id === s.station ? (
            <Instrument
              id={station.id}
              p={p}
              detail={station.id === s.station && !s.overview}
            />
          ) : (
            <mesh position={[0, 1.2, 0]}>
              <boxGeometry args={[2.2, 2.2, 0.6]} />
              <meshBasicMaterial
                color="#315263"
                wireframe
                transparent
                opacity={0.18}
              />
            </mesh>
          )}
          <Html
            position={[0, -0.55, 1.7]}
            center
            distanceFactor={s.overview ? 22 : 8}
            zIndexRange={[25, 0]}
          >
            <button
              className={`world-label ${station.id === s.station ? "active" : ""}`}
              onClick={() => s.navigate(station.id)}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              {station.title}
            </button>
          </Html>
        </group>
      ))}
    </>
  );
}
export default function LabScene({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience();
  return (
    <Canvas
      className="lab-canvas"
      frameloop="demand"
      dpr={s.quality === "low" ? 1 : s.quality === "high" ? 1.75 : 1.25}
      camera={{ position: [-10, 9, 18], fov: 47, near: 0.1, far: 140 }}
      gl={{
        antialias: s.quality !== "low",
        powerPreference: "high-performance",
        toneMapping: T.ACESFilmicToneMapping,
      }}
      fallback={
        <div className="scene-failure">
          <p>{t("3D tidak tersedia.")}</p>
          <button className="button" onClick={() => s.patch({ mode: "2d" })}>
            {t("Buka mode 2D")}
          </button>
        </div>
      }
    >
      <World p={snapshot} />
    </Canvas>
  );
}
