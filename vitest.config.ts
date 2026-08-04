import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "./packages/core/src"),
      "@xml": path.resolve(__dirname, "./packages/xml/src"),
      "@internalUtils": path.resolve(__dirname, "./packages/internalUtils/src"),
    },
  },
});
