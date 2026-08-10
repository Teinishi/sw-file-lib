import { describe, test, expect, vi } from "vitest";
import { parseSwXml, x } from "@xml";
import type { DuplicateChildElementCallback, UnknownFieldCallback } from "../../src/schemaLib";

describe("schemaLib", () => {
  test("schema safeParse returns path-aware issues", () => {
    const schema = x.object({
      name: x.string(),
      mass: x.number(),
      position: x.object({
        x: x.number(),
        y: x.number(),
      }),
    });

    const tree = parseSwXml('<root name="Test" mass="heavy"><position x="1"/></root>');

    const result = schema.safeParseTree(tree, "root");

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Unexpected parse success");

    expect(result.error).toBeInstanceOf(x.SchemaError);
    expect(result.error.issues).toMatchObject([
      {
        code: "invalid_value",
        path: ["mass"],
        expected: "numeric_string",
        value: "heavy",
      },
      {
        code: "missing_required_field",
        path: ["position", "y"],
        expected: "string",
      },
    ]);
  });

  test("schema parsing uses schema context for single-child records", () => {
    const schema = x.object({
      surfaces: x.list(
        "surface",
        x.object({
          position: x.object({
            x: x.number(),
            y: x.number(),
            z: x.number(),
          }),
        }),
      ),
    });

    const tree = parseSwXml(
      `<root unknown_attr="0">
        <surfaces/>
        <surfaces>
          <surface>
            <position/>
            <position x="1" y="2" z="3"/>
            <unknown_child/>
          </surface>
          <unknown_item/>
        </surfaces>
      </root>`,
    );

    const options = {
      unknownField: ((_ctx, _target) => "ignore") satisfies UnknownFieldCallback,
      duplicateChildElement: ((_ctx, _target) => "last") satisfies DuplicateChildElementCallback,
    };

    const unknownFieldSpy = vi.spyOn(options, "unknownField");
    const duplicateChildElementSpy = vi.spyOn(options, "duplicateChildElement");

    const data = schema.parseTree(tree, "root", options);

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      1,
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
          { index: 0, tag: "surface" },
        ],
      },
      { kind: "child", index: 2, child: expect.objectContaining({ tag: "unknown_child" }) },
    );

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      2,
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
        ],
      },
      { kind: "child", index: 1, child: expect.objectContaining({ tag: "unknown_item" }) },
    );

    expect(unknownFieldSpy).toHaveBeenNthCalledWith(
      3,
      { xmlPath: [{ index: 0, tag: "root" }] },
      { kind: "attribute", key: "unknown_attr", value: "0" },
    );

    expect(duplicateChildElementSpy).toHaveBeenNthCalledWith(
      1,
      { xmlPath: [{ index: 0, tag: "root" }] },
      "surfaces",
    );

    expect(duplicateChildElementSpy).toHaveBeenNthCalledWith(
      2,
      {
        xmlPath: [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
          { index: 0, tag: "surface" },
        ],
      },
      "position",
    );

    expect(data.surfaces).toEqual([
      {
        position: { x: 1, y: 2, z: 3 },
      },
    ]);
  });
});
