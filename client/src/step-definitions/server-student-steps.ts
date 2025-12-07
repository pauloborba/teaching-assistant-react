import { Given, When, Then, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';


setDefaultTimeout(30 * 1000); 

const serverUrl = 'http://localhost:3005';


let testStudentCPF: string;
let lastResponse: Response;


After({ tags: '@server' }, async function () {
  
  if (testStudentCPF) {
    try {
      
      await fetch(`${serverUrl}/api/students/${testStudentCPF}`, {
        method: 'DELETE'
      });
      console.log(`Server cleanup: Removed test student with CPF: ${testStudentCPF}`);
    } catch (error) {
      console.log('Server cleanup: Student may not exist or server unavailable');
    }
    testStudentCPF = ''; 
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
  

  try {
    await fetch(`${serverUrl}/api/students/${cpf}`, {
      method: 'DELETE'
    });
    console.log(`Server setup: Removed any existing student with CPF: ${cpf}`);
  } catch (error) {
    
  }
  
  
  try {
    const response = await fetch(`${serverUrl}/api/students/${cpf}`);
    if (response.status === 200) {
      throw new Error(`Student with CPF ${cpf} already exists in the system`);
    }
  } catch (error) {
    
    console.log(`Server setup: Confirmed student with CPF ${cpf} does not exist`);
  }
});

When('I submit a request to create student with:', async function (dataTable: DataTable) {
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

Then('the request should be accepted successfully', async function () {
  expect(lastResponse.status).toBe(201);
  console.log(`Server test: Request was accepted successfully`);
});

Then('the server should have stored the student with:', async function (dataTable: DataTable) {
  const expectedData = dataTable.rowsHash();
  
  
  const response = await fetch(`${serverUrl}/api/students/${expectedData.cpf}`);
  expect(response.status).toBe(200);
  
  const storedStudent = await response.json();
  
  
  expect(storedStudent.name).toBe(expectedData.name);
  expect(storedStudent.cpf).toBe(expectedData.cpf);
  expect(storedStudent.email).toBe(expectedData.email);
  
  console.log(`Server test: Verified student stored correctly:`, storedStudent);
});