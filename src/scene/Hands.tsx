import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { fieldTools, type Point3 } from "../content/world";
import { gameInput, useGame } from "../store/game";
import { useExperience } from "../store/experience";

function Part({
  at,
  size,
  color,
  glow = false,
}: {
  at: Point3;
  size: Point3;
  color: string;
  glow?: boolean;
}) {
  return (
    <mesh position={at} renderOrder={1000}>
      <boxGeometry args={size} />
      <meshBasicMaterial
        color={color}
        toneMapped={!glow}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
function Glove({
  left = false,
  compact = false,
}: {
  left?: boolean;
  compact?: boolean;
}) {
  return (
    <group
      position={
        left
          ? [compact ? -0.22 : -0.42, -0.36, -0.59]
          : [compact ? 0.22 : 0.43, -0.37, -0.55]
      }
      rotation={left ? [0.2, -0.25, -0.35] : [0.15, 0.2, 0.2]}
    >
      <Part at={[0, -0.14, 0.1]} size={[0.16, 0.36, 0.19]} color="#304951" />
      <Part at={[0, 0.035, 0.025]} size={[0.18, 0.09, 0.2]} color="#a6b8b3" />
      <Part at={[0, 0.06, -0.015]} size={[0.14, 0.12, 0.17]} color="#536967" />
      {[0, 1, 2, 3].map((i) => (
        <Part
          key={i}
          at={[(i - 1.5) * 0.034, 0.13, -0.045]}
          size={[0.03, 0.1, 0.09]}
          color={i % 2 ? "#738983" : "#84968e"}
        />
      ))}
      <Part
        at={[left ? 0.09 : -0.09, 0.075, -0.035]}
        size={[0.065, 0.08, 0.11]}
        color="#81948b"
      />
      <Part
        at={[0, -0.02, 0.13]}
        size={[0.09, 0.025, 0.015]}
        color="#8be5ca"
        glow
      />
    </group>
  );
}
export default function Hands() {
  const root = useRef<T.Group>(null),
    rig = useRef<T.Group>(null),
    tool = useRef<T.Group>(null);
  const { camera, invalidate, size } = useThree();
  const compact = size.width / size.height < 0.9;
  const selected = useGame((s) => s.tool),
    pulse = useGame((s) => s.pulse);
  const previous = useRef(selected),
    lastPulse = useRef(pulse),
    lift = useRef(0),
    kick = useRef(0),
    time = useRef(0);
  const rotation = useMemo(() => new T.Euler(0, 0, 0, "YXZ"), []),
    lastYaw = useRef(0),
    sway = useRef(0);
  const color = fieldTools.find((t) => t.id === selected)!.color;
  useFrame((_, delta) => {
    if (!root.current || !rig.current || !tool.current || document.hidden)
      return;
    const dt = Math.min(delta, 0.05),
      reduced = useExperience.getState().reducedMotion;
    root.current.position.copy(camera.position);
    root.current.quaternion.copy(camera.quaternion);
    rig.current.scale.setScalar(compact ? 0.65 : 1);
    if (previous.current !== selected) {
      previous.current = selected;
      lift.current = reduced ? 0 : 0.18;
    }
    if (lastPulse.current !== pulse) {
      lastPulse.current = pulse;
      kick.current = reduced ? 0 : 0.07;
    }
    lift.current = T.MathUtils.damp(lift.current, 0, 12, dt);
    kick.current = T.MathUtils.damp(kick.current, 0, 11, dt);
    rotation.setFromQuaternion(camera.quaternion);
    const turn = T.MathUtils.clamp(rotation.y - lastYaw.current, -0.1, 0.1);
    lastYaw.current = rotation.y;
    sway.current = T.MathUtils.damp(
      sway.current,
      reduced ? 0 : turn * 0.7,
      8,
      dt,
    );
    if (gameInput.walking > 0.05) time.current += dt * 8;
    const bob = reduced
      ? 0
      : Math.sin(time.current) * Math.min(gameInput.walking, 3.4) * 0.006;
    rig.current.position.set(
      -sway.current,
      bob - lift.current - (compact ? 0.17 : 0.13),
      kick.current - (compact ? 0.35 : 0.23),
    );
    tool.current.rotation.z = reduced ? 0 : sway.current * 2;
    if (lift.current + kick.current + Math.abs(sway.current) > 0.0001)
      invalidate();
  });
  return (
    <group ref={root} name="first-person-hands">
      <group ref={rig}>
        <Glove compact={compact} />
        <Glove left compact={compact} />
        <group
          ref={tool}
          position={[compact ? 0.18 : 0.4, -0.18, -0.68]}
          rotation={[-0.12, -0.08, 0]}
        >
          <Part at={[0, -0.1, 0.05]} size={[0.1, 0.22, 0.12]} color="#182d39" />
          {selected === "scanner" && (
            <>
              <Part
                at={[-0.035, 0.02, 0]}
                size={[0.28, 0.24, 0.085]}
                color="#415e62"
              />
              <Part
                at={[-0.035, 0.03, 0.048]}
                size={[0.235, 0.17, 0.012]}
                color="#0c2429"
              />
              {[0, 1, 2, 3].map((i) => (
                <Part
                  key={i}
                  at={[-0.09 + i * 0.045, 0.025, 0.057]}
                  size={[0.025, 0.04 + i * 0.023, 0.006]}
                  color={color}
                  glow
                />
              ))}
              <Part
                at={[-0.035, -0.067, 0.052]}
                size={[0.14, 0.009, 0.01]}
                color={color}
                glow
              />
              <Part
                at={[0.055, 0.18, -0.025]}
                size={[0.04, 0.11, 0.04]}
                color="#a2b6b0"
              />
            </>
          )}
          {selected === "token" && (
            <>
              <Part
                at={[0, 0.015, 0]}
                size={[0.21, 0.09, 0.22]}
                color="#4b5b60"
              />
              <Part
                at={[-0.105, 0.1, -0.02]}
                size={[0.035, 0.16, 0.06]}
                color="#a1afa1"
              />
              <Part
                at={[0.105, 0.1, -0.02]}
                size={[0.035, 0.16, 0.06]}
                color="#a1afa1"
              />
              <group rotation={[0.3, 0.5, 0.2]}>
                <Part
                  at={[0, 0.15, -0.03]}
                  size={[0.105, 0.105, 0.105]}
                  color={color}
                  glow
                />
              </group>
            </>
          )}
          {selected === "lens" && (
            <>
              <mesh position={[0, 0.095, 0]} renderOrder={1000}>
                <torusGeometry args={[0.14, 0.035, 8, 32]} />
                <meshBasicMaterial
                  color="#78828f"
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
              <mesh position={[0, 0.095, 0.012]} renderOrder={1001}>
                <circleGeometry args={[0.112, 32]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.48}
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
              <Part
                at={[0, 0.095, 0.025]}
                size={[0.005, 0.2, 0.005]}
                color={color}
                glow
              />
              <Part
                at={[0, 0.095, 0.025]}
                size={[0.2, 0.005, 0.005]}
                color={color}
                glow
              />
            </>
          )}
          {selected === "time" && (
            <>
              <Part
                at={[0, 0.055, 0]}
                size={[0.25, 0.23, 0.12]}
                color="#3b5364"
              />
              <mesh position={[0, 0.065, 0.069]} renderOrder={1001}>
                <torusGeometry args={[0.076, 0.012, 8, 32]} />
                <meshBasicMaterial
                  color={color}
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
              <Part
                at={[0, 0.085, 0.075]}
                size={[0.008, 0.055, 0.006]}
                color={color}
                glow
              />
              <Part
                at={[0.023, 0.06, 0.075]}
                size={[0.05, 0.008, 0.006]}
                color={color}
                glow
              />
              <Part at={[0, 0.2, 0]} size={[0.075, 0.05, 0.06]} color={color} />
            </>
          )}
          {selected === "tuner" && (
            <>
              <Part
                at={[0, 0.06, 0]}
                size={[0.12, 0.22, 0.1]}
                color="#596b70"
              />
              <Part
                at={[-0.09, 0.18, 0]}
                size={[0.065, 0.15, 0.1]}
                color="#c7d3c1"
              />
              <Part
                at={[0.09, 0.18, 0]}
                size={[0.065, 0.15, 0.1]}
                color="#c7d3c1"
              />
              <Part at={[0, 0.13, 0]} size={[0.2, 0.06, 0.1]} color="#c7d3c1" />
              <Part
                at={[0, 0.04, 0.06]}
                size={[0.06, 0.09, 0.02]}
                color={color}
                glow
              />
              <mesh position={[0, 0.25, 0]} renderOrder={1001}>
                <octahedronGeometry args={[0.045]} />
                <meshBasicMaterial
                  color={color}
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
            </>
          )}
        </group>
        <group
          position={[compact ? -0.2 : -0.39, -0.31, -0.5]}
          rotation={[0.1, -0.2, -0.25]}
        >
          <Part at={[0, 0, 0]} size={[0.12, 0.07, 0.05]} color="#213941" />
          <Part
            at={[0, 0.02, 0.03]}
            size={[0.08, 0.026, 0.008]}
            color={color}
            glow
          />
        </group>
      </group>
    </group>
  );
}
