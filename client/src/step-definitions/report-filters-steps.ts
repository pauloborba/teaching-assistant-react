import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

setDefaultTimeout(60 * 1000);

const baseUrl = 'http://127.0.0.1:3004';
const serverUrl = 'http://127.0.0.1:3005';

let browser: Browser;
let page: Page;
let currentClassId: string | null = null;
let createdCpfs: string[] = [];

Before({ tags: '@gui-report' }, async function () {
  currentClassId = null;
  createdCpfs = [];

  browser = await launch({ 
    headless: false, 
    slowMo: 50, 
    defaultViewport: null, 
    args: ['--start-maximized'] 
  });

  page = await browser.newPage();
});

After({ tags: '@gui-report' }, async function () {
  
  if (createdCpfs.length > 0) {
    for (const cpf of createdCpfs) {
      try { 
        await fetch(`${serverUrl}/api/students/${cpf}`, { method: 'DELETE' }); 
      } catch (e) {
        console.log(`Failed to remove student ${cpf}. It may have been deleted already.`);
      }
    }
  }
  
  if (currentClassId) {
    try { 
      await fetch(`${serverUrl}/api/classes/${currentClassId}`, { method: 'DELETE' }); 
    } catch (e) {
      console.log(`Failed to remove class.`);
    }
  }
  
  if (browser) {
    await browser.close();
  }
});

Given('a class exists with name {string} for GUI testing', async function (className: string) {  
  const response = await fetch(`${serverUrl}/api/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: className,
      name: className,
      code: `GUI-${Date.now()}`,
      semester: 1,
      year: 2024
    })
  });

  if (!response.ok) throw new Error('Failed to create class via API');
  const data = await response.json();
  currentClassId = data._id || data.id;
});

Given('the following students have evaluations for the GUI test:', async function (dataTable: DataTable) {
  const rows = dataTable.hashes();
  console.log(`Setting up ${rows.length} students with evaluations.`);

  for (const row of rows) {
    // Clean up before creating (idempotency)
    await fetch(`${serverUrl}/api/students/${row.cpf}`, { method: 'DELETE' }).catch(() => {});
    
    // Create Student
    await fetch(`${serverUrl}/api/students`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: row.name, cpf: row.cpf, email: `${row.name}@test.com` })
    });
    createdCpfs.push(row.cpf);
    
    // Enroll Student
    await fetch(`${serverUrl}/api/classes/${currentClassId}/enroll`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCPF: row.cpf })
    });

    // Assign Grade
    const evalUrl = `${serverUrl}/api/classes/${currentClassId}/enrollments/${row.cpf}/evaluation`;
    const evalRes = await fetch(evalUrl, {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        goal: "Filter Test", 
        grade: row.gradeType
      })
    });

    if (!evalRes.ok) {
      const err = await evalRes.text();
      throw new Error(`API rejected grade assignment: ${err}`);
    }
    console.log(`Student ${row.name} configured with grade/concept: ${row.gradeType}`);
  }
});

Given('I am on the home page', async function () {
  await page.goto(`${baseUrl}/`);
  await page.waitForSelector('h1', { timeout: 10000 });
});

Given('I navigate to the {string} section', async function (sectionName: string) {
  const selector = `[data-testid="${sectionName.toLowerCase()}-tab"]`;
  await page.waitForSelector(selector);
  await page.click(selector);
  await new Promise(r => setTimeout(r, 500));
});

When('I click on the report button for the class {string}', async function (className: string) {
  const containerXpath = `xpath///tr[contains(., '${className}')] | //div[contains(@class, 'card') and contains(., '${className}')]`;
  
  await page.waitForSelector(containerXpath);
  const container = await page.$(containerXpath);
  
  if (!container) throw new Error(`Class '${className}' not found in the list`);

  const btn = await container.$('xpath/.//a[contains(., "Report")] | .//button[contains(., "Report")]');
  
  if (btn) await btn.click();
  else {
    const fallbackLink = await container.$('a');
    if (fallbackLink) await fallbackLink.click();
    else throw new Error('Report button not found');
  }

  await page.waitForSelector('table.student-table, .empty-state-row', { timeout: 10000 });
});

When('I select {string} in the filter dropdown', async function (optionText: string) {
  let value = 'ALL';
  switch (optionText) {
    case 'Approved': value = 'APPROVED'; break;
    case 'Below Class Average': value = 'BELOW_AVG'; break;
    case 'Below specific grade...': value = 'BELOW_X'; break;
  }

  const selector = '#filterType';
  await page.waitForSelector(selector);
  
  await page.select(selector, value);
  await page.evaluate((sel, val) => {
    const el = document.querySelector(sel) as HTMLSelectElement;
    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);

  await new Promise(r => setTimeout(r, 1000));
});

When('I set the threshold value to {float}', async function (value: number) {
  await page.waitForSelector('.filter-input-x');
  const input = await page.$('.filter-input-x');
  await input?.click({ clickCount: 3 });
  await input?.type(String(value));
  await new Promise(r => setTimeout(r, 500));
});

Then('the student table should show exactly {int} student', async function (count: number) {
  console.log(`Verifying table contains exactly ${count} student(s).`);
  await verifyTableCount(count);
  console.log('Table count verification successful.');
});

Then('the student table should show exactly {int} students', async function (count: number) {
  console.log(`Verifying table contains exactly ${count} student(s).`);
  await verifyTableCount(count);
  console.log('Table count verification successful.');
});

Then('the student {string} should be visible in the list', async function (name: string) {
  console.log(`Verifying visibility of student: ${name}`);
  const xpath = `xpath///table[contains(@class, 'student-table')]//td[contains(., '${name}')]`;
  await page.waitForSelector(xpath, { timeout: 5000 });
  console.log(`Student ${name} is visible as expected.`);
});

Then('the student {string} should NOT be visible in the list', async function (name: string) {
  console.log(`Verifying absence of student: ${name}`);
  const xpath = `xpath///table[contains(@class, 'student-table')]//td[contains(., '${name}')]`;
  const elements = await page.$$(xpath);
  expect(elements.length).toBe(0);
  console.log(`Student ${name} is not visible as expected.`);
});

async function verifyTableCount(expectedCount: number) {
  try {
    await page.waitForFunction(
      (expected) => {
        const rows = document.querySelectorAll('table.student-table tbody tr');
        const emptyState = document.querySelector('.empty-state-row');
        if (expected === 0) return !!emptyState || rows.length === 0;
        const realRows = Array.from(rows).filter(r => !r.classList.contains('empty-state-row'));
        return realRows.length === expected;
      },
      { timeout: 5000 },
      expectedCount
    );
  } catch (e) {
    await page.screenshot({ path: 'table-count-error.png' });
    throw new Error(`Count mismatch: Expected ${expectedCount} students. Screenshot saved to 'table-count-error.png'.`);
  }
}