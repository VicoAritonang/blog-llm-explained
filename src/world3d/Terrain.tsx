// The archipelago: sky, sea, islands with textured ground, bridges with gates,
// and one landscape per phase. Everything is procedural and local.
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { bridges, BRIDGE_HALF, islands, lecterns, poses, type Island } from "./world";
import { isRegionOpen, regionById, stations, type RegionId } from "./content";
import { useWorld } from "./store";
import { getTextures, tiled } from "./textures";
import { Label } from "./kit";
import { player } from "./player";
import { makeGate } from "./shaders";

export const SUN = new THREE.Vector3(-0.55, 0.12, -0.82).normalize();
/** Horizon haze: the fog uses it too, so the sea melts into the sky. */
export const HORIZON = "#f1b98f";

/** A dusk sky dome with a soft sun. Values stay in a displayable range, so bloom never overflows. */
function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uSun: { value: SUN.clone() }, uHorizon: { value: new THREE.Color(HORIZON) } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun; uniform vec3 uHorizon; varying vec3 vDir;
          void main(){
            float h = vDir.y;
            vec3 zenith = vec3(0.10, 0.20, 0.42);
            vec3 upper = vec3(0.38, 0.50, 0.74);
            vec3 col = mix(uHorizon, upper, smoothstep(0.0, 0.22, h));
            col = mix(col, zenith, smoothstep(0.22, 0.85, h));
            col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.08, h));
            float s = max(dot(normalize(vDir), uSun), 0.0);
            col += vec3(1.0, 0.72, 0.45) * pow(s, 8.0) * 0.45;
            col += vec3(1.0, 0.85, 0.6) * pow(s, 90.0) * 0.8;
            col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9997, s) * 1.6;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={material} renderOrder={-1}>
      <sphereGeometry args={[1400, 48, 24]} />
    </mesh>
  );
}

const rand = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

/* ------------------------------------------------------------------ sky -- */
export function Atmosphere({ shadows }: { shadows: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    // the sun's shadow box follows the walker
    const l = sun.current;
    const p = player.pos;
    if (!l) return;
    l.position.set(p.x + SUN.x * 80, SUN.y * 80 + 30, p.z + SUN.z * 80);
    target.position.set(p.x, 0, p.z);
    target.updateMatrixWorld();
  });
  return (
    <>
      <SkyDome />
      <hemisphereLight args={["#a9c8ff", "#5a4636", 0.85]} />
      <ambientLight intensity={0.18} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        color="#ffcf9e"
        intensity={2.6}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <Environment resolution={128} frames={1}>
        {/* a bright dome so metal reflects sky instead of black */}
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#7f98b3" side={THREE.BackSide} />
        </mesh>
        <mesh position={[0, -40, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshBasicMaterial color="#6a5a48" />
        </mesh>
        <Lightformer form="rect" intensity={2.2} color="#ffd2a1" position={[-6, 3, -8]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#9cc8ff" position={[6, 6, 6]} scale={[10, 10, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 10, 0]} scale={4} />
      </Environment>
    </>
  );
}

/* ---------------------------------------------------------------- motes -- */
let dotTexture: THREE.CanvasTexture | null = null;
const dot = () => {
  if (dotTexture) return dotTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return (dotTexture = new THREE.CanvasTexture(c));
};
/**
 * Drifting glow particles. Replaces drei's Sparkles, whose shader divides by the
 * distance to the point centre and can emit Infinity, which bloom spreads into
 * a blank frame.
 */
function Motes({ count, scale, position, size, speed, color }: { count: number; scale: [number, number, number]; position: [number, number, number]; size: number; speed: number; color: string }) {
  const { geometry, seeds } = useMemo(() => {
    const r = rand(count * 31 + Math.round(scale[0] * 7));
    const seeds = Array.from({ length: count }, () => [r() - 0.5, r() - 0.5, r() - 0.5, r() * Math.PI * 2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    return { geometry: g, seeds };
  }, [count, scale[0], scale[1], scale[2]]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed;
    const a = geometry.attributes.position as THREE.BufferAttribute;
    seeds.forEach(([x, y, z, ph], i) => {
      a.setXYZ(i, (x + Math.sin(t + ph) * 0.04) * scale[0], (((y + 0.5 + t * 0.05 + ph) % 1) - 0.5) * scale[1], (z + Math.cos(t * 0.8 + ph) * 0.04) * scale[2]);
    });
    a.needsUpdate = true;
  });
  return (
    <points geometry={geometry} position={position} frustumCulled={false}>
      <pointsMaterial map={dot()} color={color} size={size * 0.12} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/* ------------------------------------------------------------------ sea -- */
export function Ocean() {
  const material = useMemo(() => {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uSun: { value: SUN.clone() },
        uIslands: { value: islands.map((i) => new THREE.Vector3(i.x, i.z, i.r)) },
      },
    ]);
    return new THREE.ShaderMaterial({
      uniforms,
      fog: true,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vWorld;
        varying vec3 vNormal2;
        #include <fog_pars_vertex>
        float wave(vec2 p, vec2 d, float f, float s){ return sin(dot(p, d) * f + uTime * s); }
        void main(){
          vec3 p = position;
          vec4 w = modelMatrix * vec4(p, 1.0);
          float h = 0.18 * wave(w.xz, vec2(0.8,0.6), 0.09, 1.1) + 0.12 * wave(w.xz, vec2(-0.5,0.9), 0.15, 1.6) + 0.06 * wave(w.xz, vec2(0.2,-1.0), 0.33, 2.3);
          w.y += h;
          float dx = 0.18*0.09*0.8*cos(dot(w.xz,vec2(0.8,0.6))*0.09+uTime*1.1) - 0.12*0.15*0.5*cos(dot(w.xz,vec2(-0.5,0.9))*0.15+uTime*1.6);
          float dz = 0.18*0.09*0.6*cos(dot(w.xz,vec2(0.8,0.6))*0.09+uTime*1.1) + 0.12*0.15*0.9*cos(dot(w.xz,vec2(-0.5,0.9))*0.15+uTime*1.6);
          vNormal2 = normalize(vec3(-dx*6.0, 1.0, -dz*6.0));
          vWorld = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uSun;
        uniform vec3 uIslands[5];
        varying vec3 vWorld;
        varying vec3 vNormal2;
        #include <fog_pars_fragment>
        void main(){
          float shore = 1e3;
          for (int i = 0; i < 5; i++) shore = min(shore, length(vWorld.xz - uIslands[i].xy) - uIslands[i].z);
          vec3 deep = vec3(0.04, 0.16, 0.26);
          vec3 shallow = vec3(0.12, 0.52, 0.55);
          vec3 col = mix(shallow, deep, smoothstep(0.0, 22.0, shore));
          vec3 v = normalize(cameraPosition - vWorld);
          vec3 n = normalize(vNormal2);
          float fres = pow(1.0 - max(dot(v, n), 0.0), 4.0);
          vec3 sky = vec3(0.95, 0.73, 0.56);
          col = mix(col, sky, fres * 0.55);
          vec3 h = normalize(uSun + v);
          col += vec3(1.0, 0.8, 0.55) * pow(max(dot(n, h), 0.0), 220.0) * 2.5;
          float foam = smoothstep(3.5, 0.0, shore) * (0.55 + 0.45 * sin(shore * 3.0 - uTime * 2.2));
          col = mix(col, vec3(0.95, 0.97, 0.95), clamp(foam, 0.0, 1.0) * 0.75);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
  }, []);
  useFrame(({ clock }) => (material.uniforms.uTime.value = clock.elapsedTime));
  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
      <planeGeometry args={[3600, 3600, 240, 240]} />
    </mesh>
  );
}

/* --------------------------------------------------------------- islands -- */
function islandGeometry(island: Island) {
  const seg = 120,
    rings = 14;
  const r = rand(island.x * 7 + island.z * 13 + 999);
  const bumps = Array.from({ length: 6 }, () => [r() * Math.PI * 2, 2 + Math.floor(r() * 5), r()]);
  const coast = (a: number) => island.r * (1 + bumps.reduce((s, [ph, f, amp]) => s + Math.sin(a * f + ph) * 0.012 * (amp + 0.4), 0));
  const pos: number[] = [],
    col: number[] = [],
    uv: number[] = [],
    index: number[] = [];
  const grass = new THREE.Color(island.ground),
    sand = new THREE.Color("#d8c391"),
    wet = new THREE.Color("#8c7a56"),
    c = new THREE.Color();
  // radial profile: flat top, beach, then down under the sea
  const profile = [0, 0.35, 0.6, 0.78, 0.88, 0.94, 0.985, 1.0, 1.04, 1.08, 1.12, 1.18, 1.26, 1.36];
  const heights = [0.02, 0.02, 0.03, 0.03, 0.03, 0.02, 0.0, -0.25, -0.6, -1.0, -1.6, -2.6, -4.0, -6.0];
  for (let i = 0; i < rings; i++)
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const rr = profile[i] * coast(a);
      const x = island.x + Math.sin(a) * rr,
        z = island.z + Math.cos(a) * rr;
      const y = heights[i] + (i > 1 && i < 6 ? Math.sin(x * 0.3) * Math.cos(z * 0.27) * 0.02 : 0);
      pos.push(x, y, z);
      uv.push(x / 7, z / 7);
      if (i >= 7) c.copy(i >= 9 ? wet : sand);
      else if (i === 6) c.copy(grass).lerp(sand, 0.6);
      else c.copy(grass).offsetHSL(0, 0, ((x * 13.1 + z * 7.7) % 1) * 0.02 - 0.01);
      col.push(c.r, c.g, c.b);
    }
  for (let i = 0; i < rings - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j,
        b = a + seg + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function IslandGround({ island, onWalk }: { island: Island; onWalk: (p: THREE.Vector3) => boolean }) {
  const geometry = useMemo(() => islandGeometry(island), [island]);
  const tex = getTextures();
  return (
    <mesh
      geometry={geometry}
      receiveShadow
      name={`ground-${island.id}`}
      onClick={(e) => {
        if (e.delta > 8) return;
        // walking claims the click; other tools let it reach the world handler
        if (onWalk(e.point.clone())) e.stopPropagation();
      }}
    >
      <meshStandardMaterial vertexColors map={tex.ground} normalMap={tex.groundNormal} normalScale={new THREE.Vector2(0.6, 0.6)} roughness={0.95} />
    </mesh>
  );
}

/** Stone path ring in front of the machines, plus plazas. */
function Paths({ island }: { island: Island }) {
  const tex = getTextures();
  const mat = useMemo(() => {
    const map = tiled(tex.tiles, 1);
    const normalMap = tiled(tex.tilesNormal, 1);
    return { map, normalMap };
  }, [tex]);
  if (island.biome === "dock" || island.biome === "summit")
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[island.x, 0.05, island.z]} receiveShadow>
        <circleGeometry args={[island.biome === "dock" ? 13 : 16, 64]} />
        <meshStandardMaterial map={tiled(tex.tiles, 6)} normalMap={tiled(tex.tilesNormal, 6)} roughness={0.85} color="#e8dccb" />
      </mesh>
    );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[island.x, 0.05, island.z]} receiveShadow>
        <ringGeometry args={[island.ring + 6, island.ring + 9.5, 96, 1]} />
        <meshStandardMaterial map={mat.map} normalMap={mat.normalMap} roughness={0.85} color="#ddd2bf" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[island.x, 0.06, island.z]} receiveShadow>
        <circleGeometry args={[7.5, 48]} />
        <meshStandardMaterial map={tiled(tex.tiles, 3)} normalMap={tiled(tex.tilesNormal, 3)} roughness={0.85} color="#e6dccb" />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------- bridges -- */
function BridgeMesh({ index }: { index: number }) {
  const b = bridges[index];
  const open = useWorld((s) => isRegionOpen(s.done, b.to));
  const tex = getTextures();
  const len = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
  const angle = Math.atan2(b.b[0] - b.a[0], b.b[1] - b.a[1]);
  const mid: [number, number] = [(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2];
  const deck = useMemo(() => {
    const map = tiled(tex.planks, 1, len / 4);
    const normalMap = tiled(tex.planksNormal, 1, len / 4);
    return { map, normalMap };
  }, [tex, len]);
  const posts = Math.floor(len / 5);
  const region = regionById[b.to];
  const gateT = 0.12;
  const gate = useMemo(() => makeGate(region.color), [region.color]);
  return (
    <group position={[mid[0], 0, mid[1]]} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[BRIDGE_HALF * 2, 0.3, len]} />
        <meshStandardMaterial map={deck.map} normalMap={deck.normalMap} roughness={0.8} />
      </mesh>
      {/* support piers */}
      {Array.from({ length: Math.floor(len / 12) }, (_, i) => (
        <mesh key={i} position={[0, -1.5, -len / 2 + 6 + i * 12]} castShadow>
          <cylinderGeometry args={[0.5, 0.7, 3, 10]} />
          <meshStandardMaterial map={tex.rock} color="#9a8a78" roughness={1} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          {Array.from({ length: posts + 1 }, (_, i) => (
            <mesh key={i} position={[side * (BRIDGE_HALF - 0.15), 0.75, -len / 2 + (i * len) / posts]} castShadow>
              <boxGeometry args={[0.18, 1.2, 0.18]} />
              <meshStandardMaterial map={tex.bark} color="#8a6a4a" />
            </mesh>
          ))}
          <mesh position={[side * (BRIDGE_HALF - 0.15), 1.25, 0]}>
            <boxGeometry args={[0.07, 0.07, len]} />
            <meshStandardMaterial color="#c9a46e" roughness={0.9} />
          </mesh>
          {/* lanterns */}
          {Array.from({ length: Math.floor(posts / 2) }, (_, i) => (
            <mesh key={`l${i}`} position={[side * (BRIDGE_HALF - 0.15), 1.55, -len / 2 + ((i * 2 + 1) * len) / posts]}>
              <sphereGeometry args={[0.16, 12, 8]} />
              <meshStandardMaterial color="#ffd9a0" emissive="#ffb35a" emissiveIntensity={open ? 3 : 0.4} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {/* the gate: an energy wall until the previous chapter is done */}
      <group position={[0, 0, -len / 2 + len * gateT]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (BRIDGE_HALF + 0.2), 1.8, 0]} castShadow>
            <boxGeometry args={[0.5, 3.6, 0.5]} />
            <meshStandardMaterial map={tex.rock} color="#d9d0c0" />
          </mesh>
        ))}
        <mesh position={[0, 3.7, 0]} castShadow>
          <boxGeometry args={[BRIDGE_HALF * 2 + 1, 0.4, 0.6]} />
          <meshStandardMaterial map={tex.rock} color="#d9d0c0" />
        </mesh>
        {!open && (
          <mesh position={[0, 1.8, 0]} material={gate} name={`gate-${b.to}`}>
            <planeGeometry args={[BRIDGE_HALF * 2 + 0.2, 3.4]} />
          </mesh>
        )}
        <Label text={`${open ? "" : "TERKUNCI · "}${region.name} · ${region.phase}`} size={0.32} billboard position={[0, 4.5, 0]} bg="rgba(10,24,30,0.85)" color={region.color} weight={800} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- scatter -- */
function scatter(island: Island, count: number, seed: number, keepOut: (x: number, z: number) => boolean, min = 9, max = island.r - 5) {
  const r = rand(seed);
  const out: { x: number; z: number; s: number; rot: number; k: number }[] = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 40) {
    const a = r() * Math.PI * 2,
      d = min + Math.sqrt(r()) * (max - min);
    const x = island.x + Math.sin(a) * d,
      z = island.z + Math.cos(a) * d;
    if (keepOut(x, z)) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 2.2)) continue;
    out.push({ x, z, s: 0.7 + r() * 0.7, rot: r() * Math.PI * 2, k: r() });
  }
  return out;
}
/** True inside a machine's footprint or the corridor its camera looks along. */
export function inViewCorridor(x: number, z: number, pad = 0) {
  for (const s of stations) {
    const p = poses[s.id];
    if (Math.hypot(p.x - x, p.z - z) < 10 + pad) return true;
    const t = (x - p.x) * p.dir[0] + (z - p.z) * p.dir[1];
    const side = Math.abs((x - p.x) * p.dir[1] - (z - p.z) * p.dir[0]);
    if (t > 0 && t < 20 && side < 6 + pad + t * 0.25) return true;
  }
  return false;
}
const clearOf = (island: Island) => (x: number, z: number) => {
  if (inViewCorridor(x, z)) return true;
  // a clearing round every lectern so the reader can see the book
  if (lecterns.some((l) => Math.hypot(l.x - x, l.z - z) < 4.5)) return true;
  const d = Math.hypot(x - island.x, z - island.z);
  if (island.ring && Math.abs(d - (island.ring + 7.75)) < 3.2) return true;
  for (const b of bridges) {
    const dx = b.b[0] - b.a[0],
      dz = b.b[1] - b.a[1];
    const t = Math.max(0, Math.min(1, ((x - b.a[0]) * dx + (z - b.a[1]) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(x - (b.a[0] + t * dx), z - (b.a[1] + t * dz)) < 5) return true;
  }
  // keep a corridor from the bridge to the path
  const entry = Math.atan2(-island.x, -island.z);
  const off = Math.abs(Math.sin(Math.atan2(x - island.x, z - island.z) - entry)) * d;
  if (Math.cos(Math.atan2(x - island.x, z - island.z) - entry) > 0 && off < 4) return true;
  return false;
};

type Spot = { x: number; z: number; s: number; rot: number; k: number };
function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, items: Spot[], place: (o: THREE.Object3D, it: Spot) => void) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.x, 0, it.z);
      o.rotation.set(0, it.rot, 0);
      o.scale.setScalar(it.s);
      place(o, it);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, items, place]);
}

function Trees({ island, count, seed, palette = ["#3f8f4a", "#4f9e43", "#2f7a52", "#6aa84a"], pines = 0.5, min }: { island: Island; count: number; seed: number; palette?: string[]; pines?: number; min?: number }) {
  const tex = getTextures();
  const items = useMemo(() => scatter(island, count, seed, clearOf(island), min), [island, count, seed, min]);
  const pine = useMemo(() => items.filter((i) => i.k < pines), [items, pines]);
  const round = useMemo(() => items.filter((i) => i.k >= pines), [items, pines]);
  const trunks = useRef<THREE.InstancedMesh>(null),
    cones = useRef<THREE.InstancedMesh>(null),
    cones2 = useRef<THREE.InstancedMesh>(null),
    balls = useRef<THREE.InstancedMesh>(null);
  useInstances(trunks, items, (o) => (o.position.y = 0.9 * o.scale.y));
  useInstances(cones, pine, (o) => (o.position.y = 3.0 * o.scale.y));
  useInstances(cones2, pine, (o) => (o.position.y = 4.3 * o.scale.y));
  useInstances(balls, round, (o) => (o.position.y = 3.1 * o.scale.y));
  const colors = useMemo(() => {
    const c = new THREE.Color();
    return (n: number, ref: React.RefObject<THREE.InstancedMesh | null>) => {
      const m = ref.current;
      if (!m) return;
      for (let i = 0; i < n; i++) m.setColorAt(i, c.set(palette[i % palette.length]));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    };
  }, [palette]);
  useLayoutEffect(() => {
    colors(pine.length, cones);
    colors(pine.length, cones2);
    colors(round.length, balls);
  }, [colors, pine.length, round.length]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, items.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.3, 1.8, 7]} />
        <meshStandardMaterial map={tex.bark} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={cones} args={[undefined, undefined, pine.length]} castShadow>
        <coneGeometry args={[1.5, 2.8, 8]} />
        <meshStandardMaterial map={tex.foliage} roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={cones2} args={[undefined, undefined, pine.length]} castShadow>
        <coneGeometry args={[1.05, 2.0, 8]} />
        <meshStandardMaterial map={tex.foliage} roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={balls} args={[undefined, undefined, round.length]} castShadow>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial map={tex.foliage} roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}

function Rocks({ island, count, seed, color = "#9b9284", scale = 1, min, max }: { island: Island; count: number; seed: number; color?: string; scale?: number; min?: number; max?: number }) {
  const tex = getTextures();
  const items = useMemo(() => scatter(island, count, seed, clearOf(island), min, max), [island, count, seed, min, max]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, items, (o, it) => {
    o.scale.set(it.s * scale * (0.8 + it.k), it.s * scale * (0.5 + it.k * 0.6), it.s * scale);
    o.position.y = 0.2;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.9, 0]} />
      <meshStandardMaterial map={tex.rock} normalMap={tex.rockNormal} color={color} roughness={1} flatShading />
    </instancedMesh>
  );
}

/* --------------------------------------------------------------- biomes -- */
function Forest({ island }: { island: Island }) {
  const tex = getTextures();
  const crown = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (crown.current) crown.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.05;
  });
  return (
    <group>
      <Trees island={island} count={95} seed={5} />
      <Rocks island={island} count={20} seed={6} />
      {/* Pohon Pengetahuan */}
      <group position={[island.x, 0, island.z]} name="landmark-belajar">
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[1.0, 1.8, 8, 10]} />
          <meshStandardMaterial map={tex.bark} roughness={1} />
        </mesh>
        <group ref={crown}>
          {[
            [0, 10, 0, 5],
            [3, 8.5, 1, 3.2],
            [-3, 9, -1, 3.4],
            [0.5, 12.5, -0.5, 3.2],
          ].map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]} castShadow>
              <icosahedronGeometry args={[r, 1]} />
              <meshStandardMaterial map={tex.foliage} color="#5fbf6a" emissive="#2d7a3a" emissiveIntensity={0.25} flatShading />
            </mesh>
          ))}
        </group>
        <Motes count={60} scale={[14, 10, 14]} position={[0, 9, 0]} size={4} speed={0.3} color="#f6ffb0" />
      </group>
      <Motes count={120} scale={[island.r * 1.6, 5, island.r * 1.6]} position={[island.x, 2.5, island.z]} size={2.5} speed={0.25} color="#d9ffb0" />
    </group>
  );
}

function Mountains({ island }: { island: Island }) {
  const tex = getTextures();
  const peaks = useMemo(() => {
    const r = rand(77),
      list: { x: number; z: number; h: number; w: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.2;
      const entry = Math.atan2(-island.x, -island.z);
      if (Math.cos(a - entry) > 0.82) continue; // leave the bridge side open
      const d = island.r + r() * 4;
      const x = island.x + Math.sin(a) * d,
        z = island.z + Math.cos(a) * d;
      const w = 5 + r() * 4;
      if (inViewCorridor(x, z, w)) continue; // never stand between a machine and its camera
      list.push({ x, z, h: 8 + r() * 12, w });
    }
    return list;
  }, [island]);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.intensity = 60 + Math.sin(clock.elapsedTime * 3) * 15;
  });
  return (
    <group>
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, p.h / 2 - 0.5, 0]} castShadow receiveShadow>
            <coneGeometry args={[p.w, p.h, 9, 3]} />
            <meshStandardMaterial map={tiled(tex.rock, 2)} normalMap={tex.rockNormal} color="#a08a74" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, p.h - 1.6, 0]}>
            <coneGeometry args={[p.w * 0.3, p.h * 0.18, 9]} />
            <meshStandardMaterial color="#f4efe8" roughness={0.6} flatShading />
          </mesh>
        </group>
      ))}
      <Rocks island={island} count={34} seed={9} color="#a88f78" scale={1.3} />
      <Trees island={island} count={18} seed={8} palette={["#6b7d4a", "#56704a"]} pines={1} />
      {/* Tungku Gradien: a volcano-forge at the centre */}
      <group position={[island.x, 0, island.z]} name="landmark-optimasi">
        <mesh position={[0, 3.5, 0]} castShadow>
          <coneGeometry args={[6, 7, 12, 2, true]} />
          <meshStandardMaterial map={tex.rock} normalMap={tex.rockNormal} color="#6f5a4c" side={THREE.DoubleSide} flatShading />
        </mesh>
        <mesh position={[0, 6.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 24]} />
          <meshBasicMaterial color="#ffb347" toneMapped={false} />
        </mesh>
        <pointLight ref={glow} position={[0, 8, 0]} color="#ff8a3d" distance={30} />
        <Motes count={50} scale={[3, 10, 3]} position={[0, 10, 0]} size={6} speed={1.2} color="#ffb070" />
      </group>
    </group>
  );
}

function City({ island }: { island: Island }) {
  const tex = getTextures();
  const items = useMemo(() => scatter(island, 46, 21, clearOf(island), 9, island.r - 4), [island]);
  const tiers = useMemo(() => [items.filter((i) => i.k < 0.4), items.filter((i) => i.k >= 0.4 && i.k < 0.8), items.filter((i) => i.k >= 0.8)], [items]);
  const heights = [5, 9, 15];
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  refs.forEach((ref, t) =>
    useInstances(ref, tiers[t], (o, it) => {
      o.scale.set(2.2 + it.s * 1.2, 1, 2.2 + it.s);
      o.position.y = heights[t] / 2;
    }),
  );
  const maps = useMemo(() => heights.map((h) => tiled(tex.windows, 1, h / 4)), [tex]);
  const spire = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spire.current) spire.current.rotation.y += dt * 0.5;
  });
  const lamps = useMemo(() => {
    const n = 18;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const d = island.ring + 10;
      return [island.x + Math.sin(a) * d, island.z + Math.cos(a) * d] as [number, number];
    });
  }, [island]);
  return (
    <group>
      {tiers.map((tier, t) => (
        <instancedMesh key={t} ref={refs[t]} args={[undefined, undefined, tier.length]} castShadow receiveShadow>
          <boxGeometry args={[1, heights[t], 1]} />
          <meshStandardMaterial map={maps[t]} emissiveMap={maps[t]} emissive="#ffffff" emissiveIntensity={0.9} roughness={0.6} metalness={0.2} />
        </instancedMesh>
      ))}
      {lamps.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 3.2, 6]} />
            <meshStandardMaterial color="#39424d" metalness={0.6} />
          </mesh>
          <mesh position={[0, 3.25, 0]}>
            <sphereGeometry args={[0.2, 10, 8]} />
            <meshStandardMaterial color="#bff2ff" emissive="#6fd8ff" emissiveIntensity={4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Menara Inferensi */}
      <group position={[island.x, 0, island.z]} name="landmark-berjalan">
        <mesh position={[0, 9, 0]} castShadow>
          <cylinderGeometry args={[1.2, 2.6, 18, 8]} />
          <meshStandardMaterial map={tex.metal} normalMap={tex.metalNormal} color="#8fa2b5" metalness={0.7} roughness={0.35} />
        </mesh>
        <group ref={spire} position={[0, 14, 0]}>
          {[4, 5.5, 7].map((r, i) => (
            <mesh key={r} rotation={[Math.PI / 2 + i * 0.25, 0, 0]}>
              <torusGeometry args={[r, 0.08, 8, 64]} />
              <meshStandardMaterial color="#6fc3ff" emissive="#6fc3ff" emissiveIntensity={3} toneMapped={false} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 19.2, 0]}>
          <octahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial color="#e6fbff" emissive="#9fe8ff" emissiveIntensity={4} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Dock({ island }: { island: Island }) {
  const tex = getTextures();
  const beam = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.elapsedTime * 0.6;
  });
  const houses = [
    [-14, 8, 0.4],
    [-16, -6, 1.2],
    [15, -8, -0.8],
    [16, 6, 2.3],
  ];
  return (
    <group>
      <Trees island={island} count={16} seed={31} min={15} />
      <Rocks island={island} count={8} seed={32} min={16} />
      {/* piers into the sea */}
      {[
        [-12, 22, 0.5],
        [13, 21, -0.6],
      ].map(([x, z, a], i) => (
        <mesh key={i} position={[x, 0.1, z]} rotation={[0, a, 0]} receiveShadow castShadow>
          <boxGeometry args={[2.6, 0.25, 14]} />
          <meshStandardMaterial map={tiled(tex.planks, 1, 3)} normalMap={tex.planksNormal} />
        </mesh>
      ))}
      {houses.map(([x, z, a], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, a, 0]}>
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[4, 3, 3.4]} />
            <meshStandardMaterial map={tiled(tex.planks, 2)} color="#e9d6b8" />
          </mesh>
          <mesh position={[0, 3.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[3.3, 1.8, 4]} />
            <meshStandardMaterial color={["#c8553d", "#3d7ea6", "#6a994e", "#bc6c25"][i]} roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 1.6, 1.71]}>
            <planeGeometry args={[0.8, 0.8]} />
            <meshStandardMaterial color="#ffe0a3" emissive="#ffc66d" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* lighthouse */}
      <group position={[-19, 0, -14]} name="landmark-dermaga">
        <mesh position={[0, 6, 0]} castShadow>
          <cylinderGeometry args={[1.1, 1.8, 12, 16]} />
          <meshStandardMaterial map={tiled(tex.tiles, 1, 3)} color="#f2ece2" />
        </mesh>
        {[3, 7].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[1.62 - y * 0.05, 1.7 - y * 0.05, 1, 16]} />
            <meshStandardMaterial color="#c8553d" />
          </mesh>
        ))}
        <mesh position={[0, 12.8, 0]}>
          <sphereGeometry args={[0.8, 16, 12]} />
          <meshStandardMaterial color="#fff3c4" emissive="#ffd66d" emissiveIntensity={5} toneMapped={false} />
        </mesh>
        <mesh ref={beam} position={[0, 12.8, 0]}>
          <coneGeometry args={[2.5, 22, 16, 1, true]} />
          <meshBasicMaterial color="#fff2c0" transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function Summit({ island }: { island: Island }) {
  const tex = getTextures();
  const scope = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (scope.current) scope.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.6;
  });
  return (
    <group>
      <Trees island={island} count={14} seed={41} palette={["#7aa86a", "#8dbb73"]} pines={0.8} min={17} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        if (Math.cos(a - Math.PI) > 0.9) return null;
        return (
          <mesh key={i} position={[island.x + Math.sin(a) * 19, 2.2, island.z + Math.cos(a) * 19]} castShadow>
            <cylinderGeometry args={[0.45, 0.55, 4.4, 12]} />
            <meshStandardMaterial map={tex.tiles} color="#f4f0e6" roughness={0.7} />
          </mesh>
        );
      })}
      {/* observatory dome */}
      <group position={[island.x, 0, island.z + 13]} name="landmark-observatorium">
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[4.4, 4.6, 4, 24]} />
          <meshStandardMaterial map={tiled(tex.tiles, 3, 1)} color="#efe9df" />
        </mesh>
        <mesh position={[0, 4, 0]} castShadow>
          <sphereGeometry args={[4.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {/* no normal map: the pole of a sphere has degenerate UVs */}
          <meshStandardMaterial color="#c9d4dd" metalness={0.8} roughness={0.3} />
        </mesh>
        <group ref={scope} position={[0, 6.2, 0]}>
          <mesh rotation={[-0.7, 0, 0]} position={[0, 0.6, -1.2]}>
            <cylinderGeometry args={[0.55, 0.75, 5, 16]} />
            <meshStandardMaterial color="#3b4a58" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      </group>
      <Motes count={70} scale={[30, 12, 30]} position={[island.x, 8, island.z]} size={3} speed={0.2} color="#e9ffc0" />
    </group>
  );
}

export function Biomes({ onWalk }: { onWalk: (p: THREE.Vector3) => boolean }) {
  return (
    <group>
      {islands.map((island) => (
        <group key={island.id}>
          <IslandGround island={island} onWalk={onWalk} />
          <Paths island={island} />
          {island.biome === "forest" && <Forest island={island} />}
          {island.biome === "mountain" && <Mountains island={island} />}
          {island.biome === "city" && <City island={island} />}
          {island.biome === "dock" && <Dock island={island} />}
          {island.biome === "summit" && <Summit island={island} />}
          <IslandTitle id={island.id} />
        </group>
      ))}
      {bridges.map((_, i) => (
        <BridgeMesh key={i} index={i} />
      ))}
    </group>
  );
}

/** A big floating name over each island, readable from the bridges. */
function IslandTitle({ id }: { id: RegionId }) {
  const island = islands.find((i) => i.id === id)!;
  const region = regionById[id];
  if (id === "dermaga") return null;
  return (
    <group position={[island.x, id === "observatorium" ? 16 : 24, island.z]}>
      <Label text={region.name} size={2.2} billboard color={region.color} weight={850} bg="rgba(10,24,30,0.55)" />
      <Label text={region.phase} size={1.1} billboard position={[0, -2.3, 0]} color="#f4efe6" weight={750} />
    </group>
  );
}
