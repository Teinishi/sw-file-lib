import { describe, expect, it } from "vitest";
import { parseSwXml } from "@sw-file-lib/xml";
import { analyzeDocument, intersectDocumentData } from "./analyzer/document";
import { generateCode } from "./generate-code";
import { defineConfig } from "./index";
import { generateSchema, type SchemaEntry } from "./schema";

function document(...samples: string[]) {
  return samples
    .map((xml) => analyzeDocument(parseSwXml(xml), undefined))
    .reduce((a, b) => intersectDocumentData(a, b, undefined));
}

function at(entries: SchemaEntry[], path: string): SchemaEntry {
  const entry = entries.find((item) =>
    item.xmlLocations.some((location) => location.join("/") === path),
  );
  expect(entry, `schema at ${path}`).toBeDefined();
  return entry!;
}

describe("attribute union inference", () => {
  it.each([
    { values: ["true", "false"], expected: "boolean" },
    { values: ["123", "4.5", "0", "1"], expected: "number" },
    { values: ["abc", "def"], expected: "string" },
    { values: ["true", "123"], expected: "boolean | number" },
    { values: ["123", "abc"], expected: "number | string" },
    { values: ["false", "abc"], expected: "boolean | string" },
    { values: ["true", "123", "abc"], expected: "boolean | number | string" },
  ])("infers $expected from $values independently of sample order", ({ values, expected }) => {
    const samples = values.map((value) => `<a x="${value}"/>`);
    const forward = generateCode(generateSchema(document(...samples)));
    const backward = generateCode(generateSchema(document(...samples.toReversed())));
    expect(forward).toContain(`x: ${expected};`);
    expect(backward).toBe(forward);
  });

  it("merges schemas with the same union observed in different orders", () => {
    const entries = generateSchema(
      document('<root><a x="true"/><b x="123"/></root>', '<root><a x="123"/><b x="false"/></root>'),
      { forceKind: { root: "object" } },
    );
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
    expect(generateCode(entries)).toContain("x: boolean | number;");
  });

  it("infers unions within repeated elements in a single file", () => {
    const entries = generateSchema(document('<items><a x="true"/><a x="123"/></items>'));
    expect(generateCode(entries)).toContain("x: boolean | number;");
  });

  it("infers unions even after discarding observed value candidates", () => {
    const data = ["true", "123", "abc"]
      .map((value) => analyzeDocument(parseSwXml(`<a x="${value}"/>`), undefined))
      .reduce((a, b) => intersectDocumentData(a, b, { maxPossibleValueCount: 1 }));
    const entries = generateSchema(data);
    expect(at(entries, "a").properties.x?.possibleValues).toBeNull();
    expect(generateCode(entries)).toContain("x: boolean | number | string;");
  });

  it("lets overrides replace primitive unions and clears observed metadata", () => {
    const entries = generateSchema(document('<a x="true"/>', '<a x="123"/>'), {
      schemaOverrides: { a: { properties: { x: { type: "string", optional: true } } } },
    });
    expect(at(entries, "a").properties.x).toEqual({
      key: "x",
      type: { kind: "inline", type: "string" },
      isOptional: true,
      possibleValues: null,
      numberRange: null,
    });
    expect(generateCode(entries)).toContain("x?: string;");
  });
});

describe("generateSchema schemaOverrides", () => {
  it("supplements an optional property before merging without affecting unrelated paths or cached analysis", () => {
    const data = document('<root><a/><b x="4"/></root>', '<root><a x="3"/><b x="5"/></root>');
    const options = { forceKind: { root: "object" as const } };
    const before = generateCode(generateSchema(data, options));
    const entries = generateSchema(data, {
      ...options,
      schemaOverrides: { "root/a": { properties: { y: { type: "number", optional: true } } } },
    });
    expect(at(entries, "root/a").properties.x?.isOptional).toBe(true);
    expect(at(entries, "root/a").properties.y).toEqual({
      key: "y",
      type: { kind: "inline", type: "number" },
      isOptional: true,
      possibleValues: null,
      numberRange: null,
    });
    expect(at(entries, "root/b").properties).not.toHaveProperty("y");
    const code = generateCode(entries, { interfaceNames: { "root/a": "Supplemented" } });
    expect(code).toContain("export interface Supplemented {\n  x?: number;\n  y?: number;\n}");
    expect(generateCode(generateSchema(data, options))).toBe(before);
  });

  it("overrides requiredness while preserving metadata when the type matches", () => {
    const data = document('<a x="3" y="4"/>');
    const original = at(generateSchema(data), "a");
    const result = at(
      generateSchema(data, {
        schemaOverrides: { a: { properties: { y: { type: "number", optional: true } } } },
      }),
      "a",
    );
    expect(result.properties.y).toEqual({ ...original.properties.y, isOptional: true });
    expect(generateCode([result])).toContain("y?: number;");
  });

  it("can explicitly make an observed optional property required", () => {
    const data = document('<a x="3"/>', '<a x="4" y="5"/>');
    const entries = generateSchema(data, {
      schemaOverrides: { a: { properties: { y: { type: "number", optional: false } } } },
    });
    expect(at(entries, "a").properties.y?.isOptional).toBe(false);
    expect(generateCode(entries)).toContain("y: number;");
  });

  it.each([
    { value: "123", type: "string" as const },
    { value: "text", type: "number" as const },
    { value: "true", type: "string" as const },
    { value: "123", type: "boolean" as const },
  ])(
    "overrides the inferred type of $value to $type and clears stale metadata",
    ({ value, type }) => {
      const data = document(`<a x="${value}"/>`);
      const before = generateSchema(data);
      expect(at(before, "a").properties.x?.possibleValues).not.toBeNull();
      const entries = generateSchema(data, {
        schemaOverrides: { a: { properties: { x: { type, optional: true } } } },
      });
      expect(at(entries, "a").properties.x).toEqual({
        key: "x",
        type: { kind: "inline", type },
        isOptional: true,
        possibleValues: null,
        numberRange: null,
      });
      expect(generateCode(entries)).toContain(`x?: ${type};`);
      expect(generateSchema(data)).toEqual(before);
    },
  );

  it("applies type corrections before merging and leaves unrelated paths unchanged", () => {
    const entries = generateSchema(document('<root><a x="123"/><b x="456"/></root>'), {
      forceKind: { root: "object" },
      schemaOverrides: { "root/a": { properties: { x: { type: "string", optional: true } } } },
    });
    expect(at(entries, "root/a").properties.x?.type).toEqual({ kind: "inline", type: "string" });
    expect(at(entries, "root/b").properties.x?.type).toEqual({ kind: "inline", type: "number" });
    expect(at(entries, "root/b").properties.x?.isOptional).toBe(false);
  });

  it("matches predefined schemas using the corrected type and optionality", () => {
    const entries = generateSchema(document('<root><a x="123"/></root>'), {
      forceKind: { root: "object" },
      schemaOverrides: { "root/a": { properties: { x: { type: "string", optional: true } } } },
      predefinedSchemas: {
        "./shared": {
          TextValue: { kind: "object", properties: { x: { type: "string", optional: true } } },
        },
      },
    });
    const code = generateCode(entries);
    expect(code).toContain('import type { TextValue } from "./shared";');
    expect(code).toContain("a: TextValue;");
  });

  it("can merge a supplemented schema with an already complete schema", () => {
    const entries = generateSchema(document('<root><b x="3" y="4"/><a x="5"/></root>'), {
      forceKind: { root: "object" },
      schemaOverrides: { "root/a": { properties: { y: { type: "number", optional: true } } } },
    });
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
    expect(at(entries, "root/a").properties.y?.isOptional).toBe(true);
    expect(generateCode(entries, { interfaceNames: { "root/a": "Point" } })).toContain(
      "b: Point;\n  a: Point;",
    );
  });

  it.each(["string", "number", "boolean"] as const)(
    "adds %s properties to an existing empty object",
    (type) => {
      const entries = generateSchema(document("<a/>"), {
        forceKind: { a: "object" },
        schemaOverrides: { a: { properties: { value: { type, optional: false } } } },
      });
      expect(generateCode(entries)).toContain(`value: ${type};`);
    },
  );

  it("appends added attributes after observed attributes and before children", () => {
    const entries = generateSchema(document('<a x="3"><child label="test"/></a>'), {
      schemaOverrides: {
        a: {
          properties: {
            y: { type: "number", optional: true },
            z: { type: "string", optional: true },
          },
        },
      },
    });
    expect(generateCode(entries)).toContain(
      "x: number;\n  y?: number;\n  z?: string;\n  child: Child;",
    );
  });

  it.each(['<a><y value="3"/></a>', '<a y="3"><y value="3"/></a>'])(
    "rejects incompatible observed types in %s",
    (xml) => {
      expect(() =>
        generateSchema(document(xml), {
          forceKind: { a: "object" },
          schemaOverrides: { a: { properties: { y: { type: "number", optional: true } } } },
        }),
      ).toThrow("Cannot override non-primitive property at a/y");
    },
  );

  it.each(["missing", "/root", "Root", "root/items"])(
    "rejects unmatched or non-object path %s",
    (path) => {
      expect(() =>
        generateSchema(document('<root><items><item x="3"/><item x="4"/></items></root>'), {
          forceKind: { root: "object" },
          schemaOverrides: { [path]: { properties: { y: { type: "number", optional: true } } } },
        }),
      ).toThrow(`No object schema for schemaOverrides XML paths: ${path}`);
    },
  );

  it("supports list item paths", () => {
    const entries = generateSchema(document('<items><item x="3"/><item x="4"/></items>'), {
      schemaOverrides: { "items/item": { properties: { y: { type: "number", optional: true } } } },
    });
    expect(generateCode(entries)).toContain("y?: number;");
  });

  it("matches predefined schemas after supplementation", () => {
    const entries = generateSchema(document('<root><a x="3"/></root>'), {
      forceKind: { root: "object" },
      schemaOverrides: { "root/a": { properties: { y: { type: "number", optional: true } } } },
      predefinedSchemas: {
        "./shared": {
          Point: {
            kind: "object",
            properties: {
              x: { type: "number", optional: true },
              y: { type: "number", optional: true },
            },
          },
        },
      },
    });
    expect(generateCode(entries)).toContain('import type { Point } from "./shared";');
    expect(generateCode(entries)).toContain("a: Point;");
  });

  it("accepts schemaOverrides in defineConfig", async () => {
    const config = await defineConfig({
      input: "*.xml",
      out: "schema.ts",
      schemaOverrides: { a: { properties: { y: { type: "number", optional: true } } } },
    });
    expect(generateCode(generateSchema(document('<a x="3"/>'), config))).toContain("y?: number;");
  });
});
