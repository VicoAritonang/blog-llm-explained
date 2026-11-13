// Nara, the companion drone: no propellers, it hovers on light. It floats beside
// the walker (or beside the camera inside a machine and in first person), looks
// at the visitor, and darts towards the next mission when it gives directions.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { activeMission, useWorld } from "./store";
import { player } from "./player";
import { poses } from "./world";
import { useHolo } from "./shaders";

const tmp = new THREE.Vector3(),
  fwd = new THREE.Vector3(),
  right = new THREE.Vector3();

export function Companion() {
  const root = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const eye = useRef<THREE.Mesh>(null);
  const pointUntil = useRef(0);
  const lastSay = useRef(0);
  const shell = useHolo("#7be0c3", 0.55);
  const ringMat = useHolo("#9fe8ff", 1);
  const beam = useHolo("#7be0c3", 0.45);
  useFrame(({ camera, clock }, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.1);
    const t = clock.elapsedTime;
    const s = useWorld.getState();
    if (s.nara && s.nara.n !== lastSay.current) {
      lastSay.current = s.nara.n;
      if (s.nara.point) pointUntil.current = t + 2.6;
    }
    camera.getWorldDirection(fwd);
    right.crossVectors(fwd, camera.up).normalize();
    const mission = activeMission(s);
    if (t < pointUntil.current && mission) {
      // fly a few metres towards the mission, like pointing the way
      const p = poses[mission.id];
      tmp.set(p.x - player.pos.x, 0, p.z - player.pos.z).normalize().multiplyScalar(4.5);
      tmp.add(player.pos).setY(2.6 + player.y);
    } else if (s.view === "fp" || s.focus || s.reading) {
      // first person and inside a machine: hover at the right edge of the view
      tmp.copy(camera.position).addScaledVector(fwd, 3.8).addScaledVector(right, 1.9);
      tmp.y += s.view === "fp" ? 0.35 : -0.35;
    } else {
      // walking: over the right shoulder
      tmp.copy(player.pos).addScaledVector(right, 1.4);
      tmp.y = 2.5 + player.y;
    }
    tmp.y += Math.sin(t * 2.1) * 0.12;
    const k = 1 - Math.exp(-dt * (t < pointUntil.current ? 3 : 5));
    g.position.lerp(tmp, k);
    // face the camera, tilted a little in the direction it travels
    g.lookAt(camera.position.x, g.position.y, camera.position.z);
    g.rotation.z = Math.sin(t * 1.3) * 0.08;
    if (ringA.current) ringA.current.rotation.set(t * 1.6, t * 0.7, 0);
    if (ringB.current) ringB.current.rotation.set(-t * 0.9, 0, t * 1.4);
    if (eye.current) {
      // blink every few seconds, glow brighter while speaking
      const blink = (t % 4.3) < 0.12 ? 0.15 : 1;
      eye.current.scale.set(1, blink, 1);
      const talking = s.nara ? 1 : 0;
      (eye.current.material as THREE.MeshBasicMaterial).color.setScalar(0.75 + talking * 0.25 + Math.sin(t * 6) * 0.05);
    }
  });
  return (
    <group ref={root} position={[player.pos.x + 1.4, 2.5, player.pos.z]} name="nara">
      {/* core */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 24]} />
        <meshPhysicalMaterial color="#f4f8f7" roughness={0.18} metalness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh scale={1.12} material={shell}>
        <sphereGeometry args={[0.3, 32, 24]} />
      </mesh>
      {/* visor band and eye */}
      <mesh position={[0, 0.02, 0.17]} scale={[1, 0.55, 0.6]}>
        <sphereGeometry args={[0.24, 32, 16]} />
        <meshStandardMaterial color="#0b1a20" roughness={0.05} metalness={0.7} />
      </mesh>
      <mesh ref={eye} position={[0, 0.03, 0.3]}>
        <capsuleGeometry args={[0.035, 0.05, 6, 12]} />
        <meshBasicMaterial color="#9ff5e4" toneMapped={false} />
      </mesh>
      {/* side fins */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.33, -0.02, -0.02]} rotation={[0, 0, side * 0.5]}>
          <boxGeometry args={[0.12, 0.05, 0.22]} />
          <meshStandardMaterial color="#cfd9dc" metalness={0.6} roughness={0.25} />
        </mesh>
      ))}
      {/* orbit rings instead of propellers */}
      <mesh ref={ringA} material={ringMat}>
        <torusGeometry args={[0.46, 0.012, 8, 64]} />
      </mesh>
      <mesh ref={ringB} material={ringMat}>
        <torusGeometry args={[0.54, 0.01, 8, 64]} />
      </mesh>
      {/* the light it hovers on */}
      <mesh position={[0, -0.55, 0]} rotation={[Math.PI, 0, 0]} material={beam}>
        <coneGeometry args={[0.22, 0.6, 24, 1, true]} />
      </mesh>
      <pointLight color="#7be0c3" intensity={3} distance={4} position={[0, -0.3, 0]} />
    </group>
  );
}
