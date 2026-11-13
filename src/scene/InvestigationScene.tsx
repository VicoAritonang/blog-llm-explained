import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import type { forward } from "../simulation/story/engine.mjs";

export type StoryTrace = ReturnType<typeof forward>;
export type StorySceneProps = {
  trace: StoryTrace;
  comparison: StoryTrace | null;
  vocab: string[];
  lesson: number;
  position: number;
  layer: number;
  head: number;
  probabilities: number[];
  onPosition: (position: number) => void;
  orbit: boolean;
};
type Point = [number, number, number];
const cyan = "#6fe6d4",
  amber = "#f4b779",
  violet = "#b8a0f4";
function Box({
  at,
  size,
  color,
  opacity = 1,
  onClick,
}: {
  at: Point;
  size: Point;
  color: string;
  opacity?: number;
  onClick?: () => void;
}) {
  return (
    <mesh
      position={at}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.38}
        metalness={0.35}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
function Label({
  at,
  children,
  muted = false,
}: {
  at: Point;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Html
      position={at}
      center
      zIndexRange={[10, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span className={`story-object-label ${muted ? "muted" : ""}`}>
        {children}
      </span>
    </Html>
  );
}
function Rail({
  points,
  color = cyan,
  width = 1,
  dashed = false,
}: {
  points: Point[];
  color?: string;
  width?: number;
  dashed?: boolean;
}) {
  return (
    <Line
      points={points}
      color={color}
      lineWidth={width}
      dashed={dashed}
      dashSize={0.15}
      gapSize={0.1}
    />
  );
}
function Key({ at }: { at: Point }) {
  return (
    <group position={at} rotation={[-Math.PI / 2, 0, 0.35]}>
      <mesh>
        <torusGeometry args={[0.24, 0.065, 8, 24]} />
        <meshStandardMaterial color={amber} metalness={0.8} roughness={0.2} />
      </mesh>
      <Box at={[0.49, 0, 0]} size={[0.65, 0.12, 0.12]} color={amber} />
      <Box at={[0.7, -0.1, 0]} size={[0.12, 0.25, 0.12]} color={amber} />
      <Box at={[0.49, -0.1, 0]} size={[0.1, 0.25, 0.12]} color={amber} />
    </group>
  );
}
function CaseTable({
  x,
  color,
  title,
  word,
  card = false,
}: {
  x: number;
  color: string;
  title: string;
  word: string;
  card?: boolean;
}) {
  return (
    <group position={[x, 0, 0]}>
      <Box at={[0, 0, 0]} size={[4, 0.25, 3]} color="#24383f" />
      {[-1.6, 1.6].map((i) => (
        <Box
          key={i}
          at={[i, -0.6, 0]}
          size={[0.18, 1.1, 2.5]}
          color="#182c34"
        />
      ))}
      <Box
        at={[0, 0.8, -0.25]}
        size={[2.8, 1.4, 1.8]}
        color={card ? "#714657" : "#243943"}
      />
      {card && (
        <mesh position={[0, 1.65, -0.25]}>
          <torusGeometry args={[0.5, 0.09, 10, 24, Math.PI]} />
          <meshStandardMaterial color="#b97d86" />
        </mesh>
      )}
      {(card ? [0.7] : [0.45, 1.1]).map((y, i) => (
        <group key={y}>
          <Box at={[0, y, 0.72]} size={[2.6, 0.56, 0.1]} color={color} />
          <Box at={[0, y, 0.82]} size={[0.6, 0.06, 0.1]} color="#d4e6e7" />
          {i === 0 && (
            <Box at={[0, 0.25, 1.1]} size={[2.5, 0.08, 0.8]} color={color} />
          )}
        </group>
      ))}
      {card ? (
        <Box at={[0, 0.32, 1.1]} size={[0.8, 0.04, 0.5]} color={amber} />
      ) : (
        <Key at={[-0.3, 0.35, 1.1]} />
      )}
      <Label at={[0, 2, -0.3]}>{title}</Label>
      <Label at={[0, -0.2, 2]}>{word}</Label>
    </group>
  );
}
function Decoder({
  trace,
  position,
  layer,
  head,
  vocab,
  onPosition,
  lesson,
}: StorySceneProps) {
  const n = trace.ids.length,
    step = Math.min(0.7, 13 / n),
    left = (-(n - 1) * step) / 2;
  const x = (i: number) => left + i * step;
  const attention = trace.blocks[layer].heads[head];
  const query = Math.min(position, n - 1);
  const layers = lesson < 4 ? 1 : 3;
  return (
    <group position={[0, -1, 0]}>
      <Box at={[0, -0.25, 0]} size={[15, 0.25, 3.3]} color="#1b3039" />
      <Rail
        points={[
          [-7.4, 0, 1.1],
          [7.4, 0, 1.1],
        ]}
        color="#58727b"
        width={2}
      />
      <Label at={[-6.1, -0.6, 1.4]} muted>
        pos 0 → {n - 1} · kiri → kanan
      </Label>
      {Array.from({ length: layers }, (_, l) => (
        <group key={l}>
          {l > 0 && (
            <>
              <Box
                at={[0, l * 1.8 - 0.35, -0.2]}
                size={[14.7, 0.06, 2.3]}
                color={l - 1 === layer ? cyan : "#405663"}
                opacity={0.2}
              />
              <Rail
                points={[
                  [-7.5, l * 1.8 - 0.2, 0],
                  [-7.5, l * 1.8 + 1, 0],
                  [7.5, l * 1.8 + 1, 0],
                  [7.5, l * 1.8 - 0.2, 0],
                ]}
                color={l - 1 === layer ? cyan : "#405663"}
              />
              <Label at={[-6, l * 1.8 + 0.95, 0]}>
                BLOK {l} · LN → attention → {trace.config.residual ? "+" : "×"}{" "}
                → LN → MLP → {trace.config.residual ? "+" : "×"}
              </Label>
            </>
          )}
          {trace.ids.map((id: number, i: number) => {
            const row =
              l === 0
                ? lesson === 2
                  ? trace.embeddings[i]
                  : trace.X0[i]
                : trace.blocks[l - 1].output[i];
            const selected = i === query;
            return (
              <group key={i}>
                <Box
                  at={[x(i), l * 1.8, 0.1]}
                  size={[step * 0.76, 0.34, 0.7]}
                  color={selected ? "#e5f7f2" : l === 0 ? "#3d6c75" : cyan}
                  onClick={() => onPosition(i)}
                />
                {selected && (
                  <Rail
                    points={[
                      [x(i) - step * 0.46, l * 1.8 - 0.23, 0.52],
                      [x(i) + step * 0.46, l * 1.8 - 0.23, 0.52],
                      [x(i) + step * 0.46, l * 1.8 + 0.23, 0.52],
                      [x(i) - step * 0.46, l * 1.8 + 0.23, 0.52],
                      [x(i) - step * 0.46, l * 1.8 - 0.23, 0.52],
                    ]}
                    color="#ffffff"
                    width={2}
                  />
                )}
                {lesson >= 2 &&
                  row
                    .slice(0, 3)
                    .map((value: number, c: number) => (
                      <Box
                        key={c}
                        at={[
                          x(i) + (c - 1) * step * 0.2,
                          l * 1.8 + 0.24 + Math.abs(value) * 0.06,
                          0.1,
                        ]}
                        size={[
                          step * 0.12,
                          0.04 + Math.min(Math.abs(value) * 0.12, 0.7),
                          0.24,
                        ]}
                        color={value < 0 ? violet : amber}
                      />
                    ))}
                {l === 0 && (selected || (n < 24 && i % 3 === 0)) && (
                  <Label at={[x(i), -0.6, 0.3]}>
                    {i} · {vocab[id].trim() || "↵"}
                  </Label>
                )}
                {l > 0 && (
                  <Rail
                    points={[
                      [x(i), (l - 1) * 1.8 + 0.25, -0.15],
                      [x(i), l * 1.8 - 0.2, -0.15],
                    ]}
                    color={selected ? amber : "#38535c"}
                    width={selected ? 2 : 1}
                  />
                )}
              </group>
            );
          })}
        </group>
      ))}
      {lesson >= 4 &&
        lesson <= 7 &&
        attention.A[query].map(
          (weight: number, j: number) =>
            weight > 0.0001 && (
              <Rail
                key={j}
                points={[
                  [x(j), layer * 1.8 + 0.3, 0.3],
                  [x(j), layer * 1.8 + 0.8, 1.2],
                  [x(query), layer * 1.8 + 1.45, 1.2],
                  [x(query), (layer + 1) * 1.8, 0.3],
                ]}
                color={j === query ? violet : amber}
                width={0.5 + weight * 7}
              />
            ),
        )}
      {lesson === 7 &&
        trace.config.residual &&
        [1, 2].map((l) => (
          <group key={l}>
            <Rail
              points={[
                [7.1, (l - 1) * 1.8, 0],
                [8, (l - 1) * 1.8, 0.2],
                [8, l * 1.8, 0.2],
                [7.1, l * 1.8, 0],
              ]}
              color={amber}
              width={3}
            />
            <Label at={[8, l * 1.8, 0.2]}>+</Label>
          </group>
        ))}
      {lesson === 9 &&
        [1, 2].map((l) => (
          <group key={l} position={[0, l * 1.8, -2.1]}>
            <Box at={[0, 0, 0]} size={[13, 0.1, 1]} color="#35444e" />
            {trace.ids.map((_: number, i: number) => (
              <group key={i}>
                <Box
                  at={[x(i), 0.25, -0.2]}
                  size={[step * 0.6, 0.45, 0.25]}
                  color={violet}
                />
                <Box
                  at={[x(i), 0.25, 0.2]}
                  size={[step * 0.6, 0.45, 0.25]}
                  color={amber}
                />
              </group>
            ))}
            <Label at={[-5, 0.7, 0]}>
              CACHE BLOK {l} · K / V · {n} posisi
            </Label>
          </group>
        ))}
      {lesson === 10 && (
        <group>
          <Rail
            points={[
              [7.4, 3.9, 0.3],
              [8.2, 3.9, 0.3],
              [8.2, 0.1, 0.3],
              [7.4, 0.1, 0.3],
            ]}
            color={amber}
            width={2}
            dashed
          />
          <Label at={[7.6, 4.65, 0.3]}>LOSS → GRADIENT → OPTIMIZER</Label>
          <Label at={[0, 4.5, 0.3]}>
            SKEMA TRAINING · semua parameter dapat diperbarui · bukan nilai
            gradien aktual
          </Label>
        </group>
      )}
      <Label at={[-8, 2, 0]} muted>
        ↑ kedalaman
      </Label>
      <Label at={[0, layers === 1 ? 1.8 : 5, 0]}>
        {lesson === 2
          ? "Lookup E · sebelum posisi · "
          : lesson === 3
            ? "X = E + P · "
            : ""}
        pos {query} · id {trace.ids[query]} ·{" "}
        {vocab[trace.ids[query]].replaceAll("\n", "↵")} · fitur 0, 1, 2
      </Label>
    </group>
  );
}
function ProbabilitySculpture({ probabilities, vocab }: StorySceneProps) {
  const ranked = probabilities
    .map((p, id) => ({ p, id }))
    .sort((a, b) => b.p - a.p);
  const shown = [
    ...ranked.slice(0, 5),
    { id: -1, p: ranked.slice(5).reduce((s, r) => s + r.p, 0) },
  ];
  return (
    <group position={[0, -0.8, 0]}>
      <Box at={[0, 0, 0]} size={[12, 0.2, 3]} color="#263a43" />
      {shown.map(({ p, id }, i) => (
        <group key={id} position={[(i - 2.5) * 1.8, 0, 0]}>
          <Box
            at={[0, 2.5, 0]}
            size={[0.8, 5, 0.8]}
            color={cyan}
            opacity={0.07}
          />
          {p > 0 && (
            <Box
              at={[0, 0.05 + p * 2.5, 0]}
              size={[0.75, p * 5, 0.75]}
              color={i === 0 ? cyan : violet}
            />
          )}
          <Label at={[0, p * 5 + 0.5, 0]}>
            {p > 0 && p < 0.0001 ? "<0.01%" : `${(p * 100).toFixed(2)}%`}
          </Label>
          <Label at={[0, -0.5, 0.2]}>
            {id === -1 ? `lain (${vocab.length - 5})` : vocab[id].trim()}
          </Label>
        </group>
      ))}
      <Label at={[0, 5.8, 0]}>PROBABILITAS · 0 → 100% · skala tetap</Label>
    </group>
  );
}
function ApplicationBench({ lesson }: { lesson: number }) {
  const labels =
    lesson === 11
      ? [
          "PARAMETER · training",
          "SYSTEM · format",
          "USER · input",
          "ASSISTANT · output",
        ]
      : ["PARAMETER", "KONTEKS AKTIF", "KV CACHE", "ARSIP LOKAL"];
  return (
    <group position={[0, 0, 0]}>
      <Box at={[0, -0.5, 0]} size={[14, 0.2, 3]} color="#1b3039" />
      {labels.map((label, i) => (
        <group key={label} position={[(i - 1.5) * 3.2, 0, 0]}>
          <Box
            at={[0, 0.2, 0]}
            size={[2.2, 1.1, 1.6]}
            color={i === 0 ? "#324659" : i === 3 ? "#3f5b4b" : "#2c5558"}
          />
          {[0, 1, 2].map((j) => (
            <Box
              key={j}
              at={[0, 0.05 + j * 0.3, 0.86]}
              size={[1.8, 0.06, 0.04]}
              color={i === 0 ? violet : i === 3 ? amber : cyan}
            />
          ))}
          <Label at={[0, 1.4, 0]}>{label}</Label>
        </group>
      ))}
      <Rail
        points={[
          [4.8, 0.2, 1.3],
          [4.8, 2.2, 1.3],
          [-1.6, 2.2, 1.3],
          [-1.6, 0.2, 1.3],
        ]}
        color={amber}
        width={2}
        dashed
      />
      <Label at={[0, 3, 0]}>
        {lesson === 11
          ? "SKEMA · template percakapan → token → model"
          : "SKEMA · cari dokumen → masukkan cuplikan → inference → periksa sumber"}
      </Label>
    </group>
  );
}
function Scene(props: StorySceneProps) {
  const { lesson, comparison } = props;
  return (
    <>
      <color attach="background" args={["#0c191f"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 9, 7]} intensity={2} />
      <pointLight position={[-6, 5, 0]} color={cyan} intensity={35} />
      <gridHelper
        args={[40, 40, "#28434d", "#172d35"]}
        position={[0, -1.8, 0]}
      />
      {lesson === 11 || lesson === 12 ? (
        <ApplicationBench lesson={lesson} />
      ) : lesson === 0 || lesson === 13 ? (
        <>
          <CaseTable
            x={comparison ? -3.4 : 0}
            color="#377caa"
            title={lesson === 13 ? "CATATAN AKTIF" : "KASUS A"}
            word={
              lesson === 13
                ? props.vocab[props.trace.ids[6]] +
                  props.vocab[props.trace.ids[7]]
                : "laci biru"
            }
            card={lesson === 13 && props.trace.ids[2] === 15}
          />
          {comparison && (
            <CaseTable
              x={3.4}
              color="#3b947d"
              title="KASUS B"
              word="laci hijau"
            />
          )}
          <Rail
            points={[
              [-5, -1.5, 2],
              [5, -1.5, 2],
            ]}
            color={amber}
          />
          <Label at={[0, 3.2, 0]}>
            INPUT → 2 BLOK TRANSFORMER → TOKEN BERIKUTNYA
          </Label>
        </>
      ) : lesson === 8 ? (
        <ProbabilitySculpture {...props} />
      ) : (
        <Decoder {...props} />
      )}
      <OrbitControls
        enabled={props.orbit}
        enablePan={false}
        minDistance={7}
        maxDistance={28}
        maxPolarAngle={Math.PI * 0.48}
        target={[0, 1, 0]}
      />
    </>
  );
}
export default function InvestigationScene(props: StorySceneProps) {
  const close = props.lesson === 0 || props.lesson === 13;
  return (
    <Canvas
      key={close ? "case" : props.lesson < 4 ? "input" : "decoder"}
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{
        position: close
          ? [0, 4.5, 10]
          : props.lesson < 4
            ? [0, 5, 16]
            : [0, 7, 18],
        fov: 43,
      }}
      gl={{ antialias: true, alpha: false }}
      aria-label="Model 3D interaktif, angka yang sama tersedia pada panel di bawah"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
