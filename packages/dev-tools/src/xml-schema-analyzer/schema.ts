import consola from "consola";
import type { PredefinedSchema, PredefinedSchemaProperty, PredefinedSchemaType } from ".";
import {
  unionRanges,
  type DocumentData,
  type ForceKindOption,
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

export type SchemaOverrides =
  | Readonly<Record<string, SchemaOverride>>
  | ((xmlLocation: XmlLocation) => SchemaOverride | undefined);

export type ForceKindConfig =
  | Readonly<Record<string, ForceKindOption>>
  | ((xmlLocation: XmlLocation) => ForceKindOption | undefined);

export type AttributeTypeRules =
  | Readonly<Record<string, PredefinedSchemaType>>
  | ((attributeName: string, xmlLocation: XmlLocation) => PredefinedSchemaType | undefined);

export type SchemaMergeSelector = string | RegExp;
export type SchemaMergeGroups =
  | Readonly<Record<string, SchemaMergeSelector | readonly SchemaMergeSelector[]>>
  | ((xmlLocation: XmlLocation) => string | undefined);

function getMergeGroup(
  xmlLocation: XmlLocation,
  groups: SchemaMergeGroups | undefined,
): string | undefined {
  if (typeof groups === "function") return groups(xmlLocation);
  const xmlPath = xmlLocation.join("/");
  const matches = Object.entries(groups ?? {}).filter(([, selectors]) => {
    const list =
      typeof selectors === "string" || selectors instanceof RegExp ? [selectors] : selectors;
    return list.some((selector) =>
      typeof selector === "string"
        ? selector === xmlPath
        : new RegExp(selector.source, selector.flags).test(xmlPath),
    );
  });
  if (matches.length > 1) {
    throw new Error(
      `XML path ${xmlPath} matches multiple mergeSchemas groups: ${matches.map(([name]) => name).join(", ")}.`,
    );
  }
  return matches[0]?.[0];
}

export interface GenerateSchemaOptions {
  predefinedSchemas?: Record<string, Record<string, PredefinedSchema>> | undefined;
  forceKind?: ForceKindConfig | undefined;
  mergeNumberSuffix?: boolean | undefined;
  /** Resolve overrides for each object/metalist XML location before schema merging. */
  schemaOverrides?: SchemaOverrides | undefined;
  /** Explicit groups merge partial schemas and stay separate from automatic structural merging. */
  mergeSchemas?: SchemaMergeGroups | undefined;
  /** Override inferred types of existing XML attributes before schema overrides and merging. */
  attributeTypes?: AttributeTypeRules | undefined;
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
  | { readonly kind: "list"; readonly itemTag: string; readonly itemRef: SchemaTypeData }
  | { readonly kind: "record"; readonly itemRef: SchemaTypeData }
  | { readonly kind: "union"; readonly types: SchemaTypeData[] };

export interface SchemaPropertyData {
  readonly key: string;
  readonly isOptional: boolean;
  readonly type: SchemaTypeData;
  readonly possibleValues: readonly string[] | null;
  readonly numberRange: Range | null;
}

export type SchemaEntry = {
  readonly xmlLocations: readonly XmlLocation[];
  readonly properties: Record<string, SchemaPropertyData>;
  readonly attributeOrder: OrderGraph<string>;
  readonly childOrder: OrderGraph<string>;
} & (
  | { readonly kind: "object" }
  | { readonly kind: "metalist"; readonly itemTag: string; readonly itemRef: SchemaTypeData }
);

function schemaReferenceEqual(a: SchemaReference, b: SchemaReference): boolean {
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case "internal":
      return a.index === (b as any).index;
    case "external":
      return a.importPath === (b as any).importPath && a.name === (b as any).name;
  }
}

function isUnresolvedItem(type: SchemaTypeData): boolean {
  return type.kind === "union" && type.types.length === 0;
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

  // An empty list has a known tag but contributes no evidence about its item type.
  const knownLists = flattenedTypes.filter(
    (type): type is ListSchemaType => type.kind === "list" && !isUnresolvedItem(type.itemRef),
  );
  const knownRecords = flattenedTypes.filter(
    (type): type is Extract<SchemaTypeData, { kind: "record" }> =>
      type.kind === "record" && !isUnresolvedItem(type.itemRef),
  );
  for (const type of flattenedTypes) {
    if (type.kind === "record" && isUnresolvedItem(type.itemRef)) {
      const known = knownRecords[0];
      if (known && knownRecords.every((candidate) => schemaTypeDataEqual(candidate, known)))
        Object.assign(type, { itemRef: known.itemRef });
    }
    if (type.kind === "list" && isUnresolvedItem(type.itemRef)) {
      const candidates = knownLists.filter((known) => known.itemTag === type.itemTag);
      const known = candidates[0];
      if (known && candidates.every((candidate) => schemaTypeDataEqual(candidate, known))) {
        Object.assign(type, { itemRef: known.itemRef });
      }
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

function isPrimitiveType(type: SchemaTypeData): boolean {
  return type.kind === "inline"
    ? type.type !== "{}"
    : type.kind === "union" && type.types.length > 0 && type.types.every(isPrimitiveType);
}

function schemaTypeDataEqual(a: SchemaTypeData, b: SchemaTypeData): boolean {
  if (isUnresolvedItem(a) || isUnresolvedItem(b)) return a === b;
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case "inline":
      return a.type === (b as any).type;
    case "object":
      return schemaReferenceEqual(a.ref, (b as any).ref);
    case "record":
      return b.kind === "record" && schemaTypeDataEqual(a.itemRef, b.itemRef);
    case "list":
      if (isUnresolvedItem(a.itemRef) || (b.kind === "list" && isUnresolvedItem(b.itemRef)))
        return a === b;
      return (
        b.kind === "list" && a.itemTag === b.itemTag && schemaTypeDataEqual(a.itemRef, b.itemRef)
      );
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
  const merged: Record<string, SchemaPropertyData> = Object.fromEntries(
    Object.entries(a).map(([key, property]) => [
      key,
      Object.hasOwn(b, key) ? property : { ...property, isOptional: true },
    ]),
  );

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
      merged[key] = { ...bProp, isOptional: true };
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
    ...a,
    ...(a.kind === "metalist" && b.kind === "metalist" && isUnresolvedItem(a.itemRef)
      ? { itemTag: b.itemTag, itemRef: b.itemRef }
      : {}),
    xmlLocations: jsonUnique([...a.xmlLocations, ...b.xmlLocations]),
    properties,
    attributeOrder,
    childOrder,
  };
}

type RegisterEntryFn = (
  entry: SchemaEntry,
  override: SchemaOverride | undefined,
  mergeGroup: string | undefined,
) => SchemaReference;

type ListSchemaType = Extract<SchemaTypeData, { kind: "list" }>;
interface SchemaBuildOptions extends GenerateSchemaOptions {
  registerList: (xmlLocation: XmlLocation, type: ListSchemaType) => ListSchemaType;
  registerRecord: (
    xmlLocation: XmlLocation,
    group: string | undefined,
    itemRef?: SchemaTypeData,
  ) => Extract<SchemaTypeData, { kind: "record" }>;
}

function generateObjectSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: SchemaBuildOptions,
  metalist?: { readonly itemTag: string; readonly itemRef: SchemaTypeData },
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  const xmlPath = xmlLocation.join("/");
  const mergeGroup = getMergeGroup(xmlLocation, options.mergeSchemas);
  const override =
    typeof options.schemaOverrides === "function"
      ? options.schemaOverrides(xmlLocation)
      : Object.hasOwn(options.schemaOverrides ?? {}, xmlPath)
        ? options.schemaOverrides![xmlPath]
        : undefined;
  if (
    !metalist &&
    nodeData.attributes.size === 0 &&
    nodeData.children.size === 0 &&
    override === undefined &&
    mergeGroup === undefined
  ) {
    return {
      dependencies: [],
      data: { kind: "inline", type: "{}" },
    };
  }

  const dependencies: SchemaReference[] = [];
  const properties: Record<string, SchemaPropertyData> = {};

  for (const [attrName, attrData] of nodeData.attributes) {
    const types = (["boolean", "unsignedInt", "int", "float", "string"] as const)
      .filter((type) => attrData.observedTypes.has(type))
      .map(
        (type): SchemaTypeData => ({
          kind: "inline",
          type: type === "boolean" || type === "string" ? type : "number",
        }),
      );

    const inferredType = createUnionType(types);
    const rules = options.attributeTypes;
    const forcedType =
      typeof rules === "function"
        ? rules(attrName, xmlLocation)
        : Object.hasOwn(rules ?? {}, attrName)
          ? rules![attrName]
          : undefined;
    if (forcedType !== undefined && !["string", "number", "boolean"].includes(forcedType)) {
      throw new Error(
        `Invalid attributeTypes result for ${xmlPath}/@${attrName}: ${JSON.stringify(forcedType)}.`,
      );
    }
    const type: SchemaTypeData =
      forcedType === undefined ? inferredType : { kind: "inline", type: forcedType };
    const sameType = schemaTypeDataEqual(inferredType, type);
    properties[attrName] = {
      key: attrName,
      isOptional: attrData.isOptional,
      type,
      possibleValues:
        sameType && attrData.possibleValues ? Array.from(attrData.possibleValues) : null,
      numberRange: sameType ? attrData.numberRange : null,
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

  const ref = registerEntry(
    {
      ...(metalist ? { kind: "metalist" as const, ...metalist } : { kind: "object" as const }),
      xmlLocations: [xmlLocation],
      properties: properties,
      attributeOrder: nodeData.attributeOrder,
      childOrder: nodeData.childOrder,
    },
    override,
    mergeGroup,
  );

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
  options: SchemaBuildOptions,
  itemTag: string,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  const unexpectedTags = [...nodeData.children.keys()].filter((tag) => tag !== itemTag);
  if (unexpectedTags.length > 0) {
    throw new Error(
      `List node at ${xmlLocation.join("/")} expects item tag ${itemTag}, but found unexpected child tags: ${unexpectedTags.join(", ")}.`,
    );
  }
  if (nodeData.children.size === 0) {
    return {
      dependencies: [],
      data: options.registerList(xmlLocation, {
        kind: "list",
        itemTag,
        itemRef: { kind: "union", types: [] },
      }),
    };
  }

  const itemNodeData = nodeData.children.get(itemTag)!;
  const { dependencies, data } = generateNodeSchema(
    [...xmlLocation, itemTag],
    itemNodeData,
    registerEntry,
    options,
  );

  return {
    dependencies,
    data: options.registerList(xmlLocation, {
      kind: "list",
      itemTag,
      itemRef: data,
    }),
  };
}

function generateMetalistSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: SchemaBuildOptions,
  itemTag: string,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  const repeatingMetaTags = Array.from(
    nodeData.childCountMap
      .entries()
      .filter(([tag, range]) => tag !== itemTag && range.max > 1)
      .map(([tag, _]) => tag),
  );
  if (repeatingMetaTags.length > 0) {
    throw new Error(
      `Metalist node at ${xmlLocation.join("/")} has repeating non-item child tags: ${repeatingMetaTags.join(", ")}. Expected item tag ${itemTag}.`,
    );
  }

  const itemNodeData = nodeData.children.get(itemTag);
  const { dependencies, data } = itemNodeData
    ? generateNodeSchema([...xmlLocation, itemTag], itemNodeData, registerEntry, options)
    : { dependencies: [], data: { kind: "union", types: [] } as SchemaTypeData };

  const metaChildren = new Map(nodeData.children);
  metaChildren.delete(itemTag);
  const metaChildOrder = new OrderGraph<string>();
  metaChildOrder.addSequence(
    nodeData.childOrder.topoSort(prefixPriority).filter((tag) => tag !== itemTag),
  );
  const result = generateObjectSchema(
    xmlLocation,
    { ...nodeData, children: metaChildren, childOrder: metaChildOrder },
    registerEntry,
    options,
    { itemTag, itemRef: data },
  );
  return { ...result, dependencies: [...dependencies, ...result.dependencies] };
}

function generateRecordSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: SchemaBuildOptions,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  const xmlPath = xmlLocation.join("/");
  if (xmlLocation.length === 1) throw new Error(`Root record is not supported at ${xmlPath}.`);
  if (nodeData.attributes.size > 0)
    throw new Error(`Record node at ${xmlPath} must not have attributes.`);
  if ([...nodeData.childCountMap.values()].some((range) => range.max > 1))
    throw new Error(`Record node at ${xmlPath} must have unique child tags.`);

  const mergeGroup = getMergeGroup(xmlLocation, options.mergeSchemas);
  const data = options.registerRecord(xmlLocation, mergeGroup);
  const itemPaths = new Set([...nodeData.children.keys()].map((tag) => `${xmlPath}/${tag}`));
  const explicitGroups = new Set(
    [...itemPaths]
      .map((path) => getMergeGroup(path.split("/"), options.mergeSchemas))
      .filter((group) => group !== undefined && !group.startsWith("\0record-items:")),
  );
  if (explicitGroups.size > 1)
    throw new Error(`Record items at ${xmlPath} belong to different mergeSchemas groups.`);
  const group =
    [...explicitGroups][0] ??
    `\0record-items:${mergeGroup === undefined ? `path:${xmlPath}` : `group:${mergeGroup}`}`;
  const itemOptions: SchemaBuildOptions = {
    ...options,
    mergeSchemas: (location) => {
      const path = location.join("/");
      if (itemPaths.has(path)) return group;
      const explicit = getMergeGroup(location, options.mergeSchemas);
      if (explicit !== undefined && !explicit.startsWith("\0record-items:")) return explicit;
      // The dynamic key is not part of an item's structural path. Merge matching
      // descendants too, so partial nested objects and metalist items share a type.
      if (
        location.length > xmlLocation.length + 1 &&
        itemPaths.has(location.slice(0, xmlLocation.length + 1).join("/"))
      )
        return `${group}/${location.slice(xmlLocation.length + 1).join("/")}`;
      return explicit;
    },
  };
  const dependencies: SchemaReference[] = [];
  for (const [tag, child] of nodeData.children) {
    const item = generateNodeSchema([...xmlLocation, tag], child, registerEntry, itemOptions);
    if (item.data.kind === "list")
      throw new Error(`Record values cannot be lists at ${xmlPath}/${tag}.`);
    if (
      item.data.kind !== "object" &&
      item.data.kind !== "record" &&
      !(item.data.kind === "inline" && item.data.type === "{}")
    )
      throw new Error(`Cannot determine a common record item schema at ${xmlPath}.`);
    dependencies.push(...item.dependencies);
    options.registerRecord(xmlLocation, mergeGroup, item.data);
  }
  return { dependencies, data };
}

function generateNodeSchema(
  xmlLocation: XmlLocation,
  nodeData: NodeData,
  registerEntry: RegisterEntryFn,
  options: SchemaBuildOptions,
): { dependencies: SchemaReference[]; data: SchemaTypeData } {
  const xmlPath = xmlLocation.join("/");

  const forcedKind =
    typeof options?.forceKind === "function"
      ? options?.forceKind(xmlLocation)
      : options?.forceKind?.[xmlPath];

  let kind: "object" | "list" | "metalist" | "record" | undefined;
  let itemTag: string | undefined;
  if (forcedKind !== undefined) {
    if (forcedKind === "object" || forcedKind === "record") kind = forcedKind;
    else if (
      Array.isArray(forcedKind) &&
      forcedKind.length === 2 &&
      (forcedKind[0] === "list" || forcedKind[0] === "metalist") &&
      typeof forcedKind[1] === "string" &&
      forcedKind[1].length > 0
    ) {
      kind = forcedKind[0];
      itemTag = forcedKind[1];
    } else
      throw new Error(
        `Invalid forceKind option at ${xmlPath}: list/metalist require [kind, itemTag].`,
      );
  }

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
    case "record":
      return generateRecordSchema(xmlLocation, nodeData, registerEntry, options);
    case "object":
      return generateObjectSchema(xmlLocation, nodeData, registerEntry, options);
    case "list":
      itemTag ??= nodeData.children.keys().next().value;
      if (itemTag === undefined)
        throw new Error(
          `Cannot infer list item tag at ${xmlPath}. Specify forceKind: ["list", "itemTag"].`,
        );
      return generateListSchema(xmlLocation, nodeData, registerEntry, options, itemTag);
    case "metalist":
      itemTag ??= [...nodeData.childCountMap].find(([, count]) => count.max > 1)?.[0];
      if (itemTag === undefined)
        throw new Error(
          `Cannot infer metalist item tag at ${xmlPath}. Specify forceKind: ["metalist", "itemTag"].`,
        );
      return generateMetalistSchema(xmlLocation, nodeData, registerEntry, options, itemTag);
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
  const unmatchedOverrides = new Set(
    typeof options?.schemaOverrides === "function"
      ? []
      : Object.keys(options?.schemaOverrides ?? {}),
  );

  const entries: SchemaEntry[] = [];
  const mergeGroups = new Map<number, string>();
  const listGroups = new Map<
    string,
    { data: { kind: "list"; itemTag: string; itemRef: SchemaTypeData }; locations: XmlLocation[] }
  >();
  const listLocations = new WeakMap<ListSchemaType, readonly XmlLocation[]>();
  const recordGroups = new Map<
    string,
    { data: { kind: "record"; itemRef: SchemaTypeData }; locations: XmlLocation[] }
  >();
  const recordMergeGroups = new Set<string>();
  const unmatchedMergePaths = new Set(
    typeof options?.mergeSchemas === "function"
      ? []
      : Object.values(options?.mergeSchemas ?? {}).flatMap((selectors) => {
          const list =
            typeof selectors === "string" || selectors instanceof RegExp ? [selectors] : selectors;
          return list.filter((selector): selector is string => typeof selector === "string");
        }),
  );

  function registerRecord(
    xmlLocation: XmlLocation,
    group: string | undefined,
    itemRef?: SchemaTypeData,
  ): Extract<SchemaTypeData, { kind: "record" }> {
    const xmlPath = xmlLocation.join("/");
    if (group !== undefined) {
      if (listGroups.has(group) || [...mergeGroups.values()].includes(group))
        throw new Error(
          `Cannot merge record and other schema kinds in mergeSchemas group ${group} at ${xmlPath}.`,
        );
      recordMergeGroups.add(group);
    }
    unmatchedMergePaths.delete(xmlPath);
    const key = group === undefined ? `path:${xmlPath}` : `group:${group}`;
    let existing = recordGroups.get(key);
    if (!existing) {
      existing = { data: { kind: "record", itemRef: { kind: "union", types: [] } }, locations: [] };
      recordGroups.set(key, existing);
    }
    if (!existing.locations.some((location) => location.join("/") === xmlPath))
      existing.locations.push(xmlLocation);
    if (itemRef !== undefined) {
      if (isUnresolvedItem(existing.data.itemRef)) existing.data.itemRef = itemRef;
      else if (!schemaTypeDataEqual(existing.data.itemRef, itemRef))
        throw new Error(
          `Cannot determine a common record item schema at ${xmlPath}; merge item schemas into one element schema.`,
        );
    }
    return existing.data;
  }

  function registerList(xmlLocation: XmlLocation, type: ListSchemaType): ListSchemaType {
    const group = getMergeGroup(xmlLocation, options?.mergeSchemas);
    listLocations.set(type, [xmlLocation]);
    if (group === undefined) return type;
    const xmlPath = xmlLocation.join("/");
    unmatchedMergePaths.delete(xmlPath);
    if (recordMergeGroups.has(group))
      throw new Error(`Cannot merge list and record in mergeSchemas group ${group} at ${xmlPath}.`);
    if ([...mergeGroups.values()].includes(group)) {
      throw new Error(
        `Cannot merge list and object/metalist in mergeSchemas group ${group} at ${xmlPath}.`,
      );
    }
    const existing = listGroups.get(group);
    if (!existing) {
      const data = { ...type };
      const locations = [xmlLocation];
      listGroups.set(group, { data, locations });
      listLocations.set(data, locations);
      return data;
    }
    existing.locations.push(xmlLocation);
    if (existing.data.itemTag !== type.itemTag) {
      throw new Error(
        `Cannot merge lists with different item tags or item types in mergeSchemas group ${group} at ${xmlPath}.`,
      );
    }
    if (!isUnresolvedItem(type.itemRef)) {
      if (isUnresolvedItem(existing.data.itemRef)) {
        existing.data.itemRef = type.itemRef;
      } else if (!schemaTypeDataEqual(existing.data.itemRef, type.itemRef)) {
        throw new Error(
          `Cannot merge lists with different item tags or item types in mergeSchemas group ${group} at ${xmlPath}.`,
        );
      }
    }
    return existing.data;
  }

  function registerEntry(
    entry: SchemaEntry,
    override: SchemaOverride | undefined,
    mergeGroup: string | undefined,
  ): SchemaReference {
    const xmlPath = entry.xmlLocations[0]!.join("/");
    if (mergeGroup !== undefined && recordMergeGroups.has(mergeGroup))
      throw new Error(
        `Cannot merge record and object/metalist in mergeSchemas group ${mergeGroup} at ${xmlPath}.`,
      );
    if (mergeGroup !== undefined && listGroups.has(mergeGroup)) {
      throw new Error(
        `Cannot merge list and object/metalist in mergeSchemas group ${mergeGroup} at ${xmlPath}.`,
      );
    }
    unmatchedMergePaths.delete(xmlPath);
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
          if (!isPrimitiveType(existing.type)) {
            throw new Error(
              `Cannot override non-primitive property at ${xmlPath}/${key}: inferred ${JSON.stringify(existing.type)}.`,
            );
          }
          const sameType = existing.type.kind === "inline" && existing.type.type === property.type;
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
      if (mergeGroup !== undefined) break;
      if (entry.kind !== "object") continue;
      if (!entryPropertiesCompatible(entry.properties, predefinedEntry.properties, "loose")) {
        continue;
      }

      return { kind: "external", importPath, name };
    }

    for (let i = 0; i < entries.length; i++) {
      const existingEntry = entries[i]!;

      if (mergeGroup !== mergeGroups.get(i)) continue;

      if (entry.kind !== existingEntry.kind) {
        if (mergeGroup !== undefined)
          throw new Error(
            `Cannot merge object and metalist in mergeSchemas group ${mergeGroup} at ${xmlPath}.`,
          );
        continue;
      }
      if (
        entry.kind === "metalist" &&
        existingEntry.kind === "metalist" &&
        (entry.itemTag !== existingEntry.itemTag ||
          !schemaTypeDataEqual(entry.itemRef, existingEntry.itemRef)) &&
        !(
          entry.itemTag === existingEntry.itemTag &&
          (isUnresolvedItem(entry.itemRef) || isUnresolvedItem(existingEntry.itemRef)) &&
          (mergeGroup !== undefined ||
            (options?.mergeNumberSuffix &&
              matchesIgnoreingNumberSuffix(entry.xmlLocations, existingEntry.xmlLocations)))
        )
      ) {
        if (
          mergeGroup !== undefined ||
          (options?.mergeNumberSuffix &&
            matchesIgnoreingNumberSuffix(entry.xmlLocations, existingEntry.xmlLocations))
        ) {
          throw new Error(
            `Cannot merge metalists with different item tags or item types at ${entry.xmlLocations.map((location) => location.join("/")).join(", ")}.`,
          );
        }
        continue;
      }

      const merge =
        mergeGroup !== undefined ||
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
    if (mergeGroup !== undefined) mergeGroups.set(entries.length - 1, mergeGroup);
    return { kind: "internal", index: entries.length - 1 };
  }

  const rootTypes: SchemaTypeData[] = [];
  const buildOptions: SchemaBuildOptions = {
    ...options,
    registerList,
    registerRecord,
  };
  for (const [tag, nodeData] of documentData.elements) {
    rootTypes.push(generateNodeSchema([tag], nodeData, registerEntry, buildOptions).data);
  }

  // Grouped list placeholders may have been filled after their parents merged.
  const normalizedTypes = new Map<SchemaTypeData, SchemaTypeData>();
  const normalizing = new Set<SchemaTypeData>();
  const normalizeLists = (type: SchemaTypeData): SchemaTypeData => {
    const cached = normalizedTypes.get(type);
    if (cached) return cached;
    if (normalizing.has(type))
      throw new Error("Cannot determine a recursive list item schema after merging.");
    normalizing.add(type);
    const normalized =
      type.kind === "union"
        ? createUnionType(type.types.map(normalizeLists))
        : (type.kind === "list" || type.kind === "record") && !isUnresolvedItem(type.itemRef)
          ? { ...type, itemRef: normalizeLists(type.itemRef) }
          : type;
    normalizing.delete(type);
    normalizedTypes.set(type, normalized);
    return normalized;
  };
  for (const [index, entry] of entries.entries()) {
    entries[index] = {
      ...entry,
      properties: Object.fromEntries(
        Object.entries(entry.properties).map(([key, property]) => [
          key,
          { ...property, type: normalizeLists(property.type) },
        ]),
      ),
      ...(entry.kind === "metalist" ? { itemRef: normalizeLists(entry.itemRef) } : {}),
    };
  }
  type MissingItem = {
    kind: "List" | "Metalist";
    itemTag: string;
    locations: readonly XmlLocation[];
  };
  const missingItems = new Map<SchemaTypeData, MissingItem[]>();
  const aliases = new Map<SchemaTypeData, SchemaTypeData>();
  const canonical = (type: SchemaTypeData): SchemaTypeData => {
    const parent = aliases.get(type);
    return parent ? canonical(parent) : type;
  };
  const addMissing = (type: SchemaTypeData, use: MissingItem): void => {
    const uses = missingItems.get(type) ?? [];
    uses.push(use);
    missingItems.set(type, uses);
  };
  const checkLists = (type: SchemaTypeData): void => {
    if (type.kind === "record") {
      if (!isUnresolvedItem(type.itemRef)) checkLists(type.itemRef);
    } else if (type.kind === "list") {
      if (isUnresolvedItem(type.itemRef)) {
        addMissing(type.itemRef, {
          kind: "List",
          itemTag: type.itemTag,
          locations: listLocations.get(type) ?? [],
        });
      } else checkLists(type.itemRef);
    } else if (type.kind === "union") {
      // Merged parents may contain multiple empty lists with the same known tag.
      const byTag = new Map<string, SchemaTypeData>();
      for (const member of type.types) {
        if (member.kind !== "list" || !isUnresolvedItem(member.itemRef)) continue;
        const previous = byTag.get(member.itemTag);
        const root = canonical(member.itemRef);
        if (previous && canonical(previous) !== root) aliases.set(root, canonical(previous));
        else byTag.set(member.itemTag, root);
      }
      for (const member of type.types) checkLists(member);
    }
  };
  for (const entry of entries) {
    for (const property of Object.values(entry.properties)) checkLists(property.type);
    if (entry.kind === "metalist") {
      if (isUnresolvedItem(entry.itemRef))
        addMissing(entry.itemRef, {
          kind: "Metalist",
          itemTag: entry.itemTag,
          locations: entry.xmlLocations,
        });
      else checkLists(entry.itemRef);
    }
  }
  for (const type of rootTypes) checkLists(normalizeLists(type));

  if (unmatchedOverrides.size > 0) {
    throw new Error(
      `No object schema for schemaOverrides XML paths: ${[...unmatchedOverrides].join(", ")}`,
    );
  }

  if (unmatchedMergePaths.size > 0) {
    throw new Error(`No schema for mergeSchemas XML paths: ${[...unmatchedMergePaths].join(", ")}`);
  }

  const missingGroups = new Map<SchemaTypeData, MissingItem[]>();
  for (const [type, uses] of missingItems) {
    const root = canonical(type);
    missingGroups.set(root, [...(missingGroups.get(root) ?? []), ...uses]);
  }
  const replacements = new Map<SchemaTypeData, SchemaTypeData>();
  for (const { data, locations } of recordGroups.values()) {
    if (!isUnresolvedItem(data.itemRef)) continue;
    replacements.set(data.itemRef, { kind: "inline", type: "{}" });
    consola.warn(
      `Record item schema could not be determined after merging at XML paths: ${locations.map((location) => location.join("/")).join(", ")}; using Record<string, {}>.`,
    );
  }
  for (const [type, uses] of missingGroups) {
    const itemTag = uses[0]!.itemTag;
    const locations = jsonUnique(uses.flatMap((use) => use.locations));
    const ref: SchemaTypeData = {
      kind: "object",
      ref: { kind: "internal", index: entries.length },
    };
    replacements.set(type, ref);
    entries.push({
      kind: "object",
      xmlLocations: locations.map((location) => [...location, itemTag]),
      properties: {},
      attributeOrder: new OrderGraph<string>(),
      childOrder: new OrderGraph<string>(),
    });
    consola.warn(
      `${uses[0]!.kind} item schema could not be determined after merging at XML paths: ${locations.map((location) => location.join("/")).join(", ")}; using an empty item interface for tag ${JSON.stringify(itemTag)}.`,
    );
  }
  const replaceMissing = (type: SchemaTypeData): SchemaTypeData => {
    const replacement = replacements.get(canonical(type));
    if (replacement) return replacement;
    if (type.kind === "list" || type.kind === "record")
      return { ...type, itemRef: replaceMissing(type.itemRef) };
    if (type.kind === "union") return createUnionType(type.types.map(replaceMissing));
    return type;
  };
  if (replacements.size > 0) {
    for (const [index, entry] of entries.entries()) {
      entries[index] = {
        ...entry,
        properties: Object.fromEntries(
          Object.entries(entry.properties).map(([key, property]) => [
            key,
            { ...property, type: replaceMissing(property.type) },
          ]),
        ),
        ...(entry.kind === "metalist" ? { itemRef: replaceMissing(entry.itemRef) } : {}),
      };
    }
  }

  // Keep grouped entries local until all members have contributed their fields.
  // A completed group can then reuse a predefined schema without losing evidence.
  const references = new Map<number, SchemaReference>();
  const retained: SchemaEntry[] = [];
  for (const [index, entry] of entries.entries()) {
    const match =
      entry.kind === "object"
        ? predefined.find(({ entry: candidate }) =>
            entryPropertiesCompatible(entry.properties, candidate.properties, "loose"),
          )
        : undefined;
    if (match) {
      references.set(index, { kind: "external", importPath: match.importPath, name: match.name });
    } else {
      references.set(index, { kind: "internal", index: retained.length });
      retained.push(entry);
    }
  }
  if (retained.length === entries.length) return entries;

  const remapType = (type: SchemaTypeData): SchemaTypeData => {
    switch (type.kind) {
      case "object":
        return type.ref.kind === "internal"
          ? { ...type, ref: references.get(type.ref.index)! }
          : type;
      case "list":
      case "record":
        return { ...type, itemRef: remapType(type.itemRef) };
      case "union":
        return createUnionType(type.types.map(remapType));
      case "inline":
        return type;
    }
  };
  return retained.map((entry) => ({
    ...entry,
    properties: Object.fromEntries(
      Object.entries(entry.properties).map(([key, property]) => [
        key,
        { ...property, type: remapType(property.type) },
      ]),
    ),
    ...(entry.kind === "metalist" ? { itemRef: remapType(entry.itemRef) } : {}),
  }));
}
