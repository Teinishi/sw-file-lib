import type { SwXmlNodeList } from "@sw-file-lib/xml";
import { OrderGraph } from "../order-graph";
import { analyzeNode, analyzePossibleElementKinds, intersectNodeData } from "./node";
import {
  unionRanges,
  type AnalyzeOptions,
  type DocumentData,
  type NodeData,
  type Range,
} from "./types";

export function analyzeDocument(
  root: SwXmlNodeList,
  options: AnalyzeOptions | undefined,
): DocumentData {
  const { couldBeObject, couldBeList, couldBeMetalist, childCountMap } =
    analyzePossibleElementKinds(root, false, options?.forceKindRoot);

  const elementOrder = new OrderGraph<string>();
  elementOrder.addSequence(root.nodes.map((node) => node.tag));

  const elements = new Map<string, NodeData>();
  for (const node of root.nodes) {
    const data = analyzeNode([node.tag], node, options);
    const existing = elements.get(node.tag);
    elements.set(
      node.tag,
      existing ? intersectNodeData(existing, data, options?.maxPossibleValueCount) : data,
    );
  }

  return {
    couldBeObject,
    couldBeList,
    couldBeMetalist,
    elementCountMap: childCountMap,
    elementOrder,
    elements,
  };
}

export function intersectDocumentData(
  a: DocumentData,
  b: DocumentData,
  options: AnalyzeOptions | undefined,
): DocumentData {
  const couldBeObject = a.couldBeObject && b.couldBeObject;
  const couldBeList = a.couldBeList && b.couldBeList;
  const couldBeMetalist = a.couldBeMetalist && b.couldBeMetalist;

  const elementCountMap = new Map<string, Range>(a.elementCountMap);
  for (const [tag, rangeB] of b.elementCountMap) {
    const rangeA = elementCountMap.get(tag);
    if (rangeA) {
      elementCountMap.set(tag, unionRanges(rangeA, rangeB));
    } else {
      elementCountMap.set(tag, { ...rangeB });
    }
  }

  const elementOrder = new OrderGraph<string>();
  elementOrder.merge(a.elementOrder);
  elementOrder.merge(b.elementOrder);

  const elements = new Map<string, NodeData>();
  for (const [tag, dataA] of a.elements) {
    elements.set(tag, { ...dataA, isOptional: dataA.isOptional || !b.elements.has(tag) });
  }
  for (const [tag, dataB] of b.elements) {
    const existing = elements.get(tag);
    if (existing) {
      elements.set(tag, intersectNodeData(existing, dataB, options?.maxPossibleValueCount));
    } else {
      elements.set(tag, { ...dataB, isOptional: true });
    }
  }

  return {
    couldBeObject,
    couldBeList,
    couldBeMetalist,
    elementCountMap,
    elementOrder,
    elements,
  };
}
