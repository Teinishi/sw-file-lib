export interface ComponentModAsset {
  name: string; // filename of the asset
  data: string | Uint8Array; // payload
}

export interface ComponentMod {
  name?: string; // name of the component
  definition: string; // definition XML
  assets: ComponentModAsset[]; // assets to bundle in the bin file
}

export interface ParsedComponentModAsset {
  name: string;
  data: Uint8Array;
  dataSize: number;
}

// Until Stormworks v1.15.10, component bin file didn't contain the name
export interface ParsedComponentModV0 {
  version: 0;
  dataSize: number;
  definition: string;
  assets: ParsedComponentModAsset[];
}

// Since Stormworks v1.15.11, component bin file contains the name
export interface ParsedComponentModV1 {
  version: 1;
  dataSize: number;
  name: string;
  definition: string;
  assets: ParsedComponentModAsset[];
}

// used for return type of componentBinFromBytes function
export type ParsedComponentMod = ParsedComponentModV0 | ParsedComponentModV1;
