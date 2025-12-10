module.exports = {
  default: {
    require: [
      'ts-node/register',
      'src/step-definitions/**/*.ts'
    ],
    format: [
      'progress-bar',
      'json:reports/cucumber_report.json',
      'html:reports/cucumber_report.html'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    paths: ['src/features/**/*.feature'],
    requireModule: ['ts-node/register']
  },
  server: {
    require: [
      'ts-node/register',
      'src/step-definitions/server-newScriptAnswer-steps.ts'
    ],
    format: [
      'progress-bar',
      'json:reports/cucumber_report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    paths: ['src/features/server-newScriptAnswer-management.feature'],
    requireModule: ['ts-node/register'],
    timeout: 30000
  }
};