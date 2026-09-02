import { expect, test } from "vitest";
import { Orientation } from "@sw-file-lib/core/math";
import {
  buildSurfaceGeometry,
  buildSurfacesGeometry,
  cullSurfaces,
  GeometryBuilder,
  getSurfaceOrientation,
  isValidSurfaceOrientation,
  isValidSurfaceRotation,
  type FlattenedSurfaceData,
} from "../src";

function arrayWithoutNegativeZero(values: ArrayLike<number>): number[] {
  return Array.from(values, (value) => (Object.is(value, -0) ? 0 : value));
}

test("surface validators reject out-of-range values", () => {
  expect(isValidSurfaceOrientation(0)).toBe(true);
  expect(isValidSurfaceOrientation(6)).toBe(false);
  expect(isValidSurfaceRotation(3)).toBe(true);
  expect(isValidSurfaceRotation(4)).toBe(false);
});

test("getSurfaceOrientation keeps Stormworks surface ids stable after left-handed rotation change", () => {
  expect(getSurfaceOrientation(0, 1).equals(Orientation.RotateX270)).toBe(true);
  expect(getSurfaceOrientation(2, 0).equals(Orientation.RotateZ270)).toBe(true);
  expect(
    getSurfaceOrientation(4, 0).equals(Orientation.RotateZ270.multiply(Orientation.RotateX270)),
  ).toBe(true);
});

test("GeometryBuilder stores left-handed positions, normals, indices, colors, and groups", () => {
  const builder = new GeometryBuilder();

  builder.addFace(
    [
      { x: 1, y: 0, z: 2 },
      { x: 1, y: 1, z: 3 },
      { x: 1, y: 0, z: 4 },
    ],
    { materialIndex: 2, color: { r: 10, g: 20, b: 30 } },
  );

  const mesh = builder.toMeshData();
  expect(mesh.vertices.map((v) => v.position.z)).toEqual([2, 3, 4]);
  expect(mesh.vertices.map((v) => v.normal.x)).toEqual([-1, -1, -1]);
  expect(mesh.vertices.map((v) => v.color)).toEqual([
    { r: 10, g: 20, b: 30, a: 255 },
    { r: 10, g: 20, b: 30, a: 255 },
    { r: 10, g: 20, b: 30, a: 255 },
  ]);
  expect(mesh.indices).toEqual([0, 1, 2]);
  expect(mesh.groups).toMatchObject([
    { indexBufferStart: 0, indexBufferLength: 3, materialIndex: 2 },
  ]);
});

test("GeometryBuilder flip and mirrored transforms update left-handed winding", () => {
  const flipped = new GeometryBuilder();
  flipped.addFace(
    [
      { x: 1, y: 0, z: 2 },
      { x: 1, y: 1, z: 3 },
      { x: 1, y: 0, z: 4 },
    ],
    { flip: true },
  );
  expect(flipped.toMeshData().vertices.map((v) => v.normal.x)).toEqual([1, 1, 1]);
  expect(flipped.toMeshData().indices).toEqual([0, 2, 1]);

  const mirrored = new GeometryBuilder();
  mirrored.addFace([
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ]);
  mirrored.transform(Orientation.FlipX.toMat3(), { x: 2, y: 0, z: 0 });

  const mesh = mirrored.toMeshData();
  expect(mesh.indices).toEqual([0, 2, 1]);
  expect(mesh.vertices[0]!.position).toEqual({ x: 2, y: 0, z: 0 });
});

test("GeometryBuilder builds polygons, extruded sides, and BufferGeometry attributes", () => {
  const builder = new GeometryBuilder();
  builder.addPolygon([
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
  ]);
  builder.addExtrudedSides(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    { close: true, zRange: [2, 3] },
  );

  const attributes = builder.toBufferGeometryAttributes();
  expect(attributes.position).toBeInstanceOf(Float32Array);
  expect(attributes.normal).toBeInstanceOf(Float32Array);
  expect(attributes.color).toBeInstanceOf(Float32Array);
  expect(attributes.index.length).toBe(24);
  expect(attributes.groups.length).toBe(1);
});

test("buildSurfaceGeometry emits the canonical X+ Stormworks surface", () => {
  const builder = buildSurfaceGeometry(1)!;
  const mesh = builder.toMeshData();

  expect(mesh.vertices.map((v) => v.position.x)).toEqual([0.125, 0.125, 0.125, 0.125]);
  expect(mesh.vertices.map((v) => v.normal.x)).toEqual([1, 1, 1, 1]);
  expect(mesh.indices).toEqual([0, 1, 2, 0, 2, 3]);
});

test("buildSurfaceGeometry supports edge and hollow options", () => {
  const edge = buildSurfaceGeometry(1, { edge: true })!.toMeshData();
  const hollow = buildSurfaceGeometry(1, { hollow: true })!.toMeshData();

  expect(edge.indices.length).toBe(30);
  expect(edge.groups.length).toBe(1);
  expect(hollow.indices.length).toBe(24);
});

test("buildSurfacesGeometry scales Stormworks positions without flipping z", () => {
  const surfaces: FlattenedSurfaceData[] = [
    {
      position: { x: 0, y: 0, z: 4 },
      matrix: Orientation.Identity.toMat3(),
      shape: 1,
    },
  ];

  const builder = buildSurfacesGeometry(surfaces, { cull: false });
  const mesh = builder.toMeshData();

  expect(mesh.vertices.map((v) => v.position.z)).toEqual([1.125, 0.875, 0.875, 1.125]);
});

test("cullSurfaces removes fully covered adjacent faces", () => {
  const surfaces: FlattenedSurfaceData[] = [
    {
      position: { x: 0, y: 0, z: 0 },
      matrix: Orientation.Identity.toMat3(),
      shape: 1,
    },
    {
      position: { x: 1, y: 0, z: 0 },
      matrix: Orientation.RotateZ180.toMat3(),
      shape: 1,
    },
  ];

  expect(cullSurfaces(surfaces)).toEqual(new Set([0, 1]));
  expect(
    arrayWithoutNegativeZero(buildSurfacesGeometry(surfaces).toBufferGeometryAttributes().position),
  ).toEqual([]);
});
