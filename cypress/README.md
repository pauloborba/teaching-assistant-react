# Cypress E2E Tests

This directory contains end-to-end tests for the Teaching Assistant Import Students application using Cypress and Cucumber.

## Structure

```
cypress/
├── e2e/
│   ├── features/          # Gherkin .feature files
│   └── stepDefinitions/   # Step definition implementations (.js files)
├── fixtures/              # Test data and upload files
└── support/               # Custom commands and configuration
```

## Running Tests

### Prerequisites

Make sure both server and client are running:
- Server: `http://localhost:3001`
- Client: `http://localhost:3004`

### Commands

```bash
# Open Cypress Test Runner
npx cypress open

# Run all tests headlessly
npx cypress run

# Run specific feature
npx cypress run --spec "cypress/e2e/features/import-students.feature"
```

## Test Philosophy

- **Self-contained**: Tests create their own data via API and clean up afterwards
- **No external dependencies**: No reliance on pre-existing database state
- **English code**: Variable and function names in English, with explanatory comments
- **BDD approach**: Feature files describe behavior, step definitions implement the tests
