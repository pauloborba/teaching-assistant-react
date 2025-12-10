import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import request from 'supertest';
import expect from 'expect';
import { app } from '../../server';

setDefaultTimeout(30 * 1000);

let response: request.Response;
let currentClassId: string | null = null;
let createdStudentCPFs: string[] = [];

// Hooks

Before({ tags: '@service' }, async function () {
  currentClassId = null;
  createdStudentCPFs = [];
});

After({ tags: '@service' }, async function () {
  for (const cpf of createdStudentCPFs) {
    await request(app).delete(`/api/students/${cpf}`).catch(() => {});
  }
  if (currentClassId) {
    await request(app).delete(`/api/classes/${currentClassId}`).catch(() => {});
  }
});

// Helper Functions

async function createClass(topic: string): Promise<string> {
  const res = await request(app)
    .post('/api/classes')
    .send({ topic, semester: 1, year: 2025 });
  currentClassId = res.body.id;
  return currentClassId!;
}

async function createStudent(name: string, cpf: string): Promise<void> {
  const res = await request(app)
    .post('/api/students')
    .send({ name, cpf, email: `${name.toLowerCase().replace(/\s+/g, '.')}@test.com` });
  
  if (res.status !== 201 && res.status !== 400) {
    throw new Error(`Failed to create student: ${res.status} ${JSON.stringify(res.body)}`);
  }
  
  createdStudentCPFs.push(cpf);
}

async function enrollStudent(classId: string, cpf: string): Promise<void> {
  const res = await request(app)
    .post(`/api/classes/${classId}/enroll`)
    .send({ studentCPF: cpf });
  
  if (res.status !== 201 && res.status !== 400) {
    throw new Error(`Failed to enroll student: ${res.status} ${JSON.stringify(res.body)}`);
  }
}

async function addGrade(classId: string, cpf: string, goal: string, grade: string): Promise<void> {
  await request(app)
    .put(`/api/classes/${classId}/enrollments/${cpf}/evaluation`)
    .send({ goal, grade });
}

async function addAllGradesForStudent(classId: string, cpf: string, grades: string[]): Promise<void> {
  const goals = ['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring'];
  for (let i = 0; i < Math.min(grades.length, goals.length); i++) {
    if (grades[i]) {
      await addGrade(classId, cpf, goals[i], grades[i]);
    }
  }
}

// Given Steps

Given('the API Controller is ready', async function () {
  const res = await request(app).get('/api/students');
  expect(res.status).toBe(200);
});

Given('a class exists with ID {string} containing students', async function (topic: string) {
  const classId = await createClass(topic);
  await createStudent('Test Student 1', '99999999901');
  await enrollStudent(classId, '99999999901');
  await addGrade(classId, '99999999901', 'Requirements', 'MA');
  await addGrade(classId, '99999999901', 'Design', 'MA');
  await addGrade(classId, '99999999901', 'Tests', 'MA');
});

Given('the repository returns a class {string} with:', async function (topic: string, dataTable: DataTable) {
  const classId = await createClass(topic);
  const rows = dataTable.hashes();
  
  let studentIndex = 1;
  for (const row of rows) {
    const cpf = `99999999${studentIndex.toString().padStart(3, '0')}`;
    await createStudent(row.Name, cpf);
    await enrollStudent(classId, cpf);
    
    const gradesStr = row.Grades || '';
    const grades = gradesStr.split(',').map((g: string) => g.trim()).filter((g: string) => g);
    
    if (grades.length > 0) {
      await addAllGradesForStudent(classId, cpf, grades);
    }
    
    studentIndex++;
  }
});

Given('a class exists with {string} students having {string} evaluations', async function (studentCount: string, _evalCount: string) {
  const classId = await createClass('Pending Students Class');
  const count = parseInt(studentCount, 10);
  
  for (let i = 1; i <= count; i++) {
    const cpf = `88888888${i.toString().padStart(3, '0')}`;
    await createStudent(`Student ${i}`, cpf);
    await enrollStudent(classId, cpf);
  }
});

Given('a class exists with {string} students', async function (count: string) {
  const studentCount = parseInt(count, 10);
  const classId = await createClass('Test Class');
  
  for (let i = 1; i <= studentCount; i++) {
    const cpf = `77777777${i.toString().padStart(3, '0')}`;
    await createStudent(`Student ${i}`, cpf);
    await enrollStudent(classId, cpf);
  }
});

Given('the repository finds no class with ID {string}', function (classId: string) {
  currentClassId = classId;
});

// When Steps

When('I request the report for class {string}', async function (classId: string) {
  if (currentClassId) {
    response = await request(app).get(`/api/classes/${currentClassId}/report`);
  } else {
    response = await request(app).get(`/api/classes/${classId}/report`);
  }
});

When('I request the report for this class', async function () {
  if (!currentClassId) throw new Error('No class ID available');
  response = await request(app).get(`/api/classes/${currentClassId}/report`);
});

// Then Steps

Then('the response status should be {int}', function (expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
});

Then('the response body should match the {string} JSON schema', function (schemaName: string) {
  const body = response.body;
  expect(body).toHaveProperty('classId');
  expect(body).toHaveProperty('totalEnrolled');
  expect(body).toHaveProperty('students');
  expect(body).toHaveProperty('evaluationPerformance');
});

Then('the payload should contain the following root keys:', function (dataTable: DataTable) {
  const expectedKeys = dataTable.raw().flat();
  const actualKeys = Object.keys(response.body);
  
  for (const key of expectedKeys) {
    expect(actualKeys).toContain(key);
  }
});

Then('the aggregated statistics should be:', function (dataTable: DataTable) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    const field = row.field;
    const expectedValue = row.value;
    
    if (expectedValue === 'null') {
      expect(response.body[field]).toBeNull();
    } else if (expectedValue.includes('.')) {
      expect(response.body[field]).toBeCloseTo(parseFloat(expectedValue), 1);
    } else {
      expect(response.body[field]).toBe(parseInt(expectedValue, 10));
    }
  }
});

Then('the {string} field should be null', function (field: string) {
  expect(response.body[field]).toBeNull();
});

Then('the {string} field should be {int}', function (field: string, expected: number) {
  expect(response.body[field]).toBe(expected);
});

Then('the {string} should equal {string}', function (field: string, expected: string) {
  expect(response.body[field]).toBe(parseInt(expected, 10));
});

Then('the {string} list should be empty', function (field: string) {
  expect(Array.isArray(response.body[field])).toBe(true);
  expect(response.body[field].length).toBe(0);
});

Then('the error message should indicate {string}', function (expectedMessage: string) {
  const errorMessage = response.body.error || response.body.message || '';
  expect(errorMessage.toLowerCase()).toContain(expectedMessage.toLowerCase());
});

Then('no field should contain {string} or {string}', function (val1: string, val2: string) {
  const jsonStr = JSON.stringify(response.body);
  expect(jsonStr).not.toContain(val1);
  expect(jsonStr).not.toContain(val2);
});
