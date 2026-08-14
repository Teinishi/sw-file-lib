import { describe, test, expect } from "vitest";
import { parseSwXml, RawXmlTreeList, SwXmlNode, SwXmlNodeList } from "@xml";

describe("parser", () => {
  test("parse 1", () => {
    const tree = parseSwXml(
      '<root abc="def" 01="23">hello<position x="1" y="2" z="3"/><empty></empty></root>',
    );

    expect(tree).toEqual(
      new SwXmlNodeList([
        new SwXmlNode(
          "root",
          new Map([
            ["abc", "def"],
            ["01", "23"],
          ]),
          [
            new SwXmlNode(
              "position",
              new Map([
                ["x", "1"],
                ["y", "2"],
                ["z", "3"],
              ]),
              [],
            ),
            new SwXmlNode("empty", new Map(), []),
          ],
        ),
      ]),
    );

    expect(tree.getRawTree("root")).toEqual({
      abc: "def",
      "01": "23",
      position: { x: "1", y: "2", z: "3" },
      empty: null,
    });
  });

  test("parse 2", () => {
    const tree = parseSwXml('<list><item id="0"/><item id="1"/><item id="2"/></list>');

    expect(tree.getRawTree("list")).toEqual(
      new RawXmlTreeList("item", [{ id: "0" }, { id: "1" }, { id: "2" }]),
    );
  });
});
