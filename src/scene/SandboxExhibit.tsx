import { t } from "../i18n/core.mjs";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { useExperience } from "../store/experience";
import { usePlayground } from "../store/playground";
import { candidateFixtures, missions } from "../simulation/playground.mjs";
import { Stream } from "./LabScene";
import type { Point3 } from "../content/world";

const mint = "#8de4c6",
  amber = "#ffca8d",
  red = "#f8919b",
  blue = "#93c8fc";
function Cube({
  at,
  size = [0.3, 0.3, 0.3],
  color = mint,
  glass = false,
}: {
  at: Point3;
  size?: Point3;
  color?: string;
  glass?: boolean;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glass ? 0.1 : 0.18}
        roughness={0.35}
        metalness={0.25}
        transparent={glass}
        opacity={glass ? 0.18 : 1}
        depthWrite={!glass}
      />
    </mesh>
  );
}
function Caption({
  text,
  at,
  width = 3,
  color = "#d1e6dd",
  back = false,
}: {
  text: string;
  at: Point3;
  width?: number;
  color?: string;
  back?: boolean;
}) {
  const { texture, aspect } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.font = "600 64px Source Sans 3 Variable";
    c.width = Math.ceil(
      Math.min(2048, Math.max(128, x.measureText(text).width + 40)),
    );
    x.font = "600 64px Source Sans 3 Variable";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = color;
    x.fillText(text, c.width / 2, 64, c.width - 20);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return { texture: t, aspect: c.width / c.height };
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={at} rotation={[0, back ? Math.PI : 0, 0]}>
      <planeGeometry
        args={[Math.min(width, 0.36 * aspect), Math.min(0.36, width / aspect)]}
      />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
function Pipe({
  points,
  color = mint,
  radius = 0.035,
}: {
  points: Point3[];
  color?: string;
  radius?: number;
}) {
  const geometry = useMemo(
    () =>
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        32,
        radius,
        6,
        false,
      ),
    [points, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        roughness={0.4}
      />
    </mesh>
  );
}
function Vessel({
  x,
  fraction,
  label,
  color,
}: {
  x: number;
  fraction: number;
  label: string;
  color: string;
}) {
  const fill = useRef<T.Mesh>(null),
    { invalidate } = useThree();
  useFrame((_, delta) => {
    if (!fill.current) return;
    const reduced = useExperience.getState().reducedMotion;
    const h = reduced
      ? fraction * 2
      : T.MathUtils.damp(
          fill.current.scale.y,
          fraction * 2,
          8,
          Math.min(delta, 0.05),
        );
    fill.current.scale.y = h;
    fill.current.position.y = 1.05 + h / 2;
    if (Math.abs(h - fraction * 2) > 0.001) invalidate();
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 2.2, 20, 1, true]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.16}
          side={T.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={fill} position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 1, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
        />
      </mesh>
      {[0.95, 3.1].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.43, 0.43, 0.12, 20]} />
          <meshStandardMaterial
            color="#547079"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
      <Caption
        text={`${label} · ${Math.round(fraction * 100)}%`}
        at={[0, 0.65, 0.5]}
        width={1.1}
        color={color}
      />
    </group>
  );
}
export function SandboxExhibit({ id }: { id: string }) {
  const p = usePlayground(),
    m = missions.find((m) => m.id === id)!,
    v = p.settings[id];
  return (
    <group name={`sandbox-${id}`}>
      <Cube at={[0, 0.45, 0]} size={[4.1, 0.35, 2.2]} color="#264954" />
      <Caption
        text="EXPERIMENT MODEL / FIXTURE"
        at={[0, 4.85, -0.8]}
        width={4}
        color={amber}
      />
      <Caption
        text={m.options[v].toUpperCase()}
        at={[0, 4.35, -0.8]}
        width={3.8}
        color={v ? mint : red}
      />
      {id === "pieces" && (
        <>
          <Cube at={[0, 1.35, 0]} size={[4, 0.15, 0.8]} color="#496574" />
          {(v
            ? ["The", "cur", "ious", "cat", "sleeps"]
            : ["The", "curious", "cat", "sleeps"]
          ).map((word, i, arr) => (
            <group
              key={word}
              position={[(i - (arr.length - 1) / 2) * 0.76, 2, 0]}
            >
              <Cube
                at={[0, 0, 0]}
                size={[0.65, 0.5, 0.5]}
                color={[mint, amber, blue, "#c4a1f2", mint][i]}
              />
              <Caption
                text={word}
                at={[0, 0, 0.28]}
                width={0.64}
                color="#112b32"
              />
            </group>
          ))}
          <Pipe
            points={[
              [-2, 1, 0],
              [-2, 1.5, 0],
              [-2, 3, 0],
              [2, 3, 0],
              [2, 1.5, 0],
            ]}
            color={amber}
          />
          <Cube
            at={[v ? -0.38 : -0.76, 2.65, 0]}
            size={[0.035, 0.5, 0.6]}
            color={amber}
          />
          <Caption text="The curious cat sleeps" at={[0, 0.8, 1]} width={3.5} />
        </>
      )}
      {id === "positions" && (
        <>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[(i - 1) * 1.3, 0, 0]}>
              <Cube at={[0, 1.8, 0]} size={[0.75, 0.75, 0.75]} color={blue} />
              <Caption
                text="cat"
                at={[0, 1.8, 0.4]}
                width={0.7}
                color="#142e36"
              />
              <Cube
                at={[0, 2.85, 0]}
                size={[0.7, 0.38, 0.45]}
                color={v ? [mint, amber, "#c4a1f2"][i] : "#405962"}
              />
              <Caption
                text={v ? `P${i}` : t("Belum ada")}
                at={[0, 2.85, 0.25]}
                width={0.65}
                color="#122b33"
              />
              <Pipe
                points={[
                  [0, 2.65, 0],
                  [0, 2.35, 0],
                  [0, 2.2, 0],
                ]}
                color={v ? mint : "#405962"}
              />
              <Caption
                text={v ? `E(cat) + P${i}` : "E(cat)"}
                at={[0, 1, 0.6]}
                width={1.2}
              />
            </group>
          ))}
        </>
      )}
      {id === "causal" && (
        <>
          <Cube at={[0, 1.05, 1]} size={[0.55, 0.45, 0.4]} color={amber} />
          <Caption
            text="QUERY 2"
            at={[0, 0.68, 1.3]}
            width={1.5}
            color={amber}
          />
          {[0, 1, 2, 3, 4].map((i) => {
            const blocked = v === 1 && i > 2;
            const x = (i - 2) * 0.78;
            return (
              <group key={i}>
                <Cube
                  at={[x, 3, 0]}
                  size={[0.5, 0.5, 0.5]}
                  color={blocked ? "#43505c" : mint}
                />
                <Caption
                  text={`K${i}`}
                  at={[x, 3, 0.28]}
                  width={0.6}
                  color={blocked ? "#c2b6be" : "#132d34"}
                />
                <Stream
                  points={[
                    [0, 1.3, 1],
                    [x, 2, 0.6],
                    [x, blocked ? 2.2 : 2.75, 0.1],
                  ]}
                  color={blocked ? red : mint}
                  count={3}
                  radius={0.02}
                />
                {blocked && (
                  <>
                    <Cube
                      at={[x, 2.4, 0.2]}
                      size={[0.68, 0.12, 0.75]}
                      color={red}
                    />
                    <Caption
                      text="−∞ → 0"
                      at={[x, 2.4, 0.63]}
                      width={0.72}
                      color="#ffcfce"
                    />
                  </>
                )}
              </group>
            );
          })}
          <Caption
            text={
              v
                ? t("MASA LALU + SAAT INI / 3 JALUR VALID")
                : t("2 FUTURE LINKS / KEBOCORAN")
            }
            at={[0, 3.8, -0.8]}
            width={3.8}
            color={v ? mint : red}
          />
        </>
      )}
      {id === "residual" && (
        <>
          <Cube at={[0, 2.3, 0]} size={[1.6, 0.7, 0.75]} color="#b5a1ea" />
          <Caption text="F(x)" at={[0, 2.3, 0.4]} width={1.4} color="#182c38" />
          <Pipe
            points={[
              [0, 0.8, 0],
              [0, 1.3, 0],
              [0, 1.9, 0],
            ]}
            color={blue}
          />
          <Pipe
            points={[
              [0, 2.7, 0],
              [0, 3, 0],
              [0, 3.45, 0],
            ]}
            color={blue}
          />
          <Pipe
            points={[
              [0, 1, 0],
              [-1.6, 1, 0],
              [-1.6, 2, 0],
            ]}
            color={v ? mint : red}
          />
          <Pipe
            points={[
              [-1.6, 2.5, 0],
              [-1.6, 3.5, 0],
              [0, 3.5, 0],
            ]}
            color={v ? mint : red}
          />
          {v === 1 && (
            <Stream
              points={[
                [-1.6, 2, 0],
                [-1.6, 2.25, 0],
                [-1.6, 2.5, 0],
              ]}
              color={mint}
              count={4}
              radius={0.07}
            />
          )}
          <mesh position={[0, 3.5, 0]}>
            <sphereGeometry args={[0.26, 16, 12]} />
            <meshStandardMaterial
              color={amber}
              emissive={amber}
              emissiveIntensity={0.3}
            />
          </mesh>
          <Caption text="+" at={[0, 3.5, 0.28]} width={0.5} color="#15302f" />
          <Caption
            text={v ? "x + F(x)" : t("F(x) / TANPA INPUT")}
            at={[0.5, 0.8, 0.8]}
            width={3}
          />
        </>
      )}
      {id === "temperature" &&
        candidateFixtures[v].map((fraction: number, i: number) => (
          <Vessel
            key={i}
            x={(i - 1) * 1.25}
            fraction={fraction}
            label={["A", "B", "C"][i]}
            color={[mint, amber, "#c4a1f2"][i]}
          />
        ))}
      {id === "memory" && (
        <>
          {[-1, 1].map((x, col) => (
            <group key={col}>
              <Cube at={[x, 2, 0]} size={[1.35, 2.5, 0.8]} color="#254550" />
              {[0, 1, 2, 3, 4].map((row) => (
                <group key={row}>
                  <Cube
                    at={[x, 1.1 + row * 0.45, 0.5]}
                    size={[1.1, 0.26, 0.25]}
                    color={v && row < 4 ? mint : amber}
                  />
                  <Caption
                    text={`${col ? "V" : "K"}${row}${v && row < 4 ? "  REUSE" : "  NEW"}`}
                    at={[x, 1.1 + row * 0.45, 0.65]}
                    width={1.05}
                    color="#143039"
                  />
                </group>
              ))}
              <Caption
                text={col ? "VALUES" : "KEYS"}
                at={[x, 3.5, 0.3]}
                width={1.4}
              />
            </group>
          ))}
          <Caption
            text={
              v
                ? t("4 PASANG LAMA / 1 PASANG BARU")
                : t("5 POSISI DIPROYEKSIKAN ULANG")
            }
            at={[0, 0.7, 0.8]}
            width={3.8}
          />
        </>
      )}
    </group>
  );
}

export function ResearchProps() {
  const rack = useRef<T.InstancedMesh>(null),
    drone = useRef<T.Group>(null),
    phase = useRef(0),
    { invalidate } = useThree();
  const completed = usePlayground((s) => s.completed.length);
  useEffect(() => {
    const dummy = new T.Object3D();
    let i = 0;
    for (const x of [-17, -14, 14, 17])
      for (let j = 0; j < 7; j++) {
        dummy.position.set(x, 0.7 + j * 0.54, 12);
        dummy.scale.set(2.2, 0.4, 0.7);
        dummy.updateMatrix();
        rack.current!.setMatrixAt(i, dummy.matrix);
        rack.current!.setColorAt(
          i++,
          new T.Color(j % 2 ? "#284657" : "#3c606a"),
        );
      }
    rack.current!.instanceMatrix.needsUpdate = true;
    if (rack.current!.instanceColor)
      rack.current!.instanceColor.needsUpdate = true;
  }, []);
  useFrame((_, dt) => {
    const s = useExperience.getState();
    if (!drone.current || !s.playing || s.reducedMotion || document.hidden)
      return;
    phase.current += Math.min(dt, 0.05);
    drone.current.position.y = 5.7 + Math.sin(phase.current * 0.7) * 0.15;
    drone.current.rotation.y = phase.current * 0.15;
    invalidate();
  });
  return (
    <group name="research-equipment">
      <instancedMesh ref={rack} args={[undefined, undefined, 28]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.55} roughness={0.45} />
      </instancedMesh>
      {[-17, -14, 14, 17].map((x) => (
        <group key={x}>
          <Cube at={[x, 4.6, 12]} size={[2.5, 0.12, 1]} color="#537a81" />
          <Caption
            text="KV ARCHIVE / PER LAYER"
            back
            at={[x, 4.95, 11.5]}
            width={2.6}
          />
          {[0, 1, 2].map((i) => (
            <Cube
              key={i}
              at={[x - 0.7 + i * 0.7, 4.25, 12.4]}
              size={[0.12, 0.12, 0.05]}
              color={mint}
            />
          ))}
        </group>
      ))}
      {[-8, 0, 8].map((x) => (
        <Pipe
          key={x}
          points={[
            [x, 6.8, -10],
            [x, 7.5, -3],
            [x, 7.5, 6],
            [x, 6.8, 11],
          ]}
          color="#446775"
          radius={0.12}
        />
      ))}
      <group ref={drone} position={[0, 5.7, 1]}>
        <mesh>
          <octahedronGeometry args={[0.45, 1]} />
          <meshStandardMaterial
            color="#9db7b5"
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>
        <Cube at={[0, 0, 0.4]} size={[0.22, 0.08, 0.08]} color={amber} />
        {[-1, 1].map((x) => (
          <mesh
            key={x}
            position={[x * 0.7, 0.1, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.36, 0.055, 8, 24]} />
            <meshStandardMaterial
              color={mint}
              emissive={mint}
              emissiveIntensity={0.4}
            />
          </mesh>
        ))}
      </group>
      <Caption
        text={`DISCOVERY ARCHIVE / ${completed} OF 6 VERIFIED`}
        back
        at={[0, 5, 13.6]}
        width={9}
      />
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[(i - 2.5) * 0.8, 4, 13.2]}>
          <octahedronGeometry args={[0.25]} />
          <meshStandardMaterial
            color={i < completed ? amber : "#3c5963"}
            emissive={i < completed ? amber : "#000000"}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
