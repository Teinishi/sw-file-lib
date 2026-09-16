#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { version } from "../../package.json";
import { analyzeFiles } from "./analyzer";
import { generateInterfaceCode } from "./generate-code";

async function loadConfig(configPath: string) {
  const url = pathToFileURL(path.resolve(configPath)).href;
  const mod = await import(url);
  if (typeof mod.default === "function") {
    return await mod.default();
  } else {
    return await mod.default;
  }
}

const program = new Command();

program
  .name("xml-schema-analyzer")
  .description("Analyze XML schema from XML files")
  .version(version)
  .option("-i, --input <glob>", "Input XML files (glob)")
  .option("-o, --out-dir <directory>", "Output directory")
  .option("-c, --config <file>", "Config file")
  .action(async (options) => {
    let input: string | string[] = options.input;
    let outDir: string = options.outDir;
    let forceKind: Record<string, "record" | "list" | "metalist"> | undefined = undefined;

    if (options.config) {
      const config = await loadConfig(options.config);

      input ??= config.input;
      outDir ??= config.outDir;
      forceKind ??= config.forceKind;
    } else {
      if (!options.input || !options.outDir) {
        program.error(
          "Missing required options. Please provide either a config file or input and out-dir options.",
        );
      }
    }

    const inputFiles = Array.isArray(input) ? input : await Array.fromAsync(fs.glob(input));

    const result = await analyzeFiles(inputFiles, forceKind ? { forceKind } : {});
    const code = generateInterfaceCode(result);

    await fs.rm(outDir, { recursive: true, force: true });
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "schema.json"), JSON.stringify(result, null, 2), "utf-8");
    await fs.writeFile(path.join(outDir, "schema.ts"), code, "utf-8");
  });

program.parseAsync();
