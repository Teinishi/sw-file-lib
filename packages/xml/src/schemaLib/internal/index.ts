import {
  SwXmlSchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from "..";

/**
 * Parses with a schema and returns a discriminated result instead of throwing.
 */
export function safeParseSchema<T>(
  schema: Pick<Schema<T>, "parse">,
  value: SchemaInput,
  ctx?: SchemaParseContext,
  options?: SchemaParseOptions,
): SchemaSafeParseResult<T> {
  try {
    return { success: true, data: schema.parse(value, ctx, options) };
  } catch (error) {
    if (error instanceof SwXmlSchemaError) {
      return { success: false, error };
    }
    throw error;
  }
}
