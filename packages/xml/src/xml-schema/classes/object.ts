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
  type Immutable,
  type OmitObjectSchema,
} from "..";
import { isStringKeyRecord } from "../../internal";
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
export class ObjectSchema<
  S extends Shape,
  T extends object = InferShape<S>,
> implements ElementSchema<T> {
  readonly name = "object";
  readonly shape: S;

  private constructor(shape: S) {
    this.shape = shape;
  }

  static create<S extends Shape, T extends object = InferShape<S>>(shape: S) {
    return new ObjectSchema<S, T>(shape);
  }

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
  ): Result<T, SchemaError> {
    const r = validateSchemaInput(input, "xml_element", this.name);
    if (!r.success) return r;
    const value = r.data;

    const { data, dataSource, issues } = parseShape(value, this.shape, ctx, options);

    const issues2 = checkUnknownFields(value, dataSource, null, ctx, options);

    issues.push(...issues2);

    if (issues.length === 0) {
      return {
        success: true,
        data: data as T,
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

  /**
   * Serializes an object value into an XML element without throwing.
   */
  safeSerialize(
    data: Immutable<T>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): Result<XmlWriter, SchemaSerializeError> {
    return serializeElement(this.serializeField(data), rootTag, writer);
  }

  /**
   * Serializes an object value into an XML element.
   *
   * @throws {@link SchemaSerializeError} when any field cannot be serialized.
   */
  serialize(data: Immutable<T>, rootTag: string, writer?: XmlWriter | XmlWriterOptions): XmlWriter {
    return unwrapResult(serializeElement(this.serializeField(data), rootTag, writer));
  }

  optional(): OptionalSchema<ObjectSchema<S, T>> {
    return new OptionalSchema(this);
  }

  /**
   * Returns an object schema where every field is optional.
   */
  partial(): ObjectSchema<PartialShape<S>, Partial<T>> {
    return new ObjectSchema<PartialShape<S>, Partial<T>>(
      Object.fromEntries(
        Object.entries(this.shape).map(([key, schema]) => [key, schema.optional()]),
      ) as PartialShape<S>,
    );
  }

  /**
   * Returns a new object schema by adding new fields or overwriting existing fields.
   *
   * Pass a shape object directly when the new fields do not depend on the
   * existing shape. Pass a callback when you need to reference existing fields,
   * such as extending a nested object schema.
   *
   * @example
   * ```ts
   * const withId = base.extend({ id: x.number() });
   * const withNestedZ = base.extend((s) => ({
   *   position: s.position.extend({ z: x.number() }),
   * }));
   * ```
   */
  extend<U extends Shape>(shape: U | ((s: S) => U)): ExtendObjectSchema<S, U> {
    const newShape: ExtendShape<S, U> = {
      ...this.shape,
      ...(typeof shape === "function" ? shape(this.shape) : shape),
    };
    return new ObjectSchema(newShape);
  }

  /**
   * Returns a new object schema with specified keys are omitted.
   */
  omit<U extends keyof S>(keys: U[]): OmitObjectSchema<S, U> {
    const newShape = { ...this.shape };
    for (const key of keys) {
      delete newShape[key];
    }
    return new ObjectSchema(newShape);
  }
}

/**
 * Creates a schema that parses XML record elements as JavaScript objects.
 */
export function object<S extends Shape>(shape: S): ObjectSchema<S, InferShape<S>> {
  return ObjectSchema.create<S, InferShape<S>>(shape);
}

/**
 * Creates an object schema where every field is optional.
 *
 * This is syntax sugar for `x.object(...).partial()`.
 */
export function partialObject<S extends Shape>(
  shape: S,
): ObjectSchema<PartialShape<S>, Partial<InferShape<S>>> {
  return object<S>(shape).partial();
}
