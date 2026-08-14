import type { SwXmlNode, SwXmlNodeList } from "../parser";
import type { XmlWriter, XmlWriterOptions } from "../writer/XmlWriter";
import type { ObjectSchema, OptionalSchema } from "./classes";
import type { SchemaError } from "./errors";
import type { SchemaParseContext, SchemaParseOptions } from "./parseOptions";

export type Result<T, E> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

/**
 * A path identifying an element in an XML document.
 *
 * Each segment contains the zero-based index of the element among its
 * sibling elements and the element's tag name.
 *
 * The path starts with the root element.
 *
 * @example
 * For the following XML:
 *
 * ```xml
 * <root>
 *   <a/>
 *   <b>
 *     <c/>
 *   </b>
 * </root>
 * ```
 *
 * the path to `<c>` is:
 *
 * ```ts
 * [
 *   { index: 0, tag: "root" },
 *   { index: 1, tag: "b" },
 *   { index: 0, tag: "c" },
 * ]
 * ```
 */
export type SwXmlPath = readonly { index: number; tag: string }[];

/**
 * A path identifying a value in the parsed JavaScript object.
 *
 * Each segment is either an object property name or a zero-based array index.
 * Unlike {@link SwXmlPath}, this path represents the structure of the parsed
 * value rather than the structure of the XML document.
 *
 * @example
 * For a parsed value such as:
 *
 * ```ts
 * {
 *   root: {
 *     items: [
 *       { name: "foo" },
 *       { name: "bar" },
 *     ],
 *   },
 * }
 * ```
 *
 * the path to `"bar"` is:
 *
 * ```ts
 * ["root", "items", 1, "name"]
 * ```
 */
export type SchemaPath = readonly (string | number)[];

/**
 * A value accepted by schemas.
 *
 * Top-level schemas usually receive an {@link SwXmlNode}. Primitive schemas may
 * receive an attribute string when they are used as fields in an object schema.
 */
export type SchemaInput = SwXmlNode | string | undefined;

export type SchemaParseFieldResult<T> = Result<
  { value: T; source: "attribute" | "child" },
  SchemaError
>;

export type SchemaParseFieldAttributeResult<T> = Result<
  { value: T; source: "attribute" },
  SchemaError
>;

export type SchemaParseFieldChildResult<T> = Result<{ value: T; source: "child" }, SchemaError>;

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
  readonly name: string;

  /**
   * Parses a Stormworks XML node or attribute value without throwing schema errors.
   *
   * todo: 通常これを直接使わず、ObjectSchema, ListSchema, MetaListSchema の safeParse を使うことを明記
   */
  safeParseValue: (
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ) => Result<T, SchemaError>;

  /**
   * Parses a Stormworks XML node or attribute value.
   *
   * todo: 通常これを直接使わず、ObjectSchema, ListSchema, MetaListSchema の parse を使うことを明記
   *
   * @throws {@link SchemaError} when the value does not match the schema.
   */
  parseValue: (input: SchemaInput, ctx: SchemaParseContext, options?: SchemaParseOptions) => T;

  /**
   * Parses one field from an XML record node.
   *
   * Primitive schemas read attributes. Object and list schemas read child
   * elements.
   *
   * todo: 通常これを直接使うことはないことを明記
   */
  safeParseField: (
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ) => SchemaParseFieldResult<T>;

  /**
   * todo: 通常これを直接使うことはないことを明記
   */
  serializeField(value: unknown): SchemaSerializeResult;

  /**
   * Returns a schema that accepts undefined values.
   */
  optional: () => OptionalSchema<T>;
}

export interface ElementSchema<T> extends Schema<T> {
  /**
   * Parses from XML tree with the root tag name specified without throwing schema errors.
   */
  safeParse: (
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ) => Result<T, SchemaError>;

  /**
   * Parses from XML tree with the root tag name specified.
   *
   * @throws {@link SchemaError} when the value does not match the schema.
   */
  parseTree: (
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ) => T;

  /**
   * todo: 通常これを直接使うことはないことを明記
   */
  serializeField: (value: unknown) => ElementSchemaSerializeResult;

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
