import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@sw-file-lib/core": path.resolve(import.meta.dirname, "../core/src/index.ts"),
      "@sw-file-lib/three": path.resolve(import.meta.dirname, "../three/src/index.ts"),
    },
  },
});
