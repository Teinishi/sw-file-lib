import type { BinaryReaderInput } from "..";
import { MeshReader } from "./meshReader";
import { MeshWriter } from "./meshWriter";

/**
 * A three-dimensional vector used by Stormworks mesh and physics formats.
 */
export interface MeshVec3 {
  /** X coordinate. */
  x: number;
  /** Y coordinate. */
  y: number;
  /** Z coordinate. */
  z: number;
}

/**
 * An RGBA vertex color.
 *
 * Each component is stored as an 8-bit unsigned value (`0–255`).
 */
export interface MeshColor4 {
  /** Red channel. */
  r: number;
  /** Green channel. */
  g: number;
  /** Blue channel. */
  b: number;
  /** Alpha channel. */
  a: number;
}

/**
 * A mesh vertex.
 */
export interface MeshVertex {
  /** Vertex position. */
  position: MeshVec3;
  /** Vertex color. */
  color: MeshColor4;
  /** Vertex normal. */
  normal: MeshVec3;
}

/**
 * A render group within a mesh.
 *
 * Each group references a contiguous range of the shared index buffer and
 * stores its own material, bounds, and display name.
 */
export interface MeshGroup {
  /** Starting index within the global index buffer. */
  indexBufferStart: number;
  /** Number of indices belonging to this group. */
  indexBufferLength: number;
  /** Material index. */
  materialIndex: number;
  /** Minimum corner of the group's bounding box. */
  boundsMin: MeshVec3;
  /** Maximum corner of the group's bounding box. */
  boundsMax: MeshVec3;
  /** Group name stored in the file. */
  name: string;
}

/**
 * A Stormworks render mesh.
 *
 * The data is a direct representation of `.mesh` contents. It is not converted
 * to any rendering engine coordinate system; use `@sw-file-lib/three` when a
 * Three.js `BufferGeometry` is needed.
 */
export interface MeshData {
  /** Discriminator for mesh data. */
  kind: "mesh";
  /** Vertex buffer. */
  vertices: MeshVertex[];
  /** Triangle index buffer. */
  indices: number[];
  /** Mesh groups. */
  groups: MeshGroup[];
}

/**
 * A collision/physics mesh group.
 *
 * Each group contains an independent vertex and index buffer.
 */
export interface PhysGroup {
  /** Vertex positions. */
  vertices: MeshVec3[];
  /** Triangle index buffer. */
  indices: number[];
}

/**
 * A Stormworks physics collision mesh.
 *
 * The data is a direct representation of `.phys` contents.
 */
export interface PhysData {
  /** Discriminator for physics data. */
  kind: "phys";
  /** Collision mesh groups. */
  groups: PhysGroup[];
}

/**
 * Parses either a Stormworks mesh or physics mesh.
 *
 * The file type is detected automatically from the binary header.
 *
 * @param input - Binary data to parse.
 * @returns The parsed mesh or physics mesh.
 * @throws {Error} If the file signature is neither `"mesh"` nor `"phys"`.
 */
export function parseMeshOrPhys(input: BinaryReaderInput): MeshData | PhysData {
  return new MeshReader(input).parseMeshOrPhys();
}

/**
 * Parses a Stormworks render mesh.
 *
 * @param input - Binary mesh data.
 * @returns The parsed mesh.
 * @throws {Error} If the file signature is not `"mesh"`.
 */
export function parseMesh(input: BinaryReaderInput): MeshData {
  return new MeshReader(input).parseMesh();
}

/**
 * Parses a Stormworks physics collision mesh.
 *
 * @param input - Binary physics mesh data.
 * @returns The parsed physics mesh.
 * @throws {Error} If the file signature is not `"phys"`.
 */
export function parsePhys(input: BinaryReaderInput): PhysData {
  return new MeshReader(input).parsePhys();
}

/**
 * Serializes a render mesh into Stormworks mesh format.
 *
 * @param data - Mesh to serialize.
 * @returns The serialized binary mesh.
 */
export function serializeMesh(data: Readonly<MeshData>): Uint8Array<ArrayBuffer> {
  const writer = new MeshWriter();
  writer.writeAscii("mesh");
  writer.writeU16(7);
  writer.writeU16(1);
  writer.writeU16(data.vertices.length);
  writer.writeU16(19);
  writer.writeU16(0);

  for (const vertex of data.vertices) {
    writer.writeMeshVertex(vertex);
  }

  writer.writeU32(data.indices.length);
  for (const i of data.indices) {
    writer.writeU16(i);
  }

  writer.writeU16(data.groups.length);
  for (const group of data.groups) {
    writer.writeMeshGroup(group);
  }

  writer.writeU16(0);

  return writer.toUint8Array();
}

/**
 * Serializes a physics collision mesh into Stormworks physics format.
 *
 * @param data - Physics mesh to serialize.
 * @returns The serialized binary physics mesh.
 */
export function serializePhys(data: Readonly<PhysData>): Uint8Array<ArrayBuffer> {
  const writer = new MeshWriter();
  writer.writeAscii("phys");
  writer.writeU16(2);
  writer.writeU16(data.groups.length);

  for (const group of data.groups) {
    writer.writePhysGroup(group);
  }

  return writer.toUint8Array();
}
