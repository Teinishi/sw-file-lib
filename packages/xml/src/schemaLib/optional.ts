import type { SwXmlNode } from "../parser";
import {
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import { safeParse } from "./internal";

/**
 * A schema wrapper that accepts undefined values.
 */
export class OptionalSchema<T> implements Schema<T | undefined> {
  constructor(private readonly inner: Schema<T>) {}

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

  serialize(value: T | undefined): unknown {
    if (value === undefined) {
      return undefined;
    }
    return this.inner.serialize(value);
  }

  optional(): Schema<T | undefined> {
    return this;
  }
}

function hasField(parent: SwXmlNode, key: string): boolean {
  return parent.attrs.has(key) || parent.nodes.some((child) => child.tag === key);
}
