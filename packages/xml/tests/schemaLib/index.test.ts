import { describe, test, expect, vi } from "vitest";
import { parseSwXml, x } from "@xml";
import type { DuplicateChildElementCallback, UnknownFieldCallback } from "../../src/schemaLib";

describe("schemaLib", () => {
  test("schema of each types", () => {
    const schema = x.object({
      string: x.string(),
      integer: x.number(),
      decimal: x.number(),
      trueValue: x.boolean(),
      falseValue: x.boolean(),
    });

    const xml =
      '<types string="hello" integer="123" decimal="45.67" trueValue="true" falseValue="false"/>';

    const result = schema.parseTree(parseSwXml(xml), "types");

    expect(result).toEqual({
      string: "hello",
      integer: 123,
      decimal: 45.67,
      trueValue: true,
      falseValue: false,
    });

    const serialized = schema.serialize("types", result, { xmlDeclaration: false }).toString();
    expect(serialized).toBe(xml);
  });

  test("schema of union", () => {
    const schema = x.object({
      stringOrNumber: x.union([x.number(), x.string()]),
      numberOrBoolean: x.union([x.boolean(), x.number()]),
      stringOrBoolean: x.union([x.boolean(), x.string()]),
      allTypes: x.union([x.boolean(), x.number(), x.string()]),
    });

    const xml =
      '<union stringOrNumber="hello" numberOrBoolean="123" stringOrBoolean="false" allTypes="42"/>';

    const result = schema.parseTree(parseSwXml(xml), "union");

    expect(result).toEqual({
      stringOrNumber: "hello",
      numberOrBoolean: 123,
      stringOrBoolean: false,
      allTypes: 42,
    });

    const serialized = schema.serialize("union", result, { xmlDeclaration: false }).toString();
    expect(serialized).toBe(xml);
  });

  test("deep nested", () => {
    const schema = x.object({
      nested: x.object({
        id: x.number(),
        level1: x.object({
          name: x.string(),
          level2: x.object({
            name: x.string(),
            level3: x.object({
              name: x.string(),
              value: x.object({
                text: x.string(),
              }),
            }),
          }),
        }),
      }),
    });

    const xml = `<root>
  <nested id="400">
    <level1 name="one">
      <level2 name="two">
        <level3 name="three">
          <value text="deep value"/>
        </level3>
      </level2>
    </level1>
  </nested>
</root>
`;

    const result = schema.parseTree(parseSwXml(xml), "root");

    expect(result).toEqual({
      nested: {
        id: 400,
        level1: {
          name: "one",
          level2: {
            name: "two",
            level3: {
              name: "three",
              value: {
                text: "deep value",
              },
            },
          },
        },
      },
    });

    const serialized = schema
      .serialize("root", result, { xmlDeclaration: false, indentString: "  ", pretty: true })
      .toString();
    expect(serialized).toBe(xml);
  });

  test("general schema", () => {
    const schema = x.object({
      name: x.string(),
      version: x.string(),
      enabled: x.boolean(),
      optional: x.number().optional(),
      metadata: x.object({
        id: x.number(),
        active: x.boolean(),
      }),
      tags: x.list("tag", x.partialObject({ name: x.string() })),
      items: x.metalist(
        "item",
        x.object({
          id: x.number(),
          enabled: x.boolean(),
          name: x.object({
            text: x.string(),
          }),
        }),
        x.object({
          id: x.number(),
          value: x.number(),
          flag: x.boolean(),
          name: x.string(),
        }),
      ),
      empty: x.object({
        content: x.object({
          value: x.string(),
        }),
      }),
      leaf: x.object({
        id: x.number(),
        name: x.string(),
        value: x.number(),
        enabled: x.boolean(),
      }),
      group: x.metalist(
        "member",
        x.object({
          name: x.string(),
          count: x.number(),
        }),
        x.object({
          name: x.string(),
        }),
      ),
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<test name="Test Document" version="1.5" enabled="true" optional="42">
  <metadata id="100" active="false"/>
  <tags>
    <tag name="alpha"/>
    <tag name="beta"/>
    <tag/>
  </tags>
  <items id="200" enabled="true">
    <name text="Item Collection"/>
    <item id="1" value="10" flag="true" name="First"/>
    <item id="2" value="20.5" flag="false" name="Second"/>
    <item id="3" value="30" flag="true" name="Third"/>
  </items>
  <empty>
    <content value="content"/>
  </empty>
  <leaf id="300" name="Leaf" value="123" enabled="true"/>
  <group name="Group A" count="3">
    <member name="Alice"/>
    <member name="Bob"/>
    <member name="Charlie"/>
  </group>
</test>
`;

    const result = schema.parseTree(parseSwXml(xml), "test");

    expect(result).toEqual({
      name: "Test Document",
      version: "1.5",
      enabled: true,
      optional: 42,
      metadata: { id: 100, active: false },
      tags: [{ name: "alpha" }, { name: "beta" }, {}],
      items: {
        meta: { id: 200, enabled: true, name: { text: "Item Collection" } },
        items: [
          { id: 1, value: 10, flag: true, name: "First" },
          { id: 2, value: 20.5, flag: false, name: "Second" },
          { id: 3, value: 30, flag: true, name: "Third" },
        ],
      },
      empty: { content: { value: "content" } },
      leaf: { id: 300, name: "Leaf", value: 123, enabled: true },
      group: {
        meta: { name: "Group A", count: 3 },
        items: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }],
      },
    });

    const serialized = schema
      .serialize("test", result, { indentString: "  ", pretty: true })
      .toString();
    expect(serialized).toBe(xml);
  });

  test("schema safeParse returns path-aware issues", () => {
    const schema = x.object({
      name: x.string(),
      mass: x.number(),
      position: x.object({
        x: x.number(),
        y: x.number(),
      }),
    });

    const tree = parseSwXml('<root name="Test" mass="heavy"><position x="1"/></root>');

    const result = schema.safeParseTree(tree, "root");

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Unexpected parse success");

    expect(result.error).toBeInstanceOf(x.SchemaError);
    expect(result.error.issues).toMatchObject([
      {
        code: "invalid_value",
        path: ["mass"],
        expected: "numeric_string",
        value: "heavy",
      },
      {
        code: "missing_required_field",
        path: ["position", "y"],
        expected: "string",
      },
    ]);
  });

  test("schema parsing uses schema context for single-child records", () => {
    const schema = x.object({
      surfaces: x.list(
        "surface",
        x.object({
          position: x.object({
            x: x.number(),
            y: x.number(),
            z: x.number(),
          }),
        }),
      ),
    });

    const tree = parseSwXml(
      `<root unknown_attr="0">
        <surfaces/>
        <surfaces>
          <surface>
            <position/>
            <position x="1" y="2" z="3"/>
            <unknown_child/>
          </surface>
          <unknown_item/>
        </surfaces>
      </root>`,
    );

    const options = {
      unknownField: ((_ctx, _target) => "ignore") satisfies UnknownFieldCallback,
      duplicateChildElement: ((_ctx, _target) => "last") satisfies DuplicateChildElementCallback,
    };

    const unknownFieldSpy = vi.spyOn(options, "unknownField");
    const duplicateChildElementSpy = vi.spyOn(options, "duplicateChildElement");

    const data = schema.parseTree(tree, "root", options);

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      1,
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
          { index: 0, tag: "surface" },
        ],
      },
      { kind: "child", index: 2, child: expect.objectContaining({ tag: "unknown_child" }) },
    );

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      2,
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
        ],
      },
      { kind: "child", index: 1, child: expect.objectContaining({ tag: "unknown_item" }) },
    );

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      3,
      { xmlPath: [{ index: 0, tag: "root" }] },
      { kind: "attribute", key: "unknown_attr", value: "0" },
    );

    expect(duplicateChildElementSpy).toHaveBeenNthCalledWith(
      1,
      { xmlPath: [{ index: 0, tag: "root" }] },
      "surfaces",
    );

    expect(duplicateChildElementSpy).toHaveBeenNthCalledWith(
      2,
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
          { index: 0, tag: "surface" },
        ],
      },
      "position",
    );

    expect(data.surfaces).toEqual([
      {
        position: { x: 1, y: 2, z: 3 },
      },
    ]);
  });
});
