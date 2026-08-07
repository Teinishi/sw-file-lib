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
 * A schema that parses XML text values as strings.
 */
export class StringSchema implements Schema<string> {
  parse(value: RawXmlTreeValue | undefined, _options?: SchemaParseOptions): string {
    if (typeof value === "string") {
      return value;
    } else {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required string field is missing." : "Expected a string value.",
          expected: "string",
          received: describeRawXmlValue(value),
          value,
        }),
      ]);
    }
  }

  safeParse(
    value: RawXmlTreeValue | undefined,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<string> {
    return safeParseSchema(this, value, options);
  }

  serialize(value: string): unknown {
    return value;
  }

  optional(): Schema<string | undefined> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML text values as strings.
 */
export function string(): StringSchema {
  return new StringSchema();
}
