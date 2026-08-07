import { parseSwXml } from "../parser";
import type { ParseOptions } from "../types";
import { ComponentDefinition } from "./schema";

export * from "./ComponentDefinitionBuilder";
export * from "./schema";

/**
 * Parses a Stormworks component definition XML document.
 *
 * @throws {@link import("../schemaLib").SwXmlSchemaError} when the XML content
 * does not match the component definition schema.
 */
export function parseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
) {
  return ComponentDefinition.parse(
    parseSwXml(input).child("definition")?.asRawTreeRecord(options.noDuplicateElement),
    options,
  );
}
