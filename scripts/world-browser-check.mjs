// Browser checks for the game world on the built site (dist/).
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = path.resolve("dist"),
  output = path.resolve("test-results");
await fs.mkdir(output, { recursive: true });
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    res.end(await fs.readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(5193, "127.0.0.1", resolve));
const base = "http://127.0.0.1:5193",
  errors = [],
  external = [],
  checks = [];
let browser;
const watch = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (!r.url().startsWith(base) && !r.url().startsWith("data:") && !r.url().startsWith("blob:"))
      external.push(r.url());
  });
};
const shot = (page, name) =>
  page.screenshot({ path: path.join(output, `world-${name}.png`) });
const axe = async (page, name) => {
  // Measure contrast after entrance animations settle.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
  );
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const violations = await page.evaluate(
    async () => (await window.axe.run(document.querySelector(".world"))).violations,
  );
  await fs.writeFile(path.join(output, `world-axe-${name}.json`), JSON.stringify(violations, null, 2));
  assert.deepEqual(
    violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    [],
    `accessibility: ${name}`,
  );
};
const button = (page, name) => page.getByRole("button", { name });
const xp = async (page) => Number(await page.locator(".hud-xp b").innerText());
const openFromMap = async (page, label) => {
  await page.keyboard.press("m");
  await button(page, `Buka ${label}`).click();
};

try {
  browser = await chromium.launch({
    channel: process.env.NEUROLAB_BROWSER_CHANNEL || undefined,
    headless: true,
  });
  const fresh = async (options) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
    const page = await context.newPage();
    watch(page);
    return page;
  };

  // First visit: title screen, then Nara walks the player to the first quest.
  const page = await fresh();
  await page.goto(`${base}/id/?mode=klasik`);
  await page.locator(".intro h2").waitFor();
  assert.equal(await page.locator("canvas.world-canvas").count(), 1);
  await shot(page, "intro");
  await axe(page, "intro");
  await button(page, /Mulai petualangan/).click();
  await page.locator(".nara-dialog").waitFor();
  await button(page, /Antar aku/).click();
  await page.locator(".hud-prompt", { hasText: "Program biasa vs LLM" }).waitFor({ timeout: 15000 });
  await shot(page, "world");
  checks.push("first visit shows the title screen; Nara guides the player to quest 1");

  // A quest wraps the real lab; tasks tick from actions and pay XP.
  await page.locator(".hud-prompt").click();
  await page.locator(".quest-window h2", { hasText: "Adu dua mesin" }).waitFor();
  await axe(page, "quest");
  await button(page, "Jalankan kedua mesin").click();
  await page.locator(".quest-objectives li.done").first().waitFor();
  await shot(page, "quest");
  await page.keyboard.press("Escape");
  await page.locator(".quest-window").waitFor({ state: "detached" });
  assert.equal(await xp(page), 25);
  assert.match(await page.locator(".hud-bar").innerText(), /0\/7 quest/);
  checks.push("quest window runs the real lab; one task pays 25 XP");

  // The skip exam: a wrong answer fails, a clean run opens the gate and levels up.
  await openFromMap(page, "Ujian lompat ke Level 2");
  await button(page, /Mulai ujian/).click();
  await page.locator(".quiz-options button").nth(0).click();
  await page.locator(".exam-body .btn-gold").click();
  await page.locator(".exam-result.fail").waitFor();
  await button(page, /Ulangi ujian/).click();
  for (const answer of [1, 1, 1, 1]) {
    await page.locator(".quiz-options button").nth(answer).click();
    await page.locator(".exam-body .btn-gold").click();
  }
  await page.locator(".exam-result.pass").waitFor();
  await button(page, /Kembali ke dunia/).click();
  await page.locator(".levelup").waitFor();
  await shot(page, "levelup");
  await button(page, /Menuju gerbang/).click();
  assert.match(await page.locator(".hud-player").innerText(), /Teknisi Mesin/);
  assert.equal(await xp(page), 25 + 60);
  checks.push("skip exam: a mistake fails, all correct opens gate 1 and shows the level-up");

  // A book pays on its last page and its quiz pays once.
  await openFromMap(page, "Ukuran Itu Relatif");
  await page.locator(".book h2").waitFor();
  await button(page, /Berikutnya/).click();
  await button(page, /Kuis/).click();
  await page.locator(".quiz-options button").nth(2).click();
  await page.locator(".quiz-why.right").waitFor();
  await shot(page, "book");
  await button(page, /Selesai membaca/).click();
  assert.equal(await xp(page), 85 + 20 + 15);
  checks.push("books pay on the last page; the quiz pays a bonus");

  // A Menengah quest opens the 3D investigation post and returns to the world.
  await openFromMap(page, "Tokenizer");
  await page.locator(".quest-window").waitFor();
  await page.locator(".quest-posts button").first().click();
  await page.locator(".story-route-guided").waitFor({ timeout: 20000 });
  assert.match(page.url(), /from=world/);
  await button(page, "Kembali ke dunia game").click();
  await page.locator("canvas.world-canvas").waitFor();
  assert.ok(!/lesson=/.test(page.url()));
  assert.match(await page.locator(".hud-player").innerText(), /Teknisi Mesin/);
  checks.push("posts open the guided investigation and come back to the world with progress kept");

  // Panels.
  await page.keyboard.press("j");
  await page.locator(".journal-zone").first().waitFor();
  await axe(page, "journal");
  await page.keyboard.press("Escape");
  await page.keyboard.press("m");
  await page.locator(".minimap").waitFor();
  await axe(page, "map");
  await shot(page, "map");
  await page.keyboard.press("Escape");
  checks.push("journal and map are keyboard reachable and pass axe");

  // Phone, touch, reduced motion: nothing overflows and tapping works.
  const phone = await fresh({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await phone.goto(`${base}/id/?mode=klasik`);
  await button(phone, /Mulai petualangan/).tap();
  await button(phone, /Antar aku/).tap();
  await phone.locator(".hud-prompt", { hasText: "Program biasa" }).waitFor({ timeout: 15000 });
  await phone.locator(".hud-prompt").tap();
  await phone.locator(".quest-window").waitFor();
  const fits = await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  assert.ok(fits, "world overflows on a phone");
  await shot(phone, "phone-quest");
  checks.push("390px touch viewport with reduced motion: tap to walk, tap to open, no overflow");

  // Storage blocked: the world still plays.
  const blocked = await fresh();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await blocked.goto(`${base}/id/?mode=klasik`);
  await button(blocked, /Mulai petualangan/).click();
  await blocked.locator(".nara-dialog").waitFor();
  checks.push("blocked storage still starts the game");

  assert.deepEqual(errors, [], "runtime errors");
  assert.deepEqual(external, [], "everything stays client-side");
  await fs.writeFile(
    path.join(output, "world-browser-report.json"),
    JSON.stringify({ checks, errors, external }, null, 2),
  );
  console.log(checks.join("\n"));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
