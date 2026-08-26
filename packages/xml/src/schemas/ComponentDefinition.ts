import { SwMat3Schema, SwVec3Schema } from ".";
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
export type ComponentDefinitionSfxLayer = x.Infer<typeof ComponentDefinitionSfxLayerSchema>;
export type ComponentDefinitionSfxLayerImmutable = x.InferImmutable<
  typeof ComponentDefinitionSfxLayerSchema
>;

export const ComponentDefinitionSfxDataSchema = x.partialObject({
  sfx_name: x.string(),
  sfx_range_inner: x.number(),
  sfx_range_outer: x.number(),
  sfx_priority: x.number(),
  sfx_is_underwater_affected: x.boolean(),
  sfx_layers: x.list("sfx_layer", ComponentDefinitionSfxLayerSchema),
});
export type ComponentDefinitionSfxData = x.Infer<typeof ComponentDefinitionSfxDataSchema>;
export type ComponentDefinitionSfxDataImmutable = x.InferImmutable<
  typeof ComponentDefinitionSfxDataSchema
>;

export const ComponentDefinitionSurfaceSchema = x.partialObject({
  orientation: x.number(),
  rotation: x.number(),
  shape: x.number(),
  trans_type: x.number(),
  flags: x.number(),
  is_reverse_normals: x.boolean(),
  is_two_sided: x.boolean(),
  position: SwVec3Schema,
});
export type ComponentDefinitionSurface = x.Infer<typeof ComponentDefinitionSurfaceSchema>;
export type ComponentDefinitionSurfaceImmutable = x.InferImmutable<
  typeof ComponentDefinitionSurfaceSchema
>;

export const ComponentDefinitionLogicNodeSchema = x.partialObject({
  orientation: x.number(),
  label: x.string(),
  mode: x.number(),
  type: x.number(),
  description: x.string(),
  flags: x.number(),
  position: SwVec3Schema,
});
export type ComponentDefinitionLogicNode = x.Infer<typeof ComponentDefinitionLogicNodeSchema>;
export type ComponentDefinitionLogicNodeImmutable = x.InferImmutable<
  typeof ComponentDefinitionLogicNodeSchema
>;

export const ComponentDefinitionCouplingSchema = x.partialObject({
  orientation: x.number(),
  alignment: x.number(),
  coupling_type: x.string(),
  coupling_name: x.string(),
  coupling_gender: x.number(),
  alignment_required: x.boolean(),
  allow_bipolar_alignment: x.boolean(),
  position: SwVec3Schema,
});
export type ComponentDefinitionCoupling = x.Infer<typeof ComponentDefinitionCouplingSchema>;
export type ComponentDefinitionCouplingImmutable = x.InferImmutable<
  typeof ComponentDefinitionCouplingSchema
>;

export const ComponentDefinitionVoxelSchema = x.partialObject({
  flags: x.number(),
  physics_shape: x.number(),
  buoy_pipes: x.number(),
  position: SwVec3Schema,
  physics_shape_rotation: SwMat3Schema,
});
export type ComponentDefinitionVoxel = x.Infer<typeof ComponentDefinitionVoxelSchema>;
export type ComponentDefinitionVoxelImmutable = x.InferImmutable<
  typeof ComponentDefinitionVoxelSchema
>;

export const ComponentDefinitionJetEngineConnectionSchema = x.partialObject({
  pos: SwVec3Schema,
  normal: SwVec3Schema,
});
export type ComponentDefinitionJetEngineConnection = x.Infer<
  typeof ComponentDefinitionJetEngineConnectionSchema
>;
export type ComponentDefinitionJetEngineConnectionImmutable = x.InferImmutable<
  typeof ComponentDefinitionJetEngineConnectionSchema
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
  voxel_min: SwVec3Schema,
  voxel_max: SwVec3Schema,
  voxel_physics_min: SwVec3Schema,
  voxel_physics_max: SwVec3Schema,
  bb_physics_min: SwVec3Schema,
  bb_physics_max: SwVec3Schema,
  compartment_sample_pos: SwVec3Schema,
  constraint_pos_parent: SwVec3Schema,
  constraint_pos_child: SwVec3Schema,
  voxel_location_child: SwVec3Schema,
  seat_offset: SwVec3Schema,
  seat_front: SwVec3Schema,
  seat_up: SwVec3Schema,
  seat_camera: SwVec3Schema,
  seat_render: SwVec3Schema,
  force_dir: SwVec3Schema,
  light_position: SwVec3Schema,
  light_color: SwVec3Schema,
  light_forward: SwVec3Schema,
  door_size: SwVec3Schema,
  door_normal: SwVec3Schema,
  door_side: SwVec3Schema,
  door_up: SwVec3Schema,
  door_base_pos: SwVec3Schema,
  dynamic_body_position: SwVec3Schema,
  dynamic_rotation_axes: SwVec3Schema,
  dynamic_side_axis: SwVec3Schema,
  magnet_offset: SwVec3Schema,
  connector_axis: SwVec3Schema,
  connector_up: SwVec3Schema,
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
  seat_exit_position: SwVec3Schema,
  particle_direction: SwVec3Schema,
  particle_offset: SwVec3Schema,
  particle_bounds: SwVec3Schema,
  weapon_breech_position: SwVec3Schema,
  weapon_breech_normal: SwVec3Schema,
  weapon_cart_position: SwVec3Schema,
  weapon_cart_velocity: SwVec3Schema,
  rope_hook_offset: SwVec3Schema,
});
export type ComponentDefinition = x.Infer<typeof ComponentDefinitionSchema>;
export type ComponentDefinitionImmutable = x.InferImmutable<typeof ComponentDefinitionSchema>;

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
