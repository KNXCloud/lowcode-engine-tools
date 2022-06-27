const _ = require('lodash');
const { existsSync, readFileSync } = require('fs');
const path = require('path');
const hbs = require('handlebars');

function asyncDebounce(func, wait) {
  const debounced = _.debounce(async (resolve, reject, bindSelf, args) => {
    try {
      const result = await func.bind(bindSelf)(...args);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }, wait);

  // This is the function that will be bound by the caller, so it must contain the `function` keyword.
  function returnFunc(...args) {
    return new Promise((resolve, reject) => {
      debounced(resolve, reject, this, args);
    });
  }

  return returnFunc;
}

function parseNpmName(npmName) {
  if (typeof npmName !== 'string') {
    throw new TypeError('Expected a string');
  }
  const matched =
    npmName.charAt(0) === '@' ? /(@[^/]+)\/(.+)/g.exec(npmName) : [npmName, '', npmName];
  if (!matched) {
    throw new Error(`[parse-package-name] "${npmName}" is not a valid string`);
  }
  const scope = matched[1];
  const name = (matched[2] || '')
    .replace(/\s+/g, '')
    .replace(/[-_]+([^\-_])/g, (_, $1) => {
      return $1.toUpperCase();
    });
  const uniqueName =
    (matched[1] ? matched[1].charAt(1).toUpperCase() + matched[1].slice(2) : '') +
    name.charAt(0).toUpperCase() +
    name.slice(1);
  return {
    scope,
    name,
    uniqueName,
  };
}

function upperFirst(str) {
  return str[0].toUpperCase() + str.substr(1);
}

function resolveBabelOptions(rootDir) {
  const babelrcFile = path.resolve(rootDir, '.babelrc');
  const babelrcJsFile = path.resolve(rootDir, '.babelrc.js');
  if (existsSync(babelrcFile)) {
    return JSON.parse(readFileSync(babelrcFile, 'utf-8'));
  } else if (existsSync(babelrcJsFile)) {
    return require(babelrcJsFile);
  } else {
    return { presets: [require.resolve('@vue/babel-preset-app')] };
  }
}

function slash(str) {
  return str && str.replace(/\\/g, '/');
}

function generateEntry(template, params) {
  const hbsTemplatePath = path.join(__dirname, `../templates/${template}`);
  const hbsTemplateContent = readFileSync(hbsTemplatePath, 'utf-8');
  return hbs.compile(hbsTemplateContent)(params);
}

module.exports = {
  slash,
  upperFirst,
  parseNpmName,
  generateEntry,
  asyncDebounce,
  resolveBabelOptions,
};
