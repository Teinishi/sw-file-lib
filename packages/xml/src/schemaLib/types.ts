import type { ObjectSchema, OptionalSchema } from "./classes";
import type { SwXmlNode, SwXmlNodeList } from "../parser";
import type { XmlWriter, XmlWriterOptions } from "../writer/XmlWriter";
import type { SchemaError } from "./errors";
import type { SchemaParseContext, SchemaParseOptions } from "./parseOptions";

/**
 * A value accepted by schemas.
 *
 * Top-level schemas usually receive an {@link SwXmlNode}. Primitive schemas may
 * receive an attribute string when they are used as fields in an object schema.
 */
export type SchemaInput = SwXmlNode | string | undefined;

export type SchemaSafeParseResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: SchemaError;
    };

export type WriteElementCallback = (name: string, writer: XmlWriter) => void;

export interface SchemaSerializeFailResult {
  kind: "failed";
}

export type ElementSchemaSerializeResult =
  | { kind: "element"; write: WriteElementCallback }
  | SchemaSerializeFailResult;

export type SchemaSerializeResult =
  | { kind: "attribute"; value: string }
  | { kind: "omitted" }
  | ElementSchemaSerializeResult;

/**
 * A schema that parses a Stormworks XML node into a typed value.
 */
export interface Schema<T> {
  /**
   * Parses a Stormworks XML node or attribute value.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: SchemaInput, ctx?: SchemaParseContext, options?: SchemaParseOptions): T;

  /**
   * Parses one field from an XML record node.
   *
   * Primitive schemas read attributes. Object and list schemas read child
   * elements.
   */
  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): T;

  /**
   * Parses a Stormworks XML node or attribute value without throwing schema errors.
   */
  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T>;

  serializeField(value: unknown): SchemaSerializeResult;

  /**
   * Returns a schema that accepts undefined values.
   */
  optional: () => OptionalSchema<T>;
}

export interface ElementSchema<T> extends Schema<T> {
  /**
   * Parses from XML tree with the root tag name specified.
   */
  parseTree: (
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ) => T;

  /**
   * Parses from XML tree with the root tag name specified without throwing schema errors.
   */
  safeParseTree(
    tree: SwXmlNodeList,
    rootTag: string,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T>;

  serializeField(value: unknown): ElementSchemaSerializeResult;

  /**
   * Serializes data into an XmlWriter.
   */
  serialize: (data: T, rootTag: string, writer?: XmlWriter | XmlWriterOptions) => XmlWriter;
}

export type UnknownValue = string | null | UnknownObject | UnknownValue[];

export interface UnknownObject {
  [key: string]: UnknownValue;
}

export type Shape = Record<string, Schema<any> | OptionalSchema<any>>;

export type Infer<T extends Schema<any> | OptionalSchema<any>> =
  T extends OptionalSchema<infer U> ? U : T extends Schema<infer U> ? U : never;

export type OptionalKeys<T extends Shape> = {
  [K in keyof T]: T[K] extends OptionalSchema<any> ? K : never;
}[keyof T];

export type RequiredKeys<T extends Shape> = Exclude<keyof T, OptionalKeys<T>>;

export type InferShape<T extends Shape> = {
  [K in OptionalKeys<T>]?: Infer<T[K]>;
} & {
  [K in RequiredKeys<T>]: Infer<T[K]>;
};

export type PartialShape<T extends Shape> = {
  [K in keyof T]: T[K] extends OptionalSchema<any>
    ? T[K]
    : T[K] extends Schema<infer U>
      ? OptionalSchema<U>
      : never;
};

export type ExtendShape<T extends Shape, U extends Shape> = Omit<T, keyof U> & U;

export type ExtendObjectSchema<T extends Shape, U extends Shape> = ObjectSchema<ExtendShape<T, U>>;

export type ObjectShape<T> = T extends ObjectSchema<infer S> ? S : never;
