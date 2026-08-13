import { SwXmlNode } from "../../parser";
import { createSwXmlIssue, unwrapResult, validateSchemaInput } from "../internal";
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
 * A schema that parses XML text values as booleans.
 */
export class BooleanSchema implements Schema<boolean> {
  readonly name = "boolean";

  safeParseValue(
    input: SchemaInput,
    _ctx: SchemaParseContext,
    _options?: SchemaParseOptions,
  ): Result<boolean, SchemaError> {
    const r = validateSchemaInput(input, "string", this.name);
    if (!r.success) return r;
    const value = r.data;

    if (value === "true") return { success: true, data: true };
    if (value === "false") return { success: true, data: false };

    return {
      success: false,
      error: new SchemaError([
        createSwXmlIssue("invalid_value", {
          message: `Expected "true" or "false", received ${JSON.stringify(value)}.`,
          expected: "boolean_string",
          value,
        }),
      ]),
    };
  }

  parseValue(input: SchemaInput, ctx: SchemaParseContext, options?: SchemaParseOptions): boolean {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldAttributeResult<boolean> {
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
