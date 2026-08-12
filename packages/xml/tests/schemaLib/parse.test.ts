import { describe, expect, expectTypeOf, test } from "vitest";
import { x } from "@xml";

describe("schemaLib parse", () => {
  describe("primitive", () => {
    test("string", () => {
      const schema = x.string();

      const result = schema.parse("hello");

      expect(result).toBe("hello");
      expectTypeOf(result).toEqualTypeOf<string>();
    });

    test("number", () => {
      const schema = x.number();

      const result = schema.parse("123");

      expect(result).toBe(123);
      expectTypeOf(result).toEqualTypeOf<number>();
    });

    test("boolean", () => {
      const schema = x.boolean();

      const result = schema.parse("true");

      expect(result).toBe(true);
      expectTypeOf(result).toEqualTypeOf<boolean>();
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
      const schema = x.union([x.boolean(), x.string()]);

      const trueResult = schema.parse("true");
      const stringResult = schema.parse("hello");

      expect(trueResult).toBe(true);
      expect(stringResult).toBe("hello");

      expectTypeOf(trueResult).toEqualTypeOf<boolean | string>();
    });

    test("parses number or string", () => {
      const schema = x.union([x.number(), x.string()]);

      const numberResult = schema.parse("123");
      const stringResult = schema.parse("hello");

      expect(numberResult).toBe(123);
      expect(stringResult).toBe("hello");

      expectTypeOf(numberResult).toEqualTypeOf<number | string>();
    });

    test("tries schemas from left to right", () => {
      const schema = x.union([x.boolean(), x.string()]);

      const result = schema.parse("false");

      expect(result).toBe(false);
      expectTypeOf(result).toEqualTypeOf<boolean | string>();
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
});
