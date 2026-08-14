import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { componentModFromBytes, componentModToBytes } from "../../src";

describe("component mod roundtrip", () => {
  test("test_cube_1.bin", async () => {
    const binPath = path.join(__dirname, "data/test_cube_1.bin");
    const xmlPath = path.join(__dirname, "data/test_cube_1.xml");
    const meshPath = path.join(__dirname, "data/test_cube_1.mesh");

    const buf = await fs.readFile(binPath);
    const definition = await fs.readFile(xmlPath, "utf8");
    const meshBuf = await fs.readFile(meshPath);

    const data = componentModFromBytes(buf);

    expect(data.version).toBe(1);
    if (data.version !== 1) throw new Error("Unreachable");
    expect(data.name).toBe("test_cube_1");
    expect(data.definition).toBe(definition);
    expect(data.assets.length).toBe(1);
    expect(data.assets[0]?.name).toBe("test_cube_1.mesh");
    expect(data.assets[0] && meshBuf.equals(data.assets[0].data)).toBe(true);

    const bytes = componentModToBytes(data);

    expect(buf.equals(bytes)).toBe(true);
  });
});
