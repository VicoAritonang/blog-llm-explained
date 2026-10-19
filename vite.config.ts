import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 5173 },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 850,
    rollupOptions: { output: { manualChunks: { "three-core": ["three"] } } },
  },
});
