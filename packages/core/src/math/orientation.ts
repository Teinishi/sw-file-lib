import type { Vec3, Mat3, ReadonlyVec3 } from ".";

/** Axis name used by an axis-aligned orientation. Used in {@link Orientation}. */
export type Axis = "x" | "y" | "z";

/** Mapping from an output axis to a signed input axis. Used in {@link Orientation}. */
export interface AxisMapping {
  /** Source axis to read from. */
  axis: Axis;
  /** Sign applied to the source axis. */
  sign: 1 | -1;
}

/**
 * Axis-aligned orientation for Stormworks' left-handed coordinate system.
 *
 * Rotations use Stormworks-positive directions (`x` right, `y` up, `z`
 * forward). `toMat3()` returns a row-major matrix.
 */
export class Orientation {
  /** Create an orientation from signed mappings for the output `x`, `y`, and `z` axes. */
  constructor(
    public readonly x: AxisMapping,
    public readonly y: AxisMapping,
    public readonly z: AxisMapping,
  ) {}

  /** No rotation or reflection. */
  static readonly Identity = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: 1 },
  );

  /** Positive 90 degree rotation around the X axis in Stormworks left-handed space. */
  static readonly RotateX90 = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "z", sign: 1 },
    { axis: "y", sign: -1 },
  );

  /** 180 degree rotation around the X axis. */
  static readonly RotateX180 = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: -1 },
    { axis: "z", sign: -1 },
  );

  /** Positive 270 degree rotation around the X axis in Stormworks left-handed space. */
  static readonly RotateX270 = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "z", sign: -1 },
    { axis: "y", sign: 1 },
  );

  /** Positive 90 degree rotation around the Y axis in Stormworks left-handed space. */
  static readonly RotateY90 = new Orientation(
    { axis: "z", sign: -1 },
    { axis: "y", sign: 1 },
    { axis: "x", sign: 1 },
  );

  /** 180 degree rotation around the Y axis. */
  static readonly RotateY180 = new Orientation(
    { axis: "x", sign: -1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: -1 },
  );

  /** Positive 270 degree rotation around the Y axis in Stormworks left-handed space. */
  static readonly RotateY270 = new Orientation(
    { axis: "z", sign: 1 },
    { axis: "y", sign: 1 },
    { axis: "x", sign: -1 },
  );

  /** Positive 90 degree rotation around the Z axis in Stormworks left-handed space. */
  static readonly RotateZ90 = new Orientation(
    { axis: "y", sign: 1 },
    { axis: "x", sign: -1 },
    { axis: "z", sign: 1 },
  );

  /** 180 degree rotation around the Z axis. */
  static readonly RotateZ180 = new Orientation(
    { axis: "x", sign: -1 },
    { axis: "y", sign: -1 },
    { axis: "z", sign: 1 },
  );

  /** Positive 270 degree rotation around the Z axis in Stormworks left-handed space. */
  static readonly RotateZ270 = new Orientation(
    { axis: "y", sign: -1 },
    { axis: "x", sign: 1 },
    { axis: "z", sign: 1 },
  );

  /** Mirror across the X axis. */
  static readonly FlipX = new Orientation(
    { axis: "x", sign: -1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: 1 },
  );

  /** Mirror across the Y axis. */
  static readonly FlipY = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: -1 },
    { axis: "z", sign: 1 },
  );

  /** Mirror across the Z axis. */
  static readonly FlipZ = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: -1 },
  );

  /** Compose this orientation with another orientation. */
  multiply(other: Orientation): Orientation {
    const transform = (m: AxisMapping): AxisMapping => {
      const next = this[m.axis];
      return {
        axis: next.axis,
        sign: (m.sign * next.sign) as 1 | -1,
      };
    };

    return new Orientation(transform(other.x), transform(other.y), transform(other.z));
  }

  /** Transform a position or direction vector by this orientation. */
  transformPosition(src: ReadonlyVec3): Vec3 {
    const get = (m: AxisMapping) => src[m.axis] * m.sign;

    return {
      x: get(this.x),
      y: get(this.y),
      z: get(this.z),
    };
  }

  /** Convert this orientation to a row-major 3x3 matrix. */
  toMat3(): Mat3 {
    const row = (m: AxisMapping): [number, number, number] => {
      switch (m.axis) {
        case "x":
          return [m.sign, 0, 0];
        case "y":
          return [0, m.sign, 0];
        case "z":
          return [0, 0, m.sign];
      }
    };

    return [...row(this.x), ...row(this.y), ...row(this.z)];
  }

  /** Return `true` when both orientations describe the same axis mapping. */
  equals(other: Orientation): boolean {
    return (
      this.x.axis === other.x.axis &&
      this.x.sign === other.x.sign &&
      this.y.axis === other.y.axis &&
      this.y.sign === other.y.sign &&
      this.z.axis === other.z.axis &&
      this.z.sign === other.z.sign
    );
  }
}
