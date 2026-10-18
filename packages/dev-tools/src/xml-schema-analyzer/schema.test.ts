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

describe("mergeSchemas", () => {
  it.each([false, true])(
    "merges partial objects without absorbing unrelated schemas (unrelated first: %s)",
    async (first) => {
      const unrelated = '<other common="7" x="8"/>';
      const data = document(
        `<root id="test">${first ? unrelated : ""}<a common="3" x="4"/><b common="5" y="6"/>${first ? "" : unrelated}</root>`,
      );
      const config = await defineConfig({
        input: "*.xml",
        out: "schema.ts",
        mergeSchemas: { point: ["root/a", "root/b"] },
        interfaceNames: { "root/a": "SharedPoint" },
      });
      const entries = generateSchema(data, config);
      const shared = at(entries, "root/a");
      expect(shared).toBe(at(entries, "root/b"));
      expect(shared).not.toBe(at(entries, "root/other"));
      expect(shared.xmlLocations).toEqual([
        ["root", "a"],
        ["root", "b"],
      ]);
      expect(shared.properties.common).toMatchObject({
        isOptional: false,
        numberRange: { min: 3, max: 5 },
      });
      expect(shared.properties.x?.isOptional).toBe(true);
      expect(shared.properties.y?.isOptional).toBe(true);
      expect(at(entries, "root/other").properties.x?.isOptional).toBe(false);
      const code = generateCode(entries, config);
      expect(code).toContain("a: SharedPoint;\n  b: SharedPoint;");
      expect(code).toContain("x?: number;\n  y?: number;");
    },
  );

  it("keeps matching schemas in different explicit groups separate", () => {
    const entries = generateSchema(document('<root id="test"><a x="3"/><b x="4"/></root>'), {
      mergeSchemas: { first: "root/a", second: "root/b" },
    });
    expect(at(entries, "root/a")).not.toBe(at(entries, "root/b"));
  });

  it("supports regex selectors, mixed selectors, and stateful regex flags deterministically", () => {
    const regex = /^root\/b\d+$/g;
    regex.lastIndex = 42;
    const data = document('<root id="test"><a x="3"/><b1 y="4"/><b2 z="5"/></root>');
    const options = { mergeSchemas: { point: ["root/a", regex] } };
    const entries = generateSchema(data, options);
    expect(at(entries, "root/a")).toBe(at(entries, "root/b1"));
    expect(at(entries, "root/a")).toBe(at(entries, "root/b2"));
    expect(
      Object.values(at(entries, "root/a").properties).every((property) => property.isOptional),
    ).toBe(true);
    expect(regex.lastIndex).toBe(42);
    expect(generateCode(generateSchema(data, options))).toBe(generateCode(entries));
  });

  it("supports a regex directly as a group selector", () => {
    const entries = generateSchema(document('<root id="test"><a x="3"/><b y="4"/></root>'), {
      mergeSchemas: { point: /^root\/[ab]$/ },
    });
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
  });

  it("supports a callback and unionizes conflicting property types after overrides", () => {
    const calls: string[] = [];
    const entries = generateSchema(
      document('<root id="test"><a value="3"/><b value="true" y="4"/><c value="text"/></root>'),
      {
        mergeSchemas(location) {
          calls.push(location.join("/"));
          return location.length === 2 ? "value" : undefined;
        },
        schemaOverrides: {
          "root/a": { properties: { extra: { type: "string", optional: false } } },
        },
      },
    );
    expect(calls.toSorted()).toEqual(["root", "root/a", "root/b", "root/c"]);
    expect(at(entries, "root/a")).toBe(at(entries, "root/c"));
    expect(at(entries, "root/a").properties.extra?.isOptional).toBe(true);
    expect(generateCode(entries)).toContain("value: number | boolean | string;");
  });

  it("can merge empty elements selected as objects", () => {
    const entries = generateSchema(document('<root id="test"><a/><b x="3"/></root>'), {
      forceKind: { "root/a": "object" },
      mergeSchemas: { point: ["root/a", "root/b"] },
    });
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
    expect(at(entries, "root/a").properties.x?.isOptional).toBe(true);
  });

  it("supports list item groups while retaining list markers and parent references", () => {
    const entries = generateSchema(
      document(
        '<root id="test"><first><item x="3"/><item x="4"/></first><second><item y="5"/><item y="6"/></second></root>',
      ),
      {
        mergeSchemas: { point: ["root/first/item", "root/second/item"] },
      },
    );
    expect(at(entries, "root/first/item")).toBe(at(entries, "root/second/item"));
    const code = generateCode(entries, { interfaceNames: { "root/first/item": "Point" } });
    expect(code).toContain('"item"\n  first: Point[];');
    expect(code).toContain('"item"\n  second: Point[];');
  });

  it("prioritizes explicit groups over predefined schema matching", () => {
    const entries = generateSchema(document('<root id="test"><a x="3"/><b y="4"/></root>'), {
      mergeSchemas: { point: ["root/a", "root/b"] },
      predefinedSchemas: {
        "./shared": {
          X: { kind: "object", properties: { x: { type: "number", optional: false } } },
        },
      },
    });
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
    expect(generateCode(entries)).not.toContain('from "./shared"');
  });

  it("rejects ambiguous selectors", () => {
    expect(() =>
      generateSchema(document('<a x="3"/>'), {
        mergeSchemas: { first: "a", second: /^a$/ },
      }),
    ).toThrow("XML path a matches multiple mergeSchemas groups: first, second");
  });

  it.each(["missing", "root/items"])(
    "rejects an exact selector with no object or metalist: %s",
    (path) => {
      expect(() =>
        generateSchema(
          document('<root id="test"><items><item x="3"/><item x="4"/></items></root>'),
          {
            mergeSchemas: { point: path },
          },
        ),
      ).toThrow(`No object or metalist schema for mergeSchemas XML paths: ${path}`);
    },
  );

  it("merges metalist metadata and inlined items when item schemas are grouped", () => {
    const entries = generateSchema(
      document(
        '<root id="test"><a size="2"><item x="3"/><item x="4"/></a><b label="test"><item y="5"/><item y="6"/></b></root>',
      ),
      {
        mergeSchemas: { items: ["root/a/item", "root/b/item"], collections: ["root/a", "root/b"] },
      },
    );
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
    expect(at(entries, "root/a").properties.size?.isOptional).toBe(true);
    const code = generateCode(entries);
    expect(code).toContain("items: {\n    x?: number;\n    y?: number;");
  });

  it("rejects mixed object and metalist groups", () => {
    expect(() =>
      generateSchema(
        document('<root id="test"><a size="2"/><b size="2"><item x="3"/><item x="4"/></b></root>'),
        {
          mergeSchemas: { mixed: ["root/a", "root/b"] },
        },
      ),
    ).toThrow("Cannot merge object and metalist in mergeSchemas group mixed");
  });

  it("rejects incompatible metalist item tags in a group", () => {
    expect(() =>
      generateSchema(
        document(
          '<root id="test"><a size="2"><left x="3"/><left x="4"/></a><b size="2"><right x="5"/><right x="6"/></b></root>',
        ),
        {
          mergeSchemas: { mixed: ["root/a", "root/b"] },
        },
      ),
    ).toThrow("Cannot merge metalists with different item tags or item types");
  });
});

describe("list item tags", () => {
  it("does not merge a metalist with a plain object having the same metadata shape", () => {
    const entries = generateSchema(
      document(
        '<root id="test"><plain size="2"/><foo size="2"><bar text="a"/><bar text="b"/></foo></root>',
      ),
    );
    expect(at(entries, "root/plain").kind).toBe("object");
    expect(at(entries, "root/foo").kind).toBe("metalist");
    expect(at(entries, "root/plain")).not.toBe(at(entries, "root/foo"));
  });

  it.each(["list", "metalist"] as const)(
    "keeps different %s item tags distinct when merging",
    (kind) => {
      const attributes = kind === "metalist" ? ' label="test"' : "";
      const data = document(
        `<root id="test"><a id="a"><items${attributes}><left x="3"/><left x="4"/></items></a><b id="b"><items${attributes}><right x="5"/><right x="6"/></items></b></root>`,
      );
      const entries = generateSchema(data);
      expect(at(entries, "root/a")).not.toBe(at(entries, "root/b"));
      if (kind === "list") {
        expect(at(entries, "root/a").properties.items?.type).toMatchObject({
          kind,
          itemTag: "left",
        });
        expect(at(entries, "root/b").properties.items?.type).toMatchObject({
          kind,
          itemTag: "right",
        });
      } else {
        expect(at(entries, "root/a/items")).toMatchObject({ kind, itemTag: "left" });
        expect(at(entries, "root/b/items")).toMatchObject({ kind, itemTag: "right" });
        expect(at(entries, "root/a").properties.items?.type.kind).toBe("object");
      }
      const code = generateCode(entries);
      expect(code).toContain(`// @xml-schema ${kind} "left"`);
      expect(code).toContain(`// @xml-schema ${kind} "right"`);
    },
  );

  it("still merges lists with the same item tag and item type", () => {
    const entries = generateSchema(
      document(
        '<root id="test"><a id="a"><items><item x="3"/><item x="4"/></items></a><b id="b"><items><item x="5"/><item x="6"/></items></b></root>',
      ),
    );
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
  });

  it("preserves conflicting tags in a forced merge and reports the unrepresentable union", () => {
    const entries = generateSchema(
      document(
        '<root id="test"><a1 id="a"><items><left x="3"/><left x="4"/></items></a1><a2 id="b"><items><right x="5"/><right x="6"/></items></a2></root>',
      ),
      { mergeNumberSuffix: true },
    );
    const type = at(entries, "root/a1").properties.items?.type;
    expect(type).toMatchObject({
      kind: "union",
      types: [
        { kind: "list", itemTag: "left" },
        { kind: "list", itemTag: "right" },
      ],
    });
    expect(() => generateCode(entries)).toThrow(/inside a union.*\.items/);
  });
});

describe("attribute union inference", () => {
  it.each([
    { values: ["true", "false"], expected: "boolean" },
    { values: ["123", "4.5", "0", "1"], expected: "number" },
    { values: ["-12", "+12"], expected: "number" },
    { values: ["1.0", "-.5"], expected: "number" },
    { values: ["0", "-12", "4.5"], expected: "number" },
    { values: ["true", "0", "-12", "4.5", "abc"], expected: "boolean | number | string" },
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

describe("schemaOverrides callbacks", () => {
  it("accepts a callback through defineConfig and applies it once per object path before merging", async () => {
    const calls: string[] = [];
    const config = await defineConfig({
      input: "*.xml",
      out: "schema.ts",
      schemaOverrides(xmlLocation) {
        const path = xmlLocation.join("/");
        calls.push(path);
        if (xmlLocation.at(-1)?.startsWith("a")) {
          return { properties: { x: { type: "string", optional: true } } };
        }
        return undefined;
      },
    });
    const entries = generateSchema(
      document('<root id="test"><a1 x="3"/><a2 x="4"/><b x="5"/></root>'),
      config,
    );
    expect(calls.toSorted()).toEqual(["root", "root/a1", "root/a2", "root/b"]);
    expect(at(entries, "root/a1")).toBe(at(entries, "root/a2"));
    expect(at(entries, "root/a1").properties.x).toMatchObject({
      isOptional: true,
      type: { kind: "inline", type: "string" },
    });
    expect(at(entries, "root/b").properties.x).toMatchObject({
      isOptional: false,
      type: { kind: "inline", type: "number" },
    });
  });

  it("can supplement empty objects and preserves them as inline when returning undefined", () => {
    const data = document('<root id="test"><empty/><untouched/></root>');
    const calls: string[] = [];
    const entries = generateSchema(data, {
      forceKind: { "root/empty": "object", "root/untouched": "object" },
      schemaOverrides(location) {
        const path = location.join("/");
        calls.push(path);
        if (path === "root/empty") return { properties: { y: { type: "number", optional: true } } };
        return undefined;
      },
    });
    expect(at(entries, "root/empty").properties.y?.isOptional).toBe(true);
    expect(at(entries, "root").properties.untouched?.type).toEqual({ kind: "inline", type: "{}" });
    expect(calls.filter((path) => path === "root/empty")).toHaveLength(1);
    expect(calls.filter((path) => path === "root/untouched")).toHaveLength(1);
  });

  it("applies callbacks to metalist metadata and items but not list containers", () => {
    const calls: string[] = [];
    const entries = generateSchema(
      document(
        '<root id="test"><foos><foo size="2"><bar x="3"/><bar x="4"/></foo><foo size="2"><bar x="5"/><bar x="6"/></foo></foos></root>',
      ),
      {
        schemaOverrides(location) {
          const path = location.join("/");
          calls.push(path);
          if (path === "root/foos/foo")
            return { properties: { size: { type: "string", optional: true } } };
          if (path === "root/foos/foo/bar")
            return { properties: { y: { type: "number", optional: true } } };
          return undefined;
        },
      },
    );
    expect(calls.toSorted()).toEqual(["root", "root/foos/foo", "root/foos/foo/bar"]);
    expect(at(entries, "root/foos/foo")).toMatchObject({
      kind: "metalist",
      properties: {
        size: { isOptional: true, type: { kind: "inline", type: "string" } },
      },
    });
    expect(generateCode(entries)).toContain("y?: number;");
  });

  it("matches predefined schemas after a callback override", () => {
    const data = document('<root id="test"><a x="3"/></root>');
    const entries = generateSchema(data, {
      schemaOverrides: (location) =>
        location.at(-1) === "a"
          ? { properties: { x: { type: "string", optional: true } } }
          : undefined,
      predefinedSchemas: {
        "./shared": {
          TextValue: {
            kind: "object",
            properties: { x: { type: "string", optional: true } },
          },
        },
      },
    });
    expect(generateCode(entries)).toContain('import type { TextValue } from "./shared";');
    expect(generateCode(entries)).toContain("a: TextValue;");
  });

  it("propagates callback errors", () => {
    expect(() =>
      generateSchema(document('<a x="3"/>'), {
        schemaOverrides: () => {
          throw new Error("Invalid custom override");
        },
      }),
    ).toThrow("Invalid custom override");
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
