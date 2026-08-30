import * as THREE from "three";
import { type MeshData } from "@sw-file-lib/core";
import { parseColor, type Color } from "@sw-file-lib/core/color";
import { VehicleSchemas, type ComponentDefinitionImmutable } from "@sw-file-lib/xml";
import { applyUniformPatch, createSwMaterials, createSwMeshGeometry, type SwMaterialSet } from "..";
import type { ComponentAssembler } from "./assembleGeometry";

const MICROCONTROLLER_CORNER_MESH = "meshes/component_microprocessor_corner.mesh";
const MICROCONTROLLER_EDGE_MESH = "meshes/component_microprocessor_edge.mesh";
const MICROCONTROLLER_TOP_MESH = "meshes/component_microprocessor_top.mesh";
const MICROCONTROLLER_TOP_CORNER_MESH = "meshes/component_microprocessor_top_corner.mesh";
const MICROCONTROLLER_TOP_EDGE_MESH = "meshes/component_microprocessor_top_edge.mesh";

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

    if (definition.type === 37) {
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

async function assembleMicrocontroller(
  component: VehicleSchemas.ComponentImmutable,
  getMeshGeometry: (name: string) => Promise<THREE.BufferGeometry | undefined>,
) {
  const microcontroller = component.o?.microprocessor_definition;
  if (!microcontroller) return;

  const width = microcontroller.width ?? 0;
  const length = microcontroller.length ?? 0;
  if (width <= 0 || length <= 0) return;
  const cornerX = 0.25 * (width - 1);
  const cornerZ = -0.25 * (length - 1);

  const surfaces = [];
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < length; z++) {
      surfaces.push({
        orientation: 3,
        shape: 1,
        position: { x, y: 0, z },
      });
      surfaces.push({
        orientation: 2,
        shape: 0,
        position: { x, y: 0, z },
      });
    }
  }
  for (let x = 0; x < width; x++) {
    surfaces.push({
      orientation: 5,
      shape: 0,
      position: { x, y: 0, z: 0 },
    });
    surfaces.push({
      orientation: 4,
      shape: 0,
      position: { x, y: 0, z: length - 1 },
    });
  }
  for (let z = 0; z < length; z++) {
    surfaces.push({
      orientation: 1,
      shape: 0,
      position: { x: 0, y: 0, z },
    });
    surfaces.push({
      orientation: 0,
      shape: 0,
      position: { x: width - 1, y: 0, z },
    });
  }

  const materials = createComponentMaterials(component);
  const materialArr = [materials.opaque, materials.glass, materials.additive];

  const group = new THREE.Group();

  const cornerMesh = await getMeshGeometry(MICROCONTROLLER_CORNER_MESH);
  const topCornerMesh = await getMeshGeometry(MICROCONTROLLER_TOP_CORNER_MESH);
  if (cornerMesh || topCornerMesh) {
    const corner1 = combineGeometries([cornerMesh, topCornerMesh], materialArr);
    const corner2 = corner1.clone();
    const corner3 = corner1.clone();
    const corner4 = corner1.clone();
    corner2.rotation.y = Math.PI / 2;
    corner3.rotation.y = -Math.PI / 2;
    corner4.rotation.y = Math.PI;
    corner2.position.x = cornerX;
    corner3.position.z = cornerZ;
    corner4.position.x = cornerX;
    corner4.position.z = cornerZ;
    group.add(corner1);
    group.add(corner2);
    group.add(corner3);
    group.add(corner4);
  }

  const edgeMesh = await getMeshGeometry(MICROCONTROLLER_EDGE_MESH);
  const topEdgeMesh = await getMeshGeometry(MICROCONTROLLER_TOP_EDGE_MESH);
  if (edgeMesh || topEdgeMesh) {
    const edge = combineGeometries([edgeMesh, topEdgeMesh], materialArr);
    for (let x = 0; x < width - 1; x++) {
      const edge1 = edge.clone();
      const edge2 = edge.clone();
      edge2.rotation.y = Math.PI;
      edge1.position.x = 0.25 * x + 0.125;
      edge2.position.x = 0.25 * x + 0.125;
      edge2.position.z = cornerZ;
      group.add(edge1);
      group.add(edge2);
    }
    for (let z = 0; z < length - 1; z++) {
      const edge1 = edge.clone();
      const edge2 = edge.clone();
      edge1.rotation.y = -Math.PI / 2;
      edge2.rotation.y = Math.PI / 2;
      edge1.position.z = -(0.25 * z + 0.125);
      edge2.position.z = -(0.25 * z + 0.125);
      edge2.position.x = cornerX;
      group.add(edge1);
      group.add(edge2);
    }
  }

  const topMesh = await getMeshGeometry(MICROCONTROLLER_TOP_MESH);
  if (topMesh) {
    for (let x = 0; x < width - 1; x++) {
      for (let z = 0; z < length - 1; z++) {
        const top = new THREE.Mesh(topMesh, materialArr);
        top.position.x = 0.25 * x + 0.125;
        top.position.z = -(0.25 * z + 0.125);
        group.add(top);
      }
    }
  }

  return { surfaces /*, objects: { microcontroller: group }*/ };
}

function createMeshObjects(
  component: VehicleSchemas.ComponentImmutable,
  meshGeometry: THREE.BufferGeometry | undefined,
  mesh0Geometry: THREE.BufferGeometry | undefined,
  mesh1Geometry: THREE.BufferGeometry | undefined,
  mesh2Geometry: THREE.BufferGeometry | undefined,
): Record<string, THREE.Mesh> | undefined {
  if (!meshGeometry && !mesh0Geometry && !mesh1Geometry && !mesh2Geometry) {
    return;
  }

  const materials = createComponentMaterials(component);
  const materialArr = [materials.opaque, materials.glass, materials.additive];

  const meshes: Record<string, THREE.Mesh> = {};
  if (meshGeometry) {
    meshes.mesh = new THREE.Mesh(meshGeometry, materialArr);
  }
  if (mesh0Geometry) {
    meshes.mesh0 = new THREE.Mesh(mesh0Geometry, materialArr);
  }
  if (mesh1Geometry) {
    meshes.mesh1 = new THREE.Mesh(mesh1Geometry, materialArr);
  }
  if (mesh2Geometry) {
    meshes.mesh2 = new THREE.Mesh(mesh2Geometry, materialArr);
  }

  return meshes;
}

function createComponentMaterials(component: VehicleSchemas.ComponentImmutable): SwMaterialSet {
  const materials = createSwMaterials();

  const bc = component.o?.bc ? parseColor(component.o.bc) : undefined;
  const bc2 = component.o?.bc2 ? parseColor(component.o.bc2) : bc;
  const bc3 = component.o?.bc3 ? parseColor(component.o.bc3) : bc;
  applyUniformPatch(materials.uniforms.opaque, {
    blockColor1: { type: "vec4", value: colorToVec4(bc) },
    blockColor2: { type: "vec4", value: colorToVec4(bc2) },
    blockColor3: { type: "vec4", value: colorToVec4(bc3) },
    overrideColor: { type: "int", value: 1 },
  });

  const ac = component.o?.ac ? parseColor(component.o.ac) : { r: 255, g: 255, b: 255 };
  if (ac) {
    materials.additive.vertexColors = false;
    materials.additive.color = new THREE.Color(ac.r / 255, ac.g / 255, ac.b / 255);
  }

  return materials;
}

function combineGeometries(
  geometries: (THREE.BufferGeometry | undefined)[],
  material: THREE.Material | THREE.Material[],
): THREE.Group {
  const group = new THREE.Group();
  for (const geometry of geometries) {
    if (geometry) {
      group.add(new THREE.Mesh(geometry, material));
    }
  }
  return group;
}

function colorToVec4(color: Color | undefined): [number, number, number, number] {
  return [
    (color?.r ?? 255) / 255,
    (color?.g ?? 255) / 255,
    (color?.b ?? 255) / 255,
    (color?.a ?? 255) / 255,
  ];
}
