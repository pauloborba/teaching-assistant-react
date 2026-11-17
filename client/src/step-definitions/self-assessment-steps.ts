import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import expect from 'expect';
import {
  api, classRef, cpfOf, enrollmentOf, gradesOf, rememberResponse, selfAssessmentPath, storedSelfAssessment
} from './support/api';
import { openTab, page } from './support/browser';

/**
 * Steps of the student self-assessment grades feature
 * (features/student-grade-management.feature).
 */

// ---------------------------------------------------------------------------
// GUI steps: the "My self-assessment" page
// ---------------------------------------------------------------------------

/** The tab that shows each page named in the scenarios. */
const PAGE_TABS: Record<string, string> = {
  'My self-assessment': 'self-assessment-tab'
};

const gradeSelect = (goal: string) => `[data-testid="self-assessment-grade-${goal}"]`;

/** The grade the page shows for a goal ('' when there is none). */
const shownGrade = async (goal: string): Promise<string> => {
  await page().waitForSelector(gradeSelect(goal), { timeout: 10000 });
  return page().$eval(gradeSelect(goal), el => (el as HTMLSelectElement).value);
};

Given('I am at the {string} page of the class {string} as the student {string}',
  async function (pageName: string, className: string, studentName: string) {
    await openTab(PAGE_TABS[pageName]);
    const classSelect = '[data-testid="self-assessment-class-select"]';
    await page().waitForSelector(`${classSelect} option[value="${classRef(className).id}"]`, { timeout: 10000 });
    await page().select(classSelect, classRef(className).id);
    const studentSelect = '[data-testid="self-assessment-student-select"]';
    await page().waitForSelector(`${studentSelect} option[value="${cpfOf(studentName)}"]`, { timeout: 10000 });
    await page().select(studentSelect, cpfOf(studentName));
    await page().waitForSelector('[data-testid="self-assessment-grades"]', { timeout: 10000 });
  });

When('I assign the self-assessment grade {string} to the goal {string}', async function (grade: string, goal: string) {
  await page().select(gradeSelect(goal), grade);
});

When('I assign the self-assessment grades:', async function (table: DataTable) {
  for (const { goal, grade } of table.hashes()) {
    await page().select(gradeSelect(goal), grade);
  }
});

When('I remove the self-assessment grade of the goal {string}', async function (goal: string) {
  await page().select(gradeSelect(goal), '');
});

When('I submit the self-assessment', async function () {
  await page().click('[data-testid="submit-self-assessment"]');
  // Submitting ends with either a confirmation or an error message
  await page().waitForSelector('[data-testid="confirmation-message"], [data-testid="error-message"]', { timeout: 10000 });
});

Then('I see the self-assessment grades:', async function (table: DataTable) {
  for (const row of table.hashes()) {
    expect({ goal: row.goal, grade: await shownGrade(row.goal) }).toEqual({ goal: row.goal, grade: row.grade });
  }
});

Then('I see the self-assessment grade {string} for the goal {string}', async function (grade: string, goal: string) {
  expect(await shownGrade(goal)).toBe(grade);
});

Then('I see no self-assessment grade for the goal {string}', async function (goal: string) {
  expect(await shownGrade(goal)).toBe('');
});

// ---------------------------------------------------------------------------
// GUI steps: the "Evaluations" page, where the self-assessment is shown
// ---------------------------------------------------------------------------

Then('I see the professor grade {string} of the student {string} for the goal {string}',
  async function (grade: string, studentName: string, goal: string) {
    const select = `[data-testid="evaluation-row-${cpfOf(studentName)}"] [data-testid="evaluation-grade-${goal}"]`;
    await page().waitForSelector(select, { timeout: 10000 });
    expect(await page().$eval(select, el => (el as HTMLSelectElement).value)).toBe(grade);
  });

Then('I see the self-assessment row of the student {string}:', async function (studentName: string, table: DataTable) {
  const row = `[data-testid="self-assessment-row-${cpfOf(studentName)}"]`;
  await page().waitForSelector(row, { timeout: 10000 });
  for (const { goal, grade } of table.hashes()) {
    const shown = await page().$eval(`${row} [data-testid="self-assessment-${goal}"]`, el => el.textContent?.trim() ?? '');
    // The row shows "-" for a goal without grade
    expect({ goal, grade: shown === '-' ? '' : shown }).toEqual({ goal, grade });
  }
});

// ---------------------------------------------------------------------------
// Service steps
// ---------------------------------------------------------------------------

When('I submit the self-assessment of the student {string} in the class {string}:',
  async function (studentName: string, className: string, table: DataTable) {
    const grades = gradesOf(table.hashes() as { goal: string; grade: string }[]);
    rememberResponse(await api('PUT', selfAssessmentPath(className, studentName), { grades }));
  });

Then('the system stores the self-assessment of the student {string} in the class {string}:',
  async function (studentName: string, className: string, table: DataTable) {
    const expected = gradesOf(table.hashes() as { goal: string; grade: string }[]);
    expect(await storedSelfAssessment(className, studentName)).toEqual(expected);
  });

Then('the system stores the self-assessment grade {string} of the student {string} for the goal {string} in the class {string}',
  async function (grade: string, studentName: string, goal: string, className: string) {
    expect((await storedSelfAssessment(className, studentName))[goal]).toBe(grade);
  });

Then('the system stores the professor grade {string} of the student {string} for the goal {string} in the class {string}',
  async function (grade: string, studentName: string, goal: string, className: string) {
    const enrollment = await enrollmentOf(className, studentName);
    expect(enrollment.evaluations).toContainEqual({ goal, grade });
  });

Then('the system stores no self-assessment grade of the student {string} in the class {string}',
  async function (studentName: string, className: string) {
    expect(await storedSelfAssessment(className, studentName)).toEqual({});
  });
