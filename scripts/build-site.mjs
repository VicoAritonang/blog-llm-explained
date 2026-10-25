import fs from "node:fs/promises";
import path from "node:path";
import {
  renderEntryDocument,
  renderTopic,
  allPages,
  markdown,
  sitemap,
  robots,
  llms,
} from "./site-seo.mjs";
import { siteCopy } from "../src/seo/content.mjs";
const root = path.resolve("dist"),
  base = await fs.readFile(path.join(root, "index.html"), "utf8");
const write = async (relative, body) => {
  const target = path.join(root, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
};
for (const page of allPages) {
  const copy = siteCopy[page.lang];
  const shell = `<div id="root"><main class="entry-loading" aria-busy="true"><p>${copy.loading}</p><a href="#learning-guide">${copy.loadingLink}</a></main></div>`;
  const html = page.station
    ? renderTopic(page.lang, page.station)
    : renderEntryDocument(base, page.lang).replace(
        '<div id="root"></div>',
        shell,
      );
  await write(page.path.slice(1) + "index.html", html);
  await write(
    `content/${page.lang}/${page.station ?? "index"}.md`,
    markdown(page.lang, page.station),
  );
  if (!page.station) {
    await write(
      `${page.lang}/site.webmanifest`,
      JSON.stringify({
        id: `/${page.lang}/`,
        name: "NeuroLab: Interactive LLM Lab",
        short_name: "NeuroLab",
        lang: page.lang,
        start_url: `/${page.lang}/`,
        display: "browser",
        theme_color: "#10262c",
        background_color: "#10262c",
        icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
      }),
    );
    if (page.lang === "id") await write("index.html", html);
  }
}
const generated = {
  "sitemap.xml": sitemap(),
  "robots.txt": robots(),
  "llms.txt": llms(),
  "llms-full.txt": allPages
    .map((p) => markdown(p.lang, p.station))
    .join("\n\n---\n\n"),
};
for (const [file, body] of Object.entries(generated)) {
  await write(file, body);
  await fs.writeFile(path.resolve("public", file), body);
}
await write(
  "404.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page not found | NeuroLab</title><link rel="stylesheet" href="/reading.css"></head><body class="reading-page"><main class="reading-container"><h1>404: Page not found</h1><p>Halaman tidak ditemukan.</p><a href="/id/">Buka lab Bahasa Indonesia</a> · <a href="/en/">Open the English lab</a></main></body></html>`,
);
console.log(
  `Generated ${allPages.length} localized HTML pages, Markdown mirrors, sitemap, robots, and LLM guides.`,
);
