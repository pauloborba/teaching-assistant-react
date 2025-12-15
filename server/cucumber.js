/**
 * Cucumber Configuration for Server-Side Tests
 * 
 * This configuration handles:
 * - Unit Tests (@unit tag)
 * - Service Tests (@service tag)
 * - Integration Tests (@integration tag)
 */

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/step-definitions/**/*.ts'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true
  },
  
  // Unit tests - fastest, run frequently
  unit: {
    requireModule: ['ts-node/register'],
    require: ['src/step-definitions/unit/**/*.ts'],
    paths: ['src/features/unit/**/*.feature'],
    tags: '@unit',
    format: ['progress-bar'],
    publishQuiet: true
  },
  
  // Service tests - API layer with mocks
  service: {
    requireModule: ['ts-node/register'],
    require: ['src/step-definitions/service/**/*.ts'],
    paths: ['src/features/service/**/*.feature'],
    tags: '@service',
    format: ['progress-bar'],
    publishQuiet: true
  },
  
  // Integration tests - data layer, slower
  integration: {
    requireModule: ['ts-node/register'],
    require: ['src/step-definitions/integration/**/*.ts'],
    paths: ['src/features/integration/**/*.feature'],
    tags: '@integration',
    format: ['progress-bar'],
    publishQuiet: true
  }
};
