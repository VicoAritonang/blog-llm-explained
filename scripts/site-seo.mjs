import { stations, operations, references } from "../src/content/lessons.ts";
import { architecture } from "../src/content/architecture.ts";
import { translate } from "../src/i18n/core.mjs";
import {
  SITE_ORIGIN,
  publisher,
  languages,
  siteCopy,
  topicPath,
  topicTitles,
  articleDate,
} from "../src/seo/content.mjs";
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const e = escapeHtml,
  absolute = (path) => SITE_ORIGIN + path;
export const allPages = languages.flatMap((lang) => [
  { lang, path: `/${lang}/`, station: null },
  ...stations.map((st) => ({
    lang,
    path: topicPath(st.id, lang),
    station: st.id,
  })),
]);
const tx = (value, lang) => translate(value, lang);
const image = absolute("/lab-overview.jpg");
/** @param {string} lang @param {string|null} [station] */
export function headForPage(lang, station = null) {
  const c = siteCopy[lang],
    st = stations.find((s) => s.id === station),
    path = station ? topicPath(station, lang) : `/${lang}/`,
    url = absolute(path);
  const title = station ? `${topicTitles[station][lang]} | NeuroLab` : c.title,
    description = station ? tx(st.description, lang) : c.description;
  const alternatives = languages
    .map(
      (other) =>
        `<link rel="alternate" hreflang="${other}" href="${absolute(station ? topicPath(station, other) : `/${other}/`)}">`,
    )
    .join("\n");
  const page = {
    "@type": station ? "Article" : "WebPage",
    "@id": url + "#page",
    url,
    inLanguage: lang,
    name: title,
    headline: title,
    description,
    isAccessibleForFree: true,
    author: { "@type": "Organization", ...publisher },
    publisher: { "@id": SITE_ORIGIN + "/#publisher" },
    isPartOf: { "@id": SITE_ORIGIN + "/#website" },
    image,
    about: [
      { "@type": "Thing", name: "Large language models" },
      { "@type": "Thing", name: "Transformer architecture" },
    ],
    ...(station
      ? {
          datePublished: articleDate,
          dateModified: articleDate,
          mainEntityOfPage: url,
        }
      : { mainEntity: { "@id": url + "#application" } }),
  };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": SITE_ORIGIN + "/#publisher",
        ...publisher,
      },
      {
        "@type": "WebSite",
        "@id": SITE_ORIGIN + "/#website",
        url: SITE_ORIGIN,
        name: "NeuroLab by Vicoworks",
        inLanguage: languages,
        publisher: { "@id": SITE_ORIGIN + "/#publisher" },
      },
      page,
      station
        ? {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: c.home,
                item: absolute(`/${lang}/`),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: tx(st.title, lang),
                item: url,
              },
            ],
          }
        : {
            "@type": ["SoftwareApplication", "LearningResource"],
            "@id": url + "#application",
            name: "NeuroLab",
            url,
            description: c.description,
            inLanguage: lang,
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web browser",
            isAccessibleForFree: true,
            learningResourceType: "Interactive simulation",
            educationalUse: "Learning through experimentation",
            browserRequirements:
              "JavaScript; WebGL for 3D; 2D fallback available",
            publisher: { "@id": SITE_ORIGIN + "/#publisher" },
            image,
            citation: references.map((r) => r.url),
          },
    ],
  };
  const verification = [
    ["google-site-verification", process.env.GOOGLE_SITE_VERIFICATION],
    ["msvalidate.01", process.env.BING_SITE_VERIFICATION],
  ]
    .filter(([, v]) => v)
    .map(([name, value]) => `<meta name="${name}" content="${e(value)}">`)
    .join("\n");
  return `<title>${e(title)}</title>\n<meta name="description" content="${e(description)}">\n<meta name="robots" content="${process.env.VERCEL_ENV === "preview" ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}">\n<link rel="canonical" href="${url}">\n${alternatives}\n<link rel="alternate" hreflang="x-default" href="${absolute(station ? topicPath(station, "id") : "/id/")}">\n<link rel="alternate" type="text/markdown" href="${absolute(station ? `/content/${lang}/${station}.md` : `/content/${lang}/index.md`)}" title="Markdown">\n<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="manifest" href="/${lang}/site.webmanifest">\n<link rel="stylesheet" href="/reading.css">\n<meta property="og:type" content="${station ? "article" : "website"}">\n<meta property="og:site_name" content="NeuroLab by Vicoworks">\n<meta property="og:title" content="${e(title)}">\n<meta property="og:description" content="${e(description)}">\n<meta property="og:url" content="${url}">\n<meta property="og:locale" content="${lang === "id" ? "id_ID" : "en_US"}">\n<meta property="og:locale:alternate" content="${lang === "id" ? "en_US" : "id_ID"}">\n<meta property="og:image" content="${image}">\n<meta property="og:image:width" content="1440">\n<meta property="og:image:height" content="1000">\n<meta property="og:image:alt" content="${lang === "id" ? "Tampilan lab LLM 3D NeuroLab dengan instrumen attention dan alat interaktif" : "NeuroLab 3D LLM lab with an attention instrument and interactive tools"}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${e(title)}">\n<meta name="twitter:description" content="${e(description)}">\n<meta name="twitter:image" content="${image}">\n${verification}\n<script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>`;
}
function languageLinks(lang, station = null) {
  return `<nav class="reading-languages" aria-label="${lang === "id" ? "Bahasa" : "Language"}">${languages.map((l) => `<a href="${station ? topicPath(station, l) : `/${l}/`}" lang="${l}" hreflang="${l}" ${l === lang ? 'aria-current="page"' : ""}>${l === "id" ? "Bahasa Indonesia" : "English"}</a>`).join("")}</nav>`;
}
function sourceLinks(lang) {
  return `<section><h2>${e(siteCopy[lang].sources)}</h2><ul>${references.map((r) => `<li><a href="${r.url}" rel="noreferrer">${e(tx(r.title, lang))}</a><p>${e(tx(r.note, lang))}</p></li>`).join("")}</ul></section>`;
}
function footer(lang) {
  return `<footer class="reading-footer"><p>${e(siteCopy[lang].by)} <a href="${publisher.url}" rel="author">${publisher.name}</a>. <a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">Sitemap</a></p></footer>`;
}
export function guideMarkup(lang) {
  const c = siteCopy[lang];
  return `<section id="learning-guide" class="reading-guide" aria-labelledby="guide-title"><div class="reading-container">${languageLinks(lang)}<p class="reading-eyebrow">NEUROLAB / VICOWORKS</p><h1 id="guide-title">${e(c.heading)}</h1><p class="reading-lead">${e(c.intro)}</p><a class="reading-cta" href="#root">${e(c.back)} ↑</a><section><h2>${e(c.topics)}</h2><ol class="reading-topics">${stations.map((st) => `<li><a href="${topicPath(st.id, lang)}">${e(topicTitles[st.id][lang])}</a><p>${e(tx(st.description, lang))}</p></li>`).join("")}</ol></section><section><h2>${e(c.steps)}</h2><p>${e(c.controls)}</p><p>${e(c.tools)}</p><p>${e(c.reading)}</p></section><section><h2>${e(c.limitsTitle)}</h2><p>${e(c.limits)}</p></section><section><h2>${e(c.faq)}</h2>${c.faqItems.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</section>${sourceLinks(lang)}${footer(lang)}</div></section>`;
}
export function renderEntryDocument(html, lang = "id") {
  return html
    .replace(/<html lang="[^"]*"/, '<html lang="' + lang + '"')
    .replace(
      /<!--seo:start-->[\s\S]*?<!--seo:end-->/,
      `<!--seo:start-->${headForPage(lang)}<!--seo:end-->`,
    )
    .replace(
      /<!--guide:start-->[\s\S]*?<!--guide:end-->/,
      `<!--guide:start-->${guideMarkup(lang)}<!--guide:end-->`,
    )
    .replace(
      /<!--noscript:start-->[\s\S]*?<!--noscript:end-->/,
      `<!--noscript:start--><noscript><style>#root{display:none}</style><p class="reading-noscript">${e(siteCopy[lang].reading)}</p></noscript><!--noscript:end-->`,
    );
}
export function renderTopic(lang, id) {
  const c = siteCopy[lang],
    st = stations.find((s) => s.id === id),
    a = architecture[id];
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#10262c">${headForPage(lang, id)}<link rel="preload" href="/fonts/source-sans-3-latin.woff2" as="font" type="font/woff2" crossorigin></head><body class="reading-page"><main class="reading-container">${languageLinks(lang, id)}<nav class="reading-breadcrumb" aria-label="Breadcrumb"><a href="/${lang}/#learning-guide">${e(c.learn)}</a> / ${e(tx(st.title, lang))}</nav><article><p class="reading-eyebrow">NEUROLAB / ${e(c.by)} VICOWORKS · ${articleDate}</p><h1>${e(topicTitles[id][lang])}</h1><p class="reading-lead">${e(tx(st.description, lang))}</p><a class="reading-cta" href="/${lang}/#station=${id}">${e(c.try)} →</a><section><h2>${e(c.mechanism)}</h2><p>${e(tx(a.story, lang))}</p><ol class="reading-operations">${operations[id].map((op) => `<li><h3>${e(tx(op.name, lang))}</h3><p>${e(tx(op.note, lang))}</p></li>`).join("")}</ol></section><section><h2>${e(c.observe)}</h2><p>${e(tx(a.watch, lang))}</p><p>${e(c.tools)}</p></section><section><h2>${e(c.takeaway)}</h2><p>${e(c.limits)}</p></section>${sourceLinks(lang)}</article><nav class="reading-related" aria-label="${e(c.more)}"><h2>${e(c.more)}</h2><ul>${stations
    .filter((s) => s.id !== id)
    .map(
      (s) =>
        `<li><a href="${topicPath(s.id, lang)}">${e(tx(s.title, lang))}</a></li>`,
    )
    .join("")}</ul></nav>${footer(lang)}</main></body></html>`;
}
/** @param {string} lang @param {string|null} [id] */
export function markdown(lang, id = null) {
  const c = siteCopy[lang];
  if (!id)
    return `# ${c.heading}\n\n${c.intro}\n\nCanonical: ${absolute(`/${lang}/`)}\n\n## ${c.topics}\n${stations.map((st) => `- [${tx(st.title, lang)}](${absolute(topicPath(st.id, lang))}): ${tx(st.description, lang)}`).join("\n")}\n\n## ${c.steps}\n${c.controls}\n\n${c.tools}\n\n## ${c.limitsTitle}\n${c.limits}\n\n## ${c.faq}\n${c.faqItems.map(([q, a]) => `### ${q}\n${a}`).join("\n\n")}\n`;
  const st = stations.find((s) => s.id === id),
    a = architecture[id];
  return `# ${topicTitles[id][lang]}\n\nCanonical: ${absolute(topicPath(id, lang))}\nLanguage: ${lang}\nPublisher: Vicoworks (${publisher.url})\nUpdated: ${articleDate}\n\n${tx(st.description, lang)}\n\n${tx(a.story, lang)}\n\n## ${c.mechanism}\n${operations[id].map((op) => `### ${tx(op.name, lang)}\n${tx(op.note, lang)}`).join("\n\n")}\n\n## ${c.observe}\n${tx(a.watch, lang)}\n\n## ${c.limitsTitle}\n${c.limits}\n\n## ${c.sources}\n${references.map((r) => `- [${tx(r.title, lang)}](${r.url})`).join("\n")}\n`;
}
export function sitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${allPages.map((p) => `<url><loc>${absolute(p.path)}</loc><lastmod>${articleDate}</lastmod>${languages.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absolute(p.station ? topicPath(p.station, l) : `/${l}/`)}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(p.station ? topicPath(p.station, "id") : "/id/")}"/></url>`).join("\n")}</urlset>\n`;
}
export function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
export function llms() {
  return `# NeuroLab by Vicoworks\n\n> A free interactive 3D laboratory for learning how large language models work, available in Indonesian and English.\n\nCanonical origin: ${SITE_ORIGIN}. Publisher: [Vicoworks](${publisher.url}). All simulations run client-side. Five tools and six missions explore tokenization, embeddings, attention, residuals, sampling, and KV caching. Reference scale is GPT-3 175B; inspectable numbers use a deterministic two-block toy model, not GPT-3 weights. Full educational text is also available as HTML and Markdown.\n\n## Start here\n- [Indonesian interactive LLM lab](${SITE_ORIGIN}/id/): Belajar LLM secara interaktif.\n- [English interactive LLM lab](${SITE_ORIGIN}/en/): Learn LLMs interactively.\n- [Full bilingual text](${SITE_ORIGIN}/llms-full.txt): Complete educational guide and topic explanations.\n\n## English lessons\n${stations.map((s) => `- [${topicTitles[s.id].en}](${absolute(topicPath(s.id, "en"))}): Markdown at ${SITE_ORIGIN}/content/en/${s.id}.md`).join("\n")}\n\n## Pelajaran Bahasa Indonesia\n${stations.map((s) => `- [${topicTitles[s.id].id}](${absolute(topicPath(s.id, "id"))}): Markdown at ${SITE_ORIGIN}/content/id/${s.id}.md`).join("\n")}\n\n## Primary references\n${references.map((r) => `- [${r.title}](${r.url})`).join("\n")}\n`;
}
