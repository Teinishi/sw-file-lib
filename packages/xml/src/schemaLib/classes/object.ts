import { isStringKeyRecord } from "@core";
import {
  OptionalSchema,
  SchemaError,
  prependSchemaSerializeIssuePath,
  type InferShape,
  type PartialShape,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type Shape,
  type ElementSchema,
  type WriteElementCallback,
  type ElementSchemaSerializeResult,
  type ExtendObjectSchema,
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
  parseShape,
  safeParseChild,
  safeParseTree,
  serializeElement,
  unwrapResult,
  validateSchemaInput,
} from "../internal";

/**
 * A schema that parses XML record elements as JavaScript objects.
 */
export class ObjectSchema<T extends Shape> implements ElementSchema<InferShape<T>> {
  readonly name = "object";

  constructor(public readonly shape: T) {}

  /**
   * Parses an XML element as a record without throwing an error.
   *
   * Known fields are parsed with the configured field schemas. Primitive fields
   * read attributes, while object and list fields read child elements.
   */
  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<InferShape<T>, SchemaError> {
    const r = validateSchemaInput(input, "xml_element", this.name);
    if (!r.success) return r;
    const value = r.data;

    const { data, dataSource, issues } = parseShape(value, this.shape, ctx, options);

    const issues2 = checkUnknownFields(value, dataSource, null, ctx, options);

    issues.push(...issues2);

    if (issues.length === 0) {
      return {
        success: true,
        data,
      };
    } else {
      return {
        success: false,
        error: new SchemaError(issues),
      };
    }
  }

  /**
   * Parses an XML element as a record.
   *
   * Known fields are parsed with the configured field schemas. Primitive fields
   * read attributes, while object and list fields read child elements.
   *
   * @throws {@link SchemaError} when the value does not match the schema.
   */
  parseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): InferShape<T> {
    return unwrapResult(this.safeParseValue(input, ctx, options));
  }

  safeParseField(
    parent: SwXmlNode,
    key: string,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): SchemaParseFieldResult<InferShape<T>> {
    return safeParseChild(this, parent, key, ctx, options, [key]);
  }

  safeParse(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): Result<InferShape<T>, SchemaError> {
    return safeParseTree(this, tree, rootTag, options);
  }

  parseTree(
    tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
    rootTag: string,
    options?: SchemaParseOptions,
  ): InferShape<T> {
    return unwrapResult(this.safeParse(tree, rootTag, options));
  }

  serializeField(value: unknown): ElementSchemaSerializeResult {
    if (!isStringKeyRecord(value)) {
      return { kind: "failed", error: createSchemaSerializeTypeError("object", value, this.name) };
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
        case "omitted":
          break;
        case "failed":
          return { kind: "failed", error: prependSchemaSerializeIssuePath(r.error, [key]) };
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

  safeSerialize(
    data: InferShape<T>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): Result<XmlWriter, SchemaSerializeError> {
    return serializeElement(this.serializeField(data), rootTag, writer);
  }

  serialize(
    data: InferShape<T>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): XmlWriter {
    return unwrapResult(serializeElement(this.serializeField(data), rootTag, writer));
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
