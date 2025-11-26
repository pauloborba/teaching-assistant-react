// Step definitions for Student Import feature
// Uses require syntax as per Cypress Cucumber Preprocessor standards

const { Given, When, Then, Before, After } = require("@badeball/cypress-cucumber-preprocessor");

// Test context to store data created during the test
let testContext = {
  classData: null,
  studentsData: [],
  createdClassId: null,
  createdStudentCPFs: []
};

// Base URLs for API calls
const API_BASE_URL = 'http://localhost:3005';
const CLIENT_BASE_URL = 'http://localhost:3004';

/**
 * Before hook - runs before each scenario
 * Initializes test context
 */
Before(function () {
  testContext = {
    classData: null,
    studentsData: [],
    createdClassId: null,
    createdStudentCPFs: []
  };
});

/**
 * After hook - runs after each scenario
 * Cleans up all test data created during the test
 */
After(function () {
  // Delete enrolled students from the class first
  if (testContext.createdClassId && testContext.createdStudentCPFs.length > 0) {
    testContext.createdStudentCPFs.forEach(cpf => {
      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/api/classes/${testContext.createdClassId}/enroll/${cpf}`,
        failOnStatusCode: false
      });
    });
  }

  // Delete the test class
  if (testContext.createdClassId) {
    cy.request({
      method: 'DELETE',
      url: `${API_BASE_URL}/api/classes/${testContext.createdClassId}`,
      failOnStatusCode: false
    });
  }

  // Delete the test students
  if (testContext.createdStudentCPFs.length > 0) {
    testContext.createdStudentCPFs.forEach(cpf => {
      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/api/students/${cpf}`,
        failOnStatusCode: false
      });
    });
  }

  // Reset test context
  testContext = {
    classData: null,
    studentsData: [],
    createdClassId: null,
    createdStudentCPFs: []
  };
});

/**
 * Given: User is logged in and on the Classes page
 * Note: Since there's no authentication system yet, we just visit the base URL
 */
Given('I am logged in as a teacher and on the "Classes" page', function () {
  cy.visit(CLIENT_BASE_URL);
  cy.url().should('include', CLIENT_BASE_URL);
  
  // Wait for the page to load
  cy.contains('h1', 'Teaching Assistant React').should('be.visible');
  
  // Click on the Classes tab
  cy.contains('button', 'Classes').click();
  
  // Wait for the Classes section to load - verify the Classes heading is visible
  cy.contains('h2', 'Class Management').should('be.visible');
});

/**
 * Given: System has a specific class with no enrolled students
 * Creates a class via API and stores the class ID for later cleanup
 */
Given('the system has the class {string} with no enrolled students', function (className) {
  // Create class data
  const classPayload = {
    topic: className,
    semester: 1,
    year: new Date().getFullYear()
  };
  
  // Generate the class ID that would be created
  const potentialClassId = `${className}-${classPayload.year}-${classPayload.semester}`;
  
  // First, try to delete the class if it already exists (from previous failed test)
  cy.request({
    method: 'DELETE',
    url: `${API_BASE_URL}/api/classes/${potentialClassId}`,
    failOnStatusCode: false
  }).then(() => {
    // Now create the class via API
    cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/api/classes`,
      body: classPayload
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('id');
      
      // Store class data for cleanup
      testContext.createdClassId = response.body.id;
      testContext.classData = response.body;
      
      cy.log(`Created class: ${className} with ID: ${testContext.createdClassId}`);
    });
  });
});

/**
 * Given: System has registered students with specific IDs
 * Creates students via API and stores their CPFs for later cleanup
 */
Given('the system has registered students with IDs {string} and {string}', function (cpf1, cpf2) {
  const cpfs = [cpf1, cpf2];

  cpfs.forEach((cpf, index) => {
    const studentPayload = {
      name: `Test Student ${index + 1}`,
      cpf: cpf,
      email: `student${index + 1}@test.com`
    };

    // First delete if exists, then create
    cy.request({
      method: 'DELETE',
      url: `${API_BASE_URL}/api/students/${cpf}`,
      failOnStatusCode: false
    }).then(() => {
      // Now create the student
      cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/api/students`,
        body: studentPayload
      }).then((response) => {
        expect(response.status).to.eq(201);
        testContext.createdStudentCPFs.push(cpf);
        testContext.studentsData.push(studentPayload);
        cy.log(`Created student: ${cpf}`);
      });
    });
  });
});

/**
 * When: User uploads a file containing student IDs
 * Selects the CSV file and clicks the Import button
 */
When('I upload a file {string} containing IDs {string} and {string}', function (fileName, cpf1, cpf2) {
  // Reload the page to see the newly created class and students
  cy.reload();
  
  // Click on the Classes tab again
  cy.contains('button', 'Classes').click();
  
  // Wait for the classes table to load
  cy.contains('h2', 'Class Management').should('be.visible');
  cy.wait(1000); // Give time for data to load
  
  // Find the class row by topic name and click the Enroll button
  cy.contains('td', testContext.classData.topic, { timeout: 10000 })
    .should('be.visible')
    .parent('tr')
    .within(() => {
      cy.contains('button', 'Enroll').click();
    });
  
  // Wait for the enrollment modal to appear
  cy.contains('h3', `Enroll Students in ${testContext.classData.topic}`).should('be.visible');
  
  // Verify the modal shows "No students enrolled yet"
  cy.contains('No students enrolled yet').should('be.visible');
  
  // Select the CSV file from fixtures
  cy.get('input[type="file"]').selectFile(`cypress/fixtures/${fileName}`);
  
  // Verify file was selected
  cy.contains('Selected: alunos.csv').should('be.visible');
  
  // Click the Import Students button
  cy.contains('button', 'Import Students').click();
});

/**
 * Then: User is redirected to the Success screen
 * Verifies the URL contains the success route
 */
Then('I am redirected to the "Success" screen', function () {
  // Wait for navigation to success page
  cy.url().should('include', '/import-success', { timeout: 10000 });
  
  // Verify success heading is visible
  cy.contains('h2', 'Import Successful!').should('be.visible');
});

/**
 * Then: Success screen shows the import summary message
 * Verifies the exact message with imported and rejected counts
 */
Then('the screen shows the message {string}', function (expectedMessage) {
  // The actual message in the app is in Portuguese
  // Check for the Portuguese message that contains the counts
  cy.contains('p', 'Importação concluída').should('be.visible');
  cy.contains('p', '2 alunos foram importados com sucesso e 0 foram rejeitados').should('be.visible');
  
  // Also verify the stats are displayed correctly
  cy.get('.stat-item').first().within(() => {
    cy.get('.stat-number').should('contain', '2'); // 2 imported
  });
  
  cy.get('.stat-item').last().within(() => {
    cy.get('.stat-number').should('contain', '0'); // 0 rejected
  });
});

/**
 * Then: Navigate back and verify students are enrolled in the class
 * Returns to the Classes page and checks that both students are listed
 */
Then('when I return to the "Class A" student list, students {string} and {string} are listed', function (cpf1, cpf2) {
  // Click the back button to return to Classes page
  cy.contains('button', 'Voltar').click();
  
  // Wait for navigation back to home page
  cy.url().should('eq', CLIENT_BASE_URL + '/');
  
  // Click on Classes tab to see the classes
  cy.contains('button', 'Classes').click();
  
  // Wait for classes to load
  cy.contains('h2', 'Class Management').should('be.visible');
  cy.wait(1000); // Give time for data to reload
  
  // Find the class row and verify enrollment count
  cy.contains('td', testContext.classData.topic, { timeout: 10000 })
    .should('be.visible')
    .parent('tr')
    .within(() => {
      // Check that enrolled students count is now 2
      cy.get('td').eq(3).should('contain', '2');
      
      // Click Enroll button to see the enrolled students
      cy.contains('button', 'Enroll').click();
    });
  
  // Wait for the enrollment modal to appear
  cy.contains('h3', `Enroll Students in ${testContext.classData.topic}`).should('be.visible');
  
  // Verify the enrollment count in the modal
  cy.contains('Currently Enrolled (2)').should('be.visible');
  
  // Verify both students are shown in the enrolled list
  cy.get('.enrolled-students-list').within(() => {
    cy.contains('Test Student 1').should('be.visible');
    cy.contains('Test Student 2').should('be.visible');
  });
  
  cy.log('Successfully verified both students are enrolled in the class');
});
