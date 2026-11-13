// Custom shaders: a hologram material, an animated energy gate, and grass that
// sways in the wind. All values stay bounded so bloom never meets Infinity.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bridges, islands, lecterns, poses, type Island } from "./world";
import { stations } from "./content";

const animated = new Set<THREE.ShaderMaterial>();
/** One clock for every custom shader. */
export function ShaderClock() {
  useFrame(({ clock }) => animated.forEach((m) => (m.uniforms.uTime.value = clock.elapsedTime)));
  return null;
}

/** Fresnel rim + scanlines + a faint flicker: drone shell, beacons, holograms. */
export function makeHolo(color: string, strength = 1) {
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW; varying vec3 vWorld;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uStrength;
      varying vec3 vNormalW; varying vec3 vWorld;
      void main(){
        vec3 v = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - abs(dot(normalize(vNormalW), v)), 2.2);
        float scan = 0.5 + 0.5 * sin(vWorld.y * 38.0 - uTime * 5.0);
        float flicker = 0.92 + 0.08 * sin(uTime * 23.0 + vWorld.x * 3.0);
        float a = clamp((0.12 + rim * 0.9 + scan * 0.12) * flicker * uStrength, 0.0, 1.0);
        gl_FragColor = vec4(uColor * (0.6 + rim * 0.9), a);
      }`,
  });
  animated.add(m);
  return m;
}
export const useHolo = (color: string, strength = 1) => useMemo(() => makeHolo(color, strength), [color, strength]);

/** A closed bridge: rising stripes and a ripple, edges brighter than the middle. */
export function makeGate(color: string) {
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float stripes = 0.5 + 0.5 * sin((vUv.y * 14.0 - uTime * 2.0) * 3.14159);
        vec2 c = vUv - 0.5;
        float ripple = 0.5 + 0.5 * sin(length(c) * 40.0 - uTime * 4.0);
        float edge = smoothstep(0.38, 0.5, max(abs(c.x), abs(c.y)));
        float a = clamp(0.18 + stripes * 0.18 + ripple * 0.12 + edge * 0.5, 0.0, 0.85);
        gl_FragColor = vec4(uColor * (0.8 + edge * 0.6), a);
      }`,
  });
  animated.add(m);
  return m;
}

/* ---------------------------------------------------------------- grass -- */
const rand = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const segDist = (x: number, z: number, [ax, az]: [number, number], [bx, bz]: [number, number]) => {
  const dx = bx - ax,
    dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
};
/** Bare ground: paths, plazas, machines and bridge landings stay clear. */
function bare(island: Island, x: number, z: number) {
  const d = Math.hypot(x - island.x, z - island.z);
  if (d > island.r - 3.5) return true;
  if (island.ring && (d < 8 || Math.abs(d - (island.ring + 7.75)) < 2.1)) return true;
  if (island.biome === "dock" && d < 13.5) return true;
  if (island.biome === "summit" && d < 16.5) return true;
  for (const s of stations) {
    const p = poses[s.id];
    if (Math.hypot(p.x - x, p.z - z) < 6.2) return true;
  }
  for (const b of bridges) if (segDist(x, z, b.a, b.b) < 2.6) return true;
  for (const l of lecterns) if (Math.hypot(l.x - x, l.z - z) < 1.6) return true;
  return false;
}

const grassColors: Record<Island["biome"], [string, string]> = {
  forest: ["#2f6b2a", "#b7e07a"],
  dock: ["#3b7034", "#c9e58a"],
  summit: ["#56783f", "#e2edb0"],
  mountain: ["#6b5a3a", "#d8c48a"],
  city: ["#3b4a3a", "#8fa08a"],
};

function GrassPatch({ island, count }: { island: Island; count: number }) {
  const { geometry, material } = useMemo(() => {
    const r = rand(Math.round(island.x * 13 + island.z * 7 + 77));
    const pos: number[] = [],
      root: number[] = [],
      shape: number[] = [];
    let placed = 0,
      tries = 0;
    while (placed < count && tries++ < count * 6) {
      const a = r() * Math.PI * 2,
        d = Math.sqrt(r()) * island.r;
      const x = island.x + Math.sin(a) * d,
        z = island.z + Math.cos(a) * d;
      if (bare(island, x, z)) continue;
      const h = 0.35 + r() * 0.55,
        w = 0.07 + r() * 0.05,
        turn = r() * Math.PI,
        phase = r() * 6.28;
      // a single tapered triangle: two base corners and a tip
      for (const [vx, vy] of [
        [-w, 0],
        [w, 0],
        [0, h],
      ]) {
        pos.push(vx, vy, 0);
        root.push(x, 0.03, z);
        shape.push(turn, phase, h);
      }
      placed++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aRoot", new THREE.Float32BufferAttribute(root, 3));
    g.setAttribute("aShape", new THREE.Float32BufferAttribute(shape, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(island.x, 0.5, island.z), island.r + 2);
    const [base, tip] = grassColors[island.biome];
    const m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uTime: { value: 0 }, uBase: { value: new THREE.Color(base) }, uTip: { value: new THREE.Color(tip) } },
      ]),
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute vec3 aRoot; attribute vec3 aShape;
        varying float vH;
        #include <fog_pars_vertex>
        void main(){
          float c = cos(aShape.x), s = sin(aShape.x);
          vec3 p = vec3(position.x * c, position.y, position.x * s);
          float t = position.y / aShape.z;
          // wind: a slow gust travelling across the island plus a quick flutter
          float gust = sin(uTime * 1.3 + aRoot.x * 0.08 + aRoot.z * 0.05) * 0.5 + 0.5;
          float sway = (gust * 0.32 + sin(uTime * 3.1 + aShape.y) * 0.06) * t * t;
          p.x += sway; p.z += sway * 0.4; p.y -= sway * sway * 0.3;
          vH = t;
          vec4 mvPosition = viewMatrix * vec4(aRoot + p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase; uniform vec3 uTip; varying float vH;
        #include <fog_pars_fragment>
        void main(){
          vec3 col = mix(uBase, uTip, vH) * (0.75 + 0.35 * vH);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    animated.add(m);
    return { geometry: g, material: m };
  }, [island, count]);
  return <mesh geometry={geometry} material={material} frustumCulled />;
}

export function Grass({ dense }: { dense: boolean }) {
  const amount: Record<Island["biome"], number> = { forest: 9000, dock: 4500, summit: 3500, mountain: 2500, city: 0 };
  return (
    <>
      {islands
        .filter((i) => amount[i.biome])
        .map((i) => (
          <GrassPatch key={i.id} island={i} count={Math.round(amount[i.biome] * (dense ? 1 : 0.4))} />
        ))}
    </>
  );
}
