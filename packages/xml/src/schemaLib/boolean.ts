import {
  createSwXmlIssue,
  describeRawXmlValue,
  OptionalSchema,
  safeParseSchema,
  SwXmlSchemaError,
  type Schema,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import type { RawXmlTreeValue } from "../parser";

/**
 * A schema that parses XML text values as booleans.
 */
export class BooleanSchema implements Schema<boolean> {
  parse(value: RawXmlTreeValue | undefined, _options?: SchemaParseOptions): boolean {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new SwXmlSchemaError([
      createSwXmlIssue({
        code: value === undefined ? "missing_required_field" : "invalid_value",
        message:
          value === undefined
            ? "Required boolean field is missing."
            : `Expected "true" or "false", received ${JSON.stringify(value)}.`,
        expected: '"true" | "false"',
        received: describeRawXmlValue(value),
        value,
      }),
    ]);
  }

  safeParse(
    value: RawXmlTreeValue | undefined,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<boolean> {
    return safeParseSchema(this, value, options);
  }

  serialize(value: boolean): unknown {
    return value ? "true" : "false";
  }

  optional(): Schema<boolean | undefined> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML text values as booleans.
 */
export function boolean(): BooleanSchema {
  return new BooleanSchema();
}
