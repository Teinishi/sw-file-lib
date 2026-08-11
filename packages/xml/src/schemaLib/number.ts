import {
  OptionalSchema,
  SchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SchemaSerializeResult,
} from ".";
import type { SwXmlNode } from "../parser";
import { assertString, createSwXmlIssue, safeParse } from "./internal";

/**
 * A schema that parses XML text values as numbers.
 */
export class NumberSchema implements Schema<number> {
  kind = "attribute" as const;

  parse(value: SchemaInput, _ctx?: SchemaParseContext, options?: SchemaParseOptions): number {
    assertString(value, "number");

    const parsed = Number(value);
    if (!options?.allowNaN && Number.isNaN(parsed)) {
      throw new SchemaError([
        createSwXmlIssue("invalid_value", {
          message: `Expected a numeric string, received ${JSON.stringify(value)}.`,
          expected: "numeric_string",
          value,
        }),
      ]);
    }
    return parsed;
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): number {
    return this.parse(parent.attr(key), ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<number> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  serializeField(value: unknown): SchemaSerializeResult {
    if (typeof value === "number") {
      return { kind: "attribute", value: String(value) };
    } else {
      return { kind: "failed" };
    }
  }

  optional(): OptionalSchema<number> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML text values as numbers.
 */
export function number(): NumberSchema {
  return new NumberSchema();
}
