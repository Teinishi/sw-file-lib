import { OptionalSchema, type Schema, type SchemaParseOptions } from ".";
import { RawXmlTreeList, type RawXmlTreeValue } from "../parser";

export class ListSchema<T> implements Schema<T[]> {
  constructor(
    public readonly itemTag: string,
    public readonly itemSchema: Schema<T>,
  ) {}

  parse(value: RawXmlTreeValue | undefined, _options?: SchemaParseOptions): T[] {
    if (value === null) {
      return [];
    }

    if (!(value instanceof RawXmlTreeList)) {
      throw new Error("todo: error message");
    }

    // todo: item の parse で発生したエラーをキャッチして、インデックスとともに投げ直す
    return value.map((item) => this.itemSchema.parse(item));
  }

  serialize(value: T[]): unknown {
    // todo
    return value;
  }

  optional(): Schema<T[] | undefined> {
    return new OptionalSchema(this);
  }
}

export function list<T>(itemTag: string, itemSchema: Schema<T>): ListSchema<T> {
  return new ListSchema(itemTag, itemSchema);
}
