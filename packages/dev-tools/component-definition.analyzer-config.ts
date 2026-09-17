import path from "node:path";
import { loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig } from "./src/xml-schema-analyzer";

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_ROM_PATH"]!, "data", "definitions", "*.xml");

  return {
    input,
    outDir: "./.tmp/component-definition",
    predefinedSchemas: [
      {
        importPath: "./common",
        schemas: {
          XmlVec2: {
            kind: "object",
            properties: {
              x: { type: "number", optional: true },
              y: { type: "number", optional: true },
            },
          },
          XmlVec3: {
            kind: "object",
            properties: {
              x: { type: "number", optional: true },
              y: { type: "number", optional: true },
              z: { type: "number", optional: true },
            },
          },
          XmlRgb: {
            kind: "object",
            properties: {
              r: { type: "number", optional: true },
              g: { type: "number", optional: true },
              b: { type: "number", optional: true },
            },
          },
          XmlMat3: {
            kind: "object",
            properties: {
              "00": { type: "number", optional: true },
              "01": { type: "number", optional: true },
              "02": { type: "number", optional: true },
              "10": { type: "number", optional: true },
              "11": { type: "number", optional: true },
              "12": { type: "number", optional: true },
              "20": { type: "number", optional: true },
              "21": { type: "number", optional: true },
              "22": { type: "number", optional: true },
            },
          },
        },
      },
    ],
    forceKind: {
      definition: "object",
    },
  };
});
