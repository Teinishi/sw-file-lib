export * from "./generated/vehicle-schema";
export * from "./generated/vehicle-immutable";

import type { TextValuePair, XmlVec2, XmlRgb, XmlVec3 } from "./common";

// @xml-schema
/**
 * Represents `<author>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <authors> / <author>`
 *
 * Parent: {@link Vehicle}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link AuthorImmutable} for its parameter type.
 *
 * @see {@link AuthorSchema}
 * @see {@link AuthorImmutable}
 */
export interface Author {
  steam_id?: number;
  username?: string;
}

// @xml-schema
/**
 * Represents `<position>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <nodes> / <n> / <node> / <position>`
 *
 * Parent: {@link MicroprocessorNode}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorNodePositionImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorNodePositionSchema}
 * @see {@link MicroprocessorNodePositionImmutable}
 */
export interface MicroprocessorNodePosition {
  x?: number;
  z?: number;
}

// @xml-schema
/**
 * Represents `<node>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <nodes> / <n> / <node>`
 *
 * Parent: {@link MicroprocessorN}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorNodeImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorNodeSchema}
 * @see {@link MicroprocessorNodeImmutable}
 */
export interface MicroprocessorNode {
  label?: string;
  mode?: number;
  type?: number;
  description?: string;
  position?: MicroprocessorNodePosition;
}

// @xml-schema
/**
 * Represents `<n>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <nodes> / <n>`
 *
 * Parent: {@link MicroprocessorDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorNImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorNSchema}
 * @see {@link MicroprocessorNImmutable}
 */
export interface MicroprocessorN {
  id?: number;
  component_id?: number;
  node?: MicroprocessorNode;
}

// @xml-schema
/**
 * Represents `<data>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <data>`
 *
 * Parent: {@link MicroprocessorGroup}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorGroupDataImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorGroupDataSchema}
 * @see {@link MicroprocessorGroupDataImmutable}
 */
export interface MicroprocessorGroupData {
  type?: number;
  inputs?: {};
  outputs?: {};
}

// @xml-schema
/**
 * Represents `<inc>` element, `<in1>` element, `<in2>` element, `<in3>` element, `<in4>` element, `<in5>` element, `<in6>` element, `<in7>` element, `<in8>` element, `<in9>` element, `<in10>` element, `<in11>` element, `<in12>` element, `<in13>` element, `<in14>` element, `<in15>` element, `<in16>` element, `<in17>` element, `<in18>` element, `<in19>` element, `<in20>` element, `<in21>` element, `<in22>` element, `<in23>` element, `<in24>` element, `<in25>` element, `<in26>` element, `<in27>` element, `<in28>` element, `<in29>` element, `<in30>` element, `<in31>` element, `<in32>` element, or `<inoff>` element in Stormworks vehicle data.
 *
 * XML locations:
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <inc>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in1>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in2>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in3>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in4>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in5>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in6>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in7>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in8>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in9>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in10>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in11>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in12>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in13>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in14>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in15>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in16>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in17>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in18>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in19>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in20>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in21>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in22>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in23>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in24>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in25>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in26>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in27>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in28>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in29>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in30>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in31>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <in32>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <inoff>`
 *
 * Parent: {@link MicroprocessorObject}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorInImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorInSchema}
 * @see {@link MicroprocessorInImmutable}
 */
export interface MicroprocessorIn {
  component_id?: number;
  disabled?: boolean;
  node_index?: number;
}

// @xml-schema
/**
 * Represents `<i>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object> / <items> / <i>`
 *
 * Parent: {@link MicroprocessorObject}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorItemImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorItemSchema}
 * @see {@link MicroprocessorItemImmutable}
 */
export interface MicroprocessorItem {
  l?: string;
  v?: TextValuePair;
}

// @xml-schema
/**
 * Represents `<object>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c> / <object>`
 *
 * Parent: {@link MicroprocessorComponent}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorObjectImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorObjectSchema}
 * @see {@link MicroprocessorObjectImmutable}
 */
export interface MicroprocessorObject {
  id?: number;
  count?: number;
  ct?: number;
  dt?: number;
  l?: string;
  memory?: number;
  name?: string;
  offset?: number;
  on?: string;
  off?: string;
  m?: number;
  script?: string;
  u?: number;
  e?: string | TextValuePair;
  n?: string | TextValuePair;
  v?: string | TextValuePair;
  i?: number | TextValuePair;
  pos?: XmlVec2;
  inc?: MicroprocessorIn;
  in1?: MicroprocessorIn;
  in2?: MicroprocessorIn;
  in3?: MicroprocessorIn;
  in4?: MicroprocessorIn;
  in5?: MicroprocessorIn;
  in6?: MicroprocessorIn;
  in7?: MicroprocessorIn;
  in8?: MicroprocessorIn;
  in9?: MicroprocessorIn;
  in10?: MicroprocessorIn;
  in11?: MicroprocessorIn;
  in12?: MicroprocessorIn;
  in13?: MicroprocessorIn;
  in14?: MicroprocessorIn;
  in15?: MicroprocessorIn;
  in16?: MicroprocessorIn;
  in17?: MicroprocessorIn;
  in18?: MicroprocessorIn;
  in19?: MicroprocessorIn;
  in20?: MicroprocessorIn;
  in21?: MicroprocessorIn;
  in22?: MicroprocessorIn;
  in23?: MicroprocessorIn;
  in24?: MicroprocessorIn;
  in25?: MicroprocessorIn;
  in26?: MicroprocessorIn;
  in27?: MicroprocessorIn;
  in28?: MicroprocessorIn;
  in29?: MicroprocessorIn;
  in30?: MicroprocessorIn;
  in31?: MicroprocessorIn;
  in32?: MicroprocessorIn;
  inoff?: MicroprocessorIn;
  min?: TextValuePair;
  max?: TextValuePair;
  int?: TextValuePair;
  out1?: {};
  out2?: {};
  // @xml-schema list "i"
  items?: MicroprocessorItem[];
  kp?: TextValuePair;
  ki?: TextValuePair;
  kd?: TextValuePair;
  r?: TextValuePair;
}

// @xml-schema
/**
 * Represents `<c>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components> / <c>`
 *
 * Parent: {@link MicroprocessorGroup}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorComponentImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorComponentSchema}
 * @see {@link MicroprocessorComponentImmutable}
 */
export interface MicroprocessorComponent {
  type?: number;
  object?: MicroprocessorObject;
}

// @xml-schema
/**
 * Represents `<in1>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components_bridge> / <c> / <object> / <in1>`
 *
 * Parent: {@link MicroprocessorObjectBridge}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorInBridgeImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorInBridgeSchema}
 * @see {@link MicroprocessorInBridgeImmutable}
 */
export interface MicroprocessorInBridge {
  component_id?: number;
  node_index?: number;
}

// @xml-schema
/**
 * Represents `<object>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components_bridge> / <c> / <object>`
 *
 * Parent: {@link MicroprocessorComponentBridge}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorObjectBridgeImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorObjectBridgeSchema}
 * @see {@link MicroprocessorObjectBridgeImmutable}
 */
export interface MicroprocessorObjectBridge {
  id?: number;
  pos?: XmlVec2;
  in1?: MicroprocessorInBridge;
  out1?: {};
}

// @xml-schema
/**
 * Represents `<c>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group> / <components_bridge> / <c>`
 *
 * Parent: {@link MicroprocessorGroup}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorComponentBridgeImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorComponentBridgeSchema}
 * @see {@link MicroprocessorComponentBridgeImmutable}
 */
export interface MicroprocessorComponentBridge {
  type?: number;
  object?: MicroprocessorObjectBridge;
}

// @xml-schema
/**
 * Represents `<group>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition> / <group>`
 *
 * Parent: {@link MicroprocessorDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorGroupImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorGroupSchema}
 * @see {@link MicroprocessorGroupImmutable}
 */
export interface MicroprocessorGroup {
  data?: MicroprocessorGroupData;
  // @xml-schema list "c"
  components?: MicroprocessorComponent[];
  // @xml-schema list "c"
  components_bridge?: MicroprocessorComponentBridge[];
  groups?: {};
}

// @xml-schema
/**
 * Represents `<microprocessor_definition>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <microprocessor_definition>`
 *
 * Parent: {@link ComponentO}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link MicroprocessorDefinitionImmutable} for its parameter type.
 *
 * @see {@link MicroprocessorDefinitionSchema}
 * @see {@link MicroprocessorDefinitionImmutable}
 */
export interface MicroprocessorDefinition {
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
  nodes?: MicroprocessorN[];
  group?: MicroprocessorGroup;
}

// @xml-schema
/**
 * Represents `<slot>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <logic_slots> / <slot>`
 *
 * Parent: {@link ComponentO}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link LogicSlotImmutable} for its parameter type.
 *
 * @see {@link LogicSlotSchema}
 * @see {@link LogicSlotImmutable}
 */
export interface LogicSlot {
  editor_connected?: number;
  value?: boolean | number | {};
}

// @xml-schema metalist "c"
/**
 * Represents `<col_extra>` element in Stormworks vehicle data.
 *
 * XML locations:
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_1> / <col_extra>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_2> / <col_extra>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_3> / <col_extra>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_4> / <col_extra>`
 *
 * Parent: {@link Display}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ColExtraImmutable} for its parameter type.
 *
 * @see {@link ColExtraSchema}
 * @see {@link ColExtraImmutable}
 */
export interface ColExtra {
  meta: {
    size?: number;
  };
  items: {
    value?: XmlRgb;
  }[];
}

// @xml-schema
/**
 * Represents `<display_1>` element, `<display_2>` element, `<display_3>` element, or `<display_4>` element in Stormworks vehicle data.
 *
 * XML locations:
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_1>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_2>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_3>`
 * - `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_4>`
 *
 * Parent: {@link ComponentO}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link DisplayImmutable} for its parameter type.
 *
 * @see {@link DisplaySchema}
 * @see {@link DisplayImmutable}
 */
export interface Display {
  type?: number;
  name?: string;
  channel?: number;
  mode?: number;
  mode2?: number;
  rot?: number;
  col?: XmlRgb;
  min?: TextValuePair;
  max?: TextValuePair;
  col_extra?: ColExtra;
}

// @xml-schema
/**
 * Represents `<axis_sensitivity>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <axis_sensitivity>`
 *
 * Parent: {@link ComponentO}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link AxisSensitivityImmutable} for its parameter type.
 *
 * @see {@link AxisSensitivitySchema}
 * @see {@link AxisSensitivityImmutable}
 */
export interface AxisSensitivity {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
}

// @xml-schema
/**
 * Represents `<o>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o>`
 *
 * Parent: {@link Component}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentOImmutable} for its parameter type.
 *
 * @see {@link ComponentOSchema}
 * @see {@link ComponentOImmutable}
 */
export interface ComponentO {
  r?: string;
  bc?: string;
  bc2?: string;
  bc3?: string;
  ac?: string;
  sc?: string;
  scale?: number;
  spawn_rod?: boolean;
  spring_factor?: number;
  ai_type?: number;
  blade_count?: number;
  blade_pitch?: number;
  blade_length?: number;
  coal_fill?: number;
  current_tick?: number;
  custom_name?: string;
  control_mode_0?: number;
  decimal_point_pos?: number;
  audio_data?: string;
  flare_type?: number;
  flare_color?: number;
  fluid_type?: number;
  fuel_factor?: number;
  gc?: string;
  gca?: string;
  gear_ratio_1?: number;
  gear_ratio_2?: number;
  grip_factor?: number;
  hold_duration?: number;
  default_state?: boolean;
  input_ch_1?: number;
  input_ch_2?: number;
  input_ch_3?: number;
  interactive_default_state?: boolean;
  fluid_filter?: number;
  fluid_fill?: number;
  m_fov_x?: number;
  m_fov_y?: number;
  m_pitch_angle?: number;
  m_sweep_mode?: number;
  max_force_scalar?: number;
  max_force_scale?: number;
  muzzle_velocity?: number;
  gear_ratio?: number;
  input_velocity?: number;
  ordinance_type?: number;
  property_ammo_damage?: number;
  property_ammo_type?: number;
  rps_limit?: number;
  sensitivity?: number;
  spawn_charge?: number;
  stiffness_factor?: number;
  damping_factor?: number;
  throttle_min?: number;
  throttle_max?: number;
  timer_scalar_1?: number;
  timer_scalar_2?: number;
  tire_type?: number;
  trigger?: number;
  trigger_label?: string;
  func_type?: number;
  hotkey_0?: number;
  hotkey_0_label?: string;
  hotkey_1?: number;
  hotkey_1_label?: string;
  hotkey_2?: number;
  hotkey_2_label?: string;
  hotkey_3?: number;
  hotkey_3_label?: string;
  hotkey_4?: number;
  hotkey_4_label?: string;
  hotkey_5?: number;
  hotkey_5_label?: string;
  control_mode_0_label?: string;
  control_mode_1?: number;
  control_mode_1_label?: string;
  control_mode_2?: number;
  control_mode_2_label?: string;
  control_mode_3?: number;
  control_mode_3_label?: string;
  is_infrared?: boolean;
  lss_mode?: number;
  property_text?: string;
  radar_fov?: number;
  sensor_radius?: number;
  sensor_type?: number;
  sensor_mode?: number;
  val_1_name?: string;
  val_2_name?: string;
  volume?: number;
  pitch?: number;
  wheel_size?: number;
  double_wheel?: boolean;
  tyre_pressure?: number;
  microprocessor_definition?: MicroprocessorDefinition;
  vp?: XmlVec3;
  // @xml-schema list "slot"
  logic_slots?: LogicSlot[];
  delta_damping?: XmlVec3;
  display_1?: Display;
  display_2?: Display;
  display_3?: Display;
  display_4?: Display;
  impact_sensor_threshold?: TextValuePair;
  m_sweep_limit?: TextValuePair;
  m_sweep_speed?: TextValuePair;
  min_value?: TextValuePair;
  max_value?: TextValuePair;
  property_output_float_val?: TextValuePair;
  min_threshold?: TextValuePair;
  max_threshold?: TextValuePair;
  pid_controller_ki?: TextValuePair;
  pid_controller_kp?: TextValuePair;
  pid_controller_kd?: TextValuePair;
  pid_controller_max_error?: TextValuePair;
  exp?: TextValuePair;
  min_lever_value?: TextValuePair;
  max_lever_value?: TextValuePair;
  starting_lever_value?: TextValuePair;
  trim_x_display?: TextValuePair;
  trim_y_display?: TextValuePair;
  trim_z_display?: TextValuePair;
  trim_w_display?: TextValuePair;
  axis_sensitivity?: AxisSensitivity;
}

// @xml-schema
/**
 * Represents `<c>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c>`
 *
 * Parent: {@link Body}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentImmutable} for its parameter type.
 *
 * @see {@link ComponentSchema}
 * @see {@link ComponentImmutable}
 */
export interface Component {
  d?: string;
  t?: number;
  o?: ComponentO;
}

// @xml-schema
/**
 * Represents `<body>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body>`
 *
 * Parent: {@link Vehicle}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link BodyImmutable} for its parameter type.
 *
 * @see {@link BodySchema}
 * @see {@link BodyImmutable}
 */
export interface Body {
  unique_id?: number;
  // @xml-schema list "c"
  components?: Component[];
}

// @xml-schema
/**
 * Represents `<logic_node_link>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <logic_node_links> / <logic_node_link>`
 *
 * Parent: {@link Vehicle}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link LogicNodeLinkImmutable} for its parameter type.
 *
 * @see {@link LogicNodeLinkSchema}
 * @see {@link LogicNodeLinkImmutable}
 */
export interface LogicNodeLink {
  type?: number;
  voxel_pos_0?: XmlVec3;
  voxel_pos_1?: XmlVec3;
}

// @xml-schema
/**
 * Represents `<vehicle>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle>`
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link VehicleImmutable} for its parameter type.
 *
 * @see {@link VehicleSchema}
 * @see {@link VehicleImmutable}
 */
export interface Vehicle {
  data_version?: number;
  is_modded?: boolean;
  is_static?: boolean;
  bodies_id?: number;
  editor_placement_offset?: XmlVec3;
  // @xml-schema list "author"
  authors?: Author[];
  // @xml-schema list "body"
  bodies?: Body[];
  // @xml-schema list "logic_node_link"
  logic_node_links?: LogicNodeLink[];
}
