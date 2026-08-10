import {
  OptionalSchema,
  SchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import { SwXmlNode } from "../parser";
import { assertString, createSwXmlIssue, safeParseSchema } from "./internal";

/**
 * A schema that parses XML text values as booleans.
 */
export class BooleanSchema implements Schema<boolean> {
  parse(value: SchemaInput, _ctx?: SchemaParseContext, _options?: SchemaParseOptions): boolean {
    assertString(value, "boolean");

    if (value === "true") return true;
    if (value === "false") return false;

    throw new SchemaError([
      createSwXmlIssue("invalid_value", {
        message: `Expected "true" or "false", received ${JSON.stringify(value)}.`,
        expected: "boolean_string",
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
