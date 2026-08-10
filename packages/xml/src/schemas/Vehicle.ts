import { parseSwXml } from "../parser";
import type { SchemaSafeParseResult } from "../schemaLib";
import * as x from "../schemaLib";
import type { ParseOptions } from "../types";
import { MicrocontrollerSchema, TextValuePairSchema } from "./Microcontroller";

export const VehicleAuthorSchema = x.partialObject({
  steam_id: x.number(),
  username: x.string(),
});
export type VehicleAuthor = x.InferShape<typeof VehicleAuthorSchema.shape>;

export const VehicleComponentLogicSlotSchema = x.partialObject({
  editor_connected: x.number(),
  value: x.union([x.boolean(), x.number(), x.object({})]),
});
export type VehicleComponentLogicSlot = x.InferShape<typeof VehicleComponentLogicSlotSchema.shape>;

export const VehicleComponentDisplaySchema = x.partialObject({
  type: x.number(),
  name: x.string(),
  channel: x.number(),
  mode: x.number(),
  mode2: x.number(),
  rot: x.number(),
  col: x.rgb(),
  min: TextValuePairSchema,
  max: TextValuePairSchema,
  col_extra: x.metalist(
    "c",
    x.partialObject({
      size: x.number(),
    }),
    x.partialObject({
      value: x.rgb(),
    }),
  ),
});
export type VehicleComponentDisplay = x.InferShape<typeof VehicleComponentDisplaySchema.shape>;

export const VehicleComponentSchema = x.partialObject({
  d: x.string(),
  t: x.number(),
  o: x.partialObject({
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
    vp: x.vec3(),
    logic_slots: x.list("slot", VehicleComponentLogicSlotSchema),
    delta_damping: x.vec3(),
    display_1: VehicleComponentDisplaySchema,
    display_2: VehicleComponentDisplaySchema,
    display_3: VehicleComponentDisplaySchema,
    display_4: VehicleComponentDisplaySchema,
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
    axis_sensitivity: x.partialObject({
      x: x.number(),
      y: x.number(),
      z: x.number(),
      w: x.number(),
    }),
  }),
});
export type VehicleComponent = x.InferShape<typeof VehicleComponentSchema.shape>;

export const VehicleBodySchema = x.partialObject({
  unique_id: x.number(),
  components: x.list("c", VehicleComponentSchema),
});
export type VehicleBody = x.InferShape<typeof VehicleBodySchema.shape>;

export const VehicelLogicNodeLinkSchema = x.partialObject({
  type: x.number(),
  voxel_pos_0: x.vec3(),
  voxel_pos_1: x.vec3(),
});
export type VehicelLogicNodeLink = x.InferShape<typeof VehicelLogicNodeLinkSchema.shape>;

export const VehicleSchema = x.partialObject({
  data_version: x.number(),
  is_modded: x.boolean(),
  is_static: x.boolean(),
  bodies_id: x.number(),
  editor_placement_offset: x.vec3(),
  authors: x.list("author", VehicleAuthorSchema),
  bodies: x.list("body", VehicleBodySchema),
  logic_node_links: x.list("logic_node_link", VehicelLogicNodeLinkSchema),
});
export type Vehicle = x.InferShape<typeof VehicleSchema.shape>;

/**
 * Parses a Stormworks vehicle XML document.
 *
 * @throws {@link import("../schemaLib").SwXmlSchemaError} when the XML content
 * does not match the vehicle schema.
 */
export function parseVehicleXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): Vehicle {
  const tree = parseSwXml(input);
  return VehicleSchema.parseTree(tree, "vehicle", options);
}

/**
 * Parses a Stormworks vehicle XML document without throwing schema errors.
 */
export function safeParseVehicleXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): SchemaSafeParseResult<Vehicle> {
  const tree = parseSwXml(input);
  return VehicleSchema.safeParseTree(tree, "vehicle", options);
}
