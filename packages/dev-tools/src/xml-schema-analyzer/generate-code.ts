import ts from "typescript";
import type { DocumentData } from "./analyzer";
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

export interface GenerateCodeSource {
  readonly documentData?: DocumentData | undefined;
  readonly inputFiles?: readonly string[] | undefined;
  readonly outputPath?: string | undefined;
}

export interface InterfaceParentInfo {
  readonly identifier: string;
  readonly schema: SchemaEntry;
  /** Paths relative to the parent interface, e.g. child, children[], meta.child, items[].child. */
  readonly propertyPaths: readonly string[];
}

export interface InterfaceTSDocContext {
  readonly identifier: string;
  readonly schemaIndex: number;
  /** Final schema after overrides and merging. For metalists, properties describe meta. */
  readonly schema: SchemaEntry;
  readonly xmlLocations: readonly (readonly string[])[];
  /** Includes inlined item schemas whose standalone declarations are omitted. */
  readonly schemaEntries: readonly SchemaEntry[];
  /** Emitted interfaces that directly reference this interface in their generated types. */
  readonly parents: readonly InterfaceParentInfo[];
  /** Original XML analysis when supplied to generateCode; treat it as read-only. */
  readonly documentData: DocumentData | undefined;
  readonly inputFiles: readonly string[] | undefined;
  readonly outputPath: string | undefined;
  readonly allPropertiesOptional: boolean;
  readonly preferStringInUnions: boolean;
  readonly getIdentifier: (ref: SchemaReference) => string;
  /** External references have no local schema and return undefined. */
  readonly getSchema: (ref: SchemaReference) => SchemaEntry | undefined;
}

export interface GenerateCodeOptions {
  readonly precedingCode?: string | undefined;
  /** Return TSDoc body text (without comment delimiters), or undefined to omit it. Synchronous. */
  readonly generateTSDoc?: ((context: InterfaceTSDocContext) => string | undefined) | undefined;
  /** Make generated properties optional, except metalist meta/items wrappers. Defaults to false. */
  readonly allPropertiesOptional?: boolean | undefined;
  /** When a union contains string, omit its number and boolean members. Defaults to false. */
  readonly preferStringInUnions?: boolean | undefined;
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
  options: GenerateCodeOptions,
): { comment?: string; body: string; isUnion?: boolean } {
  switch (type.kind) {
    case "inline":
      return { body: type.type };
    case "object":
      return { body: getIdentifier(type.ref) };
    case "list":
      const itemCode = generateSchemaTypeCode(type.itemRef, getIdentifier, location, options);
      if (itemCode.comment) {
        throw new Error(
          `Cannot represent nested list/metalist with one @xml-schema marker at ${location}.`,
        );
      }
      return {
        comment: `// @xml-schema ${type.kind} ${JSON.stringify(type.itemTag)}`,
        body: `${itemCode.isUnion ? `(${itemCode.body})` : itemCode.body}[]`,
      };
    case "union":
      const flatten = (member: SchemaTypeData): SchemaTypeData[] =>
        member.kind === "union" ? member.types.flatMap(flatten) : [member];
      const types = type.types.flatMap(flatten);
      const preferString =
        options.preferStringInUnions &&
        types.some((member) => member.kind === "inline" && member.type === "string");
      const filtered = preferString
        ? types.filter(
            (member) =>
              member.kind !== "inline" || (member.type !== "number" && member.type !== "boolean"),
          )
        : types;
      const members = filtered.map((t) =>
        generateSchemaTypeCode(t, getIdentifier, location, options),
      );
      if (members.some((member) => member.comment)) {
        throw new Error(
          `Cannot represent list/metalist inside a union with one @xml-schema marker at ${location}.`,
        );
      }
      return {
        body: members.map((member) => member.body).join(" | "),
        isUnion: members.length > 1,
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

function generateObjectTypeCode(
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

  let code = `{\n`;

  for (const key of order) {
    const prop = properties[key];
    if (!prop) {
      throw new Error(`Unexpected error: Property ${key} not found.`);
    }
    const needQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.key);
    const optionalMark = options.allPropertiesOptional || prop.isOptional ? "?" : "";
    const typeCode = generateSchemaTypeCode(
      prop.type,
      getIdentifier,
      `${identifier}.${prop.key}`,
      options,
    );
    if (typeCode.comment) {
      code += `  ${typeCode.comment}\n`;
    }
    code += `  ${needQuotes ? `"${prop.key}"` : prop.key}${optionalMark}: ${typeCode.body};\n`;
  }

  code += `}`;

  return code;
}

function generateCodeEntry(
  entry: SchemaEntry,
  identifier: string,
  getIdentifier: (ref: SchemaReference) => string,
  options: GenerateCodeOptions,
  getEntry: (ref: SchemaReference) => SchemaEntry | undefined,
): string {
  switch (entry.kind) {
    case "object":
      return `export interface ${identifier} ${generateObjectTypeCode(
        identifier,
        entry.properties,
        entry.attributeOrder,
        entry.childOrder,
        getIdentifier,
        options,
      )}\n`;
    case "metalist":
      const metaCode = generateObjectTypeCode(
        `${identifier}.meta`,
        entry.properties,
        entry.attributeOrder,
        entry.childOrder,
        getIdentifier,
        options,
      );
      let itemBody: string;
      if (entry.itemRef.kind === "object") {
        const itemEntry = getEntry(entry.itemRef.ref);
        if (itemEntry?.kind === "object") {
          const itemCode = generateObjectTypeCode(
            `${identifier}.items`,
            itemEntry.properties,
            itemEntry.attributeOrder,
            itemEntry.childOrder,
            getIdentifier,
            options,
          );
          itemBody = itemCode.replace(/\n/g, "\n  ");
        } else {
          itemBody = getIdentifier(entry.itemRef.ref);
        }
      } else if (entry.itemRef.kind === "inline" && entry.itemRef.type === "{}") {
        itemBody = "{}";
      } else {
        throw new Error(
          `Cannot represent metalist item type at ${identifier}.items: expected an object or metalist reference.`,
        );
      }
      return `export interface ${identifier} {\n  meta: ${metaCode.replace(/\n/g, "\n  ")};\n  items: ${itemBody}[];\n}\n`;
    default:
      throw new Error("Unimplemented");
  }
}

export function generateCode(
  schemaEntries: SchemaEntry[],
  options: GenerateCodeOptions = {},
  source: GenerateCodeSource = {},
): string {
  const inlinedItems = new Set<number>();
  const inlinePaths = new Set<string>();
  const referencedEntries = new Set<number>();
  const collectReferences = (type: SchemaTypeData): void => {
    switch (type.kind) {
      case "object":
        if (type.ref.kind === "internal") referencedEntries.add(type.ref.index);
        break;
      case "list":
        collectReferences(type.itemRef);
        break;
      case "union":
        for (const member of type.types) collectReferences(member);
        break;
    }
  };
  for (const entry of schemaEntries) {
    for (const property of Object.values(entry.properties)) collectReferences(property.type);
    if (entry.kind !== "metalist") continue;
    if (
      entry.itemRef.kind === "object" &&
      entry.itemRef.ref.kind === "internal" &&
      schemaEntries[entry.itemRef.ref.index]?.kind === "object"
    ) {
      inlinedItems.add(entry.itemRef.ref.index);
      for (const location of entry.xmlLocations)
        inlinePaths.add([...location, entry.itemTag].join("/"));
    } else {
      collectReferences(entry.itemRef);
    }
  }

  const importMap = new Map<string, Set<string>>();
  for (const entry of schemaEntries) {
    if (entry.kind === "metalist") collectImports(entry.itemRef, importMap);
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
  const getSchema = (ref: SchemaReference) =>
    ref.kind === "internal" ? schemaEntries[ref.index] : undefined;

  const emittedIndices = new Set(
    schemaEntries.flatMap((entry, i) =>
      inlinedItems.has(i) &&
      !referencedEntries.has(i) &&
      entry.xmlLocations.every((location) => inlinePaths.has(location.join("/")))
        ? []
        : [i],
    ),
  );
  type ParentInfo = Omit<InterfaceParentInfo, "propertyPaths"> & { propertyPaths: string[] };
  const parentsBySchema = new Map<number, Map<number, ParentInfo>>();
  for (const parentIndex of emittedIndices) {
    const parent = schemaEntries[parentIndex]!;
    const visit = (type: SchemaTypeData, propertyPath: string): void => {
      switch (type.kind) {
        case "object":
          if (type.ref.kind === "internal" && emittedIndices.has(type.ref.index)) {
            const parents = parentsBySchema.get(type.ref.index) ?? new Map<number, ParentInfo>();
            const info = parents.get(parentIndex) ?? {
              identifier: identifiers[parentIndex]!,
              schema: parent,
              propertyPaths: [],
            };
            if (!info.propertyPaths.includes(propertyPath)) info.propertyPaths.push(propertyPath);
            parents.set(parentIndex, info);
            parentsBySchema.set(type.ref.index, parents);
          }
          break;
        case "list":
          visit(type.itemRef, `${propertyPath}[]`);
          break;
        case "union":
          for (const member of type.types) visit(member, propertyPath);
          break;
      }
    };
    const visitProperties = (entry: SchemaEntry, prefix: string): void => {
      for (const property of Object.values(entry.properties)) {
        const segment = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(property.key)
          ? `${prefix ? "." : ""}${property.key}`
          : `[${JSON.stringify(property.key)}]`;
        visit(property.type, `${prefix}${segment}`);
      }
    };
    visitProperties(parent, parent.kind === "metalist" ? "meta" : "");
    if (parent.kind === "metalist") {
      const itemEntry =
        parent.itemRef.kind === "object" ? getSchema(parent.itemRef.ref) : undefined;
      if (itemEntry?.kind === "object") visitProperties(itemEntry, "items[]");
      else visit(parent.itemRef, "items[]");
    }
  }

  for (const [i, entry] of schemaEntries.entries()) {
    // Keep definitions shared with other XML locations or referenced by emitted types.
    if (!emittedIndices.has(i)) continue;
    const identifier = identifiers[i]!;
    const declaration = generateCodeEntry(entry, identifier, getIdentifier, options, getSchema);
    const content = options.generateTSDoc?.({
      identifier,
      schemaIndex: i,
      schema: entry,
      xmlLocations: entry.xmlLocations,
      schemaEntries,
      parents: [...(parentsBySchema.get(i)?.values() ?? [])],
      documentData: source.documentData,
      inputFiles: source.inputFiles,
      outputPath: source.outputPath,
      allPropertiesOptional: options.allPropertiesOptional ?? false,
      preferStringInUnions: options.preferStringInUnions ?? false,
      getIdentifier,
      getSchema,
    });
    let tsdoc = "";
    if (content?.trim()) {
      if (content.includes("*/")) {
        throw new Error(
          `generateTSDoc must return comment body text without closing delimiters at ${identifier}.`,
        );
      }
      tsdoc = `/**\n${content
        .trim()
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => (line ? ` * ${line}` : " *"))
        .join("\n")}\n */\n`;
    }
    const marker =
      entry.kind === "metalist"
        ? `// @xml-schema metalist ${JSON.stringify(entry.itemTag)}`
        : "// @xml-schema";
    codeEntries.push(`${marker}\n${tsdoc}${declaration}`);
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

  let code = codeEntries.join("\n");
  if (options.precedingCode !== undefined) {
    code = options.precedingCode + "\n" + code;
  }

  return code;
}
