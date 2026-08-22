/**
 * Three-dimensional vector used by Stormworks mesh and physics files.
 *
 * Coordinates are kept in Stormworks' left-handed coordinate system:
 * `x` points right, `y` points up, and positive `z` points forward/away.
 */
export interface MeshVec3 {
  /** X coordinate, positive to the right. */
  x: number;
  /** Y coordinate, positive upward. */
  y: number;
  /** Z coordinate, positive forward in Stormworks space. */
  z: number;
}

/** A per-vertex RGBA color stored as 8-bit channel values. */
export interface MeshColor4 {
  /** Red channel, from `0` to `255`. */
  r: number;
  /** Green channel, from `0` to `255`. */
  g: number;
  /** Blue channel, from `0` to `255`. */
  b: number;
  /** Alpha channel, from `0` to `255`. */
  a: number;
}

/** A render mesh vertex with Stormworks-space position, color, and normal data. */
export interface MeshVertex {
  /** Vertex position in Stormworks mesh coordinates. */
  position: MeshVec3;
  /** Vertex color. */
  color: MeshColor4;
  /** Vertex normal vector in Stormworks' left-handed coordinate system. */
  normal: MeshVec3;
}

/** A material range inside a render mesh index buffer. */
export interface MeshGroup {
  /** Start offset in the parent {@link MeshData.indices} array. */
  indexBufferStart: number;
  /** Number of indices used by this group. */
  indexBufferLength: number;
  /** Material selector: 0 = opaque, 1 = glass, 2 = additive. */
  materialId: number;
  /** Minimum corner of the group bounds. */
  boundsMin: MeshVec3;
  /** Maximum corner of the group bounds. */
  boundsMax: MeshVec3;
  /** Group name stored in the file. */
  name: string;
}

/**
 * Parsed Stormworks render mesh data.
 *
 * The data is a direct representation of `.mesh` contents. It is not converted
 * to any rendering engine coordinate system; use `@sw-file-lib/three` when a
 * Three.js `BufferGeometry` is needed.
 */
export interface MeshData {
  /** Discriminant used to distinguish render mesh data from physics mesh data. */
  kind: "mesh";
  /** Vertex records used by the render mesh. */
  vertices: MeshVertex[];
  /** Triangle index buffer referencing {@link vertices}. */
  indices: number[];
  /** Material ranges over the index buffer. */
  groups: MeshGroup[];
}

/** A collision/physics mesh section inside a Stormworks `.phys` file. */
export interface PhysGroup {
  /** Physics mesh vertex positions. */
  vertices: MeshVec3[];
  /** Triangle index buffer referencing {@link vertices}. */
  indices: number[];
}

/**
 * Parsed Stormworks physics mesh data.
 *
 * Physics meshes are split into groups matching the sections stored in the
 * `.phys` file.
 */
export interface PhysData {
  /** Discriminant used to distinguish physics mesh data from render mesh data. */
  kind: "phys";
  /** Physics mesh sections stored in the file. */
  groups: PhysGroup[];
}
