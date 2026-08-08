import { parseSwXml } from "../parser";
import type { SchemaSafeParseResult } from "../schemaLib";
import type { ParseOptions } from "../types";
import { ComponentDefinitionSchema, type ComponentDefinition } from "../schemas";

export * from "./ComponentDefinitionBuilder";

/**
 * Parses a Stormworks component definition XML document.
 *
 * @throws {@link import("../schemaLib").SwXmlSchemaError} when the XML content
 * does not match the component definition schema.
 */
export function parseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): ComponentDefinition {
  const tree = parseSwXml(input);
  const definition = tree.selectChild("definition", options.duplicateChildElement);
  return ComponentDefinitionSchema.parse(definition, options);
}

/**
 * Parses a Stormworks component definition XML document without throwing schema errors.
 */
export function safeParseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): SchemaSafeParseResult<ComponentDefinition> {
  const tree = parseSwXml(input);
  const definition = tree.selectChild("definition", options.duplicateChildElement);
  return ComponentDefinitionSchema.safeParse(definition, options);
}
