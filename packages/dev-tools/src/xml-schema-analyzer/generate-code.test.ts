import { describe, expect, it } from "vitest";
import { parseSwXml } from "@sw-file-lib/xml";
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
        bodies: { kind: "list", itemRef: { kind: "object", ref: { kind: "internal", index: 0 } } },
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

  it("reserves external names inside unions and lists", () => {
    const external: SchemaTypeData = {
      kind: "union",
      types: [
        { kind: "inline", type: "string" },
        {
          kind: "metalist",
          itemRef: {
            kind: "object",
            ref: {
              kind: "external",
              importPath: "./shared",
              name: "Body",
            },
          },
        },
      ],
    };
    const entries = [entry(["body"], { value: external })];
    const code = generateCode(entries);
    expect(code).toContain('import type { Body } from "./shared";');
    expect(code).toContain("interface Body2 {");
    expect(code).toContain("value: string | Body[];");
    expect(() => generateCode(entries, { interfaceNames: { body: "Body" } })).toThrow(
      "Duplicate interface or external import name Body",
    );
  });
});
