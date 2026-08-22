import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/math/index.ts", "src/color/index.ts"],
});
