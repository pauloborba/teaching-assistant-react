// ***********************************************
// This file contains custom commands and overrides
// ***********************************************

// API Base URL
const API_BASE_URL = 'http://localhost:3005';

// Custom command to clean up test data via API
Cypress.Commands.add('cleanupTestData', (classId, studentIds) => {
  // Delete students
  if (studentIds && studentIds.length > 0) {
    studentIds.forEach(studentId => {
      cy.request({
        method: 'DELETE',
        url: `${API_BASE_URL}/api/students/${studentId}`,
        failOnStatusCode: false
      });
    });
  }
  
  // Delete class
  if (classId) {
    cy.request({
      method: 'DELETE',
      url: `${API_BASE_URL}/api/classes/${classId}`,
      failOnStatusCode: false
    });
  }
});

// Custom command to create a test class via API
Cypress.Commands.add('createTestClass', (classData) => {
  return cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/api/classes`,
    body: classData
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

// Custom command to create a test student via API
Cypress.Commands.add('createTestStudent', (studentData) => {
  return cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/api/students`,
    body: studentData
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});
