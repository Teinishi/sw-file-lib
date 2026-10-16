import type { PredefinedSchema, PredefinedSchemaProperty } from ".";
import {
  unionRanges,
  type DocumentData,
  type NodeData,
  type Range,
  type XmlLocation,
} from "./analyzer";
import { OrderGraph, prefixPriority } from "./order-graph";

function jsonUnique<T>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [JSON.stringify(row), row])).values()];
}

export interface SchemaOverride {
  /** Add or override primitive properties, including their optionality. */
  readonly properties: Readonly<Record<string, Readonly<PredefinedSchemaProperty>>>;
}

export interface GenerateSchemaOptions {
  predefinedSchemas?: Record<string, Record<string, PredefinedSchema>> | undefined;
  forceKind?:
    | Record<string, "object" | "list" | "metalist">
    | ((xmlLocation: XmlLocation) => "object" | "list" | "metalist" | undefined)
    | undefined;
  mergeNumberSuffix?: boolean | undefined;
  /** Exact XML object paths (root/child) to supplement before schema merging. */
  schemaOverrides?: Readonly<Record<string, SchemaOverride>> | undefined;
}

export type SchemaReference =
  | {
      readonly kind: "internal";
      readonly index: number;
    }
  | {
      readonly kind: "external";
      readonly importPath: string;
      readonly name: string;
    };

export type SchemaTypeData =
  | { readonly kind: "inline"; readonly type: "string" | "number" | "boolean" | "{}" }
  | { readonly kind: "object"; readonly ref: SchemaReference }
  | { readonly kind: "list"; readonly itemRef: SchemaTypeData }
  | { readonly kind: "metalist"; readonly itemRef: SchemaTypeData }
  | { readonly kind: "union"; readonly types: SchemaTypeData[] };

export interface SchemaPropertyData {
  readonly key: string;
  readonly isOptional: boolean;
  readonly type: SchemaTypeData;
  readonly possibleValues: readonly string[] | null;
  readonly numberRange: Range | null;
}

export type SchemaEntry = {
  readonly kind: "object";
  readonly xmlLocations: readonly XmlLocation[];
  readonly properties: Record<string, SchemaPropertyData>;
  readonly attributeOrder: OrderGraph<string>;
  readonly childOrder: OrderGraph<string>;
};

function schemaReferenceEqual(a: SchemaReference, b: SchemaReference): boolean {
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case "internal":
      return a.index === (b as any).index;
    case "external":
      return a.importPath === (b as any).importPath && a.name === (b as any).name;
  }
}

function createUnionType(types: SchemaTypeData[]): SchemaTypeData {
  const flattenedTypes: SchemaTypeData[] = [];
  for (const type of types) {
    if (type.kind === "union") {
      flattenedTypes.push(...type.types);
    } else {
      flattenedTypes.push(type);
    }
  }

  const uniqueTypes: SchemaTypeData[] = [];
  for (const type of flattenedTypes) {
    if (!uniqueTypes.some((t) => schemaTypeDataEqual(t, type))) {
      uniqueTypes.push(type);
    }
  }

  if (uniqueTypes.length === 1) {
    return uniqueTypes[0]!;
  } else {
    return { kind: "union", types: uniqueTypes };
  }
}

function schemaTypeDataEqual(a: SchemaTypeData, b: SchemaTypeData): boolean {
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case "inline":
      return a.type === (b as any).type;
    case "object":
      return schemaReferenceEqual(a.ref, (b as any).ref);
    case "list":
      return schemaTypeDataEqual(a.itemRef, (b as any).itemRef);
    case "metalist":
      return schemaTypeDataEqual(a.itemRef, (b as any).itemRef);
    case "union":
      const bTypes = (b as any).types as SchemaTypeData[];
      if (a.types.length !== bTypes.length) return false;
      for (let i = 0; i < a.types.length; i++) {
        if (!schemaTypeDataEqual(a.types[i]!, bTypes[i]!)) return false;
      }
      return true;
  }
}

function entryPropertiesCompatible(
  a: Record<string, SchemaPropertyData>,
  b: Record<string, SchemaPropertyData>,
  optionalityMode: "strict" | "loose" | "ignore" = "strict",
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    const aProp = a[key]!;
    const bProp = b[key];
    if (!bProp) return false;
    switch (optionalityMode) {
      case "strict":
        if (aProp.isOptional !== bProp.isOptional) return false;
        break;
      case "loose":
        if (aProp.isOptional && !bProp.isOptional) return false;
        break;
      case "ignore":
        break;
    }
    if (!schemaTypeDataEqual(aProp.type, bProp.type)) return false;
  }

  return true;
}

function mergeSchemaProperties(
  a: Record<string, SchemaPropertyData>,
  b: Record<string, SchemaPropertyData>,
): Record<string, SchemaPropertyData> {
  const merged: Record<string, SchemaPropertyData> = { ...a };

  for (const [key, bProp] of Object.entries(b)) {
    const aProp = merged[key];
    if (aProp) {
      const type: SchemaTypeData = schemaTypeDataEqual(aProp.type, bProp.type)
        ? aProp.type
        : createUnionType([aProp.type, bProp.type]);

      const possibleValues: string[] | null =
        aProp.possibleValues && bProp.possibleValues
          ? Array.from(new Set([...aProp.possibleValues, ...bProp.possibleValues]))
          : null;

      const numberRange: Range | null =
        aProp.numberRange && bProp.numberRange
          ? unionRanges(aProp.numberRange, bProp.numberRange)
          : (aProp.numberRange ?? bProp.numberRange);

      merged[key] = {
        key,
        isOptional: aProp.isOptional || bProp.isOptional,
        type,
        possibleValues,
        numberRange,
      };
    } else {
      merged[key] = bProp;
      continue;
    }
  }

  return merged;
}

function mergeSchemaEntries(a: SchemaEntry, b: SchemaEntry): SchemaEntry {
  const properties = mergeSchemaProperties(a.properties, b.properties);

  const attributeOrder = new OrderGraph<string>();
  attributeOrder.merge(a.attributeOrder);
  attributeOrder.merge(b.attributeOrder);

  const childOrder = new OrderGraph<string>();
  childOrder.merge(a.childOrder);
  childOrder.merge(b.childOrder);

  return {
    kind: "object",
    xmlLocations: jsonUnique([...a.xmlLocations, ...b.xmlLocations]),
    properties,
    attributeOrder,
    childOrder,
  };
}

type RegisterEntryFn = (entry: SchemaEntry) => SchemaReference;

function generateObjectSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: GenerateSchemaOptions,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  if (
    nodeData.attributes.size === 0 &&
    nodeData.children.size === 0 &&
    !Object.hasOwn(options.schemaOverrides ?? {}, xmlLocation.join("/"))
  ) {
    return {
      dependencies: [],
      data: { kind: "inline", type: "{}" },
    };
  }

  const dependencies: SchemaReference[] = [];
  const properties: Record<string, SchemaPropertyData> = {};

  for (const [attrName, attrData] of nodeData.attributes) {
    let type: "boolean" | "number" | "string";
    if (attrData.couldBeBoolean) {
      type = "boolean";
    } else if (attrData.couldBeFloat || attrData.couldBeInt || attrData.couldBeUnsignedInt) {
      type = "number";
    } else {
      type = "string";
    }

    properties[attrName] = {
      key: attrName,
      isOptional: attrData.isOptional,
      type: { kind: "inline", type },
      possibleValues: attrData.possibleValues ? Array.from(attrData.possibleValues) : null,
      numberRange: attrData.numberRange,
    };
  }

  for (const childTag of nodeData.childOrder.topoSort(prefixPriority)) {
    const childNodeData = nodeData.children.get(childTag);
    if (!childNodeData) {
      throw new Error(`Unexpected error: Child node data for tag ${childTag} not found.`);
    }

    const { dependencies: childDependencies, data: childTypeData } = generateNodeSchema(
      [...xmlLocation, childTag],
      childNodeData,
      registerEntry,
      options,
    );
    dependencies.push(...childDependencies);

    const existing = properties[childTag];
    if (existing) {
      properties[childTag] = {
        key: childTag,
        isOptional: existing.isOptional || childNodeData.isOptional,
        type: createUnionType([existing.type, childTypeData]),
        possibleValues: null,
        numberRange: null,
      };
    } else {
      properties[childTag] = {
        key: childTag,
        isOptional: childNodeData.isOptional,
        type: childTypeData,
        possibleValues: null,
        numberRange: null,
      };
    }
  }

  const ref = registerEntry({
    kind: "object",
    xmlLocations: [xmlLocation],
    properties: properties,
    attributeOrder: nodeData.attributeOrder,
    childOrder: nodeData.childOrder,
  });

  return {
    dependencies,
    data: {
      kind: "object",
      ref,
    },
  };
}

function generateListSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: GenerateSchemaOptions,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  if (nodeData.children.size !== 1) {
    throw new Error("List nodes must have exactly one child type");
  }

  const [itemTag, itemNodeData] = nodeData.children.entries().next().value!;
  const { dependencies, data } = generateNodeSchema(
    [...xmlLocation, itemTag],
    itemNodeData,
    registerEntry,
    options,
  );

  return {
    dependencies,
    data: {
      kind: "list",
      itemRef: data,
    },
  };
}

function generateMetalistSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: GenerateSchemaOptions,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  const repeatingChildTags = Array.from(
    nodeData.childCountMap
      .entries()
      .filter(([_, range]) => range.max > 1)
      .map(([tag, _]) => tag),
  );
  if (repeatingChildTags.length !== 1) {
    throw new Error(
      `Metalist nodes must have exactly one repeating child type, but found ${repeatingChildTags.length}:  ${repeatingChildTags.join(", ")}`,
    );
  }

  const itemTag = repeatingChildTags[0]!;
  const itemNodeData = nodeData.children.get(itemTag);
  if (!itemNodeData) {
    throw new Error(`Unexpected error: Child node data for tag ${itemTag} not found.`);
  }

  const { dependencies, data } = generateNodeSchema(
    [...xmlLocation, itemTag],
    itemNodeData,
    registerEntry,
    options,
  );

  return {
    dependencies,
    data: {
      kind: "metalist",
      itemRef: data,
    },
  };
}

function generateNodeSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: GenerateSchemaOptions,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  const xmlPath = xmlLocation.join("/");

  let kind =
    typeof options?.forceKind === "function"
      ? options?.forceKind(xmlLocation)
      : options?.forceKind?.[xmlPath];

  if (kind === undefined) {
    if (nodeData.couldBeObject && nodeData.couldBeList) {
      throw new Error(
        `Node at ${xmlPath} could be both an object and a list. Please use forceKind to disambiguate. It has ${nodeData.attributes.size} attributes and ${nodeData.childCountMap.size} children: ${Array.from(nodeData.childCountMap.entries(), ([tag, range]) => `${tag} (${range.min}-${range.max})`).join(", ")}`,
      );
    } else if (nodeData.couldBeObject) {
      kind = "object";
    } else if (nodeData.couldBeList) {
      kind = "list";
    } else if (nodeData.couldBeMetalist) {
      kind = "metalist";
    } else {
      throw new Error(`Node at ${xmlPath} cannot be represented as an object, list or metalist.`);
    }
  }

  switch (kind) {
    case "object":
      return generateObjectSchema(xmlLocation, nodeData, registerEntry, options);
    case "list":
      return generateListSchema(xmlLocation, nodeData, registerEntry, options);
    case "metalist":
      return generateMetalistSchema(xmlLocation, nodeData, registerEntry, options);
    default:
      throw new Error(`Invalid forceKind option: ${kind}`);
  }
}

function flattenPredefinedSchemas(
  predefinedSchemas: Record<string, Record<string, PredefinedSchema>>,
): {
  importPath: string;
  name: string;
  entry: SchemaEntry;
}[] {
  return Object.entries(predefinedSchemas).flatMap(([importPath, schemas]) =>
    Object.entries(schemas).map(([name, schema]) => {
      let entry: SchemaEntry;

      switch (schema.kind) {
        case "object":
          entry = {
            kind: "object",
            xmlLocations: [],
            properties: Object.fromEntries(
              Object.entries(schema.properties).map(([key, prop]) => [
                key,
                {
                  key,
                  isOptional: prop.optional,
                  type: { kind: "inline", type: prop.type },
                  possibleValues: null,
                  numberRange: null,
                },
              ]),
            ),
            attributeOrder: new OrderGraph<string>(),
            childOrder: new OrderGraph<string>(),
          };
          break;
        default:
          throw new Error(`Predefined schema kind "${schema.kind}" is not supported.`);
      }

      return { importPath, name, entry };
    }),
  );
}

function matchesIgnoreingNumberSuffix(
  a: readonly XmlLocation[],
  b: readonly XmlLocation[],
): boolean {
  for (const aLoc of a) {
    const aLen = aLoc.length;
    const aPath = aLoc.map((seg) => seg.replace(/\d+$/, "")).join("/");
    for (const bLoc of b) {
      const bLen = bLoc.length;
      if (aLen !== bLen) continue;
      const bPath = bLoc.map((seg) => seg.replace(/\d+$/, "")).join("/");
      if (aPath === bPath) {
        return true;
      }
    }
  }

  return false;
}

export function generateSchema(
  documentData: DocumentData,
  options?: GenerateSchemaOptions,
): SchemaEntry[] {
  const predefined = flattenPredefinedSchemas(options?.predefinedSchemas ?? {});
  const overrides = new Map(Object.entries(options?.schemaOverrides ?? {}));
  const unmatchedOverrides = new Set(overrides.keys());

  const entries: SchemaEntry[] = [];

  function registerEntry(entry: SchemaEntry): SchemaReference {
    const xmlPath = entry.xmlLocations[0]!.join("/");
    const override = overrides.get(xmlPath);
    if (override) {
      unmatchedOverrides.delete(xmlPath);
      const properties = { ...entry.properties };
      const added: string[] = [];
      for (const [key, property] of Object.entries(override.properties)) {
        if (
          !["string", "number", "boolean"].includes(property.type) ||
          typeof property.optional !== "boolean"
        ) {
          throw new Error(
            `Invalid schema override property at ${xmlPath}/${key}: expected a primitive type and boolean optional.`,
          );
        }
        const existing = Object.hasOwn(properties, key) ? properties[key]! : undefined;
        if (existing) {
          if (existing.type.kind !== "inline" || existing.type.type === "{}") {
            throw new Error(
              `Cannot override non-primitive property at ${xmlPath}/${key}: inferred ${JSON.stringify(existing.type)}.`,
            );
          }
          const sameType = existing.type.type === property.type;
          properties[key] = {
            ...existing,
            type: { kind: "inline", type: property.type },
            isOptional: property.optional,
            possibleValues: sameType ? existing.possibleValues : null,
            numberRange: sameType ? existing.numberRange : null,
          };
          continue;
        }
        Object.defineProperty(properties, key, {
          value: {
            key,
            isOptional: property.optional,
            type: { kind: "inline", type: property.type },
            possibleValues: null,
            numberRange: null,
          },
          enumerable: true,
          configurable: true,
          writable: true,
        });
        added.push(key);
      }
      const attributeOrder = new OrderGraph<string>();
      attributeOrder.merge(entry.attributeOrder);
      attributeOrder.addSequence([...entry.attributeOrder.topoSort(prefixPriority), ...added]);
      entry = { ...entry, properties, attributeOrder };
    }

    for (const { importPath, name, entry: predefinedEntry } of predefined) {
      if (!entryPropertiesCompatible(entry.properties, predefinedEntry.properties, "loose")) {
        continue;
      }

      return { kind: "external", importPath, name };
    }

    for (let i = 0; i < entries.length; i++) {
      const existingEntry = entries[i]!;

      const merge =
        (options?.mergeNumberSuffix &&
          matchesIgnoreingNumberSuffix(entry.xmlLocations, existingEntry.xmlLocations)) ||
        entryPropertiesCompatible(entry.properties, existingEntry.properties, "ignore");
      if (!merge) continue;

      const merged = mergeSchemaEntries(existingEntry, entry);
      if (!merged) continue;

      entries[i] = merged;
      return { kind: "internal", index: i };
    }

    entries.push(entry);
    return { kind: "internal", index: entries.length - 1 };
  }

  for (const [tag, nodeData] of documentData.elements) {
    generateNodeSchema([tag], nodeData, registerEntry, options ?? {});
  }

  if (unmatchedOverrides.size > 0) {
    throw new Error(
      `No object schema for schemaOverrides XML paths: ${[...unmatchedOverrides].join(", ")}`,
    );
  }

  return entries;
}
