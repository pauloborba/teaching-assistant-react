process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  target: 'ES2020'
});

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
  lembretesGui: {
    paths: ['../features/Notificacao_falta_cadastrar_alguma_nota.feature'],
    tags: '@lembretes-configuracao-gui',
    requireModule: ['ts-node/register/transpile-only'],
    require: ['src/step-definitions/lembretes-gui-steps.ts'],
    format: ['progress-bar']
  }
};
