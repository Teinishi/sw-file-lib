import {
  SchemaError,
  type Infer,
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
 *
 * Missing fields are omitted from parsed objects, and undefined values are
 * omitted during serialization.
 */
export class OptionalSchema<T extends Schema<any>> {
  readonly name = "optional";

  constructor(readonly inner: T) {}

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<Infer<T> | undefined, SchemaError> {
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
  ): Infer<T> | undefined {
    return unwrapResult(this.safeParseValue(value, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<
    { omitted: true } | { omitted: false; value: Infer<T>; source: "attribute" | "child" },
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
