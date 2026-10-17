import type { InterfaceTSDocContext, XmlLocation } from "../../src/xml-schema-analyzer";

export * from "./predefined-schemas";

const disjunctionFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "disjunction",
});

function formatXmlLocation(xmlLocation: XmlLocation): string {
  return xmlLocation.map((tag) => `<${tag}>`).join(" / ");
}

export function generateTSDoc(
  dataKind: string,
  { identifier, xmlLocations, parents }: InterfaceTSDocContext,
) {
  const tagNames = new Set(xmlLocations.map((path) => path.at(-1)!));
  let doc = `Represents ${disjunctionFormatter.format(tagNames.values().map((t) => `\`<${t}>\` element`))} in ${dataKind}.`;

  if (xmlLocations.length === 1) {
    doc += `\n\nXML location: \`${formatXmlLocation(xmlLocations[0]!)}\``;
  } else {
    doc += "\n\nXML locations:";
    for (const xmlPath of xmlLocations) {
      doc += `\n- \`${formatXmlLocation(xmlPath)}\``;
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
