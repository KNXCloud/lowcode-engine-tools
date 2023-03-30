import type { IPublicTypeComponentMetadata } from '@alilc/lowcode-types';

export default <IPublicTypeComponentMetadata>{
  componentName: 'XButton',
  npm: {
    destructuring: true,
    componentName: 'XButton',
  },
  title: '按钮',
  group: '组件',
  category: '基础组件',
  configure: {
    props: [
      {
        title: '按钮内容',
        name: 'children',
        setter: 'StringSetter',
      },
      {
        title: '按钮文本颜色',
        name: 'color',
        setter: 'ColorSetter',
      },
    ],
  },
  snippets: [
    {
      title: '按钮',
      schema: {
        componentName: 'XButton',
        props: {
          children: '按钮',
        },
      },
    },
  ],
};
