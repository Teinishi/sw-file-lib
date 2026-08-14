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
export class ListSchema<T extends ElementSchema<any>> implements ElementSchema<Infer<T>[]> {
  readonly name = "list";

  constructor(
    public readonly itemTag: string,
    public readonly itemSchema: T,
  ) {}

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<Infer<T>[], SchemaError> {
    const r = validateSchemaInput(input, "xml_element", this.name);
    if (!r.success) return r;
    const value = r.data;

    const { items, issues } = parseList(value, this.itemTag, this.itemSchema, ctx, options);

    const issues2 = checkUnknownFields(value, null, this.itemTag, ctx, options);

    issues.push(...issues2);

    if (issues.length === 0) {
      return {
        success: true,
        data: items,
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
  ): Infer<T>[] {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldResult<Infer<T>[]> {
    return safeParseChild(this, parent, key, ctx, options, [key]);
  }

  safeParse(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Result<Infer<T>[], SchemaError> {
    return safeParseTree(this, tree, rootTag, options);
  }

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Infer<T>[] {
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

  safeSerialize(
    data: Infer<T>[],
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): Result<XmlWriter, SchemaSerializeError> {
    return serializeElement(this.serializeField(data), rootTag, writer);
  }

  serialize(data: Infer<T>[], rootTag: string, writer?: XmlWriter | XmlWriterOptions): XmlWriter {
    return unwrapResult(serializeElement(this.serializeField(data), rootTag, writer));
  }

  optional(): OptionalSchema<Infer<T>[]> {
    return new OptionalSchema(this);
  }

  /**
   * Returns a new list schema with the name of item tags changed.
   */
  renameItemTag(itemTag: string): ListSchema<T> {
    return new ListSchema(itemTag, this.itemSchema);
  }
}

export class ObjectListSchema<T extends Shape> extends ListSchema<ObjectSchema<T>> {
  /**
   * Returns a new list schema by adding new fields or overwriting existing fields to the item schema.
   */
  extendItem<U extends Shape>(factory: (shape: T) => U): ObjectListSchema<ExtendShape<T, U>> {
    return new ObjectListSchema(this.itemTag, this.itemSchema.extend(factory));
  }

  /**
   * Returns a new list schema with specified keys are omitted from the item schema.
   */
  omitItem<U extends keyof T>(keys: U[]): ObjectListSchema<Omit<T, U>> {
    return new ObjectListSchema(this.itemTag, this.itemSchema.omit(keys));
  }
}

/**
 * Creates a schema that parses XML list elements as JavaScript arrays.
 */
export function list<T extends ElementSchema<any>>(
  itemTag: string,
  itemSchema: T,
): T extends ObjectSchema<any> ? ObjectListSchema<ObjectShape<T>> : ListSchema<T> {
  let s;
  if (itemSchema instanceof ObjectSchema) {
    s = new ObjectListSchema(itemTag, itemSchema);
  } else {
    s = new ListSchema(itemTag, itemSchema);
  }
  return s as T extends ObjectSchema<any> ? ObjectListSchema<ObjectShape<T>> : ListSchema<T>;
}
