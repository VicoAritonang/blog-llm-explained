// Browser checks for the 3D archipelago (front door) on the built site (dist/).
// Plays every mission through its keyboard-accessible controls, checks that
// each insight unlocks from the real model, that bridges stay locked until a
// chapter is done, and that the GPT-3 blueprint only accepts the right order.
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
const KEY = "neurolab-dunia3d-v2";
const errors = [],
  outside = [],
  checks = [];
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
const count = async (page) => Number(await page.locator(".w3-gold b").first().innerText());
const panel = (page) => page.locator(".w3-panel");
const btn = (page, name, exact = false) => panel(page).getByRole("button", { name, exact });
const doneList = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").done || [], KEY);
async function begin(page) {
  await page.getByRole("button", { name: "Mulai petualangan" }).click();
  for (let i = 0; i < 4 && (await page.locator(".w3-dialog").count()); i++) await page.locator(".w3-dialog .w3-primary").click();
}
/** Fast travel through the quest log, then open the fallback controls. */
async function enter(page, name) {
  await page.keyboard.press("j");
  await page.getByRole("dialog", { name: "Log misi" }).getByRole("button", { name: `Teleport ke ${name}` }).click();
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
    ([k, s, want]) => (JSON.parse(localStorage.getItem(k) || "{}").done || []).filter((x) => x.startsWith(s + ".")).length >= want,
    [KEY, station, n],
    { timeout: 30000 },
  );
}
const has = async (page, key) => (await doneList(page)).includes(key);
const lockedTeleport = async (page, name) => {
  await page.keyboard.press("j");
  const n = await page.getByRole("dialog", { name: "Log misi" }).getByRole("button", { name: `Teleport ke ${name}` }).count();
  await page.keyboard.press("Escape");
  return n === 0;
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.goto(`${base}/?grafik=ringan`);
  await page.waitForSelector(".w3-canvas canvas", { timeout: 60000 });
  await page.getByRole("heading", { name: "Bangunkan GPT-3", exact: true }).waitFor();
  await page.waitForTimeout(1500);
  await shot(page, "intro");
  await page.getByRole("button", { name: "Mulai petualangan" }).click();
  await page.getByRole("dialog", { name: "Percakapan dengan Nara" }).waitFor();
  await shot(page, "dialog");
  for (let i = 0; i < 4 && (await page.locator(".w3-dialog").count()); i++) await page.keyboard.press("Enter");
  assert.equal(await page.locator(".w3-dialog").count(), 0, "Enter walks through the guide's lines");
  await page.waitForTimeout(1500);
  await shot(page, "walk");
  assert.equal(await count(page), 0);
  assert.ok(await lockedTeleport(page, "Gudang Data"), "Hutan Data stays locked before the prologue");
  checks.push("intro, guide dialog, locked bridge before the prologue");

  // Nara, the companion drone: greets, then answers H with the next step
  await page.locator(".w3-nara-bubble", { hasText: "Aku ikut terbang" }).waitFor();
  await page.keyboard.press("h");
  await page.locator(".w3-nara-bubble", { hasText: "Oracle Tanya" }).waitFor();
  const earned = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").earned || [], KEY);

  // tools: blocks spell a sentence the real model reads
  await page.keyboard.press("3");
  await page.locator(".w3-hotbar button.is-on", { hasText: "kunci" }).waitFor();
  for (const turns of [0, 2, 1, 1]) {
    for (let i = 0; i < turns; i++) await page.keyboard.press("r");
    await page.getByRole("button", { name: "Taruh balok di depan" }).click();
  }
  await page.locator(".w3-sentence", { hasText: "Oracle menebak berikutnya" }).waitFor();
  assert.match(await page.locator(".w3-sentence p").innerText(), /kuning|biru|merah|hijau/);
  await page.waitForFunction((k) => (JSON.parse(localStorage.getItem(k) || "{}").earned || []).includes("bisik"), KEY);
  await page.waitForTimeout(800);
  await shot(page, "blocks");
  await page.getByRole("button", { name: "Bongkar terakhir" }).click();
  assert.equal(await page.locator(".w3-sentence-chips span").count(), 3, "removing a block shortens the sentence");
  await page.keyboard.press("2");
  await page.getByRole("button", { name: "Pindai sekitar" }).click();
  await page.locator(".w3-scan h3").waitFor();
  await page.keyboard.press("1");

  // first person: crosshair, tool in hand, achievement
  await page.keyboard.press("v");
  await page.locator(".w3-crosshair").waitFor();
  await page.waitForTimeout(1500);
  await shot(page, "first-person");
  assert.ok((await earned()).includes("mata"), "first person earns its achievement");
  await page.keyboard.press("v");
  await page.locator(".w3-crosshair").waitFor({ state: "detached" });
  checks.push("Nara greets and hints; token blocks make the Oracle guess a colour; scanner; first-person view");

  // the library: walk-up books, turned page by page, finished by their question
  await page.keyboard.press("j");
  await page.getByRole("dialog", { name: "Log misi" }).getByRole("button", { name: "Baca Dari Aturan ke Contoh" }).click();
  const bar = page.getByRole("region", { name: "Buku Dari Aturan ke Contoh" });
  await bar.waitFor();
  await page.waitForTimeout(1200);
  await shot(page, "book");
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  await bar.getByRole("button", { name: /1 ELIZA lebih besar/ }).click();
  await bar.locator(".is-wrong").waitFor();
  assert.ok(!(await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").booksRead || [], KEY)).includes("sejarah"), "a wrong answer does not finish the book");
  await page.keyboard.press("2");
  await page.waitForFunction((k) => (JSON.parse(localStorage.getItem(k) || "{}").booksRead || []).includes("sejarah"), KEY);
  await page.waitForTimeout(800);
  await shot(page, "book-quiz");
  await page.keyboard.press("Escape");
  await bar.waitFor({ state: "detached" });
  assert.ok(await lockedTeleport(page, "Gudang Data"), "reading does not open bridges");
  checks.push("library: a lectern book opens in the world, pages turn, the question finishes it");

  // Prolog · Oracle Tanya
  await enter(page, "Oracle Tanya");
  await btn(page, "Tanya", true).click();
  await expectDone(page, "tanya", 1);
  await panel(page).locator(".w3-chip").nth(2).click(); // warna -> hijau
  await btn(page, "Tanya", true).click();
  await expectDone(page, "tanya", 2);
  for (let i = 0; i < 3; i++) await panel(page).locator(".w3-chip").nth(1).click(); // tempat -> lemari
  await btn(page, "Tanya", true).click();
  await expectDone(page, "tanya", 3);
  await page.waitForTimeout(2000);
  await shot(page, "tanya");
  assert.ok(!(await lockedTeleport(page, "Gudang Data")), "the prologue opens Hutan Data");
  assert.ok(await lockedTeleport(page, "Bengkel Gradien"), "Pegunungan Loss still locked");

  // Bab 1 · Fase Belajar
  await enter(page, "Gudang Data");
  for (const name of ["Common Crawl (difilter)", "WebText2", "Books1", "Books2", "Wikipedia"]) await btn(page, name).click();
  await expectDone(page, "data", 1);
  await btn(page, /^Wikipedia/).click();
  await expectDone(page, "data", 2);
  await btn(page, "Peti model mini").click();
  await expectDone(page, "data", 3);
  await page.waitForTimeout(800);
  await shot(page, "data");

  await enter(page, "Pemotong Token");
  await btn(page, "Potong catatan").click();
  await btn(page, "Kamus Indonesia").click();
  await setRange(panel(page).locator('input[type="range"]'), 200);
  await expectDone(page, "token", 2);
  await btn(page, "Kamus Inggris").click();
  await expectDone(page, "token", 3);

  await enter(page, "Sabuk Tebakan");
  const slots = panel(page).getByRole("button", { name: /Buka token posisi/ });
  const n = await slots.count();
  assert.ok(n > 15, "one button per predicted position");
  for (let i = 0; i < n; i++) await slots.nth(i).click();
  await expectDone(page, "objektif", 3);
  await page.waitForTimeout(800);
  await shot(page, "objektif");

  await enter(page, "Galaksi Makna");
  for (const w of ["·kunci", "·laci", "·biru"]) await btn(page, w, true).click();
  await expectDone(page, "makna", 3);
  assert.ok(!(await lockedTeleport(page, "Bengkel Gradien")), "finishing Fase Belajar opens Pegunungan Loss");
  checks.push("Fase Belajar: data mix, tokenizer, per-position loss, embeddings; bridge opens");

  // Bab 2 · Fase Optimasi
  await enter(page, "Bengkel Gradien");
  await panel(page).getByRole("button", { name: "merah", exact: true }).click();
  for (let i = 0; i < 10; i++) await btn(page, "Latih 1 langkah").click();
  await expectDone(page, "latih", 1);
  await setRange(panel(page).locator('input[type="range"]'), 1);
  await btn(page, "Gulirkan bola").click();
  await expectDone(page, "latih", 2);
  await setRange(panel(page).locator('input[type="range"]'), 2.4);
  await btn(page, /Gulirkan bola|Berhenti/).click();
  await expectDone(page, "latih", 3);

  await enter(page, "Tungku Komputasi");
  await btn(page, "GPT-3 175B", true).click();
  await btn(page, "300 miliar token", true).click();
  await expectDone(page, "komputasi", 2);
  await page.waitForTimeout(800);
  await shot(page, "komputasi");
  await btn(page, "model mini", true).click();
  await btn(page, /juta token$/).click();
  await expectDone(page, "komputasi", 3);

  await enter(page, "Aula Penyelarasan");
  for (let i = 0; i < 14 && !(await has(page, "selaras.honest")); i++) {
    const honest = btn(page, "Pilih “tidak diketahui.”");
    if (await honest.count()) await honest.click();
    else await btn(page, "Pilih “di tas merah.”").click();
  }
  await expectDone(page, "selaras", 2);
  await page.waitForTimeout(600);
  await shot(page, "selaras");
  checks.push("Fase Optimasi: gradient step, loss valley, overshoot, 6·N·D compute, preference tuning");

  // Bab 3 · Fase Berjalan
  await enter(page, "Panggung Sorot");
  await btn(page, /Sorot dari/).click();
  for (const lamp of ["Lapisan 2 · A", "Lapisan 2 · B"]) await btn(page, lamp, true).click();
  await expectDone(page, "sorot", 2);
  await btn(page, "Cabut L2 · A").click();
  await btn(page, "Cabut L2 · B").click();
  await expectDone(page, "sorot", 3);

  await enter(page, "Arena Peluang");
  for (let i = 0; i < 8 && !(await has(page, "peluang.eos")); i++) {
    await btn(page, "Tulis 1 token").click();
    await page.waitForTimeout(2100);
  }
  await setRange(panel(page).locator('input[type="range"]'), 5);
  for (let i = 0; i < 40 && !(await has(page, "peluang.hot")); i++) {
    await panel(page).getByRole("button", { name: /Tulis 1 token|Ulang/ }).click();
    await page.waitForTimeout(2050);
  }
  await expectDone(page, "peluang", 3);

  await enter(page, "Gudang Cache");
  for (let i = 0; i < 8 && !(await has(page, "cache.nocache")); i++) await btn(page, "Tulis 1 token").click();
  await btn(page, "Cache mati").click();
  for (let i = 0; i < 8 && !(await has(page, "cache.cache")); i++) await btn(page, "Tulis 1 token").click();
  await btn(page, "Baca rak GPT-3").click();
  await expectDone(page, "cache", 3);
  await page.waitForTimeout(800);
  await shot(page, "cache");
  const totals = await page.evaluate(() => document.body.innerText);
  assert.ok(!totals.includes("jawaban berbeda"), "cache does not change the answer");

  await enter(page, "Ruang Bukti");
  await btn(page, "Kaset: Tanpa lokasi").click();
  await btn(page, "Ambil dari arsip").click();
  await btn(page, "Kaset: Dua benda").click();
  await expectDone(page, "bukti", 3);
  checks.push("Fase Berjalan: attention heads, sampling temperature, real KV cache counts, hallucination and retrieval");

  // Finale
  await enter(page, "Menara Skala");
  await btn(page, "175B", true).click();
  await btn(page, "Cari model mini").click();
  await expectDone(page, "skala", 2);

  await enter(page, "Cetak Biru GPT-3");
  await btn(page, "Penyelarasan", true).click(); // wrong: nothing happens
  assert.match(await panel(page).locator(".w3-readout").innerText(), /Latih: kosong/);
  for (const name of ["Korpus", "Tokenizer", "Target token berikutnya", "Optimizer Adam", "Komputasi", "Penyelarasan"]) await btn(page, name, true).click();
  await expectDone(page, "rakit", 1);
  for (const name of ["Jendela konteks", "Tokenizer", "Embedding", "Blok attention", "KV cache", "Logits & sampling"]) await btn(page, name, true).click();
  await expectDone(page, "rakit", 2);
  await page.waitForTimeout(1500);
  await shot(page, "rakit");
  checks.push("Finale: scale tower and the GPT-3 blueprint in the right order only");

  assert.equal(await count(page), 39, "all insights unlocked");
  const awards = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), KEY);
  for (const id of ["pertama", "bab1", "bab2", "bab3", "gpt3"]) assert.ok(awards.earned.includes(id), `achievement ${id}`);
  assert.ok(!awards.earned.includes("sempurna"), "a wrong blueprint try forfeits the perfect award");
  assert.ok(awards.finished && awards.bestTime > 0, "the run's time is recorded as the best time");
  await page.getByRole("dialog", { name: "Kartu temuan" }).waitFor({ timeout: 10000 });
  await shot(page, "finale");
  await page.keyboard.press("Escape");
  await page.keyboard.press("k");
  await page.getByRole("dialog", { name: "Pencapaian" }).waitFor();
  await shot(page, "awards");
  await page.keyboard.press("Escape");
  await page.keyboard.press("m");
  await page.getByRole("dialog", { name: "Peta kepulauan" }).waitFor();
  await shot(page, "map");
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForSelector(".w3-canvas canvas");
  assert.equal(await count(page), 39, "progress survives a reload");
  // software rendering is slow; one live world at a time
  await page.close();

  // phone layout
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  watch(phone);
  await phone.goto(`${base}/?grafik=ringan`);
  await begin(phone);
  await phone.locator(".w3-actions button").first().click();
  await phone.getByRole("dialog", { name: "Log misi" }).getByRole("button", { name: "Teleport ke Oracle Tanya" }).click();
  await phone.locator(".w3-panel h2", { hasText: "Oracle Tanya" }).waitFor();
  await phone.waitForTimeout(2200);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, "no horizontal scroll on phone");
  await phone.screenshot({ path: path.join(output, "world3d-phone.png") });
  assert.equal(await phone.locator(".w3-hotbar button").count(), 3, "hotbar on phones");
  checks.push("390px phone: menu, quest log, station panel, hotbar, no overflow");
  await phone.close();

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
  await blocked.goto(`${base}/?grafik=ringan`);
  await begin(blocked);
  await enter(blocked, "Oracle Tanya");
  await btn(blocked, "Tanya", true).click();
  await blocked.waitForFunction(() => document.querySelector(".w3-gold b")?.textContent === "1");
  checks.push("blocked storage still plays");
  await blocked.close();

  // full graphics: post-processing, shadows and the dusk sky render without errors
  const high = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(high);
  await high.goto(`${base}/?grafik=tinggi`);
  await high.waitForTimeout(6000);
  // A blanked frame (bloom spreading NaN) compresses to almost nothing; a real
  // view of the archipelago does not.
  const intro = await high.screenshot({ type: "jpeg", quality: 70 });
  assert.ok(intro.length > 50000, `high-graphics intro looks blank (${intro.length} bytes)`);
  await begin(high);
  await high.waitForTimeout(4000);
  await high.screenshot({ path: path.join(output, "world3d-high.png") });
  checks.push("high graphics renders");
  await high.close();


  assert.deepEqual(errors, [], "no page errors");
  assert.deepEqual(outside, [], "no external requests");
  await fs.writeFile(path.join(output, "world3d-browser-report.json"), JSON.stringify({ checks, errors, outside }, null, 2));
  console.log(checks.join("\n"));
  console.log("world3d browser checks passed");
} finally {
  await browser.close();
  server?.close();
}
