import { parseSwXml } from "../parser";
import * as x from "../schemaLib";
import type { ParseOptions } from "../types";

export const TextValuePairSchema = x.partialObject({
  text: x.string(),
  value: x.number(),
});
export type TextValuePair = x.InferShape<typeof TextValuePairSchema.shape>;

export const MicrocontrollerNodeSchema = x.partialObject({
  id: x.number(),
  component_id: x.number(),
  node: x.partialObject({
    label: x.string(),
    mode: x.number(),
    type: x.number(),
    description: x.string(),
    position: x.partialObject({
      x: x.number(),
      z: x.number(),
    }),
  }),
});
export type MicrocontrollerNode = x.InferShape<typeof MicrocontrollerNodeSchema.shape>;

export const MicrocontrollerObjectInSchema = x.partialObject({
  component_id: x.number(),
  disabled: x.boolean(),
  node_index: x.number(),
});
export type MicrocontrollerObjectIn = x.InferShape<typeof MicrocontrollerObjectInSchema.shape>;

export const MicrocontrollerComponentSchema = x.partialObject({
  type: x.number(),
  object: x.partialObject({
    id: x.number(),
    count: x.number(),
    ct: x.number(),
    dt: x.number(),
    e: x.union([x.string(), TextValuePairSchema]),
    l: x.string(),
    memory: x.number(),
    n: x.union([x.string(), TextValuePairSchema]),
    name: x.string(),
    offset: x.number(),
    on: x.string(),
    off: x.string(),
    m: x.number(),
    script: x.string(),
    u: x.number(),
    v: x.union([x.string(), TextValuePairSchema]),
    i: x.union([x.number(), TextValuePairSchema]),
    pos: x.vec2(),
    inc: MicrocontrollerObjectInSchema,
    in1: MicrocontrollerObjectInSchema,
    in2: MicrocontrollerObjectInSchema,
    in3: MicrocontrollerObjectInSchema,
    in4: MicrocontrollerObjectInSchema,
    in5: MicrocontrollerObjectInSchema,
    in6: MicrocontrollerObjectInSchema,
    in7: MicrocontrollerObjectInSchema,
    in8: MicrocontrollerObjectInSchema,
    in9: MicrocontrollerObjectInSchema,
    in10: MicrocontrollerObjectInSchema,
    in11: MicrocontrollerObjectInSchema,
    in12: MicrocontrollerObjectInSchema,
    in13: MicrocontrollerObjectInSchema,
    in14: MicrocontrollerObjectInSchema,
    in15: MicrocontrollerObjectInSchema,
    in16: MicrocontrollerObjectInSchema,
    in17: MicrocontrollerObjectInSchema,
    in18: MicrocontrollerObjectInSchema,
    in19: MicrocontrollerObjectInSchema,
    in20: MicrocontrollerObjectInSchema,
    in21: MicrocontrollerObjectInSchema,
    in22: MicrocontrollerObjectInSchema,
    in23: MicrocontrollerObjectInSchema,
    in24: MicrocontrollerObjectInSchema,
    in25: MicrocontrollerObjectInSchema,
    in26: MicrocontrollerObjectInSchema,
    in27: MicrocontrollerObjectInSchema,
    in28: MicrocontrollerObjectInSchema,
    in29: MicrocontrollerObjectInSchema,
    in30: MicrocontrollerObjectInSchema,
    in31: MicrocontrollerObjectInSchema,
    in32: MicrocontrollerObjectInSchema,
    inoff: MicrocontrollerObjectInSchema,
    min: TextValuePairSchema,
    max: TextValuePairSchema,
    int: TextValuePairSchema,
    out1: x.object({}),
    out2: x.object({}),
    items: x.list(
      "i",
      x.partialObject({
        l: x.string(),
        v: TextValuePairSchema,
      }),
    ),
    kp: TextValuePairSchema,
    ki: TextValuePairSchema,
    kd: TextValuePairSchema,
    r: TextValuePairSchema,
  }),
});
export type MicrocontrollerComponent = x.InferShape<typeof MicrocontrollerComponentSchema.shape>;

export const MicrocontrollerBridgeComponentSchema = x.partialObject({
  type: x.number(),
  object: x.partialObject({
    id: x.number(),
    pos: x.vec2(),
    in1: MicrocontrollerObjectInSchema,
    out1: x.object({}),
  }),
});
export type MicrocontrollerBridgeComponent = x.InferShape<
  typeof MicrocontrollerBridgeComponentSchema.shape
>;

export const MicrocontrollerSchema = x.partialObject({
  name: x.string(),
  description: x.string(),
  width: x.number(),
  length: x.number(),
  id_counter: x.number(),
  id_counter_node: x.number(),
  transform_index: x.number(),
  sym0: x.number(),
  sym1: x.number(),
  sym2: x.number(),
  sym3: x.number(),
  sym4: x.number(),
  sym5: x.number(),
  sym6: x.number(),
  sym7: x.number(),
  sym8: x.number(),
  sym9: x.number(),
  sym10: x.number(),
  sym11: x.number(),
  sym12: x.number(),
  sym13: x.number(),
  sym14: x.number(),
  sym15: x.number(),
  nodes: x.list("n", MicrocontrollerNodeSchema),
  group: x.partialObject({
    data: x.partialObject({
      type: x.number(),
      inputs: x.object({}),
      outputs: x.object({}),
    }),
    components: x.list("c", MicrocontrollerComponentSchema),
    components_bridge: x.list("c", MicrocontrollerBridgeComponentSchema),
    groups: x.object({}),
  }),
});
export type Microcontroller = x.InferShape<typeof MicrocontrollerSchema.shape>;

/**
 * Parses a Stormworks microcontroller XML document.
 *
 * @throws {@link import("../schemaLib").SchemaError} when the XML content
 * does not match the microcontroller schema.
 */
export function parseMicrocontrollerXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): Microcontroller {
  const tree = parseSwXml(input);
  return MicrocontrollerSchema.parseTree(tree, "microprocessor", options);
}

/**
 * Parses a Stormworks microcontroller XML document without throwing schema errors.
 */
export function safeParseMicrocontrollerXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): x.Result<Microcontroller, x.SchemaError> {
  const tree = parseSwXml(input);
  return MicrocontrollerSchema.safeParse(tree, "microprocessor", options);
}
