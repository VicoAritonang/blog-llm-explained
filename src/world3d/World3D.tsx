import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { stationById, stations } from "./content";
import { useWorld } from "./store";
import { Atmosphere, Biomes, HORIZON, Ocean } from "./Terrain";
import { Beacon, CameraRig, Keepers, Player, StationShell, walkTo } from "./Scene";
import { Effects } from "./Effects";
import { Grass, ShaderClock } from "./shaders";
import { Companion } from "./Companion";
import { Blocks, Interact, IslandTracker, ScanBeam, SentenceWatcher, cycleToken } from "./Blocks";
import { FirstPerson, crosshairEvents } from "./FirstPerson";
import { Library } from "./Library";
import { askNara } from "./Hud";
import type { Tool } from "./store";
import { Hud } from "./Hud";
import { player } from "./player";
import { poses } from "./world";
import { view } from "./view";
import "./world3d.css";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
const MOVE = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"];
const TOOLS: Tool[] = ["tangan", "pemindai", "balok"];


function useKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const s = useWorld.getState();
      if (key === "escape") {
        if (s.reading) s.closeBook();
        else if (s.panel) s.setPanel(null);
        else if (s.dialog) s.talk(null);
        else if (s.focus) s.setFocus(null);
        return;
      }
      if (!s.started) return;
      if (s.dialog) return; // the dialog's own button takes Enter
      if (s.reading) {
        // reading: arrows turn pages, digits answer the question
        if (["arrowright", "d", "pagedown"].includes(key)) s.turnPage(1);
        else if (["arrowleft", "a", "pageup"].includes(key)) s.turnPage(-1);
        else if (/^[1-4]$/.test(key)) s.answer(Number(key) - 1);
        if (key.startsWith("arrow")) e.preventDefault();
        return;
      }
      if (key === "j") return s.setPanel(s.panel === "log" ? null : "log");
      if (key === "m") return s.setPanel(s.panel === "map" ? null : "map");
      if (key === "k") return s.setPanel(s.panel === "awards" ? null : "awards");
      if (s.panel) return;
      if (key === "v") return s.setView(s.view === "fp" ? "tp" : "fp");
      if (key === "h") return askNara();
      if (/^[1-3]$/.test(key)) return s.setTool(TOOLS[Number(key) - 1]);
      if (key === "r" && s.tool === "balok") return cycleToken(e.shiftKey ? -1 : 1);
      if (key === " " && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (player.y === 0) player.vy = 7.5;
        return;
      }
      if (key === "e" && (!s.focus || s.view === "fp")) {
        if (s.nearBook && !(s.near && s.view === "tp")) s.openBook(s.nearBook);
        else if (s.near && s.view === "tp") s.goTo(s.near);
        else if (s.nearKeeper) s.talk(s.nearKeeper);
        return;
      }
      if (MOVE.includes(key)) {
        // arrows scroll the page and move focus otherwise
        if (key.startsWith("arrow") && !(e.target instanceof HTMLButtonElement)) e.preventDefault();
        if (s.focus && s.view === "tp" && ["w", "a", "s", "d"].includes(key)) s.setFocus(null);
        player.keys.add(key);
      }
    };
    const up = (e: KeyboardEvent) => player.keys.delete(e.key.toLowerCase());
    const clear = () => player.keys.clear();
    // in first person the wheel switches tools, as in block games
    const wheel = (e: WheelEvent) => {
      const s = useWorld.getState();
      if (s.view !== "fp" || s.panel || !(e.target instanceof HTMLCanvasElement)) return;
      const i = TOOLS.indexOf(s.tool);
      s.setTool(TOOLS[(i + (e.deltaY > 0 ? 1 : -1) + TOOLS.length) % TOOLS.length]);
    };
    addEventListener("wheel", wheel, { passive: true });
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", clear);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", clear);
      removeEventListener("wheel", wheel);
    };
  }, []);
}

/** One light that follows whichever machine is open, so the light count never changes. */
function FocusLight() {
  const light = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    const l = light.current;
    if (!l) return;
    const focus = useWorld.getState().focus;
    if (focus) {
      const p = poses[focus];
      l.position.set(p.x + p.dir[0] * 5, 5.5, p.z + p.dir[1] * 5);
      l.color.set(stationById[focus].color);
    }
    l.intensity = THREE.MathUtils.damp(l.intensity, focus ? 40 : 0, 4, dt);
  });
  return <pointLight ref={light} distance={18} intensity={0} />;
}

/** Camera heading for the HUD compass. */
function ViewTracker() {
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    camera.getWorldDirection(dir);
    view.yaw = Math.atan2(dir.x, dir.z);
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__w3 = { cam: camera.position.toArray(), dir: dir.toArray(), player: player.pos.toArray() };
  });
  return null;
}

function NoWebGL() {
  return (
    <main className="w3-nogl">
      <h1>NeuroLab</h1>
      <p>
        Seluruh NeuroLab adalah dunia 3D, dan browser ini tidak bisa menampilkannya karena WebGL tidak tersedia. Coba aktifkan akselerasi grafis
        di pengaturan browser, atau buka dari browser lain seperti Chrome, Edge, Firefox, atau Safari versi terbaru.
      </p>
    </main>
  );
}

export default function World3D() {
  const webgl = useMemo(hasWebGL, []);
  const quality = useWorld((s) => s.quality);
  const high = quality === "tinggi";
  useKeys();
  useEffect(() => {
    document.title = "NeuroLab · Bangunkan GPT-3";
  }, []);
  if (!webgl) return <NoWebGL />;
  return (
    <div className="w3">
      <Canvas
        key={quality}
        className="w3-canvas"
        shadows={high ? "soft" : false}
        camera={{ fov: 50, near: 0.1, far: 3000, position: [0, 80, 150] }}
        dpr={high ? [1, 1.75] : [1, 1.25]}
        gl={{ antialias: !high, powerPreference: "high-performance" }}
        aria-label="Dunia 3D NeuroLab"
        events={crosshairEvents}
      >
        <fog attach="fog" args={[HORIZON, 110, 720]} />
        <Suspense fallback={null}>
          <Atmosphere shadows={high} />
          <Ocean />
          <ShaderClock />
          <Interact>
            <Biomes onWalk={walkTo} />
            {stations.map((s) => (
              <StationShell key={s.id} id={s.id} />
            ))}
            <Keepers />
            <Blocks />
            <Library />
            <Companion />
          </Interact>
          <Grass dense={high} />
          <Beacon />
          <ScanBeam />
          <Player />
          <FocusLight />
          <IslandTracker />
          <SentenceWatcher />
          <FirstPerson />
          {high && <Effects />}
        </Suspense>
        <ViewTracker />
        <CameraRig />
      </Canvas>
      <Hud />
    </div>
  );
}
