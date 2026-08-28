import { SwRgbSchema, SwVec3Schema } from ".";
import * as x from "../xml-schema";
import { MicrocontrollerSchema, TextValuePairSchema } from "./Microcontroller";

export const AuthorSchema = x.partialObject({
  steam_id: x.number(),
  username: x.string(),
});
export interface Author extends x.Infer<typeof AuthorSchema> {}
export interface AuthorImmutable extends x.InferImmutable<typeof AuthorSchema> {}

export const LogicSlotSchema = x.partialObject({
  editor_connected: x.number(),
  value: x.union([x.boolean(), x.number(), x.object({})]),
});
export interface LogicSlot extends x.Infer<typeof LogicSlotSchema> {}
export interface LogicSlotImmutable extends x.InferImmutable<typeof LogicSlotSchema> {}

export const ColExtraSchema = x.metalist(
  "c",
  x.partialObject({
    size: x.number(),
  }),
  x.partialObject({
    value: SwRgbSchema,
  }),
);
export interface ColExtra extends x.Infer<typeof ColExtraSchema> {}
export interface ColExtraImmutable extends x.InferImmutable<typeof ColExtraSchema> {}

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
export interface Display extends x.Infer<typeof DisplaySchema> {}
export interface DisplayImmutable extends x.InferImmutable<typeof DisplaySchema> {}

export const AxisSensitivitySchema = x.partialObject({
  x: x.number(),
  y: x.number(),
  z: x.number(),
  w: x.number(),
});
export interface AxisSensitivity extends x.Infer<typeof AxisSensitivitySchema> {}
export interface AxisSensitivityImmutable extends x.InferImmutable<typeof AxisSensitivitySchema> {}

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
export interface ComponentO extends x.Infer<typeof ComponentOSchema> {}
export interface ComponentOImmutable extends x.InferImmutable<typeof ComponentOSchema> {}

export const ComponentSchema = x.partialObject({
  d: x.string(),
  t: x.number(),
  o: ComponentOSchema,
});
export interface Component extends x.Infer<typeof ComponentSchema> {}
export interface ComponentImmutable extends x.InferImmutable<typeof ComponentSchema> {}

export const BodySchema = x.partialObject({
  unique_id: x.number(),
  components: x.list("c", ComponentSchema),
});
export interface Body extends x.Infer<typeof BodySchema> {}
export interface BodyImmutable extends x.InferImmutable<typeof BodySchema> {}

export const VehicelLogicNodeLinkSchema = x.partialObject({
  type: x.number(),
  voxel_pos_0: SwVec3Schema,
  voxel_pos_1: SwVec3Schema,
});
export interface VehicelLogicNodeLink extends x.Infer<typeof VehicelLogicNodeLinkSchema> {}
export interface VehicelLogicNodeLinkImmutable extends x.InferImmutable<typeof VehicelLogicNodeLinkSchema> {}

export const VehicleSchema = x.partialObject({
  data_version: x.number(),
  is_modded: x.boolean(),
  is_static: x.boolean(),
  bodies_id: x.number(),
  editor_placement_offset: SwVec3Schema,
  authors: x.list("author", AuthorSchema),
  bodies: x.list("body", BodySchema),
  logic_node_links: x.list("logic_node_link", VehicelLogicNodeLinkSchema),
});
export interface Vehicle extends x.Infer<typeof VehicleSchema> {}
export interface VehicleImmutable extends x.InferImmutable<typeof VehicleSchema> {}
