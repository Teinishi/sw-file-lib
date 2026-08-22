import { expect, test } from "vitest";
import { buildSurfacesGeometry, GeometryBuilder, Orientation, type SurfaceData } from "../src";

test("Orientation rotations use Stormworks left-handed positive rotation", () => {
  expect(Orientation.RotateX90.transformPosition({ x: 0, y: 1, z: 0 })).toEqual({
    x: 0,
    y: 0,
    z: -1,
  });
  expect(Orientation.RotateY90.transformPosition({ x: 0, y: 0, z: 1 })).toEqual({
    x: -1,
    y: 0,
    z: 0,
  });
  expect(Orientation.RotateZ90.transformPosition({ x: 1, y: 0, z: 0 })).toEqual({
    x: 0,
    y: -1,
    z: 0,
  });
});

test("GeometryBuilder.toMeshData keeps Stormworks left-handed z values", () => {
  const builder = new GeometryBuilder();

  builder.addFace([
    { x: 1, y: 0, z: 2 },
    { x: 1, y: 1, z: 3 },
    { x: 1, y: 0, z: 4 },
  ]);

  const mesh = builder.toMeshData();

  expect(mesh.vertices.map((v) => v.position.z)).toEqual([2, 3, 4]);
  expect(mesh.vertices.map((v) => v.normal.x)).toEqual([1, 1, 1]);
});

test("buildSurfacesGeometry scales Stormworks positions without flipping z", () => {
  const surfaces: SurfaceData[] = [
    {
      position: { x: 0, y: 0, z: 4 },
      matrix: Orientation.Identity.toMat3(),
      isFlipped: false,
      shape: 1,
    },
  ];

  const builder = buildSurfacesGeometry(surfaces, { cull: false });
  const mesh = builder.toMeshData();

  expect(mesh.vertices.map((v) => v.position.z)).toEqual([0.875, 1.125, 1.125, 0.875]);
});
