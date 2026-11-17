import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import expect from 'expect';
import {
  api, apiOk, classPath, classRef, enrollmentOf, enrollmentPath, ensureClass, rememberResponse,
  requireLastResponse, setThreshold, submitSelfAssessment
} from './support/api';
import { page, textOf } from './support/browser';

/**
 * Steps of the discrepancies feature
 * (features/discrepancy-professor-student-grade.feature).
 */

// ---------------------------------------------------------------------------
// Grade tables
// ---------------------------------------------------------------------------

/**
 * One grade of a table with the columns "student", "professor <goal>" and
 * "self-assessment <goal>". An empty cell or "-" means no grade.
 */
interface GradeCell {
  student: string;
  author: 'professor' | 'self-assessment';
  goal: string;
  grade: string;
}

const GRADE_COLUMN = /^(professor|self-assessment) (.+)$/;

function gradeCells(table: DataTable): GradeCell[] {
  const cells: GradeCell[] = [];
  for (const row of table.hashes()) {
    for (const [column, value] of Object.entries(row)) {
      if (column === 'student') {
        continue;
      }
      const match = GRADE_COLUMN.exec(column);
      if (!match) {
        throw new Error(`Column "${column}" is not "student", "professor <goal>" or "self-assessment <goal>"`);
      }
      cells.push({
        student: row.student,
        author: match[1] as GradeCell['author'],
        goal: match[2],
        grade: value === '-' ? '' : value
      });
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Set up
// ---------------------------------------------------------------------------

Given('the discrepancy threshold of the class {string} is {string}', async function (className: string, threshold: string) {
  await ensureClass(className);
  await setThreshold(className, Number(threshold));
});

Given('the class {string} has the following grades:', async function (className: string, table: DataTable) {
  const cells = gradeCells(table).filter(cell => cell.grade !== '');
  const selfAssessments = new Map<string, Record<string, string>>();
  for (const { student, author, goal, grade } of cells) {
    if (author === 'professor') {
      await apiOk('PUT', `${enrollmentPath(className, student)}/evaluation`, { goal, grade });
    } else {
      selfAssessments.set(student, { ...selfAssessments.get(student), [goal]: grade });
    }
  }
  // Each student submits the whole self-assessment at once
  for (const [student, grades] of Array.from(selfAssessments)) {
    await submitSelfAssessment(className, student, grades);
  }
});

// ---------------------------------------------------------------------------
// GUI steps
// ---------------------------------------------------------------------------

const thresholdInput = '[data-testid="discrepancy-threshold-input"]';

/** The cells of each row of the table with the given test id. */
async function rowsOf(tableTestId: string): Promise<string[][]> {
  const table = `[data-testid="${tableTestId}"]`;
  await page().waitForSelector(table, { timeout: 10000 });
  return page().$$eval(`${table} tbody tr`, rows =>
    rows.map(row => Array.from(row.querySelectorAll('td')).map(cell => cell.textContent ?? '')));
}

When('I change the discrepancy threshold to {string}', async function (threshold: string) {
  await page().waitForSelector(thresholdInput, { timeout: 10000 });
  await page().click(thresholdInput, { clickCount: 3 }); // selects what is there, which typing replaces
  await page().type(thresholdInput, threshold);
  await page().click('[data-testid="save-discrepancy-threshold"]');
  // Changing ends with either a confirmation or an error message
  await page().waitForSelector('[data-testid="confirmation-message"], [data-testid="error-message"]', { timeout: 10000 });
});

Then('I see the discrepancy threshold {string}', async function (threshold: string) {
  await page().waitForSelector(thresholdInput, { timeout: 10000 });
  expect(await page().$eval(thresholdInput, el => (el as HTMLInputElement).value)).toBe(threshold);
});

Then('I see the discrepant students, in this order:', async function (table: DataTable) {
  expect(await rowsOf('discrepant-students')).toEqual(table.hashes().map(row => [row.student, row.discrepancy]));
});

Then('I see the students whose discrepancy could not be computed:', async function (table: DataTable) {
  expect(await rowsOf('uncomputable-students')).toEqual(table.hashes().map(row => [row.student, row.missing]));
});

Then('I see {string} of {string} students as discrepant, which is {string}',
  async function (discrepant: string, computable: string, percentage: string) {
    expect({
      discrepant: await textOf('discrepant-count'),
      computable: await textOf('computable-count'),
      percentage: await textOf('discrepant-percentage')
    }).toEqual({ discrepant, computable, percentage });
  });

// ---------------------------------------------------------------------------
// Service steps
// ---------------------------------------------------------------------------

When('I request the discrepancies of the class {string}', async function (className: string) {
  rememberResponse(await api('GET', `${classPath(className)}/discrepancies`));
});

When('I request to change the discrepancy threshold of the class {string} to {string}',
  async function (className: string, threshold: string) {
    rememberResponse(await api('PUT', `${classPath(className)}/discrepancy-threshold`, { threshold: Number(threshold) }));
  });

Then('the system returns the discrepancies:', async function (table: DataTable) {
  const response = requireLastResponse();
  expect(response.status).toBe(200);
  expect(response.body.students.map((s: any) => ({
    student: s.student.name,
    discrepancy: String(s.discrepancy),
    discrepant: s.discrepant ? 'yes' : 'no'
  }))).toEqual(table.hashes());
});

Then('the system stores the discrepancy threshold {string} for the class {string}',
  async function (threshold: string, className: string) {
    const classes = await apiOk('GET', '/api/classes');
    const classData = classes.body.find((c: any) => c.id === classRef(className).id);
    expect(classData.discrepancyThreshold).toBe(Number(threshold));
  });

Then('the system stores the grades of the class {string}:', async function (className: string, table: DataTable) {
  const stored = [];
  for (const cell of gradeCells(table)) {
    const enrollment = await enrollmentOf(className, cell.student);
    const grades: { goal: string; grade: string }[] =
      cell.author === 'professor' ? enrollment.evaluations : enrollment.selfAssessments;
    stored.push({ ...cell, grade: grades.find(g => g.goal === cell.goal)?.grade ?? '' });
  }
  expect(stored).toEqual(gradeCells(table));
});
