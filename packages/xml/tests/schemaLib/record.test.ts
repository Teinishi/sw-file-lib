import { describe, expect, expectTypeOf, test, vi } from "vitest";
import { SwXmlNode, SwXmlNodeList } from "../../src/parser";
import { XmlWriter } from "../../src/writer";
import * as x from "../../src/xml-schema";

const values = x.record(x.object({ value: x.number() }));
const writerOptions = { xmlDeclaration: false };

describe("record schema", () => {
  test("round trips arbitrary tags and infers mutable and immutable values", () => {
    const xml = '<root><alpha value="1"/><beta value="2"/></root>';
    const data = values.parse(xml, "root");
    expect(data).toEqual({ alpha: { value: 1 }, beta: { value: 2 } });
    expectTypeOf(data).toEqualTypeOf<Record<string, x.Infer<typeof values.itemSchema>>>();
    expectTypeOf<x.InferImmutable<typeof values>>().toEqualTypeOf<{
      readonly [key: string]: { readonly value: number };
    }>();
    expect(values.serialize(data, "root", writerOptions).toString()).toBe(xml);
    expect(values).toBeInstanceOf(x.ObjectRecordSchema);
    expect(values.itemSchema).toBeInstanceOf(x.ObjectSchema);
  });

  test("supports empty, required, and optional record fields", () => {
    expect(values.parse("<root/>", "root")).toEqual({});
    expect(values.serialize({}, "root", writerOptions).toString()).toBe("<root/>");
    const schema = x.object({ required: values, optional: values.optional() });
    expect(schema.parse("<root><required/></root>", "root")).toEqual({ required: {} });
    expect(schema.safeParse("<root/>", "root")).toMatchObject({
      success: false,
      error: { issues: [{ code: "missing_required_field", path: ["required"] }] },
    });
    expect(schema.serialize({ required: {} }, "root", writerOptions).toString()).toBe(
      "<root><required/></root>",
    );
  });

  test("composes with other element schemas", () => {
    const schema = x.list("item", x.record(x.list("entry", values)));
    const xml = '<root><item><group><entry><alpha value="1"/></entry></group></item></root>';
    const data = schema.parse(xml, "root");
    expect(data).toEqual([{ group: [{ alpha: { value: 1 } }] }]);
    expect(schema.serialize(data, "root", writerOptions).toString()).toBe(xml);
    const metalists = x.record(x.metalist("item", x.object({ id: x.number() }), values));
    const metaXml = '<root><group id="3"><item><alpha value="1"/></item></group></root>';
    const metaData = metalists.parse(metaXml, "root");
    expect(metaData).toEqual({ group: { meta: { id: 3 }, items: [{ alpha: { value: 1 } }] } });
    expect(metalists.serialize(metaData, "root", writerOptions).toString()).toBe(metaXml);
  });

  test("reports duplicates and parses only the selected occurrence", () => {
    const xml = '<root><alpha value="bad"/><beta value="2"/><alpha value="3"/></root>';
    expect(values.safeParse(xml, "root")).toMatchObject({
      success: false,
      error: { issues: [{ code: "duplicate_elements", path: ["alpha"] }] },
    });
    expect(values.parse(xml, "root", { duplicateChildElement: "last" })).toEqual({
      alpha: { value: 3 },
      beta: { value: 2 },
    });
    expect(
      values.parse('<root><alpha value="1"/><alpha value="bad"/></root>', "root", {
        duplicateChildElement: "first",
      }),
    ).toEqual({ alpha: { value: 1 } });
  });

  test("passes the parent context to duplicate callbacks and real indices to item callbacks", () => {
    const duplicateChildElement = vi.fn<x.DuplicateChildElementCallback>(() => "last");
    const unknownField = vi.fn<x.UnknownFieldCallback>(() => "ignore");
    const schema = x.object({ entries: values });
    schema.parse(
      '<root><entries><alpha value="bad"/><beta value="2"/><alpha value="3" extra="x"/></entries></root>',
      "root",
      { duplicateChildElement, unknownField },
    );
    expect(duplicateChildElement).toHaveBeenCalledExactlyOnceWith(
      { tag: "alpha", candidates: [expect.any(SwXmlNode), expect.any(SwXmlNode)] },
      expect.objectContaining({
        schemaPath: ["entries"],
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 0, tag: "entries" },
        ],
      }),
    );
    expect(unknownField).toHaveBeenCalledExactlyOnceWith(
      { kind: "attribute", key: "extra", value: "x" },
      expect.objectContaining({
        schemaPath: ["entries", "alpha"],
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 0, tag: "entries" },
          { index: 2, tag: "alpha" },
        ],
        element: expect.objectContaining({ tag: "alpha" }),
      }),
    );
    expect(
      schema.safeParse("<root><entries><alpha/><alpha/></entries></root>", "root", {
        duplicateChildElement: () => "error",
      }),
    ).toMatchObject({
      success: false,
      error: { issues: [{ code: "duplicate_elements", path: ["entries", "alpha"] }] },
    });
  });

  test("checks parent attributes and item fields without treating dynamic tags as unknown", () => {
    const xml = '<root extra="x"><alpha value="1"/></root>';
    expect(values.safeParse(xml, "root")).toMatchObject({
      success: false,
      error: { issues: [{ code: "unknown_attribute", key: "extra" }] },
    });
    const unknownField = vi.fn<x.UnknownFieldCallback>(() => "ignore");
    expect(values.parse(xml, "root", { unknownField })).toEqual({ alpha: { value: 1 } });
    expect(unknownField).toHaveBeenCalledExactlyOnceWith(
      { kind: "attribute", key: "extra", value: "x" },
      expect.objectContaining({ schemaPath: [] }),
    );
    expect(values.parse(xml, "root", { unknownField: "ignore" })).toEqual({ alpha: { value: 1 } });
    const schema = x.object({ entries: values });
    expect(
      schema.safeParse('<root><entries><alpha value="bad"/><beta/></entries></root>', "root", {
        unknownField: "ignore",
      }),
    ).toMatchObject({
      success: false,
      error: {
        issues: [
          { code: "invalid_value", path: ["entries", "alpha", "value"] },
          { code: "missing_required_field", path: ["entries", "beta", "value"] },
        ],
      },
    });
  });

  test("keeps prototype-like names as own properties", () => {
    // Nodes allow testing keys reserved by the underlying string XML parser.
    const tags = ["__proto__", "constructor", "toString"];
    const nodes = new SwXmlNodeList([
      new SwXmlNode(
        "root",
        new Map(),
        tags.map((tag) => new SwXmlNode(tag, new Map([["value", "1"]]), [])),
      ),
    ]);
    const data = values.parse(nodes, "root");
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    for (const tag of tags) {
      expect(Object.hasOwn(data, tag)).toBe(true);
      expect(data[tag]).toEqual({ value: 1 });
    }
    const xml = values.serialize(data, "root", writerOptions).toString();
    expect(xml).toBe(
      '<root><__proto__ value="1"/><constructor value="1"/><toString value="1"/></root>',
    );
  });

  test.each([null, [], 1, "text", undefined])(
    "rejects non-record serialization input: %s",
    (input) => {
      expect(values.serializeField(input)).toMatchObject({ kind: "failed" });
    },
  );

  test.each(["", "1tag", "a b", "a/b", "a><b", "tag\n", "tag\r", "a\u0000", "\uD800"])(
    "rejects invalid dynamic tag %j before writing",
    (tag) => {
      const writer = new XmlWriter(writerOptions);
      expect(values.safeSerialize({ [tag]: { value: 1 } }, "root", writer)).toMatchObject({
        success: false,
        error: { issues: [{ path: [tag], expected: "XML element name" }] },
      });
      expect(writer.toString()).toBe("");
    },
  );

  test("serializes own enumerable keys and accepts Unicode XML names", () => {
    const data: Record<string, { value: number }> = Object.create({ inherited: { value: 0 } });
    Object.defineProperty(data, "hidden", { value: { value: 0 } });
    Object.assign(data, { 日本語: { value: 1 }, "a-b.c_0": { value: 2 }, 𐀀: { value: 3 } });
    expect(values.serialize(data, "root", writerOptions).toString()).toBe(
      '<root><日本語 value="1"/><a-b.c_0 value="2"/><𐀀 value="3"/></root>',
    );
  });

  test("validates all entries before writing and includes record keys in serialize errors", () => {
    const schema = x.object({ entries: values });
    const writer = new XmlWriter(writerOptions);
    const result = schema.safeSerialize(
      { entries: { alpha: { value: 1 }, beta: { value: "bad" } } } as never,
      "root",
      writer,
    );
    expect(result).toMatchObject({
      success: false,
      error: { issues: [{ path: ["entries", "beta", "value"] }] },
    });
    expect(writer.toString()).toBe("");
  });

  test("extends and omits object item fields without mutating the original", () => {
    const extended = values.extendItem((s) => ({ value: s.value, name: x.string() }));
    const omitted = extended.omitItem(["value"]);
    expect(values.parse('<root><a value="1"/></root>', "root")).toEqual({ a: { value: 1 } });
    expect(extended.parse('<root><a value="1" name="x"/></root>', "root")).toEqual({
      a: { value: 1, name: "x" },
    });
    expect(omitted.parse('<root><a name="x"/></root>', "root")).toEqual({ a: { name: "x" } });
    expectTypeOf<x.Infer<typeof omitted>>().toEqualTypeOf<
      Record<string, x.Infer<typeof omitted.itemSchema>>
    >();
    const optional = extended.optional().inner.omitItem(["name"]);
    expect(optional.parse('<root><a value="2"/></root>', "root")).toEqual({ a: { value: 2 } });
  });
});
