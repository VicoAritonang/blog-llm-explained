import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./assets/fonts.css";
import "./world3d/base.css";

// The whole site is the 3D world: every lesson is something to walk to, touch or read there.
const World3D = lazy(() => import("./world3d/World3D"));

const render = () =>
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Suspense fallback={<p className="w3-loading">Menyiapkan kepulauan NeuroLab…</p>}>
        <World3D />
      </Suspense>
    </React.StrictMode>,
  );
// Canvas labels are drawn once, after the bundled UI font is available.
document.fonts.load('600 16px "Source Sans 3 Variable"').then(render, render);
