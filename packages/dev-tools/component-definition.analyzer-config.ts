import path from "node:path";
import { loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig } from "./src/xml-schema-analyzer";

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_ROM_PATH"]!, "data", "definitions", "*.xml");

  return {
    input,
    outDir: "./.tmp/component-definition",
    forceKind: {
      definition: "object",
    },
  };
});
