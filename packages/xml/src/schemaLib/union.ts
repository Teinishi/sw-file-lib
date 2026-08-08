import {
  createSwXmlIssue,
  describeSchemaInput,
  OptionalSchema,
  safeParseSchema,
  SwXmlSchemaError,
  type Infer,
  type Schema,
  type SchemaInput,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import type { SwXmlNode } from "../parser";

export type SchemaTuple = readonly Schema<any>[];

export type InferUnion<T extends SchemaTuple> = Infer<T[number]>;

function unionParse<T extends SchemaTuple>(
  schemas: T,
  value: SchemaInput,
  _options?: SchemaParseOptions,
): { success: true; data: InferUnion<T> } | { success: false; errors: SwXmlSchemaError[] } {
  const errors: SwXmlSchemaError[] = [];

  for (const schema of schemas) {
    try {
      return {
        success: true,
        data: schema.parse(value),
      };
    } catch (error) {
      if (error instanceof SwXmlSchemaError) {
        errors.push(error);
      } else {
        throw error;
      }
    }
  }

  return {
    success: false,
    errors,
  };
}

class UnionSchema<T extends SchemaTuple> implements Schema<InferUnion<T>> {
  constructor(public readonly schemas: T) {}

  parse(value: SchemaInput, options?: SchemaParseOptions): InferUnion<T> {
    const result = unionParse(this.schemas, value, options);

    if (result.success) {
      return result.data;
    }

    if (value === undefined) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: "missing_required_field",
          message: "Required union field is missing.",
          expected: "Any of union schema",
          received: describeSchemaInput(value),
          value,
        }),
      ]);
    } else {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: "invalid_union",
          message: "Value does not match any union schema.",
          unionErrors: result.errors,
          received: describeSchemaInput(value),
          value,
        }),
      ]);
    }
  }

  safeParse(
    value: SchemaInput,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferUnion<T>> {
    return safeParseSchema(this, value, options);
  }

  parseField(parent: SwXmlNode, key: string, options?: SchemaParseOptions): InferUnion<T> {
    const errors = [];

    const attrValue = parent.attr(key);
    const attrResult = unionParse(this.schemas, attrValue, options);
    if (attrResult.success) {
      return attrResult.data;
    } else if (attrValue !== undefined) {
      errors.push(...attrResult.errors);
    }

    const childValue = parent.selectChild(key, options?.duplicateChildElement);
    const childResult = this.safeParse(childValue, options);
    if (childResult.success) {
      return childResult.data;
    } else if (childValue !== undefined) {
      errors.push(...attrResult.errors);
    }

    if (errors.length === 0) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: "missing_required_field",
          message: "Required union field is missing.",
          expected: "Any of union schema",
        }),
      ]);
    } else {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: "invalid_union",
          message: "Value does not match any union schema.",
          unionErrors: errors,
        }),
      ]);
    }
  }

  serialize(value: T): unknown {
    // todo: implement
    return value;
  }

  optional(): Schema<InferUnion<T> | undefined> {
    return new OptionalSchema(this);
  }
}

export function union<T extends SchemaTuple>(schemas: T): UnionSchema<T> {
  return new UnionSchema(schemas);
}
