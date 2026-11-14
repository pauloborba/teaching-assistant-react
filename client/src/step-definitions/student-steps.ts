import { Given, When, Then, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { ElementHandle } from 'puppeteer';
import expect from 'expect';
// The tests compare CPFs the way the interface shows them
import { formatCPF } from '../types/CPF';
import { clientUrl as baseUrl, page } from './support/browser';
import { serverUrl } from './support/api';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

// Test data to clean up
let testStudentCPF: string;

/** Text of a cell of a student row, identified by its test id. */
const cellText = async (row: ElementHandle<Element>, testId: string): Promise<string | null> => {
  const cell = await row.$(`[data-testid="${testId}"]`);
  return cell ? page().evaluate(el => el.textContent, cell) : null;
};

/**
 * The row of the student list whose CPF is the given one, in either the
 * plain or the formatted spelling, or null when there is no such row.
 */
const findStudentRow = async (cpf: string): Promise<ElementHandle<Element> | null> => {
  for (const row of await page().$$('[data-testid^="student-row-"]')) {
    const displayedCPF = await cellText(row, 'student-cpf');
    if (displayedCPF === cpf || displayedCPF === formatCPF(cpf)) {
      return row;
    }
  }
  return null;
};

/** Deletes, through the interface, the student with the given CPF, if listed. */
const deleteStudentIfListed = async (cpf: string): Promise<void> => {
  const row = await findStudentRow(cpf);
  if (!row) {
    return;
  }
  const displayedCPF = await cellText(row, 'student-cpf');
  // Set up dialog handler before clicking delete
  page().once('dialog', async (dialog) => {
    console.log(`GUI cleanup: Confirming deletion dialog: ${dialog.message()}`);
    await dialog.accept(); // Confirm deletion
  });
  const deleteButton = await row.$(`[data-testid="delete-student-${displayedCPF}"]`);
  if (deleteButton) {
    await deleteButton.click();
    // Wait for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`GUI cleanup: Removed student with CPF: ${displayedCPF}`);
  }
};

/** The row of the test student, failing the step when it is not listed. */
const requireTestStudentRow = async (): Promise<ElementHandle<Element>> => {
  // Wait for the student list to update
  await page().waitForSelector('.students-list table', { timeout: 10000 });
  const row = await findStudentRow(testStudentCPF);
  expect(row).toBeTruthy();
  return row!;
};

After({ tags: '@gui' }, async function () {
  // Clean up test student if it exists by using the GUI delete function
  if (testStudentCPF) {
    try {
      await page().goto(baseUrl);
      await page().waitForSelector('.students-list table', { timeout: 5000 });
      await deleteStudentIfListed(testStudentCPF);
    } catch (error) {
      console.log('GUI cleanup: Student may not exist or GUI unavailable');
    }
  }
});

Given('the student management system is running', async function () {
  await page().goto(baseUrl);
  await page().waitForSelector('h1', { timeout: 10000 });
  const title = await page().$eval('h1', el => el.textContent);
  expect(title || '').toContain('Teaching Assistant React');
});

Given('the server is available', async function () {
  try {
    const response = await fetch(`${serverUrl}/api/students`);
    expect(response.status).toBe(200);
  } catch (error) {
    throw new Error('Server is not available. Make sure the backend server is running on port 3005');
  }
});

Given('there is no student with CPF {string} in the system', async function (cpf: string) {
  testStudentCPF = cpf;
  
  // Navigate to the application and check if student exists through GUI
  await page().goto(baseUrl);
  await page().waitForSelector('.students-list', { timeout: 10000 });
  
  // Delete the student if it exists (cleanup before test)
  await deleteStudentIfListed(cpf);
  
  // Verify student doesn't exist by checking the GUI
  await page().reload(); // Refresh to ensure clean state
  await page().waitForSelector('.students-list', { timeout: 5000 });
  
  const remainingRow = await findStudentRow(cpf);
  if (remainingRow) {
    throw new Error(`Student with CPF ${cpf} still exists in the system after cleanup`);
  }
});

When('I navigate to the Students area', async function () {
  // Click on the Students tab
  const studentsTab = await page().$('[data-testid="students-tab"]');
  if (studentsTab) {
    const isActive = await page().evaluate(el => el?.classList.contains('active'), studentsTab);
    
    if (!isActive) {
      await studentsTab.click();
    }
  }
  
  // Wait for the student form to be visible
  await page().waitForSelector('[data-testid="student-form"]', { timeout: 5000 });
});

When('I provide the student information:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  // Fill in each field using its semantic ID
  for (const [id, value] of [['name', data.name], ['cpf', data.cpf], ['email', data.email]]) {
    await page().waitForSelector(`#${id}`);
    await page().click(`#${id}`);
    await page().type(`#${id}`, value);
  }
});

When('I send the student information', async function () {
  // Click the submit button using semantic test ID
  const submitButton = await page().$('[data-testid="submit-student-button"]');
  expect(submitButton).toBeTruthy();
  
  await submitButton?.click();
  
  // Wait for the information to be processed and student to appear
  await new Promise(resolve => setTimeout(resolve, 2000));
});

Then('I should see {string} in the student list', async function (studentName: string) {
  const row = await requireTestStudentRow();
  expect(await cellText(row, 'student-name')).toBe(studentName);
});

Then('the student should have CPF {string}', async function (expectedCPF: string) {
  const row = await requireTestStudentRow();
  expect(await cellText(row, 'student-cpf')).toBe(expectedCPF);
});

Then('the student should have email {string}', async function (expectedEmail: string) {
  const row = await requireTestStudentRow();
  expect(await cellText(row, 'student-email')).toBe(expectedEmail);
});
