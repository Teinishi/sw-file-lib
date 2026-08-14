import { describe, test, expect, vi } from "vitest";
import { parseSwXml, x } from "@xml";

describe("schemaLib", () => {
  test("simple schema", () => {
    const schema = x.object({
      name: x.string(),
      position: x.object({
        x: x.number(),
      }),
      list: x.list("item", x.object({ name: x.string() })),
      metalist: x.metalist(
        "item",
        x.partialObject({ name: x.string(), size: x.number() }),
        x.object({ name: x.string() }),
      ),
    });
    const xml = `<root name="hello">
  <position x="1"/>
  <list>
    <item name="a"/>
  </list>
  <metalist name="hoge">
    <item name="b"/>
  </metalist>
</root>
`;
    const result = schema.parse(xml, "root");
    expect(result).toEqual({
      name: "hello",
      position: { x: 1 },
      list: [{ name: "a" }],
      metalist: {
        meta: { name: "hoge" },
        items: [{ name: "b" }],
      },
    });
    const serialized = schema
      .serialize(result, "root", { xmlDeclaration: false, indent: 2 })
      .toString();
    expect(serialized).toBe(xml);
  });

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

    const result = schema.parse(parseSwXml(xml), "types");

    expect(result).toEqual({
      string: "hello",
      integer: 123,
      decimal: 45.67,
      trueValue: true,
      falseValue: false,
    });

    const serialized = schema.serialize(result, "types", { xmlDeclaration: false }).toString();
    expect(serialized).toBe(xml);
  });

  test("attribute union", () => {
    const schema = x.object({
      stringOrNumber: x.union([x.number(), x.string()]),
      numberOrBoolean: x.union([x.boolean(), x.number()]),
      stringOrBoolean: x.union([x.boolean(), x.string()]),
      allTypes: x.union([x.boolean(), x.number(), x.string()]),
    });

    const xml =
      '<union stringOrNumber="hello" numberOrBoolean="123" stringOrBoolean="false" allTypes="42"/>';

    const result = schema.parse(parseSwXml(xml), "union");

    expect(result).toEqual({
      stringOrNumber: "hello",
      numberOrBoolean: 123,
      stringOrBoolean: false,
      allTypes: 42,
    });

    const serialized = schema.serialize(result, "union", { xmlDeclaration: false }).toString();
    expect(serialized).toBe(xml);
  });

  test("mixed union", () => {
    const schema = x.list(
      "item",
      x.object({
        value: x.union([x.number(), x.object({ text: x.string() })]),
      }),
    );

    const xml = '<list><item value="123"/><item><value text="hoge"/></item></list>';

    const result = schema.parse(parseSwXml(xml), "list");

    expect(result).toEqual([{ value: 123 }, { value: { text: "hoge" } }]);

    const serialized = schema.serialize(result, "list", { xmlDeclaration: false }).toString();
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

    const result = schema.parse(parseSwXml(xml), "root");

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
      .serialize(result, "root", { xmlDeclaration: false, indent: 2 })
      .toString();
    expect(serialized).toBe(xml);

    const schema2 = schema.extend((s) => ({
      nested: s.nested.extend((s) => ({
        level1: s.level1.extend((s) => ({
          level2: s.level2.extend((s) => ({
            level3: s.level3.extend((_) => ({
              new_attribute: x.boolean(),
            })),
          })),
        })),
      })),
    }));

    const xml2 = `<root>
  <nested id="400">
    <level1 name="one">
      <level2 name="two">
        <level3 name="three" new_attribute="true">
          <value text="deep value"/>
        </level3>
      </level2>
    </level1>
  </nested>
</root>
`;

    const result2 = schema2.parse(xml2, "root");

    const new_attribute: boolean = result2.nested.level1.level2.level3.new_attribute;

    expect(new_attribute).toBe(true);

    const serialized2 = schema2
      .serialize(result2, "root", { xmlDeclaration: false, indent: 2 })
      .toString();
    expect(serialized2).toBe(xml2);
  });

  test("schema extension", () => {
    const schema1 = x.object({
      name: x.string(),
      position: x.object({
        x: x.number(),
        y: x.number(),
      }),
    });

    const xml1 = '<root name="hello"><position x="1" y="2"/></root>';
    const result1 = schema1.parse(xml1, "root");
    expect(result1).toEqual({
      name: "hello",
      position: {
        x: 1,
        y: 2,
      },
    });

    const schema2 = schema1.extend((s) => ({
      position: s.position.extend((_) => ({
        z: x.number(),
      })),
      list: x.list(
        "item",
        x.object({
          name: x.string(),
        }),
      ),
      metalist: x
        .metalist(
          "item",
          x.object({
            size: x.number(),
          }),
          x.object({
            name: x.string(),
          }),
        )
        .optional(),
    }));

    const xml2 =
      '<root name="hello"><position x="1" y="2" z="3"/><list><item name="alpha"/></list></root>';
    const result2 = schema2.parse(xml2, "root");
    expect(result2).toEqual({
      name: "hello",
      position: {
        x: 1,
        y: 2,
        z: 3,
      },
      list: [{ name: "alpha" }],
    });

    const schema3 = schema2.extend((s) => ({
      list: s.list.extendItem((_) => ({
        num: x.number().optional(),
      })),
    }));

    const xml3 =
      '<root name="hello"><position x="1" y="2" z="3"/><list><item name="alpha"/><item name="beta" num="2"/></list></root>';
    const result3 = schema3.parse(xml3, "root");
    expect(result3).toEqual({
      name: "hello",
      position: {
        x: 1,
        y: 2,
        z: 3,
      },
      list: [{ name: "alpha" }, { name: "beta", num: 2 }],
    });
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

    const result = schema.parse(parseSwXml(xml), "test");

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

    const serialized = schema.serialize(result, "test", { indent: 2 }).toString();
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

    const result = schema.safeParse(tree, "root");

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
      unknownField: ((_data, _ctx) => "ignore") satisfies x.UnknownFieldCallback,
      duplicateChildElement: ((_data, _ctx) => "last") satisfies x.DuplicateChildElementCallback,
    };

    const unknownFieldSpy = vi.spyOn(options, "unknownField");
    const duplicateChildElementSpy = vi.spyOn(options, "duplicateChildElement");

    const data = schema.parse(tree, "root", options);

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      1,
      { kind: "child", index: 2, child: expect.objectContaining({ tag: "unknown_child" }) },
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
          { index: 0, tag: "surface" },
        ],
        element: expect.objectContaining({ tag: "surface" }),
        root: expect.objectContaining({}),
        schemaPath: ["surfaces", 0],
      },
    );

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      2,
      { kind: "child", index: 1, child: expect.objectContaining({ tag: "unknown_item" }) },
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
        ],
        element: expect.objectContaining({ tag: "surfaces" }),
        root: expect.objectContaining({}),
        schemaPath: ["surfaces"],
      },
    );

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      3,
      { kind: "attribute", key: "unknown_attr", value: "0" },
      {
        xmlPath: [{ index: 0, tag: "root" }],
        element: expect.objectContaining({ tag: "root" }),
        root: expect.objectContaining({}),
        schemaPath: [],
      },
    );

    expect(duplicateChildElementSpy).toHaveBeenNthCalledWith(
      1,
      {
        tag: "surfaces",
        candidates: [
          expect.objectContaining({ tag: "surfaces" }),
          expect.objectContaining({ tag: "surfaces" }),
        ],
      },
      {
        xmlPath: [{ index: 0, tag: "root" }],
        element: expect.objectContaining({ tag: "root" }),
        root: expect.objectContaining({}),
        schemaPath: [],
      },
    );

    expect(duplicateChildElementSpy).toHaveBeenNthCalledWith(
      2,
      {
        tag: "position",
        candidates: [
          expect.objectContaining({ tag: "position" }),
          expect.objectContaining({ tag: "position" }),
        ],
      },
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
          { index: 0, tag: "surface" },
        ],
        element: expect.objectContaining({ tag: "surface" }),
        root: expect.objectContaining({}),
        schemaPath: ["surfaces", 0],
      },
    );

    expect(data.surfaces).toEqual([{ position: { x: 1, y: 2, z: 3 } }]);
  });
});
