import * as THREE from "three";
import { parseMesh, type BinaryReaderInput } from "@sw-file-lib/core";
import { parseComponentDefinitionXml, type ComponentDefinitionImmutable } from "@sw-file-lib/xml";
import { createSwMeshGeometry } from "../mesh";

/**
 * Resolves a component definition from its component ID.
 *
 * Returns `undefined` if the component definition cannot be found.
 */
export type ComponentDefinitionResolver = (
  componentId: string | undefined,
) => Promise<ComponentDefinitionImmutable | undefined>;

/**
 * Resolves a Three.js geometry from a Stormworks mesh path.
 *
 * Returns `undefined` if the mesh asset cannot be found.
 */
export type MeshResolver = (meshPath: string) => Promise<THREE.BufferGeometry | undefined>;

/**
 * Asset resolver used by {@link VehicleBodyAssembler}.
 *
 * This interface provides parsed component definitions and mesh geometries,
 * allowing applications to load assets from any source such as the local
 * filesystem, HTTP, IndexedDB, or an in-memory cache.
 */
export interface VehicleAssetResolver {
  /** Resolves a parsed component definition. */
  resolveComponentDefinition: ComponentDefinitionResolver;
  /** Resolves a parsed mesh geometry. */
  resolveMesh: MeshResolver;
}

/**
 * Creates a {@link VehicleAssetResolver} from raw asset providers.
 *
 * The returned resolver automatically parses XML component definitions,
 * converts Stormworks mesh files into `THREE.BufferGeometry`, and
 * caches the results so each asset is loaded and parsed at most once.
 *
 * This is the recommended way to construct a resolver for {@link VehicleBodyAssembler}.
 *
 * @param getComponentDefinitionFile Returns the XML source of a component
 * definition.
 * @param getMeshFile Returns the binary contents of a Stormworks mesh file.
 * @returns A cached asset resolver.
 */
export function createVehicleAssetResolver(
  getComponentDefinitionFile: (
    componentId: string,
  ) =>
    | Promise<string | Uint8Array<ArrayBuffer> | undefined>
    | string
    | Uint8Array<ArrayBuffer>
    | undefined,
  getMeshFile: (
    meshPath: string,
  ) => Promise<BinaryReaderInput | undefined> | BinaryReaderInput | undefined,
): VehicleAssetResolver {
  return {
    resolveComponentDefinition: withCache(async (componentId) => {
      const data = await getComponentDefinitionFile(componentId ?? "01_block");
      if (!data) return undefined;
      return parseComponentDefinitionXml(data);
    }),
    resolveMesh: withCache(async (meshPath) => {
      const data = await getMeshFile(meshPath);
      if (!data) return undefined;
      return createSwMeshGeometry(parseMesh(data));
    }),
  };
}

/**
 * Wraps an asynchronous resolver with memoization.
 *
 * The returned function caches both completed results and in-flight promises,
 * ensuring that concurrent requests for the same key share a single operation.
 *
 * @param resolver The resolver to memoize.
 * @returns A cached resolver.
 */
export function withCache<K, V>(resolver: (key: K) => Promise<V>): (key: K) => Promise<V> {
  const cache = new Map<K, Promise<V>>();

  return (key) => {
    let value = cache.get(key);
    if (!value) {
      value = Promise.resolve(resolver(key));
      cache.set(key, value);
    }
    return value;
  };
}
