import type { InterfaceTSDocContext, XmlLocation } from "../../src/xml-schema-analyzer";

export * from "./predefined-schemas";

const disjunctionFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "disjunction",
});

function formatXmlLocation(xmlLocation: XmlLocation): string {
  return xmlLocation.map((tag) => `<${tag}>`).join(" / ");
}

function reduceNumbersInStrings(strings: Iterable<string>): string[] {
  const groups = new Map<string, string[][]>();

  for (const str of strings) {
    const parts = str.split(/(\d+)/);
    const key = parts.map((p, i) => (i % 2 ? "*" : p)).join("");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(parts);
  }

  const result: string[] = [];

  for (const group of groups.values()) {
    const merged = group[0]!.map((part, i) => {
      if (i % 2 === 0) return part;

      const values = new Set(group.map((parts) => parts[i]));
      return values.size > 1 ? "*" : part;
    });

    result.push(merged.join(""));
  }

  return result;
}

export function generateTSDoc(
  dataKind: string,
  { identifier, xmlLocations, parents }: InterfaceTSDocContext,
) {
  const tagNames = reduceNumbersInStrings(new Set(xmlLocations.map((path) => path.at(-1)!)));
  let doc = `Represents ${disjunctionFormatter.format(tagNames.values().map((t) => `\`<${t}>\` element`))} in ${dataKind}.`;

  if (xmlLocations.length === 1) {
    doc += `\n\nXML location: \`${formatXmlLocation(xmlLocations[0]!)}\``;
  } else {
    doc += "\n\nXML locations:";
    const reducedPaths = reduceNumbersInStrings(
      xmlLocations.map((path) => formatXmlLocation(path)),
    );
    for (const path of reducedPaths) {
      doc += `\n- \`${path}\``;
    }
  }

  if (parents.length === 1) {
    doc += `\n\nParent: {@link ${parents[0]!.identifier}}`;
  } else if (parents.length > 1) {
    doc += `\n\nParents: ${disjunctionFormatter.format(parents.map((p) => `{@link ${p.identifier}}`))}`;
  }

  doc += `\n\nIf your function only reads the value and does not mutate it, prefer\n{@link ${identifier}Immutable} for its parameter type.`;

  doc += `\n\n@see {@link ${identifier}Schema}\n@see {@link ${identifier}Immutable}`;

  return doc;
}
