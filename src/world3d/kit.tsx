// Small 3D building blocks shared by every station.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";

const FONT = '"Source Sans 3 Variable", "Segoe UI", sans-serif';
const textures = new Map<string, { texture: THREE.CanvasTexture; aspect: number }>();

/** Text rendered once to a canvas with the bundled font, then cached. */
export function textTexture(
  text: string,
  { color = "#eaf6f3", bg = "", weight = 650 }: { color?: string; bg?: string; weight?: number } = {},
) {
  const key = `${text}|${color}|${bg}|${weight}`;
  const hit = textures.get(key);
  if (hit) return hit;
  const px = 64,
    padX = bg ? 26 : 8,
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d")!;
  ctx.font = `${weight} ${px}px ${FONT}`;
  const width = Math.ceil(ctx.measureText(text || " ").width + padX * 2);
  const height = Math.ceil(px * 1.36);
  canvas.width = width;
  canvas.height = height;
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, height * 0.32);
    ctx.fill();
  }
  ctx.font = `${weight} ${px}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, padX, height / 2 + px * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const result = { texture, aspect: width / height };
  textures.set(key, result);
  return result;
}

interface LabelProps {
  text: string;
  size?: number;
  color?: string;
  bg?: string;
  weight?: number;
  billboard?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  anchor?: "left" | "center" | "right";
  opacity?: number;
  depthTest?: boolean;
}
export function Label({
  text,
  size = 0.4,
  color,
  bg,
  weight,
  billboard,
  position,
  rotation,
  anchor = "center",
  opacity = 1,
  depthTest = true,
}: LabelProps) {
  const { texture, aspect } = useMemo(
    () => textTexture(text, { color, bg, weight }),
    [text, color, bg, weight],
  );
  // The canvas line box is taller than the glyphs; scale so `size` is the cap height.
  const h = size * 1.36,
    w = h * aspect;
  const offset = anchor === "left" ? w / 2 : anchor === "right" ? -w / 2 : 0;
  const mesh = (
    <mesh position={billboard ? [offset, 0, 0] : position} rotation={billboard ? undefined : rotation}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={depthTest}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
  if (billboard)
    return (
      <Billboard position={position}>
        {mesh}
      </Billboard>
    );
  if (!offset) return mesh;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[offset, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Wraps a click so camera drags never count as presses. */
export const tap =
  (fn: () => void) =>
  (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    fn();
  };

let hovering = 0;
export const setCursor = (delta: number) => {
  hovering = Math.max(0, hovering + delta);
  document.body.style.cursor = hovering ? "pointer" : "";
};

/** Pointer cursor while `on` is true; releases itself if `on` flips while hovered. */
export function useHoverCursor(on: boolean) {
  useEffect(() => {
    if (!on) return;
    setCursor(1);
    return () => setCursor(-1);
  }, [on]);
}

/** Anything the visitor can press: hover lift, pointer cursor, tap guard. */
export function Clickable({
  children,
  onTap,
  enabled = true,
  position,
  rotation,
  lift = 1.06,
  name,
}: {
  children: ReactNode;
  onTap: () => void;
  enabled?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  lift?: number;
  name?: string;
}) {
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!hover) return;
    setCursor(1);
    return () => setCursor(-1);
  }, [hover]);
  useEffect(() => {
    if (!enabled) setHover(false);
  }, [enabled]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const target = hover ? lift : 1;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target, 14, dt));
  });
  return (
    <group
      ref={group}
      name={name}
      position={position}
      rotation={rotation}
      onClick={
        enabled
          ? tap(onTap)
          : undefined
      }
      onPointerOver={
        enabled
          ? (e) => {
              e.stopPropagation();
              setHover(true);
            }
          : undefined
      }
      onPointerOut={enabled ? () => setHover(false) : undefined}
    >
      {children}
    </group>
  );
}

/** A big round arcade button. */
export function PushButton({
  position,
  color,
  label,
  onPress,
  enabled = true,
  radius = 0.55,
  labelSize = 0.22,
  name,
}: {
  position: [number, number, number];
  color: string;
  label?: string;
  onPress: () => void;
  enabled?: boolean;
  radius?: number;
  labelSize?: number;
  name?: string;
}) {
  const cap = useRef<THREE.Mesh>(null);
  const pressed = useRef(0);
  useFrame((_, dt) => {
    pressed.current = Math.max(0, pressed.current - dt * 3);
    if (cap.current) cap.current.position.y = 0.28 - pressed.current * 0.14;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[radius * 1.25, radius * 1.35, 0.2, 32]} />
        <meshStandardMaterial color="#1b2b33" roughness={0.6} metalness={0.3} />
      </mesh>
      <Clickable
        enabled={enabled}
        name={name}
        onTap={() => {
          pressed.current = 1;
          onPress();
        }}
      >
        <mesh ref={cap} position={[0, 0.28, 0]}>
          <cylinderGeometry args={[radius, radius, 0.22, 32]} />
          <meshStandardMaterial
            color={enabled ? color : "#46545a"}
            emissive={enabled ? color : "#000"}
            emissiveIntensity={enabled ? 0.55 : 0}
            roughness={0.35}
          />
        </mesh>
      </Clickable>
      {label && (
        <Label
          text={label}
          size={labelSize}
          position={[0, 0.215, radius * 1.32 + 0.22]}
          rotation={[-Math.PI / 2.6, 0, 0]}
          color={enabled ? "#eaf6f3" : "#8a989c"}
          weight={750}
        />
      )}
    </group>
  );
}

/** "Do this next": a ring that breathes plus a bobbing arrow. */
export function Pulse({
  position,
  color = "#fff3b0",
  radius = 0.7,
  arrow = true,
}: {
  position: [number, number, number];
  color?: string;
  radius?: number;
  arrow?: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const cone = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.8) % 1;
    if (ring.current) {
      ring.current.scale.setScalar(0.7 + t * 0.7);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
    }
    if (cone.current) cone.current.position.y = radius + 0.9 + Math.sin(clock.elapsedTime * 4) * 0.15;
  });
  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.86, radius, 40]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {arrow && (
        <mesh ref={cone} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.36, 4]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** A labelled block: tokens, chips, cartridges. */
export function Block({
  size,
  color,
  text,
  textColor = "#0d1b20",
  textSize = 0.24,
  position,
  emissive = 0.25,
  sub,
}: {
  size: [number, number, number];
  color: string;
  text?: string;
  textColor?: string;
  textSize?: number;
  position?: [number, number, number];
  emissive?: number;
  sub?: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.45} />
      </mesh>
      {text && (
        <Label text={text} size={textSize} color={textColor} weight={750} position={[0, sub ? textSize * 0.35 : 0, size[2] / 2 + 0.01]} />
      )}
      {sub && (
        <Label text={sub} size={textSize * 0.62} color={textColor} weight={600} opacity={0.8} position={[0, -textSize * 0.75, size[2] / 2 + 0.01]} />
      )}
    </group>
  );
}

/** Smoothly follows a target vector; used for things that slide into place. */
export function useDamped(target: THREE.Vector3Tuple, speed = 8, from?: THREE.Vector3Tuple) {
  const ref = useRef<THREE.Group>(null);
  const first = useRef(true);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (first.current) {
      g.position.set(...(from ?? target));
      first.current = false;
      return;
    }
    g.position.x = THREE.MathUtils.damp(g.position.x, target[0], speed, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, target[1], speed, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, target[2], speed, dt);
  });
  return ref;
}

/** A group that eases toward a position every frame. */
export function Slide({
  to,
  speed = 8,
  children,
  from,
}: {
  to: THREE.Vector3Tuple;
  speed?: number;
  children: ReactNode;
  from?: THREE.Vector3Tuple;
}) {
  const ref = useDamped(to, speed, from);
  return (
    <group ref={ref} position={from ?? to}>
      {children}
    </group>
  );
}

/** Hexagonal platform each machine stands on. */
export function Plinth({ radius = 5.2, color }: { radius?: number; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius + 0.3, 0.4, 6]} />
        <meshStandardMaterial color="#1a2f37" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <ringGeometry args={[radius - 0.22, radius - 0.08, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

export const fmtPct = (p: number) =>
  p >= 0.995 && p < 1 ? ">99%" : p > 0 && p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`;

/** Appears after `delay` seconds, sliding in from `from`. */
export function DelayedSlide({ delay, to, from, children }: { delay: number; to: THREE.Vector3Tuple; from?: THREE.Vector3Tuple; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    if (born.current === null) {
      born.current = clock.elapsedTime;
      g.position.set(...(from ?? to));
    }
    const live = clock.elapsedTime - born.current >= delay;
    g.visible = live;
    if (!live) return;
    g.position.x = THREE.MathUtils.damp(g.position.x, to[0], 9, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, to[1], 9, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, to[2], 9, dt);
  });
  return (
    <group ref={group} visible={false}>
      {children}
    </group>
  );
}
