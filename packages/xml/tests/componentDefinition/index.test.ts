import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { searchRom } from "@sw-file-lib/test-utils";
import { parseSwXml, safeParseComponentDefinitionXml, ComponentDefinitionSchema } from "../../src";
import * as x from "../../src/xml-schema";
import * as utils from "./utils";

describe("componentDefinition", () => {
  test("build component definition", async () => {
    const xmlPath = path.join(import.meta.dirname, "data/test_cube_1.xml");
    const xml = await fs.readFile(xmlPath, "utf8");

    const schema = ComponentDefinitionSchema.extend({
      unknown_attr: x.string().optional(),
    });

    const data: x.Infer<typeof schema> = {};

    data.name = "(M) Test Cube 1";
    data.category = 0;
    data.type = 0;
    data.mass = 1;
    data.value = 2;
    data.flags = 0;
    data.tags = "basic";
    data.mesh_data_name = "test_cube_1.mesh";
    data.unknown_attr = "anything";

    data.surfaces = utils.createCuboidSurfaces(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      [0, 1, 2, 3, 4, 5],
      { shape: 0 },
    );

    data.buoyancy_surfaces = utils.createCuboidSurfaces(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      [0, 1, 2, 3, 4, 5],
      { shape: 1 },
    );

    data.voxels = utils.createVoxels({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { flags: 1 });

    data.tooltip_properties = {
      description: "",
      short_description: "",
    };

    data.reward_properties = {
      tier: 0,
      number_rewarded: 2000,
    };

    utils.calculateVoxelBounds(data, ["voxel", "voxel_physics"]);

    const serialized = schema.serialize(data, "definition", { indent: "\t" }).toString();
    expect(serialized).toBe(xml);
  });

  test("parse test_cube_1.xml", async () => {
    const xmlPath = path.join(import.meta.dirname, "data/test_cube_1.xml");
    const xml = await fs.readFile(xmlPath, "utf8");

    const schema = ComponentDefinitionSchema.extend({
      type: x.string(),
      unknown_attr: x.string(),
    });

    const definition = schema.parse(parseSwXml(xml), "definition");

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
