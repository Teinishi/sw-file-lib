import type { PredefinedSchema, PredefinedSchemaFile, PredefinedSchemaType } from ".";
import {
  schemaTypeEquals,
  type ElementSchemaType,
  type SchemaProperty,
  type SchemaType,
} from "./analyzer";

function makeUniqueIdentifiers(paths: readonly (readonly string[])[]): string[][] {
  const result: string[][] = [];

  // 同じ末尾を持つグループ内で、末尾を除いた識別子を作る
  function solveGroup(items: { index: number; path: string[] }[]): Map<number, string[]> {
    const out = new Map<number, string[]>();
    const groups = new Map<string, { index: number; path: string[] }[]>();

    for (const item of items) {
      const last = item.path.at(-1);

      if (last === undefined) {
        throw new Error("Duplicate paths cannot be uniquely identified.");
      }

      const prefix = item.path.slice(0, -1);
      (groups.get(last) ?? groups.set(last, []).get(last)!).push({
        index: item.index,
        path: prefix,
      });
    }

    for (const [last, group] of groups) {
      if (group.length === 1) {
        // ここで一意なら、この要素だけ採用
        out.set(group[0]!.index, [last]);
      } else {
        // 衝突したらさらに左を見る（last 自体は共通なので採用しない）
        const sub = solveGroup(group);
        for (const item of group) {
          out.set(item.index, sub.get(item.index)!);
        }
      }
    }

    return out;
  }

  // 最後の要素ごとに開始
  const root = new Map<string, { index: number; path: string[] }[]>();

  paths.forEach((path, index) => {
    const last = path.at(-1);
    if (last === undefined) throw new Error("Empty path is not allowed.");

    const prefix = path.slice(0, -1);
    (root.get(last) ?? root.set(last, []).get(last)!).push({
      index,
      path: prefix,
    });
  });

  for (const [last, group] of root) {
    if (group.length === 1) {
      result[group[0]!.index] = [last];
    } else {
      const sub = solveGroup(group);
      for (const item of group) {
        result[item.index] = [...sub.get(item.index)!, last];
      }
    }
  }

  return result;
}

function toPascalCase(parts: string[]): string {
  return parts
    .flatMap((part) => part.replace(/[^a-zA-Z0-9]/g, " ").split(" "))
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

function schemaTypeCode(
  schemaType: SchemaType,
  identifierMap: Map<ElementSchemaType, string>,
): string {
  switch (schemaType.kind) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      const identifier = identifierMap.get(schemaType);
      if (!identifier) {
        throw new Error("Unexpected error: Identifier not found for schema.");
      }
      return identifier;
    case "list":
    case "metalist":
      return `${schemaTypeCode(schemaType.itemType, identifierMap)}[]`;
    case "union":
      return schemaType.types.map((t) => schemaTypeCode(t, identifierMap)).join(" | ");
  }
}

function propertyMemberCode(
  prop: SchemaProperty,
  identifierMap: Map<ElementSchemaType, string>,
  indent = "",
): string {
  const lines: string[] = [];

  const optional = prop.isOptional ? "?" : "";
  switch (prop.type.kind) {
    case "list":
      lines.push(`// @xml-schema list "${prop.type.itemTag}"`);
      break;
    case "metalist":
      lines.push(`// @xml-schema metalist "${prop.type.itemTag}"`);
      break;
  }

  const needQuote = !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(prop.key);
  const key = needQuote ? `"${prop.key}"` : prop.key;

  lines.push(`${key}${optional}: ${schemaTypeCode(prop.type, identifierMap)};`);

  return lines.map((l) => indent + l).join("\n");
}

function parsePredefinedSchemaType(type: PredefinedSchemaType): SchemaType {
  if (type === "string") {
    return { kind: "string" };
  } else if (type === "number") {
    return { kind: "number", numberKind: "float" };
  } else if (type === "boolean") {
    return { kind: "boolean" };
  } else if (Array.isArray(type)) {
    return { kind: "union", types: type.map(parsePredefinedSchemaType) };
  } else {
    return parsePredefinedSchema(type);
  }
}

function parsePredefinedSchema(schema: PredefinedSchema): ElementSchemaType {
  switch (schema.kind) {
    case "object":
      return {
        kind: "object",
        xmlLocations: [],
        properties: Object.entries(schema.properties).map(([key, prop]) => ({
          key,
          isOptional: prop.optional,
          type: parsePredefinedSchemaType(prop.type),
        })),
      };
    case "list":
      return {
        kind: "list",
        xmlLocations: [],
        itemTag: schema.itemTag,
        itemType: parsePredefinedSchemaType(schema.itemType),
      };
    case "metalist":
      return {
        kind: "metalist",
        xmlLocations: [],
        metaProperties: Object.entries(schema.metaProperties).map(([key, prop]) => ({
          key,
          isOptional: prop.optional,
          type: parsePredefinedSchemaType(prop.type),
        })),
        itemTag: schema.itemTag,
        itemType: parsePredefinedSchemaType(schema.itemType),
      };
  }
}

function reducePredefinedSchema(
  schemas: ElementSchemaType[],
  predefinedSchemas: PredefinedSchemaFile[],
): {
  imports: Map<string, string[]>;
  identifierMap: Map<ElementSchemaType, string>;
  reduced: ElementSchemaType[];
} {
  const flatPredefinedSchemas = predefinedSchemas.flatMap((f) =>
    Object.entries(f.schemas).map(([name, p]) => ({
      importPath: f.importPath,
      name,
      schema: parsePredefinedSchema(p),
    })),
  );

  const importTable = new Map<string, Map<string, boolean>>();
  for (const pFile of predefinedSchemas) {
    if (pFile.importPath !== undefined) {
      importTable.set(pFile.importPath, new Map(Object.keys(pFile.schemas).map((k) => [k, false])));
    }
  }

  const identifierMap = new Map<ElementSchemaType, string>();
  const reduced: ElementSchemaType[] = [];

  for (const schema of schemas) {
    let found = false;
    for (const predefined of flatPredefinedSchemas) {
      if (schemaTypeEquals(schema, predefined.schema, { ignoreNumberKind: true })) {
        identifierMap.set(schema, predefined.name);
        if (predefined.importPath !== undefined) {
          importTable.get(predefined.importPath)!.set(predefined.name, true);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      reduced.push(schema);
    }
  }

  const imports = new Map<string, string[]>();
  for (const [importPath, names] of importTable) {
    const usedNames = Array.from(names.entries())
      .filter(([_, used]) => used)
      .map(([name, _]) => name);
    if (usedNames.length > 0) {
      imports.set(importPath, usedNames);
    }
  }

  return { imports, identifierMap, reduced };
}

function mergeIdenticalSchemas(schemas: ElementSchemaType[]): {
  merged: ElementSchemaType[];
  map: Map<ElementSchemaType, ElementSchemaType>;
} {
  const map = new Map<ElementSchemaType, ElementSchemaType>();
  const merged: ElementSchemaType[] = [];

  for (const schema of schemas) {
    const existing = merged.find((s) => schemaTypeEquals(s, schema, { ignoreNumberKind: true }));
    if (existing) {
      existing.xmlLocations.push(...schema.xmlLocations);
      map.set(schema, existing);
    } else {
      merged.push(schema);
    }
  }

  return { merged, map };
}

export function generateInterfaceCode(
  rootSchemas: ElementSchemaType[],
  predefinedSchemas?: PredefinedSchemaFile[] | undefined,
): string {
  const flatEntries: ElementSchemaType[] = [];

  function visit(schema: ElementSchemaType) {
    if (schema.kind === "object" || schema.kind === "metalist") {
      flatEntries.push(schema);
    }

    switch (schema.kind) {
      case "object":
        for (const prop of schema.properties) {
          if (
            prop.type.kind === "object" ||
            prop.type.kind === "list" ||
            prop.type.kind === "metalist"
          ) {
            visit(prop.type);
          }
        }
        break;
      case "list":
      case "metalist":
        if (
          schema.itemType.kind === "object" ||
          schema.itemType.kind === "list" ||
          schema.itemType.kind === "metalist"
        ) {
          visit(schema.itemType);
        }
        break;
    }
  }

  for (const schema of rootSchemas) {
    visit(schema);
  }

  const pResult = reducePredefinedSchema(flatEntries, predefinedSchemas ?? []);
  const { merged: entries, map: schemaMergeMap } = mergeIdenticalSchemas(pResult.reduced);

  const identifiers = makeUniqueIdentifiers(entries.map((e) => e.xmlLocations[0]!)).map(
    toPascalCase,
  );

  const identifierMap = new Map<ElementSchemaType, string>();
  for (let i = 0; i < entries.length; i++) {
    identifierMap.set(entries[i]!, identifiers[i]!);
  }
  for (const [original, merged] of schemaMergeMap) {
    identifierMap.set(original, identifierMap.get(merged)!);
  }
  for (const [original, predefined] of pResult.identifierMap) {
    identifierMap.set(original, predefined);
  }

  const codeEntries: string[] = [];

  if (pResult.imports.size > 0) {
    const lines: string[] = [];
    for (const [importPath, names] of pResult.imports) {
      lines.push(`import { ${names.join(", ")} } from "${importPath}";`);
    }
    codeEntries.push(lines.join("\n") + "\n");
  }

  for (const schema of entries) {
    if (!identifierMap.has(schema)) {
      throw new Error("Unexpected error: Identifier not found for schema.");
    }

    const lines: string[] = [];

    switch (schema.kind) {
      case "object":
        lines.push("// @xml-schema");
        lines.push(`export interface ${identifierMap.get(schema)} {`);
        for (const prop of schema.properties) {
          lines.push(propertyMemberCode(prop, identifierMap, "  "));
        }
        lines.push("}");
        break;
      default:
        throw new Error("Unimplemented");
    }

    codeEntries.push(lines.join("\n") + "\n");
  }

  return codeEntries.join("\n");
}
