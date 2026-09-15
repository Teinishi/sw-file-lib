import type { XmlRgb, XmlVec3 } from "./common";
import type { Microcontroller, TextValuePair } from "./microcontroller";

export * from "./generated/vehicle-schema";
export * from "./generated/vehicle-immutable";

// @xml-schema
/**
 * Represents `<author>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <authors> / <author>`
 *
 * Parent: {@link Vehicle}
 *
 *  If your function only reads the value and does not mutate it, prefer
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
 * Represents `<slot>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <logic_slots> / <slot>`
 *
 * Parent: {@link ComponentO}
 *
 *  If your function only reads the value and does not mutate it, prefer
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
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*> / <col_extra>`
 *
 * Parent: {@link Display}
 *
 *  If your function only reads the value and does not mutate it, prefer
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
 * Represents `<display_1>`, `<display_2>`, `<display_3>`, or `<display_4>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*>`
 *
 * Parent: {@link ComponentO}
 *
 *  If your function only reads the value and does not mutate it, prefer
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
 *  If your function only reads the value and does not mutate it, prefer
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
 * Parent: {@link ComponentSchema}
 *
 *  If your function only reads the value and does not mutate it, prefer
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
  microprocessor_definition?: Microcontroller;
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
 *  If your function only reads the value and does not mutate it, prefer
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
 *  If your function only reads the value and does not mutate it, prefer
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
 *  If your function only reads the value and does not mutate it, prefer
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
 * Represents root `<vehicle>` element in Stormworks vehicle data.
 *
 * Inferred from {@link VehicleSchema} and used as the return type of
 * {@link parseVehicleXml} and {@link safeParseVehicleXml} function.
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
