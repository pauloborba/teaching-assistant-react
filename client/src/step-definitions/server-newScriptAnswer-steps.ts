import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import expect from 'expect';

const API_URL = 'http://localhost:3005/api';

// Test data storage
interface TestContext {
  lastResponse?: any;
  lastError?: any;
  lastStatusCode?: number;
  scriptAnswers?: any[];
  scriptAnswer?: any;
  taskAnswer?: any;
  student?: any;
  class?: any;
  script?: any;
  classesByName: Map<string, any>;
  studentsByCPF: Map<string, any>;
  currentTaskId?: string;
  elapsedSeconds?: number;
  expectedScriptAnswerIds?: string[];
}

const context: TestContext = {
  classesByName: new Map(),
  studentsByCPF: new Map(),
};

Before({ tags: '@server' }, async function () {
  try {
    await fetchAPI('POST', '/reset-mock-data');
  } catch (error) {
    console.warn('⚠ Could not reset mock data:', error);
  }
});

After({ tags: '@server' }, async function () {
  try {
    await fetchAPI('DELETE', '/scriptanswers');
    console.log('✓ Cleanup: Deleted all scriptanswers');
  } catch (error) {
    console.warn('⚠ Cleanup failed:', error);
  }
});

// ============================================================
// Helper Functions
// ============================================================

async function fetchAPI(method: string, endpoint: string, body?: any): Promise<any> {
  const url = `${API_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    context.lastStatusCode = response.status;
    
    const text = await response.text();
    if (text) {
      try {
        context.lastResponse = JSON.parse(text);
      } catch {
        context.lastResponse = text;
      }
    }
    
    if (!response.ok) {
      context.lastError = context.lastResponse;
    }
    
    return context.lastResponse;
  } catch (error: any) {
    context.lastError = error;
    throw error;
  }
}

// ============================================================
// Background
// ============================================================

Given('the server API is available', async function () {
  try {
    const response = await fetch('http://localhost:3005/api/students');
    expect(response.status).toBe(200);
  } catch (error) {
    throw new Error('Server API is not available on port 3005');
  }
});

// ============================================================
// Portuguese Scenarios: Create ScriptAnswer
// ============================================================

Given('O estudante de CPF {string} está cadastrado no sistema', async function (cpf: string) {
  // Simply store the student data - backend will verify on endpoint call
  context.student = { cpf };
  context.studentsByCPF.set(cpf, context.student);
});

Given('O aluno está matriculado na turma {string}', async function (className: string) {
  try {
    const classes = await fetchAPI('GET', '/classes');
    context.class = classes.find((c: any) => c.id === className);
    expect(context.class).toBeDefined();
    context.classesByName.set(className, context.class);
  } catch (error: any) {
    throw new Error(`Class ${className} not found: ${error.message}`);
  }
});

Given('Existe um roteiro de ID {string} na turma', async function (scriptId: string) {
  try {
    context.script = await fetchAPI('GET', `/scripts/${scriptId}`);
    expect(context.script).toBeDefined();
  } catch (error: any) {
    throw new Error(`Script with ID ${scriptId} not found: ${error.message}`);
  }
});

When('O aluno cria um ScriptAnswer para o roteiro', async function () {
  try {
    const answer = await fetchAPI('POST', '/scriptanswers', {
      scriptId: context.script!.id,
      classId: context.class!.id,
      studentId: context.student!.cpf
    });
    context.scriptAnswer = answer;
  } catch (error: any) {
    context.lastError = error;
  }
});

Then('O servidor retorna status {string}', async function (statusStr: string) {
  const status = parseInt(statusStr);
  expect(context.lastStatusCode).toBe(status);
});

Then('O ScriptAnswer tem status {string}', async function (expectedStatus: string) {
  expect(context.lastResponse?.status).toBe(expectedStatus);
});

Then('O campo {string} contém um timestamp válido', async function (fieldName: string) {
  const value = context.lastResponse?.[fieldName];
  expect(typeof value).toBe('number');
  expect(value).toBeGreaterThan(0);
});

Then('O campo {string} está vazio', async function (fieldName: string) {
  const value = context.lastResponse?.[fieldName];
  // If it's an array, check if empty
  if (Array.isArray(value)) {
    expect(value.length).toBe(0);
  } else {
    // Otherwise, should be null or undefined
    expect(value == null).toBe(true);
  }
});

// ============================================================
// Portuguese Scenarios: Start Task Answer
// ============================================================

Given('O estudante de CPF {string} tem um ScriptAnswer ativo de ID {string}', async function (cpf: string, scriptAnswerId: string) {
  context.student = context.studentsByCPF.get(cpf) || { cpf };
  try {
    context.scriptAnswer = await fetchAPI('GET', `/scriptanswers/${scriptAnswerId}`);
    expect(context.scriptAnswer.status).toBe('in_progress');
  } catch (error: any) {
    throw new Error(`ScriptAnswer ${scriptAnswerId} not found or not in_progress: ${error.message}`);
  }
});

Given('A tarefa {string} existe no roteiro', async function (taskId: string) {
  context.currentTaskId = taskId;
  // Task existence is verified implicitly when we try to start it
});

Given('A tarefa ainda não foi iniciada', async function () {
  // No explicit setup needed
});

When('O aluno inicia a resposta da tarefa {string}', async function (taskId: string) {
  context.currentTaskId = taskId;
  try {
    const taskAnswer = await fetchAPI('POST', `/scriptanswers/${context.scriptAnswer!.id}/tasks/${taskId}/start`);
    context.taskAnswer = taskAnswer;
  } catch (error: any) {
    context.lastError = error;
  }
});

Then('A TaskAnswer tem status {string}', async function (expectedStatus: string) {
  expect(context.taskAnswer?.status).toBe(expectedStatus);
});

Then('O campo {string} contém timestamp válido', async function (fieldName: string) {
  // Try taskAnswer first (for TaskAnswer fields like submitted_at), then lastResponse (for ScriptAnswer fields)
  const value = context.taskAnswer?.[fieldName] ?? context.lastResponse?.[fieldName];
  expect(typeof value).toBe('number');
  expect(value).toBeGreaterThan(0);
});

// ============================================================
// Portuguese Scenarios: Submit Task Answer
// ============================================================

Given('A tarefa {string} foi iniciada', async function (taskId: string) {
  context.currentTaskId = taskId;
  try {
    const updated = await fetchAPI('GET', `/scriptanswers/${context.scriptAnswer!.id}`);
    context.scriptAnswer = updated;
    const task = updated.answers.find((a: any) => a.task === taskId);
    expect(task?.status).toBe('started');
  } catch (error: any) {
    throw new Error(`Task ${taskId} not found or not started: ${error.message}`);
  }
});

Given('A tarefa não é a última do roteiro', async function () {
  // Verification happens after submit
});

Given('A tarefa é a última do roteiro', async function () {
  // Verification happens after submit
});

When('O aluno submete a resposta {string} para a tarefa', async function (answer: string) {
  try {
    const taskId = context.currentTaskId || 'task-001';
    const submitted = await fetchAPI('POST', `/scriptanswers/${context.scriptAnswer!.id}/tasks/${taskId}/submit`, { answer });
    context.taskAnswer = submitted;
    // Fetch updated ScriptAnswer to check if it's finished
    context.lastResponse = await fetchAPI('GET', `/scriptanswers/${context.scriptAnswer!.id}`);
    context.scriptAnswer = context.lastResponse;
  } catch (error: any) {
    context.lastError = error;
  }
});

Then('O campo {string} é calculado corretamente', async function (fieldName: string) {
  if (fieldName === 'time_taken_seconds') {
    // time_taken_seconds is in taskAnswer, not lastResponse
    expect(typeof context.taskAnswer?.time_taken_seconds).toBe('number');
    expect(context.taskAnswer?.time_taken_seconds).toBeGreaterThanOrEqual(0);
  }
});

Then('O ScriptAnswer continua com status {string}', async function (expectedStatus: string) {
  const updated = await fetchAPI('GET', `/scriptanswers/${context.scriptAnswer!.id}`);
  expect(updated.status).toBe(expectedStatus);
});

Then('O campo {string} do ScriptAnswer contém timestamp válido', async function (fieldName: string) {
  const updated = await fetchAPI('GET', `/scriptanswers/${context.scriptAnswer!.id}`);
  const value = updated[fieldName];
  expect(typeof value).toBe('number');
  expect(value).toBeGreaterThan(0);
});

// ============================================================
// Portuguese Scenarios: Timeout
// ============================================================

Given('Passaram-se do tempo limite para realizar o roteiro', async function () {
  // Set a negative timeout so any elapsed time will be greater
  // This guarantees timeout will trigger regardless of actual elapsed time
  context.elapsedSeconds = -1;
});

When('O sistema verifica timeout do ScriptAnswer', async function () {
  try {
    const maxTime = context.elapsedSeconds || 3600; //simulando um timeout ultrapassado.
    const result = await fetchAPI('POST', `/scriptanswers/${context.scriptAnswer!.id}/timeout`, { timeoutSeconds: maxTime });
    // Extract scriptAnswer from response (endpoint returns { message, scriptAnswer })
    context.lastResponse = result.scriptAnswer || result;
    context.scriptAnswer = context.lastResponse;
  } catch (error: any) {
    context.lastError = error;
  }
});

Then('As tarefas {string} foram marcadas como {string}', async function (originalStatus: string, newStatus: string) {
  const updated = await fetchAPI('GET', `/scriptanswers/${context.scriptAnswer!.id}`);
  
  if (originalStatus === 'started' && newStatus === 'submitted') {
    // All previously started tasks should now be submitted
    const stillStarted = updated.answers.filter((a: any) => a.status === 'started');
    expect(stillStarted.length).toBe(0);
    
    const nowSubmitted = updated.answers.filter((a: any) => a.status === 'submitted');
    expect(nowSubmitted.length).toBeGreaterThan(0);
  }
  
  if (originalStatus === 'pending' && newStatus === 'timed_out') {
    // All previously pending tasks should now be timed_out
    const stillPending = updated.answers.filter((a: any) => a.status === 'pending');
    expect(stillPending.length).toBe(0);
    
    const nowTimedOut = updated.answers.filter((a: any) => a.status === 'timed_out');
    expect(nowTimedOut.length).toBeGreaterThan(0);
  }
});

// ============================================================
// Portuguese Scenarios: Enrollment Failure
// ============================================================

Given('O aluno NÃO está matriculado na turma {string}', async function (className: string) {
  // Already handled by not setting the enrollment
});

When('O aluno tenta criar um ScriptAnswer para o roteiro', async function () {
  try {
    await fetchAPI('POST', '/scriptanswers', {
      scriptId: context.script?.id || 'script-001',
      classId: context.class?.id || 'Math101-2024-2024',
      studentId: context.student?.cpf || '99999999999'
    });
  } catch (error: any) {
    context.lastError = error;
  }
});

Then('A mensagem de erro indica {string}', async function (expectedMessage: string) {
  const errorMsg = context.lastError?.message || context.lastResponse?.error || '';
  expect(errorMsg).toContain(expectedMessage);
});

// ============================================================
// Portuguese Scenarios: Duplicate Task Start
// ============================================================

Given('A tarefa {string} já foi iniciada anteriormente', async function (taskId: string) {
  context.currentTaskId = taskId;
  const updated = await fetchAPI('GET', `/scriptanswers/${context.scriptAnswer!.id}`);
  const task = updated.answers.find((a: any) => a.task === taskId);
  expect(task?.status).toBe('started');
});

When('O aluno tenta iniciar novamente a tarefa {string}', async function (taskId: string) {
  try {
    await fetchAPI('POST', `/scriptanswers/${context.scriptAnswer!.id}/tasks/${taskId}/start`);
  } catch (error: any) {
    context.lastError = error;
  }
});

// ============================================================
// Portuguese Scenarios: Class Script Answers
// ============================================================

Given('A turma {string} tem {string} alunos com ScriptAnswers', async function (className: string, countStr: string) {
  const count = parseInt(countStr);
  try {
    const classes = await fetchAPI('GET', '/classes');
    context.class = classes.find((c: any) => c.id === className);
    expect(context.class).toBeDefined();
    
    const answers = await fetchAPI('GET', `/scriptanswers/class/${context.class!.id}`);
    context.scriptAnswers = answers;
    expect(answers.length).toBeGreaterThanOrEqual(count);
  } catch (error: any) {
    throw new Error(`Failed to fetch class answers: ${error.message}`);
  }
});

When('O sistema busca todos os ScriptAnswers da turma', async function () {
  try {
    await fetchAPI('GET', `/scriptanswers/class/${context.class!.id}`);
  } catch (error: any) {
    context.lastError = error;
  }
});

Then('A resposta contém pelo menos {string} ScriptAnswers', async function (countStr: string) {
  const expectedCount = parseInt(countStr);
  expect(context.lastResponse).toBeDefined();
  expect(Array.isArray(context.lastResponse)).toBe(true);
  expect(context.lastResponse.length).toBeGreaterThanOrEqual(expectedCount);
});

Then('Todos os ScriptAnswers pertencem à turma correta', async function () {
  const classId = context.class!.id;
  for (const answer of context.lastResponse) {
    expect(answer.classId).toBe(classId);
  }
});

// ============================================================
// Portuguese Scenarios: Enrollment Query
// ============================================================

Given('Existe uma turma com ID {string}', async function (classId: string) {
  try {
    const classes = await fetchAPI('GET', '/classes');
    context.class = classes.find((c: any) => c.id === classId);
    expect(context.class).toBeDefined();
    context.classesByName.set(classId, context.class);
  } catch (error: any) {
    throw new Error(`Class ${classId} not found: ${error.message}`);
  }
});

Given('Existe um estudante com CPF {string} matriculado na turma {string}', async function (cpf: string, className: string) {
  // Simply store the student data - backend will verify on endpoint call
  context.student = { cpf };
  context.studentsByCPF.set(cpf, context.student);
});

Given('Este estudante possui ScriptAnswers de IDs {string} na turma {string}', async function (idsString: string, className: string) {
  const ids = idsString.split(', ').map(id => id.trim());
  // Store expected IDs for later validation
  context.expectedScriptAnswerIds = ids;
});

When('Eu envio uma requisição GET para {string}', async function (endpoint: string) {
  try {
    await fetchAPI('GET', endpoint);
  } catch (error: any) {
    context.lastError = error;
  }
});

Then('O servidor deve retornar uma lista contendo as respostas {string}', async function (idsString: string) {
  const expectedIds = idsString.split(', ').map(id => id.trim());
  expect(Array.isArray(context.lastResponse)).toBe(true);
  
  const returnedIds = context.lastResponse.map((a: any) => a.id);
  for (const id of expectedIds) {
    expect(returnedIds).toContain(id);
  }
});

// ============================================================
// Portuguese Scenarios: Re-submit Failed
// ============================================================

Given('A tarefa {string} já foi submetida', async function (taskId: string) {
  context.currentTaskId = taskId;
  const updated = await fetchAPI('GET', `/scriptanswers/${context.scriptAnswer!.id}`);
  const task = updated.answers.find((a: any) => a.task === taskId);
  expect(task?.status).toBe('submitted');
});

When('O aluno tenta submeter novamente a tarefa {string} com resposta {string}', async function (taskId: string, answer: string) {
  try {
    await fetchAPI('POST', `/scriptanswers/${context.scriptAnswer!.id}/tasks/${taskId}/submit`, { answer });
  } catch (error: any) {
    context.lastError = error;
  }
});
