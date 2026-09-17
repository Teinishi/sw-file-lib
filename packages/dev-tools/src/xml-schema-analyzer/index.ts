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
  readonly importPath?: string;
  readonly schemas: Record<string, PredefinedSchema>;
}

export interface Config {
  readonly input: string | readonly string[];
  readonly out: string;
  readonly forceOptional?: boolean;
  readonly predefinedSchemas?: readonly PredefinedSchemaFile[];
  readonly forceKind?: Record<string, "object" | "list" | "metalist">;
}

export type AcceptableConfig = (() => Promise<Config>) | Promise<Config> | (() => Config) | Config;

export async function defineConfig(config: AcceptableConfig): Promise<Config> {
  if (typeof config === "function") {
    return await config();
  } else {
    return await config;
  }
}
