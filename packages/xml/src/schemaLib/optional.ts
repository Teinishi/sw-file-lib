import type { RawXmlTreeValue } from "../parser";
import {
  safeParseSchema,
  type Schema,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";

/**
 * A schema wrapper that accepts undefined values.
 */
export class OptionalSchema<T> implements Schema<T | undefined> {
  constructor(private readonly inner: Schema<T>) {}

  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): T | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.inner.parse(value, options);
  }

  safeParse(
    value: RawXmlTreeValue | undefined,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T | undefined> {
    return safeParseSchema(this, value, options);
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
