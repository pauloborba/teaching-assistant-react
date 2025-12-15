const { Given, When, Then, Before, After } = require("@badeball/cypress-cucumber-preprocessor");

// Test context to store data created during the test
let testContext = {
  classes: [],
  comparisonResponse: null
};

const API_BASE_URL = 'http://localhost:3005';

Before(() => {
  testContext = {
    classes: [],
    comparisonResponse: null
  };
});

After(() => {
  cy.log('Cleaning up test data');
  // Add cleanup logic if necessary
});

Given('the client sends a request to compare the classes {string} and {string}', (class1, class2) => {
  testContext.classes = [class1, class2];
});

Given('both classes exist in the system', () => {
  testContext.classesInfo = {};
  testContext.classes.forEach((className) => {
    // server expects topic/semester/year
    cy.request('POST', `${API_BASE_URL}/api/classes`, { topic: className, semester: 1, year: 2025 })
      .then((resp) => {
        testContext.classesInfo[className] = resp.body.id;
      });
  });
});

Given('both classes have enrolled students', () => {
  // create two students per class and enroll them using server endpoints
  const generateCPF = () => Math.floor(10000000000 + Math.random() * 90000000000).toString();

  testContext.classes.forEach((className) => {
    const classId = testContext.classesInfo && testContext.classesInfo[className];
    // create two students and enroll them
    for (let i = 1; i <= 2; i++) {
      const cpf = generateCPF();
      const studentName = `${className} Student ${i}`;
      const email = `${studentName.replace(/\s+/g, '').toLowerCase()}@example.com`;

      cy.request('POST', `${API_BASE_URL}/api/students`, { name: studentName, cpf, email })
        .then(() => {
          cy.request('POST', `${API_BASE_URL}/api/classes/${classId}/enroll`, { studentCPF: cpf });
        });
    }
  });
});

When('the server processes the comparison request', () => {
  cy.request('POST', `${API_BASE_URL}/api/compare-classes`, { classes: testContext.classes })
    .then((response) => {
      testContext.comparisonResponse = response;
    });
});

Then('the server returns HTTP {int}', (statusCode) => {
  expect(testContext.comparisonResponse.status).to.eq(statusCode);
});

Then('the response body contains the comparison data for {string} and {string}', (class1, class2) => {
  expect(testContext.comparisonResponse.body).to.have.property('comparisonData');
  expect(testContext.comparisonResponse.body.comparisonData).to.include.keys(class1, class2);
});

Given('the client sends a request to compare only one class, {string}', (class1) => {
  testContext.classes = [class1];
});

When('the server validates the comparison request', () => {
  cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/api/compare-classes`,
    body: { classes: testContext.classes },
    failOnStatusCode: false
  }).then((response) => {
    testContext.comparisonResponse = response;
  });
});

// alias for feature text that used slightly different wording
When('the server validates the request', () => {
  cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/api/compare-classes`,
    body: { classes: testContext.classes },
    failOnStatusCode: false
  }).then((response) => {
    testContext.comparisonResponse = response;
  });
});

Then('the response body contains an error message indicating that at least two classes are required for comparison', () => {
  expect(testContext.comparisonResponse.body).to.have.property('error', 'At least two classes are required for comparison');
});

Given('the class {string} has zero enrolled students', (className) => {
  // create a class without enrollments using the API
  cy.request('POST', `${API_BASE_URL}/api/classes`, { topic: className, semester: 1, year: 2025 })
    .then((resp) => {
      testContext.classesInfo = testContext.classesInfo || {};
      testContext.classesInfo[className] = resp.body.id;
    });
});

Then('the response body contains an error message stating that {string} \(and possibly other classes\) have no enrolled students', (className) => {
  expect(testContext.comparisonResponse.body).to.have.property('error');
  expect(testContext.comparisonResponse.body.error).to.include(`${className} has no enrolled students`);
});

Then('no comparison data is returned', () => {
  expect(testContext.comparisonResponse.body).to.not.have.property('comparisonData');
});

Then('the request is not processed', () => {
  expect(testContext.comparisonResponse.body).to.not.have.property('comparisonData');
});

Given('the client sends a request to compare {int} classes', (numClasses) => {
  testContext.classes = Array.from({ length: numClasses }, (_, i) => `Class ${i + 1}`);
});

Then('the response body contains an error stating that the maximum number of classes allowed for comparison is {int}', (maxClasses) => {
  expect(testContext.comparisonResponse.body).to.have.property('error', `The maximum number of classes allowed for comparison is ${maxClasses}`);
});