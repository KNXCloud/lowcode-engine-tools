# build plugin lowcode

> 编译 vue 自定义组件的 编译插件，基于 `@alib/build-scripts`,使用方式查看 [example](https://github.com/KNXCloud/build-plugin-lowcode/tree/main/example)

## 运行 example

```bash
pnpm install
cd exmaple
pnpm install
pnpm start
```

## 如何与 lowcode engine 集成

编译会生成两个文件:

- `view.js` 组件库代码
- `meta.js` 组件库 meta 信息

将下面 JSON 内容添加到物料中

```json
{
  "packages": [
    {
      "package": "@knxcloud/example-component", // 组件名，务必修改为自己的组件包名
      "version": "1.0.0", // 组件版本号，务必修改为自己的组件版本号
      "urls": ["http://localhost:3333/view.js"],
      "library": "KnxLcUi" // 为 build.json library 字段值
    }
  ],
  "components": [
    {
      "exportName": "KnxLcUiMeta", // 为 build.json library 字段值 + Meta 后缀
      "npm": {
        "package": "@knxcloud/example-component", // 组件名，务必修改为自己的组件包名
        "version": "1.0.0" // 组件版本号，务必修改为自己的组件版本号
      },
      "url": "http://localhost:3333/meta.js"
    }
  ],
  "sort": {
    "groupList": ["精选组件", "原子组件"],
    "categoryList": [
      "基础元素",
      "布局容器类",
      "表格类",
      "表单详情类",
      "帮助类",
      "对话框类",
      "业务类",
      "通用",
      "引导",
      "信息输入",
      "信息展示",
      "信息反馈"
    ]
  }
}
```
