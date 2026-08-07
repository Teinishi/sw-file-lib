import { isRecord } from "@core";
import {
  OptionalSchema,
  type InferShape,
  type PartialShape,
  type Schema,
  type SchemaParseOptions,
  type Shape,
} from ".";
import type { RawXmlTreeValue } from "../parser";

export class ObjectSchema<T extends Shape> implements Schema<InferShape<T>> {
  constructor(public readonly shape: T) {}

  // 定義済みのキーは型付き、未知のキーはそのまま残してパース
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): InferShape<T> {
    if (value === null) {
      value = {};
    }

    if (!isRecord(value)) {
      throw new Error("todo: error message");
    }

    // shape で定義済みのキーをパース
    const parsed = Object.fromEntries(
      // todo: フィールドの parse 時のエラーをキャッチして、フィールド名とともに投げ直す
      Object.entries(this.shape)
        .filter(([k, _]) => k in value)
        .map(([k, s]) => [k, s.parse(value[k], options)]),
    );

    if (!options?.omitUnknownField) {
      // 未知のキーはそのまま
      for (const [k, v] of Object.entries(value)) {
        if (k in parsed) continue;
        parsed[k] = v;
      }
    }

    return parsed as InferShape<T>;
  }

  serialize(value: InferShape<T>): unknown {
    // todo: 実装
    return value;
  }

  optional(): Schema<InferShape<T> | undefined> {
    return new OptionalSchema(this);
  }

  partial(): ObjectSchema<PartialShape<T>> {
    return object(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, s]) => [k, s.optional()]),
      ) as PartialShape<T>,
    );
  }
}

export function object<T extends Shape>(shape: T): ObjectSchema<T> {
  return new ObjectSchema(shape);
}
