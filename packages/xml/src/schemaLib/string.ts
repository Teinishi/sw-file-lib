import {
  createSwXmlIssue,
  describeSchemaInput,
  OptionalSchema,
  SwXmlSchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import type { SwXmlNode } from "../parser";
import { safeParseSchema } from "./internal";

/**
 * A schema that parses XML text values as strings.
 */
export class StringSchema implements Schema<string> {
  parse(value: SchemaInput, _ctx?: SchemaParseContext, _options?: SchemaParseOptions): string {
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

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<string> {
    return safeParseSchema(this, value, ctx, options);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): string {
    return this.parse(parent.attr(key), ctx, options);
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
