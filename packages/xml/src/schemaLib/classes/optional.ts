import type { SwXmlNode } from "../../parser";
import { safeParse } from "../internal";
import {
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SchemaSerializeResult,
} from "..";

/**
 * A schema wrapper that accepts undefined values.
 */
export class OptionalSchema<T> {
  constructor(readonly inner: Schema<T>) {}

  parse(value: SchemaInput, ctx?: SchemaParseContext, options?: SchemaParseOptions): T | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.inner.parse(value, ctx, options);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): T | undefined {
    if (!hasField(parent, key)) {
      return undefined;
    }
    return this.inner.parseField(parent, key, ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T | undefined> {
    return safeParse(() => this.parse(value, ctx, options));
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
