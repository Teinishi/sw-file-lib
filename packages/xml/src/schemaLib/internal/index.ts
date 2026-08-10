import {
  newSchemaParseContext,
  SwXmlSchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type UnknownFieldMode,
} from "..";
import type { DuplicateChildElementMode, SwXmlNode } from "../../parser";

/**
 * Parses with a schema and returns a discriminated result instead of throwing.
 */
export function safeParseSchema<T>(
  schema: Pick<Schema<T>, "parse">,
  value: SchemaInput,
  ctx?: SchemaParseContext,
  options?: SchemaParseOptions,
): SchemaSafeParseResult<T> {
  try {
    return { success: true, data: schema.parse(value, ctx, options) };
  } catch (error) {
    if (error instanceof SwXmlSchemaError) {
      return { success: false, error };
    }
    throw error;
  }
}

export function evaluateUnknownFieldMode(
  ctx: SchemaParseContext = newSchemaParseContext(),
  target: { kind: "attribute"; key: string; value: string } | { kind: "child"; child: SwXmlNode },
  options?: SchemaParseOptions,
): UnknownFieldMode {
  if (typeof options?.unknownField === "function") {
    return options.unknownField(ctx, target);
  } else {
    return options?.unknownField ?? "error";
  }
}

export function evaluateDuplicateChildElementMode(
  ctx: SchemaParseContext = newSchemaParseContext(),
  tag: string,
  options?: SchemaParseOptions,
): DuplicateChildElementMode {
  if (typeof options?.duplicateChildElement === "function") {
    return options.duplicateChildElement(ctx, tag);
  } else {
    return options?.duplicateChildElement ?? "error";
  }
}
