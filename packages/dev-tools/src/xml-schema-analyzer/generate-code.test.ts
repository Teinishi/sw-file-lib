import ts from "typescript";
import { describe, expect, it } from "vitest";
import { parseSwXml } from "@sw-file-lib/xml";
import { analyzeFile } from "../xml-schema-codegen/analyzer";
import { analyzeDocument } from "./analyzer/document";
import { generateCode } from "./generate-code";
import { OrderGraph } from "./order-graph";
import { generateSchema, type SchemaEntry, type SchemaTypeData } from "./schema";

function entry(paths: string[], properties: Record<string, SchemaTypeData> = {}): SchemaEntry {
  const childOrder = new OrderGraph<string>();
  childOrder.addSequence(Object.keys(properties));
  return {
    kind: "object",
    xmlLocations: paths.map((path) => path.split("/")),
    properties: Object.fromEntries(
      Object.entries(properties).map(([key, type]) => [
        key,
        {
          key,
          type,
          isOptional: false,
          possibleValues: null,
          numberRange: null,
        },
      ]),
    ),
    attributeOrder: new OrderGraph<string>(),
    childOrder,
  };
}

describe("metalist interfaces", () => {
  function schemas(xml: string) {
    return generateSchema(analyzeDocument(parseSwXml(xml), undefined));
  }

  function analyzeGenerated(code: string) {
    const filename = "generated-metalist.ts";
    const source = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);
    const host = ts.createCompilerHost({ noLib: true });
    host.getSourceFile = (file) => (file === filename ? source : undefined);
    const program = ts.createProgram([filename], { noLib: true }, host);
    return analyzeFile(program.getTypeChecker(), source, {
      input: [filename],
      outDir: ".",
      tsconfig: "unused",
    });
  }

  it("emits required meta and items wrappers with a declaration marker and a plain parent reference", () => {
    const entries = schemas(
      '<root id="test"><foo size="2"><bar text="a"/><bar text="b"/></foo></root>',
    );
    const code = generateCode(entries);
    expect(code).toContain(
      '// @xml-schema metalist "bar"\nexport interface Foo {\n  meta: {\n    size: number;\n  };\n  items: {\n    text: string;\n  }[];\n}',
    );
    expect(code).toContain("foo: Foo;");
    expect(code).not.toContain("export interface Bar ");
    expect(code).not.toContain('// @xml-schema metalist "bar"\n  foo');
    const result = analyzeGenerated(code);
    expect(result?.schemas.find((schema) => schema.name === "Foo")?.schema).toMatchObject({
      kind: "metalist",
      itemTag: "bar",
      metaMembers: [{ name: "size", optional: false, type: { kind: "number" } }],
      itemType: {
        kind: "object",
        members: [{ name: "text", optional: false, type: { kind: "string" } }],
      },
    });
  });

  it("keeps structural wrappers required while making their contents and parent optional", () => {
    const code = generateCode(
      schemas('<root id="test"><foo size="2"><bar text="a"/><bar text="b"/></foo></root>'),
      {
        allPropertiesOptional: true,
      },
    );
    expect(code).toContain(
      "interface Foo {\n  meta: {\n    size?: number;\n  };\n  items: {\n    text?: string;\n  }[];",
    );
    expect(code).toContain("foo?: Foo;");
    expect(code).not.toContain("meta?:");
    expect(code).not.toContain("items?:");
    expect(
      analyzeGenerated(code)?.schemas.find((schema) => schema.name === "Foo")?.schema.kind,
    ).toBe("metalist");
  });

  it("keeps an item interface shared with a normal list", () => {
    const code = generateCode(
      schemas(
        '<root id="test"><foo size="2"><bar text="a"/><bar text="b"/></foo><others><bar text="c"/><bar text="d"/></others></root>',
      ),
    );
    expect(code).toContain("export interface Bar {");
    expect(code).toContain('// @xml-schema list "bar"\n  others: Bar[];');
    expect(code).toContain("items: {\n    text: string;");
  });

  it("keeps an item interface referenced by a normal child property", () => {
    const code = generateCode(
      schemas(
        '<root id="test"><foo size="2"><bar text="a"/><bar text="b"/></foo><other text="c"/></root>',
      ),
    );
    expect(code).toContain("export interface Bar {");
    expect(code).toContain("other: Bar;");
  });

  it("keeps a shared item interface used at another root XML location", () => {
    const code = generateCode(
      schemas('<plain text="c"/><foo size="2"><bar text="a"/><bar text="b"/></foo>'),
    );
    expect(code).toContain("export interface Plain {");
    expect(code).toContain("export interface Foo {");
  });

  it("keeps interfaces referenced from an inlined item", () => {
    const code = generateCode(
      schemas(
        '<foo size="2"><bar text="a"><detail value="3"/></bar><bar text="b"><detail value="4"/></bar></foo>',
      ),
    );
    expect(code).not.toContain("export interface Bar ");
    expect(code).toContain("export interface Detail {");
    expect(code).toContain("detail: Detail;");
  });

  it("preserves non-repeating child elements as metadata", () => {
    const code = generateCode(
      schemas('<foo size="2"><title text="title"/><bar text="a"/><bar text="b"/></foo>'),
    );
    expect(code).toContain("meta: {\n    size: number;\n    title:");
    expect(code).toContain("items: {\n    text: string;");
  });

  it("allows renamed metalist interfaces and overrides on their metadata", () => {
    const entries = generateSchema(
      analyzeDocument(parseSwXml('<foo size="2"><bar text="a"/><bar text="b"/></foo>'), undefined),
      {
        schemaOverrides: { foo: { properties: { size: { type: "string", optional: true } } } },
      },
    );
    expect(generateCode(entries, { interfaceNames: { foo: "CustomFoo" } })).toContain(
      "interface CustomFoo {\n  meta: {\n    size?: string;",
    );
  });

  it("supports external predefined item types without replacing the metalist with its metadata", () => {
    const entries = generateSchema(
      analyzeDocument(parseSwXml('<foo size="2"><bar text="a"/><bar text="b"/></foo>'), undefined),
      {
        predefinedSchemas: {
          "./shared": {
            Item: { kind: "object", properties: { text: { type: "string", optional: false } } },
            Meta: { kind: "object", properties: { size: { type: "number", optional: false } } },
          },
        },
      },
    );
    const code = generateCode(entries);
    expect(code).toContain('import type { Item } from "./shared";');
    expect(code).toContain("interface Foo {\n  meta: {\n    size: number;");
    expect(code).toContain("items: Item[];");
  });

  it("represents nested metalists through marked interface references", () => {
    const code = generateCode(
      schemas(
        '<foo size="2"><bar size="2"><item text="a"/><item text="b"/></bar><bar size="2"><item text="c"/><item text="d"/></bar></foo>',
      ),
    );
    expect(code).toContain('// @xml-schema metalist "bar"\nexport interface Foo');
    expect(code).toContain('// @xml-schema metalist "item"\nexport interface Bar');
    expect(code).toContain("items: Bar[];");
    const result = analyzeGenerated(code);
    expect(result?.schemas.find((schema) => schema.name === "Foo")?.schema).toMatchObject({
      kind: "metalist",
      itemType: { kind: "identifier", name: "Bar" },
    });
  });

  it("rejects metalist items that are unrepresentable list containers", () => {
    const entries = schemas(
      '<foo size="2"><bar><item text="a"/><item text="b"/></bar><bar><item text="c"/><item text="d"/></bar></foo>',
    );
    expect(() => generateCode(entries)).toThrow("Cannot represent metalist item type at Foo.items");
  });

  it("uses a normal list marker when metalists are list items", () => {
    const code = generateCode(
      schemas(
        '<root id="test"><foos><foo size="2"><bar text="a"/><bar text="b"/></foo><foo size="2"><bar text="c"/><bar text="d"/></foo></foos></root>',
      ),
    );
    expect(code).toContain('// @xml-schema list "foo"\n  foos: Foo[];');
    expect(code).toContain('// @xml-schema metalist "bar"\nexport interface Foo');
  });

  it("retains an empty required metadata object when metalist is forced", () => {
    const entries = generateSchema(
      analyzeDocument(parseSwXml('<foo><bar text="a"/><bar text="b"/></foo>'), undefined),
      {
        forceKind: { foo: "metalist" },
      },
    );
    const code = generateCode(entries, { allPropertiesOptional: true });
    expect(code).toContain("meta: {\n  };");
    expect(
      analyzeGenerated(code)?.schemas.find((schema) => schema.name === "Foo")?.schema,
    ).toMatchObject({ kind: "metalist", metaMembers: [] });
  });
});

describe("generateCode list markers", () => {
  it.each(["list"] as const)("preserves the XML item tag for %s", (kind) => {
    const entries = generateSchema(
      analyzeDocument(
        parseSwXml(`<root id="test"><items><item x="3"/><item x="4"/></items></root>`),
        undefined,
      ),
    );
    expect(generateCode(entries, { allPropertiesOptional: true })).toContain(
      `  // @xml-schema ${kind} "item"\n  items?: Item[];`,
    );
  });

  it.each(["list"] as const)("rejects %s inside a union", (kind) => {
    const type: SchemaTypeData = {
      kind: "union",
      types: [
        { kind: "inline", type: "string" },
        { kind, itemTag: "item", itemRef: { kind: "inline", type: "number" } },
      ],
    };
    expect(() => generateCode([entry(["container"], { values: type })])).toThrow(
      "Cannot represent list/metalist inside a union with one @xml-schema marker at Container.values.",
    );
  });

  it("rejects a union of lists with different item tags", () => {
    const type: SchemaTypeData = {
      kind: "union",
      types: [
        { kind: "list", itemTag: "left", itemRef: { kind: "inline", type: "number" } },
        { kind: "list", itemTag: "right", itemRef: { kind: "inline", type: "number" } },
      ],
    };
    expect(() => generateCode([entry(["container"], { values: type })])).toThrow("inside a union");
  });

  it.each([["list", "list"]] as const)("rejects nested %s/%s", (outer, inner) => {
    const type: SchemaTypeData = {
      kind: outer,
      itemTag: "outer",
      itemRef: {
        kind: inner,
        itemTag: "inner",
        itemRef: { kind: "inline", type: "number" },
      },
    };
    expect(() => generateCode([entry(["container"], { values: type })])).toThrow(
      "Cannot represent nested list/metalist with one @xml-schema marker at Container.values.",
    );
  });

  it("parenthesizes union item types without losing the array marker", () => {
    const type: SchemaTypeData = {
      kind: "list",
      itemTag: "item",
      itemRef: {
        kind: "union",
        types: [
          { kind: "inline", type: "boolean" },
          { kind: "inline", type: "number" },
        ],
      },
    };
    expect(generateCode([entry(["container"], { values: type })])).toContain(
      '// @xml-schema list "item"\n  values: (boolean | number)[];',
    );
  });
});

describe("generateCode allPropertiesOptional", () => {
  function schemas() {
    return generateSchema(
      analyzeDocument(
        parseSwXml(
          '<vehicle id="123" a-b="test"><parts><part value="abc"/><part value="def"/></parts></vehicle>',
        ),
        undefined,
      ),
      {
        schemaOverrides: {
          vehicle: {
            properties: {
              id: { type: "number", optional: false },
              comment: { type: "string", optional: true },
            },
          },
        },
      },
    );
  }

  it("makes attributes, child lists, quoted keys, and nested interface properties optional", () => {
    const entries = schemas();
    const original = generateCode(entries);
    const code = generateCode(entries, { allPropertiesOptional: true });
    expect(code).toContain("id?: number;");
    expect(code).toContain('"a-b"?: string;');
    expect(code).toContain("comment?: string;");
    expect(code).toContain("parts?: Part[];");
    expect(code).toContain("value?: string;");
    expect(generateCode(entries)).toBe(original);
  });

  it("preserves inferred and overridden optionality when false or omitted", () => {
    const entries = schemas();
    const code = generateCode(entries);
    expect(generateCode(entries, { allPropertiesOptional: false })).toBe(code);
    expect(code).toContain("id: number;");
    expect(code).toContain("comment?: string;");
    expect(code).toContain("parts: Part[];");
    expect(code).toContain("value: string;");
  });
});

describe("generateCode interface names", () => {
  const document = () =>
    analyzeDocument(
      parseSwXml(
        '<vehicle name="test"><left x="3"/><right x="4"/><bodies><body x="5"/><body x="6"/></bodies><empty/></vehicle>',
      ),
      undefined,
    );

  it("applies a name after actual schema merging without changing entries", () => {
    const entries = generateSchema(document(), {
      forceKind: { vehicle: "object", "vehicle/empty": "object" },
    });
    const merged = entries.find((item) =>
      item.xmlLocations.some((path) => path.join("/") === "vehicle/left"),
    )!;
    expect(merged.xmlLocations.map((path) => path.join("/"))).toEqual([
      "vehicle/left",
      "vehicle/right",
      "vehicle/bodies/body",
    ]);
    const code = generateCode(entries, { interfaceNames: { "vehicle/right": "SharedItem" } });
    expect(code).toContain("left: SharedItem;");
    expect(code).toContain("right: SharedItem;");
    expect(code).toContain("bodies: SharedItem[];");
  });

  it.each(["vehicle/bodies", "vehicle/empty"])("rejects a non-interface path %s", (path) => {
    const entries = generateSchema(document(), {
      forceKind: { vehicle: "object", "vehicle/empty": "object" },
    });
    expect(() => generateCode(entries, { interfaceNames: { [path]: "Unused" } })).toThrow(
      `No generated interface for XML paths: ${path}`,
    );
  });

  it("rejects naming an element replaced by a predefined schema", () => {
    const entries = generateSchema(document(), {
      forceKind: { vehicle: "object", "vehicle/empty": "object" },
      predefinedSchemas: {
        "./shared": {
          SharedItem: {
            kind: "object",
            properties: { x: { type: "number", optional: false } },
          },
        },
      },
    });
    expect(() =>
      generateCode(entries, { interfaceNames: { "vehicle/left": "LocalItem" } }),
    ).toThrow("No generated interface for XML paths: vehicle/left");
  });

  it("preserves existing automatic names and output", () => {
    expect(generateCode([entry(["vehicle/body"]), entry(["vehicle"])])).toBe(
      "export interface Body {\n}\n\nexport interface Vehicle {\n}\n",
    );
  });

  it("uses an override from any merged path in declarations and nested references", () => {
    const entries = [
      entry(["vehicle/body", "vehicle/other_body"]),
      entry(["vehicle"], {
        bodies: {
          kind: "list",
          itemTag: "body",
          itemRef: { kind: "object", ref: { kind: "internal", index: 0 } },
        },
      }),
    ];
    const code = generateCode(entries, { interfaceNames: { "vehicle/other_body": "VehicleBody" } });
    expect(code).toContain("export interface VehicleBody {");
    expect(code).toContain("bodies: VehicleBody[];");
    expect(code).toContain("export interface Vehicle {");
  });

  it("accepts the same name on merged paths and rejects conflicting names", () => {
    const entries = [entry(["a", "b"])];
    expect(generateCode(entries, { interfaceNames: { a: "Shared", b: "Shared" } })).toContain(
      "interface Shared",
    );
    expect(() => generateCode(entries, { interfaceNames: { a: "One", b: "Two" } })).toThrow(
      "a = One, b = Two",
    );
  });

  it("rejects the same explicit name on separate entries", () => {
    expect(() =>
      generateCode([entry(["a"]), entry(["b"])], {
        interfaceNames: { a: "Shared", b: "Shared" },
      }),
    ).toThrow("Duplicate interface or external import name Shared");
  });

  it("reserves explicit names before assigning automatic names", () => {
    const code = generateCode([entry(["body"]), entry(["other"]), entry(["body2"])], {
      interfaceNames: { other: "Body" },
    });
    expect(code).toContain("interface Body3");
    expect(code).toContain("interface Body {");
    expect(code).toContain("interface Body2 {");
  });

  it("detects collisions after PascalCase conversion", () => {
    const code = generateCode([entry(["foo-bar"]), entry(["foo_bar"])]);
    expect(code).toContain("interface FooBar {");
    expect(code).toContain("interface FooBar2 {");
  });

  it("avoids invalid automatic names", () => {
    const code = generateCode([entry(["123"]), entry(["---"])]);
    expect(code).toContain("interface Xml123 {");
    expect(code).toContain("interface Xml {");
  });

  it.each(["", "123Body", "Bad-Name", "class", "string", "unknown", "await", " A", "A B"])(
    "rejects invalid interface name %j",
    (name) => {
      expect(() => generateCode([entry(["a"])], { interfaceNames: { a: name } })).toThrow(
        "Invalid interface name",
      );
    },
  );

  it.each(["VehicleBody", "$Body", "_Body", "車体", "type"])("accepts name %j", (name) => {
    expect(generateCode([entry(["a"])], { interfaceNames: { a: name } })).toContain(
      `interface ${name} {`,
    );
  });

  it("rejects paths with no generated interface", () => {
    expect(() =>
      generateCode([entry(["vehicle"])], {
        interfaceNames: { "vehicle/missing": "Missing" },
      }),
    ).toThrow("No generated interface for XML paths: vehicle/missing");
  });

  it("reserves external names inside lists", () => {
    const external: SchemaTypeData = {
      kind: "list",
      itemTag: "body",
      itemRef: {
        kind: "object",
        ref: {
          kind: "external",
          importPath: "./shared",
          name: "Body",
        },
      },
    };
    const entries = [entry(["body"], { value: external })];
    const code = generateCode(entries);
    expect(code).toContain('import type { Body } from "./shared";');
    expect(code).toContain("interface Body2 {");
    expect(code).toContain('// @xml-schema list "body"\n  value: Body[];');
    expect(() => generateCode(entries, { interfaceNames: { body: "Body" } })).toThrow(
      "Duplicate interface or external import name Body",
    );
  });
});
