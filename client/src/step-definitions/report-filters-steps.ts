import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Page } from 'puppeteer';
import expect from 'expect';
import { getPage } from './shared-browser';

setDefaultTimeout(60 * 1000);

const BASE_URL = 'http://127.0.0.1:3004';
const SERVER_URL = 'http://127.0.0.1:3005';

let page: Page;
let currentClassId: string | null = null;
let createdCpfs: string[] = [];
let currentClassName: string = '';

// Hooks

Before({ tags: '@gui-report' }, async function () {
  currentClassId = null;
  createdCpfs = [];
  currentClassName = '';
  page = await getPage();
});

After({ tags: '@gui-report' }, async function () {
  const cleanup = async () => {
    let cleanupErrors: string[] = [];
    
    for (const cpf of createdCpfs) {
      try {
        const response = await fetch(`${SERVER_URL}/api/students/${cpf}`, { method: 'DELETE' });
        if (!response.ok) {
          cleanupErrors.push(`Failed to delete student ${cpf}: ${response.status}`);
        }
      } catch (error) {
        cleanupErrors.push(`Error deleting student ${cpf}: ${error}`);
      }
    }
    
    if (currentClassId) {
      try {
        const response = await fetch(`${SERVER_URL}/api/classes/${currentClassId}`, { method: 'DELETE' });
        if (!response.ok) {
          cleanupErrors.push(`Failed to delete class ${currentClassId}: ${response.status}`);
        }
      } catch (error) {
        cleanupErrors.push(`Error deleting class ${currentClassId}: ${error}`);
      }
    }
    
    if (cleanupErrors.length > 0) {
      console.warn('Cleanup warnings:', cleanupErrors);
    }
  };
  
  await cleanup();
});

// Helper Functions

async function verifyTableCount(expectedCount: number): Promise<void> {
  try {
    await page.waitForFunction(
      (expected) => {
        const rows = document.querySelectorAll('table.students-table tbody tr');
        const emptyState = document.querySelector('.empty-state-row');
        if (expected === 0) return !!emptyState || rows.length === 0;
        const realRows = Array.from(rows).filter(r => !r.classList.contains('empty-state-row'));
        return realRows.length === expected;
      },
      { timeout: 5000 },
      expectedCount
    );
  } catch {
    await page.screenshot({ path: 'table-count-error.png' });
    throw new Error(`Count mismatch: Expected ${expectedCount} students.`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Given Steps

Given('a class exists with name {string} for GUI testing', async function (className: string) {
  const uniqueTopic = `${className} ${Date.now()}`;
  currentClassName = uniqueTopic;
  
  const response = await fetch(`${SERVER_URL}/api/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: uniqueTopic,
      semester: 1,
      year: 2025
    })
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(`Failed to create class via API: ${data.error || response.statusText}`);
  }
  currentClassId = data._id || data.id;
});

Given('the following students have evaluations for the GUI test:', async function (dataTable: DataTable) {
  const rows = dataTable.hashes();

  for (const row of rows) {
    await fetch(`${SERVER_URL}/api/students/${row.cpf}`, { method: 'DELETE' }).catch(() => {});

    await fetch(`${SERVER_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: row.name, cpf: row.cpf, email: `${row.name}@test.com` })
    });
    createdCpfs.push(row.cpf);

    await fetch(`${SERVER_URL}/api/classes/${currentClassId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCPF: row.cpf })
    });

    const evalRes = await fetch(`${SERVER_URL}/api/classes/${currentClassId}/enrollments/${row.cpf}/evaluation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'Filter Test', grade: row.gradeType })
    });

    if (!evalRes.ok) {
      const err = await evalRes.text();
      throw new Error(`API rejected grade assignment: ${err}`);
    }
  }
});

Given('I am on the home page', async function () {
  await page.goto(`${BASE_URL}/`);
  await page.waitForSelector('h1', { timeout: 10000 });
});

Given('I navigate to the {string} section', async function (sectionName: string) {
  const selector = `[data-testid="${sectionName.toLowerCase()}-tab"]`;
  await page.waitForSelector(selector);
  await page.click(selector);
  await delay(500);
});

// When Steps

When('I click on the report button for the class {string}', async function (_className: string) {
  if (!currentClassId) throw new Error('No class ID available');
  
  const reportBtnSelector = `[data-testid="report-class-${currentClassId}"]`;
  
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, reportBtnSelector);
  await delay(300);

  let reportBtn = await page.$(reportBtnSelector);

  if (!reportBtn) {
    const rows = await page.$$('table tbody tr');
    for (const row of rows) {
      const text = await page.evaluate(el => el.textContent, row);
      if (text && currentClassName && text.includes(currentClassName.split(' ')[0])) {
        reportBtn = await row.$('button');
        if (reportBtn) break;
      }
    }
  }

  if (!reportBtn) throw new Error('Report button not found');

  await reportBtn.click();
  await page.waitForSelector('table.students-table, .empty-state-row', { timeout: 10000 });
});

When('I select {string} in the filter dropdown', async function (optionText: string) {
  const valueMap: Record<string, string> = {
    'Approved': 'APPROVED',
    'Below Class Average': 'BELOW_AVG',
    'Below specific grade...': 'BELOW_X'
  };
  const value = valueMap[optionText] || 'ALL';

  await page.waitForSelector('#filterType');
  await page.select('#filterType', value);

  await page.evaluate((val) => {
    const el = document.querySelector('#filterType') as HTMLSelectElement;
    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);

  await delay(1000);
});

When('I set the threshold value to {float}', async function (value: number) {
  await page.waitForSelector('.filter-input-x');
  const input = await page.$('.filter-input-x');
  await input?.click({ clickCount: 3 });
  await input?.type(String(value));
  await delay(500);
});

// Then Steps

Then('the student table should show exactly {int} student', async function (count: number) {
  await verifyTableCount(count);
});

Then('the student table should show exactly {int} students', async function (count: number) {
  await verifyTableCount(count);
});

Then('the student {string} should be visible in the list', async function (name: string) {
  const xpath = `xpath///table[contains(@class, 'students-table')]//td[contains(., '${name}')]`;
  await page.waitForSelector(xpath, { timeout: 5000 });
});

Then('the student {string} should NOT be visible in the list', async function (name: string) {
  const xpath = `xpath///table[contains(@class, 'students-table')]//td[contains(., '${name}')]`;
  const elements = await page.$$(xpath);
  expect(elements.length).toBe(0);
});