import type { RawXmlTreeValue } from "../parser";

export interface SchemaParseOptions {
  omitUnknownField?: boolean;
  allowNaN?: boolean;
}

export interface Schema<T> {
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): T;
  serialize(value: T): unknown;
  optional(): Schema<T | undefined>;
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
