import type { SwXmlNode, SwXmlNodeList } from "../parser";

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
 * Context information provided to schema parsing callbacks.
 */
export interface SchemaParseContext {
  /**
   * The path to the XML element where the issue was detected.
   *
   * The path identifies the element currently being parsed, rather than
   * the specific attribute or child element that caused the issue.
   */
  readonly xmlPath: SwXmlPath;

  readonly root: SwXmlNodeList;

  readonly node: SwXmlNode | undefined;

  // todo: node, tree, schemaPath, schema の追加検討
}

export function newSchemaParseContext(root: SwXmlNodeList): SchemaParseContext {
  return {
    xmlPath: [],
    root,
    node: undefined,
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
