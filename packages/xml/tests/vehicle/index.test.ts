import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { searchEnvPath } from "@sw-file-lib/test-utils";
import { parseVehicleXml, serializeVehicleXml } from "../../src";

describe("vehicle", () => {
  test("move all components 1 block along X axis", async () => {
    const srcPath = path.join(import.meta.dirname, "data/letter_s.xml");
    const destPath = path.join(import.meta.dirname, "data/letter_s_x+1.xml");

    const srcText = await fs.readFile(srcPath, "utf8");
    const vehicle = parseVehicleXml(srcText);

    for (const body of vehicle.bodies ?? []) {
      for (const component of body.components ?? []) {
        const x = component.o?.vp?.x ?? 0;
        component.o ??= {};
        component.o.vp ??= {};
        component.o.vp.x = x + 1;
      }
    }

    const serializedText = serializeVehicleXml(vehicle, { indent: 2 });

    const destText = await fs.readFile(destPath, "utf8");

    expect(serializedText).toEqual(destText);
  });

  test.skipIf(process.env.CI)(
    "integration with actual stormworks asset",
    async () => {
      const files = await searchEnvPath("STORMWORKS_VEHICLES_PATH", "", [".xml"]);

      for (const file of files) {
        const buf = await fs.readFile(file);

        try {
          parseVehicleXml(buf, {
            duplicateChildElement(data, _ctx) {
              // bodies[*].components[*].o.microprocessor_definition.group.components[*].object.out1
              return data.tag === "out1" ? "last" : "error";
            },
          });
        } catch (e) {
          console.error(file);
          throw e;
        }
      }
    },
    120000,
  );
});
