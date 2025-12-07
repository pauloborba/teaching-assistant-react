import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';


setDefaultTimeout(30 * 1000); 


function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return digits.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

let browser: Browser;
let page: Page;
const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';


let testStudentCPF: string;

Before({ tags: '@gui' }, async function () {
  browser = await launch({ 
    headless: false, 
    slowMo: 50 
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async function () {
  
  if (testStudentCPF) {
    try {
      
      await page.goto(baseUrl);
      await page.waitForSelector('.students-list table', { timeout: 5000 });
      
      
      const studentRows = await page.$$('[data-testid^="student-row-"]');
      for (const row of studentRows) {
        const cpfCell = await row.$('[data-testid="student-cpf"]');
        if (cpfCell) {
          const cpf = await page.evaluate(el => el.textContent, cpfCell);
          
          if (cpf === testStudentCPF || cpf === formatCPF(testStudentCPF)) {
            
            page.once('dialog', async (dialog) => {
              console.log(`GUI cleanup: Confirming deletion dialog: ${dialog.message()}`);
              await dialog.accept(); 
            });
            
           
            const deleteButton = await row.$(`[data-testid="delete-student-${cpf}"]`);
            if (deleteButton) {
              await deleteButton.click();
              
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
  
  if (browser) {
    await browser.close();
  }
});

Given('the student management system is running', async function () {
  await page.goto(baseUrl);
  await page.waitForSelector('h1', { timeout: 10000 });
  const title = await page.$eval('h1', el => el.textContent);
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
  
  
  await page.goto(baseUrl);
  await page.waitForSelector('.students-list', { timeout: 10000 });
  
  
  const studentRows = await page.$$('[data-testid^="student-row-"]');
  for (const row of studentRows) {
    const cpfCell = await row.$('[data-testid="student-cpf"]');
    if (cpfCell) {
      const displayedCPF = await page.evaluate(el => el.textContent, cpfCell);
      
      if (displayedCPF === cpf || displayedCPF === formattedCPF) {
        
        
        page.once('dialog', async (dialog) => {
          console.log(`GUI cleanup: Confirming deletion dialog: ${dialog.message()}`);
          await dialog.accept(); 
        });
        
        const deleteButton = await row.$(`[data-testid="delete-student-${displayedCPF}"]`);
        if (deleteButton) {
          await deleteButton.click();
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`GUI cleanup: Removed existing student with CPF: ${displayedCPF}`);
          break;
        }
      }
    }
  }
  
  // 
  await page.reload(); 
  await page.waitForSelector('.students-list', { timeout: 5000 });
  
  const updatedRows = await page.$$('[data-testid^="student-row-"]');
  for (const row of updatedRows) {
    const cpfCell = await row.$('[data-testid="student-cpf"]');
    if (cpfCell) {
      const displayedCPF = await page.evaluate(el => el.textContent, cpfCell);
      if (displayedCPF === cpf || displayedCPF === formattedCPF) {
        throw new Error(`Student with CPF ${displayedCPF} still exists in the system after cleanup`);
      }
    }
  }
});

When('I navigate to the Students area', async function () {
  
  const studentsTab = await page.$('[data-testid="students-tab"]');
  if (studentsTab) {
    const isActive = await page.evaluate(el => el?.classList.contains('active'), studentsTab);
    
    if (!isActive) {
      await studentsTab.click();
    }
  }
  
  
  await page.waitForSelector('[data-testid="student-form"]', { timeout: 5000 });
});

When('I provide the student information:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  
  await page.waitForSelector('#name');
  await page.click('#name');
  await page.type('#name', data.name);
  
  
  await page.click('#cpf');
  await page.type('#cpf', data.cpf);
  
  
  await page.click('#email');
  await page.type('#email', data.email);
});

When('I send the student information', async function () {
  
  const submitButton = await page.$('[data-testid="submit-student-button"]');
  expect(submitButton).toBeTruthy();
  
  await submitButton?.click();
  
  
  await new Promise(resolve => setTimeout(resolve, 2000));
});

Then('I should see {string} in the student list', async function (studentName: string) {
  
  await page.waitForSelector('.students-list table', { timeout: 10000 });
  
  
  const studentRows = await page.$$('[data-testid^="student-row-"]');
  let foundStudent = null;
  
  for (const row of studentRows) {
    const cpfCell = await row.$('[data-testid="student-cpf"]');
    if (cpfCell) {
      const cpf = await page.evaluate(el => el.textContent, cpfCell);
      if (cpf === formatCPF(testStudentCPF) || cpf === testStudentCPF) {
        foundStudent = row;
        break;
      }
    }
  }
  
  expect(foundStudent).toBeTruthy();
  
  
  const nameCell = await foundStudent!.$('[data-testid="student-name"]');
  const actualName = await page.evaluate(el => el.textContent, nameCell!);
  expect(actualName).toBe(studentName);
});

Then('the student should have CPF {string}', async function (expectedCPF: string) {
  
  await page.waitForSelector('.students-list table', { timeout: 10000 });
  
  
  const studentRows = await page.$$('[data-testid^="student-row-"]');
  let foundStudent = null;
  
  
  for (const row of studentRows) {
    const cpfCell = await row.$('[data-testid="student-cpf"]');
    if (cpfCell) {
      const cpf = await page.evaluate(el => el.textContent, cpfCell);
      if (cpf === expectedCPF || cpf === testStudentCPF || cpf === formatCPF(testStudentCPF)) {
        foundStudent = row;
        break;
      }
    }
  }
  
  expect(foundStudent).toBeTruthy();
  
  
  const cpfCell = await foundStudent!.$('[data-testid="student-cpf"]');
  const actualCPF = await page.evaluate(el => el.textContent, cpfCell!);
  expect(actualCPF).toBe(expectedCPF);
});

Then('the student should have email {string}', async function (expectedEmail: string) {
  
  await page.waitForSelector('.students-list table', { timeout: 10000 });
  
  
  const studentRows = await page.$$('[data-testid^="student-row-"]');
  let foundStudent = null;
  
  for (const row of studentRows) {
    const cpfCell = await row.$('[data-testid="student-cpf"]');
    if (cpfCell) {
      const cpf = await page.evaluate(el => el.textContent, cpfCell);
      if (cpf === formatCPF(testStudentCPF) || cpf === testStudentCPF) {
        foundStudent = row;
        break;
      }
    }
  }
  
  expect(foundStudent).toBeTruthy();
  
  
  const emailCell = await foundStudent!.$('[data-testid="student-email"]');
  const actualEmail = await page.evaluate(el => el.textContent, emailCell!);
  expect(actualEmail).toBe(expectedEmail);
});