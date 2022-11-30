module.exports = {
  extends: [
    'stylelint-config-prettier',
    'stylelint-config-standard',
    'stylelint-config-rational-order',
    'stylelint-config-recommended-vue',
  ],
  rules: {
    'at-rule-no-unknown': null,
    'color-no-invalid-hex': true,
    'declaration-block-trailing-semicolon': null,
    'font-family-no-missing-generic-family-keyword': null,
    'selector-class-pattern': [
      /^[a-z]+((-|--|__)[a-z]+)*$/,
      { resolveNestedSelectors: true },
    ],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep'] }],
    'no-descending-specificity': null,
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
};
