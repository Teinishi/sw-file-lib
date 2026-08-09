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
 * A schema that parses XML text values as booleans.
 */
export class BooleanSchema implements Schema<boolean> {
  parse(value: SchemaInput, _ctx?: SchemaParseContext, _options?: SchemaParseOptions): boolean {
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
        received: describeSchemaInput(value),
        value,
      }),
    ]);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<boolean> {
    return safeParseSchema(this, value, ctx, options);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): boolean {
    return this.parse(parent.attr(key), ctx, options);
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
