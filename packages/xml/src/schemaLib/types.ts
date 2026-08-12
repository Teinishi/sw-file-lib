import type { ObjectSchema, OptionalSchema } from "./classes";
import type { SwXmlNode, SwXmlNodeList } from "../parser";
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
export type SwXmlPath = { index: number; tag: string }[];

/**
 * Context information provided to schema parsing callbacks.
 */
export interface SchemaParseContext {
  /**
   * The path to the XML element where the issue was detected.
   *
   * The path identifies the element currently being parsed, rather than
   * the specific attribute or child element that caused the issue.
   */
  xmlPath: SwXmlPath;

  // todo: node, tree, schemaPath, schema の追加検討
}

export function newSchemaParseContext(): SchemaParseContext {
  return {
    xmlPath: [],
  };
}

/**
 * Determines how an unknown attribute or child element is handled.
 *
 * - `"error"`: Stop parsing and report an error.
 * - `"ignore"`: Ignore the unknown field and continue parsing.
 */
export type UnknownFieldMode = "error" | "ignore";

/**
 * Callback invoked when an attribute or child element is not defined
 * by the current schema.
 *
 * The callback can inspect the location and contents of the unknown field
 * and decide whether parsing should fail or continue.
 */
export type UnknownFieldCallback = (
  ctx: SchemaParseContext,
  target:
    | {
        /** An unknown attribute. */
        kind: "attribute";
        /** The attribute name. */
        key: string;
        /** The raw attribute value. */
        value: string;
      }
    | {
        /** An unknown child element. */
        kind: "child";
        /** The zero-based index of the child among its siblings. */
        index: number;
        /** The unknown child element. */
        child: SwXmlNode;
      },
) => UnknownFieldMode;

/**
 * Determines how a duplicate child element is handled when the schema
 * expects at most one element with a given tag.
 *
 * - `"error"`: Stop parsing and report an error.
 * - `"first"`: Use the first occurrence and ignore subsequent occurrences.
 * - `"last"`: Use the last occurrence and ignore previous occurrences.
 */
export type DuplicateChildElementMode = "error" | "last" | "first";

/**
 * Callback invoked when multiple child elements are found for a schema
 * field that expects a unique child element.
 *
 * The callback can inspect the location of the duplicate elements and
 * decide which occurrence should be used, or whether parsing should fail.
 *
 * @param ctx The location of the element containing the duplicate children.
 * @param target The tag name of the duplicated child element.
 */
export type DuplicateChildElementCallback = (
  ctx: SchemaParseContext,
  target: string,
) => DuplicateChildElementMode;
// todo: ^候補リストを渡すことも検討

/**
 * Options controlling the behavior of schema parsing when the XML does
 * not exactly match the schema.
 *
 * Unless otherwise specified, parsing errors are reported rather than
 * silently ignored.
 */
export interface SchemaParseOptions {
  /**
   * Determines how attributes and child elements that are not defined
   * by the schema are handled.
   *
   * A callback can be provided to make the decision based on the location
   * and contents of each unknown field.
   *
   * @default "error"
   */
  unknownField?: UnknownFieldMode | UnknownFieldCallback;

  /**
   * Determines whether a value that cannot be interpreted as a number
   * is allowed to produce `NaN` when parsing a `number` schema.
   *
   * By default, such values cause a parsing error. Set this to `true`
   * to allow `NaN` to be returned.
   *
   * @default false
   *
   * @example
   * ```ts
   * const schema = x.object({
   *   value: x.number(),
   * });
   *
   * schema.parseTree(
   *   '<root value="not-a-number"/>',
   *   "root",
   *   { allowNaN: true },
   * );
   * // { value: NaN }
   * ```
   */
  allowNaN?: boolean;

  /**
   * Determines how duplicate child elements are handled when the schema
   * expects a unique child element.
   *
   * A callback can be provided to make the decision based on the location
   * of each duplicate child element.
   *
   * @default "error"
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
