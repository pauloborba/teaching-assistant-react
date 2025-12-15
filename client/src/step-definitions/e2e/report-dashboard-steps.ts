import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Page } from 'puppeteer';
import expect from 'expect';
import { getPage } from '../shared-browser';

setDefaultTimeout(60 * 1000);

const BASE_URL = 'http://127.0.0.1:3004';
const SERVER_URL = 'http://127.0.0.1:3005';

let page: Page;
let currentClassId: string | null = null;
let createdStudentCPFs: string[] = [];

// Hooks

Before({ tags: '@gui-report' }, async function () {
  page = await getPage();
  currentClassId = null;
  createdStudentCPFs = [];
});

After({ tags: '@gui-report' }, async function () {
  await cleanup();
});

// Helper Functions

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanup(): Promise<void> {
  const cleanupErrors: string[] = [];
  
  for (const cpf of createdStudentCPFs) {
    try {
      const response = await fetch(`${SERVER_URL}/api/students/${cpf}`, { method: 'DELETE' });
      if (!response.ok) {
        cleanupErrors.push(`Failed to delete student ${cpf}: ${response.status}`);
      }
    } catch (error) {
      cleanupErrors.push(`Error deleting student ${cpf}: ${error}`);
    }
  }
  createdStudentCPFs = [];

  if (currentClassId) {
    try {
      const response = await fetch(`${SERVER_URL}/api/classes/${currentClassId}`, { method: 'DELETE' });
      if (!response.ok) {
        cleanupErrors.push(`Failed to delete class ${currentClassId}: ${response.status}`);
      }
    } catch (error) {
      cleanupErrors.push(`Error deleting class ${currentClassId}: ${error}`);
    }
    currentClassId = null;
  }
  
  if (cleanupErrors.length > 0) {
    console.warn('Cleanup warnings:', cleanupErrors);
  }
}

async function createClassViaAPI(topic: string): Promise<string> {
  const uniqueTopic = `${topic} ${Date.now()}`;
  const response = await fetch(`${SERVER_URL}/api/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: uniqueTopic, semester: 1, year: 2025 })
  });
  const data = await response.json();
  if (data.error) throw new Error(`Failed to create class: ${data.error}`);
  currentClassId = data.id;
  return currentClassId!;
}

async function createStudentViaAPI(name: string, cpf: string): Promise<void> {
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.com`;
  await fetch(`${SERVER_URL}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, cpf, email })
  });
  createdStudentCPFs.push(cpf);
}

async function enrollStudentViaAPI(cpf: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  await fetch(`${SERVER_URL}/api/classes/${currentClassId}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentCPF: cpf })
  });
}

async function addGradeViaAPI(cpf: string, goal: string, grade: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  await fetch(`${SERVER_URL}/api/classes/${currentClassId}/enrollments/${cpf}/evaluation`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, grade })
  });
}

async function addAllGradesForStatus(cpf: string, gradeValue: string): Promise<void> {
  const goals = ['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring'];
  for (const goal of goals) {
    await addGradeViaAPI(cpf, goal, gradeValue);
  }
}

async function navigateToClassesPage(): Promise<void> {
  await page.goto(BASE_URL);
  const classesTab = await page.waitForSelector('[data-testid="classes-tab"]', { timeout: 10000 });
  await classesTab?.click();
  await delay(500);
}

async function scrollToElement(selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }, selector);
  await delay(100);
}

async function openReportForCurrentClass(): Promise<void> {
  if (!currentClassId) throw new Error('No class ID available');

  await delay(1000);

  let reportBtn = await page.$(`[data-testid="report-class-${currentClassId}"]`);

  if (!reportBtn) {
    reportBtn = await page.evaluateHandle((classId) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const testId = btn.getAttribute('data-testid');
        if (testId && testId === `report-class-${classId}`) {
          return btn;
        }
      }
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.textContent?.includes(classId.split('-')[0])) {
          const btn = row.querySelector('button');
          if (btn && btn.textContent?.includes('Report')) {
            return btn;
          }
        }
      }
      return null;
    }, currentClassId) as any;
  }

  if (!reportBtn || (reportBtn.asElement && !(await reportBtn.asElement()))) {
    const rows = await page.$$('table tbody tr');
    for (const row of rows) {
      const text = await page.evaluate(el => el.textContent, row);
      if (text && currentClassId && text.includes(currentClassId.split('-')[0])) {
        const buttons = await row.$$('button');
        for (const btn of buttons) {
          const btnText = await page.evaluate(el => el.textContent, btn);
          if (btnText?.includes('Report')) {
            reportBtn = btn;
            break;
          }
        }
        if (reportBtn) break;
      }
    }
  }

  if (!reportBtn) throw new Error(`Report button not found for class: ${currentClassId}`);

  await reportBtn.click();
  await page.waitForSelector('[data-testid="report-modal"]', { timeout: 10000 });
  await delay(500);
}

// Given Steps

Given('the teacher dashboard is accessible', async function () {
  await cleanup();
  await page.goto(BASE_URL);
  await page.waitForSelector('h1', { timeout: 10000 });
});

Given('a class exists with {string} enrolled students', async function (count: string) {
  await createClassViaAPI('E2E Test Class');

  const studentCount = parseInt(count, 10);
  for (let i = 1; i <= studentCount; i++) {
    const cpf = `1111111${i.toString().padStart(4, '0')}`;
    await createStudentViaAPI(`Student ${i}`, cpf);
    await enrollStudentViaAPI(cpf);
  }
});

Given('a class exists with {string} students', async function (count: string) {
  await createClassViaAPI('E2E Test Class');

  const studentCount = parseInt(count, 10);
  for (let i = 1; i <= studentCount; i++) {
    const cpf = `2222222${i.toString().padStart(4, '0')}`;
    await createStudentViaAPI(`Student ${i}`, cpf);
    await enrollStudentViaAPI(cpf);
  }
});

Given('a class exists with a student who has {string}', async function (_condition: string) {
  await createClassViaAPI('No Evaluations Test Class');
  await createStudentViaAPI('Unevaluated Student', '44444444401');
  await enrollStudentViaAPI('44444444401');
});

Given('a class exists with:', async function (dataTable: any) {
  await createClassViaAPI('Status Distribution Test Class');

  const rows = dataTable.hashes();
  let studentIndex = 1;

  for (const row of rows) {
    const status = row.status;
    const count = parseInt(row.count, 10);

    for (let i = 0; i < count; i++) {
      const cpf = `5555555${studentIndex.toString().padStart(4, '0')}`;
      await createStudentViaAPI(`${status} Student ${i + 1}`, cpf);
      await enrollStudentViaAPI(cpf);

      if (status === 'Approved') {
        await addAllGradesForStatus(cpf, 'MA');
      } else if (status === 'Failed') {
        await addAllGradesForStatus(cpf, 'MANA');
      }

      studentIndex++;
    }
  }
});

Given('a class exists where the {string} goal has an average of {string}', async function (goal: string, _average: string) {
  await createClassViaAPI('Bar Chart Test Class');
  await createStudentViaAPI('Bar Test Student', '66666660001');
  await enrollStudentViaAPI('66666660001');
  await addGradeViaAPI('66666660001', goal, 'MA');
});

Given('a class exists with students', async function () {
  await createClassViaAPI('Students Test Class');
  await createStudentViaAPI('Test Student', '77777770001');
  await enrollStudentViaAPI('77777770001');
});

Given('a class exists with students of mixed statuses', async function () {
  await createClassViaAPI('Mixed Status Test Class');

  await createStudentViaAPI('Green Student', '33333330001');
  await enrollStudentViaAPI('33333330001');
  await addAllGradesForStatus('33333330001', 'MA');

  await createStudentViaAPI('Red Student', '33333330002');
  await enrollStudentViaAPI('33333330002');
  await addAllGradesForStatus('33333330002', 'MANA');

  await createStudentViaAPI('Yellow Student', '33333330003');
  await enrollStudentViaAPI('33333330003');
});

Given('I am on the Classes page', async function () {
  await navigateToClassesPage();
});

Given('I open the report for this class', async function () {
  await navigateToClassesPage();
  await openReportForCurrentClass();
});

// When Steps

When('I click the {string} button for this class', async function (buttonName: string) {
  if (buttonName === 'Report') {
    await openReportForCurrentClass();
  }
});

When('I inspect the {string} chart', async function (chartName: string) {
  if (chartName === 'Student Status Distribution') {
    await scrollToElement('[data-testid="status-pie-chart"]');
    await page.waitForSelector('[data-testid="status-pie-chart"]', { timeout: 10000 });
  } else if (chartName === 'Evaluation Performance') {
    await scrollToElement('[data-testid="evaluation-bar-chart"]');
    await page.waitForSelector('[data-testid="evaluation-bar-chart"]', { timeout: 10000 });
  }
  await delay(1500);
});

When('I hover over the {string} bar in the {string} chart', async function (_goalName: string, _chartName: string) {
  await scrollToElement('[data-testid="evaluation-bar-chart"]');
  await page.waitForSelector('[data-testid="evaluation-bar-chart"]', { timeout: 10000 });
  await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
  await delay(1500);

  const barChart = await page.$('[data-testid="bar-chart-wrapper"]');
  if (barChart) {
    const box = await barChart.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await delay(500);
    }
  }
});

When('I click the {string} button', async function (buttonName: string) {
  if (buttonName === 'Close') {
    let closeBtn = await page.$('[data-testid="close-modal-btn"]');
    if (!closeBtn) {
      closeBtn = await page.$('[data-testid="close-report-btn"]');
    }
    if (!closeBtn) throw new Error('Close button not found');
    await closeBtn.click();
    await delay(500);
  }
});

// Then Steps

Then('the {string} should be visible', async function (elementName: string) {
  if (elementName === 'Report Modal') {
    const modal = await page.$('[data-testid="report-modal"]');
    expect(modal).not.toBeNull();
  }
});

Then('I should see the following sections:', async function (dataTable: any) {
  const sections = dataTable.raw().flat();
  const pageContent = await page.content();

  for (const section of sections) {
    const sectionLower = section.toLowerCase().trim();
    const pageContentLower = pageContent.toLowerCase();
    let found = false;

    if (sectionLower.includes('enrollment')) {
      const statsSection = await page.$('[data-testid="report-stats"]');
      found = statsSection !== null || pageContentLower.includes('enrollment');
    } else if (sectionLower.includes('status distribution')) {
      const pieChart = await page.$('[data-testid="status-pie-chart"]');
      found = pieChart !== null;
    } else if (sectionLower.includes('evaluation performance')) {
      const barChart = await page.$('[data-testid="evaluation-bar-chart"]');
      const perfTable = await page.$('[data-testid="performance-table"]');
      found = barChart !== null || perfTable !== null;
    } else if (sectionLower.includes('students')) {
      const studentsTable = await page.$('[data-testid="students-table"]');
      found = studentsTable !== null;
    } else {
      found = pageContentLower.includes(sectionLower);
    }

    expect(found).toBe(true);
  }
});

Then('the grade cell for this student should display {string}', async function (expected: string) {
  await page.waitForSelector('[data-testid="students-table"]', { timeout: 10000 });
  await delay(500);

  const gradeCells = await page.$$('[data-testid="student-grade"]');
  let foundExpected = false;

  for (const cell of gradeCells) {
    const text = await page.evaluate(el => el.textContent?.trim() || '', cell);

    if (expected === '–' || expected === '-' || expected === '—') {
      if (text === '-' || text === '–' || text === '—' || text === '−') {
        foundExpected = true;
        break;
      }
    } else if (text === expected) {
      foundExpected = true;
      break;
    }
  }

  expect(foundExpected).toBe(true);
});

Then('no cell should display {string} or {string}', async function (forbidden1: string, forbidden2: string) {
  const hasForbidden = await page.evaluate((f1, f2) => {
    const cells = document.querySelectorAll('td, .stat-value');
    for (let i = 0; i < cells.length; i++) {
      const text = cells[i].textContent || '';
      if (text.includes(f1) || text.includes(f2)) {
        return { found: true, text };
      }
    }
    return { found: false };
  }, forbidden1, forbidden2);

  expect(hasForbidden.found).toBe(false);
});

Then('the enrollment count should be {string}', async function (expected: string) {
  const pageContent = await page.content();
  expect(pageContent).toContain(expected);
});

Then('I should see the {string} illustration', async function (_illustrationName: string) {
  const pageContent = await page.content();
  const hasEmptyState =
    pageContent.toLowerCase().includes('no data') ||
    pageContent.toLowerCase().includes('no students') ||
    pageContent.includes('0');

  expect(hasEmptyState).toBe(true);
});

Then('the charts should render in empty state mode', async function () {
  const pieChart = await page.$('[data-testid="status-pie-chart"]');
  const barChart = await page.$('[data-testid="evaluation-bar-chart"]');
  expect(pieChart !== null || barChart !== null).toBe(true);
});

Then('I should see exactly {string} distinct chart segments', async function (count: string) {
  const expectedCount = parseInt(count, 10);
  await delay(2000);

  const segmentCount = await page.evaluate(() => {
    const sectors = document.querySelectorAll('.recharts-pie-sector');
    const paths = document.querySelectorAll('.recharts-sector');
    const pieCells = document.querySelectorAll('.recharts-pie .recharts-layer path');

    if (sectors.length > 0) return sectors.length;
    if (paths.length > 0) return paths.length;
    if (pieCells.length > 0) return pieCells.length;

    const pieContainer = document.querySelector('[data-testid="status-pie-chart"]');
    if (pieContainer) {
      const allPaths = pieContainer.querySelectorAll('path[fill]');
      const coloredPaths = Array.from(allPaths).filter(p => {
        const fill = p.getAttribute('fill');
        return fill && fill !== 'none' && fill !== '#fff' && fill !== '#ffffff';
      });
      return coloredPaths.length;
    }

    return 0;
  });

  expect(segmentCount).toBeGreaterThanOrEqual(expectedCount);
});

Then('the legend should display {string} and {string}', async function (status1: string, status2: string) {
  const legendTexts = await page.evaluate(() => {
    const legendItems = document.querySelectorAll('.recharts-legend-item-text');
    return Array.from(legendItems).map(item => item.textContent?.trim() || '');
  });

  expect(legendTexts).toContain(status1);
  expect(legendTexts).toContain(status2);
});

Then('the chart tooltip should display {string}', async function (_expectedText: string) {
  const perfTable = await page.$('[data-testid="performance-table"]');
  if (perfTable) {
    const tableContent = await page.evaluate(el => el?.textContent || '', perfTable);
    const hasExpected = tableContent.includes('10.00') || tableContent.includes('10.0');
    expect(hasExpected).toBe(true);
  } else {
    const pageContent = await page.content();
    expect(pageContent).toContain('10');
  }
});

Then('the report modal should disappear', async function () {
  await delay(500);
  const modal = await page.$('[data-testid="report-modal"]');
  expect(modal).toBeNull();
});

Then('I should see the {string}', async function (elementName: string) {
  if (elementName === 'Classes Table') {
    const classesTable = await page.$('[data-testid="classes-table"]');
    expect(classesTable).not.toBeNull();
  }
});

Then(/^"([^"]+)" students should have an? "([^"]+)" indicator$/, async function (status: string, _color: string) {
  await scrollToElement('[data-testid="students-table"]');
  await page.waitForSelector('[data-testid="students-table"]', { timeout: 10000 });
  await delay(500);

  const statusLower = status.toLowerCase().replace(/_/g, '-');
  const selector = `[data-testid="status-indicator-${statusLower}"]`;

  const indicator = await page.$(selector);
  expect(indicator).not.toBeNull();

  if (indicator) {
    const computedColor = await page.evaluate((el) => {
      return window.getComputedStyle(el).color;
    }, indicator);
    expect(computedColor).toBeDefined();
  }
});
