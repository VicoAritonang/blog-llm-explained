// Browser checks for the 3D world (front door) on the built site (dist/).
// Plays every station through its keyboard-accessible controls, checks that
// each insight unlocks from the real model, and takes screenshots.
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
const external = process.env.NEUROLAB_BASE;
let server;
if (!external) {
  server = http.createServer(async (req, res) => {
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
  await new Promise((resolve) => server.listen(5194, "127.0.0.1", resolve));
}
const base = external || "http://127.0.0.1:5194";
const errors = [],
  outside = [];
const browser = await chromium.launch({
  channel: process.env.NEUROLAB_BROWSER_CHANNEL || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const shot = (page, name) => page.screenshot({ path: path.join(output, `world3d-${name}.png`) });
const watch = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(base) && !u.startsWith("data:") && !u.startsWith("blob:")) outside.push(u);
  });
};
const count = async (page) => Number(await page.locator(".w3-cards-btn b").innerText());
const panel = (page) => page.locator(".w3-panel");
const btn = (page, name, exact = false) => panel(page).getByRole("button", { name, exact });
async function enter(page, n, name) {
  await page.keyboard.press(String(n));
  await page.locator(".w3-panel h2", { hasText: name }).waitFor();
  const more = panel(page).locator("details");
  if (!(await more.evaluate((d) => d.open))) await more.locator("summary").click();
}
async function setRange(locator, value) {
  await locator.evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
async function expectDone(page, station, n) {
  await page.waitForFunction(
    ([s, want]) => {
      const raw = JSON.parse(localStorage.getItem("neurolab-dunia3d-v1") || "{}");
      return (raw.done || []).filter((k) => k.startsWith(s + ".")).length >= want;
    },
    [station, n],
    { timeout: 20000 },
  );
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.goto(`${base}/id/`);
  await page.waitForSelector(".w3-canvas canvas", { timeout: 60000 });
  await page.getByRole("heading", { name: "Masuk ke dalam sebuah model bahasa" }).waitFor();
  await page.waitForTimeout(1500);
  await shot(page, "intro");
  await page.getByRole("button", { name: "Mulai menjelajah" }).click();
  await page.waitForTimeout(1500);
  await shot(page, "walk");
  assert.equal(await count(page), 0);

  // 1 · Mesin Tanya: the real model answers, follows the note, generalises.
  await enter(page, 1, "Mesin Tanya");
  await btn(page, "Tanya", true).click();
  await expectDone(page, "tanya", 1);
  await panel(page).locator(".w3-chip").nth(2).click(); // warna -> hijau
  await btn(page, "Tanya", true).click();
  await expectDone(page, "tanya", 2);
  for (let i = 0; i < 3; i++) await panel(page).locator(".w3-chip").nth(1).click(); // tempat -> lemari
  await btn(page, "Tanya", true).click();
  await expectDone(page, "tanya", 3);
  await page.waitForTimeout(2600);
  await shot(page, "tanya");

  // 2 · Pemotong Token
  await enter(page, 2, "Pemotong Token");
  await btn(page, "Potong catatan").click();
  await expectDone(page, "token", 1);
  await btn(page, "Kamus Indonesia").click();
  await setRange(panel(page).locator('input[type="range"]'), 200);
  await expectDone(page, "token", 2);
  await btn(page, "Kamus Inggris").click();
  await expectDone(page, "token", 3);
  await page.waitForTimeout(800);
  await shot(page, "token");

  // 3 · Galaksi Makna
  await enter(page, 3, "Galaksi Makna");
  for (const w of ["·kunci", "·laci", "·biru"]) await btn(page, w, true).click();
  await expectDone(page, "makna", 3);
  await btn(page, "·kunci", true).click();
  await page.waitForTimeout(800);
  await shot(page, "makna");

  // 4 · Panggung Sorot: find the copying head, then unplug both layer-2 heads.
  await enter(page, 4, "Panggung Sorot");
  await btn(page, /Sorot dari/).click();
  await expectDone(page, "sorot", 1);
  for (const lamp of ["Lapisan 2 · A", "Lapisan 2 · B"]) await btn(page, lamp, true).click();
  await expectDone(page, "sorot", 2);
  await page.waitForTimeout(600);
  await shot(page, "sorot");
  await btn(page, "Cabut L2 · A").click();
  await btn(page, "Cabut L2 · B").click();
  await expectDone(page, "sorot", 3);

  // 5 · Arena Peluang
  await enter(page, 5, "Arena Peluang");
  for (let i = 0; i < 8; i++) {
    const done = await page.evaluate(() => (JSON.parse(localStorage.getItem("neurolab-dunia3d-v1")).done || []).includes("peluang.eos"));
    if (done) break;
    await btn(page, "Tulis 1 token").click();
    await page.waitForTimeout(2100);
  }
  await expectDone(page, "peluang", 2);
  await shot(page, "peluang");
  await setRange(panel(page).locator('input[type="range"]'), 5);
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() => (JSON.parse(localStorage.getItem("neurolab-dunia3d-v1")).done || []).includes("peluang.hot"));
    if (done) break;
    const write = panel(page).getByRole("button", { name: /Tulis 1 token|Ulang/ });
    await write.click();
    await page.waitForTimeout(2050);
  }
  await expectDone(page, "peluang", 3);

  // 6 · Bengkel Latihan
  await enter(page, 6, "Bengkel Latihan");
  await panel(page).getByRole("button", { name: "merah", exact: true }).click();
  for (let i = 0; i < 10; i++) await btn(page, "Latih 1 langkah").click();
  await expectDone(page, "latih", 1);
  await setRange(panel(page).locator('input[type="range"]'), 1);
  await btn(page, "Gulirkan bola").click();
  await expectDone(page, "latih", 2);
  await shot(page, "latih");
  await setRange(panel(page).locator('input[type="range"]'), 2.4);
  await btn(page, /Gulirkan bola|Berhenti/).click();
  await expectDone(page, "latih", 3);

  // 7 · Ruang Bukti
  await enter(page, 7, "Ruang Bukti");
  await btn(page, "Kaset: Tanpa lokasi").click();
  await expectDone(page, "bukti", 1);
  await page.waitForTimeout(900);
  await shot(page, "bukti-halusinasi");
  await btn(page, "Ambil dari arsip").click();
  await btn(page, "Kaset: Dua benda").click();
  await expectDone(page, "bukti", 3);

  // 8 · Menara Skala
  await enter(page, 8, "Menara Skala");
  await btn(page, "175B", true).click();
  await btn(page, "Cari model mini").click();
  await expectDone(page, "skala", 2);
  await page.waitForTimeout(2500);
  await shot(page, "skala");

  assert.equal(await count(page), 23, "all insights unlocked");
  await page.getByRole("dialog", { name: "Kartu temuan" }).waitFor({ timeout: 8000 });
  await shot(page, "finale");
  // progress survives a reload
  await page.reload();
  await page.waitForSelector(".w3-canvas canvas");
  assert.equal(await count(page), 23);

  // phone layout
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  watch(phone);
  await phone.goto(`${base}/id/`);
  await phone.getByRole("button", { name: "Mulai menjelajah" }).click();
  await phone.locator(".w3-route button").nth(3).click();
  await phone.locator(".w3-panel h2", { hasText: "Panggung Sorot" }).waitFor();
  await phone.waitForTimeout(2200);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, "no horizontal scroll on phone");
  await phone.screenshot({ path: path.join(output, "world3d-phone.png") });

  // storage blocked: the world still plays, progress lives in memory
  const blocked = await browser.newPage();
  watch(blocked);
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await blocked.goto(`${base}/id/`);
  await blocked.getByRole("button", { name: "Mulai menjelajah" }).click();
  await enter(blocked, 1, "Mesin Tanya");
  await btn(blocked, "Tanya", true).click();
  await blocked.waitForFunction(() => document.querySelector(".w3-cards-btn b")?.textContent === "1");

  // the earlier 2D map is still reachable
  const old = await browser.newPage();
  watch(old);
  await old.goto(`${base}/id/?mode=klasik`);
  await old.locator(".world").waitFor({ timeout: 30000 });

  assert.deepEqual(errors, [], "no page errors");
  assert.deepEqual(outside, [], "no external requests");
  console.log("world3d browser checks passed");
} finally {
  await browser.close();
  server?.close();
}
