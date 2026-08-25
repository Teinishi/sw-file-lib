import { parseSwXml } from "../parser";
import type { ParseOptions } from "../types";
import * as x from "../xml-schema";

export const ComponentDefinitionSfxLayerSchema = x.partialObject({
  sfx_filename_start: x.string(),
  sfx_filename_loop: x.string(),
  sfx_filename_end: x.string(),
  sfx_gain: x.number(),
  sfx_loop_start_time: x.number(),
  sfx_loop_blend_duration: x.number(),
  sfx_volume_fade_speed: x.number(),
  sfx_pitch_fade_speed: x.number(),
});
export type ComponentDefinitionSfxLayer = x.InferShape<
  typeof ComponentDefinitionSfxLayerSchema.shape
>;
export type ComponentDefinitionSfxLayerImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionSfxLayerSchema.shape
>;

export const ComponentDefinitionSfxDataSchema = x.partialObject({
  sfx_name: x.string(),
  sfx_range_inner: x.number(),
  sfx_range_outer: x.number(),
  sfx_priority: x.number(),
  sfx_is_underwater_affected: x.boolean(),
  sfx_layers: x.list("sfx_layer", ComponentDefinitionSfxLayerSchema),
});
export type ComponentDefinitionSfxData = x.InferShape<
  typeof ComponentDefinitionSfxDataSchema.shape
>;
export type ComponentDefinitionSfxDataImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionSfxDataSchema.shape
>;

export const ComponentDefinitionSurfaceSchema = x.partialObject({
  orientation: x.number(),
  rotation: x.number(),
  shape: x.number(),
  trans_type: x.number(),
  flags: x.number(),
  is_reverse_normals: x.boolean(),
  is_two_sided: x.boolean(),
  position: x.vec3(),
});
export type ComponentDefinitionSurface = x.InferShape<
  typeof ComponentDefinitionSurfaceSchema.shape
>;
export type ComponentDefinitionSurfaceImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionSurfaceSchema.shape
>;

export const ComponentDefinitionLogicNodeSchema = x.partialObject({
  orientation: x.number(),
  label: x.string(),
  mode: x.number(),
  type: x.number(),
  description: x.string(),
  flags: x.number(),
  position: x.vec3(),
});
export type ComponentDefinitionLogicNode = x.InferShape<
  typeof ComponentDefinitionLogicNodeSchema.shape
>;
export type ComponentDefinitionLogicNodeImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionLogicNodeSchema.shape
>;

export const ComponentDefinitionCouplingSchema = x.partialObject({
  orientation: x.number(),
  alignment: x.number(),
  coupling_type: x.string(),
  coupling_name: x.string(),
  coupling_gender: x.number(),
  alignment_required: x.boolean(),
  allow_bipolar_alignment: x.boolean(),
  position: x.vec3(),
});
export type ComponentDefinitionCoupling = x.InferShape<
  typeof ComponentDefinitionCouplingSchema.shape
>;
export type ComponentDefinitionCouplingImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionCouplingSchema.shape
>;

export const ComponentDefinitionVoxelSchema = x.partialObject({
  flags: x.number(),
  physics_shape: x.number(),
  buoy_pipes: x.number(),
  position: x.vec3(),
  physics_shape_rotation: x.mat3(),
});
export type ComponentDefinitionVoxel = x.InferShape<typeof ComponentDefinitionVoxelSchema.shape>;
export type ComponentDefinitionVoxelImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionVoxelSchema.shape
>;

export const ComponentDefinitionJetEngineConnectionSchema = x.partialObject({
  pos: x.vec3(),
  normal: x.vec3(),
});
export type ComponentDefinitionJetEngineConnection = x.InferShape<
  typeof ComponentDefinitionJetEngineConnectionSchema.shape
>;
export type ComponentDefinitionJetEngineConnectionImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionJetEngineConnectionSchema.shape
>;

export const ComponentDefinitionSchema = x.partialObject({
  name: x.string(),
  category: x.number(),
  type: x.number(),
  mass: x.number(),
  value: x.number(),
  flags: x.number(),
  tags: x.string(),
  phys_collision_dampen: x.number(),
  audio_filename_start: x.string(),
  audio_filename_loop: x.string(),
  audio_filename_end: x.string(),
  audio_filename_start_b: x.string(),
  audio_filename_loop_b: x.string(),
  audio_filename_end_b: x.string(),
  audio_gain: x.number(),
  mesh_data_name: x.string(),
  mesh_0_name: x.string(),
  mesh_1_name: x.string(),
  mesh_2_name: x.string(),
  mesh_editor_only_name: x.string(),
  metadata_component_type: x.number(),
  block_type: x.number(),
  child_name: x.string(),
  extender_name: x.string(),
  constraint_type: x.number(),
  constraint_axis: x.number(),
  constraint_range_of_motion: x.number(),
  max_motor_force: x.number(),
  max_motor_speed: x.number(),
  cable_radius: x.number(),
  cable_length: x.number(),
  oil_component_type: x.number(),
  seat_pose: x.number(),
  seat_health_per_sec: x.number(),
  seat_type: x.number(),
  tool_type: x.number(),
  buoy_radius: x.number(),
  buoy_factor: x.number(),
  buoy_force: x.number(),
  force_emitter_max_force: x.number(),
  force_emitter_max_vector: x.number(),
  force_emitter_default_pitch: x.number(),
  force_emitter_blade_height: x.number(),
  force_emitter_rotation_speed: x.number(),
  force_emitter_blade_physics_length: x.number(),
  force_emitter_blade_efficiency: x.number(),
  force_emitter_efficiency: x.number(),
  engine_max_force: x.number(),
  engine_frictionless_force: x.number(),
  trans_conn_type: x.number(),
  trans_type: x.number(),
  wheel_radius: x.number(),
  wheel_wishbone_length: x.number(),
  wheel_suspension_height: x.number(),
  wheel_wishbone_margin: x.number(),
  wheel_suspension_offset: x.number(),
  wheel_wishbone_offset: x.number(),
  wheel_type: x.number(),
  button_type: x.number(),
  light_intensity: x.number(),
  light_range: x.number(),
  light_ies_map: x.string(),
  light_fov: x.number(),
  light_type: x.number(),
  door_lower_limit: x.number(),
  door_upper_limit: x.number(),
  door_flipped: x.boolean(),
  custom_door_type: x.number(),
  door_side_dist: x.number(),
  door_up_dist: x.number(),
  dynamic_min_rotation: x.number(),
  dynamic_max_rotation: x.number(),
  data_logger_component_type: x.number(),
  logic_gate_type: x.number(),
  logic_gate_subtype: x.number(),
  indicator_type: x.number(),
  connector_type: x.number(),
  magnet_force: x.number(),
  gyro_type: x.number(),
  reward_tier: x.number(),
  revision: x.number(),
  rudder_surface_area: x.number(),
  m_pump_pressure: x.number(),
  pump_pressure: x.number(),
  water_component_type: x.number(),
  wheel_width: x.number(),
  torque_component_type: x.number(),
  jet_engine_component_type: x.number(),
  particle_speed: x.number(),
  inventory_class: x.number(),
  inventory_default_item: x.number(),
  inventory_type: x.number(),
  inventory_default_outfit: x.number(),
  electric_type: x.number(),
  electric_charge_capacity: x.number(),
  electric_magnitude: x.number(),
  composite_type: x.number(),
  camera_fov_min: x.number(),
  camera_fov_max: x.number(),
  monitor_border: x.number(),
  monitor_inset: x.number(),
  weapon_type: x.number(),
  weapon_class: x.number(),
  weapon_belt_type: x.number(),
  weapon_ammo_capacity: x.number(),
  weapon_ammo_feed: x.boolean(),
  weapon_barrel_length_voxels: x.number(),
  rx_range: x.number(),
  rx_length: x.number(),
  rocket_type: x.number(),
  radar_range: x.number(),
  radar_speed: x.number(),
  rudder_type: x.number(),
  engine_module_type: x.number(),
  steam_component_type: x.number(),
  steam_component_capacity: x.number(),
  nuclear_component_type: x.number(),
  radar_type: x.number(),
  piston_len: x.number(),
  piston_cam: x.number(),
  sfx_datas: x.list("sfx_data", ComponentDefinitionSfxDataSchema),
  surfaces: x.list("surface", ComponentDefinitionSurfaceSchema),
  buoyancy_surfaces: x.list("surface", ComponentDefinitionSurfaceSchema),
  logic_nodes: x.list("logic_node", ComponentDefinitionLogicNodeSchema),
  couplings: x.list("coupling", ComponentDefinitionCouplingSchema),
  voxels: x.list("voxel", ComponentDefinitionVoxelSchema),
  voxel_min: x.vec3(),
  voxel_max: x.vec3(),
  voxel_physics_min: x.vec3(),
  voxel_physics_max: x.vec3(),
  bb_physics_min: x.vec3(),
  bb_physics_max: x.vec3(),
  compartment_sample_pos: x.vec3(),
  constraint_pos_parent: x.vec3(),
  constraint_pos_child: x.vec3(),
  voxel_location_child: x.vec3(),
  seat_offset: x.vec3(),
  seat_front: x.vec3(),
  seat_up: x.vec3(),
  seat_camera: x.vec3(),
  seat_render: x.vec3(),
  force_dir: x.vec3(),
  light_position: x.vec3(),
  light_color: x.vec3(),
  light_forward: x.vec3(),
  door_size: x.vec3(),
  door_normal: x.vec3(),
  door_side: x.vec3(),
  door_up: x.vec3(),
  door_base_pos: x.vec3(),
  dynamic_body_position: x.vec3(),
  dynamic_rotation_axes: x.vec3(),
  dynamic_side_axis: x.vec3(),
  magnet_offset: x.vec3(),
  connector_axis: x.vec3(),
  connector_up: x.vec3(),
  tooltip_properties: x.partialObject({
    description: x.string(),
    short_description: x.string(),
  }),
  reward_properties: x.partialObject({
    tier: x.number(),
    number_rewarded: x.number(),
  }),
  jet_engine_connections_prev: x.list("j", ComponentDefinitionJetEngineConnectionSchema),
  jet_engine_connections_next: x.list("j", ComponentDefinitionJetEngineConnectionSchema),
  seat_exit_position: x.vec3(),
  particle_direction: x.vec3(),
  particle_offset: x.vec3(),
  particle_bounds: x.vec3(),
  weapon_breech_position: x.vec3(),
  weapon_breech_normal: x.vec3(),
  weapon_cart_position: x.vec3(),
  weapon_cart_velocity: x.vec3(),
  rope_hook_offset: x.vec3(),
});
export type ComponentDefinition = x.InferShape<typeof ComponentDefinitionSchema.shape>;
export type ComponentDefinitionImmutable = x.InferShapeImmutable<
  typeof ComponentDefinitionSchema.shape
>;

/**
 * Parses a Stormworks component definition XML document.
 *
 * @throws {@link SchemaError} when the XML content
 * does not match the component definition schema.
 */
export function parseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): ComponentDefinition {
  const tree = parseSwXml(input);
  return ComponentDefinitionSchema.parse(tree, "definition", options);
}

/**
 * Parses a Stormworks component definition XML document without throwing schema errors.
 */
export function safeParseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): x.Result<ComponentDefinition, x.SchemaError> {
  const tree = parseSwXml(input);
  return ComponentDefinitionSchema.safeParse(tree, "definition", options);
}
