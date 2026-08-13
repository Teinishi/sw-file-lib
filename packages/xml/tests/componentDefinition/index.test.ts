import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  ComponentDefinitionBuilder,
  parseSwXml,
  RawXmlTreeList,
  SwXmlNode,
  SwXmlNodeList,
  safeParseComponentDefinitionXml,
  ComponentDefinitionSchema,
  x,
} from "@xml";
import { searchRom } from "../../../internalUtils/src/testUtils";

describe("component definition", () => {
  test("ComponentDefinitionBuilder", async () => {
    const xmlPath = path.join(__dirname, "data/test_cube_1.xml");
    const xml = await fs.readFile(xmlPath, "utf8");

    const builder = new ComponentDefinitionBuilder();

    builder.addAttribute("name", "(M) Test Cube 1");
    builder.addAttribute("category", 0);
    builder.addAttribute("type", 0);
    builder.addAttribute("mass", 1);
    builder.addAttribute("value", 2);
    builder.addAttribute("flags", 0);
    builder.addAttribute("tags", "basic");
    builder.addAttribute("mesh_data_name", "test_cube_1.mesh");
    builder.addAttribute("unknown_attr", "anything");

    builder.addSurfacesCuboid({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, [0, 1, 2, 3, 4, 5], {
      shape: 0,
    });
    builder.addBuoyancySurfacesCuboid(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      [0, 1, 2, 3, 4, 5],
      {
        shape: 1,
      },
    );
    builder.addVoxels({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { flags: 1 });

    builder.addElement("tooltip_properties", [
      ["description", ""],
      ["short_description", ""],
    ]);
    builder.addElement("reward_properties", [
      ["tier", 0],
      ["number_rewarded", 2000],
    ]);

    expect(builder.toXml({ indent: "\t" })).toBe(xml);
  });

  test("parse 1", () => {
    const tree = parseSwXml(
      '<root abc="def" 01="23">hello<position x="1" y="2" z="3"/><empty></empty></root>',
    );

    expect(tree).toEqual(
      new SwXmlNodeList([
        new SwXmlNode(
          "root",
          new Map([
            ["abc", "def"],
            ["01", "23"],
          ]),
          [
            new SwXmlNode(
              "position",
              new Map([
                ["x", "1"],
                ["y", "2"],
                ["z", "3"],
              ]),
              [],
            ),
            new SwXmlNode("empty", new Map(), []),
          ],
        ),
      ]),
    );

    expect(tree.getRawTree("root")).toEqual({
      abc: "def",
      "01": "23",
      position: { x: "1", y: "2", z: "3" },
      empty: null,
    });
  });

  test("parse 2", () => {
    const tree = parseSwXml('<list><item id="0"/><item id="1"/><item id="2"/></list>');

    expect(tree.getRawTree("list")).toEqual(
      new RawXmlTreeList("item", [{ id: "0" }, { id: "1" }, { id: "2" }]),
    );
  });

  test("parse test_cube_1.xml", async () => {
    const xmlPath = path.join(__dirname, "data/test_cube_1.xml");
    const xml = await fs.readFile(xmlPath, "utf8");

    const schema = ComponentDefinitionSchema.extend((_) => ({
      type: x.string(),
      unknown_attr: x.string(),
    }));

    const definition = schema.parseTree(parseSwXml(xml), "definition");

    const name: string | undefined = definition.name;
    expect(name).toBe("(M) Test Cube 1");

    const category: number | undefined = definition.category;
    expect(category).toBe(0);

    const type: string | undefined = definition.type;
    expect(type).toBe("0");

    const unknownAttr: string | undefined = definition.unknown_attr;
    expect(unknownAttr).toBe("anything");

    expect(definition.surfaces).toEqual([
      { orientation: 0, shape: 0, position: { x: 0, y: 0, z: 0 } },
      { orientation: 1, shape: 0, position: { x: 0, y: 0, z: 0 } },
      { orientation: 2, shape: 0, position: { x: 0, y: 0, z: 0 } },
      { orientation: 3, shape: 0, position: { x: 0, y: 0, z: 0 } },
      { orientation: 4, shape: 0, position: { x: 0, y: 0, z: 0 } },
      { orientation: 5, shape: 0, position: { x: 0, y: 0, z: 0 } },
    ]);
  });

  test.skipIf(process.env.CI)(
    "integration with actual stormworks asset",
    async () => {
      const files = await searchRom("data/definitions", [".xml"]);

      for (const file of files) {
        const buf = await fs.readFile(file);

        const result = safeParseComponentDefinitionXml(buf, { duplicateChildElement: "last" });
        if (!result.success) {
          console.error(file);
          throw result.error;
        }
      }
    },
    60000,
  );
});
