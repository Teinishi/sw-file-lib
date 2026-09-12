import {
  OptionalSchema,
  SchemaError,
  prependSchemaSerializeIssuePath,
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
  SchemaSerializeError,
  type Immutable,
} from "..";
import { isStringKeyRecord } from "../../internal";
import { SwXmlNode, SwXmlNodeList } from "../../parser";
import { type XmlWriter, type XmlWriterOptions } from "../../writer";
import {
  checkUnknownFields,
  createSchemaSerializeTypeError,
  parseList,
  parseShape,
  safeParseChild,
  safeParseTree,
  serializeElement,
  unwrapResult,
  validateSchemaInput,
} from "../internal";

/**
 * Infers the value produced by a metalist schema.
 */
export type InferMetalist<M extends Shape, U extends ElementSchema<any>> = {
  meta: InferShape<M>;
  items: Infer<U>[];
};

export type Metalist<M, I> = {
  meta: M;
  items: I[];
};

/**
 * A schema that parses XML list elements that have attributes as JavaScript arrays.
 */
export class MetalistSchema<
  MS extends Shape,
  IS extends ElementSchema<any>,
  MT extends object = InferShape<MS>,
  IT extends any[] = Infer<IS>[],
> implements ElementSchema<Metalist<MT, IT>> {
  readonly name = "metalist";

  protected constructor(
    public readonly itemTag: string,
    public readonly metaShape: MS,
    public readonly itemSchema: IS,
  ) {}

  static create<MS extends Shape, IS extends ElementSchema<any>>(
    itemTag: string,
    metaShape: MS,
    itemSchema: IS,
  ) {
    return new MetalistSchema<MS, IS>(itemTag, metaShape, itemSchema);
  }

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<Metalist<MT, IT>, SchemaError> {
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
        data: { meta: data as MT, items },
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
  ): Metalist<MT, IT> {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldResult<Metalist<MT, IT>> {
    return safeParseChild(this, parent, key, ctx, options, [key]);
  }

  safeParse(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Result<Metalist<MT, IT>, SchemaError> {
    return safeParseTree(this, tree, rootTag, options);
  }

  parse(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Metalist<MT, IT> {
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
      return {
        kind: "failed",
        error: createSchemaSerializeTypeError("{ meta: object; items: array }", value, this.name),
      };
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
        case "omitted":
          break;
        case "failed":
          return { kind: "failed", error: prependSchemaSerializeIssuePath(r.error, ["meta", key]) };
      }
    }

    for (let index = 0; index < value.items.length; index++) {
      const item = value.items[index];
      const r = itemSchema.serializeField(item);
      if (r.kind === "failed") {
        return {
          kind: "failed",
          error: prependSchemaSerializeIssuePath(r.error, ["items", index]),
        };
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

  /**
   * Serializes a metalist value into an XML element without throwing.
   */
  safeSerialize(
    data: Immutable<Metalist<MT, IT>>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): Result<XmlWriter, SchemaSerializeError> {
    return serializeElement(this.serializeField(data), rootTag, writer);
  }

  /**
   * Serializes a metalist value into an XML element.
   *
   * @throws {@link SchemaSerializeError} when metadata or any item cannot be
   * serialized.
   */
  serialize(
    data: Immutable<Metalist<MT, IT>>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): XmlWriter {
    return unwrapResult(serializeElement(this.serializeField(data), rootTag, writer));
  }

  optional(): OptionalSchema<MetalistSchema<MS, IS, MT, IT>> {
    return new OptionalSchema(this);
  }

  /**
   * Returns a new metalist schema with the name of item tags changed.
   */
  renameItemTag(itemTag: string): MetalistSchema<MS, IS> {
    return new MetalistSchema(itemTag, this.metaShape, this.itemSchema);
  }

  /**
   * Returns a new metalist schema by adding new fields or overwriting existing fields to the meta schema.
   *
   * Pass a shape object directly when the new metadata fields do not depend on
   * the existing metadata shape. Pass a callback when you need to reference
   * existing metadata fields.
   *
   * @example
   * ```ts
   * const withName = list.extendMeta({ name: x.string() });
   * const withNestedZ = list.extendMeta((s) => ({
   *   position: s.position.extend({ z: x.number() }),
   * }));
   * ```
   */
  extendMeta<U extends Shape>(shape: U | ((s: MS) => U)): MetalistSchema<ExtendShape<MS, U>, IS> {
    return new MetalistSchema(
      this.itemTag,
      ObjectSchema.create<MS>(this.metaShape).extend(shape).shape,
      this.itemSchema,
    );
  }

  /**
   * Returns a new list schema with specified keys are omitted from the meta schema.
   */
  omitMeta<U extends keyof MS>(keys: U[]): MetalistSchema<Omit<MS, U>, IS> {
    return new MetalistSchema(
      this.itemTag,
      ObjectSchema.create<MS>(this.metaShape).omit(keys).shape,
      this.itemSchema,
    );
  }
}

/**
 * A metalist schema whose item schema is an object schema.
 */
export class ObjectMetalistSchema<M extends Shape, I extends Shape> extends MetalistSchema<
  M,
  ObjectSchema<I>
> {
  /**
   * Returns a new list schema by adding new fields or overwriting existing fields to the item schema.
   *
   * Pass a shape object directly when the new item fields do not depend on the
   * existing item shape. Pass a callback when you need to reference existing
   * item fields.
   *
   * @example
   * ```ts
   * const withId = list.extendItem({ id: x.number() });
   * const withNestedZ = list.extendItem((s) => ({
   *   position: s.position.extend({ z: x.number() }),
   * }));
   * ```
   */
  extendItem<U extends Shape>(
    shape: U | ((s: I) => U),
  ): ObjectMetalistSchema<M, ExtendShape<I, U>> {
    return new ObjectMetalistSchema(this.itemTag, this.metaShape, this.itemSchema.extend(shape));
  }

  /**
   * Returns a new list schema with specified keys are omitted from the item schema.
   */
  omitItem<U extends keyof I>(keys: U[]): ObjectMetalistSchema<M, Omit<I, U>> {
    return new ObjectMetalistSchema(this.itemTag, this.metaShape, this.itemSchema.omit(keys));
  }
}

/**
 * Creates a schema for list elements that also carry metadata fields.
 *
 * Metadata fields are read from the list element itself, while items are read
 * from repeated child elements with `itemTag`.
 */
export function metalist<M extends Shape, I extends ElementSchema<any>>(
  itemTag: string,
  metaSchema: ObjectSchema<M>,
  itemSchema: I,
): I extends ObjectSchema<any> ? ObjectMetalistSchema<M, ObjectShape<I>> : MetalistSchema<M, I> {
  let s;
  if (itemSchema instanceof ObjectSchema) {
    s = ObjectMetalistSchema.create(itemTag, metaSchema.shape, itemSchema);
  } else {
    s = MetalistSchema.create(itemTag, metaSchema.shape, itemSchema);
  }
  return s as I extends ObjectSchema<any>
    ? ObjectMetalistSchema<M, ObjectShape<I>>
    : MetalistSchema<M, I>;
}
