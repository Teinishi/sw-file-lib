import { escapeXmlAttribute, type XmlWriter, type XmlWriterOptions } from "../../writer/XmlWriter";
import { SwXmlNode, SwXmlNodeList } from "../../parser";
import {
  assertXmlNode,
  createSwXmlIssue,
  evaluateUnknownFieldMode,
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
  type AnySchemaIssue,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type ElementSchema,
  type WriteElementCallback,
  type ElementSchemaSerializeResult,
  type Infer,
  ObjectSchema,
  type Shape,
  type ObjectShape,
  type ExtendShape,
} from "..";

/**
 * A schema that parses XML list elements as JavaScript arrays.
 */
export class ListSchema<T extends ElementSchema<any>> implements ElementSchema<Infer<T>[]> {
  constructor(
    public readonly itemTag: string,
    public readonly itemSchema: T,
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
  ): Infer<T>[] {
    assertXmlNode(value, "list");

    const parsed: Infer<T>[] = [];
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
          message: `Expected no attribute for a list tag, found ${key}="${escapeXmlAttribute(attrValue)}".`,
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
  ): Infer<T>[] {
    const child = selectChild(parent, key, ctx, options);
    return this.parse(child?.value, child?.newCtx ?? ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<Infer<T>[]> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Infer<T>[] {
    return parseTree("list", tree, rootTag, options, (el, ctx, options) =>
      this.parse(el, ctx, options),
    );
  }

  safeParseTree(
    tree: SwXmlNodeList,
    rootTag: string,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<Infer<T>[]> {
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

  serialize(data: Infer<T>[], rootTag: string, writer?: XmlWriter | XmlWriterOptions): XmlWriter {
    return serializeElement(this.serializeField(data), rootTag, writer);
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
