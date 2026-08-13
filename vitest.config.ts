import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "./packages/core/src"),
      "@xml": path.resolve(__dirname, "./packages/xml/src"),
      "@internalUtils": path.resolve(__dirname, "./packages/internalUtils/src"),
    },
  },
});
