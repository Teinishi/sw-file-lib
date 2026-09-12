import {
  OptionalSchema,
  SchemaError,
  prependSchemaSerializeIssuePath,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type ElementSchema,
  type WriteElementCallback,
  type ElementSchemaSerializeResult,
  type Infer,
  ObjectSchema,
  type Shape,
  type ObjectShape,
  type ExtendShape,
  type Result,
  type SchemaParseFieldResult,
  SchemaSerializeError,
  type Immutable,
  type ExtendObjectSchema,
  type InferShape,
  type OmitObjectSchema,
} from "..";
import { SwXmlNode, SwXmlNodeList } from "../../parser";
import { type XmlWriter, type XmlWriterOptions } from "../../writer";
import {
  checkUnknownFields,
  createSchemaSerializeTypeError,
  parseList,
  safeParseChild,
  safeParseTree,
  serializeElement,
  unwrapResult,
  validateSchemaInput,
} from "../internal";

/**
 * A schema that parses XML list elements as JavaScript arrays.
 */
export class ListSchema<
  S extends ElementSchema<any>,
  T extends any[] = Infer<S>[],
> implements ElementSchema<T> {
  readonly name = "list";

  protected constructor(
    public readonly itemTag: string,
    public readonly itemSchema: S,
  ) {}

  static create<S extends ElementSchema<any>, T extends any[] = Infer<S>[]>(
    itemTag: string,
    itemSchema: S,
  ) {
    return new ListSchema<S, T>(itemTag, itemSchema);
  }

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<T, SchemaError> {
    const r = validateSchemaInput(input, "xml_element", this.name);
    if (!r.success) return r;
    const value = r.data;

    const { items, issues } = parseList<S>(value, this.itemTag, this.itemSchema, ctx, options);

    const issues2 = checkUnknownFields(value, null, this.itemTag, ctx, options);

    issues.push(...issues2);

    if (issues.length === 0) {
      return {
        success: true,
        data: items as T,
      };
    } else {
      return {
        success: false,
        error: new SchemaError(issues),
      };
    }
  }

  parseValue(input: SchemaInput, ctx: SchemaParseContext, options?: SchemaParseOptions): T {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldResult<T> {
    return safeParseChild(this, parent, key, ctx, options, [key]);
  }

  safeParse(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Result<T, SchemaError> {
    return safeParseTree(this, tree, rootTag, options);
  }

  parse(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): T {
    return unwrapResult(this.safeParse(tree, rootTag, options));
  }

  serializeField(value: unknown): ElementSchemaSerializeResult {
    if (!Array.isArray(value)) {
      return { kind: "failed", error: createSchemaSerializeTypeError("array", value, this.name) };
    }

    const { itemTag, itemSchema } = this;

    const children: WriteElementCallback[] = [];

    for (let index = 0; index < value.length; index++) {
      const item = value[index];
      const r = itemSchema.serializeField(item);
      if (r.kind === "failed") {
        return { kind: "failed", error: prependSchemaSerializeIssuePath(r.error, [index]) };
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

  /**
   * Serializes an array value into an XML element without throwing.
   */
  safeSerialize(
    data: Immutable<T>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): Result<XmlWriter, SchemaSerializeError> {
    return serializeElement(this.serializeField(data), rootTag, writer);
  }

  /**
   * Serializes an array value into an XML element.
   *
   * @throws {@link SchemaSerializeError} when the value or any item cannot be
   * serialized.
   */
  serialize(data: Immutable<T>, rootTag: string, writer?: XmlWriter | XmlWriterOptions): XmlWriter {
    return unwrapResult(serializeElement(this.serializeField(data), rootTag, writer));
  }

  /**
   * Returns an optional version of this list schema.
   */
  optional(): OptionalSchema<ListSchema<S, T>> {
    return new OptionalSchema(this);
  }

  /**
   * Returns a new list schema with the name of item tags changed.
   */
  renameItemTag(itemTag: string): ListSchema<S, T> {
    return new ListSchema(itemTag, this.itemSchema);
  }
}

/**
 * A list schema whose item schema is an object schema.
 */
export class ObjectListSchema<
  S1 extends Shape,
  S2 extends ObjectSchema<S1, T1>,
  T1 extends object = InferShape<S1>,
  T2 extends any[] = Infer<S2>[],
> extends ListSchema<S2, T2> {
  /**
   * Returns a new list schema by adding new fields or overwriting existing fields to the item schema.
   *
   * Pass a shape object directly when the new item fields do not depend on the
   * existing item shape. Pass a callback when you need to reference existing
   * item fields.
   *
   * @example
   * ```ts
   * const withId = items.extendItem({ id: x.number() });
   * const withNestedZ = items.extendItem((s) => ({
   *   position: s.position.extend({ z: x.number() }),
   * }));
   * ```
   */
  extendItem<U extends Shape>(
    shape: U | ((s: S1) => U),
  ): ObjectListSchema<ExtendShape<S1, U>, ExtendObjectSchema<S1, U>> {
    return new ObjectListSchema(this.itemTag, this.itemSchema.extend(shape));
  }

  /**
   * Returns a new list schema with specified keys are omitted from the item schema.
   */
  omitItem<U extends keyof S1>(keys: U[]): ObjectListSchema<Omit<S1, U>, OmitObjectSchema<S1, U>> {
    return new ObjectListSchema(this.itemTag, this.itemSchema.omit(keys));
  }

  optional(): OptionalSchema<ObjectListSchema<S1, S2, T1, T2>> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses repeated child elements as a JavaScript array.
 */
export function list<T extends ElementSchema<any>>(
  itemTag: string,
  itemSchema: T,
): T extends ObjectSchema<any> ? ObjectListSchema<ObjectShape<T>, T> : ListSchema<T> {
  let s;
  if (itemSchema instanceof ObjectSchema) {
    s = ObjectListSchema.create(itemTag, itemSchema);
  } else {
    s = ListSchema.create(itemTag, itemSchema);
  }
  return s as T extends ObjectSchema<any> ? ObjectListSchema<ObjectShape<T>, T> : ListSchema<T>;
}
