import { SwVec2Schema } from ".";
import * as x from "../xml-schema";

export const TextValuePairSchema = x.partialObject({
  text: x.string(),
  value: x.number(),
});
export interface TextValuePair extends x.Infer<typeof TextValuePairSchema> {}
export interface TextValuePairImmutable extends x.InferImmutable<typeof TextValuePairSchema> {}

export const NodeSchema = x.partialObject({
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
export interface Node extends x.Infer<typeof NodeSchema> {}
export interface NodeImmutable extends x.InferImmutable<typeof NodeSchema> {}

export const ObjectInSchema = x.partialObject({
  component_id: x.number(),
  disabled: x.boolean(),
  node_index: x.number(),
});
export interface ObjectIn extends x.Infer<typeof ObjectInSchema> {}
export interface ObjectInImmutable extends x.InferImmutable<typeof ObjectInSchema> {};

export const ComponentObjectSchema = x.partialObject({
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
  pos: SwVec2Schema,
  inc: ObjectInSchema,
  in1: ObjectInSchema,
  in2: ObjectInSchema,
  in3: ObjectInSchema,
  in4: ObjectInSchema,
  in5: ObjectInSchema,
  in6: ObjectInSchema,
  in7: ObjectInSchema,
  in8: ObjectInSchema,
  in9: ObjectInSchema,
  in10: ObjectInSchema,
  in11: ObjectInSchema,
  in12: ObjectInSchema,
  in13: ObjectInSchema,
  in14: ObjectInSchema,
  in15: ObjectInSchema,
  in16: ObjectInSchema,
  in17: ObjectInSchema,
  in18: ObjectInSchema,
  in19: ObjectInSchema,
  in20: ObjectInSchema,
  in21: ObjectInSchema,
  in22: ObjectInSchema,
  in23: ObjectInSchema,
  in24: ObjectInSchema,
  in25: ObjectInSchema,
  in26: ObjectInSchema,
  in27: ObjectInSchema,
  in28: ObjectInSchema,
  in29: ObjectInSchema,
  in30: ObjectInSchema,
  in31: ObjectInSchema,
  in32: ObjectInSchema,
  inoff: ObjectInSchema,
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
});
export interface ComponentObject extends x.Infer<typeof ComponentObjectSchema> {}
export interface ComponentObjectImmutable extends x.InferImmutable<typeof ComponentObjectSchema> {}

export const ComponentSchema = x.partialObject({
  type: x.number(),
  object: ComponentObjectSchema,
});
export interface Component extends x.Infer<typeof ComponentSchema> {}
export interface ComponentImmutable extends x.InferImmutable<typeof ComponentSchema> {}

export const BridgeComponentSchema = x.partialObject({
  type: x.number(),
  object: x.partialObject({
    id: x.number(),
    pos: SwVec2Schema,
    in1: ObjectInSchema,
    out1: x.object({}),
  }),
});
export interface BridgeComponent extends x.Infer<typeof BridgeComponentSchema> {}
export interface BridgeComponentImmutable extends x.InferImmutable<typeof BridgeComponentSchema> {}

export const GroupSchema = x.partialObject({
  data: x.partialObject({
    type: x.number(),
    inputs: x.object({}),
    outputs: x.object({}),
  }),
  components: x.list("c", ComponentSchema),
  components_bridge: x.list("c", BridgeComponentSchema),
  groups: x.object({}),
});
export interface Group extends x.Infer<typeof GroupSchema> {}
export interface GroupImmutable extends x.InferImmutable<typeof GroupSchema> {}

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
  nodes: x.list("n", NodeSchema),
  group: GroupSchema,
});
export interface Microcontroller extends x.Infer<typeof MicrocontrollerSchema> {}
export interface MicrocontrollerImmutable extends x.InferImmutable<typeof MicrocontrollerSchema> {}
