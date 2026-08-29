/**
 * Schemas and types for Stormworks microcontroller XML data.
 *
 * The schema and types for root `<microprocessor>` element are re-exported at `'@sw-file-lib/xml'`, see {@link MicrocontrollerSchema}, {@link Microcontroller}, and {@link MicrocontrollerImmutable}.
 *
 * @packageDocumentation
 */

import { SwVec2Schema } from ".";
import * as x from "../xml-schema";
import type { ComponentOSchema, ComponentO, ComponentOImmutable } from "./Vehicle"; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Represents elements with `text` and `value` attributes in Stormworks microcontroller data.
 *
 * @see {@link TextValuePair}
 * @see {@link TextValuePairImmutable}
 */
export const TextValuePairSchema = x.partialObject({
  text: x.string(),
  value: x.number(),
});

/**
 * Represents elements with `text` and `value` attributes in Stormworks microcontroller data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link TextValuePairImmutable} for its parameter type.
 *
 * @see {@link TextValuePairSchema}
 * @see {@link TextValuePairImmutable}
 */
export interface TextValuePair extends x.Infer<typeof TextValuePairSchema> {}

/**
 * Represents elements with `text` and `value` attributes in Stormworks microcontroller data.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link TextValuePair} instead
 * if mutation is required.
 *
 * @see {@link TextValuePairSchema}
 * @see {@link TextValuePair}
 */
export interface TextValuePairImmutable extends x.InferImmutable<typeof TextValuePairSchema> {}

/**
 * Represents `<n>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <nodes> / <n>`
 *
 * Parent: {@link MicrocontrollerSchema}
 *
 * @see {@link Node}
 * @see {@link NodeImmutable}
 */
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

/**
 * Represents `<n>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <nodes> / <n>`
 *
 * Parent: {@link Microcontroller}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link NodeImmutable} for its parameter type.
 *
 * @see {@link NodeSchema}
 * @see {@link NodeImmutable}
 */
export interface Node extends x.Infer<typeof NodeSchema> {}

/**
 * Represents `<n>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <nodes> / <n>`
 *
 * Parent: {@link MicrocontrollerImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Node} instead
 * if mutation is required.
 *
 * @see {@link NodeSchema}
 * @see {@link Node}
 */
export interface NodeImmutable extends x.InferImmutable<typeof NodeSchema> {}

/**
 * Represents `<in*>` element in Stormworks microcontroller data.
 *
 * XML location:
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <in*>`
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object> / <in1>`
 *
 * Parent: {@link ComponentObjectSchema}, {@link BridgeComponentSchema}
 *
 * @see {@link ObjectIn}
 * @see {@link ObjectInImmutable}
 */
export const ObjectInSchema = x.partialObject({
  component_id: x.number(),
  disabled: x.boolean(),
  node_index: x.number(),
});

/**
 * Represents `<in*>` element in Stormworks microcontroller data.
 *
 * XML location:
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <in*>`
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object> / <in1>`
 *
 * Parent: {@link ComponentObject}, {@link BridgeComponent}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ObjectInImmutable} for its parameter type.
 *
 * @see {@link ObjectInSchema}
 * @see {@link ObjectInImmutable}
 */
export interface ObjectIn extends x.Infer<typeof ObjectInSchema> {}

/**
 * Represents `<in*>` element in Stormworks microcontroller data.
 *
 * XML location:
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <in*>`
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object> / <in1>`
 *
 * Parent: {@link ComponentObjectImmutable}, {@link BridgeComponentImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link ObjectIn} instead
 * if mutation is required.
 *
 * @see {@link ObjectInSchema}
 * @see {@link ObjectIn}
 */
export interface ObjectInImmutable extends x.InferImmutable<typeof ObjectInSchema> {}

/**
 * Represents `<object>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components> / <c> / <object>`
 *
 * Parent: {@link ComponentSchema}
 *
 * @see {@link ComponentObject}
 * @see {@link ComponentObjectImmutable}
 */
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

/**
 * Represents `<object>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components> / <c> / <object>`
 *
 * Parent: {@link Component}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentObjectImmutable} for its parameter type.
 *
 * @see {@link ComponentObjectSchema}
 * @see {@link ComponentObjectImmutable}
 */
export interface ComponentObject extends x.Infer<typeof ComponentObjectSchema> {}

/**
 * Represents `<object>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components> / <c> / <object>`
 *
 * Parent: {@link ComponentImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link ComponentObject} instead
 * if mutation is required.
 *
 * @see {@link ComponentObjectSchema}
 * @see {@link ComponentObject}
 */
export interface ComponentObjectImmutable extends x.InferImmutable<typeof ComponentObjectSchema> {}

/**
 * Represents `<c>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components> / <c>`
 *
 * Parent: {@link GroupSchema}
 */
export const ComponentSchema = x.partialObject({
  type: x.number(),
  object: ComponentObjectSchema,
});

/**
 * Represents `<c>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components> / <c>`
 *
 * Parent: {@link Group}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentImmutable} for its parameter type.
 *
 * @see {@link ComponentSchema}
 * @see {@link ComponentImmutable}
 */
export interface Component extends x.Infer<typeof ComponentSchema> {}

/**
 * Represents `<c>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components> / <c>`
 *
 * Parent: {@link GroupImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Component} instead
 * if mutation is required.
 *
 * @see {@link ComponentSchema}
 * @see {@link Component}
 */
export interface ComponentImmutable extends x.InferImmutable<typeof ComponentSchema> {}

/**
 * Represents `<c>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components_bridge> / <c>`
 *
 * Parent: {@link GroupSchema}
 *
 * @see {@link BridgeComponent}
 * @see {@link BridgeComponentImmutable}
 */
export const BridgeComponentSchema = x.partialObject({
  type: x.number(),
  object: x.partialObject({
    id: x.number(),
    pos: SwVec2Schema,
    in1: ObjectInSchema,
    out1: x.object({}),
  }),
});

/**
 * Represents `<c>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components_bridge> / <c>`
 *
 * Parent: {@link Group}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link BridgeComponentImmutable} for its parameter type.
 *
 * @see {@link BridgeComponentSchema}
 * @see {@link BridgeComponentImmutable}
 */
export interface BridgeComponent extends x.Infer<typeof BridgeComponentSchema> {}

/**
 * Represents `<c>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components_bridge> / <c>`
 *
 * Parent: {@link GroupImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link BridgeComponent} instead
 * if mutation is required.
 *
 * @see {@link BridgeComponentSchema}
 * @see {@link BridgeComponent}
 */
export interface BridgeComponentImmutable extends x.InferImmutable<typeof BridgeComponentSchema> {}

/**
 * Represents `<group>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group>`
 *
 * Parent: {@link MicrocontrollerSchema}
 *
 * @see {@link Group}
 * @see {@link GroupImmutable}
 */
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

/**
 * Represents `<group>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group>`
 *
 * Parent: {@link Microcontroller}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link GroupImmutable} for its parameter type.
 *
 * @see {@link Group}
 * @see {@link GroupImmutable}
 */
export interface Group extends x.Infer<typeof GroupSchema> {}

/**
 * Represents `<group>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group>`
 *
 * Parent: {@link MicrocontrollerImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Group} instead
 * if mutation is required.
 *
 * @see {@link Group}
 * @see {@link GroupImmutable}
 */
export interface GroupImmutable extends x.InferImmutable<typeof GroupSchema> {}

/**
 * Represents root `<microprocessor>` element in Stormworks microcontroller data, or `<microprocessor_definition>` element in Stormworks vehicle data.
 *
 * XML location in vehicle data: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition>`
 *
 * Parent in vehicle data: {@link ComponentOSchema}
 *
 * @see {@link Microcontroller}
 * @see {@link MicrocontrollerImmutable}
 */
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

/**
 * Represents root `<microprocessor>` element in Stormworks microcontroller data, or `<microprocessor_definition>` element in Stormworks vehicle data.
 *
 * XML location in vehicle data: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition>`
 *
 * Parent in vehicle data: {@link ComponentO}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicrocontrollerImmutable} for its parameter type.
 *
 * @see {@link MicrocontrollerSchema}
 * @see {@link MicrocontrollerImmutable}
 */
export interface Microcontroller extends x.Infer<typeof MicrocontrollerSchema> {}

/**
 * Represents root `<microprocessor>` element in Stormworks microcontroller data, or `<microprocessor_definition>` element in Stormworks vehicle data.
 *
 * XML location in vehicle data: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition>`
 *
 * Parent in vehicle data: {@link ComponentOImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Microcontroller} instead
 * if mutation is required.
 *
 * @see {@link MicrocontrollerSchema}
 * @see {@link Microcontroller}
 */
export interface MicrocontrollerImmutable extends x.InferImmutable<typeof MicrocontrollerSchema> {}
