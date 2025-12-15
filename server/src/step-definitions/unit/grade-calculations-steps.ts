/**
 * Unit Test Step Definitions for Grade Calculations
 * 
 * Layer: Unit Tests (Bottom of Testing Pyramid)
 * Context: Fast, in-memory validation of business rules
 * 
 * These tests run pure functions without any external dependencies.
 * No database, no HTTP calls, no browser automation.
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import expect from 'expect';

// =============================================================================
// Pure Functions Under Test (extracted from domain logic)
// =============================================================================

/**
 * Calculates the average of grades, ignoring null values.
 * Returns 0 if the list is empty or contains only nulls.
 */
function calculateAverage(grades: (number | null)[]): number {
  const validGrades = grades.filter((g): g is number => g !== null);
  if (validGrades.length === 0) return 0;
  const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
  return sum / validGrades.length;
}

/**
 * Converts a grade acronym to its numeric value.
 */
function convertGradeToValue(acronym: string): number {
  const gradeMap: Record<string, number> = {
    'MA': 10,
    'MPA': 7,
    'MANA': 0
  };
  return gradeMap[acronym] ?? 0;
}

/**
 * Groups students by their status and returns counts.
 */
function groupStudentsByStatus(students: Array<{ name: string; status: string }>): Record<string, number> {
  return students.reduce((acc, student) => {
    acc[student.status] = (acc[student.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Determines student status based on grades.
 * APPROVED: average >= 7.0
 * FAILED: average < 3.0
 * PENDING: otherwise (or incomplete data)
 */
function determineStudentStatus(grades: Array<{ goal: string; grade: string }>): string {
  if (grades.length === 0) return 'PENDING';
  
  const gradeValues = grades.map(g => convertGradeToValue(g.grade));
  const average = calculateAverage(gradeValues);
  
  if (average >= 7.0) return 'APPROVED';
  if (average < 3.0) return 'FAILED';
  return 'PENDING';
}

// =============================================================================
// Test State
// =============================================================================

let gradeList: (number | null)[] = [];
let gradeAcronym: string = '';
let studentGrades: Array<{ goal: string; grade: string }> = [];
let studentList: Array<{ name: string; status: string }> = [];
let calculationResult: number = 0;
let statusResult: string = '';
let groupingResult: Record<string, number> = {};

// =============================================================================
// GIVEN Steps
// =============================================================================

// Pattern: [10, null, 5]
Given(/^I have a list of grades with values \[([\d.]+), null, ([\d.]+)\]$/, function (first: string, second: string) {
  gradeList = [parseFloat(first), null, parseFloat(second)];
});

Given('I have an empty list of grades', function () {
  gradeList = [];
});

Given('I have a grade acronym {string}', function (acronym: string) {
  gradeAcronym = acronym;
});

Given('a student has the following grades:', function (dataTable: DataTable) {
  studentGrades = dataTable.hashes().map(row => ({
    goal: row.goal,
    grade: row.grade
  }));
});

Given('I have a list of students with statuses:', function (dataTable: DataTable) {
  studentList = dataTable.hashes().map(row => ({
    name: row.name,
    status: row.status
  }));
});

// =============================================================================
// WHEN Steps
// =============================================================================

When('I calculate the grade average', function () {
  calculationResult = calculateAverage(gradeList);
});

When('I convert it to a numeric value', function () {
  calculationResult = convertGradeToValue(gradeAcronym);
});

When('I evaluate the student\'s final status', function () {
  statusResult = determineStudentStatus(studentGrades);
});

When('I aggregate the student statuses', function () {
  groupingResult = groupStudentsByStatus(studentList);
});

// =============================================================================
// THEN Steps
// =============================================================================

Then('the result should be {float}', function (expected: number) {
  expect(calculationResult).toBeCloseTo(expected, 2);
});

Then('the result should be {int}', function (expected: number) {
  expect(calculationResult).toBe(expected);
});

Then('the status should be {string}', function (expected: string) {
  expect(statusResult).toBe(expected);
});

Then('the grouping should return:', function (dataTable: DataTable) {
  const expectedGrouping: Record<string, number> = {};
  dataTable.hashes().forEach(row => {
    expectedGrouping[row.status] = parseInt(row.count, 10);
  });
  
  for (const [status, count] of Object.entries(expectedGrouping)) {
    expect(groupingResult[status]).toBe(count);
  }
});
