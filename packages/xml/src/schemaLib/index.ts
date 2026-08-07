import type { RawXmlTreeValue } from "../parser";

export * from "./boolean";
export * from "./number";
export * from "./object";
export * from "./string";

export interface SchemaParseOptions {
  omitUnknownField?: boolean;
  allowNaN?: boolean;
}

export interface Schema<T> {
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): T;
  serialize(value: T): unknown;
  optional(): Schema<T | undefined>;
}

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

export type PartialShape<T extends Shape> = {
  [K in keyof T]: Schema<(T[K] extends Schema<infer U> ? U : never) | undefined>;
};

export type UnknownValue = string | UnknownObject | UnknownValue[];

export interface UnknownObject {
  [key: string]: UnknownValue;
}

export type Shape = Record<string, Schema<any>>;

export type InferShape<T extends Shape> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
} & { [key: string]: UnknownValue };

export type Infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
