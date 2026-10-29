import type { GenerateCodeOptions } from "./generate-code";
import type {
  AttributeTypeRules,
  ForceKindConfig,
  SchemaMergeGroups,
  SchemaOverrides,
} from "./schema";

export * from "./analyzer";
export * from "./schema";
export * from "./generate-code";

export type PredefinedSchemaType = "string" | "number" | "boolean";

export interface PredefinedSchemaProperty {
  type: PredefinedSchemaType;
  optional: boolean;
}

export type PredefinedSchema = {
  kind: "object";
  properties: Record<string, PredefinedSchemaProperty>;
};
/*| {
      kind: "metalist";
      metaProperties: Record<string, PredefinedSchemaProperty>;
      itemTag: string;
      itemType: PredefinedSchemaType;
    }*/

export interface Config extends GenerateCodeOptions {
  readonly input: string | readonly string[];
  readonly out: string;
  readonly predefinedSchemas?: Readonly<Record<string, Readonly<Record<string, PredefinedSchema>>>>;
  readonly forceKind?: ForceKindConfig;
  readonly mergeNumberSuffix?: boolean;
  readonly schemaOverrides?: SchemaOverrides;
  readonly mergeSchemas?: SchemaMergeGroups;
  readonly attributeTypes?: AttributeTypeRules;
}

export type AcceptableConfig = (() => Promise<Config>) | Promise<Config> | (() => Config) | Config;

export async function defineConfig(config: AcceptableConfig): Promise<Config> {
  if (typeof config === "function") {
    return await config();
  } else {
    return await config;
  }
}
