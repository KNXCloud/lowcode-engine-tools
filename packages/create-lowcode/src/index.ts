#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import prompts from 'prompts';
import minimist from 'minimist';
import { red, green, bold, yellow } from 'kolorist';
import renderTemplate from './utils/renderTemplate';
import { postOrderDirectoryTraverse } from './utils/directoryTraverse';
import { banner } from './utils/banner';
import getCommand from './utils/getCommand';
import generateReadme from './utils/generateReadme';
import { upgradePackages } from './utils/upgradePackages';
import { execSync } from 'node:child_process';

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName);
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-');
}

function canSkipEmptying(dir: string) {
  if (!fs.existsSync(dir)) {
    return true;
  }

  const files = fs.readdirSync(dir);
  if (files.length === 0) {
    return true;
  }
  if (files.length === 1 && files[0] === '.git') {
    return true;
  }

  return false;
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  postOrderDirectoryTraverse(
    dir,
    (dir) => fs.rmdirSync(dir),
    (file) => fs.unlinkSync(file)
  );
}

async function init() {
  console.log(`\n${banner}\n`);
  const cwd = process.cwd();

  const argv = minimist(process.argv.slice(2));
  let targetDir = argv._[0];

  const defaultProjectName = !targetDir ? 'lowcode-project' : targetDir;
  const forceOverwrite = argv.force;

  let result: {
    projectName?: string;
    shouldOverwrite?: boolean;
    packageName?: string;
    cssPreprosessor?: string;
    needsGitHooks?: boolean;
  } = {};

  const isFeatureFlagsUsed =
    typeof (argv.default ?? argv.less ?? argv.scss ?? argv.gitHooks) === 'boolean';

  try {
    result = await prompts(
      [
        {
          name: 'projectName',
          type: targetDir ? null : 'text',
          message: '项目名称：',
          initial: defaultProjectName,
          onState: (state) =>
            (targetDir = String(state.value).trim() || defaultProjectName),
        },
        {
          name: 'shouldOverwrite',
          type: () => (canSkipEmptying(targetDir) || forceOverwrite ? null : 'confirm'),
          message: () => {
            const dirForPrompt =
              targetDir === '.' ? ' 当前目录' : `目标目录 "${targetDir}"`;

            return `${dirForPrompt} 不为空. 是否移除其中的文件并继续?`;
          },
        },
        {
          name: 'overwriteChecker',
          type: (prev, values) => {
            if (values.shouldOverwrite === false) {
              throw new Error(red('✖') + ' 操作取消');
            }
            return null;
          },
        },
        {
          name: 'packageName',
          type: () => (isValidPackageName(targetDir) ? null : 'text'),
          message: '项目包名称:',
          initial: () => toValidPackageName(targetDir),
          validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name',
        },
        {
          name: 'needsGitHooks',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: '添加 GitHooks 用于检测代码格式规范？',
          initial: true,
          active: 'Yes',
          inactive: 'No',
        },
        {
          name: 'needsCssPreprosessor',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: '添加 CSS 预处理器 (如 less, scss)?',
          initial: true,
          active: 'Yes',
          inactive: 'No',
        },
        {
          name: 'cssPreprosessor',
          type: (_, values) => {
            return !isFeatureFlagsUsed && values.needsCssPreprosessor ? 'select' : null;
          },
          choices: [
            { title: 'less', value: 'less' },
            { title: 'scss', value: 'scss' },
          ],
          message: '请选择一个 CSS 预处理器',
        },
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' 操作取消');
        },
      }
    );
  } catch (cancelled: unknown) {
    if (cancelled instanceof Error) {
      console.log(cancelled.message);
    }
    process.exit(1);
  }

  const {
    projectName,
    packageName = projectName ?? defaultProjectName,
    shouldOverwrite = argv.force,
    cssPreprosessor = argv.less ? 'less' : argv.scss ? 'scss' : null,
    needsGitHooks = argv.gitHooks,
  } = result;

  const root = path.join(cwd, targetDir);

  if (fs.existsSync(root) && shouldOverwrite) {
    emptyDir(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root);
  }

  console.log(`\nScaffolding project in ${root}...`);

  const pkg = { name: packageName, version: '1.0.0' };
  const pkgPath = path.resolve(root, 'package.json');

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  const templateRoot = path.resolve(__dirname, '../template');
  const render = function render(templateName: string) {
    const templateDir = path.resolve(templateRoot, templateName);
    renderTemplate(templateDir, root);
  };

  // Render base template
  render('base');

  // Add configs.
  if (needsGitHooks) {
    render('config/lint');
    execSync('git init', { cwd: root });
  }
  render(`config/${cssPreprosessor ?? 'css'}`);

  const upgradedPkg = await upgradePackages(fs.readFileSync(pkgPath, 'utf-8'));
  fs.writeFileSync(pkgPath, upgradedPkg);

  // Instructions:
  // Supported package managers: pnpm > yarn
  const userAgent = process.env.npm_config_user_agent ?? '';
  const packageManager = /pnpm/.test(userAgent)
    ? 'pnpm'
    : /yarn/.test(userAgent)
    ? 'yarn'
    : 'pnpm';

  // README generation
  fs.writeFileSync(
    path.resolve(root, 'README.md'),
    generateReadme({
      projectName: result.projectName ?? result.packageName ?? defaultProjectName,
      packageManager,
    })
  );

  console.log(`\nDone. Now run:\n`);
  if (root !== cwd) {
    console.log(`  ${bold(green(`cd ${path.relative(cwd, root)}`))}`);
  }
  console.log(`  ${bold(green(getCommand(packageManager, 'install')))}`);
  console.log(`  ${bold(green(getCommand(packageManager, 'start')))}`);
  console.log();
}

init().catch((e) => {
  console.error(e);
});
