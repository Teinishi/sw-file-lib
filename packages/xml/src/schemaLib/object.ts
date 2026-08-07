import { isRecord } from "@core";
import {
  createSwXmlIssue,
  describeRawXmlValue,
  OptionalSchema,
  prependSwXmlIssuePath,
  safeParseSchema,
  SwXmlSchemaError,
  type InferShape,
  type PartialShape,
  type Schema,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type Shape,
  type SwXmlIssue,
} from ".";
import { RawXmlTreeList, type RawXmlTreeValue } from "../parser";

/**
 * A schema that parses XML records as JavaScript objects.
 */
export class ObjectSchema<T extends Shape> implements Schema<InferShape<T>> {
  constructor(public readonly shape: T) {}

  /**
   * Parses a raw XML record.
   *
   * Known fields are parsed with the configured field schemas. Unknown fields
   * are preserved unless {@link SchemaParseOptions.omitUnknownField} is true.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): InferShape<T> {
    if (value === null) {
      value = {};
    }

    if (!isRecord(value) || value instanceof RawXmlTreeList) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: value === undefined ? "missing_required_field" : "invalid_type",
          message:
            value === undefined ? "Required object field is missing." : "Expected an object value.",
          expected: "record",
          received: describeRawXmlValue(value),
          value,
        }),
      ]);
    }

    const parsed: Record<string, unknown> = {};
    const issues: SwXmlIssue[] = [];

    for (const [key, schema] of Object.entries(this.shape)) {
      try {
        const parsedValue = schema.parse(value[key], options);
        if (parsedValue !== undefined || key in value) {
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
      for (const [key, fieldValue] of Object.entries(value)) {
        if (key in parsed) continue;
        parsed[key] = fieldValue;
      }
    }

    return parsed as InferShape<T>;
  }

  safeParse(
    value: RawXmlTreeValue | undefined,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferShape<T>> {
    return safeParseSchema(this, value, options);
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
 * Creates a schema that parses XML records as JavaScript objects.
 */
export function object<T extends Shape>(shape: T): ObjectSchema<T> {
  return new ObjectSchema(shape);
}
