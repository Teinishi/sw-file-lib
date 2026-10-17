import path from "node:path";
import { loadWorkspaceEnv } from "@sw-file-lib/test-utils";
import { defineConfig, type XmlLocation } from "../src/xml-schema-analyzer";
import { predefinedSchemas } from "./predefined-schemas";

// forceKind 関連
const COMPONENT_O_LOCATION = ["vehicle", "bodies", "body", "components", "c", "o"] as const;
const MICROPROCESSOR_GROUP_LOCATION = [
  ...COMPONENT_O_LOCATION,
  "microprocessor_definition",
  "group",
] as const;

const FORCE_KIND_PATTERNS = [
  [["vehicle", "authors"], "list"],
  [[...MICROPROCESSOR_GROUP_LOCATION, "data", "inputs"], "object"],
  [[...MICROPROCESSOR_GROUP_LOCATION, "data", "outputs"], "object"],
  [[...MICROPROCESSOR_GROUP_LOCATION, "components", "c", "object"], "object"],
  [[...MICROPROCESSOR_GROUP_LOCATION, "components", "c", "object", /^out\d+$/], "object"],
  [[...MICROPROCESSOR_GROUP_LOCATION, "components_bridge", "c"], "object"],
  [[...MICROPROCESSOR_GROUP_LOCATION, "components_bridge", "c", "object", /^out\d+$/], "object"],
  [[...MICROPROCESSOR_GROUP_LOCATION, "groups"], "object"],
  [[...COMPONENT_O_LOCATION, "logic_slots", "slot", "value"], "object"],
  [[...COMPONENT_O_LOCATION, /display_\d+/, "col_extra", "c"], "object"],
] as const;

// interfaceNames 関連
const componentOPath = COMPONENT_O_LOCATION.join("/");
const microprocessorGroupPath = MICROPROCESSOR_GROUP_LOCATION.join("/");

const interfaceNames = Object.fromEntries([
  ["vehicle/bodies/body/components/c", "Component"],
  [componentOPath, "ComponentO"],
  [`${componentOPath}/logic_slots/slot`, "LogicSlot"],
  [`${componentOPath}/display_1`, "Display"],
  [`${componentOPath}/microprocessor_definition/nodes/n`, "MicroprocessorN"],
  [`${componentOPath}/microprocessor_definition/nodes/n/node`, "MicroprocessorNode"],
  [
    `${componentOPath}/microprocessor_definition/nodes/n/node/position`,
    "MicroprocessorNodePosition",
  ],
  [`${microprocessorGroupPath}`, "MicroprocessorGroup"],
  [`${microprocessorGroupPath}/data`, "MicroprocessorGroupData"],
  [`${microprocessorGroupPath}/components/c`, "MicroprocessorComponent"],
  [`${microprocessorGroupPath}/components/c/object`, "MicroprocessorObject"],
  [`${microprocessorGroupPath}/components/c/object/in1`, "MicroprocessorIn"],
  [`${microprocessorGroupPath}/components/c/object/items/i`, "MicroprocessorItem"],
  [`${microprocessorGroupPath}/components_bridge/c`, "MicroprocessorComponentBridge"],
  [`${microprocessorGroupPath}/components_bridge/c/object`, "MicroprocessorObjectBridge"],
  [`${microprocessorGroupPath}/components_bridge/c/object/in1`, "MicroprocessorInBridge"],
]);

// schemaOverrides 関連
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

const MICROPROCESSOR_TEXT_VALUE_PAIRS = [
  "e",
  "n",
  "v",
  "i",
  "min",
  "max",
  "int",
  "kp",
  "ki",
  "kd",
  "r",
  "items/i/v",
] as const;

const microprocessorIn = ["inc", "inoff"];
for (let i = 1; i <= 32; i++) {
  microprocessorIn.push(`in${i}`);
}

const TEXT_VALUE_PAIR_OVERRIDES = {
  properties: {
    text: { type: "string", optional: true },
    value: { type: "number", optional: true },
  },
} as const;

const MICROPROCESSOR_IN_OVERRIDES = {
  properties: {
    component_id: { type: "number", optional: true },
    disabled: { type: "boolean", optional: true },
    node_index: { type: "number", optional: true },
  },
} as const;

// ヘルパー関数
const xmlLocationMatches = (
  xmlLocation: XmlLocation,
  pattern: readonly (string | RegExp)[],
): boolean => {
  if (xmlLocation.length !== pattern.length) {
    return false;
  }
  for (let i = 0; i < xmlLocation.length; i++) {
    const xmlPart = xmlLocation[i]!;
    const patternPart = pattern[i]!;
    if (typeof patternPart === "string") {
      if (xmlPart !== patternPart) {
        return false;
      }
    } else if (patternPart instanceof RegExp) {
      if (!patternPart.test(xmlPart)) {
        return false;
      }
    } else {
      throw new Error(`Invalid pattern part: ${patternPart}`);
    }
  }
  return true;
};

export default defineConfig(async () => {
  await loadWorkspaceEnv(".env.local");
  const input = path.join(process.env["STORMWORKS_VEHICLES_PATH"]!, "*.xml");

  const disjunctionFormatter = new Intl.ListFormat("en", {
    style: "long",
    type: "disjunction",
  });

  function formatXmlLocation(xmlLocation: XmlLocation): string {
    return xmlLocation.map((tag) => `<${tag}>`).join(" / ");
  }

  return {
    input,
    out: "./.tmp/vehicle.ts",
    predefinedSchemas,
    forceKind(xmlLocation: XmlLocation) {
      for (const [pattern, kind] of FORCE_KIND_PATTERNS) {
        if (xmlLocationMatches(xmlLocation, pattern)) {
          return kind;
        }
      }
      return undefined;
    },
    interfaceNames,
    schemaOverrides: Object.fromEntries([
      ...DISPLAY_TEXT_VALUE_PAIRS.flatMap((k) =>
        [1, 2, 3, 4].map((i) => [
          `vehicle/bodies/body/components/c/o/display_${i}/${k}`,
          TEXT_VALUE_PAIR_OVERRIDES,
        ]),
      ),
      ...C_TEXT_VALUE_PAIRS.map((k) => [
        `vehicle/bodies/body/components/c/o/${k}`,
        TEXT_VALUE_PAIR_OVERRIDES,
      ]),
      ...MICROPROCESSOR_TEXT_VALUE_PAIRS.map((k) => [
        `vehicle/bodies/body/components/c/o/microprocessor_definition/group/components/c/object/${k}`,
        TEXT_VALUE_PAIR_OVERRIDES,
      ]),
      ...microprocessorIn.map((k) => [
        `vehicle/bodies/body/components/c/o/microprocessor_definition/group/components/c/object/${k}`,
        MICROPROCESSOR_IN_OVERRIDES,
      ]),
    ]),
    allPropertiesOptional: true,
    generateTSDoc({ identifier, xmlLocations: xmlPaths, parents }) {
      const tagNames = new Set(xmlPaths.map((path) => path.at(-1)!));
      let doc = `Represents ${disjunctionFormatter.format(tagNames.values().map((t) => `\`<${t}>\` element`))} in Stormworks vehicle data.`;

      if (xmlPaths.length === 1) {
        doc += `\n\nXML location: \`${formatXmlLocation(xmlPaths[0]!)}\``;
      } else {
        doc += "\n\nXML locations:\n";
        for (const xmlPath of xmlPaths) {
          doc += `- \`${formatXmlLocation(xmlPath)}\`\n`;
        }
      }

      if (parents.length === 1) {
        doc += `\n\nParent: {@link ${parents[0]!.identifier}}`;
      } else if (parents.length > 1) {
        doc += `\n\nParents: ${disjunctionFormatter.format(parents.map((p) => `{@link ${p.identifier}}`))}`;
      }

      doc += `\n\nIf your function only reads the value and does not mutate it, prefer\n{@link ${identifier}Immutable} for its parameter type.`;

      doc += `\n\n@see {@link ${identifier}Schema}\n@see {@link ${identifier}Immutable}`;

      return doc;
    },
  };
});
