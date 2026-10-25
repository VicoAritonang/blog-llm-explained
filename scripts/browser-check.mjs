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
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (name === "/") name = "/index.html";
    let file = path.resolve(root, "." + name);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await fs.stat(file)).isDirectory())
      file = path.join(file, "index.html");
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
  results = [],
  renderMetrics = [],
  requests = [];
const url = "http://127.0.0.1:5187/";
const names = [
  "Tokenizer",
  "Embedding & posisi",
  "Query, Key, Value",
  "Causal attention",
  "Blok Transformer",
  "Token berikutnya",
  "Decode & KV cache",
  "Analogi vektor",
];
try {
  browser = await chromium.launch({
    channel: process.env.NEUROLAB_BROWSER_CHANNEL || undefined,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  const ready = async (p) =>
    p.waitForFunction(() => document.querySelector("canvas")?.dataset.playerX);
  const shot = async (p, name) =>
    p.screenshot({ path: path.join(output, name + ".png") });
  const position = async (p) =>
    p
      .locator("canvas")
      .evaluate((el) => [+el.dataset.playerX, +el.dataset.playerZ]);
  const travel = async (name) => {
    await page.getByRole("button", { name: "Peta", exact: true }).click();
    await page
      .getByRole("button", { name: `Pergi ke ${name}`, exact: true })
      .click();
    await page.waitForFunction(
      (name) => document.querySelector(".target-card b")?.textContent === name,
      name,
    );
    await page.waitForTimeout(200);
  };
  const axe = async (p, name) => {
    await p.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const violations = await p.evaluate(
      async () => (await window.axe.run(document)).violations,
    );
    await fs.writeFile(
      path.join(output, `accessibility-${name}.json`),
      JSON.stringify(violations, null, 2),
    );
    assert.deepEqual(
      violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      [],
      `accessibility: ${name}`,
    );
  };
  await page.goto(url);
  await ready(page);
  assert.equal(await page.locator(".tool-hotbar button").count(), 5);
  assert.equal(await page.locator(".field-guide").count(), 1);
  await shot(page, "game-desktop");
  await axe(page, "world");
  await page.keyboard.press("h");
  assert.equal(await page.locator(".field-guide").count(), 0);
  await page.keyboard.press("h");
  assert.equal(await page.locator(".field-guide").count(), 1);
  await page.getByRole("button", { name: "Tutup hint" }).click();
  results.push("direct first-person world and contextual Hint toggle");
  await page.keyboard.press("e");
  await page.getByRole("dialog", { name: "Catatan lapangan" }).waitFor();
  await axe(page, "journal");
  await page.getByRole("tab", { name: "Angka", exact: true }).click();
  await page.locator(".matrix-table").waitFor();
  await page.getByRole("tab", { name: "Kode", exact: true }).click();
  await shot(page, "game-journal");
  await page.keyboard.press("Escape");
  assert.ok(
    (await page.locator(".exploration-progress").innerText()).includes("01"),
  );
  await page.keyboard.press("2");
  const token = await page.locator(".equipped-info small").innerText();
  await page.keyboard.press("e");
  assert.notEqual(
    await page.locator(".equipped-info small").innerText(),
    token,
  );
  results.push(
    "scanner opens numerical journal; token tracker changes selection",
  );
  for (const name of names) {
    await travel(name);
    renderMetrics.push({
      station: name,
      ...(await page.locator("canvas").evaluate((el) => ({
        drawCalls: +el.dataset.drawCalls,
        triangles: +el.dataset.triangles,
      }))),
    });
  }
  assert.ok(
    renderMetrics.every((m) => m.drawCalls < 400 && m.triangles < 250000),
  );
  await page.keyboard.press("j");
  await page.getByRole("button", { name: "Eksperimen", exact: true }).click();
  for (const [id, target] of [
    ["capitals", "Paris"],
    ["verbs", "swimming"],
    ["workplaces", "guru"],
  ]) {
    await page.getByLabel("Pilih contoh analogi").selectOption(id);
    assert.ok(
      (await page.locator(".cosine-rank > div").first().innerText()).includes(
        target,
      ),
    );
    assert.ok(
      (await page.locator(".analogy-plot").getAttribute("aria-label")).includes(
        target,
      ),
    );
  }
  await shot(page, "analogy-dark");
  await page
    .getByRole("button", { name: "Catatan & angka", exact: true })
    .click();
  await page.getByRole("tab", { name: "Makna", exact: true }).click();
  assert.ok(
    (await page.locator(".inspector .formula").innerText()).includes("guru"),
  );
  assert.ok(
    await page.evaluate(() =>
      document.fonts.check('600 16px "Source Sans 3 Variable"'),
    ),
  );
  assert.equal(
    await page
      .locator(".field-journal")
      .evaluate((el) => getComputedStyle(el).colorScheme),
    "dark",
  );
  assert.ok(!(await page.locator("body").innerText()).includes("\u2014"));
  await axe(page, "dark-analogy");
  await page.keyboard.press("Escape");
  results.push(
    "self-hosted typography, dark journal, three synchronized analogy presets, no em dash",
  );
  await travel("Causal attention");
  await page.keyboard.press("3");
  const head = await page.locator(".equipped-info small").innerText();
  await page.keyboard.press("e");
  assert.notEqual(await page.locator(".equipped-info small").innerText(), head);
  await page.waitForTimeout(1000);
  await shot(page, "game-attention");
  await page.keyboard.press("1");
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "Eksperimen", exact: true }).click();
  for (const id of ["B", "C", "D", "E", "F", "G", "A"]) {
    await page.getByLabel("Pilih eksperimen").selectOption(id);
    await page.locator(".station-view").waitFor();
  }
  await page.keyboard.press("Escape");
  results.push(
    "all eight stations, two head selections, seven interactive experiments",
  );
  await travel("Tokenizer");
  if (
    await page
      .getByRole("button", { name: "Jalankan sinyal", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Jalankan sinyal", exact: true })
      .click();
  await page.keyboard.press("4");
  await page.keyboard.press("e");
  await page
    .getByRole("button", { name: "Jalankan sinyal", exact: true })
    .waitFor();
  await page.waitForTimeout(1800);
  // Let tool recoil and newly mounted tensor transitions settle, including on
  // software WebGL. A paused signal must then remain pixel-identical.
  let still = await page.locator("canvas").screenshot(),
    settled = false;
  for (let attempt = 0; attempt < 16; attempt++) {
    await page.waitForTimeout(300);
    const current = await page.locator("canvas").screenshot();
    if (still.equals(current)) {
      settled = true;
      break;
    }
    still = current;
  }
  assert.ok(
    settled,
    "paused transitions finish within the bounded settling window",
  );
  await page.waitForTimeout(350);
  assert.ok(
    still.equals(await page.locator("canvas").screenshot()),
    "paused world settles to identical pixels",
  );
  const op = await page.locator(".signal-controls span").innerText();
  await page.keyboard.press("r");
  assert.notEqual(await page.locator(".signal-controls span").innerText(), op);
  await page.keyboard.press("e");
  await page.waitForTimeout(400);
  const moving = await page.locator("canvas").screenshot();
  await page.waitForTimeout(250);
  assert.ok(
    !moving.equals(await page.locator("canvas").screenshot()),
    "live signals animate",
  );
  await page.keyboard.press("e");
  results.push(
    "time tool pauses/resumes actual animation, R advances operation",
  );
  await page.locator("canvas").focus();
  const before = await position(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(1600);
  await page.keyboard.up("w");
  await page.waitForTimeout(300);
  const after = await position(page);
  assert.ok(
    Math.hypot(after[0] - before[0], after[1] - before[1]) > 1,
    "WASD works while signal paused",
  );
  assert.ok(
    Math.hypot(after[0] + 12, after[1] + 5) >= 2.64,
    "cannot walk into instrument",
  );
  await page.keyboard.down("w");
  await page.waitForTimeout(900);
  await page.keyboard.up("w");
  const blocked = await position(page);
  assert.ok(Math.hypot(blocked[0] + 12, blocked[1] + 5) >= 2.64);
  await travel("Tokenizer");
  await page.getByRole("button", { name: /Klik untuk menjelajah/ }).click();
  await page.waitForTimeout(200);
  const locked = await page.evaluate(() => !!document.pointerLockElement);
  if (locked) {
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.exitPointerLock());
  }
  // Drag fallback remains available without pointer lock.
  await page.mouse.move(700, 380);
  await page.mouse.down();
  await page.mouse.move(1050, 380, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  assert.notEqual(
    await page.evaluate(
      () => document.querySelector(".target-card b")?.textContent,
    ),
    "Tokenizer",
  );
  await page.mouse.wheel(0, 100);
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.tool === "tuner",
  );
  results.push(
    `movement, plinth collisions, mouse look, scroll selection; pointer lock ${locked ? "available" : "fallback"}`,
  );
  await page.keyboard.press("f");
  await page.getByRole("dialog", { name: "Misi eksperimen" }).waitFor();
  await page
    .getByRole("button", { name: /Tutup kebocoran masa depan/ })
    .click();
  await page.getByRole("button", { name: "Jalankan uji", exact: true }).click();
  assert.ok(
    (await page.locator(".trial-result").innerText()).includes(
      "Pilih prediksi",
    ),
  );
  await page
    .getByLabel("Dua posisi masa depan mendapat bobot nol", { exact: true })
    .check();
  await page.getByRole("button", { name: "Jalankan uji", exact: true }).click();
  assert.equal(await page.locator(".trial-result.passed").count(), 0);
  await page.getByRole("button", { name: "Lihat model 3D" }).click();
  await page.waitForTimeout(1500);
  const openGate = await page.locator("canvas").screenshot();
  await page.keyboard.press("e");
  await page.waitForTimeout(1500);
  assert.ok(
    !openGate.equals(await page.locator("canvas").screenshot()),
    "calibrator changes the visible exhibit",
  );
  await shot(page, "sandbox-causal");
  await page.keyboard.press("f");
  assert.ok(
    await page.getByLabel("Mask terpasang", { exact: true }).isChecked(),
  );
  await page.getByRole("button", { name: "Jalankan uji", exact: true }).click();
  assert.equal(await page.locator(".trial-result.passed").count(), 1);
  await axe(page, "missions");
  const trials = [
    [
      "Bukan satu kata, satu token",
      "Pisah subword",
      "Teks tetap sama, jumlah token berubah",
    ],
    [
      "Urutan yang hilang",
      "Posisi aktif",
      "Vektor posisi ditambahkan ke embedding",
    ],
    [
      "Jembatan residual",
      "Jalur tersambung",
      "Input ditambahkan ke hasil sublayer",
    ],
    [
      "Lebih beragam, bukan lebih benar",
      "Hangat · 1.8",
      "Distribusi lebih rata, kebenaran tidak dijamin",
    ],
    [
      "Simpan pekerjaan prefix",
      "Cache aktif",
      "K/V lama dipakai ulang; Query baru tetap dihitung",
    ],
  ];
  for (const [name, configuration, prediction] of trials) {
    await page
      .locator(".mission-picker")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    await page.getByLabel(configuration, { exact: true }).check();
    await page.getByLabel(prediction, { exact: true }).check();
    await page
      .getByRole("button", { name: "Jalankan uji", exact: true })
      .click();
    assert.equal(await page.locator(".trial-result.passed").count(), 1, name);
    await page.getByRole("button", { name: "Lihat model 3D" }).click();
    await page.waitForTimeout(700);
    await shot(page, `sandbox-${trials.findIndex((t) => t[0] === name)}`);
    await page.keyboard.press("f");
  }
  await page.getByRole("button", { name: "Jalankan uji", exact: true }).click();
  assert.equal(
    await page.locator(".discovery-meter b").innerText(),
    "6 / 6 penemuan",
  );
  await shot(page, "missions-complete");
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "Misi", exact: true }).click();
  assert.equal(
    await page.locator(".discovery-meter b").innerText(),
    "6 / 6 penemuan",
  );
  results.push(
    "six missions: physical calibration, prediction validation, 3D exhibits, no duplicate awards, persistent badges",
  );
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(url);
  await ready(mobile);
  await shot(mobile, "game-mobile-hint");
  await mobile.getByRole("button", { name: "Tutup hint" }).click();
  await mobile.waitForTimeout(500);
  const reduced = await mobile.locator("canvas").screenshot();
  await mobile.waitForTimeout(250);
  assert.ok(
    reduced.equals(await mobile.locator("canvas").screenshot()),
    "reduced motion is static",
  );
  const mb = await position(mobile),
    box = await mobile.locator(".touch-movement").boundingBox();
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 44, y: box.y + 17 }],
  });
  await mobile.waitForTimeout(700);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const ma = await position(mobile);
  assert.ok(
    Math.hypot(ma[0] - mb[0], ma[1] - mb[1]) > 0.4,
    "touch joystick wakes paused render loop",
  );
  await mobile.getByRole("button", { name: "Gunakan", exact: true }).tap();
  await mobile.getByRole("dialog").waitFor();
  await mobile.getByRole("button", { name: "Tutup panel" }).tap();
  await shot(mobile, "game-mobile");
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await axe(mobile, "mobile");
  await mobile.setViewportSize({ width: 320, height: 740 });
  assert.ok(
    await mobile
      .locator(".game-topbar nav")
      .evaluate((el) => el.getBoundingClientRect().right <= innerWidth),
    "all toolbar actions fit a narrow phone",
  );
  await mobile.getByRole("button", { name: "Misi", exact: true }).tap();
  await mobile
    .locator(".mission-picker")
    .getByRole("button", { name: /Lebih beragam/ })
    .tap();
  await mobile.getByLabel("Hangat · 1.8", { exact: true }).check();
  await mobile
    .getByLabel("Distribusi lebih rata, kebenaran tidak dijamin", {
      exact: true,
    })
    .check();
  await mobile.getByRole("button", { name: "Jalankan uji", exact: true }).tap();
  await mobile.locator(".trial-result.passed").waitFor();
  await shot(mobile, "missions-phone-result");
  assert.ok(
    await mobile.getByRole("button", { name: "Tutup panel" }).isVisible(),
  );
  await axe(mobile, "missions-phone");
  results.push(
    "mobile WebGL, touch joystick/tool, reduced motion, no overflow",
  );
  const noGL = await browser.newContext();
  await noGL.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).startsWith("webgl")
        ? null
        : orig.call(this, type, ...args);
    };
  });
  const fallback = await noGL.newPage();
  await fallback.goto(url);
  await fallback.locator(".accessible-world .station-view").waitFor();
  assert.equal(await fallback.locator(".diagram-stations button").count(), 8);
  await fallback
    .getByRole("button", { name: "Causal attention", exact: true })
    .click();
  assert.equal(
    await fallback.locator(".accessible-world h2").innerText(),
    "Causal attention",
  );
  await fallback.getByRole("button", { name: "Misi", exact: true }).click();
  await fallback
    .locator(".mission-picker")
    .getByRole("button", { name: /Tutup kebocoran/ })
    .click();
  await fallback.getByLabel("Mask terpasang", { exact: true }).check();
  await fallback
    .getByLabel("Dua posisi masa depan mendapat bobot nol", { exact: true })
    .check();
  await fallback
    .getByRole("button", { name: "Jalankan uji", exact: true })
    .click();
  assert.equal(await fallback.locator(".trial-result.passed").count(), 1);
  await fallback
    .getByRole("button", { name: "Kembali ke diagram", exact: true })
    .click();
  await fallback.locator(".accessible-world .station-view").waitFor();
  results.push("no WebGL: accessible 2D instruments remain usable");
  const english = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  english.on("pageerror", (e) => errors.push(e.message));
  await english.goto(url + "en/");
  await ready(english);
  assert.equal(await english.locator("html").getAttribute("lang"), "en");
  await english.getByRole("button", { name: "Map", exact: true }).click();
  await english
    .getByRole("button", { name: "Travel to Vector analogies", exact: true })
    .click();
  await english.waitForFunction(
    () =>
      document.querySelector(".target-card b")?.textContent ===
      "Vector analogies",
  );
  await english.keyboard.press("e");
  await english.getByRole("dialog", { name: "Field journal" }).waitFor();
  await english
    .getByRole("button", { name: "Experiments", exact: true })
    .click();
  await english.getByLabel("Choose analogy example").selectOption("verbs");
  assert.ok(
    (await english.locator(".cosine-rank").innerText()).includes("swimming"),
  );
  await english.getByLabel("Choose experiment").selectOption("G");
  assert.ok(
    (await english.locator(".station-view").innerText()).includes("With cache"),
  );
  await english.keyboard.press("Escape");
  await english.keyboard.press("f");
  await english
    .locator(".mission-picker")
    .getByRole("button", { name: /Block future leakage/ })
    .click();
  await english.getByLabel("Mask applied", { exact: true }).check();
  await english
    .getByLabel("Two future positions receive zero weight", { exact: true })
    .check();
  await english.getByRole("button", { name: "Run test", exact: true }).click();
  await english.getByText("Discovery verified!", { exact: true }).waitFor();
  await axe(english, "english-missions");
  await shot(english, "english-lab-mission");
  await english.keyboard.press("Escape");
  await english
    .getByRole("button", { name: "World settings", exact: true })
    .click();
  await english.getByRole("button", { name: /Learning guide/ }).click();
  await english
    .getByRole("heading", {
      name: "Learn LLMs interactively, from tokens to generated text",
      exact: true,
    })
    .waitFor();
  await english.waitForFunction(() => scrollY >= innerHeight * 0.8);
  await shot(english, "english-learning-guide");
  const readable = await browser.newContext({ javaScriptEnabled: false });
  const reader = await readable.newPage();
  for (const [route, heading] of [
    ["id/", "Belajar LLM secara interaktif, dari token hingga jawaban"],
    ["en/", "Learn LLMs interactively, from tokens to generated text"],
  ]) {
    await reader.goto(url + route);
    await reader.getByRole("heading", { name: heading, exact: true }).waitFor();
  }
  await reader.goto(url + "en/learn/causal-attention/");
  await reader
    .getByRole("heading", {
      name: "Causal Attention and Masking in Transformers",
      exact: true,
    })
    .waitFor();
  assert.equal(await reader.locator("canvas").count(), 0);
  results.push(
    "English lab, translated tools/missions, readable guide, and both languages without JavaScript",
  );
  assert.ok(
    requests.every((r) => r.startsWith(url) || r.startsWith("data:")),
    "no external services or CDN",
  );
  assert.deepEqual(errors, []);
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
