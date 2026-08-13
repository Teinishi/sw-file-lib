import type { SwXmlNode, SwXmlStructureError } from "../parser";
import { type SchemaInput } from "./types";

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
 * Describe the expected type of the value given to schema parse function. Used for error data.
 */
export type ExpectedSchemaInputType = "xml_element" | "string";

export interface SchemaIssueBase<T extends string> {
  /**
   * The kind of schema validation failure.
   */
  code: T;

  /**
   * The path to the value that caused the issue.
   */
  path: SchemaPath;

  message: string;
}

export interface SchemaIssueMap {
  invalid_type: {
    /**
     * The expected value type.
     */
    expected: ExpectedSchemaInputType;

    /**
     * The original value that caused the issue.
     */
    value: SchemaInput;
  };

  invalid_value: {
    /**
     * The expected value.
     */
    expected: "boolean_string" | "numeric_string";

    /**
     * The original value that caused the issue.
     */
    value: string;
  };

  missing_required_field: {
    /**
     * The expected value type.
     */
    expected: ExpectedSchemaInputType;
  };

  invalid_list_item_tag: {};

  invalid_union: {
    unionErrors: readonly SchemaError[];

    /**
     * The original value that caused the issue.
     */
    value?: SchemaInput;
  };

  structure_error: {
    structureError: SwXmlStructureError;
  };

  unknown_attribute: {
    key: string;
    value: string;
  };

  unknown_child: {
    child: SwXmlNode;
  };
}

export type SchemaIssue<T extends keyof SchemaIssueMap> = SchemaIssueBase<T> & SchemaIssueMap[T];

export type AnySchemaIssue = {
  [T in keyof SchemaIssueMap]: SchemaIssue<T>;
}[keyof SchemaIssueMap];

/**
 * An error thrown when a Stormworks XML value does not match a schema.
 */
export class SchemaError extends Error {
  /**
   * The schema validation issues that caused this error.
   */
  readonly issues: AnySchemaIssue[];

  constructor(issues: readonly AnySchemaIssue[]) {
    super(formatIssues(issues));
    this.name = "SwXmlSchemaError";
    this.issues = [...issues];
  }
}

/**
 * Prepends path segments to every issue in a schema error.
 */
export function prependSchemaIssuePath(
  error: SchemaError,
  path: readonly SchemaPathSegment[],
): SchemaError {
  return new SchemaError(
    error.issues.map((issue) => ({
      ...issue,
      path: [...path, ...issue.path],
    })),
  );
}

function formatIssues(issues: readonly AnySchemaIssue[]): string {
  if (issues.length === 0) return "Stormworks XML schema validation failed.";

  const first = issues[0]!;
  const suffix = issues.length === 1 ? "" : ` (${issues.length} issues total)`;
  return `${formatSchemaPath(first.path)}: ${first.message}${suffix}`;
}

export function formatSchemaPath(path: SchemaPath): string {
  if (path.length === 0) return "<root>";

  let formatted = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      formatted += `[${segment}]`;
    } else {
      formatted += formatted.length === 0 ? segment : `.${segment}`;
    }
  }
  return formatted;
}
