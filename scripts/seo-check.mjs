import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { allPages, headForPage } from "./site-seo.mjs";
import { SITE_ORIGIN, topicPath } from "../src/seo/content.mjs";
const root = new URL("../dist/", import.meta.url);
const read = (file) => fs.readFile(new URL(file, root), "utf8");
const sitemap = await read("sitemap.xml");
assert.equal((sitemap.match(/<url>/g) || []).length, 18);
for (const p of allPages) {
  const html = await read(p.path.slice(1) + "index.html"),
    canonical = SITE_ORIGIN + p.path;
  assert.ok(html.includes(`<html lang="${p.lang}"`), p.path);
  assert.ok(
    html.includes(`<link rel="canonical" href="${canonical}">`),
    p.path,
  );
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(
    html.includes('hreflang="id"') &&
      html.includes('hreflang="en"') &&
      html.includes('hreflang="x-default"'),
  );
  assert.ok(!html.includes('name="description" content=""'));
  assert.ok(html.includes('name="robots" content="index, follow'));
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  const graph = JSON.parse(
    html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
  );
  assert.ok(
    graph["@graph"].some(
      (node) => node.inLanguage === p.lang && node.url === canonical,
    ),
  );
  const counterpart = p.station
    ? topicPath(p.station, p.lang === "id" ? "en" : "id")
    : `/${p.lang === "id" ? "en" : "id"}/`;
  assert.ok(html.includes(`href="${SITE_ORIGIN + counterpart}"`));
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ");
  assert.ok(text.length > 1800, `${p.path} has substantive crawlable text`);
  assert.ok(!text.includes("\u2014"));
  assert.ok(html.includes('href="https://vicoworks.com"'));
  for (const link of html.matchAll(/href="(\/(?!\/)[^"#?]+)(?:#[^"]*)?"/g)) {
    const path = link[1];
    if (path.endsWith("/"))
      await fs.access(new URL(path.slice(1) + "index.html", root));
    else await fs.access(new URL(path.slice(1), root));
  }
  const md = await read(`content/${p.lang}/${p.station ?? "index"}.md`);
  assert.ok(md.includes(canonical));
}
const robots = await read("robots.txt");
assert.ok(robots.includes("Allow: /"));
assert.ok(robots.includes(SITE_ORIGIN + "/sitemap.xml"));
const llms = await read("llms.txt");
assert.ok(llms.startsWith("# NeuroLab"));
for (const p of allPages) assert.ok(llms.includes(SITE_ORIGIN + p.path));
assert.ok((await read("llms-full.txt")).length > 30000);
const oldPreview = process.env.VERCEL_ENV;
process.env.VERCEL_ENV = "preview";
assert.ok(headForPage("en").includes("noindex, follow"));
if (oldPreview === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = oldPreview;
assert.ok((await read("404.html")).includes("noindex,follow"));
console.log(
  "SEO checks passed: 18 language pages, reciprocal hreflang, canonicals, JSON-LD, local links, Markdown mirrors, robots, sitemap, llms, and preview noindex.",
);
