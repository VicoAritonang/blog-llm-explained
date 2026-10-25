import { t } from "../i18n/core.mjs";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { useGame, gameInput, cycleTool } from "../store/game";
import { useExperience } from "../store/experience";
import { fieldTools, worldStations } from "../content/world";
import { stations, type StationId } from "../content/lessons";
import { moveInLab } from "./world-physics.mjs";

export function captureWorld(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  canvas.focus();
  if (matchMedia("(pointer: coarse)").matches) return;
  try {
    const request = canvas.requestPointerLock?.();
    request?.catch(() =>
      useGame
        .getState()
        .notify(
          t(
            "Mouse bebas: seret dunia untuk melihat, lalu gunakan WASD. Esc melepas kendali.",
          ),
        ),
    );
  } catch {
    useGame
      .getState()
      .notify(t("Seret dunia untuk melihat dan gunakan WASD untuk berjalan."));
  }
}

export default function Player() {
  const { camera, gl, invalidate } = useThree();
  const keys = useRef(new Set<string>()),
    velocity = useRef(new T.Vector2());
  const jump = useRef({ height: 0, speed: 0 }),
    walkingPhase = useRef(0);
  const ray = useMemo(() => new T.Ray(), []);
  const direction = useMemo(() => new T.Vector3(), []),
    hit = useMemo(() => new T.Vector3(), []);
  const yaw = useMemo(() => new T.Euler(0, 0, 0, "YXZ"), []);
  const destination = useGame((s) => s.destination),
    serial = useGame((s) => s.travelSerial);
  const obstacles = useMemo(
    () =>
      Object.values(worldStations).map((s) => [s.position[0], s.position[2]]),
    [],
  );
  const targets = useMemo(
    () =>
      stations.map((s) => {
        const [x, , z] = worldStations[s.id].position;
        return {
          id: s.id,
          x,
          z,
          box: new T.Box3(
            new T.Vector3(x - 2.1, 0.2, z - 1.8),
            new T.Vector3(x + 2.1, 6, z + 1.8),
          ),
        };
      }),
    [],
  );
  useEffect(() => {
    const station = worldStations[destination],
      [x, , z] = station.position;
    camera.position.set(
      x + (station.yaw === 0 ? -1.4 : 1.4),
      1.72,
      z + (station.yaw === 0 ? 6.4 : -6.4),
    );
    camera.lookAt(x, 2.05, z);
    useGame.getState().setAim(destination, 6.5);
    velocity.current.set(0, 0);
    jump.current = { height: 0, speed: 0 };
    keys.current.clear();
    invalidate();
  }, [destination, serial, camera, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    gameInput.wake = invalidate;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      t(
        "Dunia lab 3D. Klik untuk kendali, WASD berjalan, E gunakan alat, H hint, Esc lepas mouse.",
      ),
    );
    let dragging = false,
      startX = 0,
      startY = 0,
      previousX = 0,
      previousY = 0,
      moved = false;
    const clear = () => {
      keys.current.clear();
      dragging = false;
      gameInput.forward = 0;
      gameInput.strafe = 0;
      gameInput.jump = false;
    };
    const lockChanged = () => {
      const locked = document.pointerLockElement === canvas;
      useGame.setState({ locked });
      clear();
      invalidate();
    };
    const rotate = (dx: number, dy: number) => {
      yaw.setFromQuaternion(camera.quaternion);
      yaw.y -= dx * 0.0022;
      yaw.x = T.MathUtils.clamp(yaw.x - dy * 0.0022, -1.35, 1.35);
      camera.quaternion.setFromEuler(yaw);
      invalidate();
    };
    const down = (e: PointerEvent) => {
      if (useGame.getState().panel) return;
      canvas.focus();
      if (document.pointerLockElement === canvas) {
        if (e.button === 0) useGame.getState().useTool();
        return;
      }
      dragging = true;
      moved = false;
      startX = previousX = e.clientX;
      startY = previousY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (useGame.getState().panel) return;
      if (document.pointerLockElement === canvas)
        rotate(e.movementX, e.movementY);
      else if (dragging) {
        moved ||= Math.hypot(e.clientX - startX, e.clientY - startY) > 5;
        rotate(e.clientX - previousX, e.clientY - previousY);
        previousX = e.clientX;
        previousY = e.clientY;
      }
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      if (!moved && e.pointerType !== "touch") captureWorld(canvas);
    };
    const wheel = (e: WheelEvent) => {
      if (!useGame.getState().panel) {
        e.preventDefault();
        cycleTool(e.deltaY > 0 ? 1 : -1);
        invalidate();
      }
    };
    const keydown = (e: KeyboardEvent) => {
      if (window.scrollY > innerHeight * 0.75) {
        clear();
        return;
      }
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      const g = useGame.getState();
      if (e.code === "Escape") {
        clear();
        if (g.panel) g.openPanel(null);
        return;
      }
      if (
        e.repeat &&
        ["KeyH", "KeyM", "KeyJ", "KeyE", "KeyR", "KeyF"].includes(e.code)
      )
        return;
      if (e.code === "KeyH") {
        useGame.setState({ guide: !g.guide });
        e.preventDefault();
      }
      if (e.code === "KeyM") {
        g.openPanel(g.panel === "map" ? null : "map");
        e.preventDefault();
      }
      if (e.code === "KeyJ") {
        g.openPanel(g.panel === "journal" ? null : "journal");
        e.preventDefault();
      }
      if (e.code === "KeyF") {
        g.openPanel(g.panel === "missions" ? null : "missions");
        e.preventDefault();
      }
      if (g.panel) return;
      const tool = fieldTools.find((t) => e.code === `Digit${t.key}`);
      if (tool) {
        g.equip(tool.id);
        e.preventDefault();
      }
      if (e.code === "KeyE") {
        g.useTool();
        e.preventDefault();
      }
      if (e.code === "KeyR") {
        g.advance();
        e.preventDefault();
      }
      if (
        (document.pointerLockElement === canvas ||
          document.activeElement === canvas) &&
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "ShiftLeft",
          "ShiftRight",
          "Space",
        ].includes(e.code)
      ) {
        keys.current.add(e.code);
        e.preventDefault();
        invalidate();
      }
    };
    const keyup = (e: KeyboardEvent) => keys.current.delete(e.code);
    const hidden = () => {
      if (document.hidden) clear();
      else invalidate();
    };
    const rejected = () =>
      useGame
        .getState()
        .notify(
          t(
            "Mouse tetap bebas. Seret layar untuk melihat; WASD tetap bisa digunakan.",
          ),
        );
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", clear);
    canvas.addEventListener("blur", clear);
    canvas.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("pointerlockchange", lockChanged);
    document.addEventListener("pointerlockerror", rejected);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      gameInput.wake = () => {};
      clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", clear);
      canvas.removeEventListener("blur", clear);
      canvas.removeEventListener("wheel", wheel);
      document.removeEventListener("pointerlockchange", lockChanged);
      document.removeEventListener("pointerlockerror", rejected);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [camera, gl, invalidate, yaw]);
  useFrame((_, delta) => {
    if (document.hidden) return;
    const dt = Math.min(delta, 0.05),
      g = useGame.getState(),
      reduced = useExperience.getState().reducedMotion;
    const front = g.panel
      ? 0
      : gameInput.forward +
        Number(keys.current.has("KeyW") || keys.current.has("ArrowUp")) -
        Number(keys.current.has("KeyS") || keys.current.has("ArrowDown"));
    const side = g.panel
      ? 0
      : gameInput.strafe +
        Number(keys.current.has("KeyD") || keys.current.has("ArrowRight")) -
        Number(keys.current.has("KeyA") || keys.current.has("ArrowLeft"));
    const amount = Math.max(1, Math.hypot(front, side)),
      speed =
        keys.current.has("ShiftLeft") || keys.current.has("ShiftRight")
          ? 5.8
          : 3.4;
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const targetX =
      ((direction.x * front - direction.z * side) * speed) / amount;
    const targetZ =
      ((direction.z * front + direction.x * side) * speed) / amount;
    velocity.current.x = T.MathUtils.damp(velocity.current.x, targetX, 12, dt);
    velocity.current.y = T.MathUtils.damp(velocity.current.y, targetZ, 12, dt);
    const [x, z] = moveInLab(
      camera.position.x,
      camera.position.z,
      velocity.current.x * dt,
      velocity.current.y * dt,
      obstacles,
    );
    const distance = Math.hypot(x - camera.position.x, z - camera.position.z);
    gameInput.walking = distance / Math.max(dt, 0.001);
    walkingPhase.current += distance * 7;
    if (
      !g.panel &&
      (keys.current.has("Space") || gameInput.jump) &&
      jump.current.height === 0
    ) {
      jump.current.speed = 4.6;
      gameInput.jump = false;
      keys.current.delete("Space");
    }
    if (jump.current.height > 0 || jump.current.speed > 0) {
      jump.current.speed -= 14 * dt;
      jump.current.height = Math.max(
        0,
        jump.current.height + jump.current.speed * dt,
      );
      if (jump.current.height === 0) jump.current.speed = 0;
    }
    camera.position.set(
      x,
      1.72 +
        jump.current.height +
        (!reduced && distance > 0.001
          ? Math.sin(walkingPhase.current) * 0.025
          : 0),
      z,
    );
    if (
      front ||
      side ||
      velocity.current.lengthSq() > 0.0001 ||
      jump.current.height > 0
    )
      invalidate();
    {
      camera.getWorldDirection(direction);
      ray.set(camera.position, direction);
      let aimed: StationId | null = null,
        best = 25,
        distanceToCenter = Infinity;
      for (const station of targets)
        if (ray.intersectBox(station.box, hit)) {
          const d = camera.position.distanceTo(hit);
          if (d < best) {
            aimed = station.id;
            best = d;
            distanceToCenter =
              Math.round(Math.hypot(x - station.x, z - station.z) * 2) / 2;
          }
        }
      if (g.aimed !== aimed || g.distance !== distanceToCenter)
        g.setAim(aimed, distanceToCenter);
    }
    gl.domElement.dataset.playerX = x.toFixed(2);
    gl.domElement.dataset.playerZ = z.toFixed(2);
  });
  return null;
}
