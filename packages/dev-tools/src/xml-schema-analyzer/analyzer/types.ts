import type { OrderGraph } from "../order-graph";

export type Range = {
  min: number;
  max: number;
};

export function unionRanges(a: Range, b: Range): Range {
  return {
    min: Math.min(a.min, b.min),
    max: Math.max(a.max, b.max),
  };
}

export type AttributeValueType = "boolean" | "unsignedInt" | "int" | "float" | "string";

export interface AttributeData {
  possibleValues: Set<string> | null;
  numberRange: Range | null;
  observedTypes: Set<AttributeValueType>;
  isOptional: boolean;
}

export interface NodeData {
  couldBeObject: boolean;
  couldBeList: boolean;
  couldBeMetalist: boolean;
  childCountMap: Map<string, Range>;
  attributeOrder: OrderGraph<string>;
  childOrder: OrderGraph<string>;
  attributes: Map<string, AttributeData>;
  children: Map<string, NodeData>;
  isOptional: boolean;
}

export interface DocumentData {
  couldBeObject: boolean;
  couldBeList: boolean;
  couldBeMetalist: boolean;
  elementCountMap: Map<string, Range>;
  elementOrder: OrderGraph<string>;
  elements: Map<string, NodeData>;
}

export type XmlLocation = readonly string[];

export type ForceKindOption = "object" | readonly ["list", string] | readonly ["metalist", string];

export interface AnalyzeOptions {
  forceKindRoot?: ForceKindOption | undefined;
  forceKind?: Record<string, ForceKindOption> | undefined;
  maxPossibleValueCount?: number | undefined;
}
