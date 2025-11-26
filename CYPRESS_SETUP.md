# Cypress + Cucumber Setup Guide

## Installation Steps

### 1. Install Dependencies

Run the following command from the project root:

```bash
npm install
```

This will install Cypress 15.7.0 and the Cucumber preprocessor along with all required dependencies.

### 2. Verify Installation

Check that Cypress was installed successfully:

```bash
npx cypress --version
```

You should see output similar to:
```
Cypress package version: 15.7.0
Cypress binary version: 15.7.0
```

### 3. Project Structure

The following structure has been created:

```
cypress/
├── e2e/
│   ├── features/              # Gherkin .feature files go here
│   │   └── placeholder.feature
│   └── stepDefinitions/       # Step definition .js files go here
│       └── placeholder.js
├── fixtures/                  # Test data files (CSV, JSON, etc.)
├── support/
│   ├── commands.js           # Custom Cypress commands
│   └── e2e.js                # Global configuration
└── README.md

Root files:
├── cypress.config.js                           # Main Cypress configuration
└── .cypress-cucumber-preprocessorrc.json       # Cucumber preprocessor config
```

### 4. Running Tests

Make sure both server and client are running before executing tests:

**Terminal 1 - Start Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start Client:**
```bash
cd client
npm start
```

**Terminal 3 - Run Cypress Tests:**

Interactive mode (Test Runner UI):
```bash
npm run cypress:open
```

Headless mode (CI/CD):
```bash
npm run cypress:run
```

### 5. Next Steps

The structure is now ready. You can:
- Add actual `.feature` files in `cypress/e2e/features/`
- Implement step definitions in `cypress/e2e/stepDefinitions/`
- Add test fixtures (upload files, etc.) in `cypress/fixtures/`

### Configuration Details

**cypress.config.js:**
- Base URL: `http://localhost:3004` (React client)
- Spec pattern: `cypress/e2e/features/**/*.feature`
- Cucumber preprocessor integration with Browserify

**.cypress-cucumber-preprocessorrc.json:**
- Step definitions path: `cypress/e2e/stepDefinitions/**/*.js`
- Uses require() syntax as per Cucumber preprocessor standards

**Custom Commands (cypress/support/commands.js):**
- `cy.cleanupTestData()` - Delete test data via API
- `cy.createTestClass()` - Create a class via API
- `cy.createTestStudent()` - Create a student via API

### Important Notes

1. **Syntax:** Always use `const { Given, When, Then } = require("@badeball/cypress-cucumber-preprocessor");`
2. **Language:** Code in English, with explanatory comments
3. **Self-contained tests:** Create and cleanup data within each test
4. **API endpoints:** Server runs on port 3001, Client on port 3004
