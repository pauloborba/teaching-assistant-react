import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';
import { scope } from './setup';

// Helper function to format CPF like the frontend does
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return digits.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

// Test data to clean up
let testStudentCPF: string;

After({ tags: '@gui' }, async function () {
  // Clean up test student if it exists by using the GUI delete function
  if (testStudentCPF) {
    try {
      // Navigate to Students area
      await scope.page.goto(baseUrl);
      await scope.page.waitForSelector('.students-list table', { timeout: 5000 });
      
      // Look for our test student in the table and delete it if found
      const studentRows = await scope.page.$$('[data-testid^="student-row-"]');
      for (const row of studentRows) {
        const cpfCell = await row.$('[data-testid="student-cpf"]');
        if (cpfCell) {
          const cpf = await scope.page.evaluate(el => el.textContent, cpfCell);
          // Check for both plain and formatted CPF
          if (cpf === testStudentCPF || cpf === formatCPF(testStudentCPF)) {
            // Set up dialog handler before clicking delete
            scope.page.once('dialog', async (dialog) => {
              console.log(`GUI cleanup: Confirming deletion dialog: ${dialog.message()}`);
              await dialog.accept(); // Confirm deletion
            });
            
            // Click the delete button for this student
            const deleteButton = await row.$(`[data-testid="delete-student-${cpf}"]`);
            if (deleteButton) {
              await deleteButton.click();
              // Wait for deletion to complete
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log(`GUI cleanup: Removed test student with CPF: ${cpf}`);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.log('GUI cleanup: Student may not exist or GUI unavailable');
    }
  }
});

Given('the student management system is running', async function () {
  await scope.page.goto(baseUrl);
  await scope.page.waitForSelector('h1', { timeout: 10000 });
  const title = await scope.page.$eval('h1', el => el.textContent);
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
  const formattedCPF = formatCPF(cpf);
  
  // Navigate to the application and check if student exists through GUI
  await scope.page.goto(baseUrl);
  await scope.page.waitForSelector('.students-list', { timeout: 10000 });
  
  // Check if student exists in the table
  const studentExists = await scope.page.evaluate((targetCpf) => {
    const rows = document.querySelectorAll('[data-testid^="student-row-"]');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cpfCell = row.querySelector('[data-testid="student-cpf"]');
      if (cpfCell && (cpfCell.textContent === targetCpf)) {
        return true;
      }
    }
    return false;
  }, formattedCPF);
  
  if (studentExists) {
    // Delete the student if found
    scope.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    
    const deleteButton = await scope.page.$(`[data-testid="delete-student-${formattedCPF}"]`);
    if (deleteButton) {
      await deleteButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for deletion
    }
  }
});

When('I navigate to the Students page', async function () {
  // Click on the Students tab/link
  const studentsLink = await scope.page.$('a[href="/students"]');
  if (studentsLink) {
    await studentsLink.click();
  } else {
    // Fallback to direct navigation
    await scope.page.goto(`${baseUrl}/students`);
  }
  await scope.page.waitForSelector('.students-list', { timeout: 5000 });
});

When('I navigate to the Students area', async function () {
  // Click on the Students tab/link
  const studentsLink = await scope.page.$('a[href="/students"]');
  if (studentsLink) {
    await studentsLink.click();
  } else {
    // Fallback to direct navigation
    await scope.page.goto(`${baseUrl}/students`);
  }
  await scope.page.waitForSelector('.students-list', { timeout: 5000 });
});

When('I enter the student details:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  // Fill in the form
  await scope.page.type('input[name="name"]', data.name);
  await scope.page.type('input[name="cpf"]', data.cpf);
  await scope.page.type('input[name="email"]', data.email);
});

When('I provide the student information:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  // Fill in the form
  await scope.page.type('input[name="name"]', data.name);
  await scope.page.type('input[name="cpf"]', data.cpf);
  await scope.page.type('input[name="email"]', data.email);
});

When('I click the {string} button', async function (buttonText: string) {
  // Find button by text content
  const button = await scope.page.evaluateHandle((text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent?.includes(text));
  }, buttonText);
  
  if (button) {
    const element = button.asElement();
    if (element) {
      await (element as any).click();
    }
  } else {
    throw new Error(`Button with text "${buttonText}" not found`);
  }
});

When('I send the student information', async function () {
  const registerButton = await scope.page.$('button[type="submit"]');
  if (registerButton) {
    await registerButton.click();
    // Wait for the student list to update or a success message, instead of navigation
    // Assuming the list updates on the same page
    try {
      await scope.page.waitForFunction(
        () => document.querySelectorAll('[data-testid^="student-row-"]').length > 0,
        { timeout: 5000 }
      );
    } catch (e) {
      // Ignore timeout if list doesn't update immediately, subsequent steps will verify
    }
  } else {
    throw new Error('Register button not found');
  }
});

Then('I should see the student {string} in the list', async function (name: string) {
  await scope.page.waitForFunction(
    (studentName) => {
      const rows = document.querySelectorAll('[data-testid^="student-row-"]');
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.textContent?.includes(studentName)) {
          return true;
        }
      }
      return false;
    },
    { timeout: 5000 },
    name
  );
});

Then('I should see {string} in the student list', async function (name: string) {
  await scope.page.waitForFunction(
    (studentName) => {
      const rows = document.querySelectorAll('[data-testid^="student-row-"]');
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.textContent?.includes(studentName)) {
          return true;
        }
      }
      return false;
    },
    { timeout: 5000 },
    name
  );
});

Then('the student should have CPF {string}', async function (cpf: string) {
  const formattedCPF = formatCPF(cpf);
  const cpfFound = await scope.page.evaluate((targetCpf) => {
    const cells = document.querySelectorAll('[data-testid="student-cpf"]');
    return Array.from(cells).some(cell => cell.textContent === targetCpf);
  }, formattedCPF);
  
  expect(cpfFound).toBe(true);
});

Then('the student should have email {string}', async function (email: string) {
  const emailFound = await scope.page.evaluate((targetEmail) => {
    const cells = document.querySelectorAll('[data-testid="student-email"]');
    return Array.from(cells).some(cell => cell.textContent === targetEmail);
  }, email);
  
  expect(emailFound).toBe(true);
});

When('I click the delete button for student with CPF {string}', async function (cpf: string) {
  const formattedCPF = formatCPF(cpf);
  
  // Setup dialog handler
  scope.page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  
  const deleteButton = await scope.page.$(`[data-testid="delete-student-${formattedCPF}"]`);
  if (!deleteButton) {
    throw new Error(`Delete button for student ${formattedCPF} not found`);
  }
  
  await deleteButton.click();
});

Then('I should not see the student with CPF {string} in the list', async function (cpf: string) {
  const formattedCPF = formatCPF(cpf);
  
  // Wait for element to disappear
  await scope.page.waitForFunction(
    (targetCpf) => {
      const cells = document.querySelectorAll('[data-testid="student-cpf"]');
      return !Array.from(cells).some(cell => cell.textContent === targetCpf);
    },
    { timeout: 5000 },
    formattedCPF
  );
});

When('I try to register a student with incomplete details:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  // Fill in only provided fields
  if (data.name) await scope.page.type('input[name="name"]', data.name);
  if (data.cpf) await scope.page.type('input[name="cpf"]', data.cpf);
  if (data.email) await scope.page.type('input[name="email"]', data.email);
  
  // Click register
  const registerButton = await scope.page.$('button[type="submit"]');
  if (registerButton) await registerButton.click();
});

Then('I should see an error message', async function () {
  // Check for HTML5 validation or custom error message
  // This is a simplified check - in a real app you'd check specific error elements
  const hasError = await scope.page.evaluate(() => {
    const inputs = document.querySelectorAll('input:invalid');
    return inputs.length > 0;
  });
  
  expect(hasError).toBe(true);
});