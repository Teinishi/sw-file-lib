import { SwXmlNode } from "../../parser";
import { assertString, createSwXmlIssue, safeParse } from "../internal";
import {
  OptionalSchema,
  SchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SchemaSerializeResult,
} from "..";

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

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): boolean {
    return this.parse(parent.attr(key), ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<boolean> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  serializeField(value: unknown): SchemaSerializeResult {
    if (typeof value === "boolean") {
      return { kind: "attribute", value: value ? "true" : "false" };
    } else {
      return { kind: "failed" };
    }
  }

  optional(): OptionalSchema<boolean> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML text values as booleans.
 */
export function boolean(): BooleanSchema {
  return new BooleanSchema();
}
