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
 * A schema that parses XML text values as strings.
 */
export class StringSchema implements Schema<string> {
  parse(value: SchemaInput, _options?: SchemaParseOptions): string {
    if (typeof value === "string") {
      return value;
    } else {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required string field is missing." : "Expected a string value.",
          expected: "string",
          received: describeSchemaInput(value),
          value,
        }),
      ]);
    }
  }

  safeParse(value: SchemaInput, options?: SchemaParseOptions): SchemaSafeParseResult<string> {
    return safeParseSchema(this, value, options);
  }

  parseField(parent: SwXmlNode, key: string, options?: SchemaParseOptions): string {
    return this.parse(parent.attr(key), options);
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
