import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { stations } from "./content";
import { useWorld } from "./store";
import { Core, Flow, Ground, Sky } from "./Island";
import { CameraRig, Player, StationShell, player, walkTo } from "./Scene";
import { Hud } from "./Hud";
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

function useKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const s = useWorld.getState();
      if (key === "escape") {
        if (s.panel) s.setPanel(null);
        else if (s.focus) s.setFocus(null);
        return;
      }
      if (!s.started || s.panel) return;
      if (key === "e" && s.near && !s.focus) {
        s.goTo(s.near);
        return;
      }
      if (/^[1-8]$/.test(key)) {
        s.goTo(stations[Number(key) - 1].id);
        return;
      }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        // arrows scroll the page and move focus otherwise
        if (key.startsWith("arrow") && !(e.target instanceof HTMLButtonElement)) e.preventDefault();
        if (s.focus && !key.startsWith("arrow")) s.setFocus(null);
        player.keys.add(key);
      }
    };
    const up = (e: KeyboardEvent) => player.keys.delete(e.key.toLowerCase());
    const clear = () => player.keys.clear();
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", clear);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", clear);
    };
  }, []);
}

function NoWebGL() {
  return (
    <main className="w3-nogl">
      <h1>NeuroLab</h1>
      <p>Browser ini tidak bisa menampilkan dunia 3D (WebGL tidak tersedia). Materi yang sama tersedia dalam bentuk lain:</p>
      <p>
        <a href="?pick=1">Mode teks per level</a> · <a href="?lesson=0">Investigasi 14 pos</a>
      </p>
    </main>
  );
}

export default function World3D() {
  const webgl = useMemo(hasWebGL, []);
  useKeys();
  useEffect(() => {
    document.title = "NeuroLab · Masuk ke dalam model bahasa";
  }, []);
  if (!webgl) return <NoWebGL />;
  return (
    <div className="w3">
      <Canvas
        className="w3-canvas"
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 30, 58] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        aria-label="Dunia 3D NeuroLab"
      >
        <color attach="background" args={["#0d1f2a"]} />
        <fog attach="fog" args={["#10242f", 55, 160]} />
        <hemisphereLight args={["#bfe3ff", "#1b2a2f", 1.1]} />
        <directionalLight position={[25, 40, 15]} intensity={1.6} color="#fff1d9" />
        <ambientLight intensity={0.25} />
        <Suspense fallback={null}>
          <Sky />
          <Ground onWalk={walkTo} />
          <Core />
          <Flow />
          {stations.map((s, i) => (
            <StationShell key={s.id} index={i} />
          ))}
          <Player />
        </Suspense>
        <CameraRig />
      </Canvas>
      <Hud />
    </div>
  );
}
