import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./app/styles.css";
import "./app/theme.css";
import { locale } from "./i18n/core.mjs";
document.documentElement.lang = locale;
const render = () =>
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
// Canvas signs are drawn once, after the bundled UI font is available.
document.fonts.load('600 16px "Source Sans 3 Variable"').then(render, render);
