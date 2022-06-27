const { existsSync } = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const glob = require('fast-glob');
const isWsl = require('is-wsl');
const { DefinePlugin } = require('webpack');
const VirtualModulesPlugin = require('webpack-virtual-modules');
const { VueLoaderPlugin } = require('vue-loader');
const { getWebpackConfig } = require('build-scripts-config');

const { SUPPORTED_COMMAND, COMMON_EXTERNALS } = require('./constants');
const userWebpackConfig = require('./config/user-config');
const {
  slash,
  upperFirst,
  parseNpmName,
  asyncDebounce,
  resolveBabelOptions,
} = require('./utils');

const { debug } = console;

let PARSED_NPM_NAME;

module.exports = async (options, pluginOptions) => {
  const { rootDir, command, pkg: package } = options.context;
  const { registerUserConfig } = options;

  if (!SUPPORTED_COMMAND.includes(command)) {
    debug('Command %s not supported.', command);
    return;
  }

  if (!PARSED_NPM_NAME) {
    PARSED_NPM_NAME = parseNpmName(package.name);
  }

  registerUserConfig(userWebpackConfig);

  const mode = command === 'start' ? 'development' : 'production';

  if (mode === 'production') {
    await debounceBuild(options, pluginOptions, true);
    return;
  }
  await debounceStart(options, pluginOptions);
  const watchPattern = path.resolve(rootDir, 'src/**/**');
  const watcher = chokidar.watch(watchPattern);
  ['add', 'change', 'unlink'].forEach((item) => {
    watcher.on(item, async () => {
      await debounceStart(options, pluginOptions);
    });
  });
};

const debounceBuild = asyncDebounce(build, 300);
const debounceStart = asyncDebounce(start, 300);

async function build(options, pluginOptions) {
  await Promise.all([
    bundleViewChunk(options, pluginOptions),
    bundleMetaChunk(options, pluginOptions),
  ]);
}

async function start(options, pluginOptions) {
  const { rootDir, userConfig } = options.context;
  const { registerTask, getAllTask, onGetWebpackConfig } = options;
  const { viewPath, metaDir, disableStyleLoader } = pluginOptions || {};
  const { library = PARSED_NPM_NAME.uniqueName, externals = {} } = userConfig || {};

  const viewJsPath = getViewEntryPath(rootDir, viewPath);
  let metaPath = metaDir && path.resolve(rootDir, metaDir);
  if (!metaPath) {
    metaPath = path.dirname(viewJsPath);
  }

  if (getAllTask().includes('lowcode-dev')) return;

  registerTask('lowcode-dev', getWebpackConfig('development'));

  const viewEntry = 'view-entry.js';
  const viewGlobalName = library;
  const viewEntryCode = `import * as view from '${slash(viewJsPath)}'
window['${viewGlobalName}'] = Object.assign({ __esModule: true }, view)`;

  const metaEntry = 'meta-entry.js';
  const metaGlobalName = `${library}Meta`;
  const metaEntryCode = await generateMetaEntryCode(
    metaPath,
    ['**/meta.{js,ts}', '**/meta/index.{js,ts}'],
    metaGlobalName
  );

  onGetWebpackConfig('lowcode-dev', (chain) => {
    chain.plugin('virtual-module').use(VirtualModulesPlugin, [
      {
        [`node_modules/${metaEntry}`]: metaEntryCode,
        [`node_modules/${viewEntry}`]: viewEntryCode,
      },
    ]);

    chain.merge({
      entry: { meta: metaEntry, view: viewEntry },
    });

    chain.devServer.set('transportMode', 'ws');
    chain.devServer.headers({ 'Access-Control-Allow-Origin': '*' });

    // WSL 环境下正常的文件 watch 失效，需切换为 poll 模式
    if (isWsl) {
      chain.merge({
        devServer: {
          watchOptions: {
            poll: 1000,
          },
        },
      });
    }
    chain.externals({ ...COMMON_EXTERNALS, ...externals });
    applyVueHandler(chain, rootDir);
    !disableStyleLoader && useStyleLoader(chain);
  });
}

async function bundleMetaChunk(options, pluginOptions) {
  const { rootDir, userConfig } = options.context;
  const { registerTask, getAllTask, onGetWebpackConfig } = options;

  const { viewPath, metaDir } = pluginOptions || {};

  const { library = PARSED_NPM_NAME.uniqueName, externals = {} } = userConfig || {};

  let metaPath = metaDir && path.resolve(rootDir, metaDir);
  if (!metaPath) {
    const viewJsPath = getViewEntryPath(rootDir, viewPath);
    metaPath = path.dirname(viewJsPath);
  }

  if (getAllTask().includes('lowcode-meta')) return;

  registerTask('lowcode-meta', getWebpackConfig('production'));

  const metaEntryCode = await generateMetaEntryCode(metaPath, [
    '**/meta.{js,ts}',
    '**/meta/index.{js,ts}',
  ]);
  const metaEntry = 'meta-entry.js';
  const metaGlobalName = `${library}Meta`;

  onGetWebpackConfig('lowcode-meta', (chain) => {
    chain.plugin('virtual-module').use(VirtualModulesPlugin, [
      {
        [`node_modules/${metaEntry}`]: metaEntryCode,
      },
    ]);

    chain.merge({
      entry: { meta: metaEntry },
    });
    chain.externals({ ...COMMON_EXTERNALS, ...externals });
    chain.output.library(metaGlobalName).libraryTarget('umd');
    applyVueHandler(chain, rootDir);
  });
}

function bundleViewChunk(options, pluginOptions) {
  const { rootDir, userConfig } = options.context;
  const { registerTask, getAllTask, onGetWebpackConfig } = options;

  const { viewPath } = pluginOptions || {};

  const { library = PARSED_NPM_NAME.uniqueName, externals = {} } = userConfig || {};

  const viewJsPath = getViewEntryPath(rootDir, viewPath);

  if (getAllTask().includes('lowcode-view')) return;

  registerTask('lowcode-view', getWebpackConfig('production'));

  onGetWebpackConfig('lowcode-view', (chain) => {
    chain.merge({
      entry: { view: viewJsPath },
    });
    chain.externals({ ...COMMON_EXTERNALS, ...externals });
    chain.output.library(library).libraryTarget('umd');
    applyVueHandler(chain, rootDir);
  });
}

function getEntryPath(rootDir, entryPath, defaults) {
  let absoluteEntryPath = entryPath && path.resolve(rootDir, entryPath);

  if (!absoluteEntryPath || !existsSync(absoluteEntryPath)) {
    for (let i = 0; i < defaults.length; i++) {
      absoluteEntryPath = path.resolve(rootDir, defaults[i]);
      if (existsSync(absoluteEntryPath)) {
        break;
      }
    }
  }

  return absoluteEntryPath;
}

function getViewEntryPath(rootDir, entryPath) {
  return getEntryPath(rootDir, entryPath, [
    `./src/index.ts`,
    `./src/index.tsx`,
    `./src/index.js`,
    `./src/index.jsx`,
    `./components/index.js`,
    `./components/index.jsx`,
    `./components/index.ts`,
    `./components/index.tsx`,
  ]);
}

async function generateMetaEntryCode(metaDir, pattern, globalName) {
  const metaFiles = await glob(pattern, {
    cwd: slash(metaDir),
    unique: true,
    absolute: true,
    onlyFiles: true,
  });

  const imports = metaFiles.reduce((res, file, idx) => {
    res[`meta${idx}`] = file;
    return res;
  }, {});

  const importCode = Object.keys(imports)
    .map((name) => `import ${name} from "${slash(imports[name])}"`)
    .join('\n');

  return `${importCode}
const components = [${Object.keys(imports).join(',')}];
${
  !globalName
    ? 'export { components }'
    : `window['${globalName}'] = Object.assign({ __esModule: true }, { components })`
}`;
}

function applyVueHandler(chain, rootDir) {
  chain.module
    .rule('vue')
    .test(/\.vue$/)
    .use('vue-loader')
    .loader(require.resolve('vue-loader'))
    .options({
      babelParserPlugins: ['jsx'],
    });

  chain.module
    .rule('esm')
    .test(/\.m?jsx?$/)
    .type('javascript/auto');

  const babelOptions = resolveBabelOptions(rootDir);

  chain.module
    .rule('jsx')
    .exclude.clear()
    .add(/node_modules/)
    .end()
    .test(/\.jsx?$/)
    .uses.clear()
    .end()
    .use('babel-loader')
    .loader(require.resolve('babel-loader'))
    .options(babelOptions);

  chain.module.noParse(/^(vue|vue-router|vuex|vuex-router-sync)$/);

  chain.resolve.alias.set('vue$', 'vue/dist/vue.runtime.esm-bundler.js');

  ['ts', 'tsx'].forEach((ext) => {
    chain.module
      .rule(ext)
      .exclude.clear()
      .add(/node_modules/)
      .end()
      .test(new RegExp(`\\.${ext}$`))
      .uses.clear()
      .end()
      .use('babel-loader')
      .loader(require.resolve('babel-loader'))
      .options(babelOptions)
      .end()
      .use('ts-loader')
      .loader(require.resolve('ts-loader'))
      .options({
        transpileOnly: true,
        [`append${upperFirst(ext)}SuffixTo`]: [/\.vue$/],
      });
  });

  chain.module
    .rule('vue-style')
    .test(/\.vue$/)
    .resourceQuery(/type=style/)
    .set('sideEffects', true);

  chain.plugin('vue').use(VueLoaderPlugin);

  chain.plugin('feature-flags').use(DefinePlugin, [
    {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },
  ]);
}

function useStyleLoader(chain) {
  const cssRule = chain.module.rule('css');
  const scssRule = chain.module.rule('scss');
  const scssModuleRule = chain.module.rule('scss-module');
  const lessRule = chain.module.rule('less');
  const lessModuleRule = chain.module.rule('less-module');
  cssRule.uses.delete('MiniCssExtractPlugin.loader');
  scssRule.uses.delete('MiniCssExtractPlugin.loader');
  scssModuleRule.uses.delete('MiniCssExtractPlugin.loader');
  lessRule.uses.delete('MiniCssExtractPlugin.loader');
  lessModuleRule.uses.delete('MiniCssExtractPlugin.loader');
  cssRule.use('vue-style-loader').loader('vue-style-loader').before('css-loader');
  scssRule.use('vue-style-loader').loader('vue-style-loader').before('css-loader');
  scssModuleRule.use('vue-style-loader').loader('vue-style-loader').before('css-loader');
  lessRule.use('vue-style-loader').loader('vue-style-loader').before('css-loader');
  lessModuleRule.use('vue-style-loader').loader('vue-style-loader').before('css-loader');
}
