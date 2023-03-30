import type { Compiler } from 'webpack';
import type { LowCodeAssetsConfig, LowCodeNpmInfo } from '../define';
import { Compilation, sources } from 'webpack';
import { join } from 'path';

export interface LowCodeAssetsWebpackPluginOptions extends LowCodeAssetsConfig {
  npmInfo: LowCodeNpmInfo;
  mode: string;
  library: string;
  filename: string;
  metaFileName?: string;
  relativePath?: string;
  files?: string[];
  isProd?: boolean;
  localBaseUrl?: string;
}

function joinUrl(base: string, ...paths: string[]): string {
  if (base.startsWith('http')) {
    const { origin, pathname } = new URL(base);
    return origin + join(pathname, ...paths);
  }
  return join(base, ...paths);
}

function getOrigin(url: string): string {
  const matched = url && url.match(/(https?:)?\/\/([^/]+)/);
  return matched ? matched[0] : '';
}

export class LowCodeAssetsWebpackPlugin {
  constructor(private options: LowCodeAssetsWebpackPluginOptions) {}
  apply(compiler: Compiler) {
    const {
      files,
      baseUrl = '',
      relativePath = '',
      mode,
      filename,
      metaFileName = 'meta.js',
      npmInfo,
      library,
      isProd,
      groups = [],
      categories = [],
      localBaseUrl,
      builtinAssets = {},
    } = this.options;

    const currentBaseUrl = typeof baseUrl === 'string' ? baseUrl : baseUrl[mode];
    const origin = getOrigin(currentBaseUrl);
    const resolveUrl = (file: string) =>
      joinUrl(
        (localBaseUrl || currentBaseUrl)
          .replace(/{name}/g, npmInfo.package ?? '')
          .replace(/{origin}/g, origin)
          .replace(/{version}/g, npmInfo.version ?? ''),
        relativePath,
        file
      );

    compiler.hooks.thisCompilation.tap('lowcode-assets-webpack-plugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'lowcode-assets-webpack-plugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        () => {
          const assets = {
            version: npmInfo.version ?? '',
            packages: [
              ...(builtinAssets?.packages ?? []),
              {
                package: npmInfo.package,
                version: npmInfo.version,
                library,
                urls: (
                  files ??
                  Object.keys(compilation.assets).filter(
                    (file) => !file.endsWith('.map') && !file.endsWith('env-setup.js')
                  )
                ).map((file) => resolveUrl(file)),
              },
            ],
            components: [
              ...(builtinAssets.components ?? []),
              {
                exportName: `${library}Meta`,
                url: resolveUrl(metaFileName),
                package: { npm: npmInfo.package ?? '' },
              },
            ],
            sort: {
              groupList: groups,
              categoryList: categories,
            },
          };
          const source = isProd
            ? JSON.stringify(assets)
            : JSON.stringify(assets, undefined, 2);
          const transformedSource = source
            .replace(/{name}/g, npmInfo.package ?? '')
            .replace(/{origin}/g, origin)
            .replace(/{version}/g, npmInfo.version ?? '');
          compilation.emitAsset(filename, new sources.RawSource(transformedSource));
        }
      );
    });
  }
}
