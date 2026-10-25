import { t } from "../i18n/core.mjs";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { Instrument, Stream } from "./LabScene";
import Player from "./Player";
import Hands from "./Hands";
import { SandboxExhibit, ResearchProps } from "./SandboxExhibit";
import { usePlayground } from "../store/playground";
import { missions } from "../simulation/playground.mjs";
import { stations } from "../content/lessons";
import { worldStations, type Point3 } from "../content/world";
import { useExperience } from "../store/experience";
import { useGame } from "../store/game";
import type { Snapshot } from "../simulation/snapshot";

function Block({
  at,
  size,
  color = "#233842",
  glow = false,
}: {
  at: Point3;
  size: Point3;
  color?: string;
  glow?: boolean;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      {glow ? (
        <meshBasicMaterial color={color} toneMapped={false} />
      ) : (
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.25} />
      )}
    </mesh>
  );
}
function Sign({
  text,
  at,
  width = 4,
  height = 0.7,
  color = "#d9ebe6",
  rotation = [0, 0, 0],
}: {
  text: string;
  at: Point3;
  width?: number;
  height?: number;
  color?: string;
  rotation?: Point3;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let font = 66;
    ctx.font = `600 ${font}px "Source Sans 3 Variable", sans-serif`;
    while (ctx.measureText(text).width > 960) {
      font -= 2;
      ctx.font = `600 ${font}px "Source Sans 3 Variable", sans-serif`;
    }
    ctx.fillText(text, 512, 128);
    const result = new T.CanvasTexture(canvas);
    result.colorSpace = T.SRGBColorSpace;
    return result;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={at} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Facility() {
  const tiles = useRef<T.InstancedMesh>(null),
    struts = useRef<T.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new T.Object3D();
    let i = 0;
    for (let x = -19; x < 20; x += 2)
      for (let z = -12; z < 14; z += 2) {
        dummy.position.set(x, -0.16, z);
        dummy.scale.set(1.975, 0.2, 1.975);
        dummy.updateMatrix();
        tiles.current!.setMatrixAt(i, dummy.matrix);
        tiles.current!.setColorAt(
          i++,
          new T.Color(Math.round(x + z) % 4 === 1 ? "#25353c" : "#203038"),
        );
      }
    tiles.current!.instanceMatrix.needsUpdate = true;
    if (tiles.current!.instanceColor)
      tiles.current!.instanceColor.needsUpdate = true;
    i = 0;
    for (const x of [-19, -8, 8, 19])
      for (const z of [-12.7, 13.7]) {
        dummy.position.set(x, 4.4, z);
        dummy.scale.set(0.3, 9, 0.35);
        dummy.updateMatrix();
        struts.current!.setMatrixAt(i++, dummy.matrix);
      }
    struts.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={tiles} args={[undefined, undefined, 260]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.76} metalness={0.18} />
      </instancedMesh>
      <Block at={[0, -0.28, 1]} size={[40, 0.2, 28]} color="#101e27" />
      <Block at={[0, 4.4, -13]} size={[40, 9, 0.3]} color="#182c36" />
      <Block at={[0, 4.4, 14]} size={[40, 9, 0.3]} color="#182c36" />
      <Block at={[-20, 4.4, 0.5]} size={[0.3, 9, 27]} color="#20323c" />
      <Block at={[20, 4.4, 0.5]} size={[0.3, 9, 27]} color="#20323c" />
      <Block at={[0, 9, 0.5]} size={[40, 0.2, 27]} color="#122630" />
      <instancedMesh ref={struts} args={[undefined, undefined, 8]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#4a6268"
          metalness={0.65}
          roughness={0.4}
        />
      </instancedMesh>
      {[-16, -8, 0, 8, 16].map((x) => (
        <group key={x}>
          <Block at={[x, 8.5, 0.5]} size={[0.18, 0.3, 27]} color="#354c54" />
          <Block
            at={[x, 8.32, -1]}
            size={[0.12, 0.025, 15]}
            color="#b5dfd9"
            glow
          />
        </group>
      ))}
      <Block
        at={[0, 0.025, 0.7]}
        size={[35, 0.025, 0.025]}
        color="#6aa99a"
        glow
      />
      <Block
        at={[0, 0.025, 1.3]}
        size={[35, 0.025, 0.025]}
        color="#6aa99a"
        glow
      />
      <Block
        at={[0, 7, -12.78]}
        size={[39, 0.055, 0.04]}
        color="#80c5c7"
        glow
      />
      <Block at={[0, 7, 13.78]} size={[39, 0.055, 0.04]} color="#c6aa70" glow />
      <Sign
        text="N E U R O L A B    /    DECODER RESEARCH FACILITY"
        at={[0, 7.9, -12.78]}
        width={21}
        height={0.95}
      />
      <Sign
        text="96 BLOCKS     /     ONE TOKEN AT A TIME"
        at={[0, 7.9, 13.78]}
        rotation={[0, Math.PI, 0]}
        width={20}
        height={0.95}
        color="#d3bd91"
      />
      <Sign
        text="INPUT   →   REPRESENTATION   →   CONTEXT"
        at={[0, 0.04, 2.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={16}
        height={1.2}
        color="#8ab1aa"
      />
      {[-16, 0, 16].map((x) => (
        <group key={`bench-${x}`}>
          <Block at={[x, 0.4, -10.9]} size={[2.5, 0.8, 1.2]} color="#304850" />
          <Block
            at={[x, 0.82, -10.9]}
            size={[2.7, 0.08, 1.4]}
            color="#5d787c"
          />
          <Block
            at={[x, 1.25, -11.3]}
            size={[1.1, 0.65, 0.1]}
            color="#132b33"
          />
          <Block
            at={[x, 1.25, -11.23]}
            size={[0.9, 0.42, 0.01]}
            color="#589a8c"
            glow
          />
        </group>
      ))}
    </group>
  );
}

function Laboratory({
  snapshot: p,
  onFailure,
}: {
  snapshot: Snapshot;
  onFailure: () => void;
}) {
  const s = useExperience(),
    aimed = useGame((g) => g.aimed),
    waypoint = useGame((g) => g.waypoint);
  const tool = useGame((g) => g.tool),
    mission = usePlayground((p) => p.active);
  const exhibit = missions.find((m) => m.id === mission);
  const { gl } = useThree();
  useEffect(() => {
    useGame.setState({ ready: true });
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      useGame.setState({ ready: false });
    };
  }, [gl, onFailure]);
  useFrame(() => {
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    gl.domElement.dataset.tool = useGame.getState().tool;
  });
  return (
    <>
      <color attach="background" args={["#102630"]} />
      <fog attach="fog" args={["#102630", 20, 52]} />
      <ambientLight intensity={1.25} />
      <hemisphereLight args={["#d7efef", "#26333b", 1.8]} />
      <directionalLight
        position={[-10, 14, 5]}
        intensity={2.6}
        color="#d1ece9"
      />
      <directionalLight
        position={[15, 10, -6]}
        intensity={1.8}
        color="#9cafd6"
      />
      <Facility />
      <ResearchProps />
      <Stream
        points={[
          [-12, 0.03, -5],
          [-4, 0.03, -5],
          [4, 0.03, -5],
          [12, 0.03, -5],
          [16, 0.03, 1],
          [12, 0.03, 7],
          [4, 0.03, 7],
          [-4, 0.03, 7],
        ]}
        color="#8ae2c5"
        count={48}
        radius={0.028}
      />
      {stations.map((station, i) => {
        const { position, yaw, zone } = worldStations[station.id];
        const active = station.id === s.station,
          target = station.id === aimed;
        return (
          <group key={station.id} position={position} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[2.25, 2.4, 0.24, 48]} />
              <meshStandardMaterial
                color="#1a303b"
                roughness={0.45}
                metalness={0.5}
              />
            </mesh>
            <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[2.13, 2.18, 64]} />
              <meshBasicMaterial
                color={target ? "#e2fff2" : station.color}
                transparent
                opacity={target ? 1 : 0.65}
              />
            </mesh>
            <Block
              at={[-2.65, 3, -1.6]}
              size={[0.14, 6, 0.18]}
              color="#42616a"
            />
            <Block
              at={[2.65, 3, -1.6]}
              size={[0.14, 6, 0.18]}
              color="#42616a"
            />
            <Block
              at={[0, 6, -1.6]}
              size={[5.44, 0.16, 0.18]}
              color="#42616a"
            />
            <Block
              at={[0, 6.15, -1.6]}
              size={[5.3, 0.025, 0.06]}
              color={station.color}
              glow
            />
            <Block
              at={[0, 5.5, -1.65]}
              size={[5.2, 0.65, 0.09]}
              color="#182e39"
            />
            <Sign
              text={`${String(i + 1).padStart(2, "0")}   /   ${zone}`}
              at={[0, 5.5, -1.59]}
              width={4.7}
              height={0.6}
              color={station.color}
            />
            <Sign
              text={station.title}
              at={[0, 0.7, 2.26]}
              width={3.8}
              height={0.55}
            />
            <Sign
              text={station.short}
              at={[0, 0.37, 2.27]}
              width={3.5}
              height={0.3}
              color="#9fbdbb"
            />
            {tool === "tuner" && exhibit?.station === station.id ? (
              <SandboxExhibit id={exhibit.id} />
            ) : (
              <Instrument id={station.id} p={p} detail={active} />
            )}
            {waypoint === station.id && (
              <mesh position={[0, 4.8, 0]} rotation={[0, 0, Math.PI]}>
                <coneGeometry args={[0.12, 0.26, 4]} />
                <meshBasicMaterial color="#d4f5ad" />
              </mesh>
            )}
            <Block
              at={[1.8, 0.6, 2.8]}
              size={[0.12, 1.2, 0.12]}
              color="#617c80"
            />
            <group position={[1.8, 1.25, 2.8]} rotation={[-0.3, 0, 0]}>
              <Block at={[0, 0, 0]} size={[0.65, 0.38, 0.07]} color="#3a5560" />
              <Block
                at={[0, 0, 0.04]}
                size={[0.53, 0.25, 0.008]}
                color={station.color}
                glow
              />
            </group>
          </group>
        );
      })}
      <Player />
      <Hands />
    </>
  );
}

export default function SimulationWorld({
  snapshot,
  onCanvas,
  onFailure,
}: {
  snapshot: Snapshot;
  onCanvas: (canvas: HTMLCanvasElement) => void;
  onFailure: () => void;
}) {
  const quality = useExperience((s) => s.quality);
  return (
    <Canvas
      className="simulation-canvas"
      frameloop="demand"
      dpr={quality === "low" ? 1 : quality === "high" ? 1.75 : 1.25}
      camera={{ position: [-12, 1.72, 1.4], fov: 68, near: 0.04, far: 90 }}
      gl={{
        antialias: quality !== "low",
        powerPreference: "high-performance",
        toneMapping: T.ACESFilmicToneMapping,
      }}
      onCreated={(state) => {
        state.setEvents({ enabled: false });
        onCanvas(state.gl.domElement);
      }}
      fallback={
        <div className="world-fallback">
          {t(
            "WebGL tidak tersedia. Gunakan mode diagram untuk menjelajahi semua instrumen.",
          )}
        </div>
      }
    >
      <Laboratory snapshot={snapshot} onFailure={onFailure} />
    </Canvas>
  );
}
