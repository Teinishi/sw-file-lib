import { OptionalSchema, type Schema, type SchemaParseOptions } from ".";
import type { RawXmlTreeValue } from "../parser";

export class NumberSchema implements Schema<number> {
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): number {
    if (typeof value !== "string") {
      throw new Error("todo: error message");
    }
    const parsed = Number(value);
    if (!options?.allowNaN && Number.isNaN(parsed)) {
      throw new Error("todo: error message");
    }
    return parsed;
  }

  serialize(value: number): unknown {
    return String(value);
  }

  optional(): Schema<number | undefined> {
    return new OptionalSchema(this);
  }
}

export function number(): NumberSchema {
  return new NumberSchema();
}
