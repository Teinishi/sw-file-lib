import { format, type FormatConfig } from "oxfmt";
import ts from "typescript";
import { analyzeFile } from "./analyzer";
import {
  generateImmutableInterfaceFile,
  generateSchemaFile,
  createFilePaths,
} from "./generate-file";
import type { InputFileInfo } from "./types";

export interface Config {
  input: string | string[];
  outDir: string;
  tsconfig: string;
  xImportStatement?: string;
}

export function defineConfig(config: Config): Config {
  return config;
}

export interface GenerateOptions {
  input: string[];
  outDir: string;
  tsconfig: string;
  xImportStatement?: string;
}

export type GeneratedFile = {
  path: string;
  content: string;
};

export type GenerateResult = {
  files: GeneratedFile[];
  typedocJson: string;
  shapeSymbols: Set<string>;
};

export function generate(options: GenerateOptions): GenerateResult {
  const tsconfig = ts.readConfigFile(options.tsconfig, ts.sys.readFile);

  const parsed = ts.parseJsonConfigFileContent(tsconfig.config, ts.sys, ".");

  const program = ts.createProgram({
    rootNames: options.input,
    options: parsed.options,
  });
  const checker = program.getTypeChecker();

  const inputFiles: InputFileInfo[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    const fileInfo = analyzeFile(checker, sourceFile, options);
    if (fileInfo) {
      inputFiles.push(fileInfo);
    }
  }

  const outFiles: GeneratedFile[] = [];
  let shapeSymbols: Set<string> = new Set();

  for (const inputFile of inputFiles) {
    const filePaths = createFilePaths(inputFile, options.outDir);

    const schemaFile = generateSchemaFile(inputFile, filePaths, options);
    shapeSymbols = shapeSymbols.union(schemaFile.shapeSymbols);
    outFiles.push({
      path: filePaths.schema,
      content: schemaFile.content,
    });

    outFiles.push({
      path: filePaths.immutableInterface,
      content: generateImmutableInterfaceFile(inputFile, filePaths),
    });
  }

  const typedocJson = JSON.stringify(
    {
      intentionallyNotExported: Array.from(shapeSymbols),
    },
    null,
    2,
  );

  return {
    files: outFiles,
    typedocJson,
    shapeSymbols,
  };
}

export async function generateFormatted(
  options: GenerateOptions,
  formatConfig?: FormatConfig | undefined,
): Promise<GenerateResult> {
  const result = generate(options);

  return {
    files: await Promise.all(
      result.files.map(async (file) => ({
        path: file.path,
        content: (await format(file.path, file.content, formatConfig)).code,
      })),
    ),
    typedocJson: (await format("typedoc.json", result.typedocJson, formatConfig)).code,
    shapeSymbols: result.shapeSymbols,
  };
}
