import {
  OptionalSchema,
  prependSchemaIssuePath,
  selectChild,
  SchemaError,
  type AnySchemaIssue,
  type InferShape,
  type PartialShape,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type Shape,
} from ".";
import { SwXmlNode } from "../parser";
import {
  assertXmlNode,
  createSwXmlIssue,
  evaluateUnknownFieldMode,
  safeParseSchema,
} from "./internal";

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
  parse(value: SchemaInput, ctx?: SchemaParseContext, options?: SchemaParseOptions): InferShape<T> {
    assertXmlNode(value, "object");

    const parsed: Record<string, unknown> = {};
    const issues: AnySchemaIssue[] = [];

    for (const [key, schema] of Object.entries(this.shape)) {
      try {
        const parsedValue = schema.parseField(value, key, ctx, options);
        if (parsedValue !== undefined || hasField(value, key)) {
          parsed[key] = parsedValue;
        }
      } catch (error) {
        if (error instanceof SchemaError) {
          issues.push(...prependSchemaIssuePath(error, [key]).issues);
          continue;
        }
        throw error;
      }
    }

    for (const [key, fieldValue] of value.attrs) {
      if (key in this.shape) continue;

      // 未知属性
      const mode = evaluateUnknownFieldMode(
        ctx,
        { kind: "attribute", key, value: fieldValue },
        options,
      );
      if (mode === "omit") continue;

      issues.push(
        createSwXmlIssue("unknown_attribute", {
          message: `Unknown attribute ${key}=${JSON.stringify(fieldValue)}.`,
          key,
          value: fieldValue,
        }),
      );
    }

    for (const [index, child] of value.nodes.entries()) {
      if (child.tag in this.shape) continue;

      // 未知子要素
      const mode = evaluateUnknownFieldMode(ctx, { kind: "child", index, child }, options);
      if (mode === "omit") continue;

      issues.push(
        createSwXmlIssue("unknown_child", {
          message: `Unknown child element <${child.tag}>.`,
          child,
        }),
      );
    }

    if (issues.length > 0) {
      throw new SchemaError(issues);
    }

    return parsed as InferShape<T>;
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferShape<T>> {
    return safeParseSchema(this, value, ctx, options);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferShape<T> {
    const child = selectChild(parent, key, ctx, options);
    return this.parse(child?.value, child?.newCtx ?? ctx, options);
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

/**
 * Shorthand for x.object(...).partial()
 */
export function partialObject<T extends Shape>(shape: T): ObjectSchema<PartialShape<T>> {
  return object(shape).partial();
}

function hasField(parent: SwXmlNode, key: string): boolean {
  return parent.attrs.has(key) || parent.nodes.some((child) => child.tag === key);
}
