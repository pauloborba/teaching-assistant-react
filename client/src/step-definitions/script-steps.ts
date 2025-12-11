import { After, Before, DataTable, Given, setDefaultTimeout, Then, When } from '@cucumber/cucumber';
import expect from 'expect';
import { Browser, launch, Page } from 'puppeteer';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

let browser: Browser;
let page: Page;
const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

// Test data to clean up
let testScriptTitle: string;

Before({ tags: '@gui' }, async function () {
  browser = await launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 50 // Slow down actions for visibility
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async function () {
  // Clean up test script if it exists
  if (testScriptTitle) {
    try {
      // Navigate to Scripts area
      await page.goto(baseUrl);
      
      // Click on Scripts tab
      await page.waitForSelector('button', { timeout: 5000 });
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const scriptsButton = buttons.find(btn => btn.textContent?.includes('Scripts'));
        if (scriptsButton) scriptsButton.click();
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Look for our test script and delete it if found
      const scriptItems = await page.$$('[data-testid^="script-item-"]');
      for (const item of scriptItems) {
        const titleElement = await item.$('[data-testid="script-title"]');
        if (titleElement) {
          const title = await page.evaluate(el => el.textContent, titleElement);
          if (title === testScriptTitle) {
            // Click the delete button for this script
            const deleteButton = await item.$(`[data-testid="delete-script-${title}"]`);
            if (deleteButton) {
              await deleteButton.click();
              // Wait for deletion to complete
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log(`GUI cleanup: Removed test script with title: ${title}`);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.log('GUI cleanup: Script may not exist or GUI unavailable');
    }
  }
  
  if (browser) {
    await browser.close();
  }
});

Given('the script management system is running', async function () {
  await page.goto(baseUrl);
  await page.waitForSelector('h1', { timeout: 10000 });
  const title = await page.$eval('h1', el => el.textContent);
  expect(title || '').toContain('Teaching Assistant React');
});

Given('there is no script with title {string} in the system', async function (title: string) {
  testScriptTitle = title;
  
  // Navigate to the application and check if script exists through GUI
  await page.goto(baseUrl);
  
  // Click on Scripts tab
  await page.waitForSelector('button', { timeout: 10000 });
  const buttonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const scriptsButton = buttons.find(btn => btn.textContent?.includes('Scripts'));
    if (scriptsButton) {
      scriptsButton.click();
      return true;
    }
    return false;
  });
  
  if (!buttonClicked) {
    throw new Error('Scripts tab button not found');
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to find the script with the given title
  try {
    const scriptItems = await page.$$('[data-testid^="script-item-"]');
    for (const item of scriptItems) {
      const titleElement = await item.$('[data-testid="script-title"]');
      if (titleElement) {
        const scriptTitle = await page.evaluate(el => el.textContent, titleElement);
        if (scriptTitle === title) {
          throw new Error(`Script with title "${title}" already exists in the system. Please clean up before running the test.`);
        }
      }
    }
  } catch (error) {
    // If we can't find script elements, that's fine - it means no scripts exist
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
  }
});

When('I navigate to the Scripts area', async function () {
  // Click on Scripts tab
  await page.waitForSelector('button', { timeout: 10000 });
  const buttonClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const scriptsButton = buttons.find(btn => btn.textContent?.includes('Scripts'));
    if (scriptsButton) {
      scriptsButton.click();
      return true;
    }
    return false;
  });
  
  if (!buttonClicked) {
    throw new Error('Scripts tab button not found');
  }
  
  // Wait for the Scripts page to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.waitForFunction(
    () => document.querySelector('h2')?.textContent?.includes('Scripts'),
    { timeout: 5000 }
  );
});

When('I provide the script information:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  // Wait for the script editor form to be visible
  await page.waitForSelector('h3', { timeout: 5000 });
  
  // Fill in title
  if (data.title) {
    const titleInput = await page.waitForSelector('input[value=""]', { timeout: 5000 });
    await titleInput.click({ clickCount: 3 }); // Select all
    await titleInput.type(data.title);
  }
  
  // Fill in description
  if (data.description) {
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[1].click({ clickCount: 3 }); // Select all
      await inputs[1].type(data.description);
    }
  }
  
  // Handle tasks
  if (data.tasks) {
    let tasksArray;
    try {
      tasksArray = JSON.parse(data.tasks);
      console.log('Parsed tasks:', tasksArray);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error(`Failed to parse tasks JSON: ${data.tasks}`);
    }
    
    try {
      for (const task of tasksArray) {
        console.log('Adding task:', task);
        
        // Fill in the task input field (placeholder="New task...")
        const taskInput = await page.waitForSelector('input[placeholder="New task..."]', { timeout: 5000 });
        await taskInput.click({ clickCount: 3 }); // Select all
        await taskInput.type(task.statement);
        
        // Click "Add" button to add the task
        await new Promise(resolve => setTimeout(resolve, 200));
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const addButton = buttons.find(btn => {
            const text = btn.textContent?.trim();
            return text === 'Add';
          });
          if (addButton) {
            addButton.click();
            return true;
          }
          return false;
        });
        
        if (!clicked) {
          throw new Error('Add button not found');
        }
        
        // Wait a bit for the task to be added
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Error adding tasks:', error);
      throw error;
    }
  }
});

When('I send the script information', async function () {
  // Click the Save button
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveButton = buttons.find(btn => btn.textContent?.includes('Save'));
    if (saveButton) {
      saveButton.click();
      return true;
    }
    return false;
  });
  
  if (!clicked) {
    throw new Error('Save button not found');
  }
  
  // Wait for the script to be saved (wait for page to update)
  await new Promise(resolve => setTimeout(resolve, 1500));
});

Then('I should see {string} in the script list', async function (scriptTitle: string) {
  // Wait for the script list to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    await page.waitForFunction(
      () => document.querySelector('h3')?.textContent?.includes('Existing Scripts'),
      { timeout: 5000 }
    );
  } catch {
    // If the header doesn't exist, that's ok - just continue
  }
  
  // Check if the script appears in the list
  const pageContent = await page.content();
  expect(pageContent).toContain(scriptTitle);
  
  // Alternatively, look for the script item with the specific title
  const scriptItems = await page.$$('[data-testid^="script-item-"]');
  let found = false;
  
  for (const item of scriptItems) {
    const titleElement = await item.$('[data-testid="script-title"]');
    if (titleElement) {
      const title = await page.evaluate(el => el.textContent, titleElement);
      if (title === scriptTitle) {
        found = true;
        break;
      }
    }
  }
  
  // If data-testid approach doesn't work, try a more general approach
  if (!found) {
    const scriptListText = await page.$eval('body', el => el.textContent || '');
    expect(scriptListText).toContain(scriptTitle);
  }
});

Then('the script should have description {string}', async function (description: string) {
  // Since the description is not shown in the list, we need to click Edit to verify it
  // First, find and click the Edit button for the last script in the list
  const editClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const editButtons = buttons.filter(btn => btn.textContent?.trim() === 'Edit');
    if (editButtons.length > 0) {
      // Click the last Edit button (most recently added script)
      editButtons[editButtons.length - 1].click();
      return true;
    }
    return false;
  });
  
  if (!editClicked) {
    throw new Error('Edit button not found');
  }
  
  // Wait for the edit form to appear
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if the description input has the correct value
  const inputs = await page.$$('input');
  let foundDescription = false;
  
  for (const input of inputs) {
    const value = await page.evaluate(el => (el as HTMLInputElement).value, input);
    if (value === description) {
      foundDescription = true;
      break;
    }
  }
  
  expect(foundDescription).toBe(true);
  
  // Click Cancel to return to the list view
  const cancelClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const cancelButton = buttons.find(btn => btn.textContent?.trim() === 'Cancel');
    if (cancelButton) {
      cancelButton.click();
      return true;
    }
    return false;
  });
  
  if (cancelClicked) {
    await new Promise(resolve => setTimeout(resolve, 300));
  }
});
