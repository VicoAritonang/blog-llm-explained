// First-person view: the camera sits in the walker's head. On desktop a click
// locks the pointer and the mouse looks around; elsewhere dragging looks around.
// The tool in hand is drawn in front of the camera, Minecraft style.
import { useEffect, useRef } from "react";
import { createPortal, events, useFrame, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";
import { useWorld } from "./store";
import { player } from "./player";
import { faceTexture } from "./Blocks";

export const EYE = 1.62;
export const useLock = create<{ locked: boolean }>(() => ({ locked: false }));
const clampPitch = (p: number) => Math.max(-1.45, Math.min(1.45, p));

/** Pointer events aim from the crosshair while the pointer is locked. */
export function crosshairEvents(store: Parameters<typeof events>[0]) {
  const base = events(store);
  return {
    ...base,
    compute(event: { offsetX: number; offsetY: number }, state: RootState) {
      if (document.pointerLockElement) state.pointer.set(0, 0);
      else state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1);
      state.raycaster.setFromCamera(state.pointer, state.camera);
    },
  };
}

export function FirstPerson() {
  const viewMode = useWorld((s) => s.view);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const fp = viewMode === "fp";
  useEffect(() => {
    if (!fp) return;
    camera.rotation.order = "YXZ";
    const d = new THREE.Vector3();
    camera.getWorldDirection(d);
    player.yaw = Math.atan2(-d.x, -d.z);
    player.pitch = -0.08;
    scene.add(camera); // so the held tool, a child of the camera, is drawn
    const el = gl.domElement;
    const fine = matchMedia("(pointer: fine)").matches;
    const onLock = () => useLock.setState({ locked: document.pointerLockElement === el });
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      player.yaw -= e.movementX * 0.0022;
      player.pitch = clampPitch(player.pitch - e.movementY * 0.0022);
    };
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if (document.pointerLockElement === el || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      player.yaw -= (e.clientX - drag.x) * 0.005;
      player.pitch = clampPitch(player.pitch - (e.clientY - drag.y) * 0.005);
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => (drag = null);
    const click = () => {
      const s = useWorld.getState();
      if (fine && !document.pointerLockElement && s.started && !s.panel && !s.dialog && !s.reading) el.requestPointerLock?.()?.catch?.(() => {});
    };
    const menu = (e: Event) => e.preventDefault();
    document.addEventListener("pointerlockchange", onLock);
    document.addEventListener("mousemove", onMouse);
    el.addEventListener("pointerdown", down);
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    el.addEventListener("click", click);
    el.addEventListener("contextmenu", menu);
    return () => {
      document.removeEventListener("pointerlockchange", onLock);
      document.removeEventListener("mousemove", onMouse);
      el.removeEventListener("pointerdown", down);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      el.removeEventListener("click", click);
      el.removeEventListener("contextmenu", menu);
      if (document.pointerLockElement === el) document.exitPointerLock();
      useLock.setState({ locked: false });
      camera.rotation.order = "XYZ";
    };
  }, [fp, camera, gl, scene]);
  // panels and dialogs need the cursor back
  const panel = useWorld((s) => s.panel);
  const dialog = useWorld((s) => s.dialog);
  const reading = useWorld((s) => !!s.reading);
  useEffect(() => {
    if ((panel || dialog || reading) && document.pointerLockElement) document.exitPointerLock();
  }, [panel, dialog, reading]);
  useFrame(() => {
    // while a book is open the camera leans over the lectern instead
    if (!fp || useWorld.getState().reading) return;
    camera.position.set(player.pos.x, EYE + player.y, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  });
  return fp ? createPortal(<HeldTool />, camera) : null;
}

/** The tool in the right hand: bobs while walking, swings when used. */
function HeldTool() {
  const tool = useWorld((s) => s.tool);
  const token = useWorld((s) => s.blockToken);
  const group = useRef<THREE.Group>(null);
  const swing = useRef(0);
  const used = useWorld((s) => (s.scan?.n ?? 0) + s.blocks.length);
  const last = useRef(used);
  if (last.current !== used) {
    last.current = used;
    swing.current = 1;
  }
  useEffect(() => {
    const kick = () => (swing.current = 1);
    addEventListener("pointerdown", kick);
    return () => removeEventListener("pointerdown", kick);
  }, []);
  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    swing.current = Math.max(0, swing.current - dt * 4);
    const walk = Math.min(1, player.speed / 9);
    const t = clock.elapsedTime;
    g.position.set(0.42 + Math.sin(t * 9) * 0.015 * walk, -0.36 + Math.abs(Math.cos(t * 9)) * 0.02 * walk - swing.current * 0.05, -0.75);
    g.rotation.set(-0.15 - Math.sin(swing.current * Math.PI) * 0.6, -0.35, 0.05);
  });
  return (
    <group ref={group}>
      {tool === "tangan" && (
        <group rotation={[0.4, 0, 0]}>
          <mesh position={[0, 0, 0.12]}>
            <boxGeometry args={[0.13, 0.13, 0.42]} />
            <meshStandardMaterial color="#3d7ea6" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, -0.14]}>
            <boxGeometry args={[0.13, 0.13, 0.14]} />
            <meshStandardMaterial color="#f1d3b3" roughness={0.8} />
          </mesh>
        </group>
      )}
      {tool === "pemindai" && (
        <group>
          <mesh>
            <boxGeometry args={[0.16, 0.12, 0.34]} />
            <meshStandardMaterial color="#2a3340" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.04, 20]} />
            <meshBasicMaterial color="#9ff5e4" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.062, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.11, 0.15]} />
            <meshBasicMaterial color="#58e0d0" toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.1, 0.1]}>
            <boxGeometry args={[0.07, 0.12, 0.08]} />
            <meshStandardMaterial color="#1b2329" />
          </mesh>
        </group>
      )}
      {tool === "balok" && (
        <mesh rotation={[0.3, 0.6, 0]}>
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <meshStandardMaterial map={faceTexture(token)} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}
