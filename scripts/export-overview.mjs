import { chromium } from "playwright";
import path from "node:path";
// Run alongside npm run dev. Capture the real first-person world for the blog cover.
const browser = await chromium.launch({
  channel: process.env.NEUROLAB_BROWSER_CHANNEL || undefined,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  await page.goto(process.env.NEUROLAB_PREVIEW_URL || "http://127.0.0.1:5173/");
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.playerX,
  );
  await page.getByRole("button", { name: "Tutup hint" }).click();
  await page.getByRole("button", { name: "Peta", exact: true }).click();
  await page
    .getByRole("button", { name: "Pergi ke Causal attention", exact: true })
    .click();
  await page.keyboard.press("3");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.resolve("public/lab-overview.jpg"),
    type: "jpeg",
    quality: 93,
  });
  console.log("Exported public/lab-overview.jpg from the first-person world.");
} finally {
  await browser.close();
}
