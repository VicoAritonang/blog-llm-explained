import { useEffect, useRef, useState, type ComponentType } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import * as THREE from "three";
import { ISLAND, stationById, stationPose, stations, type StationId } from "./content";
import { useWorld } from "./store";
import { Label, Plinth, tap, useHoverCursor } from "./kit";
import { stationDone } from "./Island";
import * as Tanya from "./stations/Tanya";
import * as Token from "./stations/Token";
import * as Makna from "./stations/Makna";
import * as Sorot from "./stations/Sorot";
import * as Peluang from "./stations/Peluang";
import * as Latih from "./stations/Latih";
import * as Bukti from "./stations/Bukti";
import * as Skala from "./stations/Skala";

export const modules: Record<StationId, { Scene: ComponentType; Controls: ComponentType }> = {
  tanya: Tanya,
  token: Token,
  makna: Makna,
  sorot: Sorot,
  peluang: Peluang,
  latih: Latih,
  bukti: Bukti,
  skala: Skala,
};

const indexOf = (id: StationId) => stations.findIndex((s) => s.id === id);
const front = (id: StationId, distance = 9.5) => {
  const p = stationPose(indexOf(id));
  return new THREE.Vector3(p.x + p.out[0] * distance, 0, p.z + p.out[1] * distance);
};

/** Player state lives outside React so movement never re-renders the tree. */
export const player = {
  pos: front("tanya"),
  target: null as THREE.Vector3 | null,
  keys: new Set<string>(),
  heading: Math.PI,
  speed: 0,
};
export const walkTo = (p: THREE.Vector3) => {
  if (useWorld.getState().focus) return;
  player.target = new THREE.Vector3(p.x, 0, p.z);
};

const colliders = [
  { x: 0, z: 0, r: 5.0 },
  ...stations.map((_, i) => {
    const p = stationPose(i);
    return { x: p.x, z: p.z, r: 5.7 };
  }),
];

function Avatar() {
  const body = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const g = body.current;
    if (!g) return;
    g.position.copy(player.pos);
    const t = clock.elapsedTime;
    g.position.y = 0.35 + Math.sin(t * (player.speed > 0.1 ? 9 : 2.2)) * (player.speed > 0.1 ? 0.08 : 0.05);
    // turn smoothly toward the direction of travel
    let d = player.heading - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 10);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, player.speed > 0.1 ? 0.12 : 0, 8, dt);
    if (glow.current) glow.current.position.set(player.pos.x, 0.05, player.pos.z);
    // inside a machine the robot steps aside so it never blocks the view
    if (root.current) root.current.visible = !useWorld.getState().focus;
  });
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <capsuleGeometry args={[0.42, 0.55, 8, 16]} />
          <meshStandardMaterial color="#e9f2f0" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.42, 24, 16]} />
          <meshStandardMaterial color="#e9f2f0" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.57, 0.27]} scale={[1, 0.62, 0.55]}>
          <sphereGeometry args={[0.34, 24, 16]} />
          <meshStandardMaterial color="#10262c" roughness={0.1} metalness={0.4} />
        </mesh>
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 1.6, 0.44]}>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshBasicMaterial color="#7be0c3" toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 2.1, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3]} />
          <meshStandardMaterial color="#9fb7bd" />
        </mesh>
        <mesh position={[0, 2.28, 0]}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshBasicMaterial color="#ffd166" toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

function TargetMarker() {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    m.visible = !!player.target;
    if (player.target) {
      m.position.set(player.target.x, 0.06, player.target.z);
      m.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.1);
    }
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.35, 0.5, 32]} />
      <meshBasicMaterial color="#7be0c3" toneMapped={false} transparent opacity={0.8} />
    </mesh>
  );
}

export function Player() {
  const setNear = useWorld((s) => s.setNear);
  const travel = useWorld((s) => s.travel);
  useEffect(() => {
    if (!travel) return;
    player.pos.copy(front(travel.id));
    player.target = null;
    const p = stationPose(indexOf(travel.id));
    player.heading = Math.atan2(-p.out[0], -p.out[1]);
  }, [travel]);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { focus, started, panel } = useWorld.getState();
    const out = new THREE.Vector2(player.pos.x, player.pos.z);
    if (out.length() < 1) out.set(0, 1);
    out.normalize();
    const fwd = new THREE.Vector2(-out.x, -out.y);
    const right = new THREE.Vector2(-fwd.y, fwd.x);
    const k = player.keys;
    const input = new THREE.Vector2();
    if (started && !focus && !panel) {
      if (k.has("w") || k.has("arrowup")) input.add(fwd);
      if (k.has("s") || k.has("arrowdown")) input.sub(fwd);
      if (k.has("d") || k.has("arrowright")) input.add(right);
      if (k.has("a") || k.has("arrowleft")) input.sub(right);
    }
    let dir = new THREE.Vector2();
    if (input.lengthSq() > 0) {
      player.target = null;
      dir = input.normalize();
    } else if (player.target && !focus) {
      const d = new THREE.Vector2(player.target.x - player.pos.x, player.target.z - player.pos.z);
      if (d.length() < 0.25) player.target = null;
      else dir = d.normalize();
    }
    const goal = dir.lengthSq() ? 9 : 0;
    player.speed = THREE.MathUtils.damp(player.speed, goal, 10, dt);
    if (dir.lengthSq()) {
      player.heading = Math.atan2(dir.x, dir.y);
      player.pos.x += dir.x * player.speed * dt;
      player.pos.z += dir.y * player.speed * dt;
    }
    for (const c of colliders) {
      const dx = player.pos.x - c.x,
        dz = player.pos.z - c.z,
        d = Math.hypot(dx, dz);
      if (d < c.r && d > 0.001) {
        player.pos.x = c.x + (dx / d) * c.r;
        player.pos.z = c.z + (dz / d) * c.r;
        if (player.target && Math.hypot(player.target.x - c.x, player.target.z - c.z) < c.r + 0.5) player.target = null;
      }
    }
    const r = Math.hypot(player.pos.x, player.pos.z);
    if (r > ISLAND - 1.5) player.pos.multiplyScalar((ISLAND - 1.5) / r);
    // nearest machine
    let best: StationId | null = null,
      bestD = 9.5;
    stations.forEach((s, i) => {
      const p = stationPose(i);
      const d = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
      if (d < bestD) {
        bestD = d;
        best = s.id;
      }
    });
    setNear(best);
  });
  return (
    <>
      <Avatar />
      <TargetMarker />
    </>
  );
}

/** Portrait screens need the camera further back to fit a machine across. */
const fitFor = (aspect: number) => THREE.MathUtils.clamp(1.3 / aspect, 1, 2.6);
const framing = (id: StationId, fit: number) => {
  const st = stationById[id];
  const p = stationPose(indexOf(id));
  const d = st.frame.distance * fit;
  return {
    pos: new THREE.Vector3(p.x + p.out[0] * d, st.frame.lookY + (st.frame.height - st.frame.lookY) * fit, p.z + p.out[1] * d),
    target: new THREE.Vector3(p.x, st.frame.lookY, p.z),
    distance: d,
  };
};

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const controls = useRef<OrbitImpl>(null);
  const look = useRef(new THREE.Vector3(0, 2, 0));
  const offset = useRef({ x: 0, y: 0 });
  const arrived = useRef(0);
  const focus = useWorld((s) => s.focus);
  // On desktop the panel takes the left edge, so step back a little more.
  const fit = size.width < 760 ? fitFor(size.width / size.height) : Math.max(1.14, fitFor(size.width / size.height));
  useEffect(() => {
    arrived.current = 0;
    const c = controls.current;
    if (!c) return;
    c.enabled = false;
    if (focus) {
      const { distance } = framing(focus, fit);
      const p = stationPose(indexOf(focus));
      c.minDistance = distance * 0.5;
      c.maxDistance = distance * 1.5;
      c.minPolarAngle = 0.3;
      c.maxPolarAngle = 1.42;
      const a = Math.atan2(p.out[0], p.out[1]);
      c.minAzimuthAngle = a - 1.1;
      c.maxAzimuthAngle = a + 1.1;
    }
  }, [focus, fit]);
  useEffect(() => () => camera.clearViewOffset(), [camera]);
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { started } = useWorld.getState();
    const phone = size.width < 760;
    // Inside a machine the rest of the island fades into the night.
    const fog = scene.fog as THREE.Fog | null;
    const near = focus ? stationById[focus].frame.distance * fit + 6 : 55;
    if (fog) {
      fog.near = THREE.MathUtils.damp(fog.near, near, 3, dt);
      fog.far = THREE.MathUtils.damp(fog.far, focus ? near + 24 : 160, 3, dt);
    }
    // Keep the machine clear of the station panel (left on desktop, bottom on phones).
    const ox = focus && !phone ? -(Math.min(360, size.width - 24) + 12) / 2 : 0;
    const oy = focus && phone ? size.height * 0.2 : 0;
    offset.current.x = THREE.MathUtils.damp(offset.current.x, ox, 4, dt);
    offset.current.y = THREE.MathUtils.damp(offset.current.y, oy, 4, dt);
    if (Math.abs(offset.current.x) < 0.5 && Math.abs(offset.current.y) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);
    const c = controls.current;
    let pos: THREE.Vector3, target: THREE.Vector3, speed = 4;
    if (!started) {
      const t = clock.elapsedTime * 0.06;
      const r = 58 * Math.min(fit, 1.6);
      pos = new THREE.Vector3(Math.sin(t) * r, 30 * Math.min(fit, 1.6), Math.cos(t) * r);
      target = new THREE.Vector3(0, 0, 0);
      speed = 1.5;
    } else if (focus) {
      if (c && c.enabled) return; // the visitor is orbiting
      const f = framing(focus, fit);
      pos = f.pos;
      target = f.target;
      arrived.current += dt;
      if (arrived.current > 1.1 && c) {
        camera.position.copy(pos);
        c.target.copy(target);
        c.enabled = true;
        c.update();
        return;
      }
      speed = 5;
    } else {
      const out = new THREE.Vector2(player.pos.x, player.pos.z);
      if (out.length() < 1) out.set(0, 1);
      out.normalize();
      const back = 10.5 * Math.min(fit, 1.7);
      pos = new THREE.Vector3(player.pos.x + out.x * back, 8 * Math.min(fit, 1.5), player.pos.z + out.y * back);
      target = new THREE.Vector3(player.pos.x - out.x * 3, 1.2, player.pos.z - out.y * 3);
    }
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, speed, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, speed, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, speed, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, target.x, speed, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, target.y, speed, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, target.z, speed, dt);
    camera.lookAt(look.current);
    if (c) c.target.copy(look.current);
  });
  return <OrbitControls ref={controls} enablePan={false} enableDamping dampingFactor={0.12} rotateSpeed={0.6} zoomSpeed={0.7} />;
}

function Sign({ index }: { index: number }) {
  const s = stations[index];
  const anyFocus = useWorld((st) => st.focus !== null);
  const done = useWorld((st) => st.done);
  const complete = stationDone(done, index);
  const count = s.challenges.filter((c) => done.has(`${s.id}.${c.id}`)).length;
  return (
    <Billboard position={[0, 8.6, -3.2]} visible={!anyFocus}>
      <Label text={`${index + 1} · ${s.name}`} size={0.6} bg="rgba(10,24,30,0.82)" color={s.color} weight={800} />
      <Label text={complete ? "✓ selesai" : `${count}/${s.challenges.length} temuan`} size={0.32} position={[0, -0.75, 0]} color={complete ? "#7be0c3" : "#9fb7bd"} weight={750} />
    </Billboard>
  );
}

export function StationShell({ index }: { index: number }) {
  const s = stations[index];
  const pose = stationPose(index);
  const focused = useWorld((st) => st.focus === s.id);
  const goTo = useWorld((st) => st.goTo);
  const done = useWorld((st) => stationDone(st.done, index));
  const { Scene } = modules[s.id];
  const [hover, setHover] = useState(false);
  useHoverCursor(hover && !focused);
  return (
    <group
      position={[pose.x, 0, pose.z]}
      rotation={[0, pose.angle, 0]}
      onClick={focused ? undefined : tap(() => goTo(s.id))}
      onPointerOver={focused ? undefined : () => setHover(true)}
      onPointerOut={() => setHover(false)}
      name={`station-${s.id}`}
    >
      <Plinth color={done ? "#ffffff" : s.color} />
      <Scene />
      <Sign index={index} />
      <pointLight position={[0, 5, 4]} color={s.color} intensity={focused ? 30 : 12} distance={14} />
    </group>
  );
}
