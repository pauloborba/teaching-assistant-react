const { defineConfig } = require('cypress');
const createBundler = require('@bahmutov/cypress-esbuild-preprocessor');
const { addCucumberPreprocessorPlugin } = require('@badeball/cypress-cucumber-preprocessor');
const { createEsbuildPlugin } = require('@badeball/cypress-cucumber-preprocessor/esbuild');

module.exports = defineConfig({
  e2e: {
    // Base URL for the application
    baseUrl: 'http://localhost:3004',
    
    // Specify the pattern for feature files
    specPattern: 'cypress/e2e/features/**/*.feature',
    
    // Configure the step definitions path
    supportFile: 'cypress/support/e2e.js',
    
    // Configure timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    // Configure video and screenshot settings
    video: false,
    screenshotOnRunFailure: true,
    
    async setupNodeEvents(on, config) {
      // Add Cucumber preprocessor plugin
      await addCucumberPreprocessorPlugin(on, config);
      
      // Configure esbuild bundler with Cucumber plugin
      on(
        'file:preprocessor',
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );
      
      return config;
    },
  },
});
