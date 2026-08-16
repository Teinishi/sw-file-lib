import * as THREE from "three";

const AMBIENT_COLOR_HIGH = new THREE.Color(118.0 / 255.0, 142.0 / 255.0, 190.0 / 255.0);
const AMBIENT_COLOR_LOW = new THREE.Color(11.0 / 255.0, 16.0 / 255.0, 44.0 / 255.0);

/** Options used when creating the default Stormworks-style lights. */
export interface CreateSwLightsOptions {
  /** Intensity of the hemisphere light. Defaults to `1.6`. */
  hemisphereIntensity?: number;
  /** Intensity of the directional light. Defaults to `1.0`. */
  directionalIntensity?: number;
}

/**
 * Create the default Stormworks-style light objects.
 *
 * The returned array contains a hemisphere light and a directional light. Add
 * them to your scene, group, or TresJS primitive as needed.
 */
export function createSwLights(
  options: CreateSwLightsOptions = {},
): [THREE.HemisphereLight, THREE.DirectionalLight] {
  const hemi = new THREE.HemisphereLight(
    AMBIENT_COLOR_HIGH,
    AMBIENT_COLOR_LOW,
    options.hemisphereIntensity ?? 1.6,
  );
  const sun = new THREE.DirectionalLight(
    new THREE.Color(0.95, 0.95, 1.0),
    options.directionalIntensity ?? 1.6,
  );

  sun.position.set(0.0, 1.0, -0.5);
  return [hemi, sun];
}

/** Create a group containing the default Stormworks-style lights. */
export function createSwLightGroup(options: CreateSwLightsOptions = {}): THREE.Group {
  const group = new THREE.Group();

  createSwLights(options).forEach((light) => {
    group.add(light);
  });

  return group;
}
