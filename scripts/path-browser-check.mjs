import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { missions } from "../src/content/paths.ts";
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
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    if ((await fs.stat(file)).isDirectory())
      file = path.join(file, "index.html");
    res.setHeader(
      "Content-Type",
      mime[path.extname(file)] || "application/octet-stream",
    );
    res.end(await fs.readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(5192, "127.0.0.1", resolve));
const base = "http://127.0.0.1:5192",
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
    if (
      !r.url().startsWith(base) &&
      !r.url().startsWith("data:") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
};
const axe = async (page, name) => {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const violations = await page.evaluate(
    async () =>
      (await window.axe.run(document.querySelector(".investigation")))
        .violations,
  );
  await fs.writeFile(
    path.join(output, `path-axe-${name}.json`),
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
const click = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
const shot = (page, name, fullPage = true) =>
  page.screenshot({ path: path.join(output, `path-${name}.png`), fullPage });
const missionOpen = async (page, level, id) => {
  await page.goto(`${base}/id/?level=${level}&mission=${id}&mode=2d`);
  await page.locator(".journey-stage h1").waitFor();
};
const checklistDone = async (page, expected) => {
  await page
    .locator(".journey-checklist li.done")
    .nth(expected - 1)
    .waitFor();
  assert.equal(
    await page.locator(".journey-checklist li.done").count(),
    expected,
  );
};
const missionDone = (page) => page.locator(".journey-done").waitFor();
const setRange = (locator, value) => locator.fill(String(value));

try {
  browser = await chromium.launch({
    channel: process.env.NEUROLAB_BROWSER_CHANNEL || undefined,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const fresh = async (options) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      ...options,
    });
    const page = await context.newPage();
    watch(page);
    return page;
  };

  // Level gate (text mode). The front door is now the game world.
  const gate = await fresh();
  await gate.goto(`${base}/id/?pick=1`);
  await gate.locator(".gate-hero h1").waitFor();
  await shot(gate, "gate-desktop");
  await axe(gate, "gate");
  const lensCards = gate.locator(".gate-levels article");
  await lensCards.nth(1).hover();
  await gate.locator(".gate-lens-tokens").waitFor();
  assert.match(await gate.locator(".gate-lens-tokens").innerText(), /id 19/);
  await shot(gate, "gate-tokens", false);
  await lensCards.nth(2).hover();
  await gate.locator(".gate-lens-math").waitFor();
  await shot(gate, "gate-math", false);
  await click(gate, "Bantu pilihkan levelku");
  assert.match(await gate.locator(".gate-quiz h1").innerText(), /baris ini/);
  await shot(gate, "gate-quiz", false);
  await axe(gate, "quiz");
  await click(gate, "Belum tahu");
  await click(gate, "Belum tahu");
  await gate.locator(".gate-result").waitFor();
  assert.match(await gate.locator(".gate-result h1").innerText(), /Pemula/);
  await shot(gate, "gate-result");
  checks.push(
    "non-technical visitor stops after two questions, lands on Pemula",
  );

  await click(gate, "Ubah jawaban terakhir");
  await click(gate, "Menyimpan hasilnya di cache");
  assert.match(
    await gate.locator(".gate-quiz h1").innerText(),
    /overfitting|Loss/,
  );
  await click(gate, "Belum tahu");
  await gate.locator(".gate-result").waitFor();
  assert.match(await gate.locator(".gate-result h1").innerText(), /Menengah/);
  await click(gate, "Ubah jawaban terakhir");
  await click(gate, "Model mulai overfitting");
  await gate
    .getByRole("button", { name: /Mask kausal membuat K\/V lama/ })
    .click();
  assert.match(await gate.locator(".gate-result h1").innerText(), /Mahir/);
  await click(gate, "Mulai jalur Mahir");
  await gate.locator(".journey-stage h1").waitFor();
  assert.match(gate.url(), /level=mahir/);
  await gate.goto(`${base}/id/?pick=1`);
  await click(gate, "Lanjutkan jalur Mahir");
  await gate.locator(".journey-stage h1").waitFor();
  assert.match(await gate.locator(".journey-level").innerText(), /Mahir/);
  await click(gate, "Ganti level");
  await gate.locator(".gate-hero h1").waitFor();
  await gate.getByRole("button", { name: "Lanjutkan jalur Mahir" }).waitFor();
  checks.push(
    "adaptive calibration reaches Menengah and Mahir; level resumes and can be changed",
  );

  // Pemula: finish every mission through the interface.
  const p = await fresh();
  await missionOpen(p, "pemula", "aturan");
  await shot(p, "pemula-start");
  await click(p, "Jalankan kedua mesin");
  await checklistDone(p, 1);
  await p.getByLabel("Tempat").selectOption("3");
  await click(p, "Jalankan kedua mesin");
  assert.match(
    await p.getByTestId("program-answer").innerText(),
    /Tidak ada aturan/,
  );
  assert.equal(
    await p.getByTestId("model-answer").innerText(),
    "di lemari biru.",
  );
  assert.match(
    await p.locator(".lab-flag").innerText(),
    /tidak pernah dilihat/,
  );
  await click(p, "Tulis aturan untuk catatan ini");
  await missionDone(p);
  await shot(p, "pemula-rules");
  await axe(p, "pemula-rules");

  await missionOpen(p, "pemula", "kata");
  const finishWords = async () => {
    for (let i = 0; i < 5; i++) {
      await p.locator(".lab-choices button").first().click();
      await p.getByRole("button", { name: /^Tambahkan/ }).click();
    }
  };
  await finishWords();
  assert.equal(
    await p.getByTestId("built-answer").innerText(),
    "Jawaban: di laci biru.",
  );
  await p.getByLabel("Warna di catatan").selectOption("1");
  await finishWords();
  assert.match(await p.getByTestId("built-answer").innerText(), /laci hijau\./);
  await missionDone(p);
  await axe(p, "pemula-words");

  await missionOpen(p, "pemula", "belajar");
  await setRange(p.getByLabel("Langkah latihan"), 18);
  for (let i = 0; i < 3; i++) await click(p, "Koreksi sekali");
  await click(p, "Uji pada contoh tersembunyi");
  assert.match(
    await p.getByTestId("held-out-result").innerText(),
    /112 dari 112/,
  );
  await missionDone(p);
  await shot(p, "pemula-training");
  await axe(p, "pemula-training");

  await missionOpen(p, "pemula", "baca");
  await p.getByLabel("Warna").selectOption("2");
  assert.equal(
    await p.getByTestId("focus-answer").innerText(),
    "di laci merah.",
  );
  await click(p, "Nyalakan sorotan");
  assert.match(await p.locator(".lab-flag").first().innerText(), /“merah”/);
  await shot(p, "pemula-focus");
  await click(p, "Hapus catatan");
  assert.equal(
    await p.getByTestId("focus-answer").innerText(),
    "di laci kuning.",
  );
  await missionDone(p);
  await axe(p, "pemula-focus");

  await missionOpen(p, "pemula", "acak");
  await click(p, "Tanya 6 kali");
  assert.equal(await p.locator(".lab-samples li.off").count(), 0);
  await setRange(p.getByLabel("Keberanian"), 3.5);
  await click(p, "Tanya 6 kali");
  await missionDone(p);
  assert.ok((await p.locator(".lab-samples li.off").count()) > 0);
  await shot(p, "pemula-dice");

  await missionOpen(p, "pemula", "lancar");
  await p.locator('input[name="verdict-missing"]').nth(0).check();
  assert.match(
    await p.locator(".story-feedback").first().innerText(),
    /Belum tepat/,
  );
  await p.locator('input[name="verdict-missing"]').nth(1).check();
  await p.locator('input[name="verdict-two"]').nth(2).check();
  await p.locator('input[name="verdict-conflict"]').nth(3).check();
  await missionDone(p);
  await shot(p, "pemula-verify");
  await axe(p, "pemula-verify");

  await missionOpen(p, "pemula", "pulang");
  const rows = p.locator(".lab-order li");
  for (let target = 0; target < 5; target++) {
    const expected = [
      "Saat belajar",
      "Saat kamu bertanya",
      "Mesin menghitung",
      "Satu potongan",
      "Kamu memeriksa",
    ][target];
    const texts = await rows.locator("span").allInnerTexts();
    let from = texts.findIndex((t) => t.startsWith(expected));
    while (from > target) {
      await rows
        .nth(from)
        .getByRole("button", { name: /^Naikkan/ })
        .click();
      from--;
    }
  }
  await click(p, "Periksa urutan");
  for (const [claim, truth] of [
    ["Mesin memilih potongan", "Fakta"],
    ["Mesin menyimpan daftar", "Mitos"],
    ["Ceritamu langsung", "Mitos"],
    ["Jawaban yang yakin", "Mitos"],
    ["Isi pesanmu", "Fakta"],
    ["Mesin bisa menyebut", "Fakta"],
  ])
    await p
      .getByRole("button", { name: new RegExp(`^${truth}: ${claim}`) })
      .click();
  await p
    .locator(".story-reflection textarea")
    .fill("LLM memilih potongan teks berikutnya dari peluang yang dipelajari.");
  await click(p, "Simpan kartu");
  await missionDone(p);
  assert.match(await p.locator(".journey-done").innerText(), /tuntas/);
  await p.getByRole("button", { name: "Lanjut ke jalur Menengah" }).waitFor();
  await shot(p, "pemula-final");
  await p.reload();
  await p.locator(".journey-stage h1").waitFor();
  await missionDone(p);
  assert.match(await p.locator(".lab-card").innerText(), /potongan teks/);
  assert.equal(
    await p.locator(".journey-map li.done").count(),
    missions.pemula.length,
  );
  checks.push(
    "all 7 Pemula missions complete through the UI with real model outputs; progress and card survive reload",
  );

  // Menengah: BPE lab, then a guided post that ticks the mission.
  const m = await fresh();
  await missionOpen(m, "menengah", "tokenizer");
  const before = await m.getByTestId("bpe-tokens").locator("code").count();
  for (let i = 0; i < 5; i++) await click(m, "Merge berikutnya");
  assert.ok(
    (await m.getByTestId("bpe-tokens").locator("code").count()) < before,
  );
  await m.getByLabel("Teks yang ditokenisasi").fill("kuberneteskan deployment");
  assert.match(
    await m.locator(".story-result").first().innerText(),
    /Rekonstruksi persis/,
  );
  await m.getByLabel("Hanya Inggris").check();
  const ratio = async () =>
    (
      await m.getByTestId("bpe-compare").locator("tbody tr").allInnerTexts()
    ).map((row) => Number(row.trim().split(/\s+/).at(-1).replace(",", ".")));
  const [idOnEn, enOnEn] = await ratio();
  assert.ok(idOnEn > enOnEn);
  await m.getByLabel("Hanya Indonesia").check();
  const [idOnId, enOnId] = await ratio();
  assert.ok(enOnId > idOnId);
  await checklistDone(m, 3);
  await shot(m, "menengah-bpe");
  await axe(m, "menengah-bpe");
  await m.getByRole("button", { name: /Tokenisasi/ }).click();
  await m.locator(".story-heading h1").waitFor();
  assert.match(await m.locator(".story-guide").innerText(), /lexer/);
  assert.equal(await m.locator(".story-sidebar .story-act button").count(), 1);
  await shot(m, "menengah-post", false);
  await axe(m, "menengah-post");
  await m.locator(".story-prediction input[type=radio]").first().check();
  await m.locator(".story-prediction .story-primary").click();
  await m
    .getByRole("button", { name: "Pindahkan ·kunci ke kiri", exact: true })
    .click();
  await m
    .getByLabel("Teks kembali persis, termasuk spasi dan newline", {
      exact: true,
    })
    .check();
  await click(m, "Simpan bukti dan penjelasan");
  await m.locator(".story-guide li.done").nth(2).waitFor();
  await m
    .locator(".story-next")
    .getByRole("button", { name: "Kembali ke misi" })
    .click();
  await m.locator(".journey-stage h1").waitFor();
  await missionDone(m);
  await missionOpen(m, "menengah", "attention");
  assert.match(await m.locator(".journey-lens").innerText(), /dict\[key\]/);
  assert.equal(await m.locator(".journey-posts button").count(), 3);
  await m.getByRole("button", { name: /Mask kausal/ }).click();
  await m.locator(".story-heading h1").waitFor();
  assert.equal(await m.locator(".story-sidebar .story-act button").count(), 3);
  await m
    .locator(".story-next")
    .getByRole("button", { name: /Campuran Value/ })
    .click();
  assert.match(m.url(), /lesson=6/);
  assert.match(m.url(), /level=menengah/);
  await m
    .locator(".story-next")
    .getByRole("button", { name: "Kembali ke misi" })
    .click();
  await m.locator(".journey-stage h1").waitFor();
  await m.goBack();
  await m.locator(".story-heading h1").waitFor();
  checks.push(
    "Menengah: BPE retrain changes token cost per language; guided post ticks its mission; scoped route and back navigation",
  );

  // Mahir: every calculator.
  const a = await fresh();
  await missionOpen(a, "mahir", "parameter");
  await a.getByLabel("175B").check();
  assert.match(await a.locator(".story-result").innerText(), /174,6 M/);
  assert.match(await a.getByTestId("param-table").innerText(), /MLP/);
  await shot(a, "mahir-params");
  await axe(a, "mahir-params");
  await a.getByLabel("Small").check();
  await a.getByLabel("13B").check();
  await a.getByLabel(/Pakai d = 5\.140/).check();
  assert.match(
    await a.locator(".story-result").innerText(),
    /40 × 128 = 5\.120/,
  );
  await missionDone(a);

  await missionOpen(a, "mahir", "compute");
  await click(a, "Hitung ulang dari 6ND");
  assert.match(await a.getByTestId("flops-result").innerText(), /3,14×10²³/);
  await setRange(a.getByLabel("Parameter N"), 10.7);
  assert.match(await a.getByTestId("isoflop").innerText(), /19|2\d|1\d/);
  await click(a, "Hitung epoch dari bobot");
  await missionDone(a);
  await shot(a, "mahir-compute");
  await axe(a, "mahir-compute");

  await missionOpen(a, "mahir", "attention-gpt3");
  await a.getByLabel("Locally banded").check();
  await a.getByLabel("2.048", { exact: true }).check();
  const dense2048 = await a.getByTestId("attention-share").innerText();
  await a.getByLabel("32.768", { exact: true }).check();
  assert.notEqual(
    await a.getByTestId("attention-share").innerText(),
    dense2048,
  );
  await missionDone(a);
  await shot(a, "mahir-sparse");
  await axe(a, "mahir-sparse");

  await missionOpen(a, "mahir", "kv");
  assert.match(
    await a.getByTestId("kv-result").innerText(),
    /4,72 MB per token/,
  );
  assert.match(await a.getByTestId("kv-result").innerText(), /batch 37/);
  await setRange(a.getByLabel("Batch"), 37);
  await a.getByLabel("8 (GQA)").check();
  await checklistDone(a, 2);
  assert.match(await a.getByTestId("kv-result").innerText(), /batch 434/);
  await shot(a, "mahir-kv");
  await axe(a, "mahir-kv");

  await missionOpen(a, "mahir", "icl");
  await a.getByLabel("LAMBADA").check();
  assert.match(
    await a.getByTestId("icl-result").innerText(),
    /One-shot turun 3,7/,
  );
  await a.getByLabel("WebQuestions").check();
  await checklistDone(a, 2);
  await shot(a, "mahir-icl");

  await missionOpen(a, "mahir", "sesudah");
  const pairs = {
    RoPE: "Posisi relatif dan perluasan konteks",
    RMSNorm: "Biaya normalisasi",
    SwiGLU: "Kualitas MLP pada parameter setara",
    "GQA / MQA": "Ukuran KV cache saat decode",
    "Mixture of Experts": "Parameter total terpisah dari compute per token",
    FlashAttention: "Lalu lintas memori attention",
    "Lebih banyak token per parameter": "Alokasi compute training",
    "SFT dan RLHF": "Mengikuti instruksi dan preferensi",
  };
  await click(a, "Periksa pemetaan");
  assert.match(await a.locator(".story-feedback").innerText(), /8 pemetaan/);
  for (const [change, target] of Object.entries(pairs))
    await a.getByLabel(`Hambatan untuk ${change}`).selectOption(target);
  await click(a, "Periksa pemetaan");
  await checklistDone(a, 1);
  await shot(a, "mahir-lineage");
  await axe(a, "mahir-lineage");

  await missionOpen(a, "mahir", "verifikasi");
  await a.getByRole("button", { name: /Blok lengkap/ }).click();
  await a.locator(".story-heading h1").waitFor();
  assert.equal(
    await a
      .getByRole("tab", { name: "Angka", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  checks.push(
    "Mahir: calculators reproduce 174.6B, 3.14e23, 4.72 MB per token, batch 37 and the 13B anomaly; guided post opens on numbers",
  );

  // Phone: every mission keeps to the viewport.
  const phone = await fresh({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await phone.goto(`${base}/id/?pick=1`);
  await phone.locator(".gate-hero h1").waitFor();
  await shot(phone, "gate-phone");
  const fits = () =>
    phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    );
  assert.ok(await fits(), "gate overflows on a phone");
  for (const [level, list] of Object.entries(missions))
    for (const mission of list) {
      await missionOpen(phone, level, mission.id);
      assert.ok(await fits(), `${level}/${mission.id} overflows on a phone`);
    }
  await missionOpen(phone, "pemula", "aturan");
  await shot(phone, "pemula-phone");
  await missionOpen(phone, "mahir", "parameter");
  await shot(phone, "mahir-phone");
  checks.push(
    "gate and all missions fit a 390px touch viewport with reduced motion",
  );

  // Links that predate the levels keep their behaviour.
  const legacy = await fresh();
  await legacy.goto(`${base}/id/?lesson=4&mode=2d`);
  await legacy.locator(".story-heading h1").waitFor();
  assert.equal(await legacy.locator(".story-guide").count(), 0);
  assert.equal(await legacy.locator(".story-route select").count(), 1);
  await legacy.goto(`${base}/id/?level=salah&mode=2d`);
  await legacy.locator(".gate-hero h1").waitFor();
  checks.push(
    "bare lesson links stay unguided; an unknown level falls back to the gate",
  );

  const broken = await fresh();
  await broken.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await broken.goto(`${base}/id/?level=pemula&mission=aturan&mode=2d`);
  await broken.locator(".journey-stage h1").waitFor();
  await click(broken, "Jalankan kedua mesin");
  await broken.locator(".journey-checklist li.done").waitFor();
  await broken.getByText("Penyimpanan lokal tidak tersedia").waitFor();
  checks.push(
    "blocked storage keeps missions working and says progress will not persist",
  );

  assert.deepEqual(errors, [], "runtime errors");
  assert.deepEqual(external, [], "all inference and assets remain local");
  await fs.writeFile(
    path.join(output, "path-browser-report.json"),
    JSON.stringify({ checks, errors, external }, null, 2),
  );
  console.log(checks.join("\n"));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
