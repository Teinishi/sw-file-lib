import { describe, expect, expectTypeOf, test } from "vitest";
import { x } from "../../src";

describe("schemaLib transformations", () => {
  describe("extend", () => {
    test("adds a field to an object schema", () => {
      const schema = x.object({
        name: x.string(),
      });

      const extended = schema.extend({
        size: x.number(),
      });

      const result = extended.parse(`<root name="hello" size="10"/>`, "root");

      expect(result).toEqual({
        name: "hello",
        size: 10,
      });

      expectTypeOf(result).toExtend<{
        name: string;
        size: number;
      }>();
    });

    test("new field may use existing fields", () => {
      const schema = x.object({
        name: x.string(),
      });

      const extended = schema.extend((s) => ({
        name: s.name,
        size: x.number(),
      }));

      const result = extended.parse(`<root name="hello" size="10"/>`, "root");

      expect(result).toEqual({
        name: "hello",
        size: 10,
      });
    });
  });

  describe("omit", () => {
    test("removes fields from an object schema", () => {
      const schema = x.object({
        name: x.string(),
        size: x.number(),
        enabled: x.boolean(),
      });

      const omitted = schema.omit(["size", "enabled"]);

      const result = omitted.parse(`<root name="hello" size="10" enabled="true"/>`, "root", {
        unknownField: "ignore",
      });

      expect(result).toEqual({
        name: "hello",
      });

      expectTypeOf(result).toExtend<{
        name: string;
      }>();
    });
  });

  describe("list item transformations", () => {
    test("renameItemTag changes the item tag", () => {
      const schema = x
        .list(
          "item",
          x.object({
            name: x.string(),
          }),
        )
        .renameItemTag("entry");

      const result = schema.parse(
        `<root>
            <entry name="a"/>
            <entry name="b"/>
          </root>`,
        "root",
      );

      expect(result).toEqual([{ name: "a" }, { name: "b" }]);
    });

    test("extendItem extends an object list item", () => {
      const schema = x
        .list(
          "item",
          x.object({
            name: x.string(),
          }),
        )
        .extendItem({
          size: x.number(),
        });

      const result = schema.parse(
        `<root>
            <item name="a" size="1"/>
            <item name="b" size="2"/>
          </root>`,
        "root",
      );

      expect(result).toEqual([
        { name: "a", size: 1 },
        { name: "b", size: 2 },
      ]);

      expectTypeOf(result).toExtend<
        {
          name: string;
          size: number;
        }[]
      >();
    });

    test("omitItem removes fields from object list items", () => {
      const schema = x
        .list(
          "item",
          x.object({
            name: x.string(),
            size: x.number(),
            enabled: x.boolean(),
          }),
        )
        .omitItem(["size"]);

      const result = schema.parse(
        `<root>
            <item name="a" size="1" enabled="true"/>
          </root>`,
        "root",
        { unknownField: "ignore" },
      );

      expect(result).toEqual([
        {
          name: "a",
          enabled: true,
        },
      ]);

      expectTypeOf(result).not.toExtend<
        {
          name: string;
          size: number;
          enabled: boolean;
        }[]
      >();
      expectTypeOf(result).toExtend<
        {
          name: string;
          enabled: boolean;
        }[]
      >();
    });
  });

  describe("metalist transformations", () => {
    test("renameItemTag changes the metalist item tag", () => {
      const schema = x
        .metalist(
          "item",
          x.object({
            category: x.string(),
          }),
          x.object({
            name: x.string(),
          }),
        )
        .renameItemTag("entry");

      const result = schema.parse(
        `<root category="test">
            <entry name="a"/>
            <entry name="b"/>
          </root>`,
        "root",
      );

      expect(result).toEqual({
        meta: {
          category: "test",
        },
        items: [{ name: "a" }, { name: "b" }],
      });
    });

    test("extendItem extends metalist items", () => {
      const schema = x
        .metalist(
          "item",
          x.object({
            category: x.string(),
          }),
          x.object({
            name: x.string(),
          }),
        )
        .extendItem({
          size: x.number(),
        });

      const result = schema.parse(
        `<root category="test">
            <item name="a" size="1"/>
            <item name="b" size="2"/>
          </root>`,
        "root",
      );

      expect(result).toEqual({
        meta: {
          category: "test",
        },
        items: [
          { name: "a", size: 1 },
          { name: "b", size: 2 },
        ],
      });
    });

    test("omitItem removes fields from metalist items", () => {
      const schema = x
        .metalist(
          "item",
          x.object({
            category: x.string(),
          }),
          x.object({
            name: x.string(),
          }),
        )
        .omitItem(["name"]);

      const result = schema.parse(
        `<root category="test">
            <item name="a"/>
          </root>`,
        "root",
        { unknownField: "ignore" },
      );

      expect(result).toEqual({
        meta: {
          category: "test",
        },
        items: [{}],
      });
    });

    test("extendMeta extends the meta schema", () => {
      const schema = x
        .metalist(
          "item",
          x.object({
            category: x.string(),
          }),
          x.object({
            name: x.string(),
          }),
        )
        .extendMeta({
          version: x.number(),
        });

      const result = schema.parse(
        `<root category="test" version="2">
            <item name="a"/>
          </root>`,
        "root",
      );

      expect(result).toEqual({
        meta: {
          category: "test",
          version: 2,
        },
        items: [{ name: "a" }],
      });

      expectTypeOf(result).toExtend<{
        meta: {
          category: string;
          version: number;
        };
        items: {
          name: string;
        }[];
      }>();
    });

    test("omitMeta removes fields from the meta schema", () => {
      const schema = x
        .metalist(
          "item",
          x.object({
            category: x.string(),
            version: x.number(),
          }),
          x.object({
            name: x.string(),
          }),
        )
        .omitMeta(["version"]);

      const result = schema.parse(
        `<root category="test">
            <item name="a"/>
          </root>`,
        "root",
      );

      expect(result).toEqual({
        meta: {
          category: "test",
        },
        items: [{ name: "a" }],
      });

      expectTypeOf(result).toExtend<{
        meta: {
          category: string;
        };
        items: {
          name: string;
        }[];
      }>();
    });
  });
});
