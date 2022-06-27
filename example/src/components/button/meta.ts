import type { ComponentMetadata } from '@alilc/lowcode-types';

const ButtonMeta: ComponentMetadata = {
  group: '原子组件',
  category: '基础组件',
  componentName: 'Button',
  title: 'Button',
  docUrl: '',
  screenshot: '',
  devMode: 'proCode',
  npm: {
    package: '@knxcloud/example-component',
    version: '1.0.0',
    exportName: 'Button',
    destructuring: true,
  },
  configure: {
    props: [
      {
        title: {
          label: {
            type: 'i18n',
            'en-US': 'title',
            'zh-CN': 'title',
          },
        },
        name: 'title',
        setter: {
          componentName: 'StringSetter',
          isRequired: true,
          initialValue: '',
        },
      },
    ],
    supports: {
      style: true,
    },
    component: {},
  },
  snippets: [
    {
      title: 'Button',
      screenshot: '',
      schema: {
        componentName: 'Button',
        props: {},
      },
    },
  ],
};

export default ButtonMeta;
