import type { Vec3, Mat3 } from "@sw-file-lib/core";

type Axis = "x" | "y" | "z";

interface AxisMapping {
  axis: Axis;
  sign: 1 | -1;
}

export class Orientation {
  constructor(
    public readonly x: AxisMapping,
    public readonly y: AxisMapping,
    public readonly z: AxisMapping,
  ) {}

  static readonly Identity = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: 1 },
  );

  // X rotation
  static readonly RotateX90 = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "z", sign: 1 },
    { axis: "y", sign: -1 },
  );

  static readonly RotateX180 = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: -1 },
    { axis: "z", sign: -1 },
  );

  static readonly RotateX270 = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "z", sign: -1 },
    { axis: "y", sign: 1 },
  );

  // Y rotation
  static readonly RotateY90 = new Orientation(
    { axis: "z", sign: -1 },
    { axis: "y", sign: 1 },
    { axis: "x", sign: 1 },
  );

  static readonly RotateY180 = new Orientation(
    { axis: "x", sign: -1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: -1 },
  );

  static readonly RotateY270 = new Orientation(
    { axis: "z", sign: 1 },
    { axis: "y", sign: 1 },
    { axis: "x", sign: -1 },
  );

  // Z rotation
  static readonly RotateZ90 = new Orientation(
    { axis: "y", sign: 1 },
    { axis: "x", sign: -1 },
    { axis: "z", sign: 1 },
  );

  static readonly RotateZ180 = new Orientation(
    { axis: "x", sign: -1 },
    { axis: "y", sign: -1 },
    { axis: "z", sign: 1 },
  );

  static readonly RotateZ270 = new Orientation(
    { axis: "y", sign: -1 },
    { axis: "x", sign: 1 },
    { axis: "z", sign: 1 },
  );

  // Mirrors
  static readonly FlipX = new Orientation(
    { axis: "x", sign: -1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: 1 },
  );

  static readonly FlipY = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: -1 },
    { axis: "z", sign: 1 },
  );

  static readonly FlipZ = new Orientation(
    { axis: "x", sign: 1 },
    { axis: "y", sign: 1 },
    { axis: "z", sign: -1 },
  );

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

  transformPosition(src: Readonly<Vec3>): Vec3 {
    const get = (m: AxisMapping) => src[m.axis] * m.sign;

    return {
      x: get(this.x),
      y: get(this.y),
      z: get(this.z),
    };
  }

  static fromMat3(m: Readonly<Mat3>) {
    const decode = (r0: number, r1: number, r2: number): AxisMapping => {
      if (r0) return { axis: "x", sign: r0 as 1 | -1 };
      if (r1) return { axis: "y", sign: r1 as 1 | -1 };
      return { axis: "z", sign: r2 as 1 | -1 };
    };

    return new Orientation(
      decode(m[0], m[3], m[6]),
      decode(m[1], m[4], m[7]),
      decode(m[2], m[5], m[8]),
    );
  }

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

  multiplyMat3(m: Readonly<Mat3>): Orientation {
    return this.multiply(Orientation.fromMat3(m));
  }

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
