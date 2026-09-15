import type { XmlVec2 } from "./common";

export * from "./generated/microcontroller-schema";
export * from "./generated/microcontroller-immutable";

// @xml-schema
/**
 * Represents elements with `text` and `value` attributes in Stormworks microcontroller data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link TextValuePairImmutable} for its parameter type.
 *
 * @see {@link TextValuePairSchema}
 * @see {@link TextValuePairImmutable}
 */
export interface TextValuePair {
  text?: string;
  value?: number;
}

// @xml-schema
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
export interface Node {
  id?: number;
  component_id?: number;
  node?: {
    label?: string;
    mode?: number;
    type?: number;
    description?: string;
    position?: {
      x?: number;
      z?: number;
    };
  };
}

// @xml-schema
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
export interface ObjectIn {
  component_id?: number;
  disabled?: boolean;
  node_index?: number;
}

// @xml-schema
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
export interface ComponentObject {
  id?: number;
  count?: number;
  ct?: number;
  dt?: number;
  e?: string | TextValuePair;
  l?: string;
  memory?: number;
  n?: string | TextValuePair;
  name?: string;
  offset?: number;
  on?: string;
  off?: string;
  m?: number;
  script?: string;
  u?: number;
  v?: string | TextValuePair;
  i?: number | TextValuePair;
  pos?: XmlVec2;
  inc?: ObjectIn;
  in1?: ObjectIn;
  in2?: ObjectIn;
  in3?: ObjectIn;
  in4?: ObjectIn;
  in5?: ObjectIn;
  in6?: ObjectIn;
  in7?: ObjectIn;
  in8?: ObjectIn;
  in9?: ObjectIn;
  in10?: ObjectIn;
  in11?: ObjectIn;
  in12?: ObjectIn;
  in13?: ObjectIn;
  in14?: ObjectIn;
  in15?: ObjectIn;
  in16?: ObjectIn;
  in17?: ObjectIn;
  in18?: ObjectIn;
  in19?: ObjectIn;
  in20?: ObjectIn;
  in21?: ObjectIn;
  in22?: ObjectIn;
  in23?: ObjectIn;
  in24?: ObjectIn;
  in25?: ObjectIn;
  in26?: ObjectIn;
  in27?: ObjectIn;
  in28?: ObjectIn;
  in29?: ObjectIn;
  in30?: ObjectIn;
  in31?: ObjectIn;
  in32?: ObjectIn;
  inoff?: ObjectIn;
  min?: TextValuePair;
  max?: TextValuePair;
  int?: TextValuePair;
  out1?: {};
  out2?: {};
  // @xml-schema list "i"
  items?: {
    l: string;
    v: TextValuePair;
  }[];
  kp?: TextValuePair;
  ki?: TextValuePair;
  kd?: TextValuePair;
  r?: TextValuePair;
}

// @xml-schema
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
export interface Component {
  type?: number;
  object?: ComponentObject;
}

// @xml-schema
/**
 * Represents `<object>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <components_bridge> / <c> / <object>`
 *
 * Parent: {@link BridgeComponent}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link BridgeComponentObjectImmutable} for its parameter type.
 *
 * @see {@link BridgeComponentObjectSchema}
 * @see {@link BridgeComponentObjectImmutable}
 */
export interface BridgeComponentObject {
  id?: number;
  pos?: XmlVec2;
  in1?: ObjectIn;
  out1?: {};
}

// @xml-schema
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
export interface BridgeComponent {
  type?: number;
  object?: BridgeComponentObject;
}

// @xml-schema
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
export interface Group {
  data?: {
    type?: number;
    inputs?: {};
    outputs?: {};
  };
  // @xml-schema list "c"
  components?: Component[];
  // @xml-schema list "c"
  components_bridge?: BridgeComponent[];
  groups?: {};
}

// @xml-schema
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
export interface Microcontroller {
  name?: string;
  description?: string;
  width?: number;
  length?: number;
  id_counter?: number;
  id_counter_node?: number;
  transform_index?: number;
  sym0?: number;
  sym1?: number;
  sym2?: number;
  sym3?: number;
  sym4?: number;
  sym5?: number;
  sym6?: number;
  sym7?: number;
  sym8?: number;
  sym9?: number;
  sym10?: number;
  sym11?: number;
  sym12?: number;
  sym13?: number;
  sym14?: number;
  sym15?: number;
  // @xml-schema list "n"
  nodes?: Node[];
  group?: Group;
}
