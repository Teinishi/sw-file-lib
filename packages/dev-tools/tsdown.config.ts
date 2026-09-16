import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "xml-schema-codegen/index": "src/xml-schema-codegen/index.ts",
    "xml-schema-codegen/cli": "src/xml-schema-codegen/cli.ts",
    "typedoc-markdown-codeblock": "src/typedoc-markdown-codeblock/index.ts",
    "vitepress-table-column-classes": "src/vitepress-table-column-classes/index.ts",
  },
});
