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
await new Promise((resolve) => server.listen(5191, "127.0.0.1", resolve));
const base = "http://127.0.0.1:5191",
  errors = [],
  external = [],
  checks = [];
let browser;
try {
  browser = await chromium.launch({
    channel: process.env.NEUROLAB_BROWSER_CHANNEL || undefined,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith(base) &&
      !r.url().startsWith("data:") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  const open = async (n, mode = "2d") => {
    await page.goto(`${base}/id/?lesson=${n}&mode=${mode}`);
    await page.locator(".story-heading h1").waitFor();
  };
  const predict = async () => {
    await page.locator(".story-prediction input[type=radio]").first().check();
    await page.locator(".story-prediction .story-primary").click();
    await page.getByTestId("story-observation").waitFor();
  };
  const axe = async (name) => {
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const violations = await page.evaluate(
      async () =>
        (await window.axe.run(document.querySelector(".investigation")))
          .violations,
    );
    await fs.writeFile(
      path.join(output, `story-axe-${name}.json`),
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
  await open(0, "3d");
  await page.locator(".story-viewport canvas").waitFor();
  await page.screenshot({
    path: path.join(output, "story-opening-desktop.png"),
  });
  assert.equal(await page.getByTestId("story-observation").count(), 0);
  assert.equal(
    await page.locator(".story-prediction .story-primary").isDisabled(),
    true,
  );
  await axe("opening");
  await page.getByLabel("Bobot model ditulis ulang", { exact: true }).check();
  await page
    .getByRole("button", { name: "Bandingkan kedua warna", exact: true })
    .click();
  assert.equal(await page.locator(".story-ab .story-candidates").count(), 2);
  await page
    .getByLabel("Checkpoint sama, tetapi logits A/B berbeda", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Simpan bukti dan penjelasan", exact: true })
    .click();
  assert.match(await page.locator(".story-feedback").innerText(), /tersimpan/);
  checks.push(
    "prediction gated; wrong initial prediction can be revised through measured evidence",
  );
  await page.getByRole("button", { name: /Buku bukti/ }).click();
  await page.getByRole("dialog").waitFor();
  assert.match(
    await page.getByRole("dialog").innerText(),
    /Bobot model ditulis ulang/,
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.locator(".story-heading h1").waitFor();
  await page.getByRole("button", { name: /Buku bukti/ }).click();
  assert.equal(await page.getByRole("dialog").locator("article").count(), 1);
  await page
    .getByRole("button", { name: "Tutup buku bukti", exact: true })
    .click();
  checks.push(
    "evidence persists with original hypothesis, context and conclusion; keyboard dialog",
  );
  for (let n = 1; n <= 13; n++) {
    await open(n);
    await predict();
    assert.equal(await page.getByTestId("story-observation").isVisible(), true);
    if (n === 1) {
      await page
        .getByRole("button", { name: "Pindahkan ·kunci ke kiri", exact: true })
        .click();
      assert.match(
        await page.locator(".story-instrument").first().innerText(),
        /Persis/,
      );
    }
    if (n === 4) {
      await page.getByLabel("Blok", { exact: true }).selectOption("1");
      await page.getByLabel("Head", { exact: true }).selectOption("1");
      assert.match(
        await page.locator(".story-instrument h3").first().innerText(),
        /Blok 2 \/ head 2/,
      );
    }
    if (n === 5) {
      assert.ok((await page.locator(".story-masked").count()) > 0);
      await page
        .getByRole("button", { name: "Buka mask pada salinan diagnostik" })
        .click();
      assert.match(
        await page.getByTestId("story-observation").innerText(),
        /demonstrasi kebocoran/,
      );
      assert.equal(await page.locator(".story-masked").count(), 0);
      await page.getByRole("tab", { name: "Angka", exact: true }).click();
      const downloaded = page.waitForEvent("download");
      await page.getByRole("button", { name: "Unduh semua tensor" }).click();
      const packet = JSON.parse(
        await fs.readFile(await (await downloaded).path(), "utf8"),
      );
      assert.equal(packet.trace.config.causal, false);
      assert.equal(packet.tokens.length, packet.trace.ids.length);
      assert.equal(packet.vocabulary.length, 32);
      assert.equal(packet.generationStep, 2);
      assert.equal(packet.generationHistory.length, packet.generationStep);
      await page
        .getByRole("button", { name: "Tutup diagnosis tanpa mask" })
        .click();
      assert.ok((await page.locator(".story-masked").count()) > 0);
    }
    if (n === 7) {
      await page.getByLabel("Salinan diagnostik").selectOption("residual");
      assert.equal(
        await page
          .getByRole("columnheader", { name: "R = Att", exact: true })
          .count(),
        1,
      );
      assert.match(
        await page.locator(".story-block-flow").innerText(),
        /residual diputus/,
      );
      await page.getByLabel("Salinan diagnostik").selectOption("none");
      assert.equal(
        await page
          .getByRole("columnheader", { name: "R = X + Att", exact: true })
          .count(),
        1,
      );
      await page
        .getByRole("button", { name: "Geser operasi 2 ke kiri", exact: true })
        .click();
    }
    if (n === 8) {
      await page.getByLabel("Temperature", { exact: true }).fill("2");
      await page
        .getByRole("button", { name: "Undi lagi dari logits yang sama" })
        .click();
      assert.equal(
        await page.getByLabel("Seed", { exact: true }).inputValue(),
        "43",
      );
    }
    if (n === 9) {
      for (let i = 0; i < 4; i++)
        await page
          .getByRole("button", {
            name: "Tambahkan pilihan dan hitung langkah berikutnya",
          })
          .click();
      assert.match(
        await page.locator(".story-generation").innerText(),
        /Berhenti: eos/,
      );
    }
    if (n === 10) {
      await page
        .getByRole("button", { name: "Terapkan satu langkah gradient descent" })
        .click();
      assert.match(
        await page.locator(".story-example").innerText(),
        /1 langkah diterapkan/,
      );
      await page
        .getByRole("button", {
          name: "Simpan sebagai sudah diamati",
          exact: true,
        })
        .click();
      const trainingEvidence = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("neurolab-evidence-v2")).find(
          (e) => e.lesson === 10,
        ),
      );
      assert.equal(trainingEvidence.trainingUpdates, 1);
      assert.match(trainingEvidence.observation, /1 langkah diterapkan/);
      await page.screenshot({
        path: path.join(output, "story-training.png"),
        fullPage: true,
      });
    }
    if (n === 12) {
      await page.getByRole("button", { name: "1. Cari dokumen lokal" }).click();
      assert.match(
        await page.locator(".story-retrieval").innerText(),
        /belum mengubah input/,
      );
      await page
        .getByRole("button", {
          name: "2. Masukkan cuplikan arsip-01 ke konteks",
        })
        .click();
      assert.match(
        await page.locator(".story-retrieval").innerText(),
        /di laci hijau/,
      );
      await page.getByRole("button", { name: "Uji dua benda" }).click();
      assert.match(
        await page.getByTestId("story-observation").innerText(),
        /di laci kuning/,
      );
    }
    if (n === 11) {
      for (const [i, category] of [
        "Konteks",
        "Parameter",
        "Decoding",
        "Aplikasi → konteks",
      ].entries())
        await page
          .locator(".story-instrument select")
          .nth(i)
          .selectOption(category);
      await page
        .getByLabel(
          "Prompt, parameter, decoding, dan aplikasi punya fungsi berbeda",
          { exact: true },
        )
        .check();
      await page
        .getByRole("button", {
          name: "Simpan bukti dan penjelasan",
          exact: true,
        })
        .click();
      assert.match(
        await page.locator(".story-feedback").innerText(),
        /tersimpan/,
      );
    }
    if (n === 13) {
      for (const [i, answer] of [0, 1, 2, 0, 1].entries())
        await page.locator(`input[name="transfer-${i}"]`).nth(answer).check();
      await page
        .getByRole("button", { name: "Periksa penjelasan transfer" })
        .click();
      await page
        .getByLabel("Token → vektor → blok → logits → pilihan → konteks baru", {
          exact: true,
        })
        .check();
      await page
        .locator(".story-reflection textarea")
        .fill(
          "Konteks mengubah aktivasi, sedangkan bobot tetap saat inference. Cache memakai ulang hasil prefix. Klaim lokasi harus diperiksa terhadap catatan yang masuk sebagai sumber.",
        );
      await page
        .getByRole("button", {
          name: "Simpan bukti dan penjelasan",
          exact: true,
        })
        .click();
      const evidence = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("neurolab-evidence-v2")),
      );
      assert.equal(evidence.find((e) => e.lesson === 13)?.status, "explained");
    }
    if ([4, 8, 12, 13].includes(n)) await axe(`pos-${n}`);
  }
  checks.push(
    "all 14 stations; lookup/projection, mask diagnostic, sampling, full generation, training and local retrieval",
    "diagnostic tensors/export synchronized; post-training classification and final transfer saved as explained",
  );
  await open(6, "3d");
  await predict();
  await page.locator(".story-viewport canvas").waitFor();
  await page
    .locator(".story-viewport")
    .screenshot({ path: path.join(output, "story-attention-3d.png") });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(`${base}/id/?lesson=0&mode=2d`);
  await mobile.locator(".story-heading h1").waitFor();
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "no mobile page overflow",
  );
  await mobile.locator(".story-prediction input").first().check();
  await mobile.locator(".story-prediction .story-primary").click();
  await mobile.screenshot({
    path: path.join(output, "story-mobile.png"),
    fullPage: true,
  });
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type, ...args);
    };
  });
  await fallback.goto(`${base}/id/?lesson=0`);
  await fallback.locator(".story-diagram").waitFor();
  checks.push(
    "touch layout, reduced motion, no page overflow, WebGL-disabled diagram fallback",
  );
  assert.deepEqual(errors, [], "runtime errors");
  assert.deepEqual(external, [], "all inference/assets remain local");
  await fs.writeFile(
    path.join(output, "story-browser-report.json"),
    JSON.stringify({ checks, errors, external }, null, 2),
  );
  console.log(checks.join("\n"));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
