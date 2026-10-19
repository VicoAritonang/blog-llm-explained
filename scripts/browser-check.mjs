import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const root = path.resolve("dist"),
  output = path.resolve("test-results");
await fs.mkdir(output, { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (name === "/") name = "/index.html";
    const file = path.resolve(root, "." + name);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const body = await fs.readFile(file);
    res.setHeader(
      "Content-Type",
      mime[path.extname(file)] ?? "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(5187, "127.0.0.1", resolve));
let browser;
const errors = [],
  results = [];
const renderMetrics = [];
try {
  browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("http://127.0.0.1:5187/");
  await page.getByRole("heading", { name: /Satu token/ }).waitFor();
  assert.ok(
    !requests.some((x) => /(LabScene|three-core).*\.js/.test(x)),
    "3D chunk must be lazy",
  );
  await page.screenshot({
    path: path.join(output, "landing-desktop.png"),
    fullPage: true,
  });
  results.push("landing and lazy scene loading");
  await page
    .getByRole("button", { name: "Ikuti satu token", exact: true })
    .click();
  await page.locator("canvas").waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".world-label").length === 8,
  );
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(output, "lab-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.waitForTimeout(1700);
  renderMetrics.push({
    station: "overview",
    ...(await page.locator("canvas").evaluate((el) => ({
      drawCalls: +el.dataset.drawCalls,
      triangles: +el.dataset.triangles,
    }))),
  });
  const exportStyle = await page.addStyleTag({
    content:
      ".scene-region{height:520px!important;min-height:520px!important;flex:none!important}.scene-top-controls,.scene-caption,.world-label{visibility:hidden!important}",
  });
  await page.waitForTimeout(250);
  await page.locator("canvas").screenshot({
    path: path.join(output, "lab-overview-clean.jpg"),
    type: "jpeg",
    quality: 92,
  });
  if (process.env.NEUROLAB_EXPORT_OVERVIEW === "1")
    await fs.copyFile(
      path.join(output, "lab-overview-clean.jpg"),
      path.resolve("public/lab-overview.jpg"),
    );
  await exportStyle.evaluate((el) => el.remove());
  await page
    .getByRole("button", { name: "Fokus stasiun", exact: true })
    .click();
  results.push("WebGL scene and eight stations");
  for (const [i, title] of [
    "Tokenizer",
    "Embedding & posisi",
    "Query, Key, Value",
    "Causal attention",
    "Blok Transformer",
    "Token berikutnya",
    "Decode & KV cache",
    "Analogi vektor",
  ].entries()) {
    await page.locator(".station-map > button").nth(i).click();
    await page
      .getByRole("heading", { level: 1, name: title, exact: true })
      .waitFor();
    await page.waitForTimeout(1200);
    await page
      .locator(".lab-layout")
      .screenshot({ path: path.join(output, `station-${i + 1}.png`) });
    renderMetrics.push({
      station: title,
      ...(await page.locator("canvas").evaluate((el) => ({
        drawCalls: +el.dataset.drawCalls,
        triangles: +el.dataset.triangles,
      }))),
    });
  }
  assert.ok(
    renderMetrics.every((x) => x.drawCalls < 180 && x.triangles < 150000),
  );
  results.push("eight instrument renders and draw/triangle budgets");
  await page.getByRole("button", { name: "2D", exact: true }).click();
  for (const station of [
    "Tokenizer",
    "Embedding & posisi",
    "Query, Key, Value",
    "Causal attention",
    "Blok Transformer",
    "Token berikutnya",
    "Decode & KV cache",
    "Analogi vektor",
  ]) {
    await page
      .getByRole("navigation", { name: "Peta stasiun" })
      .getByRole("button", {
        name: new RegExp(station.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    await page
      .getByRole("heading", { level: 1, name: station, exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "Angka", exact: true }).click();
    assert.ok(await page.locator(".matrix-table").count());
    await page.getByRole("tab", { name: "Kode", exact: true }).click();
    assert.ok(await page.locator(".code-list .active").count());
    await page.getByRole("tab", { name: "Makna", exact: true }).click();
  }
  results.push("all stations; meaning, numbers, code");
  await page.locator(".toolbar-actions > select").selectOption("C");
  await page.getByRole("tab", { name: "Angka", exact: true }).click();
  assert.match(await page.locator(".row-sum").innerText(), /1\.000000/);
  await page.locator(".heatmap-grid button").nth(5).click();
  assert.match(await page.locator(".derivation").innerText(), /Masa depan/);
  results.push("causal masked cell derivation and row sum");
  await page.locator(".toolbar-actions > select").selectOption("D");
  const before = await page.locator(".attention-summary").innerText();
  await page.getByRole("button", { name: "wide", exact: true }).click();
  assert.equal(await page.locator(".attention-summary").innerText(), before);
  results.push("suffix invariant at it");
  await page.locator(".toolbar-actions > select").selectOption("F");
  await page
    .getByRole("button", { name: "Ambil satu sampel", exact: true })
    .click();
  const pick = await page.locator(".sample-result").innerText();
  await page
    .getByRole("button", { name: "Ambil satu sampel", exact: true })
    .click();
  assert.equal(await page.locator(".sample-result").innerText(), pick);
  const total = await page.locator(".probability-row b").allTextContents();
  assert.ok(
    Math.abs(total.reduce((a, p) => a + parseFloat(p), 0) - 100) < 0.05,
  );
  await page.locator(".sampler-controls select").first().selectOption("greedy");
  await page.getByRole("button", { name: "Pilih argmax", exact: true }).click();
  assert.match(
    await page.locator(".probability-row").first().innerText(),
    /100.00%/,
  );
  await page.getByRole("tab", { name: "Angka", exact: true }).click();
  assert.match(
    await page.locator(".derivation").innerText(),
    /bukan softmax pada T positif/,
  );
  await page.locator(".sampler-controls select").first().selectOption("sample");
  await page
    .getByRole("button", { name: "Ambil satu sampel", exact: true })
    .click();
  await page.getByRole("button", { name: "Masukkan ke urutan" }).click();
  assert.match(await page.locator(".scene-data").innerText(), /6 TOKEN/);
  results.push("seeded sampling, probability mass and append");
  await page.locator(".toolbar-actions > select").selectOption("G");
  await page.getByRole("button", { name: "Decode satu token" }).click();
  assert.match(
    await page.locator(".cache-proof").innerText(),
    /Selisih logit maksimum: 0\.000e\+0/,
  );
  await page.getByRole("button", { name: "Salin tautan langkah ini" }).click();
  const url = page.url();
  assert.ok(url.length < 650);
  assert.ok(!url.includes("function"));
  const tensorBefore = await page.locator(".tensor-meta").innerText();
  await page.reload();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  assert.equal(await page.locator(".tensor-meta").innerText(), tensorBefore);
  assert.match(await page.locator(".scene-data").innerText(), /6 TOKEN/);
  results.push("cache numerical parity and shared state restoration");
  await page.getByRole("button", { name: "Decode satu token" }).click();
  await page.getByRole("button", { name: "Operasi sebelumnya" }).click();
  assert.match(await page.locator(".scene-data").innerText(), /6 TOKEN/);
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  assert.match(await page.locator(".scene-data").innerText(), /7 TOKEN/);
  await page.getByRole("button", { name: "Ulangi stasiun" }).click();
  assert.match(await page.locator(".scene-data").innerText(), /6 TOKEN/);
  results.push("decode rewind and replay restore previous prefix");
  await page.getByRole("button", { name: "Checkpoint belajar" }).click();
  await page.getByRole("radio").nth(1).check();
  await page.getByRole("radio").nth(3).check();
  await page.getByRole("radio").nth(8).check();
  assert.match(await page.locator(".quiz-result").innerText(), /3 dari 3/);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  results.push("quiz and dialog keyboard escape");
  await page.locator(".toolbar-actions > select").selectOption("A");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("slider", { name: "Seek operasi stasiun" }).fill("2");
  assert.match(
    await page.locator(".timeline-current").innerText(),
    /Lookup ID/,
  );
  await page.getByRole("button", { name: "Operasi sebelumnya" }).click();
  assert.match(
    await page.locator(".timeline-current").innerText(),
    /Pisahkan token/,
  );
  results.push("play/pause, seek and previous");
  await page.locator(".toolbar-actions > select").selectOption("A");
  for (let operation = 0; operation < 38; operation++) {
    const done = await page
      .getByRole("button", { name: "Checkpoint", exact: true })
      .count();
    if (done) break;
    await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  }
  assert.equal(
    await page
      .getByRole("heading", { name: "Decode & KV cache", exact: true })
      .count(),
    1,
  );
  assert.match(await page.locator(".scene-data").innerText(), /6 TOKEN/);
  await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await page.keyboard.press("Escape");
  results.push(
    "complete guided journey: both blocks, sampled token and autoregressive loop",
  );
  await page.locator(".toolbar-actions > select").selectOption("A");
  // Axe checks semantic structure and contrast in the HTML experience.
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const axe = await page.evaluate(async () => window.axe.run(document));
  await fs.writeFile(
    path.join(output, "accessibility.json"),
    JSON.stringify(axe.violations, null, 2),
  );
  assert.equal(
    axe.violations.filter(
      (x) => x.impact === "critical" || x.impact === "serious",
    ).length,
    0,
    JSON.stringify(
      axe.violations.map((x) => ({
        id: x.id,
        nodes: x.nodes.map((n) => n.target),
      })),
    ),
  );
  results.push("axe critical/serious checks including contrast");
  await context.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(e.message));
  await mp.goto("http://127.0.0.1:5187/");
  await mp.screenshot({
    path: path.join(output, "landing-mobile.png"),
    fullPage: true,
  });
  assert.ok(
    await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "mobile horizontal overflow",
  );
  await mp.getByRole("button", { name: "Baca tanpa 3D" }).click();
  await mp.locator(".toolbar-actions > select").selectOption("C");
  await mp.getByRole("button", { name: /^Catatan lab/ }).click();
  await mp.getByRole("tab", { name: "Angka" }).click();
  await mp.screenshot({
    path: path.join(output, "attention-mobile.png"),
    fullPage: true,
  });
  assert.ok(
    await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "mobile lab horizontal overflow",
  );
  results.push("mobile, reduced motion, 2D and no overflow");
  const noGL = await browser.newContext();
  await noGL.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  const np = await noGL.newPage();
  await np.goto("http://127.0.0.1:5187/");
  await np
    .getByRole("button", { name: "Ikuti satu token", exact: true })
    .click();
  await np.locator(".station-view").waitFor();
  assert.ok(await np.locator(".station-view").isVisible());
  results.push("WebGL failure fallback");
  const assetFailure = await browser.newContext();
  await assetFailure.route("**/tokenizer-bench.glb", (route) => route.abort());
  const ap = await assetFailure.newPage();
  await ap.goto("http://127.0.0.1:5187/");
  await ap
    .getByRole("button", { name: "Ikuti satu token", exact: true })
    .click();
  await ap.locator(".asset-error").waitFor();
  assert.ok(await ap.locator(".inspector").isVisible());
  await assetFailure.unroute("**/tokenizer-bench.glb");
  await ap.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await ap.locator(".asset-error").waitFor({ state: "detached" });
  results.push("asset failure preserves lesson and retry recovers instrument");
  assert.ok(
    requests.every(
      (url) =>
        url.startsWith("http://127.0.0.1:5187/") || url.startsWith("data:"),
    ),
    "No CDN requests",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Browser checks passed:", results.join("; "));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await fs.writeFile(
    path.join(output, "browser-report.json"),
    JSON.stringify({ results, errors }, null, 2),
  );
  await fs.writeFile(
    path.join(output, "render-metrics.json"),
    JSON.stringify(renderMetrics, null, 2),
  );
}
