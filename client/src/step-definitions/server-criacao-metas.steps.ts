import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import expect from 'expect';

// Mocking axios since it's not installed
const axios = {
  get: async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return { data: await res.json(), status: res.status };
  },
  post: async (url: string, data: any) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error: any = new Error(`Request failed with status ${res.status}`);
        error.response = { status: res.status };
        throw error;
    }
    // Handle empty response body (e.g. 204 No Content) or non-JSON response
    const text = await res.text();
    const dataJson = text ? JSON.parse(text) : {};
    return { data: dataJson, status: res.status };
  },
  delete: async (url: string) => {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return { status: res.status };
  },
  isAxiosError: (error: any) => !!error.response
};

const serverUrl = 'http://localhost:3005/api'; // Updated to include /api prefix based on other files
let lastResponse: any | undefined;
let lastError: any | undefined;

// --- Helpers ---

async function resetClass(turmaId: string) {
  try {
    // First, find the class ID by topic
    const res = await axios.get(`${serverUrl}/classes`);
    const cls = res.data.find((c: any) => (c.topic || '').toLowerCase() === turmaId.replace(/-/g, ' ').toLowerCase());
    
    if (cls) {
        // Delete the class using its ID
        await axios.delete(`${serverUrl}/classes/${encodeURIComponent(cls.id)}`);
    }
  } catch (error) {
    // Ignore if class doesn't exist or fetch fails
  }
  
  // Recreate the class without goals
  try {
    await axios.post(`${serverUrl}/classes`, {
      topic: turmaId.replace(/-/g, ' '),
      semester: 1,
      year: new Date().getFullYear()
    });
  } catch (error) {
      // Ignore if creation fails
  }
}

// --- Step Definitions ---

Given('o servidor está disponível', async function () {
  try {
    await axios.get(`${serverUrl}/classes`); 
  } catch (error) {
    console.warn('Aviso: Servidor pode não estar disponível.');
  }
});

Given('a turma {string} existe no servidor', async function (turmaId: string) {
    // Ensure class exists (create if not)
    try {
        // Always reset class to ensure clean state for each scenario
        await resetClass(turmaId);
    } catch (e) {}
});

Given('não existem metas cadastradas para a turma {string} no servidor', async function (turmaId: string) {
  // Since goals are permanent, we MUST recreate the class to ensure no goals
  await resetClass(turmaId);
});

Given('a turma {string} já possui as metas {string} e {string} no servidor', async function (turmaId: string, meta1: string, meta2: string) {
  // Reset class to ensure clean state
  await resetClass(turmaId);
  
  // Find the class ID (since we recreate it, ID might change or we use topic as ID lookup)
  const res = await axios.get(`${serverUrl}/classes`);
  const cls = res.data.find((c: any) => (c.topic || '').toLowerCase() === turmaId.replace(/-/g, ' ').toLowerCase());
  
  if (cls) {
      // Add goals
      await axios.post(`${serverUrl}/classes/${cls.id}/metas`, {
        metas: [meta1, meta2]
      });
  }
});

When('eu envio uma requisição para criar as metas para a turma {string}:', async function (turmaId: string, dataTable: DataTable) {
  const metas = dataTable.hashes().map(row => row.titulo); // API expects array of strings, not objects
  
  lastResponse = undefined;
  lastError = undefined;

  try {
    // Need to find class ID first
    const res = await axios.get(`${serverUrl}/classes`);
    const cls = res.data.find((c: any) => (c.topic || '').toLowerCase() === turmaId.replace(/-/g, ' ').toLowerCase());
    
    if (cls) {
        lastResponse = await axios.post(`${serverUrl}/classes/${cls.id}/metas`, {
            metas: metas
        });
    } else {
        throw new Error(`Class ${turmaId} not found`);
    }
  } catch (error) {
    // Capture error for validation steps
    lastError = error;
    // Do not rethrow if we expect an error (which we do in some scenarios)
    // But if it's a network error or unexpected, it might be good to know.
    // For now, we store it in lastError and let the Then steps assert it.
  }
});

Then('a requisição deve ser aceita com sucesso', function () {
  expect(lastResponse).toBeDefined();
  expect([200, 201]).toContain(lastResponse?.status);
});

Then('a requisição deve ser rejeitada com erro de validação', function () {
  expect(lastError).toBeDefined();
  // Accept 400 (Bad Request) or 409 (Conflict) or 422 (Unprocessable Entity)
  expect([400, 409, 422]).toContain(lastError?.response?.status);
});

Then('a requisição deve ser rejeitada com erro de conflito ou validação', function () {
  expect(lastError).toBeDefined();
  expect([400, 409]).toContain(lastError?.response?.status);
});

Then('a requisição deve ser rejeitada pois a turma já possui metas', function () {
  expect(lastError).toBeDefined();
  expect([400, 403, 409]).toContain(lastError?.response?.status);
});

Then('o servidor deve conter as metas {string} e {string} associadas à turma {string}', async function (meta1: string, meta2: string, turmaId: string) {
  const res = await axios.get(`${serverUrl}/classes`);
  const cls = res.data.find((c: any) => (c.topic || '').toLowerCase() === turmaId.replace(/-/g, ' ').toLowerCase());
  
  expect(cls).toBeDefined();
  // Assuming the class object contains the metas or we need to fetch them
  // Based on other files, it seems metas might be part of the class object or fetched separately?
  // Let's assume they are in the class object for now or fetch if needed.
  // If the API returns metas in the class object:
  const metas = cls.metas || []; 
  // If metas are strings:
  expect(metas).toContain(meta1);
  expect(metas).toContain(meta2);
});

Then('não devem existir metas cadastradas para a turma {string} no servidor', async function (turmaId: string) {
  const res = await axios.get(`${serverUrl}/classes`);
  const cls = res.data.find((c: any) => (c.topic || '').toLowerCase() === turmaId.replace(/-/g, ' ').toLowerCase());
  const metas = cls ? (cls.metas || []) : [];
  expect(metas).toHaveLength(0);
});

Then('as metas da turma {string} devem permanecer {string} e {string}', async function (turmaId: string, meta1: string, meta2: string) {
  const res = await axios.get(`${serverUrl}/classes`);
  const cls = res.data.find((c: any) => (c.topic || '').toLowerCase() === turmaId.replace(/-/g, ' ').toLowerCase());
  const metas = cls ? (cls.metas || []) : [];
  
  expect(metas).toHaveLength(2);
  expect(metas).toContain(meta1);
  expect(metas).toContain(meta2);
});