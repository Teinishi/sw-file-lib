import { describe, test, expect } from "vitest";
import { parseSwXml, x } from "@xml";

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

    const duplicateChildElementArgs: [{ index: number; tag: string }[], string][] = [];

    const result = x.safeParseTree(schema, tree, "root", {
      duplicateChildElement(ctx, target) {
        duplicateChildElementArgs.push([ctx.path, target]);
        return "first";
      },
    });

    expect(duplicateChildElementArgs).toEqual([
      [[], "root"],
      [[{ index: 0, tag: "root" }], "position"],
    ]);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Unexpected parse success");

    expect(result.error).toBeInstanceOf(x.SwXmlSchemaError);
    expect(result.error.issues).toMatchObject([
      {
        code: "invalid_number",
        path: ["mass"],
      },
      {
        code: "missing_required_field",
        path: ["position", "y"],
      },
    ]);
    expect(x.formatSwXmlPath(result.error.issues[1]!.path)).toBe("position.y");
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
      `<root>
        <surfaces/>
        <surfaces>
          <surface>
            <position/>
            <position x="1" y="2" z="3"/>
          </surface>
        </surfaces>
      </root>`,
    );

    const duplicateChildElementArgs: [{ index: number; tag: string }[], string][] = [];

    const data = x.parseTree(schema, tree, "root", {
      duplicateChildElement(ctx, target) {
        duplicateChildElementArgs.push([ctx.path, target]);
        return "last";
      },
    });

    expect(duplicateChildElementArgs).toEqual([
      [[], "root"],
      [[{ index: 0, tag: "root" }], "surfaces"],
      [
        [
          { index: 0, tag: "root" },
          { index: 1, tag: "surfaces" },
          { index: 0, tag: "surface" },
        ],
        "position",
      ],
    ]);

    expect(data.surfaces).toEqual([
      {
        position: { x: 1, y: 2, z: 3 },
      },
    ]);
  });
});
