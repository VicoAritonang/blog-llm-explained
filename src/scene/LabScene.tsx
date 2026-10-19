import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  Component,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as T from "three";
import { batchInstrument } from "./batch-instrument.mjs";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { stations } from "../content/lessons";
import { useExperience } from "../store/experience";
import type { Snapshot } from "../simulation/snapshot";
import { VOCAB, ANALOGY, analogyResult } from "../simulation/engine.mjs";
const assetBase =
  import.meta.env.VITE_ASSET_BASE_URL ??
  `${import.meta.env.BASE_URL}assets/lab-v1/`;
class AssetBoundary extends Component<
  { children: ReactNode; id: string },
  { failed: boolean; retry: number }
> {
  state = { failed: false, retry: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(previous: { id: string }) {
    if (previous.id !== this.props.id && this.state.failed)
      this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? (
      <Html center position={[0, 2.5, 1]}>
        <div className="asset-error">
          Instrumen belum tersedia.
          <button
            onClick={() => {
              useGLTF.clear(assetBase + this.props.id + ".glb");
              this.setState({ failed: false, retry: this.state.retry + 1 });
            }}
          >
            Coba lagi
          </button>
        </div>
      </Html>
    ) : (
      <Suspense fallback={<Placeholder />} key={this.state.retry}>
        {this.props.children}
      </Suspense>
    );
  }
}
function Placeholder() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[2.8, 2, 1.6]} />
      <meshStandardMaterial color="#30444a" wireframe />
    </mesh>
  );
}
function Instrument({ name }: { name: string }) {
  const { scene } = useGLTF(assetBase + name + ".glb");
  const model = useMemo(() => batchInstrument(scene, name), [scene, name]);
  useEffect(
    () => () => {
      model.traverse((o: T.Object3D) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
    },
    [model],
  );
  return <primitive object={model} dispose={null} />;
}
function Room() {
  const tiles = useRef<T.InstancedMesh>(null),
    arches = useRef<T.InstancedMesh>(null);
  useEffect(() => {
    const m = new T.Matrix4();
    let i = 0;
    for (let x = -16; x <= 16; x += 4)
      for (let z = -10; z <= 10; z += 4) {
        m.makeTranslation(x, -0.1, z);
        tiles.current!.setMatrixAt(i++, m);
      }
    tiles.current!.instanceMatrix.needsUpdate = true;
    i = 0;
    for (const x of [-17, -8, 0, 8, 17]) {
      m.makeTranslation(x, 4, -11.8);
      arches.current!.setMatrixAt(i++, m);
    }
    arches.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh
        ref={tiles}
        args={[undefined, undefined, 54]}
        receiveShadow
      >
        <boxGeometry args={[3.96, 0.18, 3.96]} />
        <meshStandardMaterial color="#223638" roughness={0.84} />
      </instancedMesh>
      <instancedMesh ref={arches} args={[undefined, undefined, 5]}>
        <boxGeometry args={[0.18, 8, 0.2]} />
        <meshStandardMaterial color="#83938b" metalness={0.5} roughness={0.5} />
      </instancedMesh>
      <mesh position={[0, 2, -12]}>
        <boxGeometry args={[36, 4, 0.18]} />
        <meshStandardMaterial color="#253d3e" />
      </mesh>
      <mesh position={[0, 7.6, -11.8]}>
        <boxGeometry args={[36, 0.12, 0.2]} />
        <meshStandardMaterial color="#789d99" />
      </mesh>
      {[-7, 7].map((z) => (
        <mesh key={z} position={[0, 0.012, z > 0 ? 4 : -4]}>
          <boxGeometry args={[26, 0.025, 0.035]} />
          <meshBasicMaterial color="#42d7ec" />
        </mesh>
      ))}
      <mesh position={[15.2, 0.014, 0]}>
        <boxGeometry args={[0.035, 0.025, 8]} />
        <meshBasicMaterial color="#42d7ec" />
      </mesh>
      <gridHelper
        args={[36, 36, "#354c4c", "#2c4546"]}
        position={[0, 0.002, 0]}
      />
    </group>
  );
}
function Cells({
  snapshot: p,
  matrix,
  center = [0, 2.5, 0.9],
  size = [2.5, 2.3],
  accent,
  onPick,
}: {
  snapshot: Snapshot;
  matrix?: number[][];
  center?: [number, number, number];
  size?: [number, number];
  accent?: string;
  onPick?: (row: number, column: number) => void;
}) {
  const s = useExperience(),
    ref = useRef<T.InstancedMesh>(null);
  const values = (matrix ?? p.values)
    .slice(0, 12)
    .map((row) => row.slice(0, 8));
  const rows = values.length,
    cols = values[0].length;
  useEffect(() => {
    const dummy = new T.Object3D(),
      max = Math.max(...values.flat().map(Math.abs), 1e-6);
    values.forEach((row, i) =>
      row.forEach((v, j) => {
        dummy.position.set(
          center[0] + ((j - (cols - 1) / 2) * size[0]) / cols,
          center[1] + (((rows - 1) / 2 - i) * size[1]) / rows,
          center[2],
        );
        dummy.scale.set(
          (size[0] / cols) * 0.84,
          Math.min((size[1] / rows) * 0.8, 0.4),
          0.025,
        );
        dummy.updateMatrix();
        const index = i * cols + j;
        ref.current!.setMatrixAt(index, dummy.matrix);
        const masked =
          p.mask?.[i]?.[j] ||
          (s.station === "attention" &&
            s.step >= 3 &&
            j > i &&
            ["A", "masked"].includes(p.op.tensor));
        ref.current!.setColorAt(
          index,
          new T.Color(
            masked
              ? "#586565"
              : i === p.row && j === (matrix ? p.column % cols : p.column)
                ? "#ffffff"
                : (accent ?? (v < 0 ? "#a88ee8" : "#42d7ec")),
          ).multiplyScalar(masked ? 0.45 : 0.3 + (Math.abs(v) / max) * 0.7),
        );
      }),
    );
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor)
      ref.current!.instanceColor.needsUpdate = true;
  }, [p, values, rows, cols, matrix, center, size, accent]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, rows * cols]}
      onClick={(e) => {
        e.stopPropagation();
        const index = e.instanceId!;
        if (onPick) onPick(Math.floor(index / cols), index % cols);
        else
          s.patch({
            token: Math.floor(index / cols),
            column: index % cols,
            tab: "numbers",
            traced: true,
          });
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.45} metalness={0.12} />
    </instancedMesh>
  );
}
function TokenCapsules({ snapshot: p }: { snapshot: Snapshot }) {
  const s = useExperience();
  if (s.step === 0)
    return (
      <Html position={[0, 1.65, 0.6]} center distanceFactor={9}>
        <span className="world-tensor-label">
          {p.ids.map((id: number) => VOCAB[id]).join("")}
        </span>
      </Html>
    );
  const spacing = Math.min(0.78, 4.4 / p.ids.length);
  return (
    <group>
      {p.ids.map((id: number, i: number) => (
        <group
          key={i}
          position={[(i - (p.ids.length - 1) / 2) * spacing, 1.43, 0.6]}
          onClick={(e) => {
            e.stopPropagation();
            s.patch({ token: i, column: i, tab: "numbers" });
          }}
        >
          <mesh>
            <boxGeometry args={[spacing * 0.86, 0.34, 0.31]} />
            <meshStandardMaterial
              color={s.token === i ? "#ffffff" : "#94c4bf"}
            />
          </mesh>
          <mesh position={[0, -0.11, 0.16]}>
            <boxGeometry args={[spacing * 0.65, 0.025, 0.02]} />
            <meshBasicMaterial color="#42d7ec" />
          </mesh>
          {i < (s.quality === "low" ? 6 : 12) && (
            <Html position={[0, 0.4, 0]} center distanceFactor={9}>
              <span className="world-token-label">
                {VOCAB[id].replaceAll(" ", "·")}
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
function VectorArrow({
  from,
  to,
  color,
}: {
  from: T.Vector3;
  to: T.Vector3;
  color: string;
}) {
  const delta = to.clone().sub(from),
    length = delta.length(),
    direction = delta.clone().normalize();
  const rotation = new T.Quaternion().setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    direction,
  );
  const tip = to.clone().addScaledVector(direction, -0.075),
    body = from.clone().lerp(to, 0.5);
  return (
    <group>
      <mesh position={body} quaternion={rotation}>
        <cylinderGeometry
          args={[0.017, 0.017, Math.max(0.01, length - 0.15), 8]}
        />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={tip} quaternion={rotation}>
        <coneGeometry args={[0.07, 0.15, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
function AnalogySpace() {
  const s = useExperience(),
    origin = new T.Vector3(0, 1.4, 0);
  const project = (v: number[]) =>
    new T.Vector3(v[0], v[1], v[2]).multiplyScalar(1.3);
  const king = origin.clone().add(project(ANALOGY.king));
  const minus = king.clone().sub(project(ANALOGY.man));
  const result = origin.clone().add(project(analogyResult().vector));
  const queen = origin.clone().add(project(ANALOGY.queen));
  return (
    <group>
      {s.step === 0 ? (
        (["king", "man", "woman"] as const).map((word, i) => (
          <group
            key={word}
            position={origin.clone().add(project(ANALOGY[word]))}
          >
            <mesh>
              <sphereGeometry args={[0.06, 12, 8]} />
              <meshStandardMaterial
                color={["#42d7ec", "#aa8df5", "#ffbe63"][i]}
              />
            </mesh>
            <Html position={[0, 0.18, 0]} center distanceFactor={9}>
              <span className="world-token-label">{word}</span>
            </Html>
          </group>
        ))
      ) : (
        <>
          <VectorArrow from={origin} to={king} color="#42d7ec" />
          <VectorArrow from={king} to={minus} color="#aa8df5" />
          <VectorArrow from={minus} to={result} color="#ffbe63" />
        </>
      )}
      {s.step === 2 && (
        <>
          <VectorArrow from={origin} to={result} color="#69d9b1" />
          <mesh position={queen}>
            <sphereGeometry args={[0.075, 12, 8]} />
            <meshStandardMaterial color="#69d9b1" wireframe />
          </mesh>
          <Html
            position={queen.clone().add(new T.Vector3(0, 0.3, 0))}
            center
            distanceFactor={9}
          >
            <span className="world-token-label">≈ queen · fixture</span>
          </Html>
        </>
      )}
      <Html position={[0, 1.1, 1.8]} center distanceFactor={9}>
        <span className="world-token-label">
          Komponen 1–3 · cosine pada 4 dimensi sumber
        </span>
      </Html>
    </group>
  );
}
function StationData({ snapshot: p }: { snapshot: Snapshot }) {
  const s = useExperience();
  if (s.station === "analogy") return <AnalogySpace />;
  if (s.station === "tokenizer") return <TokenCapsules snapshot={p} />;
  if (s.station === "sampling" && p.op.tensor !== "H")
    return <Bars snapshot={p} />;
  if (s.station === "qkv")
    return (
      <>
        {(["Q", "K", "V"] as const).map((name, i) => (
          <Cells
            key={name}
            snapshot={p}
            matrix={p.h[name]}
            center={[(i - 1) * 1.82, 2.15, 0.17]}
            size={[1.3, 1.85]}
            accent={["#42d7ec", "#aa8df5", "#ffbe63"][i]}
            onPick={(row, column) =>
              s.patch({
                step: i + 1,
                token: row,
                column: s.head * 4 + column,
                tab: "numbers",
                traced: true,
              })
            }
          />
        ))}
      </>
    );
  if (s.station === "attention")
    return <Cells snapshot={p} center={[0, 2.65, -0.285]} size={[3.95, 2.5]} />;
  if (s.station === "cache")
    return (
      <>
        {(["K", "V"] as const).map((name, i) => (
          <Cells
            key={name}
            snapshot={p}
            matrix={p.b[name]}
            center={[i === 0 ? -0.94 : 0.94, 2.2, 0.93]}
            size={[1.5, 3.25]}
            accent={i === 0 ? "#aa8df5" : "#ffbe63"}
            onPick={(row, column) =>
              s.patch({
                step: i,
                token: row,
                column,
                tab: "numbers",
                traced: true,
              })
            }
          />
        ))}
      </>
    );
  if (s.station === "transformer")
    return <Cells snapshot={p} center={[0, 2.8, 1.5]} size={[2.7, 3.4]} />;
  return <Cells snapshot={p} center={[0, 2.2, 1.15]} size={[2.5, 2.0]} />;
}
function AttentionBeams({ snapshot: p }: { snapshot: Snapshot }) {
  const row = Math.min(p.row, p.attention.A.length - 1),
    a = p.attention.A[row];
  return (
    <group>
      {a.map((weight: number, i: number) => {
        if (!weight) return null;
        const from = new T.Vector3(0, 3.7, 1),
          to = new T.Vector3((i - (a.length - 1) / 2) * 0.45, 1.7, 1.8);
        const direction = to.clone().sub(from),
          mid = to.clone().add(from).multiplyScalar(0.5);
        const quaternion = new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          direction.clone().normalize(),
        );
        return (
          <mesh key={i} position={mid} quaternion={quaternion}>
            <cylinderGeometry
              args={[
                0.008 + weight * 0.045,
                0.008 + weight * 0.045,
                direction.length(),
                6,
              ]}
            />
            <meshBasicMaterial
              color="#ffbe63"
              transparent
              opacity={0.35 + weight * 0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}
function Bars({ snapshot: p }: { snapshot: Snapshot }) {
  const values = p.values[0];
  const max = Math.max(...values.map(Math.abs), 0.01);
  return (
    <group>
      {values.slice(0, 16).map((v, i) => (
        <mesh
          key={i}
          position={[(i - 7.5) * 0.2, 1.05 + (Math.abs(v) / max) * 1.4, 0.85]}
        >
          <boxGeometry
            args={[0.13, Math.max(0.04, (Math.abs(v) / max) * 2.8), 0.14]}
          />
          <meshStandardMaterial
            color={v < 0 ? "#a88ee8" : "#69d9b1"}
            emissive={v < 0 ? "#a88ee8" : "#69d9b1"}
            emissiveIntensity={0.16}
          />
        </mesh>
      ))}
    </group>
  );
}
function CameraController() {
  const s = useExperience(),
    { camera, gl, invalidate } = useThree();
  const orbit = useRef<any>(null),
    walk = useRef<PointerLockControls | null>(null),
    keys = useRef(new Set<string>()),
    transitioning = useRef(false);
  const station = stations.find((x) => x.id === s.station)!;
  const target = useMemo(
    () =>
      new T.Vector3(
        station.position[0],
        station.id === "transformer" ? 2.7 : 2.1,
        station.position[2],
      ),
    [station],
  );
  const destination = useMemo(
    () =>
      s.overview
        ? new T.Vector3(26, 25, 32)
        : new T.Vector3(
            station.position[0] + 1.3,
            station.id === "transformer" ? 5.2 : 4.6,
            station.position[2] + (station.position[2] < 0 ? 8.1 : -8.1),
          ),
    [station, s.overview],
  );
  useEffect(() => {
    if (s.camera === "walk") return;
    transitioning.current = s.camera === "guided";
    if (s.reducedMotion || s.camera === "orbit") {
      camera.position.copy(destination);
      orbit.current?.target.copy(s.overview ? new T.Vector3(0, 1, 0) : target);
      orbit.current?.update();
      transitioning.current = false;
    }
    invalidate();
  }, [
    s.camera,
    s.station,
    s.overview,
    s.reducedMotion,
    destination,
    target,
    camera,
    invalidate,
  ]);
  useEffect(() => {
    const controls = new PointerLockControls(camera, gl.domElement);
    walk.current = controls;
    const unlock = () => {
      keys.current.clear();
      if (useExperience.getState().camera === "walk")
        useExperience.getState().patch({ camera: "guided" });
    };
    controls.addEventListener("unlock", unlock);
    const lock = () => {
      if (useExperience.getState().camera !== "walk") return;
      controls.lock();
    };
    gl.domElement.addEventListener("click", lock);
    const keydown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,button,[contenteditable="true"]',
        )
      )
        return;
      if (e.code === "Home") {
        camera.position.set(0, 1.65, 3);
        camera.lookAt(0, 1.65, -7);
        invalidate();
        e.preventDefault();
      }
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
    };
    const keyup = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    const rejected = () => useExperience.getState().patch({ camera: "orbit" });
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    document.addEventListener("pointerlockerror", rejected);
    return () => {
      controls.removeEventListener("unlock", unlock);
      controls.dispose();
      gl.domElement.removeEventListener("click", lock);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      document.removeEventListener("pointerlockerror", rejected);
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (s.camera === "walk") {
      camera.position.set(0, 1.65, 3);
      camera.lookAt(0, 1.65, -7);
      invalidate();
    } else if (walk.current?.isLocked) walk.current.unlock();
  }, [s.camera, camera, invalidate]);
  useFrame((_, dt) => {
    if (s.camera === "guided" && transitioning.current && orbit.current) {
      const look = s.overview ? new T.Vector3(0, 1, 0) : target;
      camera.position.lerp(destination, 1 - Math.exp(-Math.min(dt, 0.1) * 5));
      orbit.current.target.lerp(look, 1 - Math.exp(-Math.min(dt, 0.1) * 5));
      orbit.current.update();
      if (
        camera.position.distanceTo(destination) < 0.015 &&
        orbit.current.target.distanceTo(look) < 0.015
      )
        transitioning.current = false;
      else invalidate();
    }
    if (
      s.camera === "walk" &&
      keys.current.size &&
      walk.current?.isLocked &&
      !document.hidden
    ) {
      const step = Math.min(dt, 0.05) * 2.5;
      const forward =
        Number(keys.current.has("KeyW") || keys.current.has("ArrowUp")) -
        Number(keys.current.has("KeyS") || keys.current.has("ArrowDown"));
      const right =
        Number(keys.current.has("KeyD") || keys.current.has("ArrowRight")) -
        Number(keys.current.has("KeyA") || keys.current.has("ArrowLeft"));
      const magnitude = Math.max(1, Math.hypot(forward, right));
      walk.current.moveForward((forward * step) / magnitude);
      walk.current.moveRight((right * step) / magnitude);
      // Walk stays in the safe, unobstructed corridor; all props are outside it.
      camera.position.x = T.MathUtils.clamp(camera.position.x, -16, 16);
      camera.position.z = T.MathUtils.clamp(camera.position.z, -3.8, 3.8);
      camera.position.y = 1.65;
      invalidate();
    }
  });
  return (
    <OrbitControls
      ref={orbit}
      enabled={s.camera === "orbit"}
      enableDamping={false}
      minDistance={3}
      maxDistance={55}
      maxPolarAngle={Math.PI * 0.49}
      onStart={() => {
        transitioning.current = false;
      }}
    />
  );
}
function World({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience(),
    { gl } = useThree();
  useFrame(() => {
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
  });
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      s.patch({ playing: false, mode: "2d" });
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, s.patch]);
  return (
    <>
      <color attach="background" args={["#14282d"]} />
      <fog attach="fog" args={["#14282d", 32, 85]} />
      <hemisphereLight args={["#d7eef0", "#526457", 2.3]} />
      <directionalLight
        position={[-12, 20, 8]}
        intensity={2.6}
        color="#fff3de"
      />
      <directionalLight
        position={[12, 9, -10]}
        intensity={1.2}
        color="#8dc8d4"
      />
      <Room />
      <CameraController />
      {stations.map((station, i) => (
        <group
          key={station.id}
          position={station.position as unknown as [number, number, number]}
          rotation={[0, i >= 4 ? Math.PI : 0, 0]}
        >
          <mesh
            position={[0, 0.08, 0]}
            onClick={(e) => {
              e.stopPropagation();
              s.navigate(station.id);
            }}
          >
            <boxGeometry args={[5.2, 0.16, 4]} />
            <meshStandardMaterial
              color={s.station === station.id ? "#506462" : "#35494a"}
            />
          </mesh>
          {s.overview || s.station === station.id ? (
            <AssetBoundary id={station.model}>
              <Instrument name={station.model} />
            </AssetBoundary>
          ) : (
            <mesh
              position={[0, 0.8, 0]}
              onClick={(e) => {
                e.stopPropagation();
                s.navigate(station.id);
              }}
            >
              <boxGeometry args={[3, 1.6, 1.6]} />
              <meshStandardMaterial color="#6d8583" transparent opacity={0.6} />
            </mesh>
          )}
          <Html
            position={[0, 0.65, 2.1]}
            center
            distanceFactor={10}
            occlude={false}
          >
            <button
              className={`world-label ${s.station === station.id ? "active" : ""}`}
              onClick={() => s.navigate(station.id)}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              {station.title}
            </button>
          </Html>
          {s.station === station.id && !s.overview && (
            <>
              <Html
                position={[0, station.id === "transformer" ? 5.8 : 4.15, 0]}
                center
                distanceFactor={9}
              >
                <span className="world-tensor-label">
                  {snapshot.tensorId} · [{snapshot.values.length},{" "}
                  {snapshot.values[0].length}]
                  {snapshot.values[0].length > 8 ? " · 8 kolom pertama" : ""}
                </span>
              </Html>
              <StationData snapshot={snapshot} />
              {s.station === "attention" && s.step >= 4 && (
                <AttentionBeams snapshot={snapshot} />
              )}
            </>
          )}
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
      dpr={s.quality === "low" ? 1 : s.quality === "high" ? 1.5 : 1.25}
      camera={{ position: [-10, 4.1, 0], fov: 48, near: 0.05, far: 120 }}
      gl={{
        antialias: s.quality !== "low",
        powerPreference: "low-power",
        toneMapping: T.ACESFilmicToneMapping,
      }}
      fallback={
        <div className="scene-failure">
          <p>3D tidak tersedia. Pelajaran tetap dapat dilanjutkan.</p>
          <button className="button" onClick={() => s.patch({ mode: "2d" })}>
            Buka mode 2D
          </button>
        </div>
      }
    >
      <World snapshot={snapshot} />
    </Canvas>
  );
}
