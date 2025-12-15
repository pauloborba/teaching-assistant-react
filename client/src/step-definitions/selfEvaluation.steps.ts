import { Given, When, Then, Before, After, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import puppeteer, { Browser, Page } from 'puppeteer';
import expect from 'expect';

// Set default timeout to 30 seconds
setDefaultTimeout(30000);

// Global variables to hold browser and page instances
let browser: Browser;
let page: Page;

// Track created test data for cleanup
const createdStudents = new Set<string>();
const createdClasses = new Set<string>();

// Track pre-existing data (should not be deleted)
const preExistingStudents = new Set<string>();
const preExistingClasses = new Set<string>();

// API base URLs
const SERVER_URL = 'http://localhost:3005';
const CLIENT_URL = 'http://localhost:3004';

// Helper function to clean CPF
function cleanCPF(cpf: string): string {
  return cpf.replace(/[.-]/g, '');
}

// Helper function to wait for network to be idle
async function waitForNetworkIdle(page: Page, timeout = 5000) {
  try {
    await page.waitForNetworkIdle({ timeout });
  } catch (error) {
    // Timeout is acceptable, just continue
  }
}

// Setup test data via API
async function createStudent(cpf: string, name: string, email: string) {
  const cleanedCPF = cleanCPF(cpf);
  
  // Don't track if it's pre-existing data
  if (preExistingStudents.has(cleanedCPF)) {
    return;
  }
  
  try {
    const response = await fetch(`${SERVER_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: cleanedCPF, name, email })
    });
    
    if (response.ok) {
      // Only track newly created students
      createdStudents.add(cleanedCPF);
    }
  } catch (error) {
    console.log(`Student ${name} might already exist`);
  }
}

async function createClass(topic: string, semester: string, year: string) {
  try {
    const response = await fetch(`${SERVER_URL}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, semester, year })
    });
    
    if (response.ok) {
      const classData = await response.json();
      // Only track newly created classes (status 201 = created)
      if (response.status === 201 && !preExistingClasses.has(classData.id)) {
        createdClasses.add(classData.id);
        console.log(`✅ Created and tracking new class: ${classData.id}`);
      }
      return classData;
    }
    
    // If status is 400, class already exists - don't track it
    if (response.status === 400) {
      console.log(`ℹ️  Class ${topic} already exists - not tracking`);
    }
    
    return null;
  } catch (error) {
    console.log(`Class ${topic} might already exist`);
    return null;
  }
}

async function getClassByName(topic: string, semester: string, year: string) {
  try {
    const response = await fetch(`${SERVER_URL}/api/classes`);
    const classes = await response.json();
    const classObj = classes.find((c: any) => 
      c.topic === topic && c.semester === semester && c.year === year
    );
    
    // Don't track anything here - this is just for reading
    // Only track in createClass when we actually create new ones
    
    return classObj;
  } catch (error) {
    console.error('Error getting class:', error);
    return null;
  }
}

async function enrollStudent(classId: string, studentCPF: string) {
  const cleanedCPF = cleanCPF(studentCPF);
  
  try {
    const response = await fetch(`${SERVER_URL}/api/classes/${classId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCPF: cleanedCPF })
    });
    
    if (!response.ok && response.status !== 400) {
      throw new Error(`Failed to enroll student: ${response.status}`);
    }
  } catch (error) {
    console.log(`Student might already be enrolled`);
  }
}

// Cleanup functions
async function deleteStudent(cpf: string) {
  try {
    await fetch(`${SERVER_URL}/api/students/${cpf}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.log(`Could not delete student ${cpf}`);
  }
}

async function deleteClass(classId: string) {
  try {
    await fetch(`${SERVER_URL}/api/classes/${classId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.log(`Could not delete class ${classId}`);
  }
}

async function cleanupTestData() {
  const classCount = createdClasses.size;
  const studentCount = createdStudents.size;
  
  if (classCount === 0 && studentCount === 0) {
    return; // Nothing to cleanup
  }
  
  // Delete classes first (to handle foreign key constraints)
  const classArray = Array.from(createdClasses);
  for (const classId of classArray) {
    await deleteClass(classId);
  }
  
  // Then delete students
  const studentArray = Array.from(createdStudents);
  for (const cpf of studentArray) {
    await deleteStudent(cpf);
  }
  
  // Clear the tracking sets
  createdClasses.clear();
  createdStudents.clear();
  
  console.log(`🧹 Cleaned up ${classCount} classes and ${studentCount} students`);
}

// Load pre-existing data before any tests run
async function loadPreExistingData() {
  try {
    // Load existing students
    const studentsResponse = await fetch(`${SERVER_URL}/api/students`);
    if (studentsResponse.ok) {
      const students = await studentsResponse.json();
      students.forEach((s: any) => {
        preExistingStudents.add(cleanCPF(s.cpf));
      });
      console.log(`📊 Found ${preExistingStudents.size} pre-existing students`);
    }
    
    // Load existing classes
    const classesResponse = await fetch(`${SERVER_URL}/api/classes`);
    if (classesResponse.ok) {
      const classes = await classesResponse.json();
      classes.forEach((c: any) => {
        preExistingClasses.add(c.id);
      });
      console.log(`📊 Found ${preExistingClasses.size} pre-existing classes`);
    }
  } catch (error) {
    console.error('Error loading pre-existing data:', error);
  }
}

// Hooks
BeforeAll(async function() {
  await loadPreExistingData();
});

Before(async function() {
  // Check environment variable to enable headed mode
  const headless = process.env.HEADLESS !== 'false';
  // Allow customization of slowMo via environment variable (default: 10ms for headed, 0 for headless)
  const slowMo = headless ? 0 : parseInt(process.env.SLOWMO || '10', 10);
  
  browser = await puppeteer.launch({
    headless: headless,
    slowMo: slowMo,
    defaultViewport: null, // Disable default viewport to use full window size
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--start-fullscreen']
  });
  page = await browser.newPage();
});

After(async function() {
  // Cleanup test data
  await cleanupTestData();
  
  if (page) {
    await page.close();
  }
  if (browser) {
    await browser.close();
  }
});

// Given steps
Given('the server is running on {string}', async function(url: string) {
  try {
    const response = await fetch(`${url}/api/students`);
    expect(response.ok).toBe(true);
  } catch (error) {
    throw new Error(`Server is not running on ${url}. Please start the server first.`);
  }
});

Given('the client is running on {string}', async function(url: string) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
  } catch (error) {
    throw new Error(`Client is not running on ${url}. Please start the client first.`);
  }
});

Given('a student with CPF {string}, name {string} and email {string} exists', async function(cpf: string, name: string, email: string) {
  await createStudent(cpf, name, email);
});

Given('a class {string} exists for semester {string} and year {string}', async function(topic: string, semester: string, year: string) {
  await createClass(topic, semester, year);
});

Given('the student {string} is enrolled in class {string}', async function(studentCPF: string, topic: string) {
  // Find the class by topic (assuming semester and year from context)
  // Changed to use '1' instead of '2025.1' to match the feature file
  const classObj = await getClassByName(topic, '1', '2025');
  if (classObj) {
    await enrollStudent(classObj.id, studentCPF);
  }
});

Given('I am on the self-evaluation tab', async function() {
  await page.goto(`${CLIENT_URL}`, { waitUntil: 'networkidle2' });
  
  // Click on the Self-Evaluation tab
  await page.waitForSelector('button.tab-button', { timeout: 5000 });
  
  // Find and click the Self-Evaluation tab button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button.tab-button'));
    const selfEvalButton = buttons.find(btn => btn.textContent?.includes('Self-Evaluation'));
    if (selfEvalButton) {
      (selfEvalButton as HTMLButtonElement).click();
    }
  });
  
  // Wait for the self-evaluation section to appear
  await page.waitForSelector('.self-evaluation-section', { timeout: 5000 });
});

Given('I have searched with email {string} and CPF {string}', async function(email: string, cpf: string) {
  // Make sure we're on the self-evaluation page first
  await page.waitForSelector('#email-input', { timeout: 5000 });
  
  // Clear and enter email
  await page.click('#email-input', { clickCount: 3 });
  await page.type('#email-input', email);
  
  // Clear and enter CPF
  await page.click('#cpf-input', { clickCount: 3 });
  await page.type('#cpf-input', cpf);
  
  // Click search button using evaluate
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const searchBtn = buttons.find(btn => btn.textContent?.includes('Search'));
    if (searchBtn) (searchBtn as HTMLButtonElement).click();
  });
  
  // Wait for network activity to settle
  await waitForNetworkIdle(page, 3000);
  await new Promise(resolve => setTimeout(resolve, 1500));
});

Given('I have selected the class {string}', async function(classDisplay: string) {
  await page.waitForSelector('#classSelect');
  
  // Extract the topic from display string (e.g., "Software Engineering (2025/2025.1)")
  const match = classDisplay.match(/^(.+?)\s*\(/);
  const topic = match ? match[1] : classDisplay;
  
  // Find the option by visible text
  await page.select('#classSelect', await page.evaluate((displayText) => {
    const select = document.querySelector('#classSelect') as HTMLSelectElement;
    const options = Array.from(select.options);
    const option = options.find(opt => opt.textContent?.includes(displayText));
    return option ? option.value : '';
  }, topic));
  
  await waitForNetworkIdle(page);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Scroll to the bottom of the page to show the entire table
  await page.evaluate(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
});

Given('I have selected {string} for goal {string}', async function(grade: string, goal: string) {
  // Find the row for this goal
  const rowSelector = `tr.student-row:has(td:text("${goal}"))`;
  
  // Use evaluate to find and select the grade
  await page.evaluate((goalText, gradeValue) => {
    const rows = Array.from(document.querySelectorAll('tr.student-row'));
    const row = rows.find(r => {
      const cells = r.querySelectorAll('td');
      return cells[0]?.textContent?.trim() === goalText;
    });
    
    if (row) {
      const select = row.querySelector('select') as HTMLSelectElement;
      if (select) {
        select.value = gradeValue;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, goal, grade);
  
  await waitForNetworkIdle(page);
  await new Promise(resolve => setTimeout(resolve, 500));
});

// When steps
When('I enter {string} in the email field', async function(email: string) {
  await page.waitForSelector('#email-input', { timeout: 5000 });
  await page.click('#email-input', { clickCount: 3 }); // Select all
  await new Promise(resolve => setTimeout(resolve, 100));
  await page.type('#email-input', email);
});

When('I enter {string} in the CPF field', async function(cpf: string) {
  await page.waitForSelector('#cpf-input', { timeout: 5000 });
  await page.click('#cpf-input', { clickCount: 3 }); // Select all
  await new Promise(resolve => setTimeout(resolve, 100));
  await page.type('#cpf-input', cpf);
});

When('I click the {string} button', async function(buttonText: string) {
  await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(btn => btn.textContent?.includes(text));
    if (button) (button as HTMLButtonElement).click();
  }, buttonText);
  
  // Wait for network activity
  await waitForNetworkIdle(page, 3000);
  await new Promise(resolve => setTimeout(resolve, 1500));
});

When('I select the class {string}', async function(classDisplay: string) {
  await page.waitForSelector('#classSelect');
  
  // Extract the topic from display string
  const match = classDisplay.match(/^(.+?)\s*\(/);
  const topic = match ? match[1] : classDisplay;
  
  // Select by visible text
  await page.evaluate((displayText) => {
    const select = document.querySelector('#classSelect') as HTMLSelectElement;
    const options = Array.from(select.options);
    const option = options.find(opt => opt.textContent?.includes(displayText));
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, topic);
  
  await waitForNetworkIdle(page);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Scroll to the bottom of the page to show the entire table
  await page.evaluate(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
});

When('I select {string} for goal {string}', async function(grade: string, goal: string) {
  // Find the row and select the grade
  await page.evaluate((goalText, gradeValue) => {
    const rows = Array.from(document.querySelectorAll('tr.student-row'));
    const row = rows.find(r => {
      const cells = r.querySelectorAll('td');
      return cells[0]?.textContent?.trim() === goalText;
    });
    
    if (row) {
      const select = row.querySelector('select') as HTMLSelectElement;
      if (select) {
        // Map display value to actual value
        const valueMap: { [key: string]: string } = {
          'MA': 'MA',
          'MPA': 'MPA',
          'MANA': 'MANA',
          '-': ''
        };
        select.value = valueMap[gradeValue] !== undefined ? valueMap[gradeValue] : gradeValue;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, goal, grade);
  
  await waitForNetworkIdle(page);
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('I reload the page', async function() {
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // After reload, navigate back to Self-Evaluation tab
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button.tab-button'));
    const selfEvalButton = buttons.find(btn => btn.textContent?.includes('Self-Evaluation'));
    if (selfEvalButton) {
      (selfEvalButton as HTMLButtonElement).click();
    }
  });
  
  // Wait for the self-evaluation section to appear
  await page.waitForSelector('.self-evaluation-section', { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 300));
});

// Then steps
Then('I should see the heading {string}', async function(heading: string) {
  await page.waitForSelector('h3');
  const content = await page.content();
  expect(content).toContain(heading);
});

Then('I should see an email input field', async function() {
  const emailInput = await page.$('#email-input');
  expect(emailInput).not.toBeNull();
});

Then('I should see a CPF input field', async function() {
  const cpfInput = await page.$('#cpf-input');
  expect(cpfInput).not.toBeNull();
});

Then('I should see a {string} button', async function(buttonText: string) {
  const buttonExists = await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(btn => btn.textContent?.includes(text));
  }, buttonText);
  expect(buttonExists).toBe(true);
});

Then('I should see a class selection dropdown', async function() {
  await page.waitForSelector('#classSelect', { timeout: 5000 });
  const select = await page.$('#classSelect');
  expect(select).not.toBeNull();
});

Then('the dropdown should contain the class {string}', async function(classDisplay: string) {
  await page.waitForSelector('#classSelect');
  
  const hasOption = await page.evaluate((text) => {
    const select = document.querySelector('#classSelect') as HTMLSelectElement;
    const options = Array.from(select.options);
    return options.some(opt => opt.textContent?.includes(text));
  }, classDisplay);
  
  expect(hasOption).toBe(true);
});

Then('I should see an error message containing {string}', async function(errorText: string) {
  // Wait a bit for error to appear
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const content = await page.content();
  const hasError = content.toLowerCase().includes(errorText.toLowerCase());
  expect(hasError).toBe(true);
});

Then('I should see the evaluation goals table', async function() {
  await page.waitForSelector('.evaluation-table', { timeout: 5000 });
  const table = await page.$('.evaluation-table');
  expect(table).not.toBeNull();
});

Then('I should see the goal {string}', async function(goal: string) {
  const hasGoal = await page.evaluate((goalText) => {
    const cells = Array.from(document.querySelectorAll('td'));
    return cells.some(cell => cell.textContent?.trim() === goalText);
  }, goal);
  expect(hasGoal).toBe(true);
});

Then('I should see all evaluation goals', async function() {
  const expectedGoals = [
    'Requirements',
    'Configuration Management',
    'Project Management',
    'Design',
    'Tests',
    'Refactoring'
  ];
  
  for (const goal of expectedGoals) {
    const hasGoal = await page.evaluate((goalText) => {
      const cells = Array.from(document.querySelectorAll('td'));
      return cells.some(cell => cell.textContent?.trim() === goalText);
    }, goal);
    expect(hasGoal).toBe(true);
  }
});

Then('I should see the following goals:', async function(dataTable: any) {
  const goals = dataTable.hashes();
  
  for (const { goal } of goals) {
    const hasGoal = await page.evaluate((goalText) => {
      const cells = Array.from(document.querySelectorAll('td'));
      return cells.some(cell => cell.textContent?.trim() === goalText);
    }, goal);
    expect(hasGoal).toBe(true);
  }
});

Then('the grade for {string} should be {string}', async function(goal: string, expectedGrade: string) {
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for any updates
  
  const actualGrade = await page.evaluate((goalText) => {
    const rows = Array.from(document.querySelectorAll('tr.student-row'));
    const row = rows.find(r => {
      const cells = r.querySelectorAll('td');
      return cells[0]?.textContent?.trim() === goalText;
    });
    
    if (row) {
      const select = row.querySelector('select') as HTMLSelectElement;
      return select ? select.value : null;
    }
    return null;
  }, goal);
  
  // Map expected display value to actual value
  const valueMap: { [key: string]: string } = {
    'MA': 'MA',
    'MPA': 'MPA',
    'MANA': 'MANA',
    '-': ''
  };
  
  const expected = valueMap[expectedGrade] !== undefined ? valueMap[expectedGrade] : expectedGrade;
  expect(actualGrade).toBe(expected);
});

Then('I should see a message containing {string}', async function(messageText: string) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const content = await page.content();
  const hasMessage = content.toLowerCase().includes(messageText.toLowerCase());
  expect(hasMessage).toBe(true);
});

Then('the {string} button should be disabled', async function(buttonText: string) {
  const isDisabled = await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(btn => btn.textContent?.includes(text)) as HTMLButtonElement;
    return button ? button.disabled : false;
  }, buttonText);
  expect(isDisabled).toBe(true);
});

Then('the {string} button should be enabled', async function(buttonText: string) {
  const isEnabled = await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(btn => btn.textContent?.includes(text)) as HTMLButtonElement;
    return button ? !button.disabled : false;
  }, buttonText);
  expect(isEnabled).toBe(true);
});

When('I submit the following self-evaluations:', async function(dataTable: any) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    await page.evaluate((goalText, gradeValue) => {
      const rows = Array.from(document.querySelectorAll('tr.student-row'));
      const rowElement = rows.find(r => {
        const cells = r.querySelectorAll('td');
        return cells[0]?.textContent?.trim() === goalText;
      });
      
      if (rowElement) {
        const select = rowElement.querySelector('select') as HTMLSelectElement;
        if (select) {
          const valueMap: { [key: string]: string } = {
            'MA': 'MA',
            'MPA': 'MPA',
            'MANA': 'MANA',
            '-': ''
          };
          select.value = valueMap[gradeValue] !== undefined ? valueMap[gradeValue] : gradeValue;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, row.goal, row.grade);
    
    await waitForNetworkIdle(page);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
});

Then('I should see the following self-evaluations saved:', async function(dataTable: any) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const actualGrade = await page.evaluate((goalText) => {
      const rows = Array.from(document.querySelectorAll('tr.student-row'));
      const rowElement = rows.find(r => {
        const cells = r.querySelectorAll('td');
        return cells[0]?.textContent?.trim() === goalText;
      });
      
      if (rowElement) {
        const select = rowElement.querySelector('select') as HTMLSelectElement;
        return select ? select.value : null;
      }
      return null;
    }, row.goal);
    
    const valueMap: { [key: string]: string } = {
      'MA': 'MA',
      'MPA': 'MPA',
      'MANA': 'MANA',
      '-': ''
    };
    
    const expected = valueMap[row.grade] !== undefined ? valueMap[row.grade] : row.grade;
    expect(actualGrade).toBe(expected);
  }
});
