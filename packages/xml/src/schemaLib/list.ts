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
  type WriteElementCallback,
  type ElementSchemaSerializeResult,
} from ".";
import { SwXmlNode, SwXmlNodeList } from "../parser";
import type { XmlWriter, XmlWriterOptions } from "../writer/XmlWriter";
import {
  assertXmlNode,
  createSwXmlIssue,
  evaluateUnknownFieldMode,
  parseTree,
  safeParse,
  serializeElement,
} from "./internal";

/**
 * A schema that parses XML list elements as JavaScript arrays.
 */
export class ListSchema<T> implements ElementSchema<T[]> {
  constructor(
    public readonly itemTag: string,
    public readonly itemSchema: ElementSchema<T>,
  ) {}

  /**
   * Parses an XML element as a list container.
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

    for (const [key, attrValue] of value.attrs) {
      const mode = evaluateUnknownFieldMode(
        ctx,
        { kind: "attribute", key, value: attrValue },
        options,
      );
      if (mode === "ignore") continue;

      issues.push(
        createSwXmlIssue("unknown_attribute", {
          message: `Expected no attribute for a list tag, found ${key}=${JSON.stringify(attrValue)}.`,
          key,
          value: attrValue,
        }),
      );
    }

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

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): T[] {
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

  serializeField(value: unknown): ElementSchemaSerializeResult {
    if (!Array.isArray(value)) {
      return { kind: "failed" };
    }

    const { itemTag, itemSchema } = this;

    const children: WriteElementCallback[] = [];

    for (const item of value) {
      const r = itemSchema.serializeField(item);
      if (r.kind === "failed") {
        return { kind: "failed" };
      }
      children.push(r.write);
    }

    return {
      kind: "element",
      write(name, writer) {
        if (children.length === 0) {
          writer.empty(name, []);
        } else {
          writer.begin(name, []);
          for (const child of children) {
            child(itemTag, writer);
          }
          writer.end(name);
        }
      },
    };
  }

  serialize(name: string, data: T[], writer?: XmlWriter | XmlWriterOptions): XmlWriter {
    return serializeElement(name, this.serializeField(data), writer);
  }

  optional(): Schema<T[] | undefined> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML list elements as JavaScript arrays.
 */
export function list<T>(itemTag: string, itemSchema: ElementSchema<T>): ListSchema<T> {
  return new ListSchema(itemTag, itemSchema);
}
