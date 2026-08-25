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

/**
 * The schema list accepted by a union schema.
 */
export type SchemaTuple = readonly Schema<any>[];

/**
 * Infers the value produced by any branch of a union schema.
 */
export type InferUnion<T extends SchemaTuple> = Infer<T[number]>;

/**
 * A schema that tries multiple schemas from left to right.
 *
 * Parsing succeeds with the first branch that matches. Parse errors keep the
 * errors returned by each branch, and serialization errors report the direct
 * branch schema names as the expected value.
 */
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
          input: input,
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
          input: { element: parent, key },
        }),
      ]),
    };
  }

  serializeField(value: unknown): SchemaSerializeResult {
    const errors: SchemaSerializeError[] = [];
    const expected = this.schemas.map((schema) => schema.name).join(" | ");

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
          expected,
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

/**
 * Creates a schema that accepts any value accepted by one of the given schemas.
 */
export function union<T extends SchemaTuple>(schemas: T): UnionSchema<T> {
  return new UnionSchema(schemas);
}
