import { defineConfig } from "vite";

// One page: the 3D world. Every lesson lives inside it.
export default defineConfig({
  base: "/",
  server: { host: "127.0.0.1", port: 5173 },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: { "three-core": ["three"] } } },
  },
});
