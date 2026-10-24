import path from "node:path";
import { findWorkspaceRoot, loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig } from "../src/xml-schema-analyzer";
import { generateTSDoc, predefinedSchemas } from "./utils";

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_MICROCONTROLLERS_PATH"]!, "*.xml");
  const root = await findWorkspaceRoot();

  return {
    input,
    out: path.join(root, "packages", "xml", "src", "schemas", "microcontroller.ts"),
    precedingCode:
      'export * from "./generated/microcontroller-schema";\nexport * from "./generated/microcontroller-immutable";\n',
    predefinedSchemas,
    forceKind(xmlLocation) {
      const xmlPath = xmlLocation.join("/");
      if (
        /^microprocessor\/group\/(data\/(inputs|outputs)|groups|group_states|components\/c\/object(\/out\d+\/v)?)$/.test(
          xmlPath,
        ) ||
        /^microprocessor\/group\/component(_bridge)?_states\/c\d+(\/(in\d+|out\d+|inc)(\/v)?)?$/.test(
          xmlPath,
        )
      ) {
        return "object";
      } else if (
        /^microprocessor\/group\/(components\/c\/object|component(_bridge)?_states\/c\d+)\/items$/.test(
          xmlPath,
        )
      ) {
        return ["list", "i"];
      } else if (/^microprocessor\/group\/component(_bridge)?_states$/.test(xmlPath)) {
        return "record";
      }
    },
    interfaceNames: {
      "microprocessor/nodes/n": "NodeItem",
      "microprocessor/group/components/c": "Component",
      "microprocessor/group/components/c/object/in1": "In",
      "microprocessor/group/components/c/object/out1": "Out",
      "microprocessor/group/components/c/object/in1/v": "CompositeValue",
      "microprocessor/group/components/c/object/items/i": "Item",
      "microprocessor/group/components_bridge/c": "ComponentBridge",
      "microprocessor/group/components_bridge/c/object": "ObjectBridge",
    },
    attributeTypes: {
      text: "string",
    },
    schemaOverrides(xmlLocation) {
      const xmlPath = xmlLocation.join("/");
      if (
        /^microprocessor\/group\/(components\/c\/object|component_states\/c\d+)\/(e|n|v|i|kp|ki|kd|r|min|max|int)$/.test(
          xmlPath,
        )
      ) {
        return {
          properties: {
            text: { type: "string", optional: true },
            value: { type: "number", optional: true },
          },
        };
      } else if (
        /^microprocessor\/group\/(components(_bridge)?\/c\/object|component(_bridge)?_states\/c\d+)\/pos$/.test(
          xmlPath,
        )
      ) {
        return {
          properties: {
            x: { type: "number", optional: true },
            y: { type: "number", optional: true },
          },
        };
      }
    },
    mergeSchemas: {
      object: /^microprocessor\/group\/(components\/c\/object|component_states\/c\d+)$/,
      objectBridge:
        /^microprocessor\/group\/(components_bridge\/c\/object|component_bridge_states\/c\d+)$/,
      objectIn:
        /^microprocessor\/group\/(components(_bridge)?\/c\/object|component(_bridge)?_states\/c\d+)\/(in\d+|inc|inoff)$/,
      objectOut:
        /^microprocessor\/group\/(components(_bridge)?\/c\/object|component(_bridge)?_states\/c\d+)\/out\d+$/,
      compositeValue:
        /^microprocessor\/group\/(components(_bridge)?\/c\/object|component(_bridge)?_states\/c\d+)\/(in\d+|inc|inoff|out\d+)\/v$/,
      item: /^microprocessor\/group\/(components\/c\/object|component(_bridge)?_states\/c\d+)\/items\/i$/,
    },
    sortProperties: {
      "microprocessor/group/components/c/object/in1/v": true,
    },
    allPropertiesOptional: true,
    preferStringInUnions: true,
    generateTSDoc(context) {
      return generateTSDoc("Stormworks microcontroller data", context);
    },
  };
});
