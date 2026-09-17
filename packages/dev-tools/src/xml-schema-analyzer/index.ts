export * from "./analyzer";
export * from "./generate-code";

export type PredefinedSchemaType =
  | "string"
  | "number"
  | "boolean"
  | PredefinedSchema
  | PredefinedSchemaType[];

export interface PredefinedSchemaProperty {
  type: PredefinedSchemaType;
  optional: boolean;
}

export type PredefinedSchema =
  | {
      kind: "object";
      properties: Record<string, PredefinedSchemaProperty>;
    }
  | {
      kind: "list";
      itemTag: string;
      itemType: PredefinedSchemaType;
    }
  | {
      kind: "metalist";
      metaProperties: Record<string, PredefinedSchemaProperty>;
      itemTag: string;
      itemType: PredefinedSchemaType;
    };

export interface PredefinedSchemaFile {
  importPath?: string;
  schemas: Record<string, PredefinedSchema>;
}

export interface Config {
  input: string | string[];
  outDir: string;
  forceOptional?: boolean;
  predefinedSchemas?: PredefinedSchemaFile[];
  forceKind?: Record<string, "object" | "list" | "metalist">;
}

export type AcceptableConfig = (() => Promise<Config>) | Promise<Config> | (() => Config) | Config;

export async function defineConfig(config: AcceptableConfig): Promise<Config> {
  if (typeof config === "function") {
    return await config();
  } else {
    return await config;
  }
}
