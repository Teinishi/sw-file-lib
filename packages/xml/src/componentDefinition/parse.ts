import * as z from "zod";
import { partialToFullVec3, type Mat3, type Vec3 } from "@internalUtils";
import {
  getElementList,
  getSingletonByName,
  getSingletonByNameOptional,
  parseXml,
  type XmlElement,
} from "../utils/xmlParse";

const PositionElementSchema = z.object({
  name: z.literal("position"),
  attributes: z
    .object({
      x: z.coerce.number(),
      y: z.coerce.number(),
      z: z.coerce.number(),
    })
    .partial(),
});

const PhysicsShapeRotationElementSchema = z.object({
  name: z.literal("physics_shape_rotation"),
  attributes: z
    .object({
      "00": z.coerce.number().int(),
      "01": z.coerce.number().int(),
      "02": z.coerce.number().int(),
      "10": z.coerce.number().int(),
      "11": z.coerce.number().int(),
      "12": z.coerce.number().int(),
      "20": z.coerce.number().int(),
      "21": z.coerce.number().int(),
      "22": z.coerce.number().int(),
    })
    .partial(),
});

const SurfaceElementSchema = z.object({
  name: z.literal("surface"),
  attributes: z
    .object({
      orientation: z.coerce
        .number()
        .pipe(
          z.union([
            z.literal(0),
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
          ]),
        ),
      rotation: z.coerce
        .number()
        .pipe(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])),
      shape: z.coerce.number().int().nonnegative(),
      trans_type: z.coerce.number().pipe(z.union([z.literal(0), z.literal(1), z.literal(2)])),
      flags: z.coerce.number().int().nonnegative(),
      is_reverse_normals: z.coerce.boolean(),
      is_two_sided: z.coerce.boolean(),
    })
    .partial(),
  children: z.array(PositionElementSchema),
});

const VoxelElementSchema = z.object({
  name: z.literal("voxel"),
  attributes: z
    .object({
      flags: z.coerce.number().int().nonnegative(),
      physics_shape: z.coerce.number().int().nonnegative(),
      buoy_pipes: z.coerce.number().int().nonnegative(),
    })
    .partial()
    .optional(),
  children: z.array(
    z.discriminatedUnion("name", [PositionElementSchema, PhysicsShapeRotationElementSchema]),
  ),
});

export interface ParsedComponentSurface {
  orientation?: 0 | 1 | 2 | 3 | 4 | 5;
  rotation?: 0 | 1 | 2 | 3;
  shape?: number;
  transType?: 0 | 1 | 2;
  flags?: number;
  isReverseNormals?: boolean;
  isTwoSided?: boolean;
  position: Partial<Vec3>;
}

export interface ParsedComponentVoxel {
  flags?: number;
  physicsShape?: number;
  buoyPipes?: number;
  position: Partial<Vec3>;
  physicsShapeRotation: Partial<Mat3>;
}

export interface ParsedComponentDefinition {
  attributes: Record<string, string>;
  surfaces: ParsedComponentSurface[];
  buoyancySurfaces: ParsedComponentSurface[];
  voxels: ParsedComponentVoxel[];
}

function transformSurfaceElement(el: XmlElement): ParsedComponentSurface {
  const { attributes, children } = SurfaceElementSchema.parse(el);
  return {
    orientation: attributes.orientation,
    rotation: attributes.rotation,
    shape: attributes.shape,
    transType: attributes.trans_type,
    flags: attributes.flags,
    isReverseNormals: attributes.is_reverse_normals,
    isTwoSided: attributes.is_two_sided,
    position: partialToFullVec3(getSingletonByNameOptional(children, "position")?.attributes),
  };
}

function attributesToMat3(
  val?: Partial<{
    "00": number;
    "01": number;
    "02": number;
    "10": number;
    "11": number;
    "12": number;
    "20": number;
    "21": number;
    "22": number;
  }>,
): Mat3 {
  return [
    val?.["00"] ?? 1,
    val?.["01"] ?? 0,
    val?.["02"] ?? 0,
    val?.["10"] ?? 0,
    val?.["11"] ?? 1,
    val?.["12"] ?? 0,
    val?.["20"] ?? 0,
    val?.["21"] ?? 0,
    val?.["22"] ?? 1,
  ];
}

function transformVoxelElement(el: XmlElement): ParsedComponentVoxel {
  const { attributes, children } = VoxelElementSchema.parse(el);
  return {
    flags: attributes?.flags,
    physicsShape: attributes?.physics_shape,
    buoyPipes: attributes?.buoy_pipes,
    position: partialToFullVec3(getSingletonByNameOptional(children, "position")?.attributes),
    physicsShapeRotation: attributesToMat3(
      getSingletonByNameOptional(children, "physics_shape_rotation")?.attributes,
    ),
  };
}

export function parseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBufferLike>,
): ParsedComponentDefinition {
  const parsed = parseXml(input);

  const definition = getSingletonByName(parsed, "definition");

  const { attributes, children } = definition;

  const surfaces = getElementList(children, "surfaces").map(transformSurfaceElement);
  const buoyancySurfaces = getElementList(children, "buoyancy_surfaces").map(
    transformSurfaceElement,
  );
  const voxels = getElementList(children, "voxels").map(transformVoxelElement);

  return {
    attributes,
    surfaces,
    buoyancySurfaces,
    voxels,
  };
}
