import type { ComponentMetadata } from '@alilc/lowcode-types';

const InputMeta: ComponentMetadata = {
  group: '原子组件',
  category: '表单组件',
  componentName: 'Input',
  title: 'Input',
  docUrl: '',
  screenshot: '',
  devMode: 'proCode',
  npm: {
    package: '@knxcloud/example-component',
    version: '1.0.0',
    exportName: 'Input',
    destructuring: true,
  },
  configure: {
    props: [
      {
        name: 'title',
        title: 'title',
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
      title: 'Input',
      screenshot: '',
      schema: {
        componentName: 'Input',
        props: {},
      },
    },
  ],
};

export default InputMeta;
