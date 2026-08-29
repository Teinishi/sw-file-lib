/**
 * Schemas and types for Stormworks vehicle XML data.
 *
 * The schema and types for root `<vehicle>` element are re-exported at `'@sw-file-lib/xml'`, see {@link VehicleSchema}, {@link Vehicle}, and {@link VehicleImmutable}.
 *
 * @packageDocumentation
 */

import * as x from "../xml-schema";
import { SwRgbSchema, SwVec3Schema } from "./common";
import { MicrocontrollerSchema, TextValuePairSchema } from "./Microcontroller";

/**
 * Represents `<author>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <authors> / <author>`
 *
 * Parent: {@link VehicleSchema}
 *
 * @see {@link Author}
 * @see {@link AuthorImmutable}
 */
export const AuthorSchema = x.partialObject({
  steam_id: x.number(),
  username: x.string(),
});

/**
 * Represents `<author>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <authors> / <author>`
 *
 * Parent: {@link Vehicle}
 *
 * Inferred from {@link AuthorSchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link AuthorImmutable} for its parameter type.
 *
 * @see {@link AuthorSchema}
 * @see {@link AuthorImmutable}
 */
export interface Author extends x.Infer<typeof AuthorSchema> {}

/**
 * Represents `<author>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <authors> / <author>`
 *
 * Parent: {@link VehicleImmutable}
 *
 * Inferred from {@link AuthorSchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Author} instead
 * if mutation is required.
 *
 * @see {@link AuthorSchema}
 * @see {@link Author}
 */
export interface AuthorImmutable extends x.InferImmutable<typeof AuthorSchema> {}

/**
 * Represents `<slot>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <logic_slots> / <slot>`
 *
 * Parent: {@link ComponentOSchema}
 *
 * @see {@link LogicSlot}
 * @see {@link LogicSlotImmutable}
 */
export const LogicSlotSchema = x.partialObject({
  editor_connected: x.number(),
  value: x.union([x.boolean(), x.number(), x.object({})]),
});

/**
 * Represents `<slot>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <logic_slots> / <slot>`
 *
 * Parent: {@link ComponentO}
 *
 * Inferred from {@link LogicSlotSchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link LogicSlotImmutable} for its parameter type.
 *
 * @see {@link LogicSlotSchema}
 * @see {@link LogicSlotImmutable}
 */
export interface LogicSlot extends x.Infer<typeof LogicSlotSchema> {}

/**
 * Represents `<slot>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <logic_slots> / <slot>`
 *
 * Parent: {@link ComponentOImmutable}
 *
 * Inferred from {@link LogicSlotSchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link LogicSlot} instead
 * if mutation is required.
 *
 * @see {@link LogicSlotSchema}
 * @see {@link LogicSlot}
 */
export interface LogicSlotImmutable extends x.InferImmutable<typeof LogicSlotSchema> {}

/**
 * Represents `<col_extra>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*> / <col_extra>`
 *
 * Parent: {@link DisplaySchema}
 *
 * @see {@link ColExtra}
 * @see {@link ColExtraImmutable}
 */
export const ColExtraSchema = x.metalist(
  "c",
  x.partialObject({
    size: x.number(),
  }),
  x.partialObject({
    value: SwRgbSchema,
  }),
);

/**
 * Represents `<col_extra>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*> / <col_extra>`
 *
 * Parent: {@link Display}
 *
 * Inferred from {@link ColExtraSchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ColExtraImmutable} for its parameter type.
 *
 * @see {@link ColExtraSchema}
 * @see {@link ColExtraImmutable}
 */
export interface ColExtra extends x.Infer<typeof ColExtraSchema> {}

/**
 * Represents `<col_extra>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*> / <col_extra>`
 *
 * Parent: {@link DisplayImmutable}
 *
 * Inferred from {@link ColExtraSchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link ColExtra} instead
 * if mutation is required.
 *
 * @see {@link ColExtraSchema}
 * @see {@link ColExtra}
 */
export interface ColExtraImmutable extends x.InferImmutable<typeof ColExtraSchema> {}

/**
 * Represents `<display_1>`, `<display_2>`, `<display_3>`, or `<display_4>` in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*>`
 *
 * Parent: {@link ComponentOSchema}
 *
 * @see {@link Display}
 * @see {@link DisplayImmutable}
 */
export const DisplaySchema = x.partialObject({
  type: x.number(),
  name: x.string(),
  channel: x.number(),
  mode: x.number(),
  mode2: x.number(),
  rot: x.number(),
  col: SwRgbSchema,
  min: TextValuePairSchema,
  max: TextValuePairSchema,
  col_extra: ColExtraSchema,
});

/**
 * Represents `<display_1>`, `<display_2>`, `<display_3>`, or `<display_4>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*>`
 *
 * Parent: {@link ComponentO}
 *
 * Inferred from {@link DisplaySchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link DisplayImmutable} for its parameter type.
 *
 * @see {@link DisplaySchema}
 * @see {@link DisplayImmutable}
 */
export interface Display extends x.Infer<typeof DisplaySchema> {}

/**
 * Represents `<display_1>`, `<display_2>`, `<display_3>`, or `<display_4>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <display_*>`
 *
 * Parent: {@link ComponentOImmutable}
 *
 * Inferred from {@link DisplaySchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Display} instead
 * if mutation is required.
 *
 * @see {@link DisplaySchema}
 * @see {@link Display}
 */
export interface DisplayImmutable extends x.InferImmutable<typeof DisplaySchema> {}

/**
 * Represents `<axis_sensitivity>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <axis_sensitivity>`
 *
 * Parent: {@link ComponentOSchema}
 *
 * @see {@link AxisSensitivity}
 * @see {@link AxisSensitivityImmutable}
 */
export const AxisSensitivitySchema = x.partialObject({
  x: x.number(),
  y: x.number(),
  z: x.number(),
  w: x.number(),
});

/**
 * Represents `<axis_sensitivity>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <axis_sensitivity>`
 *
 * Parent: {@link ComponentO}
 *
 * Inferred from {@link AxisSensitivitySchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link AxisSensitivityImmutable} for its parameter type.
 *
 * @see {@link AxisSensitivitySchema}
 * @see {@link AxisSensitivityImmutable}
 */
export interface AxisSensitivity extends x.Infer<typeof AxisSensitivitySchema> {}

/**
 * Represents `<axis_sensitivity>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o> / <axis_sensitivity>`
 *
 * Parent: {@link ComponentOImmutable}
 *
 * Inferred from {@link AxisSensitivitySchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link AxisSensitivity} instead
 * if mutation is required.
 *
 * @see {@link AxisSensitivitySchema}
 * @see {@link AxisSensitivity}
 */
export interface AxisSensitivityImmutable extends x.InferImmutable<typeof AxisSensitivitySchema> {}

/**
 * Represents `<o>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o>`
 *
 * Parent: {@link ComponentSchema}
 *
 * @see {@link ComponentO}
 * @see {@link ComponentOImmutable}
 */
export const ComponentOSchema = x.partialObject({
  r: x.string(),
  bc: x.string(),
  bc2: x.string(),
  bc3: x.string(),
  ac: x.string(),
  sc: x.string(),
  scale: x.number(),
  spawn_rod: x.boolean(),
  spring_factor: x.number(),
  ai_type: x.number(),
  blade_count: x.number(),
  blade_pitch: x.number(),
  blade_length: x.number(),
  coal_fill: x.number(),
  current_tick: x.number(),
  custom_name: x.string(),
  control_mode_0: x.number(),
  decimal_point_pos: x.number(),
  audio_data: x.string(),
  flare_type: x.number(),
  flare_color: x.number(),
  fluid_type: x.number(),
  fuel_factor: x.number(),
  gc: x.string(),
  gca: x.string(),
  gear_ratio_1: x.number(),
  gear_ratio_2: x.number(),
  grip_factor: x.number(),
  hold_duration: x.number(),
  default_state: x.boolean(),
  input_ch_1: x.number(),
  input_ch_2: x.number(),
  input_ch_3: x.number(),
  interactive_default_state: x.boolean(),
  fluid_filter: x.number(),
  fluid_fill: x.number(),
  m_fov_x: x.number(),
  m_fov_y: x.number(),
  m_pitch_angle: x.number(),
  m_sweep_mode: x.number(),
  max_force_scalar: x.number(),
  max_force_scale: x.number(),
  muzzle_velocity: x.number(),
  gear_ratio: x.number(),
  input_velocity: x.number(),
  ordinance_type: x.number(),
  property_ammo_damage: x.number(),
  property_ammo_type: x.number(),
  rps_limit: x.number(),
  sensitivity: x.number(),
  spawn_charge: x.number(),
  stiffness_factor: x.number(),
  damping_factor: x.number(),
  throttle_min: x.number(),
  throttle_max: x.number(),
  timer_scalar_1: x.number(),
  timer_scalar_2: x.number(),
  tire_type: x.number(),
  trigger: x.number(),
  trigger_label: x.string(),
  func_type: x.number(),
  hotkey_0: x.number(),
  hotkey_0_label: x.string(),
  hotkey_1: x.number(),
  hotkey_1_label: x.string(),
  hotkey_2: x.number(),
  hotkey_2_label: x.string(),
  hotkey_3: x.number(),
  hotkey_3_label: x.string(),
  hotkey_4: x.number(),
  hotkey_4_label: x.string(),
  hotkey_5: x.number(),
  hotkey_5_label: x.string(),
  control_mode_0_label: x.string(),
  control_mode_1: x.number(),
  control_mode_1_label: x.string(),
  control_mode_2: x.number(),
  control_mode_2_label: x.string(),
  control_mode_3: x.number(),
  control_mode_3_label: x.string(),
  is_infrared: x.boolean(),
  lss_mode: x.number(),
  property_text: x.string(),
  radar_fov: x.number(),
  sensor_radius: x.number(),
  sensor_type: x.number(),
  sensor_mode: x.number(),
  val_1_name: x.string(),
  val_2_name: x.string(),
  volume: x.number(),
  pitch: x.number(),
  wheel_size: x.number(),
  double_wheel: x.boolean(),
  tyre_pressure: x.number(),
  microprocessor_definition: MicrocontrollerSchema,
  vp: SwVec3Schema,
  logic_slots: x.list("slot", LogicSlotSchema),
  delta_damping: SwVec3Schema,
  display_1: DisplaySchema,
  display_2: DisplaySchema,
  display_3: DisplaySchema,
  display_4: DisplaySchema,
  impact_sensor_threshold: TextValuePairSchema,
  m_sweep_limit: TextValuePairSchema,
  m_sweep_speed: TextValuePairSchema,
  min_value: TextValuePairSchema,
  max_value: TextValuePairSchema,
  property_output_float_val: TextValuePairSchema,
  min_threshold: TextValuePairSchema,
  max_threshold: TextValuePairSchema,
  pid_controller_ki: TextValuePairSchema,
  pid_controller_kp: TextValuePairSchema,
  pid_controller_kd: TextValuePairSchema,
  pid_controller_max_error: TextValuePairSchema,
  exp: TextValuePairSchema,
  min_lever_value: TextValuePairSchema,
  max_lever_value: TextValuePairSchema,
  starting_lever_value: TextValuePairSchema,
  trim_x_display: TextValuePairSchema,
  trim_y_display: TextValuePairSchema,
  trim_z_display: TextValuePairSchema,
  trim_w_display: TextValuePairSchema,
  axis_sensitivity: AxisSensitivitySchema,
});

/**
 * Represents `<o>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o>`
 *
 * Parent: {@link ComponentSchema}
 *
 * Inferred from {@link ComponentOSchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentOImmutable} for its parameter type.
 *
 * @see {@link ComponentOSchema}
 * @see {@link ComponentOImmutable}
 */
export interface ComponentO extends x.Infer<typeof ComponentOSchema> {}

/**
 * Represents `<o>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c> / <o>`
 *
 * Parent: {@link ComponentImmutable}
 *
 * Inferred from {@link ComponentOSchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link ComponentO} instead
 * if mutation is required.
 *
 * @see {@link ComponentOSchema}
 * @see {@link ComponentO}
 */
export interface ComponentOImmutable extends x.InferImmutable<typeof ComponentOSchema> {}

/**
 * Represents `<c>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c>`
 *
 * Parent: {@link BodySchema}
 *
 * @see {@link Component}
 * @see {@link ComponentImmutable}
 */
export const ComponentSchema = x.partialObject({
  d: x.string(),
  t: x.number(),
  o: ComponentOSchema,
});

/**
 * Represents `<c>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c>`
 *
 * Parent: {@link Body}
 *
 * Inferred from {@link ComponentSchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentImmutable} for its parameter type.
 *
 * @see {@link ComponentSchema}
 * @see {@link ComponentImmutable}
 */
export interface Component extends x.Infer<typeof ComponentSchema> {}

/**
 * Represents `<c>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body> / <components> / <c>`
 *
 * Parent: {@link BodyImmutable}
 *
 * Inferred from {@link ComponentSchema} and made deeply immutable.
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
 * Represents `<body>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body>`
 *
 * Parent: {@link VehicleSchema}
 *
 * @see {@link Body}
 * @see {@link BodyImmutable}
 */
export const BodySchema = x.partialObject({
  unique_id: x.number(),
  components: x.list("c", ComponentSchema),
});

/**
 * Represents `<body>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body>`
 *
 * Parent: {@link Vehicle}
 *
 * Inferred from {@link BodySchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link BodyImmutable} for its parameter type.
 *
 * @see {@link BodySchema}
 * @see {@link BodyImmutable}
 */
export interface Body extends x.Infer<typeof BodySchema> {}

/**
 * Represents `<body>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <bodies> / <body>`
 *
 * Parent: {@link VehicleImmutable}
 *
 * Inferred from {@link BodySchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Body} instead
 * if mutation is required.
 *
 * @see {@link BodySchema}
 * @see {@link Body}
 */
export interface BodyImmutable extends x.InferImmutable<typeof BodySchema> {}

/**
 * Represents `<logic_node_link>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <logic_node_links> / <logic_node_link>`
 *
 * Parent: {@link VehicleSchema}
 *
 * @see {@link LogicNodeLink}
 * @see {@link LogicNodeLinkImmutable}
 */
export const LogicNodeLinkSchema = x.partialObject({
  type: x.number(),
  voxel_pos_0: SwVec3Schema,
  voxel_pos_1: SwVec3Schema,
});

/**
 * Represents `<logic_node_link>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <logic_node_links> / <logic_node_link>`
 *
 * Parent: {@link Vehicle}
 *
 * Inferred from {@link LogicNodeLinkSchema}.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link LogicNodeLinkImmutable} for its parameter type.
 *
 * @see {@link LogicNodeLinkSchema}
 * @see {@link LogicNodeLinkImmutable}
 */
export interface LogicNodeLink extends x.Infer<typeof LogicNodeLinkSchema> {}

/**
 * Represents `<logic_node_link>` element in Stormworks vehicle data.
 *
 * XML location: `<vehicle> / <logic_node_links> / <logic_node_link>`
 *
 * Parent: {@link VehicleImmutable}
 *
 * Inferred from {@link LogicNodeLinkSchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link LogicNodeLink} instead
 * if mutation is required.
 *
 * @see {@link LogicNodeLinkSchema}
 * @see {@link LogicNodeLink}
 */
export interface LogicNodeLinkImmutable extends x.InferImmutable<typeof LogicNodeLinkSchema> {}

/**
 * Represents root `<vehicle>` element in Stormworks vehicle data.
 *
 * @see {@link Vehicle}
 * @see {@link VehicleImmutable}
 */
export const VehicleSchema = x.partialObject({
  data_version: x.number(),
  is_modded: x.boolean(),
  is_static: x.boolean(),
  bodies_id: x.number(),
  editor_placement_offset: SwVec3Schema,
  authors: x.list("author", AuthorSchema),
  bodies: x.list("body", BodySchema),
  logic_node_links: x.list("logic_node_link", LogicNodeLinkSchema),
});

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
export interface Vehicle extends x.Infer<typeof VehicleSchema> {}

/**
 * Represents root `<vehicle>` element in Stormworks vehicle data.
 *
 * Inferred from {@link VehicleSchema} and made deeply immutable.
 *
 * This is the recommended type for function parameters when the implementation
 * only reads the object and does not modify it. Use {@link Vehicle} instead
 * if mutation is required.
 *
 * @see {@link VehicleSchema}
 * @see {@link Vehicle}
 */
export interface VehicleImmutable extends x.InferImmutable<typeof VehicleSchema> {}
