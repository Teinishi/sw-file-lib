export * from "./analyzer";
export * from "./generate-code";

export type PredefinedSchemaType =
  | "string"
  | "number"
  | "boolean"
  | PredefinedSchema
  | PredefinedSchemaType[];

export type PredefinedSchema = {
  kind: "object";
  properties: Record<
    string,
    {
      type: PredefinedSchemaType;
      optional: boolean;
    }
  >;
};

export interface Config {
  input: string | string[];
  outDir: string;
  predefinedSchemas?: {
    importPath?: string;
    schemas: Record<string, PredefinedSchema>;
  }[];
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
