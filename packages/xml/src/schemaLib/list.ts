import {
  createSwXmlIssue,
  describeSchemaInput,
  OptionalSchema,
  prependSwXmlIssuePath,
  safeParseSchema,
  SwXmlSchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SwXmlIssue,
} from ".";
import { SwXmlNode } from "../parser";
import { schemaSelectChild } from "./internal";

/**
 * A schema that parses XML list elements as JavaScript arrays.
 */
export class ListSchema<T> implements Schema<T[]> {
  constructor(
    public readonly itemTag: string,
    public readonly itemSchema: Schema<T>,
  ) {}

  /**
   * Parses an XML element as a list container.
   *
   * Each child element is parsed as one item. The item tag name is kept for
   * serialization metadata and future validation, but parsing is driven by the
   * surrounding schema rather than by schema-free list detection.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: SchemaInput, options?: SchemaParseOptions): T[] {
    if (!(value instanceof SwXmlNode)) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required list field is missing." : "Expected an XML element.",
          expected: "XML element",
          received: describeSchemaInput(value),
          value,
        }),
      ]);
    }

    const parsed: T[] = [];
    const issues: SwXmlIssue[] = [];

    for (const [index, item] of value.nodes.entries()) {
      try {
        parsed.push(this.itemSchema.parse(item, options));
      } catch (error) {
        if (error instanceof SwXmlSchemaError) {
          issues.push(...prependSwXmlIssuePath(error, [index]).issues);
          continue;
        }
        throw error;
      }
    }

    if (issues.length > 0) {
      throw new SwXmlSchemaError(issues);
    }

    return parsed;
  }

  safeParse(value: SchemaInput, options?: SchemaParseOptions): SchemaSafeParseResult<T[]> {
    return safeParseSchema(this, value, options);
  }

  parseField(parent: SwXmlNode, key: string, options?: SchemaParseOptions): T[] {
    return this.parse(schemaSelectChild(parent, key, options), options);
  }

  serialize(value: T[]): unknown {
    // todo: implement
    return value;
  }

  optional(): Schema<T[] | undefined> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML list elements as JavaScript arrays.
 */
export function list<T>(itemTag: string, itemSchema: Schema<T>): ListSchema<T> {
  return new ListSchema(itemTag, itemSchema);
}
