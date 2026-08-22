import { expect, test } from "vitest";
import { GeometryBuilder } from "@sw-file-lib/geometry";
import { bufferGeometryFromBuilder, createSwMeshGeometry } from "../src";

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
    1, 0, 0, 1, 0, 0, 1, 0, 0,
  ]);
  expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 2, 1]);
});

test("createSwMeshGeometry flips z and triangle winding at the Three.js boundary", () => {
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
    groups: [],
  });

  expect(arrayWithoutNegativeZero(geometry.getAttribute("position").array)).toEqual([
    1, 0, -2, 2, 0, -3, 3, 0, -4,
  ]);
  expect(arrayWithoutNegativeZero(geometry.getAttribute("normal").array)).toEqual([
    0, 0, -1, 0, 0, -1, 0, 0, -1,
  ]);
  expect(Array.from(geometry.getIndex()!.array)).toEqual([0, 2, 1]);
});
