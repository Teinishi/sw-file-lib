import type { RawXmlTreeValue } from "../parser";
import type { Schema } from ".";

export class OptionalSchema<T> implements Schema<T | undefined> {
  constructor(private readonly inner: Schema<T>) {}

  parse(value: RawXmlTreeValue | undefined): T | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.inner.parse(value);
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
