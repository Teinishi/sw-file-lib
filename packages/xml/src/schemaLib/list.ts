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
  type ElementSchema,
} from ".";
import { SwXmlNode, SwXmlNodeList } from "../parser";
import {
  assertXmlNode,
  createSwXmlIssue,
  evaluateUnknownFieldMode,
  parseTree,
  safeParse,
} from "./internal";

/**
 * A schema that parses XML list elements as JavaScript arrays.
 */
export class ListSchema<T> implements ElementSchema<T[]> {
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
        if (mode === "ignore") continue;
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

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): T[] {
    const child = selectChild(parent, key, ctx, options);
    return this.parse(child?.value, child?.newCtx ?? ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T[]> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  parseTree(tree: SwXmlNodeList, rootTag: string, options?: SchemaParseOptions): T[] {
    return parseTree("list", tree, rootTag, options, (el, ctx, options) =>
      this.parse(el, ctx, options),
    );
  }

  safeParseTree(
    tree: SwXmlNodeList,
    rootTag: string,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T[]> {
    return parseTree("list", tree, rootTag, options, (el, ctx, options) =>
      this.safeParse(el, ctx, options),
    );
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
