import type { SwXmlNode, SwXmlNodeList } from "../parser";
import type { XmlWriter, XmlWriterOptions } from "../writer";
import type { ObjectSchema, OptionalSchema } from "./classes";
import type { SchemaError, SchemaSerializeError } from "./errors";
import type { SchemaParseContext, SchemaParseOptions } from "./parseOptions";

/**
 * A non-throwing operation result.
 */
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

/**
 * The result of parsing one field from an XML record node.
 */
export type SchemaParseFieldResult<T> = Result<
  { value: T; source: "attribute" | "child" },
  SchemaError
>;

/**
 * The result of parsing one attribute-backed field.
 */
export type SchemaParseFieldAttributeResult<T> = Result<
  { value: T; source: "attribute" },
  SchemaError
>;

/**
 * The result of parsing one child-element-backed field.
 */
export type SchemaParseFieldChildResult<T> = Result<{ value: T; source: "child" }, SchemaError>;

/**
 * Writes an XML element with the supplied tag name.
 */
export type WriteElementCallback = (name: string, writer: XmlWriter) => void;

/**
 * A failed schema serialization result.
 *
 * The error contains path-aware details describing where and why
 * serialization failed.
 */
export interface SchemaSerializeFailResult {
  kind: "failed";
  error: SchemaSerializeError;
}

/**
 * The result of serializing a schema that produces XML elements.
 */
export type ElementSchemaSerializeResult =
  | { kind: "element"; write: WriteElementCallback }
  | SchemaSerializeFailResult;

/**
 * The result of serializing one schema field.
 *
 * Primitive schemas produce attributes, optional schemas may omit undefined
 * fields, and element schemas produce child elements.
 */
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
   * This is a low-level operation used by schema implementations. For parsing
   * a full XML tree, prefer {@link ElementSchema.safeParse}.
   */
  safeParseValue: (
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ) => Result<T, SchemaError>;

  /**
   * Parses a Stormworks XML node or attribute value.
   *
   * This is a low-level operation used by schema implementations. For parsing
   * a full XML tree, prefer {@link ElementSchema.parse}.
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
   * This is primarily intended for schema implementations. Most callers should
   * use {@link ElementSchema.safeParse} on a top-level element schema instead.
   */
  safeParseField: (
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ) => SchemaParseFieldResult<T>;

  /**
   * Serializes one field without throwing.
   *
   * This is primarily intended for schema implementations. Most callers should
   * use {@link ElementSchema.safeSerialize} or {@link ElementSchema.serialize}
   * on a top-level element schema instead.
   */
  serializeField(value: unknown): SchemaSerializeResult;

  /**
   * Returns a schema that accepts undefined values.
   */
  optional: () => OptionalSchema<T>;
}

/**
 * A schema that can parse and serialize a complete XML element.
 */
export interface ElementSchema<T> extends Schema<T> {
  /**
   * Parses a complete XML tree without throwing schema errors.
   *
   * The root element must have the supplied tag name.
   */
  safeParse: (
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ) => Result<T, SchemaError>;

  /**
   * Parses a complete XML tree.
   *
   * The root element must have the supplied tag name.
   *
   * @throws {@link SchemaError} when the value does not match the schema.
   */
  parse: (
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ) => T;

  /**
   * Serializes an element value without throwing.
   *
   * This is primarily intended for schema implementations. Most callers should
   * use {@link safeSerialize} or {@link serialize} instead.
   */
  serializeField: (value: unknown) => ElementSchemaSerializeResult;

  /**
   * Serializes data into an XmlWriter without throwing an error.
   */
  safeSerialize: (
    data: T,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ) => Result<XmlWriter, SchemaSerializeError>;

  /**
   * Serializes data into an XmlWriter.
   *
   * @throws {@link SchemaSerializeError} when the value cannot be serialized by
   * the schema.
   */
  serialize: (data: T, rootTag: string, writer?: XmlWriter | XmlWriterOptions) => XmlWriter;
}

/**
 * A JSON-like value used for untyped XML data.
 */
export type UnknownValue = string | null | UnknownObject | UnknownValue[];

/**
 * A string-keyed object used for untyped XML data.
 */
export interface UnknownObject {
  [key: string]: UnknownValue;
}

/**
 * The field schema map used by object-like schemas.
 */
export type Shape = Record<string, Schema<any> | OptionalSchema<any>>;

/**
 * Infers the TypeScript value accepted by a schema.
 */
export type Infer<T extends Schema<any> | OptionalSchema<any>> =
  T extends OptionalSchema<infer U> ? U : T extends Schema<infer U> ? U : never;

/**
 * Keys whose fields are optional schemas.
 */
export type OptionalKeys<T extends Shape> = {
  [K in keyof T]: T[K] extends OptionalSchema<any> ? K : never;
}[keyof T];

/**
 * Keys whose fields are required schemas.
 */
export type RequiredKeys<T extends Shape> = Exclude<keyof T, OptionalKeys<T>>;

/**
 * Infers the object value produced by a schema shape.
 */
export type InferShape<T extends Shape> = {
  [K in OptionalKeys<T>]?: Infer<T[K]>;
} & {
  [K in RequiredKeys<T>]: Infer<T[K]>;
};

/**
 * Converts every field in a shape into an optional schema.
 */
export type PartialShape<T extends Shape> = {
  [K in keyof T]: T[K] extends OptionalSchema<any>
    ? T[K]
    : T[K] extends Schema<infer U>
      ? OptionalSchema<U>
      : never;
};

/**
 * The shape produced by extending one shape with another.
 */
export type ExtendShape<T extends Shape, U extends Shape> = Omit<T, keyof U> & U;

/**
 * The object schema type produced by extending an object schema.
 */
export type ExtendObjectSchema<T extends Shape, U extends Shape> = ObjectSchema<ExtendShape<T, U>>;

/**
 * Extracts the shape from an object schema.
 */
export type ObjectShape<T> = T extends ObjectSchema<infer S> ? S : never;
