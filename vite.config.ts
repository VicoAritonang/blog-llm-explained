import { defineConfig } from "vite";
import {
  renderEntryDocument,
  renderTopic,
  allPages,
  sitemap,
  robots,
  llms,
  markdown,
} from "./scripts/site-seo.mjs";
export default defineConfig({
  base: "/",
  plugins: [
    {
      name: "localized-learning-pages",
      transformIndexHtml(html, ctx) {
        return renderEntryDocument(
          html,
          ctx.originalUrl?.startsWith("/en") ? "en" : "id",
        );
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = new URL(
            (req as { url?: string }).url || "/",
            "http://localhost",
          ).pathname;
          const page = allPages.find((p) => p.station && p.path === pathname);
          const raw = allPages.find(
            (p) => `/content/${p.lang}/${p.station ?? "index"}.md` === pathname,
          );
          const assets: Record<string, () => string> = {
            "/robots.txt": robots,
            "/sitemap.xml": sitemap,
            "/llms.txt": llms,
            "/llms-full.txt": () =>
              allPages
                .map((p) => markdown(p.lang, p.station))
                .join("\n\n---\n\n"),
          };
          if (page) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(renderTopic(page.lang, page.station));
          } else if (raw) {
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.end(markdown(raw.lang, raw.station));
          } else if (assets[pathname]) {
            res.setHeader(
              "Content-Type",
              pathname.endsWith(".xml")
                ? "application/xml; charset=utf-8"
                : "text/plain; charset=utf-8",
            );
            res.end(assets[pathname]());
          } else next();
        });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5173 },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 850,
    rollupOptions: { output: { manualChunks: { "three-core": ["three"] } } },
  },
});
