import { describe, expect, test } from "vitest";
import { x } from "@xml";

describe("schemaLib serialization", () => {
  test("serialize produces the original XML", () => {
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

    const result = schema.parse(xml, "root");

    const serialized = schema
      .serialize(result, "root", {
        xmlDeclaration: false,
        indent: 2,
      })
      .toString();

    expect(serialized).toBe(xml);
  });

  test("parse -> serialize -> parse preserves the value", () => {
    const schema = x.object({
      name: x.string(),
      enabled: x.boolean(),
      size: x.number(),
      items: x.list(
        "item",
        x.object({
          name: x.string(),
          value: x.number(),
        }),
      ),
    });

    const xml = `<root name="test" enabled="true" size="42">
  <items>
    <item name="a" value="1"/>
    <item name="b" value="2"/>
  </items>
</root>`;

    const result1 = schema.parse(xml, "root");

    const serialized = schema
      .serialize(result1, "root", {
        xmlDeclaration: false,
        indent: 2,
      })
      .toString();

    const result2 = schema.parse(serialized, "root");

    expect(result2).toEqual(result1);
  });

  test("serialize throws a path-aware error for nested object fields", () => {
    const schema = x.object({
      items: x.list(
        "item",
        x.object({
          name: x.string(),
          size: x.number(),
        }),
      ),
    });

    let error: unknown;
    try {
      schema.serialize({ items: [{ name: "alpha", size: "large" }] } as never, "root");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(x.SchemaSerializeError);
    if (!(error instanceof x.SchemaSerializeError)) throw new Error("Unexpected error");

    expect(error.message).toBe(
      "items[0].size: Expected number for number serialization, received string.",
    );
    expect(error.issues).toMatchObject([
      {
        path: ["items", 0, "size"],
        expected: "number",
        schema: "number",
        value: "large",
      },
    ]);
  });

  test("serialize reports the invalid root value", () => {
    const schema = x.object({
      name: x.string(),
    });

    let error: unknown;
    try {
      schema.serialize("invalid" as never, "root");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(x.SchemaSerializeError);
    if (!(error instanceof x.SchemaSerializeError)) throw new Error("Unexpected error");

    expect(error.issues).toMatchObject([
      {
        path: [],
        expected: "object",
        schema: "object",
        value: "invalid",
      },
    ]);
  });

  test("serialize keeps union branch errors", () => {
    const schema = x.object({
      value: x.union([x.number(), x.boolean()]),
    });

    let error: unknown;
    try {
      schema.serialize({ value: { nested: true } } as never, "root");
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(x.SchemaSerializeError);
    if (!(error instanceof x.SchemaSerializeError)) throw new Error("Unexpected error");

    expect(error.issues).toMatchObject([
      {
        path: ["value"],
        expected: "number | boolean",
        schema: "union",
        value: { nested: true },
        errors: [
          {
            issues: [
              {
                path: [],
                expected: "number",
                schema: "number",
                value: { nested: true },
              },
            ],
          },
          {
            issues: [
              {
                path: [],
                expected: "boolean",
                schema: "boolean",
                value: { nested: true },
              },
            ],
          },
        ],
      },
    ]);
  });
});
