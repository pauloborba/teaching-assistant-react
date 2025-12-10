import { After, Before, DataTable, Given, setDefaultTimeout, Then, When } from '@cucumber/cucumber';
import expect from 'expect';
import { Browser, launch, Page } from 'puppeteer';

setDefaultTimeout(30 * 1000);

let browser: Browser;
let page: Page;
const baseUrl = 'http://localhost:3004';
let testScriptTitle: string;

Before({ tags: '@gui' }, async function () {
  browser = await launch({ headless: false, slowMo: 50 });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async function () {
  if (testScriptTitle) {
    try {
      await page.goto(baseUrl);
      await page.waitForSelector('.scripts-list table', { timeout: 5000 });
      const scriptRows = await page.$$('[data-testid^="script-row-"]');
      for (const row of scriptRows) {
        const titleCell = await row.$('[data-testid="script-title"]');
        if (titleCell) {
          const title = await page.evaluate(el => el.textContent, titleCell);
          if (title === testScriptTitle) {
            page.once('dialog', async (dialog) => { await dialog.accept(); });
            const deleteButton = await row.$(`[data-testid="delete-script-${title}"]`);
            if (deleteButton) {
              await deleteButton.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              break;
            }
          }
        }
      }
    } catch (error) {}
  }
  if (browser) await browser.close();
});

Given('the script management system is running', async function () {
  await page.goto(baseUrl);
  await page.waitForSelector('h1', { timeout: 10000 });
  const title = await page.$eval('h1', el => el.textContent);
  expect(title || '').toContain('Teaching Assistant React');
});

Given('there is no script with title {string} in the system', async function (title: string) {
  testScriptTitle = title;
  await page.goto(baseUrl);
  await page.waitForSelector('.scripts-list', { timeout: 10000 });
  const scriptRows = await page.$$('[data-testid^="script-row-"]');
  for (const row of scriptRows) {
    const titleCell = await row.$('[data-testid="script-title"]');
    if (titleCell) {
      const displayedTitle = await page.evaluate(el => el.textContent, titleCell);
      if (displayedTitle === title) {
        page.once('dialog', async (dialog) => { await dialog.accept(); });
        const deleteButton = await row.$(`[data-testid="delete-script-${displayedTitle}"]`);
        if (deleteButton) {
          await deleteButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
        }
      }
    }
  }
  await page.reload();
  await page.waitForSelector('.scripts-list', { timeout: 5000 });
  const updatedRows = await page.$$('[data-testid^="script-row-"]');
  for (const row of updatedRows) {
    const titleCell = await row.$('[data-testid="script-title"]');
    if (titleCell) {
      const displayedTitle = await page.evaluate(el => el.textContent, titleCell);
      if (displayedTitle === title) {
        throw new Error(`Script with title ${displayedTitle} still exists in the system after cleanup`);
      }
    }
  }
});

When('I navigate to the Scripts area', async function () {
  const scriptsTab = await page.$('[data-testid="scripts-tab"]');
  if (scriptsTab) {
    const isActive = await page.evaluate(el => el?.classList.contains('active'), scriptsTab);
    if (!isActive) await scriptsTab.click();
  }
  await page.waitForSelector('[data-testid="script-form"]', { timeout: 5000 });
});

When('I provide the script information:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  await page.waitForSelector('#title');
  await page.click('#title');
  await page.type('#title', data.title);
  await page.click('#description');
  await page.type('#description', data.description);
  await page.click('#tasks');
  await page.type('#tasks', data.tasks);
});

When('I send the script information', async function () {
  const submitButton = await page.$('[data-testid="submit-script-button"]');
  expect(submitButton).toBeTruthy();
  await submitButton?.click();
  await new Promise(resolve => setTimeout(resolve, 2000));
});

When('I edit the script information:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  await page.goto(baseUrl);
  await page.waitForSelector('.scripts-list table', { timeout: 10000 });
  const scriptRows = await page.$$('[data-testid^="script-row-"]');
  let foundScript = null;
  for (const row of scriptRows) {
    const titleCell = await row.$('[data-testid="script-title"]');
    if (titleCell) {
      const title = await page.evaluate(el => el.textContent, titleCell);
      if (title === testScriptTitle) {
        foundScript = row;
        break;
      }
    }
  }
  expect(foundScript).toBeTruthy();
  const editButton = await foundScript!.$('[data-testid="edit-script-button"]');
  expect(editButton).toBeTruthy();
  await editButton?.click();
  await page.waitForSelector('[data-testid="script-form"]', { timeout: 5000 });
  await page.click('#title', { clickCount: 3 });
  await page.type('#title', data.title);
  await page.click('#description', { clickCount: 3 });
  await page.type('#description', data.description);
  await page.click('#tasks', { clickCount: 3 });
  await page.type('#tasks', data.tasks);
  const submitButton = await page.$('[data-testid="submit-script-button"]');
  expect(submitButton).toBeTruthy();
  await submitButton?.click();
  await new Promise(resolve => setTimeout(resolve, 2000));
  testScriptTitle = data.title;
});

Then('I should see {string} in the script list', async function (scriptTitle: string) {
  await page.waitForSelector('.scripts-list table', { timeout: 10000 });
  const scriptRows = await page.$$('[data-testid^="script-row-"]');
  let foundScript = null;
  for (const row of scriptRows) {
    const titleCell = await row.$('[data-testid="script-title"]');
    if (titleCell) {
      const title = await page.evaluate(el => el.textContent, titleCell);
      if (title === scriptTitle) {
        foundScript = row;
        break;
      }
    }
  }
  expect(foundScript).toBeTruthy();
});

Then('the script should have description {string}', async function (expectedDescription: string) {
  await page.waitForSelector('.scripts-list table', { timeout: 10000 });
  const scriptRows = await page.$$('[data-testid^="script-row-"]');
  let foundScript = null;
  for (const row of scriptRows) {
    const titleCell = await row.$('[data-testid="script-title"]');
    if (titleCell) {
      const title = await page.evaluate(el => el.textContent, titleCell);
      if (title === testScriptTitle) {
        foundScript = row;
        break;
      }
    }
  }
  expect(foundScript).toBeTruthy();
  const descCell = await foundScript!.$('[data-testid="script-description"]');
  const actualDesc = await page.evaluate(el => el.textContent, descCell!);
  expect(actualDesc).toBe(expectedDescription);
});
