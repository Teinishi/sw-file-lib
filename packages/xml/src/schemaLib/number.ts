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
 * A schema that parses XML text values as numbers.
 */
export class NumberSchema implements Schema<number> {
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): number {
    if (typeof value !== "string") {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required number field is missing." : "Expected a string value.",
          expected: "numeric string",
          received: describeRawXmlValue(value),
          value,
        }),
      ]);
    }
    const parsed = Number(value);
    if (!options?.allowNaN && Number.isNaN(parsed)) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: "invalid_number",
          message: `Expected a numeric string, received ${JSON.stringify(value)}.`,
          expected: "numeric string",
          received: "NaN",
          value,
        }),
      ]);
    }
    return parsed;
  }

  safeParse(
    value: RawXmlTreeValue | undefined,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<number> {
    return safeParseSchema(this, value, options);
  }

  serialize(value: number): unknown {
    return String(value);
  }

  optional(): Schema<number | undefined> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML text values as numbers.
 */
export function number(): NumberSchema {
  return new NumberSchema();
}
