import { describe, test, expect } from "vitest";
import { parseSwXml, SwXmlNode, SwXmlNodeList } from "../../src";

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
  });
});
