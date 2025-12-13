import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

setDefaultTimeout(30 * 1000);

let browser: Browser;
let page: Page;
const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';
let lastTaskId : string | null = null;

// -----------------------------------------------------------
// Setup and Teardown
// -----------------------------------------------------------


Before({ tags: '@gui' }, async () => {
  browser = await launch({ headless: false, slowMo:  50});
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async () => {
  if (browser) await browser.close();

});

// -----------------------------------------------------------
// Navigation
// -----------------------------------------------------------


Given(/^I am in the script grading area$/i, async () => {
  await page.goto(baseUrl);
  await page.waitForSelector('[data-testid="script-grading-tab"]', { timeout: 5000 });
  
  const tab = await page.$('[data-testid="script-grading-tab"]');
  expect(tab).toBeTruthy();
  
  if (tab) {
    // Log the button state before clicking
    const isActive = await page.evaluate(el => el.classList.contains('active'), tab);
    console.log('Tab is active before click:', isActive);
    
    if (!isActive) {
      console.log('Clicking script grading tab...');
      await tab.click();
      
      // Add a small delay to let the click register
      await new Promise(r => setTimeout(r, 500));
      
      // Check if it's active now
      const isActiveAfter = await page.evaluate(el => el.classList.contains('active'), tab);
      console.log('Tab is active after click:', isActiveAfter);
      
      // Try to find the grading content
      console.log('Waiting for grading page content...');
      try {
        await page.waitForSelector('[data-testid="grading-page-title"]', { timeout: 5000 });
        console.log('Grading page title found!');
      } catch (e) {
        console.log('Grading page title NOT found. Available elements:');
        const allTestIds = await page.$$eval('[data-testid]', els => els.map(el => el.getAttribute('data-testid')));
        console.log('Data test IDs on page:', allTestIds);
      }
    }
  }
  
  const grading = await page.$('[data-testid="grading-page-title"]');
  expect(grading).toBeTruthy();
});


// -----------------------------------------------------------
// GUI interactions
// -----------------------------------------------------------
When(/^I select the script answer with ID "([^"]+)"$/i, async (saId: string) => {
  await page.waitForSelector(`[data-testid="script-answer-row-${saId}"]`, { timeout: 5000 });
  await page.click(`[data-testid="script-answer-row-${saId}"]`);
  await page.waitForSelector('[data-testid="script-grading"]', { timeout: 5000 });
});

Then(/^I should see the script answer details$/i, async () => {
  const details = await page.$('[data-testid="script-grading"]');
  expect(details).toBeTruthy();
});

Then(/^I should see all tasks associated with the script answer$/i, async () => {
  await page.waitForSelector('[data-testid^="task-answer-"]', { timeout: 5000 });
  const tasks = await page.$$('[data-testid^="task-answer-"]');
  expect(tasks.length).toBeGreaterThan(0);
});

Given(/^I see the task with ID "([^"]+)"$/i, async (taskId: string) => {
  expect(await page.$(`[data-testid="task-answer-${taskId}"]`)).toBeTruthy();
  lastTaskId = taskId;
});

When(/^I change the grade to "([^"]+)"$/i, async (grade: string) => {
  if (!lastTaskId) {
    throw new Error('No task ID set. Use "When I select the task with ID" first.');
  }

  await page.waitForSelector(`[data-testid="task-grade-input-${lastTaskId}"]`, { timeout: 5000 });
  
  // Click the select element to open the dropdown
  await page.click(`[data-testid="task-grade-input-${lastTaskId}"]`);
  
  // Wait a bit for the options to render
  await new Promise(r => setTimeout(r, 300));
  
  // The component uses native <select> with <option> elements
  // Select the option by its value attribute
  await page.select(`[data-testid="task-grade-input-${lastTaskId}"]`, grade);
  
  console.log(`Grade changed to: ${grade}`);
});


Then(/^I should see the grade of task "([^"]+)" updated to "([^"]+)"$/i, async (taskId: string, grade: string) => {
  const selectSelector = `[data-testid="task-grade-input-${taskId}"]`;
  
  await page.waitForSelector(selectSelector, { timeout: 5000 });
  
  // Check the selected option's text content
  const selectedText = await page.$eval(
    `${selectSelector} option:checked`,
    el => el.textContent || ''
  );
  
  expect(selectedText).toBe(grade);
  console.log(`Grade verified as: ${grade}`);
});

When(/^I change the comment to "([^"]+)"$/i, async (comment: string) => {
  await page.waitForSelector(`[data-testid="task-comment-input-${lastTaskId}"]`, { timeout: 5000 });
  await page.click(`[data-testid="task-comment-input-${lastTaskId}"]`, { clickCount: 3 });
  await page.type(`[data-testid="task-comment-input-${lastTaskId}"]`, comment);
});


Then(/^I should see the comment of task "([^"]+)" updated to "([^"]+)"$/i, async (taskId: string, comment: string) => {
  const textareaSelector = `[data-testid="task-comment-input-${taskId}"]`;

  await page.waitForSelector(textareaSelector, { timeout: 5000 });

  const currentValue = await page.$eval(
    textareaSelector,
    el => (el as HTMLTextAreaElement).value
  );

  expect(currentValue).toBe(comment);
  console.log(`Comment verified as: ${comment}`);
});

When(/^I save all task updates$/i, async () => {
  const btn = await page.$('[data-testid="task-save-button-' + lastTaskId + '"]');
  expect(btn).toBeTruthy();
  await btn?.click();
  await new Promise(r => setTimeout(r, 800));
});