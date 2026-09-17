import fs from "node:fs/promises";
import consola from "consola";
import { parseSwXml, SwXmlNode } from "@sw-file-lib/xml";
import { OrderGraph, prefixPriority } from "./order-graph";

function jsonUnique<T>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [JSON.stringify(row), row])).values()];
}

export type XmlLocation = readonly string[];

function appendXmlLocations(xmlLocations: XmlLocation[], suffix: string): XmlLocation[] {
  return xmlLocations.map((loc) => [...loc, suffix]);
}

interface AnalyzedAttribute {
  kind: "attribute";
  name: string;
  couldBeBoolean: boolean;
  couldBeUnsignedInt: boolean;
  couldBeInt: boolean;
  couldBeFloat: boolean;
}

interface AnalyzedNode {
  kind: "node";
  tag: string;
  xmlLocation: XmlLocation;
  couldBeRecord: boolean;
  couldBeList: boolean;
  couldBeMetalist: boolean;
  attributes: AnalyzedAttribute[];
  children: AnalyzedNode[];
  childCountMap: Map<string, number>;
}

interface AnalyzeNodeOptions extends AnalyzeOptions {
  filename?: string;
}

function analyzeNode(
  node: SwXmlNode,
  parentXmlLocation: XmlLocation,
  options?: AnalyzeNodeOptions,
): AnalyzedNode {
  const xmlLocation = [...parentXmlLocation, node.tag];

  const childCountMap = new Map<string, number>();
  for (const child of node.nodes) {
    childCountMap.set(child.tag, (childCountMap.get(child.tag) ?? 0) + 1);
  }

  let couldBeRecord = childCountMap.values().every((c) => c === 1);
  let couldBeList = childCountMap.size <= 1 && node.attrs.size === 0;
  let couldBeMetalist =
    couldBeRecord ||
    couldBeList ||
    childCountMap.values().reduce((acc, c) => acc + (c > 1 ? 1 : 0), 0) <= 1;

  if (options?.forceKind) {
    const k = options.forceKind[xmlLocation.join("/")];
    switch (k) {
      case "object":
        couldBeRecord = true;
        couldBeList = false;
        couldBeMetalist = false;
        break;
      case "list":
        couldBeRecord = false;
        couldBeList = true;
        couldBeMetalist = false;
        break;
      case "metalist":
        couldBeRecord = false;
        couldBeList = false;
        couldBeMetalist = true;
        break;
      case undefined:
        break;
      default:
        throw new Error(`Invalid forceKind value: ${k}`);
    }
  }

  const attributes = Array.from(node.attrs.entries(), ([name, value]) => {
    const isUnsignedInt = /^\d+$/.test(value);
    const isInt = /^[+-]\d+$/.test(value);
    const isFloat = /^[+-]?(?:\d+\.\d*|\d*\.\d+)$/.test(value);
    return {
      kind: "attribute" as const,
      name,
      couldBeBoolean: value === "true" || value === "false",
      couldBeUnsignedInt: isUnsignedInt,
      couldBeInt: isUnsignedInt || isInt,
      couldBeFloat: isUnsignedInt || isInt || isFloat,
    };
  });

  const children = node.nodes.map((child) => analyzeNode(child, xmlLocation, options));
  if (!couldBeRecord && !couldBeList && !couldBeMetalist) {
    let message = `Node <${node.tag}>`;
    if (xmlLocation.length > 1) {
      message += ` at ${xmlLocation.slice(0, -1).join(" / ")}`;
    } else {
      message += ` at root`;
    }
    message += ` cannot be classified as record, list, or metalist.`;
    if (options?.filename !== undefined) {
      message += ` File: ${options.filename}`;
    }
    consola.warn(message);
  }

  return {
    kind: "node",
    tag: node.tag,
    xmlLocation,
    couldBeRecord,
    couldBeList,
    couldBeMetalist,
    attributes,
    children,
    childCountMap,
  };
}

function analyzeFile(xmlContent: string, options?: AnalyzeNodeOptions): AnalyzedNode[] {
  const root = parseSwXml(xmlContent);
  return root.nodes.map((n) => analyzeNode(n, [], options));
}

export type AttributeSchemaType =
  | { kind: "string" }
  | { kind: "number"; numberKind: "unsignedInt" | "int" | "float" }
  | { kind: "boolean" };

export type ObjectSchemaType = {
  kind: "object";
  xmlLocations: XmlLocation[];
  properties: SchemaProperty[];
};

export type ListSchemaType = {
  kind: "list";
  xmlLocations: XmlLocation[];
  itemTag: string;
  itemType: SchemaType;
};

export type MetalistSchemaType = {
  kind: "metalist";
  xmlLocations: XmlLocation[];
  metaProperties: SchemaProperty[];
  itemTag: string;
  itemType: SchemaType;
};

export type ElementSchemaType = ObjectSchemaType | ListSchemaType | MetalistSchemaType;

export type SchemaType =
  | AttributeSchemaType
  | ElementSchemaType
  | { kind: "union"; types: SchemaType[] };

export interface SchemaProperty {
  key: string;
  isOptional: boolean;
  type: SchemaType;
}

export interface SchemaEqualityOptions {
  ignoreNumberKind?: boolean;
}

export function schemaPropertyEquals(
  a: SchemaProperty,
  b: SchemaProperty,
  options?: SchemaEqualityOptions,
): boolean {
  return (
    a.key === b.key && a.isOptional === b.isOptional && schemaTypeEquals(a.type, b.type, options)
  );
}

export function schemaTypeEquals(
  a: SchemaType,
  b: SchemaType,
  options?: SchemaEqualityOptions,
): boolean {
  if (a.kind !== b.kind) {
    return false;
  }

  switch (a.kind) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return options?.ignoreNumberKind || a.numberKind === (b as any).numberKind;
    case "object":
      const aProps = a.properties;
      const bProps = (b as any).properties as SchemaProperty[];
      if (aProps.length !== bProps.length) {
        return false;
      }
      for (let i = 0; i < aProps.length; i++) {
        const aProp = aProps[i]!;
        const bProp = bProps.find((p) => p.key === aProp.key);
        if (!bProp || !schemaPropertyEquals(aProp, bProp, options)) {
          return false;
        }
      }
      return true;
    case "list":
      return (
        a.itemTag === (b as any).itemTag &&
        schemaTypeEquals(a.itemType, (b as any).itemType, options)
      );
    case "metalist":
      return (
        a.itemTag === (b as any).itemTag &&
        schemaTypeEquals(a.itemType, (b as any).itemType, options) &&
        a.metaProperties.length === (b as any).metaProperties.length &&
        a.metaProperties.every((p) => {
          const bProp = (b as any).metaProperties.find((bp: SchemaProperty) => bp.key === p.key);
          return (
            bProp &&
            p.isOptional === bProp.isOptional &&
            schemaTypeEquals(p.type, bProp.type, options)
          );
        })
      );
    case "union":
      const bTypes = (b as any).types as SchemaType[];
      if (a.types.length !== bTypes.length) {
        return false;
      }
      return a.types.every((t) => bTypes.some((bt) => schemaTypeEquals(t, bt, options)));
  }
}

function unifyAttributes(attributes: AnalyzedAttribute[]): AttributeSchemaType {
  if (attributes.every((a) => a.couldBeBoolean)) {
    return { kind: "boolean" };
  }
  if (attributes.every((a) => a.couldBeUnsignedInt)) {
    return { kind: "number", numberKind: "unsignedInt" };
  }
  if (attributes.every((a) => a.couldBeInt)) {
    return { kind: "number", numberKind: "int" };
  }
  if (attributes.every((a) => a.couldBeFloat)) {
    return { kind: "number", numberKind: "float" };
  }
  return { kind: "string" };
}

function createObjectSchema(
  nodes: AnalyzedNode[],
  xmlLocations: XmlLocation[],
  options: AnalyzeOptions | undefined,
  excludeChild?: string,
): ObjectSchemaType {
  const attrOrder = new OrderGraph<string>();
  const childOrder = new OrderGraph<string>();
  for (const node of nodes) {
    attrOrder.addSequence(node.attributes.map((a) => a.name));
    childOrder.addSequence(node.children.map((c) => c.tag).filter((tag) => tag !== excludeChild));
  }

  const propKeys = attrOrder.topoSort(prefixPriority);
  for (const name of childOrder.topoSort(prefixPriority)) {
    if (!propKeys.includes(name)) {
      propKeys.push(name);
    }
  }

  const properties: SchemaProperty[] = propKeys.map((key) => {
    const data = nodes
      .map((n) => n.attributes.find((a) => a.name === key) || n.children.find((c) => c.tag === key))
      .filter((v) => v !== undefined);

    return {
      key,
      isOptional: options?.forceOptional || data.length < nodes.length,
      type: unifyToSchemaType(data, appendXmlLocations(xmlLocations, key), options),
    };
  });

  return {
    kind: "object",
    xmlLocations,
    properties,
  };
}

function createListSchema(
  nodes: AnalyzedNode[],
  xmlLocations: XmlLocation[],
  itemTag: string,
  options: AnalyzeOptions | undefined,
): ListSchemaType {
  const itemNodes = nodes.flatMap((n) => n.children.filter((c) => c.tag === itemTag));
  const itemSchema = unifyNodes(itemNodes, appendXmlLocations(xmlLocations, itemTag), options);
  return {
    kind: "list",
    xmlLocations: [],
    itemTag,
    itemType: itemSchema,
  };
}

function createMetalistSchema(
  nodes: AnalyzedNode[],
  xmlLocations: XmlLocation[],
  itemTag: string,
  options: AnalyzeOptions | undefined,
): MetalistSchemaType {
  const objectSchema = createObjectSchema(nodes, xmlLocations, options, itemTag);
  const listSchema = createListSchema(nodes, xmlLocations, itemTag, options);

  return {
    kind: "metalist",
    xmlLocations,
    metaProperties: objectSchema.properties,
    itemTag,
    itemType: listSchema.itemType,
  };
}

function unifyNodes(
  nodes: AnalyzedNode[],
  xmlLocations: XmlLocation[],
  options: AnalyzeOptions | undefined,
): ElementSchemaType {
  const maxChildCountMap = new Map<string, number>();
  for (const node of nodes) {
    for (const [tag, count] of node.childCountMap) {
      maxChildCountMap.set(tag, Math.max(maxChildCountMap.get(tag) ?? 0, count));
    }
  }

  if (nodes.every((n) => n.couldBeList) && maxChildCountMap.size === 1) {
    const itemTag = maxChildCountMap.keys().next().value!;
    return createListSchema(nodes, xmlLocations, itemTag, options);
  }

  if (nodes.every((n) => n.couldBeRecord)) {
    return createObjectSchema(nodes, xmlLocations, options);
  }

  if (nodes.every((n) => n.couldBeMetalist)) {
    const possibleItemTags = Array.from(
      maxChildCountMap.entries().filter(([, count]) => count > 1),
      ([tag]) => tag,
    );
    if (possibleItemTags.length !== 1) {
      throw new Error(
        `Cannot determine item tag for metalist: ${xmlLocations.map((loc) => loc.join("/")).join(", ")}`,
      );
    }
    const itemTag = possibleItemTags[0]!;
    return createMetalistSchema(nodes, xmlLocations, itemTag, options);
  }

  throw new Error(
    `Cannot unify nodes into a single schema: ${xmlLocations.map((loc) => loc.join("/")).join(", ")}\n` +
      `couldBeRecord: ${nodes.filter((n) => n.couldBeRecord).length}/${nodes.length}\n` +
      `couldBeList: ${nodes.filter((n) => n.couldBeList).length}/${nodes.length}\n` +
      `couldBeMetalist: ${nodes.filter((n) => n.couldBeMetalist).length}/${nodes.length}`,
  );
}

function unifyToSchemaType(
  data: (AnalyzedAttribute | AnalyzedNode)[],
  xmlLocations: XmlLocation[],
  options: AnalyzeOptions | undefined,
): SchemaType {
  const attributes = data.filter((d): d is AnalyzedAttribute => d.kind === "attribute");
  const nodes = data.filter((d): d is AnalyzedNode => d.kind === "node");

  if (nodes.length === 0) {
    return unifyAttributes(attributes);
  } else if (attributes.length === 0) {
    return unifyNodes(nodes, xmlLocations, options);
  } else {
    return {
      kind: "union",
      types: [
        unifyNodes(nodes, xmlLocations, options),
        unifyToSchemaType(attributes, xmlLocations, options),
      ],
    };
  }
}

function unifyNodeLists(
  nodeLists: AnalyzedNode[][],
  options?: AnalyzeOptions | undefined,
): ElementSchemaType[] {
  const nodeOrder = new OrderGraph<string>();

  for (const nodeList of nodeLists) {
    nodeOrder.addSequence(nodeList.map((n) => n.tag));
  }

  const childTags = nodeOrder.topoSort(prefixPriority);

  return childTags
    .map((tag) =>
      nodeLists.map((nl) => nl.find((n) => n.tag === tag)).filter((v) => v !== undefined),
    )
    .map((nodes) => {
      const xmlLocations = jsonUnique(nodes.map((n) => n.xmlLocation));
      return unifyNodes(nodes, xmlLocations, options);
    });
}

export interface AnalyzeOptions {
  forceOptional?: boolean;
  forceKind?: Record<string, "object" | "list" | "metalist">;
}

export async function analyzeFiles(
  inputFiles: string[],
  options?: AnalyzeOptions,
): Promise<ElementSchemaType[]> {
  const analyzedFiles = await Promise.all(
    inputFiles.map((filePath) =>
      fs
        .readFile(filePath, "utf-8")
        .then((content) => analyzeFile(content, { filename: filePath, ...options })),
    ),
  );

  return unifyNodeLists(analyzedFiles, options);
}
