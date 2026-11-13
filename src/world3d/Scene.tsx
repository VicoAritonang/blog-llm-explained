import { useEffect, useRef, useState, type ComponentType } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import * as THREE from "three";
import { isRegionOpen, isStationDone, regionById, regions, stationById, stations, type RegionId, type StationId } from "./content";
import { activeMission, useWorld } from "./store";
import { Label, Plinth, tap, useHoverCursor } from "./kit";
import { frontOf, keeperSpot, lecternOf, obstacles, poses, walkable } from "./world";
import { nearestBook } from "./Library";
import { player } from "./player";
import { useHolo } from "./shaders";
import { HORIZON } from "./Terrain";
import * as Tanya from "./stations/Tanya";
import * as Data from "./stations/Data";
import * as Token from "./stations/Token";
import * as Objektif from "./stations/Objektif";
import * as Makna from "./stations/Makna";
import * as Latih from "./stations/Latih";
import * as Komputasi from "./stations/Komputasi";
import * as Selaras from "./stations/Selaras";
import * as Sorot from "./stations/Sorot";
import * as Peluang from "./stations/Peluang";
import * as Cache from "./stations/Cache";
import * as Bukti from "./stations/Bukti";
import * as Skala from "./stations/Skala";
import * as Rakit from "./stations/Rakit";

export const modules: Record<StationId, { Scene: ComponentType; Controls: ComponentType }> = {
  tanya: Tanya,
  data: Data,
  token: Token,
  objektif: Objektif,
  makna: Makna,
  latih: Latih,
  komputasi: Komputasi,
  selaras: Selaras,
  sorot: Sorot,
  peluang: Peluang,
  cache: Cache,
  bukti: Bukti,
  skala: Skala,
  rakit: Rakit,
};

/** Click-to-walk: third person, empty hand, not inside a machine. */
export const walkTo = (p: THREE.Vector3) => {
  const s = useWorld.getState();
  if (s.focus || s.view === "fp" || s.tool !== "tangan") return false;
  player.target = new THREE.Vector3(p.x, 0, p.z);
  return true;
};
const openNow = (r: RegionId) => isRegionOpen(useWorld.getState().done, r);

/* ---------------------------------------------------------------- walker -- */
function Avatar() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const g = body.current;
    if (!g) return;
    g.position.copy(player.pos);
    const t = clock.elapsedTime,
      moving = player.speed > 0.1;
    g.position.y = player.y + 0.12 + (player.y > 0 ? 0 : Math.abs(Math.sin(t * (moving ? 10 : 2))) * (moving ? 0.12 : 0.03));
    let d = player.heading - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 10);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, moving ? 0.1 : 0, 8, dt);
    if (shadow.current) shadow.current.position.set(player.pos.x, 0.07, player.pos.z);
    const st = useWorld.getState();
    if (root.current) root.current.visible = !st.focus && st.view === "tp";
  });
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <capsuleGeometry args={[0.42, 0.55, 8, 16]} />
          <meshStandardMaterial color="#f2f6f4" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.62, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.44, 0.05, 8, 32]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff8a3d" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.42, 24, 16]} />
          <meshStandardMaterial color="#f2f6f4" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.57, 0.27]} scale={[1, 0.62, 0.55]}>
          <sphereGeometry args={[0.34, 24, 16]} />
          <meshStandardMaterial color="#10262c" roughness={0.05} metalness={0.6} />
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
          <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.95, -0.42]} castShadow>
          <boxGeometry args={[0.55, 0.6, 0.25]} />
          <meshStandardMaterial color="#3d7ea6" roughness={0.7} />
        </mesh>
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} depthWrite={false} />
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
      m.position.set(player.target.x, 0.1, player.target.z);
      m.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.1);
    }
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.35, 0.5, 32]} />
      <meshBasicMaterial color="#7be0c3" toneMapped={false} transparent opacity={0.9} />
    </mesh>
  );
}

export function Player() {
  const setNear = useWorld((s) => s.setNear);
  const setNearKeeper = useWorld((s) => s.setNearKeeper);
  const travel = useWorld((s) => s.travel);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!travel) return;
    const [x, z] = frontOf(travel.id, 9);
    player.pos.set(x, 0, z);
    player.target = null;
    const p = poses[travel.id];
    player.heading = Math.atan2(-p.dir[0], -p.dir[1]);
  }, [travel]);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { focus, started, panel, dialog, view } = useWorld.getState();
    const fp = view === "fp";
    // directions on the ground plane: where the eyes look in first person, away from the camera otherwise
    const fwd = fp ? new THREE.Vector2(-Math.sin(player.yaw), -Math.cos(player.yaw)) : new THREE.Vector2(player.pos.x - camera.position.x, player.pos.z - camera.position.z);
    if (fwd.lengthSq() < 0.01) fwd.set(0, -1);
    fwd.normalize();
    const right = new THREE.Vector2(-fwd.y, fwd.x);
    const k = player.keys;
    const input = new THREE.Vector2();
    const reading = useWorld.getState().reading;
    if (started && (!focus || fp) && !panel && !dialog && !reading) {
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
      if (d.length() < 0.3) player.target = null;
      else dir = d.normalize();
    }
    const top = k.has("shift") ? 16 : 9;
    player.speed = THREE.MathUtils.damp(player.speed, dir.lengthSq() ? top : 0, 10, dt);
    if (dir.lengthSq()) {
      player.heading = Math.atan2(dir.x, dir.y);
      const step = player.speed * dt;
      const nx = player.pos.x + dir.x * step,
        nz = player.pos.z + dir.y * step;
      // slide along coasts and closed gates
      if (walkable(nx, nz, openNow)) player.pos.set(nx, 0, nz);
      else if (walkable(nx, player.pos.z, openNow)) player.pos.x = nx;
      else if (walkable(player.pos.x, nz, openNow)) player.pos.z = nz;
      else player.target = null;
    }
    // jumping
    if (player.y > 0 || player.vy > 0) {
      player.vy -= 22 * dt;
      player.y = Math.max(0, player.y + player.vy * dt);
      if (player.y === 0) player.vy = 0;
    }
    // placed blocks are solid at walking height
    const blocks = useWorld.getState().blocks;
    for (const b of blocks) {
      if (b.y > 1.6 + player.y || b.y + 0.5 < player.y) continue;
      const dx = player.pos.x - b.x,
        dz = player.pos.z - b.z;
      if (Math.abs(dx) < 0.85 && Math.abs(dz) < 0.85) {
        if (Math.abs(dx) > Math.abs(dz)) player.pos.x = b.x + Math.sign(dx || 1) * 0.85;
        else player.pos.z = b.z + Math.sign(dz || 1) * 0.85;
      }
    }
    for (const c of obstacles) {
      const dx = player.pos.x - c.x,
        dz = player.pos.z - c.z,
        d = Math.hypot(dx, dz);
      if (d < c.r && d > 0.001) {
        player.pos.x = c.x + (dx / d) * c.r;
        player.pos.z = c.z + (dz / d) * c.r;
        if (player.target && Math.hypot(player.target.x - c.x, player.target.z - c.z) < c.r + 0.5) player.target = null;
      }
    }
    let best: StationId | null = null,
      bestD = 9.5;
    for (const s of stations) {
      const p = poses[s.id];
      const d = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
      if (d < bestD && openNow(s.region)) {
        bestD = d;
        best = s.id;
      }
    }
    setNear(best);
    // first person: the machine you walk up to is the one you are using
    if (fp && started && !panel && !dialog && useWorld.getState().focus !== best) useWorld.getState().setFocus(best);
    let keeper: RegionId | null = null;
    for (const r of regions) {
      const [x, z] = keeperSpot(r.id);
      if (r.id !== "dermaga" && Math.hypot(player.pos.x - x, player.pos.z - z) < 4.5 && openNow(r.id)) keeper = r.id;
    }
    setNearKeeper(keeper);
    useWorld.getState().setNearBook(nearestBook(useWorld.getState().done));
  });
  return (
    <>
      <Avatar />
      <TargetMarker />
    </>
  );
}

/* --------------------------------------------------------------- keepers -- */
const keeperLook: Record<RegionId, { body: string; hat: string }> = {
  dermaga: { body: "#7be0c3", hat: "#ffd166" },
  belajar: { body: "#8fd46b", hat: "#6b4f2f" },
  optimasi: { body: "#ff9f5a", hat: "#4a3a30" },
  berjalan: { body: "#6fc3ff", hat: "#2a3340" },
  observatorium: { body: "#c5e86c", hat: "#3b4a58" },
};
function Keeper({ id }: { id: RegionId }) {
  const [x, z] = keeperSpot(id);
  const region = regionById[id];
  const talk = useWorld((s) => s.talk);
  const talked = useWorld((s) => s.talked.includes(id));
  const hand = useWorld((s) => s.tool === "tangan");
  const [hover, setHover] = useState(false);
  useHoverCursor(hover && hand);
  const bob = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 2 + x) * 0.06;
  });
  const look = keeperLook[id];
  return (
    <group position={[x, 0, z]} onClick={hand ? tap(() => talk(id)) : undefined} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)} name={`keeper-${id}`}>
      <group ref={bob}>
        {id === "dermaga" ? (
          <group position={[0, 1.4, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.6, 24, 16]} />
              <meshStandardMaterial color="#e9f2f0" metalness={0.3} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.42]}>
              <torusGeometry args={[0.3, 0.07, 10, 32]} />
              <meshStandardMaterial color="#7be0c3" emissive="#7be0c3" emissiveIntensity={2.5} toneMapped={false} />
            </mesh>
          </group>
        ) : (
          <>
            <mesh position={[0, 0.9, 0]} castShadow>
              <coneGeometry args={[0.65, 1.8, 16]} />
              <meshStandardMaterial color={look.body} roughness={0.7} />
            </mesh>
            <mesh position={[0, 2.05, 0]} castShadow>
              <sphereGeometry args={[0.38, 20, 14]} />
              <meshStandardMaterial color="#f1d3b3" roughness={0.8} />
            </mesh>
            <mesh position={[0, 2.45, 0]} castShadow>
              <cylinderGeometry args={[0.55, 0.55, 0.08, 20]} />
              <meshStandardMaterial color={look.hat} />
            </mesh>
            <mesh position={[0, 2.62, 0]}>
              <cylinderGeometry args={[0.3, 0.34, 0.35, 16]} />
              <meshStandardMaterial color={look.hat} />
            </mesh>
          </>
        )}
      </group>
      <Billboard position={[0, 3.4, 0]}>
        <Label text={region.keeper.name} size={0.28} bg="rgba(10,24,30,0.8)" color={region.color} weight={800} />
        {!talked && <Label text="!" size={0.6} position={[0, 0.75, 0]} color="#ffd166" weight={900} />}
      </Billboard>
      <mesh position={[0, 1.4, 0]} visible={false}>
        <cylinderGeometry args={[1, 1, 2.8, 8]} />
      </mesh>
    </group>
  );
}
export function Keepers() {
  const done = useWorld((s) => s.done);
  return (
    <>
      {regions
        // the dock's guide is Nara, who flies with you
        .filter((r) => r.id !== "dermaga" && isRegionOpen(done, r.id))
        .map((r) => (
          <Keeper key={r.id} id={r.id} />
        ))}
    </>
  );
}

/* ---------------------------------------------------------------- camera -- */
const fitFor = (aspect: number) => THREE.MathUtils.clamp(1.3 / aspect, 1, 2.6);
const framing = (id: StationId, fit: number) => {
  const st = stationById[id];
  const p = poses[id];
  const d = st.frame.distance * fit;
  return {
    pos: new THREE.Vector3(p.x + p.dir[0] * d, st.frame.lookY + (st.frame.height - st.frame.lookY) * fit, p.z + p.dir[1] * d),
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
  const settle = useRef(0);
  const lastTarget = useRef(new THREE.Vector3());
  const focus = useWorld((s) => s.focus);
  const started = useWorld((s) => s.started);
  const fpView = useWorld((s) => s.view === "fp");
  const phone = size.width < 760;
  const fit = phone ? fitFor(size.width / size.height) : Math.max(1.14, fitFor(size.width / size.height));
  useEffect(() => {
    settle.current = 0;
    const c = controls.current;
    if (!c) return;
    c.enabled = false;
    if (focus) {
      const { distance } = framing(focus, fit);
      const p = poses[focus];
      c.minDistance = distance * 0.5;
      c.maxDistance = distance * 1.5;
      c.minPolarAngle = 0.3;
      c.maxPolarAngle = 1.42;
      const a = Math.atan2(p.dir[0], p.dir[1]);
      c.minAzimuthAngle = a - 1.1;
      c.maxAzimuthAngle = a + 1.1;
    } else {
      c.minDistance = 6;
      c.maxDistance = 32 * Math.min(fit, 1.5);
      c.minPolarAngle = 0.35;
      c.maxPolarAngle = 1.38;
      c.minAzimuthAngle = -Infinity;
      c.maxAzimuthAngle = Infinity;
    }
  }, [focus, fit, started, fpView]);
  useEffect(() => () => camera.clearViewOffset(), [camera]);
  const fogWalk = new THREE.Color(HORIZON),
    fogFocus = new THREE.Color("#22303c");
  useFrame(({ clock }, rawDt) => {
    // real elapsed time, so slow devices still finish camera moves on schedule
    const dt = Math.min(rawDt, 0.25);
    const c = controls.current;
    // inside a machine the rest of the world fades into the dusk
    const fog = scene.fog as THREE.Fog | null;
    const near = focus ? stationById[focus].frame.distance * fit + 6 : 110;
    if (fog) {
      fog.near = THREE.MathUtils.damp(fog.near, near, 3, dt);
      fog.far = THREE.MathUtils.damp(fog.far, focus ? near + 30 : 720, 3, dt);
      fog.color.lerp(focus ? fogFocus : fogWalk, 1 - Math.exp(-3 * dt));
    }
    const reading = useWorld.getState().reading;
    if (reading) {
      // an open book: lean over the lectern, whatever the camera mode
      // look straight down the page normal, close enough to read
      const l = lecternOf(reading.book);
      const dist = 1.25 * Math.min(fit, 2.2);
      const cx = l.x + l.dir[0] * 0.08,
        cz = l.z + l.dir[1] * 0.08;
      const want = new THREE.Vector3(cx + l.dir[0] * 0.43 * dist, 1.24 + 0.9 * dist, cz + l.dir[1] * 0.43 * dist);
      const at = new THREE.Vector3(cx, 1.24, cz);
      // lift the book clear of the reading bar at the bottom
      camera.setViewOffset(size.width, size.height, 0, Math.min(90, size.height * 0.1), size.width, size.height);
      if (c) c.enabled = false;
      const k = 1 - Math.exp(-6 * dt);
      camera.position.lerp(want, k);
      look.current.lerp(at, k);
      camera.lookAt(look.current);
      settle.current = 0;
      return;
    }
    if (fpView) {
      // the first-person controller owns the camera; keep the crosshair centred
      camera.clearViewOffset();
      offset.current.x = offset.current.y = 0;
      if (c) c.enabled = false;
      settle.current = 0;
      return;
    }
    const ox = focus && !phone ? -(Math.min(360, size.width - 24) + 12) / 2 : 0;
    const oy = focus && phone ? size.height * 0.2 : 0;
    offset.current.x = THREE.MathUtils.damp(offset.current.x, ox, 4, dt);
    offset.current.y = THREE.MathUtils.damp(offset.current.y, oy, 4, dt);
    if (Math.abs(offset.current.x) < 0.5 && Math.abs(offset.current.y) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);

    const head = new THREE.Vector3(player.pos.x, 1.4, player.pos.z);
    if (!started) {
      const t = clock.elapsedTime * 0.04;
      const r = 150 * Math.min(fit, 1.4);
      camera.position.set(Math.sin(t) * r, 80 * Math.min(fit, 1.4), Math.cos(t) * r + 20);
      look.current.set(0, 0, -10);
      camera.lookAt(look.current);
      return;
    }
    settle.current += dt;
    if (c && c.enabled) {
      // walking: the orbit pivot follows the walker, the visitor steers the angle
      if (!focus) {
        const delta = head.clone().sub(lastTarget.current);
        c.target.add(delta);
        camera.position.add(delta);
        lastTarget.current.copy(c.target);
      }
      return;
    }
    let pos: THREE.Vector3, target: THREE.Vector3;
    if (focus) {
      const f = framing(focus, fit);
      pos = f.pos;
      target = f.target;
    } else {
      // ease in behind the walker, keeping the current viewing direction
      const away = camera.position.clone().sub(head).setY(0);
      // coming back from first person: stand behind where the eyes were looking
      if (away.lengthSq() < 1) away.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      away.normalize().multiplyScalar(13 * Math.min(fit, 1.5));
      pos = head.clone().add(away).setY(head.y + 8 * Math.min(fit, 1.4));
      target = head;
    }
    const speed = 4.5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, speed, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, speed, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, speed, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, target.x, speed, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, target.y, speed, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, target.z, speed, dt);
    camera.lookAt(look.current);
    if (c) c.target.copy(look.current);
    if (settle.current > 1.1 && c) {
      camera.position.copy(pos);
      c.target.copy(target);
      lastTarget.current.copy(target);
      c.enabled = true;
      c.update();
    }
  });
  return <OrbitControls ref={controls} enablePan={false} enableDamping dampingFactor={0.12} rotateSpeed={0.6} zoomSpeed={0.7} />;
}

/* -------------------------------------------------------------- stations -- */
function Marker({ id }: { id: StationId }) {
  const done = useWorld((s) => isStationDone(s.done, id));
  const active = useWorld((s) => activeMission(s)?.id === id);
  const anyFocus = useWorld((s) => s.focus !== null);
  const bob = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (bob.current) bob.current.position.y = 10.4 + Math.sin(clock.elapsedTime * 2.5) * 0.25;
  });
  if (anyFocus) return null;
  return (
    <group ref={bob} position={[0, 10.4, -3.2]}>
      <Billboard>
        <Label text={done ? "✓" : active ? "!" : "?"} size={done ? 0.9 : 1.2} color={done ? "#7be0c3" : active ? "#ffd166" : "#c9d6da"} weight={900} />
      </Billboard>
    </group>
  );
}

/** A tall column of light over the mission being followed. */
export function Beacon() {
  const active = useWorld((s) => activeMission(s));
  const anyFocus = useWorld((s) => s.focus !== null);
  const material = useHolo(active?.color ?? "#ffffff", 0.7);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    // the column guides from afar; up close it would only hide the machine
    if (!ref.current || !active) return;
    const p = poses[active.id];
    ref.current.visible = Math.hypot(player.pos.x - p.x, player.pos.z - p.z) > 16;
  });
  if (!active || anyFocus) return null;
  const p = poses[active.id];
  return (
    <mesh ref={ref} position={[p.x, 40, p.z]} material={material}>
      <cylinderGeometry args={[0.9, 1.6, 80, 24, 1, true]} />
    </mesh>
  );
}

function Sign({ id }: { id: StationId }) {
  const s = stationById[id];
  const anyFocus = useWorld((st) => st.focus !== null);
  const count = useWorld((st) => s.challenges.filter((c) => st.done.has(`${s.id}.${c.id}`)).length);
  return (
    <Billboard position={[0, 8.4, -3.2]} visible={!anyFocus}>
      <Label text={s.name} size={0.62} bg="rgba(10,24,30,0.85)" color={s.color} weight={800} />
      <Label text={count === s.challenges.length ? "✓ selesai" : `${count}/${s.challenges.length} temuan`} size={0.32} position={[0, -0.78, 0]} color="#e8f1ef" weight={750} />
    </Billboard>
  );
}

const DETAIL = 70;
export function StationShell({ id }: { id: StationId }) {
  const s = stationById[id];
  const pose = poses[id];
  const focused = useWorld((st) => st.focus === id);
  const open = useWorld((st) => isRegionOpen(st.done, s.region));
  const done = useWorld((st) => isStationDone(st.done, id));
  const goTo = useWorld((st) => st.goTo);
  const quality = useWorld((st) => st.quality);
  const canEnter = useWorld((st) => st.tool === "tangan" && st.view === "tp");
  const { Scene } = modules[id];
  const [hover, setHover] = useState(false);
  const [detail, setDetail] = useState(false);
  useHoverCursor(hover && !focused && open && canEnter);
  const group = useRef<THREE.Group>(null);
  const tick = useRef(1);
  useFrame((_, dt) => {
    tick.current += dt;
    if (tick.current < 0.4) return;
    tick.current = 0;
    const near = focused || Math.hypot(player.pos.x - pose.x, player.pos.z - pose.z) < DETAIL;
    if (near !== detail) setDetail(near);
    // new meshes appear as machines change; let them all cast shadows
    if (quality === "tinggi" && near)
      group.current?.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && !(m.material instanceof THREE.MeshBasicMaterial)) m.castShadow = m.receiveShadow = true;
      });
  });
  return (
    <group
      ref={group}
      position={[pose.x, 0, pose.z]}
      rotation={[0, pose.angle, 0]}
      onClick={focused || !open || !canEnter ? undefined : tap(() => goTo(id))}
      onPointerOver={focused ? undefined : () => setHover(true)}
      onPointerOut={() => setHover(false)}
      name={`station-${id}`}
    >
      <Plinth color={done ? "#ffffff" : s.color} />
      {detail && <Scene />}
      <Sign id={id} />
      <Marker id={id} />
    </group>
  );
}
