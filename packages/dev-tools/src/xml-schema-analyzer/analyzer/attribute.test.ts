import { describe, expect, it } from "vitest";
import { analyzeAttribute, intersectAttributeData } from "./attribute";

describe("attribute type observations", () => {
  it.each([
    { value: "true", type: "boolean" },
    { value: "false", type: "boolean" },
    { value: "0", type: "number" },
    { value: "1", type: "number" },
    { value: "123", type: "number" },
    { value: "-12", type: "number" },
    { value: "+12", type: "number" },
    { value: "4.5", type: "number" },
    { value: "-.5", type: "number" },
    { value: "", type: "string" },
    { value: "abc", type: "string" },
    { value: "TRUE", type: "string" },
    { value: "1e3", type: "string" },
  ])("classifies $value as $type", ({ value, type }) => {
    expect(analyzeAttribute(value).observedTypes).toEqual(new Set([type]));
  });

  it("retains types and numeric ranges after possible values are discarded", () => {
    const first = analyzeAttribute("true");
    const result = ["123", "abc", "-4", "false"]
      .map(analyzeAttribute)
      .reduce((a, b) => intersectAttributeData(a, b, 1), first);
    expect(result.possibleValues).toBeNull();
    expect(result.observedTypes).toEqual(new Set(["boolean", "number", "string"]));
    expect(result.numberRange).toEqual({ min: -4, max: 123 });
    expect(first.observedTypes).toEqual(new Set(["boolean"]));
  });
});
