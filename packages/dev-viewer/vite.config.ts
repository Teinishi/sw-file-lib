import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@sw-file-lib/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
      "@sw-file-lib/three": fileURLToPath(new URL("../three/src/index.ts", import.meta.url)),
    },
  },
});
