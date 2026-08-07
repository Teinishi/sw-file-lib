import { parseSwXml } from "../parser";
import type { ParseOptions } from "../types";
import { ComponentDefinition } from "./schema";

export * from "./ComponentDefinitionBuilder";
export * from "./schema";

export function parseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
) {
  return ComponentDefinition.parse(
    parseSwXml(input).child("definition")?.asRawTreeRecord(options.noDuplicateElement),
    options,
  );
}
