import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "xml-schema-codegen/index": "src/xml-schema-codegen/index.ts",
    "xml-schema-codegen/cli": "src/xml-schema-codegen/cli.ts",
  },
});
