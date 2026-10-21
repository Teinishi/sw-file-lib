import consola from "consola";
import { describe, expect, it, vi } from "vitest";
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

function captureWarnings<T>(action: () => T) {
  const warn = vi.spyOn(consola, "warn").mockImplementation(() => {});
  try {
    const result = action();
    return { result, warnings: warn.mock.calls.map((args) => args.join(" ")) };
  } finally {
    warn.mockRestore();
  }
}

describe("forced records", () => {
  it("merges partial item objects and preserves paths, overrides and parent links", () => {
    const entries = generateSchema(
      document(
        '<root id="root"><values><alpha x="1" text="123"/><beta y="2" text="hello"/></values></root>',
      ),
      {
        forceKind: { "root/values": "record" },
        attributeTypes: { text: "string" },
        schemaOverrides: {
          "root/values/alpha": { properties: { x: { type: "number", optional: true } } },
        },
      },
    );
    const item = at(entries, "root/values/alpha");
    expect(item).toBe(at(entries, "root/values/beta"));
    expect(item.properties.x?.isOptional).toBe(true);
    expect(item.properties.y?.isOptional).toBe(true);
    expect(item.properties.text?.type).toEqual({ kind: "inline", type: "string" });
    let parents: readonly string[] = [];
    const code = generateCode(entries, {
      interfaceNames: { "root/values/alpha": "ValueItem" },
      generateTSDoc(context) {
        if (context.schema === item)
          parents = context.parents.flatMap((parent) => parent.propertyPaths);
        return "Generated item.";
      },
    });
    expect(code).toContain("values: Record<string, ValueItem>;");
    expect(code).not.toContain("@xml-schema record");
    expect(parents).toEqual(["values[key]"]);
  });

  it("supports callback forceKind and empty inline records without empty interfaces", () => {
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(document('<root id="root"><values/></root>'), {
        forceKind: (location) => (location.join("/") === "root/values" ? "record" : undefined),
      }),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("root/values");
    expect(entries).toHaveLength(1);
    expect(generateCode(entries)).toContain("values: Record<string, {}>;");
  });

  it.each([false, true])("resolves grouped empty records (empty first: %s)", (emptyFirst) => {
    const empty = "<empty/>";
    const full = '<full><one x="1"/><two y="2"/></full>';
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(
        document(`<root id="root">${emptyFirst ? empty + full : full + empty}</root>`),
        {
          forceKind: { "root/empty": "record", "root/full": "record" },
          mergeSchemas: { records: ["root/empty", "root/full"] },
        },
      ),
    );
    expect(warnings).toEqual([]);
    const root = at(entries, "root");
    expect(root.properties.empty?.type).toEqual(root.properties.full?.type);
    expect(generateCode(entries)).toContain("empty: Record<string, One>;");
  });

  it("supports nested records and merges their item schemas", () => {
    const entries = generateSchema(
      document(
        '<root id="root"><values><alpha><one x="1"/></alpha><beta><two y="2"/></beta></values></root>',
      ),
      {
        forceKind: (location) =>
          location.length === 2 || location.length === 3 ? "record" : undefined,
      },
    );
    expect(at(entries, "root/values/alpha/one")).toBe(at(entries, "root/values/beta/two"));
    expect(generateCode(entries)).toContain("values: Record<string, Record<string, One>>;");
  });

  it("supports metalist values", () => {
    const entries = generateSchema(
      document(
        '<root id="root"><values><alpha size="1"><item x="1"/><item x="2"/></alpha><beta size="2"><item x="3"/><item x="4"/></beta></values></root>',
      ),
      {
        forceKind: { "root/values": "record" },
      },
    );
    const code = generateCode(entries);
    expect(code).toContain("values: Record<string, Alpha>;");
    expect(code).toContain('// @xml-schema metalist "item"');
  });

  it.each(["list", "metalist"] as const)("supports records as %s items", (kind) => {
    const entries = generateSchema(
      document(
        '<root id="root"><values><item><alpha x="1"/></item><item><beta y="2"/></item></values></root>',
      ),
      {
        forceKind: { "root/values": [kind, "item"], "root/values/item": "record" },
      },
    );
    expect(generateCode(entries)).toContain("Record<string, Alpha>[];");
  });

  it("merges partial metalist item schemas across record keys", () => {
    const entries = generateSchema(
      document(
        '<root id="root"><values><alpha size="1"><item x="1"/><item x="2"/></alpha><beta size="2"><item y="3"/><item y="4"/></beta></values></root>',
      ),
      {
        forceKind: { "root/values": "record" },
      },
    );
    expect(at(entries, "root/values/alpha/item")).toBe(at(entries, "root/values/beta/item"));
    const code = generateCode(entries);
    expect(code).toContain("x?: number;");
    expect(code).toContain("y?: number;");
  });

  it("resolves empty record properties through merged parents", () => {
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(
        document(
          '<root id="root"><a id="a"><values/></a><b id="b"><values><alpha x="1"/></values></b></root>',
        ),
        {
          forceKind: { "root/a/values": "record", "root/b/values": "record" },
          mergeSchemas: { parents: ["root/a", "root/b"] },
        },
      ),
    );
    expect(warnings).toEqual([]);
    expect(generateCode(entries)).toContain("values: Record<string, Alpha>;");
  });

  it("avoids shadowing TypeScript Record with an item interface", () => {
    const entries = generateSchema(
      document('<root id="root"><values><record x="1"/></values></root>'),
      {
        forceKind: { "root/values": "record" },
      },
    );
    expect(generateCode(entries)).toContain("values: Record<string, Record2>;");
    expect(() =>
      generateCode(entries, { interfaceNames: { "root/values/record": "Record" } }),
    ).toThrow();
  });

  it.each([
    ['<root><alpha x="1"/></root>', { root: "record" } as const, "Root record is not supported"],
    [
      '<root id="root"><values size="1"><alpha x="1"/></values></root>',
      { "root/values": "record" } as const,
      "must not have attributes",
    ],
    [
      '<root id="root"><values><alpha x="1"/><alpha x="2"/></values></root>',
      { "root/values": "record" } as const,
      "must have unique child tags",
    ],
    [
      '<root id="root"><values><alpha><item x="1"/><item x="2"/></alpha></values></root>',
      { "root/values": "record" } as const,
      "Record values cannot be lists",
    ],
    [
      '<root id="root"><values><alpha x="1"/><beta size="2"><item x="1"/><item x="2"/></beta></values></root>',
      { "root/values": "record" } as const,
      "Cannot merge object and metalist",
    ],
  ])("rejects unsupported record structures: %s", (xml, forceKind, message) => {
    expect(() => generateSchema(document(xml), { forceKind })).toThrow(message);
  });

  it("does not automatically infer records", () => {
    const entries = generateSchema(
      document('<root id="root"><values><alpha x="1"/><beta y="2"/></values></root>'),
    );
    expect(generateCode(entries)).not.toContain("Record<string,");
  });

  it("rejects mixing record and object containers in a merge group", () => {
    expect(() =>
      generateSchema(document('<root id="root"><a><item x="1"/></a><b text="hello"/></root>'), {
        forceKind: { "root/a": "record" },
        mergeSchemas: { mixed: ["root/a", "root/b"] },
      }),
    ).toThrow("Cannot merge record and object/metalist");
  });
});

describe("forceKind item tags", () => {
  it("supports readonly tuples returned by a config callback", async () => {
    const config = await defineConfig({
      input: "*.xml",
      out: "schema.ts",
      forceKind(location) {
        return location.join("/") === "root/items" ? (["list", "entry"] as const) : undefined;
      },
    });
    const entries = generateSchema(
      document('<root id="root"><items><entry text="one"/></items></root>'),
      config,
    );
    expect(generateCode(entries)).toContain('// @xml-schema list "entry"\n  items: Entry[];');
  });

  it("recognizes singleton metalist items without a merge group", () => {
    const entries = generateSchema(
      document('<foo size="1"><note title="meta"/><bar text="one"/></foo>'),
      {
        forceKind: { foo: ["metalist", "bar"] },
      },
    );
    const foo = at(entries, "foo");
    expect(foo).toMatchObject({ kind: "metalist", itemTag: "bar" });
    expect(foo.properties).toHaveProperty("note");
    expect(foo.properties).not.toHaveProperty("bar");
    expect(generateCode(entries)).toContain("items: {\n    text: string;");
  });

  it.each(["list", "metalist"] as const)("rejects legacy bare %s at runtime", (kind) => {
    expect(() =>
      generateSchema(document('<root x="3"/>'), {
        // @ts-expect-error Legacy string-only list/metalist options are intentionally unsupported.
        forceKind: { root: kind },
      }),
    ).toThrow("Invalid forceKind option at root: list/metalist require [kind, itemTag].");
  });

  it("rejects an empty item tag", () => {
    expect(() =>
      generateSchema(document('<root x="3"/>'), { forceKind: { root: ["list", ""] } }),
    ).toThrow("Invalid forceKind option at root");
  });

  it("rejects a nonmatching child even if there is only one child tag", () => {
    expect(() =>
      generateSchema(document('<items><wrong x="3"/></items>'), {
        forceKind: { items: ["list", "item"] },
      }),
    ).toThrow("expects item tag item, but found unexpected child tags: wrong");
  });

  it("rejects repeating metadata children outside the specified metalist item tag", () => {
    expect(() =>
      generateSchema(
        document('<foo size="1"><bar x="3"/><note text="one"/><note text="two"/></foo>'),
        {
          forceKind: { foo: ["metalist", "bar"] },
        },
      ),
    ).toThrow(
      "Metalist node at foo has repeating non-item child tags: note. Expected item tag bar.",
    );
  });

  it("does not use a different specified tag to resolve an empty list", () => {
    expect(() =>
      generateSchema(
        document('<root id="root"><empty/><full><other x="3"/><other x="4"/></full></root>'),
        {
          forceKind: { "root/empty": ["list", "item"] },
          mergeSchemas: { lists: ["root/empty", "root/full"] },
        },
      ),
    ).toThrow("Cannot merge lists with different item tags or item types");
  });
});

describe("empty metalists resolved by merging", () => {
  it.each([false, true])(
    "resolves grouped metalists and retains metadata (empty first: %s)",
    (emptyFirst) => {
      const empty = '<a size="0"><note title="retained"/></a>';
      const populated = '<b size="2"><item x="3"/><item x="4"/></b>';
      const data = document(
        `<root id="root">${emptyFirst ? empty + populated : populated + empty}</root>`,
      );
      const options = {
        forceKind: { "root/a": ["metalist", "item"] as const },
        mergeSchemas: { collections: ["root/a", "root/b"] },
      };
      const entries = generateSchema(data, options);
      const shared = at(entries, "root/a");
      expect(shared).toBe(at(entries, "root/b"));
      expect(shared).toMatchObject({ kind: "metalist", itemTag: "item" });
      expect(shared.properties.size).toMatchObject({
        isOptional: false,
        numberRange: { min: 0, max: 2 },
      });
      expect(shared.properties.note?.isOptional).toBe(true);
      const code = generateCode(entries, { allPropertiesOptional: true });
      expect(code).toContain('// @xml-schema metalist "item"');
      expect(code).toContain("meta: {");
      expect(code).toContain("items: {\n    x?: number;");
      expect(code).not.toContain("meta?:");
      expect(generateCode(generateSchema(data, options))).toBe(generateCode(entries));
    },
  );

  it("supports a zero-child metalist using a callback group", () => {
    const calls: string[] = [];
    const entries = generateSchema(
      document('<root id="root"><a size="0"/><b size="2"><item x="3"/><item x="4"/></b></root>'),
      {
        forceKind: { "root/a": ["metalist", "item"] },
        mergeSchemas(location) {
          const path = location.join("/");
          calls.push(path);
          return /^root\/[ab]$/.test(path) ? "collections" : undefined;
        },
      },
    );
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
    expect(calls.filter((path) => path === "root/a")).toHaveLength(1);
    expect(calls.filter((path) => path === "root/b")).toHaveLength(1);
  });

  it("uses the configured tag to recognize a singleton item instead of treating it as metadata", () => {
    const entries = generateSchema(
      document(
        '<root id="root"><a size="1"><note title="retained"/><item x="3"/></a><b size="2"><item x="4"/><item x="5"/></b></root>',
      ),
      {
        forceKind: { "root/a": ["metalist", "item"] },
        mergeSchemas: { collections: /^root\/[ab]$/ },
      },
    );
    const shared = at(entries, "root/a");
    expect(shared.properties).not.toHaveProperty("item");
    expect(shared.properties).toHaveProperty("note");
    expect(shared).toBe(at(entries, "root/b"));
    expect(generateCode(entries)).toContain("items: {\n    x: number;");
  });

  it.each([false, true])(
    "warns and uses empty metalist items after merging (grouped: %s)",
    (grouped) => {
      const { result: entries, warnings } = captureWarnings(() =>
        generateSchema(document('<root id="root"><a size="0"/><b size="0"/></root>'), {
          forceKind: { "root/a": ["metalist", "item"], "root/b": ["metalist", "item"] },
          ...(grouped ? { mergeSchemas: { collections: ["root/a", "root/b"] } } : {}),
        }),
      );
      expect(warnings).toHaveLength(grouped ? 1 : 2);
      expect(warnings.join("\n")).toContain("root/a");
      expect(warnings.join("\n")).toContain("root/b");
      expect(warnings.join("\n")).toContain('empty item interface for tag "item"');
      expect(at(entries, "root/a/item").properties).toEqual({});
      const code = generateCode(entries, { allPropertiesOptional: true });
      expect(code).toContain('// @xml-schema metalist "item"');
      expect(code).toContain("items: {\n  }[];");
      expect(code).not.toContain("meta?:");
      expect(code).not.toContain("items?:");
      expect(code).not.toContain("interface Item");
    },
  );

  it("warns for top-level unresolved metalists and retains metadata", () => {
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(document('<a size="0"/>'), { forceKind: { a: ["metalist", "item"] } }),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("after merging at XML paths: a;");
    expect(generateCode(entries)).toContain("size: number;");
  });

  it("does not use item evidence from a different group", () => {
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(
        document('<root id="root"><a size="0"/><b size="2"><item x="3"/><item x="4"/></b></root>'),
        {
          forceKind: { "root/a": ["metalist", "item"] },
          mergeSchemas: { empty: "root/a", populated: "root/b" },
        },
      ),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("after merging at XML paths: root/a;");
    expect(at(entries, "root/a/item").properties).toEqual({});
    expect(at(entries, "root/b/item").properties).toHaveProperty("x");
  });

  it("rejects conflicting item tags even when one member is empty", () => {
    expect(() =>
      generateSchema(
        document(
          '<root id="root"><a size="0"/><b size="2"><left x="3"/><left x="4"/></b><c size="2"><right x="5"/><right x="6"/></c></root>',
        ),
        {
          forceKind: { "root/a": ["metalist", "item"] },
          mergeSchemas: { collections: /^root\/[abc]$/ },
        },
      ),
    ).toThrow("Cannot merge metalists with different item tags or item types");
  });
});

describe("empty lists resolved by merging", () => {
  it.each([false, true])(
    "resolves a list through a merged parent regardless of traversal order (empty first: %s)",
    (emptyFirst) => {
      const empty = '<a id="a"><items/></a>';
      const populated = '<b id="b"><items><item text="test"/><item text="other"/></items></b>';
      const data = document(
        `<root id="root">${emptyFirst ? empty + populated : populated + empty}</root>`,
      );
      const entries = generateSchema(data, {
        forceKind: { "root/a/items": ["list", "item"] },
        mergeSchemas: { parents: ["root/a", "root/b"] },
      });
      const parent = at(entries, "root/a");
      expect(parent).toBe(at(entries, "root/b"));
      expect(parent.properties.items).toMatchObject({
        isOptional: false,
        type: { kind: "list", itemTag: "item" },
      });
      expect(generateCode(entries)).toContain('// @xml-schema list "item"\n  items: Item[];');
    },
  );

  it.each([false, true])(
    "resolves directly grouped list containers (empty first: %s)",
    (emptyFirst) => {
      const empty = "<empty/>";
      const populated = '<full><item text="test"/><item text="other"/></full>';
      const entries = generateSchema(
        document(`<root id="root">${emptyFirst ? empty + populated : populated + empty}</root>`),
        {
          forceKind: { "root/empty": ["list", "item"] },
          mergeSchemas: { lists: ["root/empty", "root/full"] },
        },
      );
      const parent = at(entries, "root");
      expect(parent.properties.empty?.type).toEqual(parent.properties.full?.type);
      expect(generateCode(entries)).toContain('// @xml-schema list "item"\n  empty: Item[];');
      expect(generateCode(entries)).toContain('// @xml-schema list "item"\n  full: Item[];');
    },
  );

  it("supports regex and callback groups for list containers", () => {
    const data = document(
      '<root id="root"><a/><b><item text="test"/><item text="other"/></b></root>',
    );
    const record = generateSchema(data, {
      forceKind: { "root/a": ["list", "item"] },
      mergeSchemas: { lists: /^root\/[ab]$/ },
    });
    const calls: string[] = [];
    const callback = generateSchema(data, {
      forceKind: { "root/a": ["list", "item"] },
      mergeSchemas(location) {
        const path = location.join("/");
        calls.push(path);
        return /^root\/[ab]$/.test(path) ? "lists" : undefined;
      },
    });
    expect(generateCode(callback)).toBe(generateCode(record));
    expect(calls.filter((path) => path === "root/a")).toHaveLength(1);
    expect(calls.filter((path) => path === "root/b")).toHaveLength(1);
  });

  it("resolves an empty top-level list from its group without generating a parent interface", () => {
    expect(() =>
      generateSchema(document('<empty/><full><item text="test"/><item text="other"/></full>'), {
        forceKind: { empty: ["list", "item"] },
        mergeSchemas: { lists: ["empty", "full"] },
      }),
    ).not.toThrow();
  });

  it.each([false, true])(
    "warns and generates empty item interfaces after merging (grouped: %s)",
    (grouped) => {
      const { result: entries, warnings } = captureWarnings(() =>
        generateSchema(document('<root id="root"><a/><b/></root>'), {
          forceKind: { "root/a": ["list", "item"], "root/b": ["list", "item"] },
          ...(grouped ? { mergeSchemas: { lists: ["root/a", "root/b"] } } : {}),
        }),
      );
      expect(warnings).toHaveLength(grouped ? 1 : 2);
      expect(warnings.join("\n")).toContain("root/a");
      expect(warnings.join("\n")).toContain("root/b");
      expect(at(entries, "root/a/item").properties).toEqual({});
      expect(at(entries, "root/a/item") === at(entries, "root/b/item")).toBe(grouped);
      expect(generateCode(entries)).toContain('// @xml-schema list "item"');
      expect(generateCode(entries)).not.toContain("never");
    },
  );

  it("generates a named empty interface for an unresolved top-level list", () => {
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(document("<empty/>"), { forceKind: { empty: ["list", "item"] } }),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("after merging at XML paths: empty;");
    expect(generateCode(entries, { interfaceNames: { "empty/item": "MissingItem" } })).toContain(
      "// @xml-schema\nexport interface MissingItem {\n}",
    );
  });

  it("does not borrow evidence from unrelated groups", () => {
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(
        document('<root id="root"><a/><b><item text="test"/><item text="other"/></b></root>'),
        {
          forceKind: { "root/a": ["list", "item"] },
          mergeSchemas: { empty: "root/a", populated: "root/b" },
        },
      ),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("after merging at XML paths: root/a;");
    expect(at(entries, "root/a/item").properties).toEqual({});
    expect(at(entries, "root/b/item").properties).toHaveProperty("text");
  });

  it("shares an empty item interface for lists in merged parents", () => {
    const { result: entries, warnings } = captureWarnings(() =>
      generateSchema(
        document('<root id="root"><a id="a"><items/></a><b id="b"><items/></b></root>'),
        {
          forceKind: { "root/a/items": ["list", "item"], "root/b/items": ["list", "item"] },
          mergeSchemas: { parents: ["root/a", "root/b"] },
        },
      ),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("root/a/items, root/b/items");
    expect(at(entries, "root/a/items/item")).toBe(at(entries, "root/b/items/item"));
    expect(generateCode(entries)).toContain('// @xml-schema list "item"\n  items: Item[];');
  });

  it("does not warn when merging supplies the item schema", () => {
    const { warnings } = captureWarnings(() =>
      generateSchema(
        document('<root id="root"><a/><b><item text="test"/><item text="other"/></b></root>'),
        {
          forceKind: { "root/a": ["list", "item"] },
          mergeSchemas: { lists: ["root/a", "root/b"] },
        },
      ),
    );
    expect(warnings).toEqual([]);
  });

  it("propagates item evidence from merged parents to other members of the same list group", () => {
    const entries = generateSchema(
      document(
        '<root id="root"><a id="a"><items/></a><b id="b"><items><item text="test"/><item text="other"/></items></b><other/></root>',
      ),
      {
        forceKind: { "root/a/items": ["list", "item"], "root/other": ["list", "item"] },
        mergeSchemas: { parents: ["root/a", "root/b"], lists: ["root/a/items", "root/other"] },
      },
    );
    expect(generateCode(entries)).toContain('// @xml-schema list "item"\n  other: Item[];');
  });

  it("still rejects multiple child tags", () => {
    expect(() =>
      generateSchema(document('<root id="root"><items><a x="3"/><b y="4"/></items></root>'), {
        forceKind: { "root/items": ["list", "item"] },
      }),
    ).toThrow(
      "List node at root/items expects item tag item, but found unexpected child tags: a, b",
    );
  });

  it("rejects conflicting item tags in grouped lists", () => {
    expect(() =>
      generateSchema(
        document(
          '<root id="root"><a/><b><left x="3"/><left x="4"/></b><c><right x="5"/><right x="6"/></c></root>',
        ),
        {
          forceKind: { "root/a": ["list", "item"] },
          mergeSchemas: { lists: ["root/a", "root/b", "root/c"] },
        },
      ),
    ).toThrow("Cannot merge lists with different item tags or item types");
  });

  it("rejects mixing list containers with object schemas in a group", () => {
    expect(() =>
      generateSchema(document('<root id="root"><a/><b x="3"/></root>'), {
        forceKind: { "root/a": ["list", "item"] },
        mergeSchemas: { mixed: ["root/a", "root/b"] },
      }),
    ).toThrow("Cannot merge list and object/metalist in mergeSchemas group mixed");
  });
});

describe("attributeTypes", () => {
  it("overrides present attributes by name without adding missing attributes or changing child elements", async () => {
    const config = await defineConfig({
      input: "*.xml",
      out: "schema.ts",
      attributeTypes: { text: "string" },
    });
    const data = document(
      '<root id="test"><a text="123"/><b text="true"/><other value="3"/><text value="4"/></root>',
    );
    const original = generateSchema(data);
    const entries = generateSchema(data, config);
    expect(at(entries, "root/a").properties.text?.type).toEqual({ kind: "inline", type: "string" });
    expect(at(entries, "root/a")).toBe(at(entries, "root/b"));
    expect(at(entries, "root/other").properties).not.toHaveProperty("text");
    expect(at(entries, "root").properties.text?.type.kind).toBe("object");
    expect(generateCode(entries)).toContain("text: string;");
    expect(generateSchema(data)).toEqual(original);
  });

  it("supports path-aware callbacks and preserves inference when undefined is returned", () => {
    const calls: string[] = [];
    const entries = generateSchema(
      document('<root id="test"><label text="123"/><other text="456"/></root>'),
      {
        attributeTypes(name, location) {
          calls.push(`${location.join("/")}/@${name}`);
          return name === "text" && location.at(-1) === "label" ? "string" : undefined;
        },
      },
    );
    expect(at(entries, "root/label").properties.text?.type).toEqual({
      kind: "inline",
      type: "string",
    });
    expect(at(entries, "root/other").properties.text?.type).toEqual({
      kind: "inline",
      type: "number",
    });
    expect(calls.toSorted()).toEqual(["root/@id", "root/label/@text", "root/other/@text"]);
  });

  it("preserves metadata for unchanged types and clears it when replacing a union", () => {
    const data = document('<a text="123" value="3"/>', '<a text="true" value="5"/>');
    const original = at(generateSchema(data), "a");
    const corrected = at(
      generateSchema(data, { attributeTypes: { text: "string", value: "number" } }),
      "a",
    );
    expect(corrected.properties.value).toEqual(original.properties.value);
    expect(corrected.properties.text).toMatchObject({
      type: { kind: "inline", type: "string" },
      possibleValues: null,
      numberRange: null,
    });
  });

  it("preserves optionality and lets schemaOverrides take precedence", () => {
    const data = document('<a value="3"/>', '<a value="4" text="123"/>');
    const entries = generateSchema(data, { attributeTypes: { text: "string" } });
    expect(at(entries, "a").properties.text?.isOptional).toBe(true);
    const overridden = generateSchema(data, {
      attributeTypes: { text: "string" },
      schemaOverrides: { a: { properties: { text: { type: "number", optional: false } } } },
    });
    expect(at(overridden, "a").properties.text).toMatchObject({
      type: { kind: "inline", type: "number" },
      isOptional: false,
    });
  });

  it("applies before predefined schema matching", () => {
    const entries = generateSchema(document('<root id="test"><a text="123"/></root>'), {
      attributeTypes: { text: "string" },
      predefinedSchemas: {
        "./shared": {
          Text: { kind: "object", properties: { text: { type: "string", optional: false } } },
        },
      },
    });
    expect(generateCode(entries)).toContain('import type { Text } from "./shared";');
  });

  it("applies to metalist metadata and its inlined items", () => {
    const entries = generateSchema(
      document('<foo text="123"><item text="456"/><item text="789"/></foo>'),
      {
        attributeTypes: { text: "string" },
      },
    );
    const code = generateCode(entries);
    expect(code).toContain("meta: {\n    text: string;");
    expect(code).toContain("items: {\n    text: string;");
  });
});

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

  it.each([false, true])(
    "matches predefined schemas after overrides and explicit merging (callback: %s)",
    (callback) => {
      const override = { properties: { y: { type: "string" as const, optional: true } } };
      const entries = generateSchema(document('<root id="test"><a x="3"/><b x="4"/></root>'), {
        mergeSchemas: { point: ["root/a", "root/b"] },
        schemaOverrides: callback
          ? (location) => (/^root\/[ab]$/.test(location.join("/")) ? override : undefined)
          : { "root/a": override, "root/b": override },
        predefinedSchemas: {
          "./shared": {
            Point: {
              kind: "object",
              properties: {
                x: { type: "number", optional: false },
                y: { type: "string", optional: true },
              },
            },
          },
        },
      });
      const code = generateCode(entries);
      expect(code).toContain('import type { Point } from "./shared";');
      expect(code).toContain("a: Point;");
      expect(code).toContain("b: Point;");
      expect(entries).toHaveLength(1);
    },
  );

  it("matches predefined schemas after overrides and automatic record item merging", () => {
    const entries = generateSchema(
      document('<root id="test"><values><alpha x="3"/><beta x="4"/></values></root>'),
      {
        forceKind: { "root/values": "record" },
        schemaOverrides: (location) =>
          location.length === 3
            ? { properties: { y: { type: "string", optional: true } } }
            : undefined,
        predefinedSchemas: {
          "./shared": {
            Point: {
              kind: "object",
              properties: {
                x: { type: "number", optional: false },
                y: { type: "string", optional: true },
              },
            },
          },
        },
      },
    );
    const code = generateCode(entries);
    expect(code).toContain('import type { Point } from "./shared";');
    expect(code).toContain("values: Record<string, Point>;");
    expect(entries).toHaveLength(1);
  });

  it("matches predefined schemas only after the whole override and merge group is complete", () => {
    const entries = generateSchema(document('<root id="test"><a x="3"/><b y="4"/></root>'), {
      mergeSchemas: { point: ["root/a", "root/b"] },
      schemaOverrides: { "root/a": { properties: { x: { type: "string", optional: false } } } },
      predefinedSchemas: {
        "./shared": {
          Point: {
            kind: "object",
            properties: {
              x: { type: "string", optional: true },
              y: { type: "number", optional: true },
            },
          },
        },
      },
    });
    const code = generateCode(entries);
    expect(code).toContain('import type { Point } from "./shared";');
    expect(code).toContain("a: Point;");
    expect(code).toContain("b: Point;");
    expect(entries).toHaveLength(1);
  });

  it.each(["list", "metalist"] as const)(
    "updates predefined item references inside %s and preserves other local references",
    (kind) => {
      const entries = generateSchema(
        document(
          `<root id="test"><values${kind === "metalist" ? ' size="2"' : ""}><item x="3"/><item x="4"/></values><tail label="retained"/></root>`,
        ),
        {
          forceKind: { "root/values": [kind, "item"] },
          mergeSchemas: { point: "root/values/item" },
          schemaOverrides: {
            "root/values/item": { properties: { x: { type: "string", optional: true } } },
          },
          predefinedSchemas: {
            "./shared": {
              Point: { kind: "object", properties: { x: { type: "string", optional: true } } },
            },
          },
        },
      );
      const code = generateCode(entries);
      expect(code).toContain('import type { Point } from "./shared";');
      expect(code).toContain(kind === "list" ? "values: Point[];" : "items: Point[];");
      expect(code).toContain("tail: Tail;");
      expect(code).toContain("label: string;");
      expect(code).not.toContain("interface Item");
      expect(
        entries.some((entry) =>
          entry.xmlLocations.some((location) => location.join("/") === "root/values/item"),
        ),
      ).toBe(false);
    },
  );

  it("deduplicates unions whose grouped members resolve to the same predefined schema", () => {
    const entries = generateSchema(
      document(
        '<root id="test"><a id="a"><point x="3"/></a><b id="b"><point x="4"/></b><tail label="retained"/></root>',
      ),
      {
        mergeSchemas: {
          parents: ["root/a", "root/b"],
          first: "root/a/point",
          second: "root/b/point",
        },
        schemaOverrides: (location) =>
          location.at(-1) === "point"
            ? { properties: { x: { type: "string", optional: true } } }
            : undefined,
        predefinedSchemas: {
          "./shared": {
            Point: { kind: "object", properties: { x: { type: "string", optional: true } } },
          },
        },
      },
    );
    const parent = at(entries, "root/a");
    expect(parent).toBe(at(entries, "root/b"));
    expect(parent.properties.point?.type).toEqual({
      kind: "object",
      ref: { kind: "external", importPath: "./shared", name: "Point" },
    });
    const code = generateCode(entries);
    expect(code).toContain("point: Point;");
    expect(code).toContain("tail: Tail;");
    expect(code).toContain("a: A;");
    expect(code).toContain("b: A;");
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

  it.each(["missing", "root/missing"])(
    "rejects an exact selector with no object or metalist: %s",
    (path) => {
      expect(() =>
        generateSchema(
          document('<root id="test"><items><item x="3"/><item x="4"/></items></root>'),
          {
            mergeSchemas: { point: path },
          },
        ),
      ).toThrow(`No schema for mergeSchemas XML paths: ${path}`);
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
