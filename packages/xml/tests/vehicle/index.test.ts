import fs from "node:fs/promises";
import { describe, test } from "vitest";
import { searchEnvPath } from "@sw-file-lib/test-utils";
import { parseVehicleXml } from "../../src";

describe("vehicle", () => {
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
