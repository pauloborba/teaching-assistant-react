import { After, DataTable, Given, setDefaultTimeout, Then, When } from '@cucumber/cucumber';
import expect from 'expect';

setDefaultTimeout(30 * 1000);

const serverUrl = 'http://localhost:3005';
let testScriptId: string;
let lastResponse: Response;

After({ tags: '@server' }, async function () {
  if (testScriptId) {
    try {
      await fetch(`${serverUrl}/api/scripts/${testScriptId}`, { method: 'DELETE' });
      console.log(`Server cleanup: Removed test script with id: ${testScriptId}`);
    } catch (error) {
      console.log('Server cleanup: Script may not exist or server unavailable');
    }
    testScriptId = '';
  }
});

Given('the scripts API is available', async function () {
  const response = await fetch(`${serverUrl}/api/scripts`);
  expect(response.status).toBe(200);
});

Given('there is no script with title {string} in the server', async function (title: string) {
  // Remove all scripts with this title
  const response = await fetch(`${serverUrl}/api/scripts`);
  const scripts = await response.json();
  for (const script of scripts) {
    if (script.title === title) {
      await fetch(`${serverUrl}/api/scripts/${script.id}`, { method: 'DELETE' });
      console.log(`Server setup: Removed script with title: ${title}`);
    }
  }
});

When('I submit a request to create script with:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const requestBody = {
    title: data.title,
    description: data.description,
    tasks: JSON.parse(data.tasks)
  };
  lastResponse = await fetch(`${serverUrl}/api/scripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  if (lastResponse.status === 201) {
    const created = await lastResponse.json();
    testScriptId = created.id;
  }
});

When('I submit a request to edit script with:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  const requestBody = {
    title: data.title,
    description: data.description,
    tasks: JSON.parse(data.tasks)
  };
  lastResponse = await fetch(`${serverUrl}/api/scripts/${testScriptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
});

Then('the script request should be accepted successfully', async function () {
  expect([200, 201]).toContain(lastResponse.status);
});

Then('the script request should be rejected with error', async function () {
  expect([400, 409]).toContain(lastResponse.status);
});

Then('the server should have stored the script with:', async function (dataTable: DataTable) {
  const expected = dataTable.rowsHash();
  const response = await fetch(`${serverUrl}/api/scripts/${testScriptId}`);
  expect(response.status).toBe(200);
  const stored = await response.json();
  expect(stored.title).toBe(expected.title);
  expect(stored.description).toBe(expected.description);
  expect(JSON.stringify(stored.tasks)).toBe(expected.tasks);
});
