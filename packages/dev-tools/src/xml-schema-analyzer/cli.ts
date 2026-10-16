#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import cliProgress from "cli-progress";
import { Command } from "commander";
import consola from "consola";
import { version } from "../../package.json";
import { analyzeFiles } from "./analyzer";
import { readAnalysisCache, resolveAnalysisInputs, writeAnalysisCache } from "./cache";
import { generateCode } from "./generate-code";
import type { Config, DocumentData } from "./index";
import { generateSchema } from "./schema";

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
    let predefinedSchemas: Config["predefinedSchemas"] | undefined = undefined;
    let forceKind: Config["forceKind"] | undefined = undefined;
    let mergeNumberSuffix: boolean | undefined = undefined;
    let interfaceNames: Config["interfaceNames"];
    let schemaOverrides: Config["schemaOverrides"];

    if (options.config) {
      const config = await loadConfig(options.config);

      input ??= config.input;
      out ??= config.out;
      predefinedSchemas ??= config.predefinedSchemas;
      forceKind ??= config.forceKind;
      mergeNumberSuffix ??= config.mergeNumberSuffix;
      interfaceNames = config.interfaceNames;
      schemaOverrides = config.schemaOverrides;
    } else {
      if (!options.input || !options.out) {
        program.error(
          "Missing required options. Please provide either a config file or input and out options.",
        );
      }
    }

    const outPath = path.parse(out);
    const jsonPath = path.join(outPath.dir, outPath.name + ".cache.json");

    let documentData: DocumentData;

    const analysisInputs = await resolveAnalysisInputs(input);
    const cachedData = refresh ? undefined : await readAnalysisCache(jsonPath, analysisInputs);
    if (cachedData) {
      documentData = cachedData;
      consola.info(`Using cached data from ${jsonPath}`);
    } else {
      const inputFiles = analysisInputs.files.map((file) => file.path);

      consola.info(`Analyzing ${inputFiles.length} XML files...`);

      const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      progressBar.start(inputFiles.length, 0);
      documentData = await analyzeFiles(inputFiles, {}, (current) => progressBar.update(current));
      progressBar.stop();

      consola.info(`Analysis complete.`);

      await writeAnalysisCache(jsonPath, analysisInputs, documentData);
    }

    const schemaEntries = generateSchema(documentData, {
      predefinedSchemas,
      forceKind,
      mergeNumberSuffix,
      schemaOverrides,
    });

    const code = generateCode(schemaEntries, { interfaceNames });

    await fs.writeFile(out, code, "utf-8");
    consola.success(`Schema TypeScript written to ${out}`);
  });

program.parseAsync();
