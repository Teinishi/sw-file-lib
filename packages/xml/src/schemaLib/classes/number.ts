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
import type { SwXmlNode } from "../../parser";
import { createSwXmlIssue, unwrapResult, validateSchemaInput } from "../internal";

/**
 * A schema that parses XML text values as numbers.
 */
export class NumberSchema implements Schema<number> {
  readonly name = "number";

  safeParseValue(
    input: SchemaInput,
    _ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<number, SchemaError> {
    const r = validateSchemaInput(input, "string", this.name);
    if (!r.success) return r;
    const value = r.data;

    const parsed = Number(value);

    if (!options?.allowNaN && Number.isNaN(parsed)) {
      return {
        success: false,
        error: new SchemaError([
          createSwXmlIssue("invalid_value", {
            message: `Expected a numeric string, received ${JSON.stringify(value)}.`,
            expected: "numeric_string",
            value,
          }),
        ]),
      };
    }

    return { success: true, data: parsed };
  }

  parseValue(input: SchemaInput, ctx: SchemaParseContext, options?: SchemaParseOptions): number {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldAttributeResult<number> {
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
