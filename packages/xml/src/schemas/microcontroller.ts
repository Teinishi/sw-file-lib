export * from "./generated/microcontroller-schema";
export * from "./generated/microcontroller-immutable";

import type { XmlVec3, TextValuePair, XmlVec2 } from "./common";

// @xml-schema
/**
 * Represents `<node>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <nodes> / <n> / <node>`
 *
 * Parent: {@link N}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link NodeImmutable} for its parameter type.
 *
 * @see {@link NodeSchema}
 * @see {@link NodeImmutable}
 */
export interface Node {
  orientation?: number;
  label?: string;
  mode?: number;
  type?: number;
  description?: string;
  flags?: number;
  position?: XmlVec3;
}

// @xml-schema
/**
 * Represents `<n>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <nodes> / <n>`
 *
 * Parent: {@link Microprocessor}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link NImmutable} for its parameter type.
 *
 * @see {@link NSchema}
 * @see {@link NImmutable}
 */
export interface N {
  id?: number;
  component_id?: number;
  built_slot_index?: number;
  node?: Node;
}

// @xml-schema
/**
 * Represents `<data>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group> / <data>`
 *
 * Parent: {@link Group}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link DataImmutable} for its parameter type.
 *
 * @see {@link DataSchema}
 * @see {@link DataImmutable}
 */
export interface Data {
  type?: number;
  name?: string;
  desc?: string;
  inputs?: {};
  outputs?: {};
}

// @xml-schema
/**
 * Represents `<v>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <inc> / <v>`
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <in*> / <v>`
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <out*> / <v>`
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object> / <in1> / <v>`
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object> / <out1> / <v>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <inc> / <v>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <in*> / <v>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <out*> / <v>`
 * - `<microprocessor> / <group> / <component_bridge_states> / <c*> / <in1> / <v>`
 * - `<microprocessor> / <group> / <component_bridge_states> / <c*> / <out1> / <v>`
 *
 * Parents: {@link In} or {@link Out}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link CompositeValueImmutable} for its parameter type.
 *
 * @see {@link CompositeValueSchema}
 * @see {@link CompositeValueImmutable}
 */
export interface CompositeValue {
  "10"?: number;
  "11"?: number;
  "12"?: number;
  "13"?: number;
  "14"?: number;
  "15"?: number;
  "16"?: number;
  "17"?: number;
  "18"?: number;
  "19"?: number;
  "20"?: number;
  "21"?: number;
  "22"?: number;
  "23"?: number;
  "24"?: number;
  "25"?: number;
  "26"?: number;
  "27"?: number;
  "28"?: number;
  "29"?: number;
  "30"?: number;
  "31"?: number;
  "32"?: number;
  bools?: number;
  "01"?: number;
  "02"?: number;
  "03"?: number;
  "04"?: number;
  "05"?: number;
  "06"?: number;
  "07"?: number;
  "08"?: number;
  "09"?: number;
}

// @xml-schema
/**
 * Represents `<inc>` element, `<in*>` element, or `<inoff>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <inc>`
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <in*>`
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <inoff>`
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object> / <in1>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <inc>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <in*>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <inoff>`
 * - `<microprocessor> / <group> / <component_bridge_states> / <c*> / <in1>`
 *
 * Parents: {@link Object} or {@link ObjectBridge}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link InImmutable} for its parameter type.
 *
 * @see {@link InSchema}
 * @see {@link InImmutable}
 */
export interface In {
  component_id?: number;
  disabled?: boolean;
  node_index?: number;
  v?: boolean | number | CompositeValue;
}

// @xml-schema
/**
 * Represents `<out*>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <out*>`
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object> / <out1>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <out*>`
 * - `<microprocessor> / <group> / <component_bridge_states> / <c*> / <out1>`
 *
 * Parents: {@link Object} or {@link ObjectBridge}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link OutImmutable} for its parameter type.
 *
 * @see {@link OutSchema}
 * @see {@link OutImmutable}
 */
export interface Out {
  v?: boolean | number | CompositeValue;
}

// @xml-schema
/**
 * Represents `<i>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <components> / <c> / <object> / <items> / <i>`
 * - `<microprocessor> / <group> / <component_states> / <c*> / <items> / <i>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ItemImmutable} for its parameter type.
 *
 * @see {@link ItemSchema}
 * @see {@link ItemImmutable}
 */
export interface Item {
  l?: string;
  v?: TextValuePair | IV;
}

// @xml-schema
/**
 * Represents `<object>` element or `<c*>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <components> / <c> / <object>`
 * - `<microprocessor> / <group> / <component_states> / <c*>`
 *
 * Parents: {@link Component} or {@link Group}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ObjectImmutable} for its parameter type.
 *
 * @see {@link ObjectSchema}
 * @see {@link ObjectImmutable}
 */
export interface Object {
  id?: number;
  count?: number;
  ct?: number;
  dt?: number;
  c1?: number;
  c2?: number;
  l?: string;
  m?: number;
  memory?: number;
  is?: boolean;
  name?: string;
  offset?: number;
  on?: string;
  off?: string;
  c?: number;
  p?: boolean;
  p1?: boolean | number;
  p2?: boolean | number;
  p3?: number;
  script?: string;
  t?: number;
  u?: number;
  vp?: number;
  ip?: boolean;
  e?: string | TextValuePair | E;
  n?: string | TextValuePair | C0N;
  v?: string | TextValuePair | C0V;
  i?: number | TextValuePair | C0I;
  pos?: XmlVec2 | Pos;
  inc?: In;
  in1?: In;
  in2?: In;
  in3?: In;
  in4?: In;
  in5?: In;
  in6?: In;
  in7?: In;
  in8?: In;
  in9?: In;
  in10?: In;
  in11?: In;
  in12?: In;
  in13?: In;
  in14?: In;
  in15?: In;
  in16?: In;
  in17?: In;
  in18?: In;
  in19?: In;
  in20?: In;
  in21?: In;
  in22?: In;
  in23?: In;
  in24?: In;
  in25?: In;
  in26?: In;
  in27?: In;
  in28?: In;
  in29?: In;
  in30?: In;
  in31?: In;
  in32?: In;
  inoff?: In;
  out1?: Out;
  out2?: Out;
  // @xml-schema list "i"
  items?: Item[];
  kp?: TextValuePair | Kp;
  ki?: TextValuePair | Ki;
  kd?: TextValuePair | Kd;
  r?: TextValuePair | R;
  min?: TextValuePair | Min;
  max?: TextValuePair | Max;
  int?: TextValuePair | Int;
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
  object?: Object;
}

// @xml-schema
/**
 * Represents `<object>` element or `<c*>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <components_bridge> / <c> / <object>`
 * - `<microprocessor> / <group> / <component_bridge_states> / <c*>`
 *
 * Parents: {@link ComponentBridge} or {@link Group}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ObjectBridgeImmutable} for its parameter type.
 *
 * @see {@link ObjectBridgeSchema}
 * @see {@link ObjectBridgeImmutable}
 */
export interface ObjectBridge {
  id?: number;
  pos?: XmlVec2 | C0Pos;
  in1?: In;
  out1?: Out;
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
 * {@link ComponentBridgeImmutable} for its parameter type.
 *
 * @see {@link ComponentBridgeSchema}
 * @see {@link ComponentBridgeImmutable}
 */
export interface ComponentBridge {
  type?: number;
  object?: ObjectBridge;
}

// @xml-schema
/**
 * Represents `<pos>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <pos>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link PosImmutable} for its parameter type.
 *
 * @see {@link PosSchema}
 * @see {@link PosImmutable}
 */
export interface Pos {
  x?: number;
  y?: number;
}

// @xml-schema
/**
 * Represents `<v>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <items> / <i> / <v>`
 *
 * Parent: {@link Item}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link IVImmutable} for its parameter type.
 *
 * @see {@link IVSchema}
 * @see {@link IVImmutable}
 */
export interface IV {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<n>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <n>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link C0NImmutable} for its parameter type.
 *
 * @see {@link C0NSchema}
 * @see {@link C0NImmutable}
 */
export interface C0N {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<kp>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <kp>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link KpImmutable} for its parameter type.
 *
 * @see {@link KpSchema}
 * @see {@link KpImmutable}
 */
export interface Kp {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<ki>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <ki>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link KiImmutable} for its parameter type.
 *
 * @see {@link KiSchema}
 * @see {@link KiImmutable}
 */
export interface Ki {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<kd>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <kd>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link KdImmutable} for its parameter type.
 *
 * @see {@link KdSchema}
 * @see {@link KdImmutable}
 */
export interface Kd {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<r>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <r>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link RImmutable} for its parameter type.
 *
 * @see {@link RSchema}
 * @see {@link RImmutable}
 */
export interface R {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<i>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <i>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link C0IImmutable} for its parameter type.
 *
 * @see {@link C0ISchema}
 * @see {@link C0IImmutable}
 */
export interface C0I {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<min>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <min>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MinImmutable} for its parameter type.
 *
 * @see {@link MinSchema}
 * @see {@link MinImmutable}
 */
export interface Min {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<max>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <max>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MaxImmutable} for its parameter type.
 *
 * @see {@link MaxSchema}
 * @see {@link MaxImmutable}
 */
export interface Max {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<v>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <v>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link C0VImmutable} for its parameter type.
 *
 * @see {@link C0VSchema}
 * @see {@link C0VImmutable}
 */
export interface C0V {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<int>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <int>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link IntImmutable} for its parameter type.
 *
 * @see {@link IntSchema}
 * @see {@link IntImmutable}
 */
export interface Int {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<e>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_states> / <c*> / <e>`
 *
 * Parent: {@link Object}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link EImmutable} for its parameter type.
 *
 * @see {@link ESchema}
 * @see {@link EImmutable}
 */
export interface E {
  text?: string;
  value?: number;
}

// @xml-schema
/**
 * Represents `<pos>` element in Stormworks microcontroller data.
 *
 * XML locations:
 * - `<microprocessor> / <group> / <component_bridge_states> / <c*> / <pos>`
 *
 * Parent: {@link ObjectBridge}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link C0PosImmutable} for its parameter type.
 *
 * @see {@link C0PosSchema}
 * @see {@link C0PosImmutable}
 */
export interface C0Pos {
  x?: number;
  y?: number;
}

// @xml-schema
/**
 * Represents `<group>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor> / <group>`
 *
 * Parent: {@link Microprocessor}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link GroupImmutable} for its parameter type.
 *
 * @see {@link GroupSchema}
 * @see {@link GroupImmutable}
 */
export interface Group {
  id?: number;
  pos?: XmlVec2;
  data?: Data;
  // @xml-schema list "c"
  components?: Component[];
  // @xml-schema list "c"
  components_bridge?: ComponentBridge[];
  groups?: {};
  component_states?: Record<string, Object>;
  component_bridge_states?: Record<string, ObjectBridge>;
  group_states?: {};
}

// @xml-schema
/**
 * Represents `<microprocessor>` element in Stormworks microcontroller data.
 *
 * XML location: `<microprocessor>`
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorSchema}
 * @see {@link MicroprocessorImmutable}
 */
export interface Microprocessor {
  name?: string;
  description?: string;
  hide_in_inventory?: boolean;
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
  nodes?: N[];
  group?: Group;
}
