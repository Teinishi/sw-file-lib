import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { searchRom } from "@sw-file-lib/test-utils";
import { parseMesh, serializeMesh, parseMeshOrPhys, parsePhys, serializePhys } from "../../src";

describe("mesh roundtrip", () => {
  test("test_cube_1.mesh", async () => {
    const binPath = path.join(import.meta.dirname, "data/test_cube_1.mesh");
    const jsonPath = path.join(import.meta.dirname, "/data/test_cube_1.mesh.json");

    const buf = await fs.readFile(binPath);
    const expected = JSON.parse(await fs.readFile(jsonPath, "utf8"));

    const data = parseMesh(buf);
    expect(data).toEqual(expected);

    const bytes = serializeMesh(data);
    expect(buf.equals(bytes)).toBe(true);
  });

  test("test_cube_1.phys", async () => {
    const binPath = path.join(import.meta.dirname, "data/test_cube_1.phys");
    const jsonPath = path.join(import.meta.dirname, "/data/test_cube_1.phys.json");

    const buf = await fs.readFile(binPath);
    const expected = JSON.parse(await fs.readFile(jsonPath, "utf8"));

    const data = parsePhys(buf);
    expect(data).toEqual(expected);

    const bytes = serializePhys(data);
    expect(buf.equals(bytes)).toBe(true);
  });

  test.skipIf(process.env.CI)(
    "integration with actual stormworks asset",
    async () => {
      const files = await searchRom("meshes", [".mesh", ".phys"]);

      for (const file of files) {
        const buf = await fs.readFile(file);
        const data = parseMeshOrPhys(buf);
        let bytes;
        if (data.kind === "mesh") {
          bytes = serializeMesh(data);
        } else {
          bytes = serializePhys(data);
        }

        const matched = buf.equals(bytes);
        if (!matched) {
          console.log(`integration test failed at file "${file}"`);
        }
        expect(matched).toBe(true);
      }
    },
    60000,
  );
});
