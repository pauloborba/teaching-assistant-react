// Refactored Cucumber step definitions with helpers
// ---------------------------------------------------

import { Given, When, Then, After, setDefaultTimeout, DataTable } from '@cucumber/cucumber';
import expect from 'expect';

setDefaultTimeout(30 * 1000);

const serverUrl = 'http://localhost:3005';

// ============================================================
// Shared test state
// ============================================================
let lastResponse: Response;
let createdScriptAnswerIds: string[] = [];
let createdStudentCPF: string | null = null;
let lastCreatedScriptAnswerId: string | null = null;
let mostRecentTaskId: string | null = null;

// ============================================================
// Helper functions
// ============================================================
async function createScriptAnswer(id: string, studentId: string) {
  const response = await fetch(`${serverUrl}/api/scriptanswers/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, scriptId: `script-${id}`, studentId, answers: [] })
  });

  if (response.status === 201) {
    createdScriptAnswerIds.push(id);
    lastCreatedScriptAnswerId = id;
  }

  lastResponse = response;

  return response;
}

async function fetchJSON(endpoint: string) {
  const res = await fetch(`${serverUrl}${endpoint}`);
  lastResponse = res;
  return { status: res.status, body: await res.json() };
}

function extractQuotedList(str: string): string[] {
  return str.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
}

async function updateScriptAnswerTasks(scriptAnswerId: string, taskPayload: any) {
    const res = await fetch(`${serverUrl}/api/scriptanswers/${scriptAnswerId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskPayload)
  });
  lastResponse = res;
  return res;

}

async function ensureStudentExists(cpf: string) {
  const response = await fetch(`${serverUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Student', cpf, email: `student${cpf}@test.com` })
  });

  lastResponse = response;

  if (response.status === 201) createdStudentCPF = cpf;
  return response;
}

// ============================================================
// Cleanup
// ============================================================
After({ tags: '@server' }, async function () {
  for (const id of createdScriptAnswerIds) {
    await fetch(`${serverUrl}/api/scriptanswers/${id}`, { method: 'DELETE' });
  }
  createdScriptAnswerIds = [];

  if (createdStudentCPF) {
    await fetch(`${serverUrl}/api/students/${createdStudentCPF}`, { method: 'DELETE' });
    createdStudentCPF = null;
  }

  lastCreatedScriptAnswerId = null;
});

// ============================================================
// Step Definitions
// ============================================================

Given(/^there (?:is a|are) script answer(?:s)?(?: registered)? with ID(?:s)? ((?:"[^"]+"\s*,\s*)*"[^"]+")$/, async function (idString: string) {
  const ids = extractQuotedList(idString);
  for (const id of ids) await createScriptAnswer(id, '11111111111');
});

Given('there are no script answers registered', async function () {
  const res = await fetch(`${serverUrl}/api/scriptanswers/`);
  if (res.status === 200) {
    const list = await res.json();
    for (const item of list) {
      await fetch(`${serverUrl}/api/scriptanswers/${item.id}`, { method: 'DELETE' });
    }
  }
});

Given('there is a student with CPF {string}', async function (cpf: string) {
  const response = await ensureStudentExists(cpf);
  expect(response.status).toBe(201);
});

Given('this student has script answers with IDs {string}, {string}, {string}', async function (a: string, b: string, c: string) {
  if (!createdStudentCPF) throw new Error('Student not created');
  const ids = [a, b, c].map(x => x.replace(/"/g, ''));
  for (const id of ids) await createScriptAnswer(id, createdStudentCPF);
});

Given(/^this answer contains a task with ID "([^"]+)"(?: and grade "([^"]+)")?$/, async function (taskId: string, grade?: string) {
  if (!lastCreatedScriptAnswerId) throw new Error('No script answer created');

  const payload = {
    id: `ta-${taskId}`,
    task: taskId,
    answer: 'Test answer',
    grade: grade ?? null,
    comments: ''
  };

  mostRecentTaskId = taskId;
  const res = await updateScriptAnswerTasks(lastCreatedScriptAnswerId, payload);
  expect([200, 201]).toContain(res.status);
});

Given('this answer does not contain a task with ID {string}', async function (taskId: string) {
  if (!lastCreatedScriptAnswerId) throw new Error('No script answer created');

  const script = await fetchJSON(`/api/scriptanswers/${lastCreatedScriptAnswerId}`);
  script.body.answers = script.body.answers.filter((a: any) => a.task !== taskId);

  await fetch(`${serverUrl}/api/scriptanswers/${lastCreatedScriptAnswerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(script.body)
  });
});

// ============================================================
// Requests
// ============================================================

When('I send a GET request to {string}', async function (endpoint: string) {
  lastResponse = await fetch(`${serverUrl}${endpoint}`);
});

When('I send a PUT request to {string} with:', async function (endpoint: string, dataTable: DataTable) {
  const body = dataTable.rowsHash();
  lastResponse = await fetch(`${serverUrl}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
});

// ============================================================
// Assertions
// ============================================================

Then(/^the server should return (\d+) "([^"]+)"$/, async function (statusCode: string, message: string) {
  if(!lastResponse) {
    throw new Error('No response recorded');
  }
  expect(lastResponse).toBeDefined();
  const code = parseInt(statusCode);
  expect(lastResponse.status).toBe(code);

  console.log(`Server responded with status ${lastResponse.status} (${message})`);
});

Then('the server should return grade {string}', async function (grade: string) {
  const body = await lastResponse.json().then(data => data.grade);
  expect(body).toBe(grade.replace(/"/g, ''));
})

Then(/^the server should return a list containing answers ("[^"]+"\s*,\s*)*"[^"]+"/, async function (idString: string) {
  const expected = extractQuotedList(idString);
  const body = await lastResponse.json();
  const returned = body.map((x: any) => x.id);
  expected.forEach(id => expect(returned).toContain(id));
});

Then('the server should return an empty list', async function () {
  const body = await lastResponse.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBe(0);
});



Then('the server should update the task grade to {string}', async function (grade: string) {
  const body = await fetchJSON(`/api/scriptanswers/${lastCreatedScriptAnswerId}/tasks/${mostRecentTaskId}`);
  expect(body.body.grade).toBe(grade.replace(/"/g, ''));
});
