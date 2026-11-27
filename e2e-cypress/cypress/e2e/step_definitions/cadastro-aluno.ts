import { Given, When, Then, DataTable } from "@badeball/cypress-cucumber-preprocessor";

const SERVER = "http://localhost:3005";

Given("the student management system is running", () => {
  cy.visit("/");
});

Given("the server is available", () => {
  cy.request(`${SERVER}/api/students`).its("status").should("eq", 200);
});

Given("there is no student with CPF {string} in the system", (cpf: string) => {
  cy.request({
    method: "DELETE",
    url: `${SERVER}/api/students/${cpf}`,
    failOnStatusCode: false,
  });
});

When("I navigate to the Students area", () => {
  cy.get('[data-testid="students-tab"]').click();
});

When("I provide the student information:", (table: DataTable) => {
  const info = table.rowsHash();
  cy.get('input[placeholder="Enter student\'s full name"]').clear().type(info.name);
  cy.get('input[placeholder="000.000.000-00"]').clear().type(info.cpf);
  cy.get('input[placeholder="student@example.com"]').clear().type(info.email);
});

When("I send the student information", () => {
  cy.intercept("POST", "**/api/students").as("postStudent");
  cy.get('[data-testid="submit-student-button"]').click();
});

Then("I should see {string} in the student list", (nome: string) => {
  cy.contains('[data-testid="student-name"]', nome).should("be.visible");
});

Then("the student should have CPF {string}", (cpf: string) => {
  cy.contains('[data-testid="student-cpf"]', cpf).should("be.visible");
});

Then("the student should have email {string}", (email: string) => {
  cy.contains('[data-testid="student-email"]', email).should("be.visible");
});