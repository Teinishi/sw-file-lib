import path from "node:path";
import { loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig, type Config } from "../src/xml-schema-analyzer";
import { predefinedSchemas } from "./predefined-schemas";

const DISPLAY_TEXT_VALUE_PAIRS = ["min", "max"] as const;

const C_TEXT_VALUE_PAIRS = [
  "impact_sensor_threshold",
  "m_sweep_limit",
  "m_sweep_speed",
  "min_value",
  "max_value",
  "property_output_float_val",
  "min_threshold",
  "max_threshold",
  "pid_controller_ki",
  "pid_controller_kp",
  "pid_controller_kd",
  "pid_controller_max_error",
  "exp",
  "min_lever_value",
  "max_lever_value",
  "starting_lever_value",
  "trim_x_display",
  "trim_y_display",
  "trim_z_display",
  "trim_w_display",
] as const;

const TEXT_VALUE_PAIR_OVERRIDES = {
  properties: {
    text: { type: "string", optional: true },
    value: { type: "number", optional: true },
  },
} as const;

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_VEHICLES_PATH"]!, "*.xml");

  const schemaOverrides: Exclude<Config["schemaOverrides"], undefined> = Object.fromEntries([
    ...C_TEXT_VALUE_PAIRS.map((k) => [
      `vehicle/bodies/body/components/c/o/${k}`,
      TEXT_VALUE_PAIR_OVERRIDES,
    ]),
    ...DISPLAY_TEXT_VALUE_PAIRS.flatMap((k) =>
      [1, 2, 3, 4].map((i) => [
        `vehicle/bodies/body/components/c/o/display_${i}/${k}`,
        TEXT_VALUE_PAIR_OVERRIDES,
      ]),
    ),
  ]);

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
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group": "MicroprocessorGroup",
      "vehicle/bodies/body/components/c/o/microprocessor_definition/group/data":
        "MicroprocessorGroupData",
    },
    schemaOverrides,
  };
});
