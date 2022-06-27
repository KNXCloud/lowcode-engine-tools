module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
};
