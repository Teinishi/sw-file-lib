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
  OptionalSchema,
  selectChild,
  SchemaError,
  type InferShape,
  type PartialShape,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type Shape,
  type ElementSchema,
  type WriteElementCallback,
  type ElementSchemaSerializeResult,
  type ExtendObjectSchema,
  type ExtendShape,
} from "..";

/**
 * A schema that parses XML record elements as JavaScript objects.
 */
export class ObjectSchema<T extends Shape> implements ElementSchema<InferShape<T>> {
  constructor(public readonly shape: T) {}

  /**
   * Parses an XML element as a record.
   *
   * Known fields are parsed with the configured field schemas. Primitive fields
   * read attributes, while object and list fields read child elements. Unknown
   * fields are preserved unless {@link SchemaParseOptions.omitUnknownField} is
   * true.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: SchemaInput, ctx?: SchemaParseContext, options?: SchemaParseOptions): InferShape<T> {
    assertXmlNode(value, "object");

    const { parsed, issues } = parseRecordElement(value, this.shape, ctx, options);

    for (const [key, attrValue] of value.attrs) {
      if (key in this.shape) continue;

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
      if (child.tag in this.shape) continue;

      // 未知子要素
      const mode = evaluateUnknownFieldMode(ctx, { kind: "child", index, child }, options);
      if (mode === "ignore") continue;

      issues.push(
        createSwXmlIssue("unknown_child", {
          message: `Unknown child element: <${child.tag}>.`,
          child,
        }),
      );
    }

    if (issues.length > 0) {
      throw new SchemaError(issues);
    }

    return parsed as InferShape<T>;
  }

  parseField(
    parent: SwXmlNode,
    key: string,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferShape<T> {
    const child = selectChild(parent, key, ctx, options);
    return this.parse(child?.value, child?.newCtx ?? ctx, options);
  }

  safeParse(
    value: SchemaInput,
    ctx?: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferShape<T>> {
    return safeParse(() => this.parse(value, ctx, options));
  }

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): InferShape<T> {
    return parseTree("object", tree, rootTag, options, (el, ctx, options) =>
      this.parse(el, ctx, options),
    );
  }

  safeParseTree(
    tree: SwXmlNodeList,
    rootTag: string,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<InferShape<T>> {
    return parseTree("object", tree, rootTag, options, (el, ctx, options) =>
      this.safeParse(el, ctx, options),
    );
  }

  serializeField(value: unknown): ElementSchemaSerializeResult {
    if (!isStringKeyRecord(value)) {
      return { kind: "failed" };
    }

    const attributes: [string, string][] = [];
    const children: [string, WriteElementCallback][] = [];

    for (const [key, fieldSchema] of Object.entries(this.shape)) {
      const r = fieldSchema.serializeField(value[key]);

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
    data: InferShape<T>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): XmlWriter {
    return serializeElement(this.serializeField(data), rootTag, writer);
  }

  optional(): OptionalSchema<InferShape<T>> {
    return new OptionalSchema(this);
  }

  /**
   * Returns an object schema where every field is optional.
   */
  partial(): ObjectSchema<PartialShape<T>> {
    return object(
      Object.fromEntries(
        Object.entries(this.shape).map(([key, schema]) => [key, schema.optional()]),
      ) as PartialShape<T>,
    );
  }

  /**
   * Returns a new object schema by adding new fields or overwriting existing fields.
   */
  extend<U extends Shape>(factory: (shape: T) => U): ExtendObjectSchema<T, U> {
    const newShape: ExtendShape<T, U> = { ...this.shape, ...factory(this.shape) };
    return new ObjectSchema(newShape);
  }

  /**
   * Returns a new object schema with specified keys are omitted.
   */
  omit<U extends keyof T>(keys: U[]): ObjectSchema<Omit<T, U>> {
    const newShape = { ...this.shape };
    for (const key of keys) {
      delete newShape[key];
    }
    return new ObjectSchema<Omit<T, U>>(newShape);
  }
}

/**
 * Creates a schema that parses XML record elements as JavaScript objects.
 */
export function object<T extends Shape>(shape: T): ObjectSchema<T> {
  return new ObjectSchema(shape);
}

/**
 * Syntax sugar for `x.object(...).partial()`
 */
export function partialObject<T extends Shape>(shape: T): ObjectSchema<PartialShape<T>> {
  return object(shape).partial();
}
