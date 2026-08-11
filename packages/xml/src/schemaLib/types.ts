import type { DuplicateChildElementMode, SwXmlNode, SwXmlNodeList } from "../parser";
import type { XmlWriter, XmlWriterOptions } from "../writer/XmlWriter";
import type { SchemaError } from "./errors";

/**
 * A path segment in a parsed Stormworks XML value.
 *
 * String segments represent object fields. Number segments represent list item
 * indexes.
 */
export type SchemaPathSegment = string | number;

/**
 * A path to a value in a parsed Stormworks XML value.
 */
export type SchemaPath = readonly SchemaPathSegment[];

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

export type SwXmlPath = { index: number; tag: string }[];

export interface SchemaParseContext {
  /**
   * Path to current XML element from the root.
   */
  xmlPath: SwXmlPath;
}

export function newSchemaParseContext(): SchemaParseContext {
  return {
    xmlPath: [],
  };
}

/**
 * How to handle unknown attribute or element: "error" to throw an error, or just "ignore".
 */
export type UnknownFieldMode = "error" | "ignore";

export type UnknownFieldCallback = (
  ctx: SchemaParseContext,
  target:
    | { kind: "attribute"; key: string; value: string }
    | { kind: "child"; index: number; child: SwXmlNode },
) => UnknownFieldMode;

export type DuplicateChildElementCallback = (
  ctx: SchemaParseContext,
  target: string,
) => DuplicateChildElementMode;

export interface SchemaParseOptions {
  /**
   * Controls how unknown attributes or elements are handled.
   *
   * "error", "ignore" or a fucntion that returns them. The default is "error".
   */
  unknownField?: UnknownFieldMode | UnknownFieldCallback;

  /**
   * Allows numeric fields to parse to NaN when a non-numeric string is given.
   */
  allowNaN?: boolean;

  /**
   * Controls how duplicate child elements are handled where single element is expected.
   *
   * "error", "first", "last", or a fucntion that returns them. The default is "error".
   */
  duplicateChildElement?: DuplicateChildElementMode | DuplicateChildElementCallback;
}

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
  optional(): Schema<T | undefined>;
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
  serialize: (name: string, data: T, writer?: XmlWriter | XmlWriterOptions) => XmlWriter;
}

export type UnknownValue = string | null | UnknownObject | UnknownValue[];

export interface UnknownObject {
  [key: string]: UnknownValue;
}

export type Shape = Record<string, Schema<any>>;

export type PartialShape<T extends Shape> = {
  [K in keyof T]: Schema<(T[K] extends Schema<infer U> ? U : never) | undefined>;
};

export type InferShape<T extends Shape> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
};

export type Infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
