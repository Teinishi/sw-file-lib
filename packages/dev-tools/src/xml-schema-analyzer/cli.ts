#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import cliProgress from "cli-progress";
import { Command } from "commander";
import consola from "consola";
import { version } from "../../package.json";
import { analyzeFiles } from "./analyzer";
import { generateCode } from "./generate-code";
import type { Config, DocumentData } from "./index";
import { OrderGraph } from "./order-graph";
import { generateSchema } from "./schema";

async function loadConfig(configPath: string): Promise<Config> {
  const url = pathToFileURL(path.resolve(configPath)).href;
  const mod = await import(url);
  return await mod.default;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof OrderGraph) {
    return { __type: "OrderGraph", ...value.toObject() };
  } else if (value instanceof Map) {
    return { __type: "Map", entries: Object.fromEntries(value) };
  }
  return value;
}

function jsonReceiver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "__type" in value) {
    if (value["__type"] === "OrderGraph") {
      return OrderGraph.fromObject(value as any);
    } else if (value["__type"] === "Map") {
      return new Map(Object.entries((value as any).entries));
    }
  }
  return value;
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

    if (options.config) {
      const config = await loadConfig(options.config);

      input ??= config.input;
      out ??= config.out;
      predefinedSchemas ??= config.predefinedSchemas;
      forceKind ??= config.forceKind;
      mergeNumberSuffix ??= config.mergeNumberSuffix;
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

    const jsonHandle = refresh ? undefined : await fs.open(jsonPath, "r").catch(() => undefined);
    if (jsonHandle) {
      const json = await fs.readFile(jsonPath, "utf-8");
      documentData = JSON.parse(json, jsonReceiver);
      consola.info(`Using cached data from ${jsonPath}`);
      jsonHandle.close();
    } else {
      const inputFiles = Array.isArray(input) ? input : await Array.fromAsync(fs.glob(input));

      consola.info(`Analyzing ${inputFiles.length} XML files...`);

      const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      progressBar.start(inputFiles.length, 0);
      documentData = await analyzeFiles(inputFiles, {}, (current) => progressBar.update(current));
      progressBar.stop();

      consola.info(`Analysis complete.`);

      await fs.writeFile(jsonPath, JSON.stringify(documentData, jsonReplacer, 2), "utf-8");
    }

    const schemaEntries = generateSchema(documentData, {
      predefinedSchemas,
      forceKind,
      mergeNumberSuffix,
    });

    const code = generateCode(schemaEntries);

    await fs.writeFile(out, code, "utf-8");
    consola.success(`Schema TypeScript written to ${out}`);
  });

program.parseAsync();
