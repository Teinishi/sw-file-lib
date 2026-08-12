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
  ObjectSchema,
  type ElementSchemaSerializeResult,
  type WriteElementCallback,
  type Infer,
  type ExtendObjectSchema,
  type ExtendShape,
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
import { escapeXmlAttribute, type XmlWriter, type XmlWriterOptions } from "../writer/XmlWriter";

export type InferMetaList<M extends Shape, U extends ElementSchema<any>> = {
  meta: M;
  items: Infer<U>[];
};

/**
 * A schema that parses XML list elements that have attributes as JavaScript arrays.
 */
export class MetaListSchema<M extends Shape, I extends ElementSchema<any>> implements ElementSchema<
  InferMetaList<M, I>
> {
  constructor(
    public readonly itemTag: string,
    public readonly metaShape: M,
    public readonly itemSchema: I,
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
  ): InferMetaList<M, I> {
    assertXmlNode(value, "metalist");

    const shape = this.metaShape;

    const { parsed: meta, issues } = parseRecordElement(value, shape, ctx, options, ["meta"]);

    const items: Infer<I>[] = [];

    for (const [key, attrValue] of value.attrs) {
      if (key in this.metaShape) continue;

      // 未知属性
      const mode = evaluateUnknownFieldMode(
        ctx,
        { kind: "attribute", key, value: attrValue },
        options,
      );
      if (mode === "ignore") continue;

      issues.push(
        createSwXmlIssue("unknown_attribute", {
          message: `Unknown attribute: ${key}="${escapeXmlAttribute(attrValue)}".`,
          key,
          value: attrValue,
        }),
      );
    }

    for (const [index, child] of value.nodes.entries()) {
      const isItem = child.tag === this.itemTag;
      if (!isItem && !(child.tag in this.metaShape)) {
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

    return { meta: meta as M, items };
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferMetaList<M, I> {
    const child = selectChild(parent, key, ctx, options);
    return this.parse(child?.value, child?.newCtx ?? ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferMetaList<M, I>> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): InferMetaList<M, I> {
    return parseTree("metalist", tree, rootTag, options, (el, ctx, options) =>
      this.parse(el, ctx, options),
    );
  }

  safeParseTree(
    tree: SwXmlNodeList,
    rootTag: string,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferMetaList<M, I>> {
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

    for (const [key, fieldSchema] of Object.entries(this.metaShape)) {
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
    data: InferMetaList<M, I>,
    writer?: XmlWriter | XmlWriterOptions,
  ): XmlWriter {
    return serializeElement(name, this.serializeField(data), writer);
  }

  optional(): Schema<InferMetaList<M, I> | undefined> {
    return new OptionalSchema(this);
  }

  /**
   * Returns a new metalist schema with the name of item tags changed.
   */
  renameItemTag(itemTag: string): MetaListSchema<M, I> {
    return new MetaListSchema(itemTag, this.metaShape, this.itemSchema);
  }

  /**
   * Returns a new metalist schema by adding new fields or overwriting existing fields to the meta schema.
   */
  extendMeta<U extends Shape>(factory: (shape: M) => U): MetaListSchema<ExtendShape<M, U>, I> {
    return new MetaListSchema(
      this.itemTag,
      new ObjectSchema(this.metaShape).extend(factory).shape,
      this.itemSchema,
    );
  }

  /**
   * Returns a new metalist schema by adding new fields or overwriting existing fields to the item schema.
   */
  extendItem<U extends Shape>(
    factory: (shape: I) => U,
  ): I extends ObjectSchema<infer S> ? MetaListSchema<M, ExtendObjectSchema<S, U>> : never {
    if (this.itemSchema instanceof ObjectSchema) {
      return new MetaListSchema(
        this.itemTag,
        this.metaShape,
        this.itemSchema.extend(factory),
      ) as I extends ObjectSchema<infer S> ? MetaListSchema<M, ExtendObjectSchema<S, U>> : never;
    }
    throw new Error("todo: message (cannot extend non-object item schema of metalist)");
  }

  /**
   * Returns a new list schema with specified keys are omitted from the meta schema.
   */
  omitMeta<U extends keyof M>(keys: U[]): MetaListSchema<Omit<M, U>, I> {
    return new MetaListSchema(
      this.itemTag,
      new ObjectSchema(this.metaShape).omit(keys).shape,
      this.itemSchema,
    );
  }

  /**
   * Returns a new list schema with specified keys are omitted from the item schema.
   */
  omitItem<S extends Shape, U extends keyof S>(
    keys: U[],
  ): I extends ObjectSchema<S> ? MetaListSchema<M, ObjectSchema<Omit<S, U>>> : never {
    if (!(this.itemSchema instanceof ObjectSchema)) {
      throw new Error("todo: message (cannot omit field of non-object schema)");
    }
    return new MetaListSchema(
      this.itemTag,
      this.metaShape,
      this.itemSchema.omit(keys),
    ) as I extends ObjectSchema<S> ? MetaListSchema<M, ObjectSchema<Omit<S, U>>> : never;
  }
}

/**
 * Creates a schema that parses XML list elements as JavaScript arrays.
 */
export function metalist<M extends Shape, I extends ElementSchema<any>>(
  itemTag: string,
  metaSchema: ObjectSchema<M>,
  itemSchema: I,
): MetaListSchema<M, I> {
  return new MetaListSchema(itemTag, metaSchema.shape, itemSchema);
}
