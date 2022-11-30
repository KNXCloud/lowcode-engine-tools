module.exports = {
  extends: [
    'stylelint-config-prettier',
    'stylelint-config-standard',
    'stylelint-config-rational-order',
    'stylelint-config-recommended-vue',
  ],
  rules: {
    'at-rule-no-unknown': null,
    'declaration-block-trailing-semicolon': null,
    'font-family-no-missing-generic-family-keyword': null,
    'no-descending-specificity': null,
    'selector-class-pattern': [
      /^[a-z]+((-|--|__)[a-z]+)*$/,
      { resolveNestedSelectors: true },
    ],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep'] }],
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
};
