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
  check?: boolean;
}

export type GeneratedFile = {
  path: string;
  content: string;
};

export function generate(options: GenerateOptions): GeneratedFile[] {
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

  for (const inputFile of inputFiles) {
    const filePaths = createFilePaths(inputFile, options.outDir);

    outFiles.push({
      path: filePaths.schema,
      content: generateSchemaFile(inputFile, filePaths, options),
    });

    outFiles.push({
      path: filePaths.immutableInterface,
      content: generateImmutableInterfaceFile(inputFile, filePaths),
    });
  }

  return outFiles;
}
