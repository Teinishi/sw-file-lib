import ts from "typescript";
import { prefixPriority, type OrderGraph } from "./order-graph";
import type { SchemaEntry, SchemaPropertyData, SchemaReference, SchemaTypeData } from "./schema";

function makeUniqueIdentifiers(paths: readonly (readonly string[])[]): string[][] {
  // 各識別子で採用している元配列のインデックス
  const used: number[][] = paths.map((p) => [p.length - 1]);

  const build = (i: number) => used[i]!.map((j) => paths[i]![j]!);
  const key = (i: number) => build(i).join("\0");

  // ---- 1. 一意になるまで左へ広げる ----
  while (true) {
    const groups = new Map<string, number[]>();

    for (let i = 0; i < paths.length; i++) {
      const k = key(i);
      const g = groups.get(k) ?? [];
      g.push(i);
      groups.set(k, g);
    }

    const dup = [...groups.values()].filter((g) => g.length > 1);
    if (dup.length === 0) break;

    for (const group of dup) {
      for (const i of group) {
        const left = used[i]![0]! - 1;
        if (left < 0) {
          throw new Error("Duplicate paths cannot be uniquely identified.");
        }
        used[i]!.unshift(left);
      }
    }
  }

  // ---- 2. 不要な要素を削る（最後は残す） ----
  for (let i = 0; i < paths.length; i++) {
    for (let k = 0; k < used[i]!.length - 1;) {
      const removed = used[i]![k]!;
      used[i]!.splice(k, 1);

      const mine = key(i);
      const unique = paths.every((_, j) => j === i || key(j) !== mine);

      if (!unique) {
        used[i]!.splice(k, 0, removed);
        k++;
      }
    }
  }

  return paths.map((_, i) => build(i)!);
}

function toPascalCase(parts: string[]): string {
  return parts
    .flatMap((part) => part.replace(/[^a-zA-Z0-9]/g, " ").split(" "))
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

export interface GenerateCodeOptions {
  /** Emit every property of generated interfaces as optional. Defaults to false. */
  readonly allPropertiesOptional?: boolean | undefined;
  /** Exact XML paths (root/child) mapped to interface names. Merged paths share one name. */
  readonly interfaceNames?: Readonly<Record<string, string>> | undefined;
}

const invalidTypeNames = new Set([
  "any",
  "bigint",
  "boolean",
  "intrinsic",
  "never",
  "number",
  "object",
  "string",
  "symbol",
  "undefined",
  "unknown",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  "await",
  "eval",
  "arguments",
]);

function isInterfaceName(name: string): boolean {
  if (!/^[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*$/u.test(name)) return false;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false);
  scanner.setText(name);
  const token = scanner.scan();
  return (
    (token === ts.SyntaxKind.Identifier || token > ts.SyntaxKind.LastReservedWord) &&
    !invalidTypeNames.has(name)
  );
}

function collectImports(type: SchemaTypeData, imports: Map<string, Set<string>>): void {
  switch (type.kind) {
    case "object":
      if (type.ref.kind === "external") {
        const names = imports.get(type.ref.importPath) ?? new Set<string>();
        names.add(type.ref.name);
        imports.set(type.ref.importPath, names);
      }
      break;
    case "list":
    case "metalist":
      collectImports(type.itemRef, imports);
      break;
    case "union":
      for (const member of type.types) collectImports(member, imports);
      break;
  }
}

function resolveIdentifiers(
  entries: SchemaEntry[],
  options: GenerateCodeOptions,
  imports: Map<string, Set<string>>,
): string[] {
  const specified = new Map(Object.entries(options.interfaceNames ?? {}));
  const unmatched = new Set(specified.keys());
  const reserved = new Set<string>();
  for (const names of imports.values()) {
    for (const name of names) {
      if (reserved.has(name)) throw new Error(`Conflicting external import name: ${name}`);
      reserved.add(name);
    }
  }
  for (const [path, name] of specified) {
    if (!isInterfaceName(name)) {
      throw new Error(`Invalid interface name ${JSON.stringify(name)} for XML path ${path}.`);
    }
  }

  const identifiers = entries.map((entry) => {
    const matches = entry.xmlLocations
      .map((location) => location.join("/"))
      .filter((path) => specified.has(path));
    for (const path of matches) unmatched.delete(path);
    const names = new Set(matches.map((path) => specified.get(path)!));
    if (names.size > 1) {
      throw new Error(
        `Conflicting interface names for merged XML paths: ${matches.map((path) => `${path} = ${specified.get(path)}`).join(", ")}`,
      );
    }
    const name = names.values().next().value;
    if (name !== undefined) {
      if (reserved.has(name)) {
        throw new Error(
          `Duplicate interface or external import name ${name} for XML paths: ${matches.join(", ")}`,
        );
      }
      reserved.add(name);
    }
    return name;
  });
  if (unmatched.size > 0) {
    throw new Error(`No generated interface for XML paths: ${[...unmatched].join(", ")}`);
  }

  // Keep existing automatic names wherever possible, including when overrides are present.
  const automatic = makeUniqueIdentifiers(entries.map((entry) => entry.xmlLocations[0]!)).map(
    toPascalCase,
  );
  const unavailable = new Set([...reserved, ...automatic]);
  return identifiers.map((explicit, index) => {
    if (explicit !== undefined) return explicit;
    const candidate = automatic[index]!;
    const base = isInterfaceName(candidate) ? candidate : `Xml${candidate}`;
    let name = base;
    let suffix = 2;
    if (reserved.has(name)) {
      do {
        name = `${base}${suffix++}`;
      } while (unavailable.has(name));
    }
    reserved.add(name);
    unavailable.add(name);
    return name;
  });
}

function generateSchemaTypeCode(
  type: SchemaTypeData,
  getIdentifier: (ref: SchemaReference) => string,
  location: string,
): { comment?: string; body: string } {
  switch (type.kind) {
    case "inline":
      return { body: type.type };
    case "object":
      return { body: getIdentifier(type.ref) };
    case "list":
    case "metalist":
      const itemCode = generateSchemaTypeCode(type.itemRef, getIdentifier, location);
      if (itemCode.comment) {
        throw new Error(
          `Cannot represent nested list/metalist with one @xml-schema marker at ${location}.`,
        );
      }
      return {
        comment: `// @xml-schema ${type.kind} ${JSON.stringify(type.itemTag)}`,
        body: `${type.itemRef.kind === "union" ? `(${itemCode.body})` : itemCode.body}[]`,
      };
    case "union":
      const members = type.types.map((t) => generateSchemaTypeCode(t, getIdentifier, location));
      if (members.some((member) => member.comment)) {
        throw new Error(
          `Cannot represent list/metalist inside a union with one @xml-schema marker at ${location}.`,
        );
      }
      return {
        body: members.map((member) => member.body).join(" | "),
      };
  }
}

function mergeArrays(a: string[], b: string[]): string[] {
  const setA = new Set(a);
  const setB = new Set(b);

  const onlyA = a.filter((x) => !setB.has(x));
  const common = a.filter((x) => setB.has(x));
  const onlyB = b.filter((x) => !setA.has(x));

  return [...onlyA, ...common, ...onlyB];
}

function generateObjectSchemaCode(
  identifier: string,
  properties: Record<string, SchemaPropertyData>,
  attributeOrder: OrderGraph<string>,
  childOrder: OrderGraph<string>,
  getIdentifier: (ref: SchemaReference) => string,
  options: GenerateCodeOptions,
): string {
  const order = mergeArrays(
    attributeOrder.topoSort(prefixPriority),
    childOrder.topoSort(prefixPriority),
  );

  let code = `export interface ${identifier} {\n`;

  for (const key of order) {
    const prop = properties[key];
    if (!prop) {
      throw new Error(`Unexpected error: Property ${key} not found.`);
    }
    const needQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.key);
    const optionalMark = options.allPropertiesOptional || prop.isOptional ? "?" : "";
    const typeCode = generateSchemaTypeCode(prop.type, getIdentifier, `${identifier}.${prop.key}`);
    if (typeCode.comment) {
      code += `  ${typeCode.comment}\n`;
    }
    code += `  ${needQuotes ? `"${prop.key}"` : prop.key}${optionalMark}: ${typeCode.body};\n`;
  }

  code += `}\n`;

  return code;
}

function generateCodeEntry(
  entry: SchemaEntry,
  identifier: string,
  getIdentifier: (ref: SchemaReference) => string,
  options: GenerateCodeOptions,
): string {
  switch (entry.kind) {
    case "object":
      return generateObjectSchemaCode(
        identifier,
        entry.properties,
        entry.attributeOrder,
        entry.childOrder,
        getIdentifier,
        options,
      );
    default:
      throw new Error("Unimplemented");
  }
}

export function generateCode(
  schemaEntries: SchemaEntry[],
  options: GenerateCodeOptions = {},
): string {
  const importMap = new Map<string, Set<string>>();
  for (const entry of schemaEntries) {
    for (const property of Object.values(entry.properties))
      collectImports(property.type, importMap);
  }
  const identifiers = resolveIdentifiers(schemaEntries, options, importMap);

  const getIdentifier = (ref: SchemaReference) => {
    switch (ref.kind) {
      case "internal":
        const entry = schemaEntries[ref.index];
        if (!entry) {
          throw new Error("Entry not found for reference.");
        }
        return identifiers[ref.index]!;
      case "external":
        return ref.name;
    }
  };

  const codeEntries = [];

  for (const [i, entry] of schemaEntries.entries()) {
    const identifier = identifiers[i]!;
    codeEntries.push(generateCodeEntry(entry, identifier, getIdentifier, options));
  }

  const importStatements = Array.from(importMap.entries())
    .map(([importPath, names]) =>
      names.size > 0
        ? `import type { ${Array.from(names).join(", ")} } from "${importPath}";`
        : null,
    )
    .filter((s): s is string => s !== null);
  if (importStatements.length > 0) {
    codeEntries.unshift(importStatements.join("\n") + "\n");
  }

  return codeEntries.join("\n");
}
