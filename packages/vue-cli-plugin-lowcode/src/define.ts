export interface LowCodePluginOptions {
  entry?: string;
  metaDir?: string;
  library?: string;
  npmInfo?: LowCodeNpmInfo;
  externals?: Record<string, string>;
  assetsConfig?: LowCodeAssetsConfig;
}

export interface LowCodeAssetsConfig {
  baseUrl?: string | Record<string, string>;
  localBaseUrl?: string;
  groups?: string[];
  categories?: string[];
  builtinAssets?: BuiltinAssets;
}

export interface LowCodeNpmInfo {
  package?: string;
  version?: string;
  destructuring?: boolean;
}

export interface BuiltinAssets {
  packages?: unknown[];
  components?: unknown[];
}

export function defineLowCodePluginOption(
  options: LowCodePluginOptions
): LowCodePluginOptions {
  return options;
}
