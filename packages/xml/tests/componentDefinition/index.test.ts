import { describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { ComponentDefinitionBuilder, parseComponentDefinitionXml } from "@xml";

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

  test("parse", async () => {
    const xmlPath = path.join(__dirname, "data/test_cube_1.xml");
    const jsonPath = path.join(__dirname, "data/test_cube_1.json");
    const xml = await fs.readFile(xmlPath, "utf8");
    const json = JSON.parse(await fs.readFile(jsonPath, "utf8"));

    const parsed = parseComponentDefinitionXml(xml);

    expect(parsed).toEqual(json);
  });
});
