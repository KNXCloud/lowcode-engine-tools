import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  external: [/^@vue\/cli/],
  footer: ({ format }) => {
    return format === 'cjs'
      ? {
          js: 'module.exports = Object.assign(module.exports.default, module.exports)',
        }
      : {};
  },
});
