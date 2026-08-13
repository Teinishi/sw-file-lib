import { isStringKeyRecord } from "@core";
import { type XmlWriter, type XmlWriterOptions } from "../../writer/XmlWriter";
import { SwXmlNode, SwXmlNodeList } from "../../parser";
import {
  checkUnknownFields,
  parseList,
  parseShape,
  safeParseChild,
  safeParseTree,
  serializeElement,
  unwrapResult,
  validateSchemaInput,
} from "../internal";
import {
  OptionalSchema,
  SchemaError,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type ElementSchema,
  type Shape,
  ObjectSchema,
  type ElementSchemaSerializeResult,
  type WriteElementCallback,
  type Infer,
  type ExtendShape,
  type InferShape,
  type ObjectShape,
  type Result,
  type SchemaParseFieldResult,
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
  readonly name = "metalist";

  constructor(
    public readonly itemTag: string,
    public readonly metaShape: M,
    public readonly itemSchema: I,
  ) {}

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<InferMetaList<M, I>, SchemaError> {
    const r = validateSchemaInput(input, "xml_element", this.name);
    if (!r.success) return r;
    const value = r.data;

    const { data, dataSource, issues } = parseShape(value, this.metaShape, ctx, options, ["meta"]);
    const { items, issues: issues2 } = parseList(
      value,
      this.itemTag,
      this.itemSchema,
      ctx,
      options,
      ["items"],
    );

    const issues3 = checkUnknownFields(value, dataSource, this.itemTag, ctx, options);

    issues.push(...issues2);
    issues.push(...issues3);

    if (issues.length === 0) {
      return {
        success: true,
        data: { meta: data, items },
      };
    } else {
      return {
        success: false,
        error: new SchemaError(issues),
      };
    }
  }

  parseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferMetaList<M, I> {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldResult<InferMetaList<M, I>> {
    return safeParseChild(this, parent, key, ctx, options);
  }

  safeParse(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Result<InferMetaList<M, I>, SchemaError> {
    return safeParseTree(this, tree, rootTag, options);
  }

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): InferMetaList<M, I> {
    return unwrapResult(this.safeParse(tree, rootTag, options));
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
    data: InferMetaList<M, I>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): XmlWriter {
    return serializeElement(this.serializeField(data), rootTag, writer);
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
