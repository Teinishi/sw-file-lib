import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ["sw-file-lib-dev"],
    },
  },
});
