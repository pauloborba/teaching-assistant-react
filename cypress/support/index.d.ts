/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to clean up test data via API
     * @param classId - The ID of the class to delete
     * @param studentIds - Array of student CPFs to delete
     * @example cy.cleanupTestData('class-123', ['11111122222', '33333444444'])
     */
    cleanupTestData(classId: string | null, studentIds: string[]): Chainable<void>;

    /**
     * Custom command to create a test class via API
     * @param classData - Object containing topic, semester, and year
     * @returns The created class object
     * @example cy.createTestClass({ topic: 'Math', semester: 1, year: 2025 })
     */
    createTestClass(classData: {
      topic: string;
      semester: number;
      year: number;
    }): Chainable<any>;

    /**
     * Custom command to create a test student via API
     * @param studentData - Object containing name, cpf, and email
     * @returns The created student object
     * @example cy.createTestStudent({ name: 'John', cpf: '12345678900', email: 'john@test.com' })
     */
    createTestStudent(studentData: {
      name: string;
      cpf: string;
      email: string;
    }): Chainable<any>;
  }
}
