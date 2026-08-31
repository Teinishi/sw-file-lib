import * as THREE from "three";
import type { Color } from "@sw-file-lib/core/color";

type ShaderUniforms = { [uniform: string]: THREE.IUniform };

export class UniformStore {
  private _pending: Record<string, any> = {};
  private _shaderUniforms: ShaderUniforms | undefined;

  /**
   * @internal
   */
  _setShaderUniforms(shaderUniforms: ShaderUniforms) {
    this._shaderUniforms = shaderUniforms;

    for (const [key, value] of Object.entries(this._pending)) {
      this.setValue(key, value);
    }
    this._pending = {};
  }

  protected getValue(key: string): any {
    if (!this._shaderUniforms) {
      return this._pending[key];
    }

    return this._shaderUniforms[key]?.value;
  }

  protected setValue(key: string, value: any) {
    if (!this._shaderUniforms) {
      this._pending[key] = value;
      return;
    }

    if (this._shaderUniforms[key] !== undefined) {
      this._shaderUniforms[key].value = value;
    } else {
      this._shaderUniforms[key] = { value };
    }
  }
}

export function colorToUniform3(color: Color): [number, number, number] {
  return [color.r / 255, color.g / 255, color.b / 255];
}

export function colorToUniform4(color: Color): [number, number, number, number] {
  return [color.r / 255, color.g / 255, color.b / 255, color.a !== undefined ? color.a / 255 : 1.0];
}

export function uniformValueToColor(value: any): Color | undefined {
  if (Array.isArray(value) && value.length === 4 && value.every((v) => typeof v === "number")) {
    return {
      r: Math.round(value[0]! * 255),
      g: Math.round(value[1]! * 255),
      b: Math.round(value[2]! * 255),
      a: Math.round(value[3]! * 255),
    };
  }
}
