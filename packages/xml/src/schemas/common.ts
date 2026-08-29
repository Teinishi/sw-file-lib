import * as x from "../xml-schema";

/**
 * Represents elements with `x` and `y` attributes in Stormworks XML data.
 *
 * @see {@link SwVec2}
 * @see {@link SwVec2Immutable}
 */
export const SwVec2Schema = x.partialObject({
  x: x.number(),
  y: x.number(),
});

/**
 * Represents elements with `x` and `y` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link SwVec2Immutable} for its parameter type.
 *
 * @see {@link SwVec2Schema}
 * @see {@link SwVec2}
 */
export interface SwVec2 extends x.Infer<typeof SwVec2Schema> {}

/**
 * Represents elements with `x` and `y` attributes in Stormworks XML data.
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link SwVec2} instead
 * if mutation is required.
 *
 * @see {@link SwVec2Schema}
 * @see {@link SwVec2}
 */
export interface SwVec2Immutable extends x.InferImmutable<typeof SwVec2Schema> {}

/**
 * Represents elements with `x`, `y`, and `z` attributes in Stormworks XML data.
 *
 * @see {@link SwVec3}
 * @see {@link SwVec3Immutable}
 */
export const SwVec3Schema = x.partialObject({
  x: x.number(),
  y: x.number(),
  z: x.number(),
});

/**
 * Represents elements with `x`, `y`, and `z` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link SwVec3Immutable} for its parameter type.
 *
 * @see {@link SwVec3Schema}
 * @see {@link SwVec3}
 */
export interface SwVec3 extends x.Infer<typeof SwVec3Schema> {}

/**
 * Represents elements with `x`, `y`, and `z` attributes in Stormworks XML data.
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link SwVec3} instead
 * if mutation is required.
 *
 * @see {@link SwVec3Schema}
 * @see {@link SwVec3}
 */
export interface SwVec3Immutable extends x.InferImmutable<typeof SwVec3Schema> {}

/**
 * Represents elements with `r`, `g`, and `b` attributes in Stormworks XML data.
 *
 * @see {@link SwRgb}
 * @see {@link SwRgbImmutable}
 */
export const SwRgbSchema = x.partialObject({
  r: x.number(),
  g: x.number(),
  b: x.number(),
});

/**
 * Represents elements with `r`, `g`, and `b` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link SwRgbImmutable} for its parameter type.
 *
 * @see {@link SwRgbSchema}
 * @see {@link SwRgb}
 */
export interface SwRgb extends x.Infer<typeof SwRgbSchema> {}

/**
 * Represents elements with `r`, `g`, and `b` attributes in Stormworks XML data.
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link SwRgb} instead
 * if mutation is required.
 *
 * @see {@link SwRgbSchema}
 * @see {@link SwRgb}
 */
export interface SwRgbImmutable extends x.InferImmutable<typeof SwRgbSchema> {}

/**
 * Represents elements with `00`, `01`, `02`, `10`, `11`, `12`, `20`, `21`, and `22` attributes in Stormworks XML data.
 *
 * @see {@link SwMat3}
 * @see {@link SwMat3Immutable}
 */
export const SwMat3Schema = x.partialObject({
  "00": x.number(),
  "01": x.number(),
  "02": x.number(),
  "10": x.number(),
  "11": x.number(),
  "12": x.number(),
  "20": x.number(),
  "21": x.number(),
  "22": x.number(),
});

/**
 * Represents elements with `00`, `01`, `02`, `10`, `11`, `12`, `20`, `21`, and `22` attributes in Stormworks XML data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link SwMat3Immutable} for its parameter type.
 *
 * @see {@link SwMat3Schema}
 * @see {@link SwMat3}
 */
export interface SwMat3 extends x.Infer<typeof SwMat3Schema> {}

/**
 * Represents elements with `00`, `01`, `02`, `10`, `11`, `12`, `20`, `21`, and `22` attributes in Stormworks XML data.
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link SwMat3} instead
 * if mutation is required.
 *
 * @see {@link SwMat3Schema}
 * @see {@link SwMat3}
 */
export interface SwMat3Immutable extends x.InferImmutable<typeof SwMat3Schema> {}
