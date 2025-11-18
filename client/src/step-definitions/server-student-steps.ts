import { Given, When, Then, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

// Helper function to format CPF like the frontend does
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return digits.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const serverUrl = 'http://localhost:3005';

// Test data to clean up
let testStudentCPF: string;
let lastResponse: Response;

// Only run this After hook for server-side tests by checking if we have a testStudentCPF
After({ tags: '@server' }, async function () {
  // Clean up test student if it exists
  if (testStudentCPF) {
    try {
      // Try both formatted and unformatted CPF for cleanup
      const formattedCPF = formatCPF(testStudentCPF);
      await fetch(`${serverUrl}/api/students/${formattedCPF}`, {
        method: 'DELETE'
      });
      console.log(`Server cleanup: Removed test student with CPF: ${formattedCPF}`);
    } catch (error) {
      console.log('Server cleanup: Student may not exist or server unavailable');
    }
    testStudentCPF = ''; // Reset for next test
  }
});

Given('the server API is available', async function () {
  try {
    const response = await fetch(`${serverUrl}/api/students`);
    expect(response.status).toBe(200);
  } catch (error) {
    throw new Error('Server is not available. Make sure the backend server is running on port 3005');
  }
});

Given('there is no student with CPF {string} in the server', async function (cpf: string) {
  testStudentCPF = cpf;
  const formattedCPF = formatCPF(cpf);
  
  // Try to delete the student if it exists (cleanup before test)
  try {
    await fetch(`${serverUrl}/api/students/${formattedCPF}`, {
      method: 'DELETE'
    });
    console.log(`Server setup: Removed any existing student with CPF: ${formattedCPF}`);
  } catch (error) {
    // Student may not exist, which is fine
  }
  
  // Verify student doesn't exist
  try {
    const response = await fetch(`${serverUrl}/api/students/${formattedCPF}`);
    if (response.status === 200) {
      throw new Error(`Student with CPF ${formattedCPF} already exists in the system`);
    }
  } catch (error) {
    // Expected - student should not exist (404 or network error)
    console.log(`Server setup: Confirmed student with CPF ${formattedCPF} does not exist`);
  }
});

When('I send a POST request to create student with:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  const requestBody = {
    name: data.name,
    cpf: data.cpf,
    email: data.email
  };
  
  console.log(`Server test: Creating student with data:`, requestBody);
  
  try {
    lastResponse = await fetch(`${serverUrl}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    throw new Error(`Failed to send POST request: ${error}`);
  }
});

Then('the server should respond with status {int}', async function (expectedStatus: number) {
  expect(lastResponse.status).toBe(expectedStatus);
  console.log(`Server test: Received expected status ${expectedStatus}`);
});

Then('the server should have stored the student with:', async function (dataTable: DataTable) {
  const expectedData = dataTable.rowsHash();
  
  // Fetch the student from the server to verify storage
  const response = await fetch(`${serverUrl}/api/students/${expectedData.cpf}`);
  expect(response.status).toBe(200);
  
  const storedStudent = await response.json();
  
  // Verify all fields match
  expect(storedStudent.name).toBe(expectedData.name);
  expect(storedStudent.cpf).toBe(expectedData.cpf);
  expect(storedStudent.email).toBe(expectedData.email);
  
  console.log(`Server test: Verified student stored correctly:`, storedStudent);
});

Then('I clean up the test student from the server', async function () {
  if (testStudentCPF) {
    try {
      const formattedCPF = formatCPF(testStudentCPF);
      const response = await fetch(`${serverUrl}/api/students/${formattedCPF}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`Server cleanup: Successfully removed test student with CPF: ${formattedCPF}`);
      } else {
        console.log(`Server cleanup: Failed to remove test student, status: ${response.status}`);
      }
    } catch (error) {
      console.log(`Server cleanup: Error removing test student: ${error}`);
    }
  }
});