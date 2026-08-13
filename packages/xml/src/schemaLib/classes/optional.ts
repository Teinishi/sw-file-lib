import {
  SchemaError,
  type Result,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSerializeResult,
} from "..";
import type { SwXmlNode } from "../../parser";
import { unwrapResult } from "../internal";

/**
 * A schema wrapper that accepts undefined values.
 */
export class OptionalSchema<T> {
  readonly name = "optional";

  constructor(readonly inner: Schema<T>) {}

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<T | undefined, SchemaError> {
    if (input === undefined) {
      return { success: true, data: undefined };
    } else {
      return this.inner.safeParseValue(input, ctx, options);
    }
  }

  parseValue(
    value: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): T | undefined {
    return unwrapResult(this.safeParseValue(value, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<
    { omitted: true } | { omitted: false; value: T; source: "attribute" | "child" },
    SchemaError
  > {
    if (!hasField(parent, key)) {
      return { success: true, data: { omitted: true } };
    }
    const r = this.inner.safeParseField(parent, key, ctx, options);
    if (!r.success) return r;
    return {
      success: true,
      data: {
        omitted: false,
        value: r.data.value,
        source: r.data.source,
      },
    };
  }

  serializeField(value: unknown): SchemaSerializeResult {
    if (value === undefined) {
      return { kind: "omitted" };
    } else {
      return this.inner.serializeField(value);
    }
  }

  optional(): OptionalSchema<T> {
    return this;
  }
}

function hasField(parent: SwXmlNode, key: string): boolean {
  return parent.attrs.has(key) || parent.nodes.some((child) => child.tag === key);
}
