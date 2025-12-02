// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true, // ADICIONE aqui no server
  extends: ["../.eslintrc.js"],
  parserOptions: {
    project: "./tsconfig.json", 
    tsconfigRootDir: __dirname,
  },
  env: {
    node: true,
    browser: false,
  },
};

module.exports = config;