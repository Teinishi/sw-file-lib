import { describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ComponentDefinitionBuilder,
  parseComponentDefinitionXml,
  parseSwXml,
  RawXmlTreeList,
  SwXmlNode,
  SwXmlNodeList,
  SwXmlSchemaError,
  formatSwXmlPath,
  list,
  object,
  number,
  string,
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

    expect(builder.toXml({ indentString: "\t", pretty: true })).toBe(xml);
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

    const definition = parseComponentDefinitionXml(xml);
    if (!definition) throw new Error("Unexpected error");

    const name: string | undefined = definition.name;
    expect(name).toBe("(M) Test Cube 1");

    const category: number | undefined = definition.category;
    expect(category).toBe(0);

    const type: number | undefined = definition.type;
    expect(type).toBe(0);

    const unknownAttr = definition.unknown_attr;
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

  test("schema safeParse returns path-aware issues", () => {
    const schema = object({
      name: string(),
      mass: number(),
      position: object({
        x: number(),
        y: number(),
      }),
    });

    const node = parseSwXml('<root name="Test" mass="heavy"><position x="1"/></root>').child(
      "root",
    );
    const result = schema.safeParse(node);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Unexpected parse success");

    expect(result.error).toBeInstanceOf(SwXmlSchemaError);
    expect(result.error.issues).toMatchObject([
      {
        code: "invalid_number",
        path: ["mass"],
      },
      {
        code: "missing_required_field",
        path: ["position", "y"],
      },
    ]);
    expect(formatSwXmlPath(result.error.issues[1]!.path)).toBe("position.y");
  });

  test("schema parsing uses schema context for single-child records", () => {
    const schema = object({
      surfaces: list(
        "surface",
        object({
          position: object({
            x: number(),
            y: number(),
            z: number(),
          }),
        }),
      ),
    });

    const node = parseSwXml(
      '<root><surfaces><surface><position x="1" y="2" z="3"/></surface></surfaces></root>',
    ).child("root");

    expect(schema.parse(node).surfaces).toEqual([
      {
        position: { x: 1, y: 2, z: 3 },
      },
    ]);
  });

  test.skipIf(process.env.CI)(
    "integration with actual stormworks asset",
    async () => {
      const files = await searchRom("data/definitions", [".xml"]);

      for (const file of files) {
        const buf = await fs.readFile(file);
        try {
          parseComponentDefinitionXml(buf, { noDuplicateElement: false });
        } catch (e) {
          console.error(file);
          console.error(parseSwXml(buf).child("definition")?.child("surfaces")?.asRawTree());
          throw e;
        }
      }
    },
    60000,
  );
});
