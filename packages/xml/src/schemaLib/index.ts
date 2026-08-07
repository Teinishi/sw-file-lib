import { SwXmlSchemaError } from "./errors";
import { number } from "./number";
import { object } from "./object";
import type { Schema, SchemaInput, SchemaParseOptions, SchemaSafeParseResult } from "./types";

export * from "./types";
export * from "./errors";
export * from "./optional";
export * from "./boolean";
export * from "./number";
export * from "./string";
export * from "./object";
export * from "./list";

/**
 * Parses with a schema and returns a discriminated result instead of throwing.
 */
export function safeParseSchema<T>(
  schema: Pick<Schema<T>, "parse">,
  value: SchemaInput,
  options?: SchemaParseOptions,
): SchemaSafeParseResult<T> {
  try {
    return { success: true, data: schema.parse(value, options) };
  } catch (error) {
    if (error instanceof SwXmlSchemaError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Creates a schema for Stormworks 3D vector records with optional x, y, and z fields.
 */
export function vec3() {
  return object({
    x: number(),
    y: number(),
    z: number(),
  }).partial();
}
