import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as x from "@sw-file-lib/xml/xml-schema";
import { analyzeFile } from "./analyzer";
import { generateImmutableInterfaceCode, generateSchemaCode } from "./generate-code";

function analyze(source: string, otherFiles: Record<string, string> = {}, inputs?: string[]) {
  const files = new Map(
    Object.entries({
      [ts.getDefaultLibFilePath({})]: "type Record<K extends keyof any, T> = { [P in K]: T };",
      "input.ts": source,
      ...otherFiles,
    }).map(([file, content]) => [path.resolve(file), content]),
  );
  const options: ts.CompilerOptions = {
    noLib: true,
    types: [],
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
  };
  const host = ts.createCompilerHost(options);
  host.fileExists = (file) => files.has(path.resolve(file));
  host.readFile = (file) => files.get(path.resolve(file));
  host.getSourceFile = (file, version) => {
    const content = files.get(path.resolve(file));
    return content === undefined ? undefined : ts.createSourceFile(file, content, version, true);
  };
  const program = ts.createProgram([...files.keys()], options, host);
  const input = (inputs ?? [...files.keys()]).map((file) => path.resolve(file));
  return analyzeFile(program.getTypeChecker(), program.getSourceFile(path.resolve("input.ts"))!, {
    input,
    outDir: "generated",
    tsconfig: "tsconfig.json",
  });
}

function member(source: string) {
  return `// @xml-schema\nexport interface Example {\n${source}\n}`;
}

describe("unsupported codegen inputs", () => {
  it.each(["Array<Item>", "Promise<Item>", "Box<Item>"])("rejects generic reference %s", (type) => {
    expect(() => analyze(member(`value: ${type};`))).toThrow(
      /Generic type references are unsupported: .*input\.ts\(/,
    );
  });

  it.each(["value: Missing;", '// @xml-schema list "item"\nvalue: Missing[];'])(
    "rejects unresolved references: %s",
    (source) => {
      expect(() => analyze(member(source))).toThrow("Unresolved type reference");
    },
  );

  it("rejects unresolved metalist item references", () => {
    expect(() =>
      analyze(
        '// @xml-schema metalist "item"\nexport interface Example { meta: {}; items: Missing[]; }',
      ),
    ).toThrow("Unresolved type reference");
  });

  it.each(["type Item = string;", "enum Item { A }", "class Item {}"])(
    "rejects non-interface references: %s",
    (declaration) => {
      expect(() => analyze(`${declaration}\n${member("value: Item;")}`)).toThrow(
        "Type reference must target a marked interface",
      );
    },
  );

  it("rejects unmarked interface references", () => {
    expect(() => analyze(`interface Item { x: number }\n${member("value: Item;")}`)).toThrow(
      "Referenced interface has no @xml-schema marker",
    );
  });

  it.each(["items.ts", "items.d.ts"])(
    "rejects references outside generation inputs: %s",
    (file) => {
      expect(() =>
        analyze(
          `import { Item } from "./items";\n${member("value: Item;")}`,
          {
            [file]: "// @xml-schema\nexport interface Item { x: number }",
          },
          ["input.ts"],
        ),
      ).toThrow("Referenced interface is not a generation input");
    },
  );

  it("rejects renamed imports", () => {
    expect(() =>
      analyze(`import { Item as Other } from "./items";\n${member("value: Other;")}`, {
        "items.ts": "// @xml-schema\nexport interface Item { x: number }",
      }),
    ).toThrow("Renamed type references are unsupported");
  });

  it("rejects namespace-qualified references", () => {
    expect(() =>
      analyze(`import * as types from "./items";\n${member("value: types.Item;")}`, {
        "items.ts": "// @xml-schema\nexport interface Item { x: number }",
      }),
    ).toThrow("Qualified type references are unsupported");
  });

  it.each([
    "run(): string;",
    "[key: string]: string;",
    "(): string;",
    "new(): object;",
    "get value(): string;",
    "[Symbol.iterator]: string;",
  ])("rejects unsupported members: %s", (source) => {
    expect(() => analyze(member(source))).toThrow(
      /Unsupported interface member|Computed property names are unsupported/,
    );
    expect(() => analyze(member(`value: { ${source} };`))).toThrow(
      /Unsupported interface member|Computed property names are unsupported/,
    );
  });

  it("rejects interface inheritance", () => {
    expect(() =>
      analyze(
        "interface Base { x: number }\n// @xml-schema\nexport interface Example extends Base { y: string }",
      ),
    ).toThrow("Interface inheritance is unsupported");
  });

  it.each([
    ["// @xml-schema\nexport interface Example<T> { value: T }", "Generic interface declarations"],
    [
      "// @xml-schema\nexport default interface Example { value: string }",
      "Default interface exports",
    ],
    [
      "namespace Nested {\n// @xml-schema\nexport interface Example { value: string } }",
      "Nested interface declarations",
    ],
    [
      "// @xml-schema\ninterface Example { x: number }\ninterface Example { y: string }",
      "Merged interface declarations",
    ],
    ["// @xml-schema\nexport type Example = { x: number };", "Only interface declarations"],
  ])("rejects unsupported declarations: %s", (source, message) => {
    expect(() => analyze(source)).toThrow(message);
  });

  it.each([
    "any",
    "unknown",
    '"literal"',
    "number & string",
    "[number]",
    "Date",
    "Item[]",
    "(string)",
    "null",
  ])("rejects unsupported type %s", (type) => {
    expect(() => analyze(member(`value: ${type};`))).toThrow();
  });

  it.each([
    ["// @xml-schema invalid\nvalue: number;", "Unknown schema marker argument"],
    ["// @xml-schema object\nvalue: string;", "Expected type literal for object"],
    ['// @xml-schema list "item" extra\nvalue: {}[];', "Unexpected schema marker arguments"],
    ['// @xml-schema metalist "item"\nvalue: {};', "Inline metalist markers are unsupported"],
  ])("rejects unsupported property markers: %s", (source, message) => {
    expect(() => analyze(member(source))).toThrow(message);
  });
});

describe("supported codegen inputs", () => {
  it("preserves primitive, union, nested object, optional, list and metalist output", () => {
    const result = analyze(`// @xml-schema
export interface Item { value: number; }
// @xml-schema metalist "item"
export interface Collection { meta: { count: number }; items: Item[]; }
// @xml-schema
export interface Example {
  readonly title?: string;
  flag: boolean | number;
  nested: { value: string };
  item: Item;
  // @xml-schema list "item"
  values: Item[];
  collection: Collection;
}`)!;
    const example = result.schemas[2]!;
    expect(generateSchemaCode(example).code).toContain('values: x.list("item", ItemSchema)');
    expect(generateSchemaCode(example).code).toContain("collection: CollectionSchema");
    expect(generateImmutableInterfaceCode(example)).toContain(
      "readonly values: readonly ItemImmutable[]",
    );
    expect(generateImmutableInterfaceCode(example)).toContain("readonly title?: string");
    expect(generateSchemaCode(result.schemas[1]!).code).toContain("x.metalist(");
  });

  it("accepts marked interfaces imported from another input", () => {
    const result = analyze(`import { Item } from "./items";\n${member("item: Item;")}`, {
      "items.ts": "// @xml-schema\nexport interface Item { x: number }",
    })!;
    expect([...result.schemaImports.get("./items")!]).toEqual(["Item"]);
    expect(generateSchemaCode(result.schemas[0]!).code).toContain("item: ItemSchema");
  });

  it("ignores unrelated unmarked declarations", () => {
    expect(
      analyze("type Example = Record<string, unknown>; interface Other { run(): void }"),
    ).toBeUndefined();
  });
});

describe("record schemas", () => {
  it("parses and serializes XML with the generated record schema", () => {
    const example = analyze(member("values: Record<string, { value: number }>;"))!.schemas[0]!;
    const { outputText } = ts.transpileModule(generateSchemaCode(example).code, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext },
    });
    const exports: { ExampleSchema?: x.ElementSchema<unknown> } = {};
    new Function("x", "exports", outputText)(x, exports);
    const schema = exports.ExampleSchema!;
    const xml = '<root><values><alpha value="1"/><beta value="2"/></values></root>';
    const data = schema.parse(xml, "root");
    expect(data).toEqual({ values: { alpha: { value: 1 }, beta: { value: 2 } } });
    expect(schema.parse(schema.serialize(data, "root").toString(), "root")).toEqual(data);
  });

  it("generates record schemas and deeply immutable dictionary values", () => {
    const result = analyze(`// @xml-schema
export interface Item { nested: { count: number }; }
${member("values?: Record<string, Item>;")}`)!;
    const example = result.schemas[1]!;
    expect(example.schema).toMatchObject({
      members: [{ type: { kind: "record", itemType: { kind: "identifier", name: "Item" } } }],
    });
    expect(generateSchemaCode(example).code).toContain("values: x.record(ItemSchema).optional()");
    expect(generateImmutableInterfaceCode(example)).toContain(
      "readonly values?: Readonly<Record<string, ItemImmutable>>;",
    );
    expect(generateImmutableInterfaceCode(result.schemas[0]!)).toContain("readonly count: number");
    expect([...result.schemaImports.entries()]).toEqual([]);
  });

  it("supports inline and empty object values", () => {
    const example = analyze(
      member("values: Record<string, { x: number }>; empty: Record<string, {}>;"),
    )!.schemas[0]!;
    const schema = generateSchemaCode(example).code;
    expect(schema).toContain("values: x.record(x.object({");
    expect(schema).toContain("x: x.number()");
    expect(schema).toContain("empty: x.record(x.object({}))");
    const immutable = generateImmutableInterfaceCode(example);
    expect(immutable).toContain("Readonly<Record<string, {");
    expect(immutable).toContain("readonly x: number");
    expect(immutable).toContain("Readonly<Record<string, {}>>");
  });

  it("supports nested records", () => {
    const example = analyze(member("values: Record<string, Record<string, {}>>;"))!.schemas[0]!;
    expect(generateSchemaCode(example).code).toContain("x.record(x.record(x.object({})))");
    expect(generateImmutableInterfaceCode(example)).toContain(
      "Readonly<Record<string, Readonly<Record<string, {}>>>>",
    );
  });

  it("imports the item schema without importing Record", () => {
    const result = analyze(
      `import { Item } from "./items";\n${member("values: Record<string, Item>;")}`,
      {
        "items.ts": "// @xml-schema\nexport interface Item { x: number }",
      },
    )!;
    expect([...result.schemaImports.entries()].map(([file, names]) => [file, [...names]])).toEqual([
      ["./items", ["Item"]],
    ]);
  });

  it("supports metalist values and records as list and metalist items", () => {
    const result = analyze(`// @xml-schema metalist "item"
export interface Collection { meta: {}; items: Record<string, {}>[]; }
${member('values: Record<string, Collection>;\n// @xml-schema list "item"\nlist: Record<string, {}>[];')}`)!;
    expect(generateSchemaCode(result.schemas[0]!).code).toContain("x.record(x.object({}))");
    expect(generateImmutableInterfaceCode(result.schemas[0]!)).toContain(
      "readonly items: readonly Readonly<Record<string, {}>>[];",
    );
    expect(generateSchemaCode(result.schemas[1]!).code).toContain(
      "values: x.record(CollectionSchema)",
    );
    expect(generateSchemaCode(result.schemas[1]!).code).toContain(
      'list: x.list("item", x.record(x.object({})))',
    );
    expect(generateImmutableInterfaceCode(result.schemas[1]!)).toContain(
      "Readonly<Record<string, CollectionImmutable>>",
    );
  });

  it.each(["number", "symbol", '"key"', "string | number", "any", "never", "Key"])(
    "rejects non-string keys: %s",
    (key) => {
      expect(() => analyze(`type Key = string;\n${member(`values: Record<${key}, {}>;`)}`)).toThrow(
        /Record keys must be string: .*input\.ts\(/,
      );
    },
  );

  it.each(["Record", "Record<string>", "Record<string, {}, {}>"])(
    "requires exactly two arguments: %s",
    (type) => {
      expect(() => analyze(member(`values: ${type};`))).toThrow(
        "Record requires exactly two type arguments",
      );
    },
  );

  it.each([
    "string",
    "number",
    "boolean",
    "any",
    "unknown",
    "{} | { x: number }",
    "{}[]",
    "Array<{}>",
  ])("rejects unsupported record values: %s", (type) => {
    expect(() => analyze(member(`values: Record<string, ${type}>;`))).toThrow();
  });

  it("rejects unresolved record item references", () => {
    expect(() => analyze(member("values: Record<string, Missing>;"))).toThrow(
      "Unresolved type reference",
    );
  });

  it("does not recognize a custom generic named Record as the built-in type", () => {
    expect(() =>
      analyze(`import { Record } from "./custom";\n${member("values: Record<string, {}>;")}`, {
        "custom.ts": "export type Record<K, V> = { value: V };",
      }),
    ).toThrow("Generic type references are unsupported");
  });
});
