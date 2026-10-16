import path from "node:path";
import { loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig } from "../src/xml-schema-analyzer";
import { predefinedSchemas } from "./predefined-schemas";

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_VEHICLES_PATH"]!, "*.xml");

  return {
    input,
    out: "./.tmp/vehicle.ts",
    predefinedSchemas,
    forceKind: {
      "vehicle/authors": "list",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/data/inputs": "object",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/data/outputs": "object",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components/c/object/out1":
        "object",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/components_bridge/c/object/out1":
        "object",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/groups": "object",
      "vehicle/bodies/body/components/c/o/logic_slots/slot/value": "object",
      "vehicle/bodies/body/components/c/o/display_1/col_extra/c": "object",
      "vehicle/bodies/body/components/c/o/display_2/col_extra/c": "object",
      "vehicle/bodies/body/components/c/o/display_3/col_extra/c": "object",
      "vehicle/bodies/body/components/c/o/display_4/col_extra/c": "object",
    },
    interfaceNames: {
      "vehicle/bodies/body/components/c": "Component",
      "vehicle/bodies/body/components/c/o": "ComponentO",
      "vehicle/bodies/body/components/c/o/logic_slots/slot": "LogicSlot",
      "vehicle/bodies/body/components/c/o/display_1": "Display",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/nodes/n": "MicroprocessorN",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/nodes/n/node":
        "MicroprocessorNode",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/nodes/n/node/position":
        "MicroprocessorNodePosition",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/groups/group":
        "MicroprocessorGroup",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/groups/group/data":
        "MicroprocessorGroupData",
    },
  };
});
