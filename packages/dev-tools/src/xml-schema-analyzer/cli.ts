#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import consola from "consola";
import { version } from "../../package.json";
import { analyzeFiles } from "./analyzer";
import { generateInterfaceCode } from "./generate-code";
import type { Config, PredefinedSchema } from "./index";

async function loadConfig(configPath: string): Promise<Config> {
  const url = pathToFileURL(path.resolve(configPath)).href;
  const mod = await import(url);
  return await mod.default;
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
    let forceOptional: boolean | undefined = undefined;
    let predefinedSchemas:
      | { importPath?: string; schemas: Record<string, PredefinedSchema> }[]
      | undefined = undefined;
    let forceKind: Record<string, "object" | "list" | "metalist"> | undefined = undefined;

    if (options.config) {
      const config = await loadConfig(options.config);

      input ??= config.input;
      outDir ??= config.outDir;
      forceOptional ??= config.forceOptional;
      predefinedSchemas ??= config.predefinedSchemas;
      forceKind ??= config.forceKind;
    } else {
      if (!options.input || !options.outDir) {
        program.error(
          "Missing required options. Please provide either a config file or input and out-dir options.",
        );
      }
    }

    const jsonPath = path.join(outDir, "schema.json");
    const tsPath = path.join(outDir, "schema.ts");

    const inputFiles = Array.isArray(input) ? input : await Array.fromAsync(fs.glob(input));

    consola.info(`Analyzing ${inputFiles.length} XML files...`);
    const originalSchemas = await analyzeFiles(inputFiles, {
      forceOptional: forceOptional ?? false,
      ...(forceKind ? { forceKind } : {}),
    });
    consola.info(`Analysis complete.`);

    await fs.rm(outDir, { recursive: true, force: true });
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(jsonPath, JSON.stringify(originalSchemas, null, 2), "utf-8");
    consola.success(`Schema JSON written to ${jsonPath}`);

    const code = generateInterfaceCode(originalSchemas, predefinedSchemas);

    await fs.writeFile(tsPath, code, "utf-8");
    consola.success(`Schema TypeScript written to ${tsPath}`);
  });

program.parseAsync();
