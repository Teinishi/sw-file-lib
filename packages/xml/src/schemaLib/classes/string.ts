import type { SwXmlNode } from "../../parser";
import { unwrapResult, validateSchemaInput } from "../internal";
import {
  OptionalSchema,
  SchemaError,
  type Result,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseFieldAttributeResult,
  type SchemaParseOptions,
  type SchemaSerializeResult,
} from "..";

/**
 * A schema that parses XML text values as strings.
 */
export class StringSchema implements Schema<string> {
  readonly name = "string";

  safeParseValue(
    input: SchemaInput,
    _ctx: SchemaParseContext,
    _options?: SchemaParseOptions,
  ): Result<string, SchemaError> {
    const r = validateSchemaInput(input, "string", this.name);
    if (!r.success) return r;
    const value = r.data;

    return {
      success: true,
      data: value,
    };
  }

  parseValue(input: SchemaInput, ctx: SchemaParseContext, options?: SchemaParseOptions): string {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldAttributeResult<string> {
    const r = this.safeParseValue(parent.attr(key), ctx, options);
    if (r.success) {
      return {
        success: true,
        data: { value: r.data, source: "attribute" },
      };
    } else {
      return r;
    }
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
