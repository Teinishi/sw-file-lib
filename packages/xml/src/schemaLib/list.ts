import {
  createSwXmlIssue,
  describeRawXmlValue,
  OptionalSchema,
  prependSwXmlIssuePath,
  safeParseSchema,
  SwXmlSchemaError,
  type Schema,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SwXmlIssue,
} from ".";
import { RawXmlTreeList, type RawXmlTreeValue } from "../parser";

/**
 * A schema that parses XML lists as JavaScript arrays.
 */
export class ListSchema<T> implements Schema<T[]> {
  constructor(
    public readonly itemTag: string,
    public readonly itemSchema: Schema<T>,
  ) {}

  /**
   * Parses a raw XML list.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): T[] {
    if (value === null) {
      return [];
    }

    if (!(value instanceof RawXmlTreeList)) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required list field is missing." : "Expected a list value.",
          expected: "list",
          received: describeRawXmlValue(value),
          value,
        }),
      ]);
    }

    const parsed: T[] = [];
    const issues: SwXmlIssue[] = [];

    for (const [index, item] of value.items.entries()) {
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

  safeParse(
    value: RawXmlTreeValue | undefined,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T[]> {
    return safeParseSchema(this, value, options);
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
 * Creates a schema that parses XML lists as JavaScript arrays.
 */
export function list<T>(itemTag: string, itemSchema: Schema<T>): ListSchema<T> {
  return new ListSchema(itemTag, itemSchema);
}
