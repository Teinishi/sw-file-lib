import {
  OptionalSchema,
  SchemaError,
  type Infer,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SchemaSerializeResult,
} from ".";
import type { SwXmlNode } from "../parser";
import { createSwXmlIssue, safeParse } from "./internal";

export type SchemaTuple = readonly Schema<any>[];

export type InferUnion<T extends SchemaTuple> = Infer<T[number]>;

export class UnionSchema<T extends SchemaTuple> implements Schema<InferUnion<T>> {
  constructor(public readonly schemas: T) {}

  parse(value: SchemaInput, ctx?: SchemaParseContext, options?: SchemaParseOptions): InferUnion<T> {
    const errors: SchemaError[] = [];

    for (const schema of this.schemas) {
      try {
        schema.parse(value, ctx, options);
      } catch (error) {
        if (error instanceof SchemaError) {
          errors.push(error);
        } else {
          throw error;
        }
      }
    }

    throw new SchemaError([
      createSwXmlIssue("invalid_union", {
        message: "Value does not match any union schema.",
        unionErrors: errors,
        value,
      }),
    ]);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferUnion<T> {
    const errors: SchemaError[] = [];

    for (const schema of this.schemas) {
      try {
        return schema.parseField(parent, key, ctx, options);
      } catch (e) {
        if (e instanceof SchemaError) {
          errors.push(e);
        } else {
          throw e;
        }
      }
    }

    throw new SchemaError([
      createSwXmlIssue("invalid_union", {
        message: "Value does not match any union schema.",
        unionErrors: errors,
      }),
    ]);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferUnion<T>> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  serializeField(value: unknown): SchemaSerializeResult {
    for (const schema of this.schemas) {
      const r = schema.serializeField(value);
      if (r.kind !== "failed") {
        return r;
      }
    }
    return { kind: "failed" };
  }

  optional(): Schema<InferUnion<T> | undefined> {
    return new OptionalSchema(this);
  }
}

export function union<T extends SchemaTuple>(schemas: T): UnionSchema<T> {
  return new UnionSchema(schemas);
}
