import { describe, expect, it } from "vitest";
import { analyzeAttribute, intersectAttributeData } from "./attribute";

describe("attribute type observations", () => {
  it.each([
    { value: "true", type: "boolean" },
    { value: "false", type: "boolean" },
    { value: "0", type: "unsignedInt" },
    { value: "1", type: "unsignedInt" },
    { value: "123", type: "unsignedInt" },
    { value: "-12", type: "int" },
    { value: "+12", type: "int" },
    { value: "-0", type: "int" },
    { value: "4.5", type: "float" },
    { value: "-.5", type: "float" },
    { value: "1.0", type: "float" },
    { value: "1.", type: "float" },
    { value: "", type: "string" },
    { value: "abc", type: "string" },
    { value: "TRUE", type: "string" },
    { value: "1e3", type: "string" },
  ])("classifies $value as $type", ({ value, type }) => {
    expect(analyzeAttribute(value).observedTypes).toEqual(new Set([type]));
  });

  it("retains types and numeric ranges after possible values are discarded", () => {
    const first = analyzeAttribute("true");
    const result = ["123", "abc", "-4", "false", "1.5"]
      .map(analyzeAttribute)
      .reduce((a, b) => intersectAttributeData(a, b, 1), first);
    expect(result.possibleValues).toBeNull();
    expect(result.observedTypes).toEqual(
      new Set(["boolean", "unsignedInt", "int", "float", "string"]),
    );
    expect(result.numberRange).toEqual({ min: -4, max: 123 });
    expect(first.observedTypes).toEqual(new Set(["boolean"]));
  });
});
