import getCommand from './getCommand';

const sfcTypeSupportDoc = [
  '',
  '## 为 `.vue` 文件添加类型支持',
  '',
  'TypeScript 默认情况下无法处理 `.vue` 文件的类型信息，所以需要使用 `vue-tsc` 代替 `tsc` 来检查类型。在编辑器中，我们需要 [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) 来让 TypeScript language service 发现 `.vue` 文件的类型',
  '',
  '如果你觉得独立的TypeScript插件不够快，Volar还实现了一个性能更好的[接管模式](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669)，您可以通过以下步骤开启:',
  '',
  '1. 禁用内建的 TypeScript 扩展',
  '    1) 在 VSCode 的命令面板中运行 `Extensions: Show Built-in Extensions`',
  '    2) 找到 `TypeScript and JavaScript Language Features`, 右键点击并且选择 `Disable (Workspace)`',
  '2. 在 VSCode 的命令面板中运行 `Developer: Reload Window` 重启 VSCode',
  '',
].join('\n');

export default function generateReadme({ projectName = '', packageManager = '' }) {
  return `# ${projectName}

## 推荐的 IDE 设置

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (并且禁用 Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).
${sfcTypeSupportDoc}
## 自定义配置

参阅 [VueCli 配置参考](https://cli.vuejs.org/zh/config/).

## 项目设置

\`\`\`sh
${getCommand(packageManager, 'install')}
\`\`\`

### 开发环境下的编译和热重载

\`\`\`sh
${getCommand(packageManager, 'start')}
\`\`\`

### 生产环境下的类型检测与构建

\`\`\`sh
${getCommand(packageManager, 'build')}
\`\`\`
`;
}
