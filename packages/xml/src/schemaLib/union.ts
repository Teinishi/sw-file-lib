import {
  createSwXmlIssue,
  describeSchemaInput,
  OptionalSchema,
  SwXmlSchemaError,
  type Infer,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import type { SwXmlNode } from "../parser";
import { safeParseSchema } from "./internal";

export type SchemaTuple = readonly Schema<any>[];

export type InferUnion<T extends SchemaTuple> = Infer<T[number]>;

function unionParse<T extends SchemaTuple>(
  schemas: T,
  value: SchemaInput,
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

  parse(
    value: SchemaInput,
    _ctx?: SchemaParseContext,
    _options?: SchemaParseOptions,
  ): InferUnion<T> {
    const result = unionParse(this.schemas, value);

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
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferUnion<T>> {
    return safeParseSchema(this, value, ctx, options);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferUnion<T> {
    const errors: SwXmlSchemaError[] = [];

    for (const schema of this.schemas) {
      try {
        return schema.parseField(parent, key, ctx, options);
      } catch (e) {
        if (e instanceof SwXmlSchemaError) {
          errors.push(e);
        } else {
          throw e;
        }
      }
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
