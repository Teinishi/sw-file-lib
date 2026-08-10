import {
  OptionalSchema,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import type { SwXmlNode } from "../parser";
import { assertString, safeParseSchema } from "./internal";

/**
 * A schema that parses XML text values as strings.
 */
export class StringSchema implements Schema<string> {
  parse(value: SchemaInput, _ctx?: SchemaParseContext, _options?: SchemaParseOptions): string {
    assertString(value, "string");

    return value;
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
