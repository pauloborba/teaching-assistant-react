# Running the Import Students E2E Test

## Prerequisites

Before running the tests, ensure you have:

1. **Installed all dependencies:**
   ```bash
   npm install
   ```

2. **Server running on port 3005:**
   ```bash
   cd server
   npm run dev
   ```
   Server should be accessible at `http://localhost:3005`

3. **Client running on port 3004:**
   ```bash
   cd client
   npm start
   ```
   Client should be accessible at `http://localhost:3004`

## Running the Tests

### Option 1: Interactive Mode (Cypress Test Runner)

Open the Cypress Test Runner UI:
```bash
npm run cypress:open
```

1. Select "E2E Testing"
2. Choose your browser
3. Click on `importStudentsToClass.feature`
4. Watch the test run in real-time

### Option 2: Headless Mode (CI/CD)

Run all tests in headless mode:
```bash
npm run cypress:run
```

Or run a specific feature:
```bash
npx cypress run --spec "cypress/e2e/features/importStudentsToClass.feature"
```

## Test Scenario Details

**Feature:** Import students via spreadsheet upload

**Scenario:** Import succeeds completely

**Test Flow:**
1. ✓ Creates test class "Class A" via API
2. ✓ Creates 2 test students via API (CPFs: 11111122222, 33333444444)
3. ✓ Visits the Classes page
4. ✓ Clicks "Enroll" button for the test class
5. ✓ Uploads `alunos.csv` file
6. ✓ Clicks "Import Students" button
7. ✓ Verifies redirect to Success page
8. ✓ Verifies success message shows "2 students imported, 0 rejected"
9. ✓ Returns to Classes page
10. ✓ Verifies both students are now enrolled
11. ✓ Cleans up all test data (students and class)

## Test Data

**CSV File:** `cypress/fixtures/alunos.csv`
```
cpf
11111122222
33333444444
```

**API Endpoints Used:**
- `POST /api/classes` - Create test class
- `POST /api/students` - Create test students
- `DELETE /api/classes/:id` - Cleanup class
- `DELETE /api/students/:cpf` - Cleanup students

## Key Features

✓ **Self-contained:** Test creates its own data and cleans up afterward  
✓ **No external dependencies:** Doesn't rely on pre-existing database state  
✓ **API-driven setup:** Fast test data creation via direct API calls  
✓ **Automatic cleanup:** After hook ensures data is deleted even if test fails  
✓ **English code:** Variable and function names follow English conventions  

## Troubleshooting

**Issue:** Test fails with "Network error"
- **Solution:** Ensure both server (3005) and client (3004) are running

**Issue:** Test fails at file upload
- **Solution:** Verify `cypress/fixtures/alunos.csv` exists

**Issue:** Test fails at enrollment verification
- **Solution:** Check that the enrollment modal has the expected class names (`.enrolled-students-list`)

**Issue:** Students already exist error
- **Solution:** Run cleanup script or manually delete test students with CPFs 11111122222 and 33333444444

## Adding More Test Scenarios

To add more scenarios:

1. Add new scenarios to `cypress/e2e/features/importStudentsToClass.feature`
2. Implement new step definitions in `cypress/e2e/stepDefinitions/importStudentsToClass.steps.js`
3. Add new test fixtures to `cypress/fixtures/` as needed

Example scenarios to consider:
- Import with invalid CPFs (rejected students)
- Import with mixed valid/invalid data
- Import with duplicate students
- Import with empty file
- Import with wrong file format
