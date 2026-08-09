import { describe, test } from "vitest";
import fs from "node:fs/promises";
import { searchEnvPath } from "../../../internalUtils/src/testUtils";
import { safeParseVehicleXml } from "@xml";

describe("vehicle", () => {
  test.skipIf(process.env.CI)(
    "integration with actual stormworks asset",
    async () => {
      const files = await searchEnvPath("STORMWORKS_VEHICLES_PATH", "", [".xml"]);

      for (const file of files) {
        const buf = await fs.readFile(file);

        const result = safeParseVehicleXml(buf, { duplicateChildElement: "error" });
        if (!result.success) {
          console.error(file);
          throw result.error;
        }
      }
    },
    60000,
  );
});
