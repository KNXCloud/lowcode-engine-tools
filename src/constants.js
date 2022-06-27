const SUPPORTED_COMMAND = ['start', 'build'];
const COMMON_EXTERNALS = {
  vue: 'var window.Vue',
  'vue-router': 'var window.VueRouter',
};

module.exports = {
  COMMON_EXTERNALS,
  SUPPORTED_COMMAND,
};
