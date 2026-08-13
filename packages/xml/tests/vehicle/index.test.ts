import fs from "node:fs/promises";
import { describe, test } from "vitest";
import { parseVehicleXml } from "@xml";
import { searchEnvPath } from "../../../internalUtils/src/testUtils";

describe("vehicle", () => {
  test.skipIf(process.env.CI)(
    "integration with actual stormworks asset",
    async () => {
      const files = await searchEnvPath("STORMWORKS_VEHICLES_PATH", "", [".xml"]);

      for (const file of files) {
        const buf = await fs.readFile(file);

        try {
          parseVehicleXml(buf, {
            duplicateChildElement(_ctx, target) {
              // bodies[*].components[*].o.microprocessor_definition.group.components[*].object.out1
              return target === "out1" ? "last" : "error";
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
