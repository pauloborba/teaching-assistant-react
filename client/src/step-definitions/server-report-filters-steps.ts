import { Given, When, Then, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';

setDefaultTimeout(30 * 1000);

const serverUrl = 'http://localhost:3005';

let currentClassId: string;
let lastReportData: any;
let filteredStudents: any[];
let createdCpfs: string[] = [];

After({ tags: '@server' }, async function () {
  if (currentClassId) {
    try {
      await fetch(`${serverUrl}/api/classes/${currentClassId}`, { method: 'DELETE' });
    } catch (e) {}
  }
  
  if (createdCpfs.length > 0) {
    for (const cpf of createdCpfs) {
      try {
        await fetch(`${serverUrl}/api/students/${cpf}`, { method: 'DELETE' });
      } catch (e) {}
    }
    createdCpfs = [];
  }
});

Given('a class exists with name {string}', async function (className: string) {
  const response = await fetch(`${serverUrl}/api/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: className,
      name: className,
      code: `TEST-${Date.now()}`,
      semester: 1,
      year: 2024
    })
  });

  if (!response.ok) {
    throw new Error(`Falha ao criar turma. Status: ${response.status}`);
  }

  const data = await response.json();
  currentClassId = data.id || data._id || data.classId;

  if (!currentClassId) {
    throw new Error("O servidor criou a turma, mas não retornou um ID válido.");
  }
});

Given('the following students have evaluations in this class:', async function (dataTable: DataTable) {
  const rows = dataTable.hashes();

  for (const row of rows) {
    await fetch(`${serverUrl}/api/students/${row.cpf}`, { method: 'DELETE' }).catch(() => {});

    const studentRes = await fetch(`${serverUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: row.name, 
        cpf: row.cpf, 
        email: `${row.name.toLowerCase()}@test.com` 
      })
    });
    
    if (!studentRes.ok) {
       throw new Error(`Falha ao criar aluno. Status: ${studentRes.status}`);
    }
    createdCpfs.push(row.cpf);

    const enrollRes = await fetch(`${serverUrl}/api/classes/${currentClassId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCPF: row.cpf })
    });

    if (!enrollRes.ok) {
        throw new Error(`Falha ao matricular aluno. Status: ${enrollRes.status}`);
    }

    const evalUrl = `${serverUrl}/api/classes/${currentClassId}/enrollments/${row.cpf}/evaluation`;
    
    const evalRes = await fetch(evalUrl, {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: "Test Goal",
        grade: row.gradeType 
      })
    });

    if (!evalRes.ok) {
        throw new Error(`Falha ao atribuir nota. Status: ${evalRes.status}`);
    }
  }
});

When('I request the class report', async function () {
  if (!currentClassId) throw new Error("ID da turma não definido.");

  const response = await fetch(`${serverUrl}/api/classes/${currentClassId}/report`);
  
  if (!response.ok) {
    throw new Error(`Falha ao buscar relatório. Status: ${response.status}`);
  }

  lastReportData = await response.json();
});

When('I apply the {string} filter on the report data', function (filterType: string) {
  const students = lastReportData.students;
  const average = lastReportData.studentsAverage;

  if (filterType === 'BELOW_AVG') {
    filteredStudents = students.filter((s: any) => s.finalGrade < average);
  } else if (filterType === 'APPROVED') {
    filteredStudents = students.filter((s: any) => s.status === 'APPROVED');
  } else {
    filteredStudents = students;
  }
});

When('I apply the {string} filter with value {float}', function (filterType: string, threshold: number) {
  const students = lastReportData.students;
  
  if (filterType === 'BELOW_THRESHOLD') {
    filteredStudents = students.filter((s: any) => s.finalGrade < threshold);
  }
});

Then('the filtered list should contain exactly {int} student', function (count: number) {
  expect(filteredStudents.length).toBe(count);
});

Then('the filtered list should contain exactly {int} students', function (count: number) {
  expect(filteredStudents.length).toBe(count);
});

Then('the student {string} should be present in the filtered list', function (name: string) {
  const found = filteredStudents.some((s: any) => s.name === name);
  expect(found).toBe(true);
});

Then('the student {string} should NOT be present in the filtered list', function (name: string) {
  const found = filteredStudents.some((s: any) => s.name === name);
  expect(found).toBe(false);
});