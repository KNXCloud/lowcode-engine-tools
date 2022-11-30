import type { Stats, StatsAsset } from 'webpack';
import type { PluginAPI } from '@vue/cli-service';
import type { LowCodeNpmInfo } from './define';
import glob from 'fast-glob';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';

export function slash(str: string) {
  return str && str.replace(/\\/g, '/');
}

export async function generateViewEntry(dir: string, file: string, globalName?: string) {
  const compEntryPath = join(dir, 'view-entry.js');

  const code = `import * as view from '${slash(file)}'
window['${globalName}'] = Object.assign({ __esModule: true }, view)`;

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(compEntryPath, code);
  return compEntryPath;
}

export async function generateMetaEntry(
  dir: string,
  context: string,
  npmInfo: LowCodeNpmInfo,
  globalName?: string
): Promise<string> {
  const files = await glob('**/meta.{js,jsx,ts,tsx}', {
    cwd: slash(context),
    absolute: true,
    onlyFiles: true,
    ignore: ['node_modules'],
  });
  const imports = files.reduce((res, file, idx) => {
    res[`meta${idx}`] = file;
    return res;
  }, {} as Record<string, string>);

  const importCode = Object.keys(imports)
    .map((name) => `import ${name} from "${slash(imports[name])}"`)
    .join('\n');

  const code = `${importCode}
const npmInfo = ${JSON.stringify(npmInfo)};
const components = [${Object.keys(imports).join(',')}];
components.forEach((item) => {
  if (!item.npm) {
    item.npm = {
      ...npmInfo,
      componentName: item.componentName,
    }
  } else {
    item.npm = {
      ...npmInfo,
      ...item.npm,
    }
  }
})
${
  !globalName
    ? 'export { components }'
    : `window['${globalName}'] = Object.assign({ __esModule: true }, { components })`
}`;

  const metaEntryPath = join(dir, 'meta-entry.js');

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(metaEntryPath, code);

  return metaEntryPath;
}

export function formatStats(stats: Stats, dir: string, api: PluginAPI) {
  const fs = require('fs');
  const path = require('path');
  const zlib = require('zlib');
  const ui = require('cliui')({ width: process.stdout.columns || 80 });
  const { chalk } = require('@vue/cli-shared-utils');

  const json = stats.toJson({
    hash: false,
    modules: false,
    chunks: false,
  });

  let assets = json.assets
    ? json.assets
    : json.children?.reduce(
        (acc, child) => acc.concat(child.assets ?? []),
        [] as StatsAsset[]
      ) ?? [];

  const seenNames = new Map();
  const isJS = (val: string) => /\.js$/.test(val);
  const isCSS = (val: string) => /\.css$/.test(val);
  const isJSON = (val: string) => /\.json$/.test(val);
  const isMinJS = (val: string) => /\.(min|prod)\.js$/.test(val);
  assets = assets
    .map((a) => {
      a.name = a.name.split('?')[0];
      return a;
    })
    .filter((a) => {
      if (seenNames.has(a.name)) {
        return false;
      }
      seenNames.set(a.name, true);
      return isJS(a.name) || isCSS(a.name) || isJSON(a.name);
    })
    .sort((a, b) => {
      if (isJS(a.name) && isCSS(b.name)) return -1;
      if (isCSS(a.name) && isJS(b.name)) return 1;
      if (isMinJS(a.name) && !isMinJS(b.name)) return -1;
      if (!isMinJS(a.name) && isMinJS(b.name)) return 1;
      return b.size - a.size;
    });

  function formatSize(size: number) {
    return (size / 1024).toFixed(2) + ' KiB';
  }

  function getGzippedSize(asset: StatsAsset) {
    const filepath = api.resolve(path.join(dir, asset.name));
    const buffer = fs.readFileSync(filepath);
    return formatSize(zlib.gzipSync(buffer).length);
  }

  function makeRow(a: string, b: string, c: string) {
    return `  ${a}\t    ${b}\t ${c}`;
  }

  ui.div(
    makeRow(
      chalk.cyan.bold(`File`),
      chalk.cyan.bold(`Size`),
      chalk.cyan.bold(`Gzipped`)
    ) +
      `\n\n` +
      assets
        .map((asset) =>
          makeRow(
            /js$/.test(asset.name)
              ? chalk.green(path.join(dir, asset.name))
              : chalk.blue(path.join(dir, asset.name)),
            formatSize(asset.size),
            getGzippedSize(asset)
          )
        )
        .join(`\n`)
  );

  const time = stats.endTime - stats.startTime;
  const now = new Date().toISOString();
  const hash = stats.hash;
  const info = `Build at: ${chalk.white(now)} - Hash: ${chalk.white(
    hash
  )} - Time: ${chalk.white(time)}ms`;

  return `${ui.toString()}\n\n  ${chalk.gray(
    `Images and other types of assets omitted.`
  )}\n  ${info}\n`;
}
