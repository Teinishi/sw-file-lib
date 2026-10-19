import path from "node:path";
import { findWorkspaceRoot, loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig, type XmlLocation } from "../src/xml-schema-analyzer";
import { generateTSDoc, predefinedSchemas, xmlLocationMatches } from "./utils";

const O_LOCATION = ["vehicle", "bodies", "body", "components", "c", "o"] as const;
const MC_GROUP_LOCATION = [...O_LOCATION, "microprocessor_definition", "group"] as const;
const MC_OBJECT_LOCATION = [...MC_GROUP_LOCATION, "components", "c", "object"] as const;

const FORCE_KIND_PATTERNS = [
  [
    ["vehicle", "authors"],
    ["list", "author"],
  ],
  [[...MC_GROUP_LOCATION, "data", "inputs"], "object"],
  [[...MC_GROUP_LOCATION, "data", "outputs"], "object"],
  [[...MC_OBJECT_LOCATION], "object"],
  [[...MC_OBJECT_LOCATION, /^out\d+$/], "object"],
  [[...MC_GROUP_LOCATION, "components_bridge", "c"], "object"],
  [[...MC_GROUP_LOCATION, "components_bridge", "c", "object", /^out\d+$/], "object"],
  [[...MC_GROUP_LOCATION, "groups"], "object"],
  [[...O_LOCATION, "logic_slots", "slot", "value"], "object"],
  [[...O_LOCATION, /display_\d+/, "col_extra", "c"], "object"],
] as const;

const componentOPath = O_LOCATION.join("/");
const microprocessorGroupPath = MC_GROUP_LOCATION.join("/");

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_VEHICLES_PATH"]!, "*.xml");
  const root = await findWorkspaceRoot();

  return {
    input,
    out: path.join(root, "packages", "xml", "src", "schemas", "vehicle.ts"),
    precedingCode:
      'export * from "./generated/vehicle-schema";\nexport * from "./generated/vehicle-immutable";\n',
    predefinedSchemas,
    forceKind(xmlLocation: XmlLocation) {
      for (const [pattern, kind] of FORCE_KIND_PATTERNS) {
        if (xmlLocationMatches(xmlLocation, pattern)) {
          return kind;
        }
      }
      return undefined;
    },
    interfaceNames: {
      ["vehicle/bodies/body/components/c"]: "Component",
      [componentOPath]: "ComponentO",
      [`${componentOPath}/logic_slots/slot`]: "LogicSlot",
      [`${componentOPath}/display_1`]: "Display",
      [`${componentOPath}/microprocessor_definition/nodes/n`]: "MicroprocessorN",
      [`${componentOPath}/microprocessor_definition/nodes/n/node`]: "MicroprocessorNode",
      [`${componentOPath}/microprocessor_definition/nodes/n/node/position`]:
        "MicroprocessorNodePosition",
      [`${microprocessorGroupPath}`]: "MicroprocessorGroup",
      [`${microprocessorGroupPath}/data`]: "MicroprocessorGroupData",
      [`${microprocessorGroupPath}/components/c`]: "MicroprocessorComponent",
      [`${microprocessorGroupPath}/components/c/object`]: "MicroprocessorObject",
      [`${microprocessorGroupPath}/components/c/object/in1`]: "MicroprocessorIn",
      [`${microprocessorGroupPath}/components/c/object/items/i`]: "MicroprocessorItem",
      [`${microprocessorGroupPath}/components_bridge/c`]: "MicroprocessorComponentBridge",
      [`${microprocessorGroupPath}/components_bridge/c/object`]: "MicroprocessorObjectBridge",
    },
    schemaOverrides(xmlLocation) {
      const xmlPath = xmlLocation.join("/");
      if (
        /^vehicle\/bodies\/body\/components\/c\/o\/(impact_sensor_threshold|pid_controller_max_error)$/.test(
          xmlPath,
        )
      ) {
        return {
          properties: {
            value: { type: "number", optional: true },
          },
        };
      }
    },
    attributeTypes: {
      text: "string",
    },
    mergeSchemas: {
      mcObjectIn:
        /^vehicle\/bodies\/body\/components\/c\/o\/microprocessor_definition\/group\/components(_bridge)?\/c\/object\/(in\d+|inc|inoff)$/,
    },
    allPropertiesOptional: true,
    preferStringInUnions: true,
    generateTSDoc(context) {
      return generateTSDoc("Stormworks vehicle data", context);
    },
  };
});
