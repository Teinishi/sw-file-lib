import * as THREE from "three";
import type { Color } from "@sw-file-lib/core/color";

export const CREATE = Symbol("create");
export const ATTACH = Symbol("attach");

type UniformTransformer<T> = {
  toUniform(value: T): any;
  fromUniform(value: any): T | undefined;
};

type UniformTransformerMap<T> = {
  [K in keyof T]: UniformTransformer<T[K]>;
};

export const boolTransformer: UniformTransformer<boolean> = {
  toUniform: (v) => (v ? 1 : 0),
  fromUniform: (v) => v === 1,
};

export const colorVec3Transformer: UniformTransformer<Color> = {
  toUniform: (v) => [v.r / 255, v.g / 255, v.b / 255],
  fromUniform: (v) =>
    Array.isArray(v) && v.length === 3 && v.every((v) => typeof v === "number")
      ? {
          r: Math.round(v[0]! * 255),
          g: Math.round(v[1]! * 255),
          b: Math.round(v[2]! * 255),
        }
      : undefined,
};

export const colorVec4Transformer: UniformTransformer<Color> = {
  toUniform: (v) => [v.r / 255, v.g / 255, v.b / 255, v.a !== undefined ? v.a / 255 : 1.0],
  fromUniform: (v) =>
    Array.isArray(v) && v.length === 4 && v.every((v) => typeof v === "number")
      ? {
          r: Math.round(v[0]! * 255),
          g: Math.round(v[1]! * 255),
          b: Math.round(v[2]! * 255),
          a: Math.round(v[3]! * 255),
        }
      : undefined,
};

/**
 * Manages shader uniforms for a material.
 */
export class UniformController<T extends object> {
  private transformers: UniformTransformerMap<T>;
  private pending: Partial<T> = {};
  private shaderUniforms?: Record<string, THREE.IUniform>;

  /** @hidden */
  static [CREATE]<T extends object>(transformers: UniformTransformerMap<T>): UniformController<T> {
    return new UniformController(transformers);
  }

  private constructor(transformers: UniformTransformerMap<T>) {
    this.transformers = transformers;
  }

  /** @hidden */
  [ATTACH](shader: Record<string, THREE.IUniform>) {
    this.shaderUniforms = shader;

    for (const key in this.pending) {
      this.set(key, this.pending[key]!);
    }
    this.pending = {};
  }

  /** Gets the value of a uniform. */
  get<K extends keyof T>(key: K): T[K] | undefined {
    if (this.shaderUniforms) {
      const entry = this.shaderUniforms[key as string];
      if (entry === undefined) return;
      return this.transformers[key].fromUniform(entry.value);
    } else {
      return this.pending[key];
    }
  }

  /** Sets the value of a uniform. */
  set<K extends keyof T>(key: K, value: T[K]) {
    if (!this.shaderUniforms) {
      this.pending[key] = value;
      return;
    }

    const raw = this.transformers[key].toUniform(value);

    const name = key as string;
    if (this.shaderUniforms[name]) {
      this.shaderUniforms[name].value = raw;
    } else {
      this.shaderUniforms[name] = { value: raw };
    }
  }

  /** Patches multiple uniforms at once. */
  patch(values: Partial<T>) {
    for (const key in values) {
      this.set(key, values[key]!);
    }
  }
}
