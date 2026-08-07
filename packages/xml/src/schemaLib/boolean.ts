import { OptionalSchema, type Schema, type SchemaParseOptions } from ".";
import type { RawXmlTreeValue } from "../parser";

export class BooleanSchema implements Schema<boolean> {
  parse(value: RawXmlTreeValue | undefined, _options?: SchemaParseOptions): boolean {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error("todo: error message");
  }

  serialize(value: boolean): unknown {
    return value ? "true" : "false";
  }

  optional(): Schema<boolean | undefined> {
    return new OptionalSchema(this);
  }
}

export function boolean(): BooleanSchema {
  return new BooleanSchema();
}
