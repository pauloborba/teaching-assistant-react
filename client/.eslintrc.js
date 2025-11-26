// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ["../.eslintrc.js"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
  },
};

module.exports = config;