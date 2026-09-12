import { defineConfig } from "@sw-file-lib/dev-tools/xml-schema-codegen";

export default defineConfig({
  input: "packages/xml/src/schemas/common.ts",
  outDir: "packages/xml/src/schemas/generated",
  tsconfig: "packages/xml/tsconfig.src.json",
});
