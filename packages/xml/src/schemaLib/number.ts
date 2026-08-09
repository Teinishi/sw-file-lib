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
 * A schema that parses XML text values as numbers.
 */
export class NumberSchema implements Schema<number> {
  parse(value: SchemaInput, _ctx?: SchemaParseContext, options?: SchemaParseOptions): number {
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

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<number> {
    return safeParseSchema(this, value, ctx, options);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): number {
    return this.parse(parent.attr(key), ctx, options);
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
