import * as THREE from "three";
import type { MeshData, PhysData, PhysGroup } from "@sw-file-lib/core";
import { createSwMaterials, type SwMaterialSet } from "./material";

/** Options used when creating a render mesh object from parsed `mesh` data. */
export interface CreateSwMeshOptions {
  /** Optional display name assigned to the created mesh. */
  readonly name?: string;
  /** Materials used for opaque, glass, and additive groups. */
  readonly materials?: Readonly<SwMaterialSet>;
}

/** Options used when creating a physics mesh group from parsed `phys` data. */
export interface CreateSwPhysMeshOptions {
  /** Optional display name assigned to the created group. */
  readonly name?: string;
}

/**
 * Create a renderable Three.js mesh from parsed Stormworks `mesh` data.
 *
 * The returned mesh owns its geometry. It uses material groups mapped from the
 * file's group shader ids: opaque, glass, and additive.
 */
export function createSwMesh(
  mesh: MeshData,
  options: CreateSwMeshOptions = {},
): THREE.Mesh<THREE.BufferGeometry, THREE.Material[]> {
  const geometry = createSwMeshGeometry(mesh);
  const materials = options.materials ?? createSwMaterials();
  const object = new THREE.Mesh(geometry, [materials.opaque, materials.glass, materials.additive]);

  object.name = options.name ?? "";
  return object;
}

/**
 * Create a Three.js group from parsed Stormworks `phys` data.
 *
 * Each physics section becomes a child mesh using the `phys` material from the
 * supplied material set.
 */
export function createSwPhysMeshGroup(
  mesh: PhysData,
  material: THREE.Material,
  options: CreateSwPhysMeshOptions = {},
): THREE.Group {
  const group = new THREE.Group();

  mesh.groups.forEach((g) => {
    const geometry = createSwPhysGroupGeometry(g);
    group.add(new THREE.Mesh(geometry, material));
  });

  group.name = options.name ?? "";
  return group;
}

/**
 * Create buffer geometry for parsed Stormworks render mesh data.
 *
 * The geometry includes `position`, `normal`, and `color` attributes, and material groups derived from group shader ids.
 */
export function createSwMeshGeometry(mesh: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(mesh.vertices.length * 3);
  const normals = new Float32Array(mesh.vertices.length * 3);
  const colors = new Float32Array(mesh.vertices.length * 4);

  mesh.vertices.forEach((vertex, index) => {
    const offset3 = index * 3;
    const offset4 = index * 4;
    positions[offset3] = vertex.position.x;
    positions[offset3 + 1] = vertex.position.y;
    positions[offset3 + 2] = -vertex.position.z;
    normals[offset3] = vertex.normal.x;
    normals[offset3 + 1] = vertex.normal.y;
    normals[offset3 + 2] = -vertex.normal.z;
    colors[offset4] = vertex.color.r / 255;
    colors[offset4 + 1] = vertex.color.g / 255;
    colors[offset4 + 2] = vertex.color.b / 255;
    colors[offset4 + 3] = vertex.color.a !== undefined ? vertex.color.a / 255 : 1;
  });

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  geometry.setIndex(mesh.indices);
  setGroups(geometry, mesh);
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Create buffer geometry for parsed Stormworks phys group.
 *
 * The geometry includes `position` attributes.
 */
export function createSwPhysGroupGeometry(physGroup: PhysGroup): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(physGroup.vertices.length * 3);

  physGroup.vertices.forEach((vertex, index) => {
    const offset = index * 3;
    positions[offset] = vertex.x;
    positions[offset + 1] = vertex.y;
    positions[offset + 2] = -vertex.z;
  });

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(
    physGroup.indices.length > 0
      ? physGroup.indices
      : createFallbackTriangleIndices(physGroup.vertices.length),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createFallbackTriangleIndices(vertexCount: number): number[] {
  return Array.from({ length: vertexCount }, (_, index) => index);
}

function setGroups(geometry: THREE.BufferGeometry, mesh: MeshData): void {
  geometry.clearGroups();

  if (mesh.groups.length === 0) {
    geometry.addGroup(0, mesh.indices.length, 0);
    return;
  }

  mesh.groups.forEach((g) => {
    geometry.addGroup(
      g.indexBufferStart,
      g.indexBufferLength,
      getMaterialIndexForShaderId(g.materialId),
    );
  });
}

function getMaterialIndexForShaderId(shaderId: number): number {
  if (shaderId === 1) return 1;
  if (shaderId === 2) return 2;
  return 0;
}
