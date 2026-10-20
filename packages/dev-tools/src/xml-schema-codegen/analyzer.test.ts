import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { analyzeFile } from "./analyzer";
import { generateImmutableInterfaceCode, generateSchemaCode } from "./generate-code";

function analyze(source: string, otherFiles: Record<string, string> = {}, inputs?: string[]) {
  const files = new Map(
    Object.entries({ "input.ts": source, ...otherFiles }).map(([file, content]) => [
      path.resolve(file),
      content,
    ]),
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
  it.each(["Record<string, Item>", "Array<Item>", "Promise<Item>", "Box<Item>"])(
    "rejects generic reference %s",
    (type) => {
      expect(() => analyze(member(`value: ${type};`))).toThrow(
        /Generic type references are unsupported: .*input\.ts\(/,
      );
    },
  );

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
