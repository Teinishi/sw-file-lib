import fs from "node:fs/promises";
import { describe, test } from "vitest";
import { searchEnvPath } from "@sw-file-lib/test-utils";
import { parseMicroprocessorXml } from "../../src";

describe("microprocessor", () => {
  test.skipIf(process.env.CI)(
    "integration with actual stormworks files",
    async () => {
      const files = await searchEnvPath("STORMWORKS_MICROCONTROLLERS_PATH", "", [".xml"]);

      for (const file of files) {
        const buf = await fs.readFile(file);

        try {
          parseMicroprocessorXml(buf, {
            duplicateChildElement(data, ctx) {
              const xmlPath = ctx.xmlPath
                .map((seg) => seg.tag)
                .concat(data.tag)
                .join("/");
              if (
                /^microprocessor\/group\/(components\/c\/object|component_states\/c\d+)\/out1$/.test(
                  xmlPath,
                )
              )
                return "last";
              return "error";
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
