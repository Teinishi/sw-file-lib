import { OptionalSchema, type Schema, type SchemaParseOptions } from ".";
import type { RawXmlTreeValue } from "../parser";

export class StringSchema implements Schema<string> {
  parse(value: RawXmlTreeValue | undefined, _options?: SchemaParseOptions): string {
    if (typeof value === "string") {
      return value;
    } else {
      throw new Error("todo: error message");
    }
  }

  serialize(value: string): unknown {
    return value;
  }

  optional(): Schema<string | undefined> {
    return new OptionalSchema(this);
  }
}

export function string(): StringSchema {
  return new StringSchema();
}
