import path from "node:path";
import { findWorkspaceRoot, loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig } from "../src/xml-schema-analyzer";
import { generateTSDoc, predefinedSchemas } from "./utils";

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_ROM_PATH"]!, "data", "definitions", "*.xml");
  const root = await findWorkspaceRoot();

  return {
    input,
    out: path.join(root, "packages", "xml", "src", "schemas", "component-definition.ts"),
    precedingCode:
      'export * from "./generated/component-definition-schema";\nexport * from "./generated/component-definition-immutable";\n',
    predefinedSchemas,
    forceKind: {
      definition: "object",
      "definition/jet_engine_connections_prev": ["list", "j"],
    },
    interfaceNames: {
      definition: "ComponentDefinition",
      "definition/jet_engine_connections_prev/j": "JetEngineConnection",
    },
    allPropertiesOptional: true,
    preferStringInUnions: true,
    generateTSDoc(context) {
      return generateTSDoc("Stormworks component definition data", context);
    },
  };
});
