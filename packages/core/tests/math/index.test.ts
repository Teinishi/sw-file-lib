import { expect, test } from "vitest";
import { Orientation } from "../../src/math";

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

test("Orientation round-trips through matrices and composes transforms", () => {
  const orientation = Orientation.RotateZ90.multiply(Orientation.FlipX);

  expect(orientation.transformPosition({ x: 2, y: 3, z: 4 })).toEqual({
    x: -3,
    y: -2,
    z: 4,
  });
  expect(Orientation.RotateX90.multiply(Orientation.RotateX270).equals(Orientation.Identity)).toBe(
    true,
  );
});
