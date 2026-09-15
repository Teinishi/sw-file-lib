import type { XmlMat3, XmlVec3 } from "./common";

export * from "./generated/component-definition-schema";
export * from "./generated/component-definition-immutable";

// @xml-schema
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
export interface SfxLayer {
  sfx_filename_start?: string;
  sfx_filename_loop?: string;
  sfx_filename_end?: string;
  sfx_gain?: number;
  sfx_loop_start_time?: number;
  sfx_loop_blend_duration?: number;
  sfx_volume_fade_speed?: number;
  sfx_pitch_fade_speed?: number;
}

// @xml-schema
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
export interface SfxData {
  sfx_name?: string;
  sfx_range_inner?: number;
  sfx_range_outer?: number;
  sfx_priority?: number;
  sfx_is_underwater_affected?: boolean;
  // @xml-schema list "sfx_layer"
  sfx_layers?: SfxLayer[];
}

// @xml-schema
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
export interface Surface {
  orientation?: number;
  rotation?: number;
  shape?: number;
  trans_type?: number;
  flags?: number;
  is_reverse_normals?: boolean;
  is_two_sided?: boolean;
  position?: XmlVec3;
}

// @xml-schema
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
export interface LogicNode {
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
export interface Coupling {
  orientation?: number;
  alignment?: number;
  coupling_type?: string;
  coupling_name?: string;
  coupling_gender?: number;
  alignment_required?: boolean;
  allow_bipolar_alignment?: boolean;
  position?: XmlVec3;
}

// @xml-schema
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
export interface Voxel {
  flags?: number;
  physics_shape?: number;
  buoy_pipes?: number;
  position?: XmlVec3;
  physics_shape_rotation?: XmlMat3;
}

// @xml-schema
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
export interface JetEngineConnection {
  pos?: XmlVec3;
  normal?: XmlVec3;
}

// @xml-schema
/**
 * Represents root `<definition>` elements in Stormworks component definition data.
 *
 * If your function only reads the value and does not mutate it, prefer
 * {@link ComponentDefinitionImmutable} for its parameter type.
 *
 * @see {@link ComponentDefinitionSchema}
 * @see {@link ComponentDefinitionImmutable}
 */
export interface ComponentDefinition {
  name?: string;
  category?: number;
  type?: number;
  mass?: number;
  value?: number;
  flags?: number;
  tags?: string;
  phys_collision_dampen?: number;
  audio_filename_start?: string;
  audio_filename_loop?: string;
  audio_filename_end?: string;
  audio_filename_start_b?: string;
  audio_filename_loop_b?: string;
  audio_filename_end_b?: string;
  audio_gain?: number;
  mesh_data_name?: string;
  mesh_0_name?: string;
  mesh_1_name?: string;
  mesh_2_name?: string;
  mesh_editor_only_name?: string;
  metadata_component_type?: number;
  block_type?: number;
  child_name?: string;
  extender_name?: string;
  constraint_type?: number;
  constraint_axis?: number;
  constraint_range_of_motion?: number;
  max_motor_force?: number;
  max_motor_speed?: number;
  cable_radius?: number;
  cable_length?: number;
  oil_component_type?: number;
  seat_pose?: number;
  seat_health_per_sec?: number;
  seat_type?: number;
  tool_type?: number;
  buoy_radius?: number;
  buoy_factor?: number;
  buoy_force?: number;
  force_emitter_max_force?: number;
  force_emitter_max_vector?: number;
  force_emitter_default_pitch?: number;
  force_emitter_blade_height?: number;
  force_emitter_rotation_speed?: number;
  force_emitter_blade_physics_length?: number;
  force_emitter_blade_efficiency?: number;
  force_emitter_efficiency?: number;
  engine_max_force?: number;
  engine_frictionless_force?: number;
  trans_conn_type?: number;
  trans_type?: number;
  wheel_radius?: number;
  wheel_wishbone_length?: number;
  wheel_suspension_height?: number;
  wheel_wishbone_margin?: number;
  wheel_suspension_offset?: number;
  wheel_wishbone_offset?: number;
  wheel_type?: number;
  button_type?: number;
  light_intensity?: number;
  light_range?: number;
  light_ies_map?: string;
  light_fov?: number;
  light_type?: number;
  door_lower_limit?: number;
  door_upper_limit?: number;
  door_flipped?: boolean;
  custom_door_type?: number;
  door_side_dist?: number;
  door_up_dist?: number;
  dynamic_min_rotation?: number;
  dynamic_max_rotation?: number;
  data_logger_component_type?: number;
  logic_gate_type?: number;
  logic_gate_subtype?: number;
  indicator_type?: number;
  connector_type?: number;
  magnet_force?: number;
  gyro_type?: number;
  reward_tier?: number;
  revision?: number;
  rudder_surface_area?: number;
  m_pump_pressure?: number;
  pump_pressure?: number;
  water_component_type?: number;
  wheel_width?: number;
  torque_component_type?: number;
  jet_engine_component_type?: number;
  particle_speed?: number;
  inventory_class?: number;
  inventory_default_item?: number;
  inventory_type?: number;
  inventory_default_outfit?: number;
  electric_type?: number;
  electric_charge_capacity?: number;
  electric_magnitude?: number;
  composite_type?: number;
  camera_fov_min?: number;
  camera_fov_max?: number;
  monitor_border?: number;
  monitor_inset?: number;
  weapon_type?: number;
  weapon_class?: number;
  weapon_belt_type?: number;
  weapon_ammo_capacity?: number;
  weapon_ammo_feed?: boolean;
  weapon_barrel_length_voxels?: number;
  rx_range?: number;
  rx_length?: number;
  rocket_type?: number;
  radar_range?: number;
  radar_speed?: number;
  rudder_type?: number;
  engine_module_type?: number;
  steam_component_type?: number;
  steam_component_capacity?: number;
  nuclear_component_type?: number;
  radar_type?: number;
  piston_len?: number;
  piston_cam?: number;
  // @xml-schema list "sfx_data"
  sfx_datas?: SfxData[];
  // @xml-schema list "surface"
  surfaces?: Surface[];
  // @xml-schema list "surface"
  buoyancy_surfaces?: Surface[];
  // @xml-schema list "logic_node"
  logic_nodes?: LogicNode[];
  // @xml-schema list "coupling"
  couplings?: Coupling[];
  // @xml-schema list "voxel"
  voxels?: Voxel[];
  voxel_min?: XmlVec3;
  voxel_max?: XmlVec3;
  voxel_physics_min?: XmlVec3;
  voxel_physics_max?: XmlVec3;
  bb_physics_min?: XmlVec3;
  bb_physics_max?: XmlVec3;
  compartment_sample_pos?: XmlVec3;
  constraint_pos_parent?: XmlVec3;
  constraint_pos_child?: XmlVec3;
  voxel_location_child?: XmlVec3;
  seat_offset?: XmlVec3;
  seat_front?: XmlVec3;
  seat_up?: XmlVec3;
  seat_camera?: XmlVec3;
  seat_render?: XmlVec3;
  force_dir?: XmlVec3;
  light_position?: XmlVec3;
  light_color?: XmlVec3;
  light_forward?: XmlVec3;
  door_size?: XmlVec3;
  door_normal?: XmlVec3;
  door_side?: XmlVec3;
  door_up?: XmlVec3;
  door_base_pos?: XmlVec3;
  dynamic_body_position?: XmlVec3;
  dynamic_rotation_axes?: XmlVec3;
  dynamic_side_axis?: XmlVec3;
  magnet_offset?: XmlVec3;
  connector_axis?: XmlVec3;
  connector_up?: XmlVec3;
  tooltip_properties?: {
    description?: string;
    short_description?: string;
  };
  reward_properties?: {
    tier?: number;
    number_rewarded?: number;
  };
  // @xml-schema list "j"
  jet_engine_connections_prev?: JetEngineConnection[];
  // @xml-schema list "j"
  jet_engine_connections_next?: JetEngineConnection[];
  seat_exit_position?: XmlVec3;
  particle_direction?: XmlVec3;
  particle_offset?: XmlVec3;
  particle_bounds?: XmlVec3;
  weapon_breech_position?: XmlVec3;
  weapon_breech_normal?: XmlVec3;
  weapon_cart_position?: XmlVec3;
  weapon_cart_velocity?: XmlVec3;
  rope_hook_offset?: XmlVec3;
}
