import { describe, expect, expectTypeOf, test } from "vitest";
import { parseSwXml, x } from "@xml";

describe("schemaLib parse", () => {
  describe("primitive", () => {
    test("string", () => {
      const schema = x.object({ value: x.string() });

      const result = schema.parseTree('<root value="hello"/>', "root");

      expect(result.value).toBe("hello");
      expectTypeOf(result.value).toEqualTypeOf<string>();
    });

    test("number", () => {
      const schema = x.object({ value: x.number() });

      const result = schema.parseTree('<root value="123"/>', "root");

      expect(result.value).toBe(123);
      expectTypeOf(result.value).toEqualTypeOf<number>();
    });

    test("boolean", () => {
      const schema = x.object({ value: x.boolean() });

      const result = schema.parseTree('<root value="true"/>', "root");

      expect(result.value).toBe(true);
      expectTypeOf(result.value).toEqualTypeOf<boolean>();
    });

    test("text nodes are ignored", () => {
      const schema = x.object({
        name: x.object({ text: x.string() }),
      });

      const result = schema.parseTree(
        `<root>
          some ignored text
          <name text="hello"/>
          more ignored text
        </root>`,
        "root",
      );

      expect(result).toEqual({
        name: { text: "hello" },
      });
    });
  });

  describe("object", () => {
    test("parses attributes and child elements together", () => {
      const schema = x.object({
        name: x.string(),
        position: x.object({
          x: x.number(),
          y: x.number(),
        }),
      });

      const result = schema.parseTree(
        `<root name="hello">
          <position x="1" y="2"/>
        </root>`,
        "root",
      );

      expect(result).toEqual({
        name: "hello",
        position: {
          x: 1,
          y: 2,
        },
      });

      expectTypeOf(result.position).toExtend<{ x: number; y: number }>();

      expectTypeOf(result).toExtend<{
        name: string;
        position: {
          x: number;
          y: number;
        };
      }>();
    });

    test("attributes and child elements may have the same name only when schema allows it", () => {
      const schema = x.object({
        value: x.string(),
      });

      const result = schema.parseTree(`<root value="hello"/>`, "root");

      expect(result).toEqual({
        value: "hello",
      });
    });
  });

  describe("list", () => {
    test("parses repeated child elements as a list", () => {
      const schema = x.list(
        "item",
        x.object({
          name: x.string(),
        }),
      );

      const result = schema.parseTree(
        `<root>
          <item name="a"/>
          <item name="b"/>
          <item name="c"/>
        </root>`,
        "root",
      );

      expect(result).toEqual([{ name: "a" }, { name: "b" }, { name: "c" }]);

      expectTypeOf(result).toExtend<{ name: string }[]>();
    });

    test("empty list", () => {
      const schema = x.list(
        "item",
        x.object({
          name: x.string(),
        }),
      );

      const result = schema.parseTree(`<root/>`, "root");

      expect(result).toEqual([]);
      expectTypeOf(result).toExtend<{ name: string }[]>();
    });
  });

  describe("metalist", () => {
    test("parses meta attributes and repeated child elements", () => {
      const schema = x.metalist(
        "item",
        x.partialObject({
          name: x.string(),
          size: x.number(),
        }),
        x.object({
          name: x.string(),
        }),
      );

      const result = schema.parseTree(
        `<root name="hoge">
          <item name="a"/>
          <item name="b"/>
        </root>`,
        "root",
      );

      expect(result).toEqual({
        meta: { name: "hoge" },
        items: [{ name: "a" }, { name: "b" }],
      });

      expectTypeOf(result).toExtend<{
        meta: {
          name?: string;
          size?: number;
        };
        items: {
          name: string;
        }[];
      }>();
    });

    test("meta may contain child elements", () => {
      const schema = x.metalist(
        "item",
        x.object({
          name: x.string(),
          position: x.object({
            x: x.number(),
          }),
        }),
        x.object({
          value: x.number(),
        }),
      );

      const result = schema.parseTree(
        `<root name="hoge">
          <position x="10"/>
          <item value="1"/>
          <item value="2"/>
        </root>`,
        "root",
      );

      expect(result).toEqual({
        meta: {
          name: "hoge",
          position: {
            x: 10,
          },
        },
        items: [{ value: 1 }, { value: 2 }],
      });
    });
  });

  describe("optional", () => {
    test("optional field may be omitted", () => {
      const schema = x.object({
        name: x.string(),
        size: x.number().optional(),
      });

      const result = schema.parseTree(`<root name="hello"/>`, "root");

      expect(result).toEqual({
        name: "hello",
      });

      expectTypeOf(result).toExtend<{
        name: string;
        size?: number;
      }>();
    });

    test("optional field is parsed when present", () => {
      const schema = x.object({
        name: x.string(),
        size: x.number().optional(),
      });

      const result = schema.parseTree(`<root name="hello" size="42"/>`, "root");

      expect(result).toEqual({
        name: "hello",
        size: 42,
      });
    });

    test("partial makes every field optional", () => {
      const schema = x
        .object({
          name: x.string(),
          size: x.number(),
          enabled: x.boolean(),
        })
        .partial();

      const result = schema.parseTree(`<root name="hello"/>`, "root");

      expect(result).toEqual({
        name: "hello",
      });

      expectTypeOf(result).toExtend<{
        name?: string;
        size?: number;
        enabled?: boolean;
      }>();
    });

    test("partialObject is equivalent to object(...).partial()", () => {
      const schema = x.partialObject({
        name: x.string(),
        size: x.number(),
      });

      const result = schema.parseTree(`<root size="10"/>`, "root");

      expect(result).toEqual({
        size: 10,
      });

      expectTypeOf(result).toExtend<{
        name?: string;
        size?: number;
      }>();
    });
  });

  describe("union", () => {
    test("parses boolean or string", () => {
      const schema = x.object({ value: x.union([x.boolean(), x.string()]) });

      const trueResult = schema.parseTree('<root value="true"/>', "root");
      const stringResult = schema.parseTree('<root value="hello"/>', "root");

      expect(trueResult.value).toBe(true);
      expect(stringResult.value).toBe("hello");

      expectTypeOf(trueResult.value).toEqualTypeOf<boolean | string>();
    });

    test("parses number or string", () => {
      const schema = x.object({ value: x.union([x.number(), x.string()]) });

      const numberResult = schema.parseTree('<root value="123"/>', "root");
      const stringResult = schema.parseTree('<root value="hello"/>', "root");

      expect(numberResult.value).toBe(123);
      expect(stringResult.value).toBe("hello");

      expectTypeOf(numberResult.value).toEqualTypeOf<number | string>();
    });

    test("tries schemas from left to right", () => {
      const schema = x.object({ value: x.union([x.boolean(), x.string()]) });

      const result = schema.parseTree('<root value="false"/>', "root");

      expect(result.value).toBe(false);
      expectTypeOf(result.value).toEqualTypeOf<boolean | string>();
    });

    test("can distinguish attribute and child-element forms", () => {
      const schema = x.object({
        value: x.union([
          x.string(),
          x.object({
            num: x.number(),
          }),
        ]),
      });

      const attributeResult = schema.parseTree('<root value="hello"/>', "root");

      const childResult = schema.parseTree('<root><value num="123"/></root>', "root");

      expect(attributeResult).toEqual({ value: "hello" });
      expect(childResult).toEqual({ value: { num: 123 } });

      expectTypeOf(attributeResult).toExtend<{ value: string | { num: number } }>();
    });
  });

  describe("nested schema", () => {
    test("parses a representative Stormworks-like structure", () => {
      const schema = x.object({
        name: x.string(),
        position: x.object({
          x: x.number(),
        }),
        list: x.list(
          "item",
          x.object({
            name: x.string(),
          }),
        ),
        metalist: x.metalist(
          "item",
          x.partialObject({
            name: x.string(),
            size: x.number(),
          }),
          x.object({
            name: x.string(),
          }),
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

      const result = schema.parseTree(xml, "root");

      expect(result).toEqual({
        name: "hello",
        position: { x: 1 },
        list: [{ name: "a" }],
        metalist: {
          meta: { name: "hoge" },
          items: [{ name: "b" }],
        },
      });

      expectTypeOf(result).toExtend<{
        name: string;
        position: {
          x: number;
        };
        list: {
          name: string;
        }[];
        metalist: {
          meta: {
            name?: string;
            size?: number;
          };
          items: {
            name: string;
          }[];
        };
      }>();
    });
  });

  describe("errors", () => {
    test("safeParseValue returns invalid_type when a primitive receives an XML element", () => {
      const tree = parseSwXml("<value/>");
      const element = tree.nodes[0]!;

      const result = x.string().safeParseValue(element, {
        xmlPath: [{ index: 0, tag: "value" }],
        root: tree,
        element,
        schemaPath: [],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Unexpected parse success");

      expect(result.error).toBeInstanceOf(x.SchemaError);
      expect(result.error.message).toBe("<root>: Expected string, received <value>.");
      expect(result.error.issues).toMatchObject([
        {
          code: "invalid_type",
          path: [],
          expected: "string",
          value: element,
        },
      ]);
    });

    test("safeParse returns path-aware invalid values and missing fields", () => {
      const schema = x.object({
        name: x.string(),
        enabled: x.boolean(),
        transform: x.object({
          x: x.number(),
          y: x.number(),
        }),
      });

      const result = schema.safeParse(
        '<root name="body" enabled="yes"><transform x="left"/></root>',
        "root",
      );

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Unexpected parse success");

      expect(result.error).toBeInstanceOf(x.SchemaError);
      expect(result.error.message).toBe(
        'enabled: Expected "true" or "false", received "yes". (3 issues total)',
      );
      expect(result.error.issues).toMatchObject([
        {
          code: "invalid_value",
          path: ["enabled"],
          expected: "boolean_string",
          value: "yes",
        },
        {
          code: "invalid_value",
          path: ["transform", "x"],
          expected: "numeric_string",
          value: "left",
        },
        {
          code: "missing_required_field",
          path: ["transform", "y"],
          expected: "string",
        },
      ]);
    });

    test("parseTree throws SchemaError with the same structured issues", () => {
      const schema = x.object({
        size: x.number(),
      });

      let error: unknown;
      try {
        schema.parseTree('<root size="large"/>', "root");
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(x.SchemaError);
      if (!(error instanceof x.SchemaError)) throw new Error("Unexpected error");

      expect(error.message).toBe('size: Expected a numeric string, received "large".');
      expect(error.issues).toMatchObject([
        {
          code: "invalid_value",
          path: ["size"],
          expected: "numeric_string",
          value: "large",
        },
      ]);
    });

    test("safeParse reports unknown attributes and child elements", () => {
      const schema = x.object({
        known: x.string(),
        child: x.object({
          id: x.number(),
        }),
      });

      const result = schema.safeParse(
        '<root known="ok" extra="attr"><child id="1"/><extraChild/></root>',
        "root",
      );

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Unexpected parse success");

      expect(result.error.issues).toMatchObject([
        {
          code: "unknown_attribute",
          path: [],
          key: "extra",
          value: "attr",
        },
        {
          code: "unknown_child",
          path: [],
          child: expect.objectContaining({ tag: "extraChild" }),
        },
      ]);
    });

    test("unknownField ignore suppresses unknown field issues", () => {
      const schema = x.object({
        known: x.string(),
      });

      const result = schema.safeParse(
        '<root known="ok" extra="attr"><extraChild/></root>',
        "root",
        {
          unknownField: "ignore",
        },
      );

      expect(result).toEqual({
        success: true,
        data: { known: "ok" },
      });
    });

    test("safeParse reports duplicate child elements for single-child fields", () => {
      const schema = x.object({
        position: x.object({
          x: x.number(),
        }),
      });

      const result = schema.safeParse('<root><position x="1"/><position x="2"/></root>', "root");

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Unexpected parse success");

      expect(result.error.issues).toMatchObject([
        {
          code: "duplicate_elements",
          path: ["position"],
          message: "Expected record of unique tags, got 2 of <position>.",
        },
      ]);
    });

    test("duplicateChildElement last selects the last matching child", () => {
      const schema = x.object({
        position: x.object({
          x: x.number(),
        }),
      });

      const result = schema.safeParse('<root><position x="1"/><position x="2"/></root>', "root", {
        duplicateChildElement: "last",
      });

      expect(result).toEqual({
        success: true,
        data: {
          position: { x: 2 },
        },
      });
    });

    test("safeParse reports union errors with each branch error preserved", () => {
      const schema = x.object({
        value: x.union([x.boolean(), x.number()]),
      });

      const tree = parseSwXml('<root value="maybe"/>');
      const root = tree.nodes[0]!;
      const result = schema.safeParse(tree, "root");

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Unexpected parse success");

      expect(result.error.issues).toMatchObject([
        {
          code: "invalid_union",
          path: ["value"],
          input: {
            element: root,
            key: "value",
          },
          unionErrors: [
            {
              issues: [
                {
                  code: "invalid_value",
                  path: [],
                  expected: "boolean_string",
                  value: "maybe",
                },
              ],
            },
            {
              issues: [
                {
                  code: "invalid_value",
                  path: [],
                  expected: "numeric_string",
                  value: "maybe",
                },
              ],
            },
          ],
        },
      ]);
    });

    test("safeParse reports list item errors with item indexes", () => {
      const schema = x.object({
        items: x.list(
          "item",
          x.object({
            id: x.number(),
          }),
        ),
      });

      const result = schema.safeParse(
        '<root><items><item id="1"/><item id="two"/></items></root>',
        "root",
      );

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Unexpected parse success");

      expect(result.error.issues).toMatchObject([
        {
          code: "invalid_value",
          path: ["items", 1, "id"],
          expected: "numeric_string",
          value: "two",
        },
      ]);
    });
  });
});
