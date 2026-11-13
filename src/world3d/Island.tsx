// The floating island: ground, the token road, the model core in the middle,
// sky, and ambient tokens that keep flowing round the loop.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ISLAND, ROAD, RING, stationPose, stations, challengeKey, totalChallenges } from "./content";
import { useWorld } from "./store";

const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vPos; void main(){
          float h = vPos.y;
          vec3 top = vec3(0.03,0.06,0.13);
          vec3 mid = vec3(0.07,0.20,0.27);
          vec3 low = vec3(0.30,0.20,0.30);
          vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, low, pow(-h, 0.5));
          gl_FragColor = vec4(c, 1.0);
        }`,
      }),
    [],
  );
  const stars = useMemo(() => {
    const r = rand(7),
      pts: number[] = [];
    for (let i = 0; i < 700; i++) {
      const u = r() * 2 - 1,
        t = r() * Math.PI * 2,
        y = Math.abs(u) * 0.9 + 0.08,
        s = Math.sqrt(1 - y * y);
      pts.push(Math.cos(t) * s * 180, y * 180, Math.sin(t) * s * 180);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <group>
      <mesh material={material}>
        <sphereGeometry args={[200, 32, 16]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#cfe8ff" size={0.9} sizeAttenuation={false} transparent opacity={0.8} fog={false} />
      </points>
    </group>
  );
}

export function Ground({ onWalk }: { onWalk: (p: THREE.Vector3) => void }) {
  const crystals = useMemo(() => {
    const r = rand(42),
      list: { p: [number, number, number]; s: number; c: string; rot: number }[] = [];
    const palette = ["#7be0c3", "#a99cf5", "#6fc3ff", "#ff9f80"];
    while (list.length < 46) {
      const a = r() * Math.PI * 2,
        d = 8 + r() * (ISLAND - 9);
      const x = Math.sin(a) * d,
        z = Math.cos(a) * d;
      // keep machines, the road and the core clear
      const nearStation = stations.some((_, i) => {
        const p = stationPose(i);
        return Math.hypot(p.x - x, p.z - z) < 7.6;
      });
      if (nearStation || Math.abs(d - ROAD) < 2.2 || d < 7) continue;
      const between = stations.some((_, i) => {
        const p = stationPose(i);
        const t = (x * p.out[0] + z * p.out[1]) / 1;
        const off = Math.abs(x * p.out[1] - z * p.out[0]);
        return t > RING && t < ROAD + 1 && off < 1.6;
      });
      if (between) continue;
      list.push({ p: [x, 0, z], s: 0.4 + r() * 1.1, c: palette[(r() * palette.length) | 0], rot: r() * 3 });
    }
    return list;
  }, []);
  return (
    <group>
      {/* walkable top */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        name="ground"
        onClick={(e) => {
          if (e.delta > 8) return;
          e.stopPropagation();
          onWalk(e.point.clone());
        }}
      >
        <circleGeometry args={[ISLAND, 96]} />
        <meshStandardMaterial color="#1a3638" roughness={0.95} />
      </mesh>
      {/* island body */}
      <mesh position={[0, -1.6, 0]}>
        <cylinderGeometry args={[ISLAND, ISLAND - 3, 3.2, 96]} />
        <meshStandardMaterial color="#2a3a40" roughness={1} />
      </mesh>
      <mesh position={[0, -10, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[ISLAND - 3, 14, 48, 3]} />
        <meshStandardMaterial color="#1e2a30" roughness={1} flatShading />
      </mesh>
      {/* road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[ROAD - 1.5, ROAD + 1.5, 128]} />
        <meshStandardMaterial color="#284448" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[ROAD - 0.06, ROAD + 0.06, 160]} />
        <meshBasicMaterial color="#7be0c3" toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {/* spokes to each machine */}
      {stations.map((s, i) => {
        const p = stationPose(i);
        const mid = (RING + 5 + ROAD - 1.5) / 2;
        const len = ROAD - 1.5 - (RING + 5);
        return (
          <mesh key={s.id} position={[p.out[0] * mid, 0.03, p.out[1] * mid]} rotation={[-Math.PI / 2, 0, -p.angle]}>
            <planeGeometry args={[2.4, len]} />
            <meshStandardMaterial color="#284448" roughness={0.8} />
          </mesh>
        );
      })}
      {crystals.map((c, i) => (
        <mesh key={i} position={[c.p[0], c.s * 0.7, c.p[2]]} rotation={[0, c.rot, 0.15]} scale={[c.s * 0.6, c.s * 1.4, c.s * 0.6]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={c.c} emissive={c.c} emissiveIntensity={0.35} roughness={0.3} flatShading transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** The model itself, in the middle: two layers that light up with progress. */
export function Core() {
  const done = useWorld((s) => s.done.size);
  const rings = useRef<THREE.Group>(null);
  const progress = done / totalChallenges;
  useFrame((_, dt) => {
    if (rings.current) {
      rings.current.rotation.y += dt * 0.4;
      rings.current.children.forEach((c, i) => (c.rotation.x += dt * (0.2 + i * 0.15)));
    }
  });
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[4.2, 4.6, 0.6, 48]} />
        <meshStandardMaterial color="#1a2f37" />
      </mesh>
      {[0, 1].map((l) => (
        <mesh key={l} position={[0, 1.8 + l * 2.6, 0]}>
          <boxGeometry args={[2.6, 2.2, 2.6]} />
          <meshStandardMaterial color="#7be0c3" emissive="#7be0c3" emissiveIntensity={0.15 + progress * 1.2} transparent opacity={0.35 + progress * 0.4} roughness={0.1} />
        </mesh>
      ))}
      <group ref={rings} position={[0, 3.1, 0]}>
        {[3.2, 3.8, 4.4].map((r) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.04, 8, 96]} />
            <meshBasicMaterial color="#bff5e6" toneMapped={false} transparent opacity={0.3 + progress * 0.6} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 4, 0]} color="#7be0c3" intensity={8 + progress * 40} distance={22} />
    </group>
  );
}

/** Tokens drifting round the road, so the loop reads as a flow. */
export function Flow() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 36;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => {
    const palette = ["#7be0c3", "#f2c46d", "#a99cf5", "#ff9f80", "#6fc3ff"].map((c) => new THREE.Color(c));
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
  }, []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + clock.elapsedTime * 0.05;
      dummy.position.set(Math.sin(a) * (ROAD + 0.9), 0.5 + Math.sin(clock.elapsedTime * 2 + i) * 0.12, Math.cos(a) * (ROAD + 0.9));
      dummy.rotation.set(0, a, clock.elapsedTime + i);
      dummy.scale.setScalar(0.28);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, colors[i]);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export const stationDone = (done: Set<string>, index: number) =>
  stations[index].challenges.every((c) => done.has(challengeKey(stations[index].id, c.id)));
