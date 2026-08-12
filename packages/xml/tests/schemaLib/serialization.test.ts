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

    const result = schema.parseTree(xml, "root");

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

    const result1 = schema.parseTree(xml, "root");

    const serialized = schema
      .serialize(result1, "root", {
        xmlDeclaration: false,
        indent: 2,
      })
      .toString();

    const result2 = schema.parseTree(serialized, "root");

    expect(result2).toEqual(result1);
  });
});
