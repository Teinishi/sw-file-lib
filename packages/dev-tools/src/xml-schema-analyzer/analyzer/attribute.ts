import type { AttributeData } from "./types";

export function analyzeAttribute(value: string): AttributeData {
  const isBoolean = value === "true" || value === "false";
  const isUnsignedInt = /^\d+$/.test(value);
  const isInt = isUnsignedInt || /^[+-]\d+$/.test(value);
  const isFloat = isInt || /^[+-]?(?:\d+\.\d*|\d*\.\d+)$/.test(value);

  const numberRange = isFloat
    ? {
        min: parseFloat(value),
        max: parseFloat(value),
      }
    : null;

  return {
    possibleValues: new Set([value]),
    numberRange,
    observedTypes: new Set([isBoolean ? "boolean" : isFloat ? "number" : "string"]),
    couldBeBoolean: isBoolean,
    couldBeUnsignedInt: isUnsignedInt,
    couldBeInt: isInt,
    couldBeFloat: isFloat,
    isOptional: false,
  };
}

export function intersectAttributeData(
  a: AttributeData,
  b: AttributeData,
  maxPossibleValueCount = 100,
): AttributeData {
  let mergedPossibleValues: Set<string> | null = null;
  if (
    a.possibleValues &&
    b.possibleValues &&
    a.possibleValues.size + b.possibleValues.size <= maxPossibleValueCount
  ) {
    mergedPossibleValues = a.possibleValues.union(b.possibleValues);
  }

  let mergedNumberRange: { min: number; max: number } | null = null;
  if (a.numberRange && b.numberRange) {
    mergedNumberRange = {
      min: Math.min(a.numberRange.min, b.numberRange.min),
      max: Math.max(a.numberRange.max, b.numberRange.max),
    };
  } else if (a.numberRange) {
    mergedNumberRange = { ...a.numberRange };
  } else if (b.numberRange) {
    mergedNumberRange = { ...b.numberRange };
  }

  return {
    possibleValues: mergedPossibleValues,
    numberRange: mergedNumberRange,
    observedTypes: a.observedTypes.union(b.observedTypes),
    couldBeBoolean: a.couldBeBoolean && b.couldBeBoolean,
    couldBeUnsignedInt: a.couldBeUnsignedInt && b.couldBeUnsignedInt,
    couldBeInt: a.couldBeInt && b.couldBeInt,
    couldBeFloat: a.couldBeFloat && b.couldBeFloat,
    isOptional: a.isOptional || b.isOptional,
  };
}
