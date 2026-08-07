import {
  createSwXmlIssue,
  describeSchemaInput,
  OptionalSchema,
  safeParseSchema,
  SwXmlSchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import type { SwXmlNode } from "../parser";

/**
 * A schema that parses XML text values as numbers.
 */
export class NumberSchema implements Schema<number> {
  parse(value: SchemaInput, options?: SchemaParseOptions): number {
    if (typeof value !== "string") {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required number field is missing." : "Expected a string value.",
          expected: "numeric string",
          received: describeSchemaInput(value),
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

  safeParse(value: SchemaInput, options?: SchemaParseOptions): SchemaSafeParseResult<number> {
    return safeParseSchema(this, value, options);
  }

  parseField(parent: SwXmlNode, key: string, options?: SchemaParseOptions): number {
    return this.parse(parent.attr(key), options);
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
