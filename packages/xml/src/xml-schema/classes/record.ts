import {
  OptionalSchema,
  SchemaError,
  prependSchemaIssuePath,
  type AnySchemaIssue,
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
  createSchemaSerializeTypeError,
  checkUnknownAttributes,
  createSwXmlIssue,
  extendSchemaParseContext,
  selectChildCandidates,
  safeParseChild,
  safeParseTree,
  serializeElement,
  unwrapResult,
  validateSchemaInput,
} from "../internal";

// XML 1.0 NameStartChar and NameChar. Tag names are written verbatim by XmlWriter.
const nameStart =
  ":A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}";
// The final assertion requires the absolute end, including for names ending in a newline.
const xmlNamePattern = new RegExp(
  `^[${nameStart}][${nameStart}\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*(?![\\s\\S])`,
  "u",
);

/**
 * A schema that parses XML children with arbitrary unique tags as a string-keyed object.
 */
export class RecordSchema<
  S extends ElementSchema<any>,
  T extends Record<string, any> = Record<string, Infer<S>>,
> implements ElementSchema<T> {
  readonly name = "record";

  protected constructor(public readonly itemSchema: S) {}

  static create<S extends ElementSchema<any>>(itemSchema: S) {
    return new RecordSchema<S, Record<string, Infer<S>>>(itemSchema);
  }

  safeParseValue(
    input: SchemaInput,
    ctx: SchemaParseContext,
    options?: SchemaParseOptions,
  ): Result<T, SchemaError> {
    const r = validateSchemaInput(input, "xml_element", this.name);
    if (!r.success) return r;
    const value = r.data;

    const groups = new Map<string, { node: SwXmlNode; index: number }[]>();
    for (const [index, node] of value.nodes.entries()) {
      const entries = groups.get(node.tag);
      if (entries) entries.push({ node, index });
      else groups.set(node.tag, [{ node, index }]);
    }

    const items: [string, Infer<S>][] = [];
    const issues: AnySchemaIssue[] = [];
    for (const [tag, entries] of groups) {
      const selected = selectChildCandidates(entries, tag, ctx, options);
      if (selected.kind === "duplicate") {
        issues.push({
          ...createSwXmlIssue("duplicate_elements", {
            message: `Expected record of unique tags, got ${entries.length} of <${tag}>.`,
          }),
          path: [tag],
        });
      } else if (selected.kind === "ok") {
        const newCtx = extendSchemaParseContext(
          ctx,
          [{ index: selected.siblingIndex, tag }],
          [tag],
        );
        const result = this.itemSchema.safeParseValue(selected.value, newCtx, options);
        if (result.success) items.push([tag, result.data]);
        else issues.push(...prependSchemaIssuePath(result.error, [tag]).issues);
      }
    }
    issues.push(...checkUnknownAttributes(value, null, ctx, options));

    if (issues.length === 0) {
      return {
        success: true,
        data: Object.fromEntries(items) as T,
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
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { kind: "failed", error: createSchemaSerializeTypeError("object", value, this.name) };
    }

    const { itemSchema } = this;

    const children: [string, WriteElementCallback][] = [];

    for (const [tag, item] of Object.entries(value)) {
      if (!xmlNamePattern.test(tag)) {
        return {
          kind: "failed",
          error: new SchemaSerializeError([
            {
              path: [tag],
              message: `Invalid XML element name: ${JSON.stringify(tag)}.`,
              expected: "XML element name",
              schema: this.name,
              value: tag,
            },
          ]),
        };
      }
      const r = itemSchema.serializeField(item);
      if (r.kind === "failed") {
        return { kind: "failed", error: prependSchemaSerializeIssuePath(r.error, [tag]) };
      }
      children.push([tag, r.write]);
    }

    return {
      kind: "element",
      write(name, writer) {
        if (children.length === 0) {
          writer.empty(name, []);
        } else {
          writer.begin(name, []);
          for (const [tag, child] of children) {
            child(tag, writer);
          }
          writer.end(name);
        }
      },
    };
  }

  /**
   * Serializes a record value into an XML element without throwing.
   */
  safeSerialize(
    data: Immutable<T>,
    rootTag: string,
    writer?: XmlWriter | XmlWriterOptions,
  ): Result<XmlWriter, SchemaSerializeError> {
    return serializeElement(this.serializeField(data), rootTag, writer);
  }

  /**
   * Serializes a record value into an XML element.
   *
   * @throws {@link SchemaSerializeError} when the value or any item cannot be
   * serialized.
   */
  serialize(data: Immutable<T>, rootTag: string, writer?: XmlWriter | XmlWriterOptions): XmlWriter {
    return unwrapResult(serializeElement(this.serializeField(data), rootTag, writer));
  }

  /**
   * Returns an optional version of this record schema.
   */
  optional(): OptionalSchema<RecordSchema<S, T>> {
    return new OptionalSchema(this);
  }
}

/**
 * A record schema whose item schema is an object schema.
 */
export class ObjectRecordSchema<
  S1 extends Shape,
  S2 extends ObjectSchema<S1, T1>,
  T1 extends object = InferShape<S1>,
  T2 extends Record<string, any> = Record<string, Infer<S2>>,
> extends RecordSchema<S2, T2> {
  static createWithObjectSchema<S1 extends Shape, S2 extends ObjectSchema<S1, InferShape<S1>>>(
    itemSchema: S2,
  ) {
    return new ObjectRecordSchema<S1, S2, InferShape<S1>, Record<string, Infer<S2>>>(itemSchema);
  }

  /**
   * Returns a new record schema by adding new fields or overwriting existing fields to the item schema.
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
  ): ObjectRecordSchema<ExtendShape<S1, U>, ExtendObjectSchema<S1, U>> {
    return new ObjectRecordSchema(this.itemSchema.extend(shape));
  }

  /**
   * Returns a new record schema with specified keys are omitted from the item schema.
   */
  omitItem<U extends keyof S1>(
    keys: U[],
  ): ObjectRecordSchema<Omit<S1, U>, OmitObjectSchema<S1, U>> {
    return new ObjectRecordSchema(this.itemSchema.omit(keys));
  }

  optional(): OptionalSchema<ObjectRecordSchema<S1, S2, T1, T2>> {
    return new OptionalSchema(this);
  }
}

/**
 * Creates a schema that parses child tag names as keys and their elements as values.
 */
export function record<T extends ElementSchema<any>>(
  itemSchema: T,
): T extends ObjectSchema<any> ? ObjectRecordSchema<ObjectShape<T>, T> : RecordSchema<T> {
  let s;
  if (itemSchema instanceof ObjectSchema) {
    s = ObjectRecordSchema.createWithObjectSchema(itemSchema);
  } else {
    s = RecordSchema.create(itemSchema);
  }
  return s as T extends ObjectSchema<any> ? ObjectRecordSchema<ObjectShape<T>, T> : RecordSchema<T>;
}
