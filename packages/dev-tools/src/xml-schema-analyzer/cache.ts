import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentData } from "./analyzer";
import { OrderGraph } from "./order-graph";

export interface AnalysisInputs {
  readonly input: string | readonly string[];
  readonly files: readonly {
    readonly path: string;
    readonly size: number;
    readonly mtimeMs: number;
  }[];
}

interface AnalysisCache {
  inputs: AnalysisInputs;
  documentData: DocumentData;
}

export async function resolveAnalysisInputs(
  input: string | readonly string[],
): Promise<AnalysisInputs> {
  const resolvedInput =
    typeof input === "string" ? path.resolve(input) : input.map((file) => path.resolve(file));
  // Array input is an explicit file list; string input is a glob, as in the CLI.
  const files =
    typeof resolvedInput === "string"
      ? (await Array.fromAsync(fs.glob(resolvedInput))).sort()
      : resolvedInput;
  return {
    input: resolvedInput,
    files: await Promise.all(
      files.map(async (file) => {
        const stat = await fs.stat(file);
        return { path: file, size: stat.size, mtimeMs: stat.mtimeMs };
      }),
    ),
  };
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof OrderGraph) {
    return { __type: "OrderGraph", ...value.toObject() };
  } else if (value instanceof Map) {
    return { __type: "Map", entries: Object.fromEntries(value) };
  } else if (value instanceof Set) {
    return { __type: "Set", entries: Array.from(value) };
  }
  return value;
}

function jsonReceiver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && "__type" in value) {
    if (value["__type"] === "OrderGraph") {
      return OrderGraph.fromObject(value as any);
    } else if (value["__type"] === "Map") {
      return new Map(Object.entries((value as any).entries));
    } else if (value["__type"] === "Set") {
      return new Set((value as any).entries);
    }
  }
  return value;
}

export async function readAnalysisCache(
  cachePath: string,
  inputs: AnalysisInputs,
): Promise<DocumentData | undefined> {
  let cache: AnalysisCache | null;
  try {
    cache = JSON.parse(await fs.readFile(cachePath, "utf-8"), jsonReceiver);
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT")
      return undefined;
    throw error;
  }
  if (JSON.stringify(cache?.inputs) !== JSON.stringify(inputs)) return undefined;
  return cache?.documentData?.elements instanceof Map ? cache.documentData : undefined;
}

export async function writeAnalysisCache(
  cachePath: string,
  inputs: AnalysisInputs,
  documentData: DocumentData,
): Promise<void> {
  const cache: AnalysisCache = { inputs, documentData };
  await fs.writeFile(cachePath, JSON.stringify(cache, jsonReplacer, 2), "utf-8");
}
