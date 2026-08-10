import {
  newSchemaParseContext,
  OptionalSchema,
  prependSchemaIssuePath,
  selectChild,
  SchemaError,
  type AnySchemaIssue,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from ".";
import { SwXmlNode } from "../parser";
import {
  assertXmlNode,
  createSwXmlIssue,
  evaluateUnknownFieldMode,
  safeParseSchema,
} from "./internal";

/**
 * A schema that parses XML list elements as JavaScript arrays.
 */
export class ListSchema<T> implements Schema<T[]> {
  constructor(
    public readonly itemTag: string,
    public readonly itemSchema: Schema<T>,
  ) {}

  /**
   * Parses an XML element as a list container.
   *
   * Each child element is parsed as one item. The item tag name is kept for
   * serialization metadata and future validation, but parsing is driven by the
   * surrounding schema rather than by schema-free list detection.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(
    value: SchemaInput,
    ctx: SchemaParseContext = newSchemaParseContext(),
    options?: SchemaParseOptions,
  ): T[] {
    assertXmlNode(value, "list");

    const parsed: T[] = [];
    const issues: AnySchemaIssue[] = [];

    for (const [index, item] of value.nodes.entries()) {
      if (item.tag !== this.itemTag) {
        // 未知子要素
        const mode = evaluateUnknownFieldMode(ctx, { kind: "child", index, child: item }, options);
        if (mode === "omit") continue;
        issues.push(
          createSwXmlIssue("unknown_child", {
            message: `Expected list item <${this.itemTag}>, found <${item.tag}>.`,
            child: item,
          }),
        );
      }

      const newCtx: SchemaParseContext = {
        ...ctx,
        xmlPath: ctx.xmlPath.concat({ index, tag: item.tag }),
      };

      try {
        parsed.push(this.itemSchema.parse(item, newCtx, options));
      } catch (error) {
        if (error instanceof SchemaError) {
          issues.push(...prependSchemaIssuePath(error, [index]).issues);
          continue;
        }
        throw error;
      }
    }

    if (issues.length > 0) {
      throw new SchemaError(issues);
    }

    return parsed;
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T[]> {
    return safeParseSchema(this, value, ctx, options);
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): T[] {
    const child = selectChild(parent, key, ctx, options);
    return this.parse(child?.value, child?.newCtx ?? ctx, options);
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
 * Creates a schema that parses XML list elements as JavaScript arrays.
 */
export function list<T>(itemTag: string, itemSchema: Schema<T>): ListSchema<T> {
  return new ListSchema(itemTag, itemSchema);
}
