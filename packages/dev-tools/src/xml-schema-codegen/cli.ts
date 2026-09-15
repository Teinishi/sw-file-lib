#!/usr/bin/env tsx

import fs from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { consola } from "consola";
import { loadOxfmtConfig } from "load-oxfmt-config";
import { version } from "../../package.json";
import { generateFormatted, type GeneratedFile, type GenerateOptions } from "./index";

async function loadConfig(path: string) {
  const url = pathToFileURL(resolve(path)).href;
  const mod = await import(url);
  return mod.default;
}

const program = new Command();

program
  .name("xml-schema-codegen")
  .description("Generate XML schema code from interface declarations")
  .version(version)
  .option("-i, --input <glob>", "Input TypeScript files (glob)")
  .option("-o, --out-dir <directory>", "Output directory")
  .option("--tsconfig <file>", "Path to tsconfig.json")
  .option("-c, --config <file>", "Config file")
  .option("--check", "Exit with error if generated output differs")
  .action(async (options) => {
    let input: string | string[] = options.input;
    let outDir: string = options.outDir;
    let tsconfig: string = options.tsconfig;
    let xImportStatement: string | undefined;
    let check: boolean | undefined = options.check;

    if (options.config) {
      const config = await loadConfig(options.config);

      input ??= config.input;
      outDir ??= config.outDir;
      tsconfig ??= config.tsconfig;
      xImportStatement ??= config.xImportStatement;
    } else {
      if (!options.input || !options.outDir || !options.tsconfig) {
        program.error(
          "Missing required options. Please provide either a config file or input, out-dir, and tsconfig options.",
        );
      }
    }

    const generateOptions: GenerateOptions = {
      input: Array.isArray(input) ? input : await Array.fromAsync(fs.glob(input)),
      outDir,
      tsconfig,
      ...(xImportStatement ? { xImportStatement } : {}),
    };

    let result: GeneratedFile[];

    try {
      const formatConfig = await loadOxfmtConfig({ cwd: process.cwd() });
      consola.info(`Loaded oxfmt config from ${formatConfig.filepath}`);

      consola.start("Generating XML schema code...");

      result = await generateFormatted(generateOptions, formatConfig.config);
    } catch (error) {
      consola.error("XML Schema code generation failed.");
      console.error(error);
      process.exit(1);
    }

    const resolvedOutDir = resolve(generateOptions.outDir);

    if (check) {
      const errors: string[] = [];

      for (const file of result) {
        const outputPath = file.path;
        let existingContent: string | null = null;

        try {
          existingContent = await fs.readFile(outputPath, "utf-8");
        } catch (err) {
          errors.push(`Error reading file: ${outputPath} - ${(err as Error).message}`);
          continue;
        }

        if (existingContent !== file.content) {
          errors.push(`File differs: ${outputPath}`);
        }
      }

      if (errors.length > 0) {
        for (const error of errors) {
          consola.error(error);
        }
        process.exit(1);
      } else {
        consola.success("All generated files are up to date.");
      }
    } else {
      await fs.rm(resolvedOutDir, { recursive: true, force: true });
      await fs.mkdir(resolvedOutDir, { recursive: true });

      for (const file of result) {
        const outputPath = file.path;
        await fs.writeFile(outputPath, file.content, "utf-8");
        consola.info(`Generated ${outputPath}`);
      }

      consola.success("XML Schema code generation completed successfully.");
    }
  });

program.parseAsync();
