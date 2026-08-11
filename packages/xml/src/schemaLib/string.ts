import {
  OptionalSchema,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SchemaSerializeResult,
} from ".";
import type { SwXmlNode } from "../parser";
import { assertString, safeParse } from "./internal";

/**
 * A schema that parses XML text values as strings.
 */
export class StringSchema implements Schema<string> {
  kind = "attribute" as const;

  parse(value: SchemaInput, _ctx?: SchemaParseContext, _options?: SchemaParseOptions): string {
    assertString(value, "string");

    return value;
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): string {
    return this.parse(parent.attr(key), ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<string> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  serializeField(value: unknown): SchemaSerializeResult {
    if (typeof value === "string") {
      return { kind: "attribute", value: value };
    } else {
      return { kind: "failed" };
    }
  }

  optional(): OptionalSchema<string> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML text values as strings.
 */
export function string(): StringSchema {
  return new StringSchema();
}
