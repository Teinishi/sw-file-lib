import {
  createSwXmlIssue,
  describeSchemaInput,
  OptionalSchema,
  prependSwXmlIssuePath,
  safeParseSchema,
  SwXmlSchemaError,
  type InferShape,
  type PartialShape,
  type Schema,
  type SchemaInput,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type Shape,
  type SwXmlIssue,
} from ".";
import { SwXmlNode } from "../parser";

/**
 * A schema that parses XML record elements as JavaScript objects.
 */
export class ObjectSchema<T extends Shape> implements Schema<InferShape<T>> {
  constructor(public readonly shape: T) {}

  /**
   * Parses an XML element as a record.
   *
   * Known fields are parsed with the configured field schemas. Primitive fields
   * read attributes, while object and list fields read child elements. Unknown
   * fields are preserved unless {@link SchemaParseOptions.omitUnknownField} is
   * true.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: SchemaInput, options?: SchemaParseOptions): InferShape<T> {
    if (!(value instanceof SwXmlNode)) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required object field is missing." : "Expected an XML element.",
          expected: "XML element",
          received: describeSchemaInput(value),
          value,
        }),
      ]);
    }

    const parsed: Record<string, unknown> = {};
    const issues: SwXmlIssue[] = [];

    for (const [key, schema] of Object.entries(this.shape)) {
      try {
        const parsedValue = schema.parseField(value, key, options);
        if (parsedValue !== undefined || hasField(value, key)) {
          parsed[key] = parsedValue;
        }
      } catch (error) {
        if (error instanceof SwXmlSchemaError) {
          issues.push(...prependSwXmlIssuePath(error, [key]).issues);
          continue;
        }
        throw error;
      }
    }

    if (issues.length > 0) {
      throw new SwXmlSchemaError(issues);
    }

    if (!options?.omitUnknownField) {
      for (const [key, fieldValue] of value.attrs) {
        if (key in parsed) continue;
        parsed[key] = fieldValue;
      }

      for (const child of value.nodes) {
        if (child.tag in parsed) continue;
        parsed[child.tag] = child.asRawTree(options?.duplicateChildElement ?? "last");
      }
    }

    return parsed as InferShape<T>;
  }

  safeParse(
    value: SchemaInput,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferShape<T>> {
    return safeParseSchema(this, value, options);
  }

  parseField(parent: SwXmlNode, key: string, options?: SchemaParseOptions): InferShape<T> {
    return this.parse(parent.selectChild(key, options?.duplicateChildElement), options);
  }

  serialize(value: InferShape<T>): unknown {
    // todo: implement
    return value;
  }

  optional(): Schema<InferShape<T> | undefined> {
    return new OptionalSchema(this);
  }

  /**
   * Returns an object schema where every field is optional.
   */
  partial(): ObjectSchema<PartialShape<T>> {
    return object(
      Object.fromEntries(
        Object.entries(this.shape).map(([key, schema]) => [key, schema.optional()]),
      ) as PartialShape<T>,
    );
  }
}

/**
 * Creates a schema that parses XML record elements as JavaScript objects.
 */
export function object<T extends Shape>(shape: T): ObjectSchema<T> {
  return new ObjectSchema(shape);
}

function hasField(parent: SwXmlNode, key: string): boolean {
  return parent.attrs.has(key) || parent.nodes.some((child) => child.tag === key);
}
