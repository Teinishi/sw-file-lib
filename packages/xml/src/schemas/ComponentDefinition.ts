/**
 * Schemas and types for Stormworks component definition XML data.
 *
 * The schema and types for root `<definition>` element are re-exported at `'@sw-file-lib/xml'`, see {@link ComponentDefinitionSchema}, {@link ComponentDefinition}, and {@link ComponentDefinitionImmutable}.
 *
 * @packageDocumentation
 */

import { SwMat3Schema, SwVec3Schema } from ".";
import * as x from "../xml-schema";

/**
 * Represents `<sfx_layer>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <sfx_datas> / <sfx_data> / <sfx_layers> / <sfx_layer>`
 *
 * Parent: {@link SfxDataSchema}
 *
 * @see {@link SfxLayer}
 * @see {@link SfxLayerImmutable}
 */
export const SfxLayerSchema = x.partialObject({
  sfx_filename_start: x.string(),
  sfx_filename_loop: x.string(),
  sfx_filename_end: x.string(),
  sfx_gain: x.number(),
  sfx_loop_start_time: x.number(),
  sfx_loop_blend_duration: x.number(),
  sfx_volume_fade_speed: x.number(),
  sfx_pitch_fade_speed: x.number(),
});

/**
 * Represents `<sfx_layer>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <sfx_datas> / <sfx_data> / <sfx_layers> / <sfx_layer>`
 *
 * Parent: {@link SfxData}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link SfxLayerImmutable} for its parameter type.
 *
 * @see {@link SfxLayerSchema}
 * @see {@link SfxLayerImmutable}
 */
export interface SfxLayer extends x.Infer<typeof SfxLayerSchema> {}

/**
 * Represents `<sfx_layer>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <sfx_datas> / <sfx_data> / <sfx_layers> / <sfx_layer>`
 *
 * Parent: {@link SfxDataImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link SfxLayer} instead
 * if mutation is required.
 *
 * @see {@link SfxLayerSchema}
 * @see {@link SfxLayer}
 */
export interface SfxLayerImmutable extends x.InferImmutable<typeof SfxLayerSchema> {}

/**
 * Represents `<sfx_data>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <sfx_datas> / <sfx_data>`
 *
 * Parent: {@link ComponentDefinitionSchema}
 *
 * @see {@link SfxData}
 * @see {@link SfxDataImmutable}
 */
export const SfxDataSchema = x.partialObject({
  sfx_name: x.string(),
  sfx_range_inner: x.number(),
  sfx_range_outer: x.number(),
  sfx_priority: x.number(),
  sfx_is_underwater_affected: x.boolean(),
  sfx_layers: x.list("sfx_layer", SfxLayerSchema),
});

/**
 * Represents `<sfx_data>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <sfx_datas> / <sfx_data>`
 *
 * Parent: {@link ComponentDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link SfxDataImmutable} for its parameter type.
 *
 * @see {@link SfxDataSchema}
 * @see {@link SfxDataImmutable}
 */
export interface SfxData extends x.Infer<typeof SfxDataSchema> {}

/**
 * Represents `<sfx_data>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <sfx_datas> / <sfx_data>`
 *
 * Parent: {@link ComponentDefinitionImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link SfxData} instead
 * if mutation is required.
 *
 * @see {@link SfxDataSchema}
 * @see {@link SfxData}
 */
export interface SfxDataImmutable extends x.InferImmutable<typeof SfxDataSchema> {}

/**
 * Represents `<surface>` elements in Stormworks component definition data.
 *
 * XML location:
 * - `<definition> / <surfaces> / <surface>`
 * - `<definition> / <buoyancy_surfaces> / <surface>`
 *
 * Parent: {@link ComponentDefinitionSchema}
 *
 * @see {@link Surface}
 * @see {@link SurfaceImmutable}
 */
export const SurfaceSchema = x.partialObject({
  orientation: x.number(),
  rotation: x.number(),
  shape: x.number(),
  trans_type: x.number(),
  flags: x.number(),
  is_reverse_normals: x.boolean(),
  is_two_sided: x.boolean(),
  position: SwVec3Schema,
});

/**
 * Represents `<surface>` elements in Stormworks component definition data.
 *
 * XML location:
 * - `<definition> / <surfaces> / <surface>`
 * - `<definition> / <buoyancy_surfaces> / <surface>`
 *
 * Parent: {@link ComponentDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link SurfaceImmutable} for its parameter type.
 *
 * @see {@link SurfaceSchema}
 * @see {@link SurfaceImmutable}
 */
export interface Surface extends x.Infer<typeof SurfaceSchema> {}

/**
 * Represents `<surface>` elements in Stormworks component definition data.
 *
 * XML location:
 * - `<definition> / <surfaces> / <surface>`
 * - `<definition> / <buoyancy_surfaces> / <surface>`
 *
 * Parent: {@link ComponentDefinitionImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link Surface} instead
 * if mutation is required.
 *
 * @see {@link SurfaceSchema}
 * @see {@link Surface}
 */
export interface SurfaceImmutable extends x.InferImmutable<typeof SurfaceSchema> {}

/**
 * Represents `<logic_node>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <logic_nodes> / <logic_node>`
 *
 * Parent: {@link ComponentDefinitionSchema}
 *
 * @see {@link LogicNode}
 * @see {@link LogicNodeImmutable}
 */
export const LogicNodeSchema = x.partialObject({
  orientation: x.number(),
  label: x.string(),
  mode: x.number(),
  type: x.number(),
  description: x.string(),
  flags: x.number(),
  position: SwVec3Schema,
});

/**
 * Represents `<logic_node>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <logic_nodes> / <logic_node>`
 *
 * Parent: {@link ComponentDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link LogicNodeImmutable} for its parameter type.
 *
 * @see {@link LogicNodeSchema}
 * @see {@link LogicNodeImmutable}
 */
export interface LogicNode extends x.Infer<typeof LogicNodeSchema> {}

/**
 * Represents `<logic_node>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <logic_nodes> / <logic_node>`
 *
 * Parent: {@link ComponentDefinitionImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link LogicNode} instead
 * if mutation is required.
 *
 * @see {@link LogicNodeSchema}
 * @see {@link LogicNode}
 */
export interface LogicNodeImmutable extends x.InferImmutable<typeof LogicNodeSchema> {}

/**
 * Represents `<coupling>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <couplings> / <coupling>`
 *
 * Parent: {@link ComponentDefinitionSchema}
 *
 * @see {@link Coupling}
 * @see {@link CouplingImmutable}
 */
export const CouplingSchema = x.partialObject({
  orientation: x.number(),
  alignment: x.number(),
  coupling_type: x.string(),
  coupling_name: x.string(),
  coupling_gender: x.number(),
  alignment_required: x.boolean(),
  allow_bipolar_alignment: x.boolean(),
  position: SwVec3Schema,
});

/**
 * Represents `<coupling>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <couplings> / <coupling>`
 *
 * Parent: {@link ComponentDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link CouplingImmutable} for its parameter type.
 *
 * @see {@link CouplingSchema}
 * @see {@link CouplingImmutable}
 */
export interface Coupling extends x.Infer<typeof CouplingSchema> {}

/**
 * Represents `<coupling>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <couplings> / <coupling>`
 *
 * Parent: {@link ComponentDefinitionImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link Coupling} instead
 * if mutation is required.
 *
 * @see {@link CouplingSchema}
 * @see {@link Coupling}
 */
export interface CouplingImmutable extends x.InferImmutable<typeof CouplingSchema> {}

/**
 * Represents `<voxel>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <voxels> / <voxel>`
 *
 * Parent: {@link ComponentDefinitionSchema}
 *
 * @see {@link Voxel}
 * @see {@link VoxelImmutable}
 */
export const VoxelSchema = x.partialObject({
  flags: x.number(),
  physics_shape: x.number(),
  buoy_pipes: x.number(),
  position: SwVec3Schema,
  physics_shape_rotation: SwMat3Schema,
});

/**
 * Represents `<voxel>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <voxels> / <voxel>`
 *
 * Parent: {@link ComponentDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link VoxelImmutable} for its parameter type.
 *
 * @see {@link VoxelSchema}
 * @see {@link VoxelImmutable}
 */
export interface Voxel extends x.Infer<typeof VoxelSchema> {}

/**
 * Represents `<voxel>` elements in Stormworks component definition data.
 *
 * XML location: `<definition> / <voxels> / <voxel>`
 *
 * Parent: {@link ComponentDefinitionImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link Voxel} instead
 * if mutation is required.
 *
 * @see {@link VoxelSchema}
 * @see {@link Voxel}
 */
export interface VoxelImmutable extends x.InferImmutable<typeof VoxelSchema> {}

/**
 * Represents `<j>` elements in Stormworks component definition data.
 *
 * XML location:
 * - `<definition> / <jet_engine_connections_prev> / <j>`
 * - `<definition> / <jet_engine_connections_next> / <j>`
 *
 * Parent: {@link ComponentDefinitionSchema}
 *
 * @see {@link JetEngineConnection}
 * @see {@link JetEngineConnectionImmutable}
 */
export const JetEngineConnectionSchema = x.partialObject({
  pos: SwVec3Schema,
  normal: SwVec3Schema,
});

/**
 * Represents `<j>` elements in Stormworks component definition data.
 *
 * XML location:
 * - `<definition> / <jet_engine_connections_prev> / <j>`
 * - `<definition> / <jet_engine_connections_next> / <j>`
 *
 * Parent: {@link ComponentDefinition}
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link JetEngineConnectionImmutable} for its parameter type.
 *
 * @see {@link JetEngineConnectionSchema}
 * @see {@link JetEngineConnectionImmutable}
 */
export interface JetEngineConnection extends x.Infer<typeof JetEngineConnectionSchema> {}

/**
 * Represents `<j>` elements in Stormworks component definition data.
 *
 * XML location:
 * - `<definition> / <jet_engine_connections_prev> / <j>`
 * - `<definition> / <jet_engine_connections_next> / <j>`
 *
 * Parent: {@link ComponentDefinitionImmutable}
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link JetEngineConnection} instead
 * if mutation is required.
 *
 * @see {@link JetEngineConnectionSchema}
 * @see {@link JetEngineConnection}
 */
export interface JetEngineConnectionImmutable extends x.InferImmutable<
  typeof JetEngineConnectionSchema
> {}

/**
 * Represents root `<definition>` elements in Stormworks component definition data.
 *
 * @see {@link ComponentDefinition}
 * @see {@link ComponentDefinitionImmutable}
 */
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
  sfx_datas: x.list("sfx_data", SfxDataSchema),
  surfaces: x.list("surface", SurfaceSchema),
  buoyancy_surfaces: x.list("surface", SurfaceSchema),
  logic_nodes: x.list("logic_node", LogicNodeSchema),
  couplings: x.list("coupling", CouplingSchema),
  voxels: x.list("voxel", VoxelSchema),
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
  jet_engine_connections_prev: x.list("j", JetEngineConnectionSchema),
  jet_engine_connections_next: x.list("j", JetEngineConnectionSchema),
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

/**
 * Represents root `<definition>` elements in Stormworks component definition data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentDefinitionImmutable} for its parameter type.
 *
 * @see {@link ComponentDefinitionSchema}
 * @see {@link ComponentDefinitionImmutable}
 */
export interface ComponentDefinition extends x.Infer<typeof ComponentDefinitionSchema> {}

/**
 * Represents root `<definition>` elements in Stormworks component definition data.
 *
 * This is the recommended type for function parameters when the implementation
 * does not need to modify the value. Use {@link ComponentDefinition} instead
 * if mutation is required.
 *
 * @see {@link ComponentDefinitionSchema}
 * @see {@link ComponentDefinition}
 */
export interface ComponentDefinitionImmutable extends x.InferImmutable<
  typeof ComponentDefinitionSchema
> {}
