import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { analyzeFiles } from "./analyzer";
import { readAnalysisCache, resolveAnalysisInputs, writeAnalysisCache } from "./cache";
import { generateCode } from "./generate-code";
import { OrderGraph } from "./order-graph";
import { generateSchema } from "./schema";

describe("analysis cache", () => {
  let directory: string;
  let samplePath: string;
  let cachePath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "xml-schema-cache-"));
    samplePath = path.join(directory, "a.xml");
    cachePath = path.join(directory, "schema.cache.json");
    await fs.writeFile(samplePath, '<a x="123"/>');
  });

  afterEach(async () => {
    // Fixtures are flat; remove only files in this test's own temporary directory.
    for (const file of await fs.readdir(directory)) await fs.unlink(path.join(directory, file));
    await fs.rmdir(directory);
  });

  async function save(input: string | readonly string[] = samplePath) {
    const inputs = await resolveAnalysisInputs(input);
    const data = await analyzeFiles(inputs.files.map((file) => file.path));
    await writeAnalysisCache(cachePath, inputs, data);
    return { inputs, data };
  }

  it("round-trips analyzed Maps, Sets, and order graphs with input metadata", async () => {
    const { inputs, data } = await save();
    const cached = await readAnalysisCache(cachePath, await resolveAnalysisInputs(samplePath));
    expect(cached).toEqual(data);
    expect(cached?.elements.get("a")?.attributes.get("x")?.observedTypes).toEqual(
      new Set(["unsignedInt"]),
    );
    expect(cached?.elements.get("a")?.attributeOrder).toBeInstanceOf(OrderGraph);
    expect(JSON.parse(await fs.readFile(cachePath, "utf-8")).inputs).toEqual(inputs);
  });

  it("reuses cached analysis when changing schema and code generation options", async () => {
    await save();
    const cached = (await readAnalysisCache(cachePath, await resolveAnalysisInputs(samplePath)))!;
    const code = generateCode(
      generateSchema(cached, {
        forceKind: { a: "object" },
        mergeNumberSuffix: true,
        predefinedSchemas: {},
        schemaOverrides: { a: { properties: { x: { type: "string", optional: true } } } },
      }),
      { interfaceNames: { a: "Renamed" } },
    );
    expect(code).toContain("export interface Renamed {\n  x?: string;");
    expect(generateCode(generateSchema(cached))).toContain("x: number;");
  });

  it("normalizes equivalent absolute paths", async () => {
    await save();
    expect(
      await readAnalysisCache(
        cachePath,
        await resolveAnalysisInputs(path.join(directory, "unused", "..", "a.xml")),
      ),
    ).toBeDefined();
  });

  it("invalidates on input config changes even when the matched file list is the same", async () => {
    await save(path.join(directory, "*.xml"));
    expect(
      await readAnalysisCache(
        cachePath,
        await resolveAnalysisInputs(path.join(directory, "a*.xml")),
      ),
    ).toBeUndefined();
  });

  it("invalidates when the input file list grows or shrinks", async () => {
    const input = path.join(directory, "*.xml");
    const initial = await save(input);
    const extra = path.join(directory, "b.xml");
    await fs.writeFile(extra, '<a x="true"/>');
    const expanded = await resolveAnalysisInputs(input);
    expect(await readAnalysisCache(cachePath, expanded)).toBeUndefined();
    await writeAnalysisCache(cachePath, expanded, initial.data);
    await fs.unlink(extra);
    expect(await readAnalysisCache(cachePath, await resolveAnalysisInputs(input))).toBeUndefined();
  });

  it("invalidates when explicit file order changes", async () => {
    const extra = path.join(directory, "b.xml");
    await fs.writeFile(extra, '<a x="true"/>');
    await save([samplePath, extra]);
    expect(
      await readAnalysisCache(cachePath, await resolveAnalysisInputs([extra, samplePath])),
    ).toBeUndefined();
  });

  it("invalidates when file size changes even if mtime is preserved", async () => {
    await fs.utimes(samplePath, 1000000, 1000000);
    await save();
    await fs.writeFile(samplePath, '<a x="123456789"/>');
    await fs.utimes(samplePath, 1000000, 1000000);
    expect(
      await readAnalysisCache(cachePath, await resolveAnalysisInputs(samplePath)),
    ).toBeUndefined();
  });

  it("invalidates when mtime changes even if file size is unchanged", async () => {
    const { inputs } = await save();
    await fs.writeFile(samplePath, '<a x="456"/>');
    const later = new Date(inputs.files[0]!.mtimeMs + 10000);
    await fs.utimes(samplePath, later, later);
    expect(
      await readAnalysisCache(cachePath, await resolveAnalysisInputs(samplePath)),
    ).toBeUndefined();
  });

  it("treats missing, old, or invalid JSON cache files as cache misses", async () => {
    const inputs = await resolveAnalysisInputs(samplePath);
    expect(await readAnalysisCache(cachePath, inputs)).toBeUndefined();
    await fs.writeFile(cachePath, JSON.stringify({ elements: {} }));
    expect(await readAnalysisCache(cachePath, inputs)).toBeUndefined();
    await fs.writeFile(cachePath, "{invalid");
    expect(await readAnalysisCache(cachePath, inputs)).toBeUndefined();
  });
});
