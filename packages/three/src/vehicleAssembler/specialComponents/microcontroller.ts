import * as THREE from "three";
import type { VehicleSchemas } from "@sw-file-lib/xml";
import type { VehicleAssetResolver } from "../assetResolver";
import { combineGeometries, createMaterialsForComponent } from "../utils";

const MICROCONTROLLER_CORNER_MESH = "meshes/component_microprocessor_corner.mesh";
const MICROCONTROLLER_EDGE_MESH = "meshes/component_microprocessor_edge.mesh";
const MICROCONTROLLER_TOP_MESH = "meshes/component_microprocessor_top.mesh";
const MICROCONTROLLER_TOP_CORNER_MESH = "meshes/component_microprocessor_top_corner.mesh";
const MICROCONTROLLER_TOP_EDGE_MESH = "meshes/component_microprocessor_top_edge.mesh";

export async function assembleMicrocontroller(
  componentInstance: VehicleSchemas.ComponentImmutable,
  assets: VehicleAssetResolver,
) {
  const microcontroller = componentInstance.o?.microprocessor_definition;
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

  const { materialArr } = createMaterialsForComponent(componentInstance);

  const group = new THREE.Group();

  const cornerMesh = await assets.resolveMesh(MICROCONTROLLER_CORNER_MESH);
  const topCornerMesh = await assets.resolveMesh(MICROCONTROLLER_TOP_CORNER_MESH);
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

  const edgeMesh = await assets.resolveMesh(MICROCONTROLLER_EDGE_MESH);
  const topEdgeMesh = await assets.resolveMesh(MICROCONTROLLER_TOP_EDGE_MESH);
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

  const topMesh = await assets.resolveMesh(MICROCONTROLLER_TOP_MESH);
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

  return { surfaces, objects: [group] };
}
