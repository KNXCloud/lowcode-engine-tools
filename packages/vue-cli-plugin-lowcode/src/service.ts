import type { ProjectOptions, ServicePlugin } from '@vue/cli-service';
import type { Stats } from 'webpack';
import type { LowCodeAssetsConfig, LowCodeNpmInfo, LowCodePluginOptions } from './define';
import fs from 'fs-extra';
import merge from 'webpack-merge';
import _ from 'lodash';
import { basename, relative, dirname } from 'path';
import { formatStats, generateMetaEntry, generateViewEntry } from './utils';
import { LowCodeAssetsWebpackPlugin } from './plugins/assets';

const nonNull = <T>(v: T): v is NonNullable<T> => !!v;

function getPluginOptions(options: ProjectOptions): LowCodePluginOptions {
  return ((options.pluginOptions ?? {}) as any).lowcode ?? {};
}

const servicePlugin: ServicePlugin = (api, options) => {
  const { serve } = api.service.commands;
  const {
    externals = {},
    entry = 'src/index.ts',
    metaDir = dirname(entry),
    library,
    ...restOptions
  } = getPluginOptions(options);

  const npmInfo = Object.assign(
    {
      package: api.service.pkg.name || '',
      version: api.service.pkg.version || '',
      destructuring: true,
    } as LowCodeNpmInfo,
    restOptions.npmInfo
  );

  const assetsConfig = Object.assign(
    {
      baseUrl: 'https://unpkg.com/{name}@{version}',
      groups: [],
      categories: [],
      builtinAssets: {},
    } as LowCodeAssetsConfig,
    restOptions.assetsConfig
  );

  const libName =
    library ||
    (api.service.pkg.name
      ? api.service.pkg.name
          .replace(/[/@-](\w)/g, (_: string, $1: string) => $1.toUpperCase())
          .replace(/^\w/, (s: string) => s.toUpperCase())
      : basename(entry).replace(/\.(jsx?|vue)$/, ''));
  const tempDir = api.resolve('node_modules/.lowcode-builder');
  const metaEntryName = '~entry-meta';
  const viewEntryName = '~entry-components';

  function getConfig(
    chunkName: string,
    entryFile: string,
    globalName: string,
    postfix = ''
  ) {
    const config = api.resolveChainableWebpackConfig();
    if (config.plugins.has('extract-css')) {
      config.plugin('extract-css').tap((args) => {
        args[0].filename = [chunkName, postfix, 'css'].filter(Boolean).join('.');
        return args;
      });
    }
    if (!/(min|prod)/.test(postfix)) {
      config.devtool('cheap-module-source-map');
      config.optimization.minimize(false);
    } else {
      config.devtool(false);
    }
    if (config.plugins.has('html')) {
      config.plugins.delete('html');
    }

    const entryName = [chunkName, postfix].filter(Boolean).join('.');
    config.optimization.merge({
      splitChunks: false,
    });
    config.output.libraryTarget('umd');

    config.module.rule('svg').set('type', 'asset/inline').delete('generator');
    config.module.rule('images').set('type', 'asset/inline').delete('generator');

    const rawConfig = api.resolveWebpackConfig(config);

    rawConfig.externals = [
      ...(Array.isArray(rawConfig.externals)
        ? rawConfig.externals
        : [rawConfig.externals]),
      {
        vue: 'var window.Vue',
        '@knxcloud/lowcode-vue-renderer': 'var window.LCVueRenderer',
        '@knxcloud/lowcode-vue-simulator-renderer': 'var window.LCVueSimulatorRenderer',
        ...externals,
      },
    ].filter(nonNull);

    rawConfig.entry = {
      [entryName]: entryFile,
    };

    rawConfig.output = Object.assign(
      {
        library: globalName,
        libraryTarget: 'umd',
        globalObject: `(typeof self !== 'undefined' ? self : this)`,
      },
      rawConfig.output,
      {
        filename: `${entryName}.js`,
        chunkFilename: `${entryName}.[name].js`,
        publicPath: '',
      }
    );

    return rawConfig;
  }

  api.registerCommand(
    'lowcode:build',
    {
      description: 'build for lowcode component',
      usage: 'vue-cli-service lowcode:build',
    },
    async (args) => {
      const targetDir = api.resolve(options.outputDir || 'dist');
      const { log, logWithSpinner, stopSpinner } = require('@vue/cli-shared-utils');

      log();
      const mode = process.env.BUILD_ENV || api.service.mode;
      logWithSpinner(`Building for ${mode} as library umd...`);

      const entries = {
        view: api.resolve(entry),
        meta: await generateMetaEntry(tempDir, api.resolve(metaDir), npmInfo),
      };
      const relativePath = relative(api.service.context, targetDir);
      const webpackConfig = [
        merge(getConfig('index', entries.view, libName), {
          plugins: [
            new LowCodeAssetsWebpackPlugin({
              ..._.omit(assetsConfig, 'localBaseUrl'),
              npmInfo,
              mode,
              library: libName,
              filename: 'assets.json',
              metaFileName: 'meta.js',
              relativePath: relativePath,
            }),
          ],
        }),
        merge(getConfig('index', entries.view, libName, 'min'), {
          plugins: [
            new LowCodeAssetsWebpackPlugin({
              ..._.omit(assetsConfig, 'localBaseUrl'),
              npmInfo,
              mode,
              library: libName,
              filename: 'assets.min.json',
              metaFileName: 'meta.min.js',
              relativePath: relativePath,
              isProd: true,
            }),
          ],
        }),
        getConfig('meta', entries.meta, `${libName}Meta`),
        getConfig('meta', entries.meta, `${libName}Meta`, 'min'),
      ];

      if (args.clean) {
        await fs.emptyDir(targetDir);
      }

      const webpack = require('webpack');

      return new Promise<void>((resolve, reject) => {
        webpack(webpackConfig, (err: Error, stats: Stats) => {
          stopSpinner(false);
          if (err) {
            return reject(err);
          }

          if (stats.hasErrors()) {
            return reject(new Error('Build failed with errors.'));
          }

          if (!args.silent) {
            const targetDirShort = relative(api.service.context, targetDir);
            log(formatStats(stats, targetDirShort, api));
          }

          resolve();
        });
      });
    }
  );
  api.registerCommand(
    'lowcode:dev',
    {
      description: 'dev for lowcode component',
      usage: 'vue-cli-service lowcode:dev',
    },
    async (args, rawArgs) => {
      const entries = {
        view: await generateViewEntry(tempDir, api.resolve(entry), libName),
        meta: await generateMetaEntry(
          tempDir,
          api.resolve(metaDir),
          npmInfo,
          `${libName}Meta`
        ),
      };
      api.chainWebpack((chain) => {
        if (chain.plugins.has('html')) {
          chain.plugins.delete('html');
        }
        chain.optimization.merge({
          splitChunks: false,
        });
        chain.externals({
          ...externals,
          vue: 'var window.Vue',
          '@knxcloud/lowcode-vue-renderer': 'var window.LCVueRenderer',
          '@knxcloud/lowcode-vue-simulator-renderer': 'var window.LCVueSimulatorRenderer',
        });
        chain.entryPoints.delete('app');
        chain.entry('index').add(viewEntryName).end().entry('meta').add(metaEntryName);
        chain.resolve.alias.merge({
          [viewEntryName]: entries.view,
          [metaEntryName]: entries.meta,
        });
        chain.devServer.allowedHosts.add('all');
        chain.plugin('lowcode-assets').use(LowCodeAssetsWebpackPlugin, [
          {
            localBaseUrl: `http://${devServer.host}:${devServer.port}`,
            ...assetsConfig,
            npmInfo,
            mode: api.service.mode,
            library: libName,
            filename: 'assets.json',
            files: ['index.js'],
            metaFileName: 'meta.js',
            isProd: false,
          },
        ]);

        chain.output.filename('[name].js').chunkFilename('[name].js');

        chain.module.rule('svg').set('type', 'asset/inline').delete('generator');
        chain.module.rule('images').set('type', 'asset/inline').delete('generator');
      });
      return serve.fn(args, rawArgs);
    }
  );

  const devServer = options.devServer || (options.devServer = {});

  devServer.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization',
    ...devServer.headers,
  };

  if (!devServer.port) {
    devServer.port = '9000';
  }

  if (!devServer.host) {
    devServer.host = '127.0.0.1';
  }
};

Object.defineProperty(servicePlugin, 'defaultModes', {
  value: {
    'lowcode:dev': 'development',
    'lowcode:build': 'production',
  },
});

export default servicePlugin;
