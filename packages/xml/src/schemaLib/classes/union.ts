import {
  OptionalSchema,
  SchemaError,
  SchemaSerializeError,
  type Infer,
  type Result,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseFieldResult,
  type SchemaParseOptions,
  type SchemaSerializeResult,
} from "..";
import type { SwXmlNode } from "../../parser";
import { createSwXmlIssue, unwrapResult } from "../internal";

export type SchemaTuple = readonly Schema<any>[];

export type InferUnion<T extends SchemaTuple> = Infer<T[number]>;

export class UnionSchema<T extends SchemaTuple> implements Schema<InferUnion<T>> {
  readonly name = "union";

  constructor(public readonly schemas: T) {}

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<Infer<T[number]>, SchemaError> {
    const errors: SchemaError[] = [];

    for (const schema of this.schemas) {
      const r = schema.safeParseValue(input, ctx, options);
      if (r.success) {
        return r;
      } else {
        errors.push(r.error);
      }
    }

    return {
      success: false,
      error: new SchemaError([
        createSwXmlIssue("invalid_union", {
          message: "Value does not match any union schema.",
          unionErrors: errors,
          value: input,
        }),
      ]),
    };
  }

  parseValue(
    value: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Infer<T[number]> {
    return unwrapResult(this.safeParseValue(value, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldResult<Infer<T[number]>> {
    const errors: SchemaError[] = [];

    for (const schema of this.schemas) {
      const r = schema.safeParseField(parent, key, ctx, options);
      if (r.success) {
        return r;
      } else {
        errors.push(r.error);
      }
    }

    return {
      success: false,
      error: new SchemaError([
        createSwXmlIssue("invalid_union", {
          message: "Value does not match any union schema.",
          unionErrors: errors,
        }),
      ]),
    };
  }

  serializeField(value: unknown): SchemaSerializeResult {
    const errors: SchemaSerializeError[] = [];

    for (const schema of this.schemas) {
      const r = schema.serializeField(value);
      if (r.kind !== "failed") {
        return r;
      }
      errors.push(r.error);
    }
    return {
      kind: "failed",
      error: new SchemaSerializeError([
        {
          path: [],
          message: "Value does not match any union schema.",
          expected: "union",
          schema: this.name,
          value,
          errors,
        },
      ]),
    };
  }

  optional(): OptionalSchema<InferUnion<T>> {
    return new OptionalSchema(this);
  }
}

export function union<T extends SchemaTuple>(schemas: T): UnionSchema<T> {
  return new UnionSchema(schemas);
}
