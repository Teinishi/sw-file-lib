export * from "./analyzer";
export * from "./generate-code";

export interface Config {
  input: string | string[];
  outDir: string;
}

export type AcceptableConfig = Config | (() => Config) | Promise<Config> | (() => Promise<Config>);

export function defineConfig(config: AcceptableConfig): AcceptableConfig {
  return config;
}
