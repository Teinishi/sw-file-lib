import type { SwXmlNode } from "../parser";
import {
  safeParseSchema,
  type Schema,
  type SchemaInput,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";

/**
 * A schema wrapper that accepts undefined values.
 */
export class OptionalSchema<T> implements Schema<T | undefined> {
  constructor(private readonly inner: Schema<T>) {}

  parse(value: SchemaInput, options?: SchemaParseOptions): T | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.inner.parse(value, options);
  }

  safeParse(
    value: SchemaInput,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T | undefined> {
    return safeParseSchema(this, value, options);
  }

  parseField(parent: SwXmlNode, key: string, options?: SchemaParseOptions): T | undefined {
    if (!hasField(parent, key)) {
      return undefined;
    }
    return this.inner.parseField(parent, key, options);
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
