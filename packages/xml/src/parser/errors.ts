import type { DuplicateChildElementMode } from ".";

/**
 * Machine-readable parser error codes.
 */
export type SwXmlParseErrorCode =
  | "invalid_xml"
  | "invalid_parser_output"
  | "invalid_attribute_output"
  | "invalid_child_output";

/**
 * Machine-readable XML structure error codes.
 */
export type SwXmlStructureErrorCode =
  | "duplicate_child_element"
  | "invalid_list_shape"
  | "empty_list"
  | "unknown_node_shape";

/**
 * An error thrown when an XML document cannot be parsed into a Stormworks XML node tree.
 */
export class SwXmlParseError extends Error {
  /**
   * The kind of parser failure.
   */
  readonly code: SwXmlParseErrorCode;

  constructor(code: SwXmlParseErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SwXmlParseError";
    this.code = code;
  }
}

/**
 * Additional metadata for XML structure errors.
 */
export interface SwXmlStructureErrorDetails {
  /**
   * The tag name of the element or node list where the error occurred.
   */
  tag?: string;

  /**
   * The child tag name involved in the error.
   */
  childTag?: string;

  /**
   * How duplicate child elements were being handled.
   */
  duplicateChildElement?: DuplicateChildElementMode;

  /**
   * The child tag names that were found, when useful for diagnostics.
   */
  childTags?: string[];
}

/**
 * An error thrown when parsed XML nodes cannot be interpreted as the requested structure.
 */
export class SwXmlStructureError extends Error {
  /**
   * The kind of structure failure.
   */
  readonly code: SwXmlStructureErrorCode;

  /**
   * Details that help callers produce useful diagnostics.
   */
  readonly details: SwXmlStructureErrorDetails;

  constructor(
    code: SwXmlStructureErrorCode,
    message: string,
    details: SwXmlStructureErrorDetails = {},
  ) {
    super(message);
    this.name = "SwXmlStructureError";
    this.code = code;
    this.details = details;
  }
}
