import * as THREE from "three";
import type { MeshData } from "@sw-file-lib/core";
import type { ComponentDefinitionImmutable } from "@sw-file-lib/xml";
import type { ComponentAssembler } from "..";
import { createSwMeshGeometry } from "../..";
import { assembleMicrocontroller } from "./microcontroller";
import { assemblePaintableSign } from "./paintableSign";
import { createMeshObjects } from "./utils";

export type ComponentDefinitionGetter = (
  componentName: string,
) => Promise<ComponentDefinitionImmutable | undefined>;

export type MeshGetter = (meshName: string) => Promise<MeshData | undefined>;

export function createComponentAssembler(
  getComponentDefinition: ComponentDefinitionGetter,
  getMesh: MeshGetter,
): ComponentAssembler {
  const componentCache: Map<string, ComponentDefinitionImmutable | null> = new Map();
  const meshCache: Map<string, THREE.BufferGeometry | null> = new Map();

  async function getComponentDefinitionCached(
    componentName: string,
  ): Promise<ComponentDefinitionImmutable | undefined> {
    let cacheHit = componentCache.get(componentName);
    if (cacheHit) return cacheHit;
    if (cacheHit === null) return;

    const definition = await getComponentDefinition(componentName);
    if (!definition) {
      // onComponentNotFound
      componentCache.set(componentName, null);
      return;
    }

    componentCache.set(componentName, definition);
    return definition;
  }

  async function getMeshGeometryCached(
    meshName: string,
  ): Promise<THREE.BufferGeometry | undefined> {
    let cacheHit = meshCache.get(meshName);
    if (cacheHit) return cacheHit;
    if (cacheHit === null) return;

    const meshData = await getMesh(meshName);
    if (!meshData) {
      // onMeshNotFound
      meshCache.set(meshName, null);
      return;
    }

    const geometry = createSwMeshGeometry(meshData);
    meshCache.set(meshName, geometry);
    return geometry;
  }

  return async (component, _bodyIndex, _componentIndex) => {
    const componentName = component.d ?? "01_block";

    const definition = await getComponentDefinitionCached(componentName);
    if (!definition) return;

    switch (definition.type) {
      case 28:
        return await assemblePaintableSign(definition, component);
      case 37:
        return await assembleMicrocontroller(component, getMeshGeometryCached);
    }

    const { surfaces, mesh_data_name, mesh_0_name, mesh_1_name, mesh_2_name } = definition;

    const objects = createMeshObjects(
      component,
      mesh_data_name ? await getMeshGeometryCached(mesh_data_name) : undefined,
      mesh_0_name ? await getMeshGeometryCached(mesh_0_name) : undefined,
      mesh_1_name ? await getMeshGeometryCached(mesh_1_name) : undefined,
      mesh_2_name ? await getMeshGeometryCached(mesh_2_name) : undefined,
    );

    return {
      ...(surfaces ? { surfaces } : {}),
      ...(objects ? { objects } : {}),
    };
  };
}
