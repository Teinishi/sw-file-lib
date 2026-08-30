import * as THREE from "three";
import { expect, test } from "vitest";
import { GeometryBuilder } from "@sw-file-lib/geometry";
import {
  applyBuilderOnBufferGeometry,
  bufferGeometryFromBuilder,
  createSwMesh,
  createSwMeshGeometry,
  createSwPhysMeshGroup,
  createSwPhysGroupGeometry,
} from "../src";

function arrayWithoutNegativeZero(values: ArrayLike<number>): number[] {
  return Array.from(values, (value) => (Object.is(value, -0) ? 0 : value));
}

test("bufferGeometryFromBuilder converts Stormworks left-handed geometry to Three.js", () => {
  const builder = new GeometryBuilder();

  builder.addFace([
    { x: 1, y: 0, z: 2 },
    { x: 1, y: 1, z: 3 },
    { x: 1, y: 0, z: 4 },
  ]);

  const geometry = bufferGeometryFromBuilder(builder);

  expect(arrayWithoutNegativeZero(geometry.getAttribute("position").array)).toEqual([
    1, 0, -2, 1, 1, -3, 1, 0, -4,
  ]);
  expect(arrayWithoutNegativeZero(geometry.getAttribute("normal").array)).toEqual([
    -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);
  expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 1, 2]);
});

test("applyBuilderOnBufferGeometry replaces attributes, index, and groups", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.addGroup(0, 99, 2);

  const builder = new GeometryBuilder();
  builder.addFace(
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
    { materialIndex: 1 },
  );

  applyBuilderOnBufferGeometry(builder, geometry);

  expect(geometry.groups).toEqual([{ start: 0, count: 3, materialIndex: 1 }]);
  expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 1, 2]);
  expect(arrayWithoutNegativeZero(geometry.getAttribute("position").array)).toEqual([
    0, 0, 0, 0, 1, 0, 0, 0, -1,
  ]);
});

test("createSwMeshGeometry flips z at the Three.js boundary and keeps Stormworks winding", () => {
  const geometry = createSwMeshGeometry({
    kind: "mesh",
    vertices: [
      {
        position: { x: 1, y: 0, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
        color: { r: 255, g: 0, b: 0, a: 255 },
      },
      {
        position: { x: 2, y: 0, z: 3 },
        normal: { x: 0, y: 0, z: 1 },
        color: { r: 0, g: 255, b: 0, a: 255 },
      },
      {
        position: { x: 3, y: 0, z: 4 },
        normal: { x: 0, y: 0, z: 1 },
        color: { r: 0, g: 0, b: 255, a: 255 },
      },
    ],
    indices: [0, 1, 2],
    groups: [
      {
        name: "glass",
        materialId: 1,
        indexBufferStart: 0,
        indexBufferLength: 3,
        boundsMin: { x: 1, y: 0, z: 2 },
        boundsMax: { x: 3, y: 0, z: 4 },
      },
    ],
  });

  expect(arrayWithoutNegativeZero(geometry.getAttribute("position").array)).toEqual([
    1, 0, -2, 2, 0, -3, 3, 0, -4,
  ]);
  expect(arrayWithoutNegativeZero(geometry.getAttribute("normal").array)).toEqual([
    0, 0, -1, 0, 0, -1, 0, 0, -1,
  ]);
  expect(Array.from(geometry.getAttribute("color").array)).toEqual([
    1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1,
  ]);
  expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 1, 2]);
  expect(geometry.groups).toEqual([{ start: 0, count: 3, materialIndex: 1 }]);
  expect(geometry.boundingSphere).not.toBeNull();
});

test("createSwMesh creates a Three mesh with Stormworks material slots", () => {
  const object = createSwMesh(
    {
      kind: "mesh",
      vertices: [
        {
          position: { x: 0, y: 0, z: 0 },
          normal: { x: 1, y: 0, z: 0 },
          color: { r: 255, g: 255, b: 255, a: 255 },
        },
        {
          position: { x: 1, y: 0, z: 0 },
          normal: { x: 1, y: 0, z: 0 },
          color: { r: 255, g: 255, b: 255, a: 255 },
        },
        {
          position: { x: 0, y: 1, z: 0 },
          normal: { x: 1, y: 0, z: 0 },
          color: { r: 255, g: 255, b: 255, a: 255 },
        },
      ],
      indices: [0, 1, 2],
      groups: [],
    },
    { name: "test-mesh" },
  );

  expect(object).toBeInstanceOf(THREE.Mesh);
  expect(object.name).toBe("test-mesh");
  expect(object.material).toHaveLength(3);
});

test("createSwPhysGroupGeometry flips z and creates fallback triangle indices", () => {
  const geometry = createSwPhysGroupGeometry({
    vertices: [
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 2 },
      { x: 0, y: 1, z: 3 },
    ],
    indices: [],
  });

  expect(arrayWithoutNegativeZero(geometry.getAttribute("position").array)).toEqual([
    0, 0, -1, 1, 0, -2, 0, 1, -3,
  ]);
  expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 1, 2]);
  expect(geometry.getAttribute("normal")).toBeDefined();
  expect(geometry.boundingSphere).not.toBeNull();
});

test("createSwPhysMeshGroup creates one child mesh per physics group", () => {
  const group = createSwPhysMeshGroup(
    {
      kind: "phys",
      groups: [
        {
          vertices: [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
          ],
          indices: [0, 1, 2],
        },
      ],
    },
    new THREE.MeshBasicMaterial(),
    { name: "physics" },
  );

  expect(group).toBeInstanceOf(THREE.Group);
  expect(group.name).toBe("physics");
  expect(group.children).toHaveLength(1);
  expect(group.children[0]).toBeInstanceOf(THREE.Mesh);
});
