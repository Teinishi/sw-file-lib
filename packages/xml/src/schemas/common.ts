export * from "./generated/common-schema";
export * from "./generated/common-immutable";

// @xml-schema
/**
 * Represents elements with `x` and `y` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link XmlVec2Immutable} for its parameter type.
 *
 * @see {@link XmlVec2Schema}
 * @see {@link XmlVec2Immutable}
 */
export interface XmlVec2 {
  x?: number;
  y?: number;
}

// @xml-schema
/**
 * Represents elements with `x`, `y`, and `z` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link XmlVec3Immutable} for its parameter type.
 *
 * @see {@link XmlVec3Schema}
 * @see {@link XmlVec3Immutable}
 */
export interface XmlVec3 {
  x?: number;
  y?: number;
  z?: number;
}

// @xml-schema
/**
 * Represents elements with `r`, `g`, and `b` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link XmlRgbImmutable} for its parameter type.
 *
 * @see {@link XmlRgbSchema}
 * @see {@link XmlRgbImmutable}
 */
export interface XmlRgb {
  r?: number;
  g?: number;
  b?: number;
}

// @xml-schema
/**
 * Represents elements with `00`, `01`, `02`, `10`, `11`, `12`, `20`, `21`, and `22` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link XmlMat3Immutable} for its parameter type.
 *
 * @see {@link XmlMat3Schema}
 * @see {@link XmlMat3Immutable}
 */
export interface XmlMat3 {
  "00"?: number;
  "01"?: number;
  "02"?: number;
  "10"?: number;
  "11"?: number;
  "12"?: number;
  "20"?: number;
  "21"?: number;
  "22"?: number;
}
