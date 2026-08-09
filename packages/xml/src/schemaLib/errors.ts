import type { StrictOmit } from "ts-essentials";
import type { SwXmlNode, SwXmlStructureError } from "../parser";
import { type SchemaInput, type SwXmlPath, type SwXmlPathSegment } from "./types";

/**
 * A machine-readable validation issue produced while parsing a schema.
 */
export type SwXmlIssue =
  | {
      /**
       * The kind of schema validation failure.
       */
      code:
        | "invalid_type"
        | "invalid_value"
        | "invalid_number"
        | "missing_required_field"
        | "invalid_list_item_tag";

      /**
       * The path to the value that caused the issue.
       */
      path: SwXmlPath;

      message: string;

      /**
       * The expected value type or shape, when applicable.
       */
      expected?: string;

      /**
       * The received value type or shape, when applicable.
       */
      received?: string;

      /**
       * The original value that caused the issue, when useful for diagnostics.
       */
      value?: unknown;
    }
  | {
      /**
       * The kind of schema validation failure.
       */
      code: "invalid_union";

      /**
       * The path to the value that caused the issue.
       */
      path: SwXmlPath;

      message: string;

      unionErrors: readonly SwXmlSchemaError[];

      /**
       * The received value type or shape, when applicable.
       */
      received?: string;

      /**
       * The original value that caused the issue, when useful for diagnostics.
       */
      value?: unknown;
    }
  | {
      code: "structure_error";

      /**
       * The path to the value that caused the issue.
       */
      path: SwXmlPath;

      message: string;

      structureError: SwXmlStructureError;
    };

/**
 * An error thrown when a Stormworks XML value does not match a schema.
 */
export class SwXmlSchemaError extends Error {
  /**
   * The schema validation issues that caused this error.
   */
  readonly issues: SwXmlIssue[];

  constructor(issues: readonly SwXmlIssue[]) {
    super(formatSwXmlIssues(issues));
    this.name = "SwXmlSchemaError";
    this.issues = [...issues];
  }
}

/**
 * Creates a schema issue.
 */
export function createSwXmlIssue(
  issue: StrictOmit<SwXmlIssue, "path"> & { path?: SwXmlPath },
): SwXmlIssue {
  return {
    ...issue,
    path: issue.path ?? [],
  };
}

/**
 * Prepends path segments to every issue in a schema error.
 */
export function prependSwXmlIssuePath(
  error: SwXmlSchemaError,
  path: readonly SwXmlPathSegment[],
): SwXmlSchemaError {
  return new SwXmlSchemaError(
    error.issues.map((issue) => ({
      ...issue,
      path: [...path, ...issue.path],
    })),
  );
}

/**
 * Returns a short type description for a schema input value.
 */
export function describeSchemaInput(value: SchemaInput): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return "string";
  if (isSwXmlNode(value)) return `<${value.tag}>`;
  return typeof value;
}

function isSwXmlNode(value: SchemaInput): value is SwXmlNode {
  return typeof value === "object" && value !== null && "tag" in value && "attrs" in value;
}

function formatSwXmlIssues(issues: readonly SwXmlIssue[]): string {
  if (issues.length === 0) return "Stormworks XML schema validation failed.";

  const first = issues[0]!;
  const suffix = issues.length === 1 ? "" : ` (${issues.length} issues total)`;
  return `${formatSwXmlPath(first.path)}: ${first.message}${suffix}`;
}

/**
 * Formats a schema path for human-readable diagnostics.
 */
export function formatSwXmlPath(path: SwXmlPath): string {
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
