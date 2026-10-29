import fs from "node:fs/promises";
import { parseSwXml } from "@sw-file-lib/xml";
import { analyzeDocument, intersectDocumentData } from "./document";
import type { AnalyzeOptions, DocumentData } from "./types";

export * from "./types";

function batch<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

export async function analyzeFiles(
  inputFiles: string[],
  options?: AnalyzeOptions,
  progressCallback?: (current: number, total: number) => void,
): Promise<DocumentData> {
  const batches = batch(inputFiles, 100);

  let result: DocumentData | null = null;

  const total = inputFiles.length;
  let i = 0;
  for (const batchFiles of batches) {
    const batchResult = await Promise.all(
      batchFiles.map((file) =>
        fs.readFile(file, "utf-8").then((content) => {
          const root = parseSwXml(content);
          const data = analyzeDocument(root, options);
          i++;
          progressCallback?.(i, total);
          return data;
        }),
      ),
    );

    const merged = batchResult.reduce((acc, docData) =>
      intersectDocumentData(acc, docData, options),
    );

    if (result === null) {
      result = merged;
    } else {
      result = intersectDocumentData(result, merged, options);
    }
  }

  if (result === null) {
    throw new Error("No files were given.");
  }

  return result;
}
