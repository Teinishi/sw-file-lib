#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import consola from "consola";
import { version } from "../../package.json";
import { analyzeFiles } from "./analyzer";
import { generateInterfaceCode } from "./generate-code";
import type { Config, ElementSchemaType, PredefinedSchema } from "./index";

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
  .option("-o, --out <output>", "Output file path for schema TypeScript")
  .option("-r, --refresh", "Refresh cache and re-analyze XML files")
  .option("-c, --config <file>", "Config file")
  .action(async (options) => {
    let input: string | readonly string[] = options.input;
    let out: string = options.out;
    const refresh: boolean = options.refresh ?? false;
    let forceOptional: boolean | undefined = undefined;
    let predefinedSchemas:
      | readonly { importPath?: string; schemas: Record<string, PredefinedSchema> }[]
      | undefined = undefined;
    let forceKind: Record<string, "object" | "list" | "metalist"> | undefined = undefined;

    if (options.config) {
      const config = await loadConfig(options.config);

      input ??= config.input;
      out ??= config.out;
      forceOptional ??= config.forceOptional;
      predefinedSchemas ??= config.predefinedSchemas;
      forceKind ??= config.forceKind;
    } else {
      if (!options.input || !options.out) {
        program.error(
          "Missing required options. Please provide either a config file or input and out options.",
        );
      }
    }

    const outPath = path.parse(out);
    const jsonPath = path.join(outPath.dir, outPath.name + ".cache.json");

    let originalSchemas: ElementSchemaType[] = [];

    const jsonHandle = refresh ? undefined : await fs.open(jsonPath, "r").catch(() => undefined);
    if (jsonHandle) {
      const json = await fs.readFile(jsonPath, "utf-8");
      originalSchemas = JSON.parse(json);
      consola.info(`Using cached data from ${jsonPath}`);
      jsonHandle.close();
    } else {
      const inputFiles = Array.isArray(input) ? input : await Array.fromAsync(fs.glob(input));

      consola.info(`Analyzing ${inputFiles.length} XML files...`);
      originalSchemas = await analyzeFiles(inputFiles, {
        forceOptional: forceOptional ?? false,
        ...(forceKind ? { forceKind } : {}),
      });
      consola.info(`Analysis complete.`);

      await fs.writeFile(jsonPath, JSON.stringify(originalSchemas, null, 2), "utf-8");
    }

    const code = generateInterfaceCode(originalSchemas, predefinedSchemas);

    await fs.writeFile(out, code, "utf-8");
    consola.success(`Schema TypeScript written to ${out}`);
  });

program.parseAsync();
