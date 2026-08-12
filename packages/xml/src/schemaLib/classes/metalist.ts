import { isStringKeyRecord } from "@core";
import { escapeXmlAttribute, type XmlWriter, type XmlWriterOptions } from "../../writer/XmlWriter";
import { SwXmlNode, SwXmlNodeList } from "../../parser";
import {
  assertXmlNode,
  createSwXmlIssue,
  evaluateUnknownFieldMode,
  parseRecordElement,
  parseTree,
  safeParse,
  serializeElement,
} from "../internal";
import {
  newSchemaParseContext,
  OptionalSchema,
  prependSchemaIssuePath,
  selectChild,
  SchemaError,
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
  type ExtendShape,
  type InferShape,
  type ObjectShape,
} from "..";

export type InferMetaList<M extends Shape, U extends ElementSchema<any>> = {
  meta: InferShape<M>;
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

    return { meta: meta as InferShape<M>, items };
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

  optional(): OptionalSchema<InferMetaList<M, I>> {
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
   * Returns a new list schema with specified keys are omitted from the meta schema.
   */
  omitMeta<U extends keyof M>(keys: U[]): MetaListSchema<Omit<M, U>, I> {
    return new MetaListSchema(
      this.itemTag,
      new ObjectSchema(this.metaShape).omit(keys).shape,
      this.itemSchema,
    );
  }
}

export class ObjectMetaListSchema<M extends Shape, I extends Shape> extends MetaListSchema<
  M,
  ObjectSchema<I>
> {
  /**
   * Returns a new list schema by adding new fields or overwriting existing fields to the item schema.
   */
  extendItem<U extends Shape>(
    factory: (shape: I) => U,
  ): ObjectMetaListSchema<M, ExtendShape<I, U>> {
    return new ObjectMetaListSchema(this.itemTag, this.metaShape, this.itemSchema.extend(factory));
  }

  /**
   * Returns a new list schema with specified keys are omitted from the item schema.
   */
  omitItem<U extends keyof I>(keys: U[]): ObjectMetaListSchema<M, Omit<I, U>> {
    return new ObjectMetaListSchema(this.itemTag, this.metaShape, this.itemSchema.omit(keys));
  }
}

/**
 * Creates a schema that parses XML list elements as JavaScript arrays.
 */
export function metalist<M extends Shape, I extends ElementSchema<any>>(
  itemTag: string,
  metaSchema: ObjectSchema<M>,
  itemSchema: I,
): I extends ObjectSchema<any> ? ObjectMetaListSchema<M, ObjectShape<I>> : MetaListSchema<M, I> {
  let s;
  if (itemSchema instanceof ObjectSchema) {
    s = new ObjectMetaListSchema(itemTag, metaSchema.shape, itemSchema);
  } else {
    s = new MetaListSchema(itemTag, metaSchema.shape, itemSchema);
  }
  return s as I extends ObjectSchema<any>
    ? ObjectMetaListSchema<M, ObjectShape<I>>
    : MetaListSchema<M, I>;
}
