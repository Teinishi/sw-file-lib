import { isStringKeyRecord } from "@core";
import {
  newSchemaParseContext,
  OptionalSchema,
  prependSchemaIssuePath,
  selectChild,
  SchemaError,
  type Schema,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type ElementSchema,
  type Shape,
  type InferShape,
  ObjectSchema,
  type ElementSchemaSerializeResult,
  type WriteElementCallback,
} from ".";
import { SwXmlNode, SwXmlNodeList } from "../parser";
import {
  assertXmlNode,
  createSwXmlIssue,
  evaluateUnknownFieldMode,
  parseRecordElement,
  parseTree,
  safeParse,
  serializeElement,
} from "./internal";
import type { XmlWriter, XmlWriterOptions } from "../writer/XmlWriter";

export type InferMetaList<T extends Shape, U> = {
  meta: InferShape<T>;
  items: U[];
};

/**
 * A schema that parses XML list elements that have attributes as JavaScript arrays.
 */
export class MetaListSchema<T extends Shape, U> implements ElementSchema<InferMetaList<T, U>> {
  constructor(
    public readonly itemTag: string,
    public readonly metaShape: ObjectSchema<T>,
    public readonly itemSchema: ElementSchema<U>,
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
  ): InferMetaList<T, U> {
    assertXmlNode(value, "metalist");

    const shape = this.metaShape.shape;

    const { parsed: meta, issues } = parseRecordElement(value, shape, ctx, options, ["meta"]);

    const items: U[] = [];

    for (const [key, attrValue] of value.attrs) {
      if (key in this.metaShape.shape) continue;

      // 未知属性
      const mode = evaluateUnknownFieldMode(
        ctx,
        { kind: "attribute", key, value: attrValue },
        options,
      );
      if (mode === "ignore") continue;

      issues.push(
        createSwXmlIssue("unknown_attribute", {
          message: `Unknown attribute: ${key}=${JSON.stringify(attrValue)}.`,
          key,
          value: attrValue,
        }),
      );
    }

    for (const [index, child] of value.nodes.entries()) {
      const isItem = child.tag === this.itemTag;
      if (!isItem && !(child.tag in this.metaShape.shape)) {
        // 未知子要素
        const mode = evaluateUnknownFieldMode(ctx, { kind: "child", index, child: child }, options);
        if (mode === "ignore") continue;

        issues.push(
          createSwXmlIssue("unknown_child", {
            message: `Unknown child element: <${child.tag}>.`,
            child: child,
          }),
        );
      }

      if (!isItem) continue;

      const newCtx: SchemaParseContext = {
        ...ctx,
        xmlPath: ctx.xmlPath.concat({ index, tag: child.tag }),
      };

      try {
        items.push(this.itemSchema.parse(child, newCtx, options));
      } catch (error) {
        if (error instanceof SchemaError) {
          issues.push(...prependSchemaIssuePath(error, ["items", index]).issues);
          continue;
        }
        throw error;
      }
    }

    if (issues.length > 0) {
      throw new SchemaError(issues);
    }

    return { meta: meta as InferShape<T>, items };
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferMetaList<T, U> {
    const child = selectChild(parent, key, ctx, options);
    return this.parse(child?.value, child?.newCtx ?? ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferMetaList<T, U>> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): InferMetaList<T, U> {
    return parseTree("metalist", tree, rootTag, options, (el, ctx, options) =>
      this.parse(el, ctx, options),
    );
  }

  safeParseTree(
    tree: SwXmlNodeList,
    rootTag: string,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferMetaList<T, U>> {
    return parseTree("metalist", tree, rootTag, options, (el, ctx, options) =>
      this.safeParse(el, ctx, options),
    );
  }

  serializeField(value: unknown): ElementSchemaSerializeResult {
    if (
      typeof value !== "object" ||
      value === null ||
      !("meta" in value) ||
      !("items" in value) ||
      !isStringKeyRecord(value.meta) ||
      !Array.isArray(value.items)
    ) {
      return { kind: "failed" };
    }

    const { itemTag, itemSchema } = this;

    const attributes: [string, string][] = [];
    const children: [string, WriteElementCallback][] = [];

    for (const [key, fieldSchema] of Object.entries(this.metaShape.shape)) {
      const r = fieldSchema.serializeField(value.meta[key]);

      switch (r.kind) {
        case "attribute":
          attributes.push([key, r.value]);
          break;
        case "element":
          children.push([key, r.write]);
          break;
        case "failed":
          return { kind: "failed" };
      }
    }

    for (const item of value.items) {
      const r = itemSchema.serializeField(item);
      if (r.kind === "failed") {
        return { kind: "failed" };
      }
      children.push([itemTag, r.write]);
    }

    return {
      kind: "element",
      write(name, writer) {
        if (children.length === 0) {
          writer.empty(name, attributes);
        } else {
          writer.begin(name, attributes);
          for (const [tag, write] of children) {
            write(tag, writer);
          }
          writer.end(name);
        }
      },
    };
  }

  serialize(
    name: string,
    data: InferMetaList<T, U>,
    writer?: XmlWriter | XmlWriterOptions,
  ): XmlWriter {
    return serializeElement(name, this.serializeField(data), writer);
  }

  optional(): Schema<InferMetaList<T, U> | undefined> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses XML list elements as JavaScript arrays.
 */
export function metalist<T extends Shape, U>(
  itemTag: string,
  metaSchema: ObjectSchema<T>,
  itemSchema: ElementSchema<U>,
): MetaListSchema<T, U> {
  return new MetaListSchema(itemTag, metaSchema, itemSchema);
}
