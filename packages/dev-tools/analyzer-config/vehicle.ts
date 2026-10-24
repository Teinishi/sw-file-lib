import path from "node:path";
import { findWorkspaceRoot, loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig, type XmlLocation } from "../src/xml-schema-analyzer";
import { generateTSDoc, predefinedSchemas } from "./utils";

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
      const xmlPath = xmlLocation.join("/");
      if (xmlPath === "vehicle/authors") {
        return ["list", "author"];
      } else if (
        /^vehicle\/bodies\/body\/components\/c\/o\/microprocessor_definition\/group(\/(data\/(inputs|outputs)|components(_bridge)?\/c\/object(\/out\d+)?|groups))?$/.test(
          xmlPath,
        ) ||
        /^vehicle\/bodies\/body\/components\/c\/o\/(logic_slots\/slot\/value|display_\d+\/col_extra\/c)$/.test(
          xmlPath,
        )
      ) {
        return "object";
      }
    },
    interfaceNames: {
      "vehicle/bodies/body/components/c": "Component",
      "vehicle/bodies/body/components/c/o": "ComponentO",
      "vehicle/bodies/body/components/c/o/logic_slots/slot": "LogicSlot",
      "vehicle/bodies/body/components/c/o/display_1": "Display",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/nodes/n":
        "MicroprocessorNodeItem",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/nodes/n/node":
        "MicroprocessorNode",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/nodes/n/node/position":
        "MicroprocessorNodePosition",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group": "MicroprocessorGroup",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/data":
        "MicroprocessorGroupData",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components/c":
        "MicroprocessorComponent",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components/c/object":
        "MicroprocessorObject",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components/c/object/in1":
        "MicroprocessorIn",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components/c/object/items/i":
        "MicroprocessorItem",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components_bridge/c":
        "MicroprocessorComponentBridge",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components_bridge/c/object":
        "MicroprocessorObjectBridge",
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
