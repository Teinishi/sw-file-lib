import type { DeepReadonly, StrictOmit } from "ts-essentials";
import { type Vec3, maxVec3, minVec3, vec3ToMap } from "@core";
import type { LogicNode, Surface, Voxel } from "../types";
import {
  XmlWriter,
  type XmlAttributes,
  type XmlAttributeValue,
  type XmlWriterOptions,
} from "../writer/XmlWriter";

function splitAttrsAndChildrenOfSurface(surface: DeepReadonly<Surface>) {
  return {
    attrs: new Map<string, boolean | number | undefined>([
      ["orientation", surface.orientation],
      ["shape", surface.shape],
      ["rotation", surface.rotation],
      ["trans_type", surface.transType],
      ["flags", surface.flags],
      ["is_reverse_normals", surface.isReverseNormals],
      ["is_two_sided", surface.isTwoSided],
    ]),
    children: surface.position ? [{ tagName: "position", attrs: vec3ToMap(surface.position) }] : [],
  };
}

function splitAttrsAndChildrenOfLogicNode(logicNode: DeepReadonly<LogicNode>) {
  return {
    attrs: new Map<string, number | string | undefined>([
      ["orientation", logicNode.orientation],
      ["label", logicNode.label],
      ["mode", logicNode.mode],
      ["type", logicNode.type],
      ["description", logicNode.description],
    ]),
    children: logicNode.position
      ? [{ tagName: "position", attrs: vec3ToMap(logicNode.position) }]
      : [],
  };
}

function splitAttrsAndChildrenOfVoxel(voxel: DeepReadonly<Voxel>) {
  return {
    attrs: new Map<string, number | undefined>([
      ["flags", voxel.flags],
      ["physics_shape", voxel.physicsShape],
      ["buoy_pipes", voxel.buoyPipes],
    ]),
    children: voxel.position ? [{ tagName: "position", attrs: vec3ToMap(voxel.position) }] : [],
  };
}

function forVoxels(from: Readonly<Vec3>, to: Readonly<Vec3>, callback: (position: Vec3) => void) {
  const { x: x1, y: y1, z: z1 } = minVec3(from, to);
  const { x: x2, y: y2, z: z2 } = maxVec3(from, to);

  for (let z = z1; z <= z2; z++) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        callback({ x, y, z });
      }
    }
  }
}

export class ComponentDefinitionBuilder {
  private attrs: Map<string, XmlAttributeValue> = new Map();
  private surfaces: Surface[] = [];
  private buoyancySurfaces: Surface[] = [];
  private logicNodes: LogicNode[] = [];
  private voxels: Voxel[] = [];
  private elements: { tagName: string; attrs: DeepReadonly<XmlAttributes> }[] = [];

  addAttribute(name: string, value: XmlAttributeValue) {
    this.attrs.set(name, value);
  }

  addSurfaces(
    from: Readonly<Vec3>,
    to: Readonly<Vec3>,
    options?: Readonly<StrictOmit<Surface, "position">>,
  ) {
    forVoxels(from, to, (position) => {
      this.surfaces.push({
        position,
        ...options,
      });
    });
  }

  addBuoyancySurfaces(
    from: Readonly<Vec3>,
    to: Readonly<Vec3>,
    options?: Readonly<StrictOmit<Surface, "position">>,
  ) {
    forVoxels(from, to, (position) => {
      this.buoyancySurfaces.push({
        position,
        ...options,
      });
    });
  }

  addLogicNode(logicNode: DeepReadonly<LogicNode>) {
    this.logicNodes.push(logicNode);
  }

  addVoxels(
    from: Readonly<Vec3>,
    to: Readonly<Vec3>,
    options?: Readonly<StrictOmit<Voxel, "position">>,
  ) {
    forVoxels(from, to, (position) => {
      this.voxels.push({
        position,
        ...options,
      });
    });
  }

  addSurfacesCuboid(
    from: Readonly<Vec3>,
    to: Readonly<Vec3>,
    orientations: number[],
    options?: Readonly<StrictOmit<Surface, "position" | "orientation">>,
  ) {
    this.forCuboidSurfaces(from, to, (a, b, orientation) => {
      if (!orientations.includes(orientation)) return;
      this.addSurfaces(a, b, { orientation, ...options });
    });
  }

  addBuoyancySurfacesCuboid(
    from: Readonly<Vec3>,
    to: Readonly<Vec3>,
    orientations: number[],
    options?: Readonly<StrictOmit<Surface, "position" | "orientation">>,
  ) {
    this.forCuboidSurfaces(from, to, (a, b, orientation) => {
      if (!orientations.includes(orientation)) return;
      this.addBuoyancySurfaces(a, b, { orientation, ...options });
    });
  }

  private forCuboidSurfaces(
    from: Readonly<Vec3>,
    to: Readonly<Vec3>,
    callback: (from: Vec3, to: Vec3, orientation: number) => void,
  ) {
    const min = minVec3(from, to);
    const max = maxVec3(from, to);
    callback({ ...min, x: max.x }, max, 0);
    callback(min, { ...max, x: min.x }, 1);
    callback({ ...min, y: max.y }, max, 2);
    callback(min, { ...max, y: min.y }, 3);
    callback({ ...min, z: max.z }, max, 4);
    callback(min, { ...max, z: min.z }, 5);
  }

  addElement(tagName: string, attrs: DeepReadonly<XmlAttributes>) {
    this.elements.push({ tagName, attrs });
  }

  toXml(options?: XmlWriterOptions) {
    const writer = new XmlWriter(options);

    writer.begin("definition", this.attrs);

    this.writeList(
      writer,
      "surfaces",
      "surface",
      this.surfaces.map(splitAttrsAndChildrenOfSurface),
    );
    this.writeList(
      writer,
      "buoyancy_surfaces",
      "surface",
      this.buoyancySurfaces.map(splitAttrsAndChildrenOfSurface),
    );
    this.writeList(
      writer,
      "logic_nodes",
      "logic_node",
      this.logicNodes.map(splitAttrsAndChildrenOfLogicNode),
    );
    this.writeList(writer, "voxels", "voxel", this.voxels.map(splitAttrsAndChildrenOfVoxel));

    const voxelBounds = this.getVoxelBounds();
    if (voxelBounds) {
      if (!this.hasElement("voxel_min")) {
        writer.empty("voxel_min", vec3ToMap(voxelBounds.min));
      }
      if (!this.hasElement("voxel_max")) {
        writer.empty("voxel_max", vec3ToMap(voxelBounds.max));
      }
    }

    const voxelPhysicsBounds = this.getVoxelBounds();
    if (voxelPhysicsBounds) {
      if (!this.hasElement("voxel_physics_min")) {
        writer.empty("voxel_physics_min", vec3ToMap(voxelPhysicsBounds.min));
      }
      if (!this.hasElement("voxel_physics_max")) {
        writer.empty("voxel_physics_max", vec3ToMap(voxelPhysicsBounds.max));
      }
    }

    for (const element of this.elements) {
      writer.empty(element.tagName, element.attrs);
    }

    writer.end("definition");

    return writer.toString();
  }

  private writeList(
    writer: XmlWriter,
    listName: string,
    itemName: string,
    items: DeepReadonly<
      { attrs?: XmlAttributes; children?: { tagName: string; attrs: XmlAttributes }[] }[]
    >,
  ) {
    if (items.length == 0) return;

    writer.begin(listName);

    for (const { attrs, children } of items) {
      writer.element(itemName, attrs, (writer) => {
        for (const child of children ?? []) {
          writer.empty(child.tagName, child.attrs);
        }
      });
    }

    writer.end(listName);
  }

  private getVoxelBounds(filter?: (voxel: DeepReadonly<Voxel>) => boolean) {
    const arr = filter ? this.voxels.filter(filter) : this.voxels;

    let min, max;

    for (const { position } of arr) {
      const x = position?.x ?? 0;
      const y = position?.y ?? 0;
      const z = position?.z ?? 0;

      if (min === undefined) min = { x, y, z };
      else {
        min.x = Math.min(min.x, x);
        min.y = Math.min(min.y, y);
        min.z = Math.min(min.z, z);
      }
      if (max === undefined) max = { x, y, z };
      else {
        max.x = Math.max(max.x, x);
        max.y = Math.max(max.y, y);
        max.z = Math.max(max.z, z);
      }
    }

    if (min === undefined || max === undefined) return null;
    return { min, max };
  }

  private hasElement(name: string) {
    return this.elements.findIndex((e) => e.tagName === name) !== -1;
  }
}
