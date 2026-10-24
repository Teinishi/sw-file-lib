import type { SwXmlNode, SwXmlNodeList } from "@sw-file-lib/xml";
import { OrderGraph } from "../order-graph";
import { analyzeAttribute, intersectAttributeData } from "./attribute";
import {
  unionRanges,
  type AnalyzeOptions,
  type AttributeData,
  type ForceKindOption,
  type NodeData,
  type Range,
  type XmlLocation,
} from "./types";

export function analyzePossibleElementKinds(
  nodeList: SwXmlNodeList,
  hasAttributes: boolean,
  forceKind?: ForceKindOption,
): {
  couldBeObject: boolean;
  couldBeList: boolean;
  couldBeMetalist: boolean;
  childCountMap: Map<string, { min: number; max: number }>;
} {
  const childCountMap = new Map<string, number>();
  for (const child of nodeList.nodes) {
    childCountMap.set(child.tag, (childCountMap.get(child.tag) ?? 0) + 1);
  }

  let couldBeObject: boolean;
  let couldBeList: boolean;
  let couldBeMetalist: boolean;

  if (forceKind === undefined) {
    couldBeObject = childCountMap.values().every((c) => c === 1);
    couldBeList = childCountMap.size <= 1 && !hasAttributes;
    couldBeMetalist =
      couldBeObject ||
      couldBeList ||
      childCountMap.values().reduce((acc, c) => acc + (c > 1 ? 1 : 0), 0) <= 1;
  } else if (forceKind === "object" || forceKind === "record") {
    couldBeObject = true;
    couldBeList = false;
    couldBeMetalist = false;
  } else if (Array.isArray(forceKind) && forceKind[0] === "list") {
    couldBeObject = false;
    couldBeList = true;
    couldBeMetalist = false;
  } else if (Array.isArray(forceKind) && forceKind[0] === "metalist") {
    couldBeObject = false;
    couldBeList = false;
    couldBeMetalist = true;
  } else {
    throw new Error(`Invalid forceKind option: ${forceKind}`);
  }

  return {
    couldBeObject,
    couldBeList,
    couldBeMetalist,
    childCountMap: new Map(
      childCountMap.entries().map(([tag, count]) => [tag, { min: count, max: count }]),
    ),
  };
}

export function analyzeNode(
  xmlLocation: XmlLocation,
  node: SwXmlNode,
  options: AnalyzeOptions | undefined,
): NodeData {
  const forceKind = options?.forceKind?.[xmlLocation.join("/")];
  const { couldBeObject, couldBeList, couldBeMetalist, childCountMap } =
    analyzePossibleElementKinds(node, node.attrs.size > 0, forceKind);

  const attributeOrder = new OrderGraph<string>();
  attributeOrder.addSequence(Array.from(node.attrs.keys()));

  const childOrder = new OrderGraph<string>();
  childOrder.addSequence(node.nodes.map((child) => child.tag));

  const attributes = new Map<string, AttributeData>();
  for (const [attrName, attrValue] of node.attrs) {
    attributes.set(attrName, analyzeAttribute(attrValue));
  }

  const children = new Map<string, NodeData>();
  for (const child of node.nodes) {
    const data = analyzeNode([...xmlLocation, child.tag], child, options);
    const existing = children.get(child.tag);
    children.set(
      child.tag,
      existing ? intersectNodeData(existing, data, options?.maxPossibleValueCount) : data,
    );
  }

  return {
    couldBeObject,
    couldBeList,
    couldBeMetalist,
    childCountMap,
    attributeOrder,
    childOrder,
    attributes,
    children,
    isOptional: false,
  };
}

export function intersectNodeData(
  a: NodeData,
  b: NodeData,
  maxPossibleValueCount?: number,
): NodeData {
  const childCountMap = new Map<string, Range>(a.childCountMap);
  for (const [tag, rangeB] of b.childCountMap) {
    const rangeA = childCountMap.get(tag);
    if (rangeA) {
      childCountMap.set(tag, unionRanges(rangeA, rangeB));
    } else {
      childCountMap.set(tag, { ...rangeB });
    }
  }

  const attributeOrder = new OrderGraph<string>();
  attributeOrder.merge(a.attributeOrder);
  attributeOrder.merge(b.attributeOrder);

  const childOrder = new OrderGraph<string>();
  childOrder.merge(a.childOrder);
  childOrder.merge(b.childOrder);

  const attributes = new Map(a.attributes);
  for (const [attrName, attrData] of b.attributes) {
    const existing = attributes.get(attrName);
    if (existing) {
      attributes.set(attrName, intersectAttributeData(existing, attrData, maxPossibleValueCount));
    } else {
      attributes.set(attrName, { ...attrData, isOptional: true });
    }
  }

  const children = new Map<string, NodeData>();
  for (const [childTag, childData] of a.children) {
    children.set(childTag, {
      ...childData,
      isOptional: childData.isOptional || !b.children.has(childTag),
    });
  }
  for (const [childTag, childData] of b.children) {
    const existing = children.get(childTag);
    if (existing) {
      children.set(childTag, intersectNodeData(existing, childData, maxPossibleValueCount));
    } else {
      children.set(childTag, { ...childData, isOptional: true });
    }
  }

  return {
    couldBeObject: a.couldBeObject && b.couldBeObject,
    couldBeList: a.couldBeList && b.couldBeList,
    couldBeMetalist: a.couldBeMetalist && b.couldBeMetalist,
    childCountMap,
    attributeOrder,
    childOrder,
    attributes,
    children,
    isOptional: a.isOptional || b.isOptional,
  };
}
