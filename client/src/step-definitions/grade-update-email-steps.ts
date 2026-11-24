import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const loadModule = createRequire(join(process.cwd(), 'src', 'step-definitions', 'grade-update-email-steps.ts'));

interface RecordedEmail {
  destinatario: string;
  assunto: string;
  conteudo: string;
}

interface RecordingSender {
  enviados: RecordedEmail[];
}

interface GradeApiResponse {
  id?: string;
  emailAlert?: string;
  evaluations?: { goal: string; grade: string }[];
}

interface GradeTestServer {
  app: import('node:http').RequestListener;
  classes: {
    getAllClasses(): { getClassId(): string }[];
    removeClass(id: string): boolean;
  };
  studentSet: {
    getAllStudents(): { getCPF(): string }[];
    findStudentByCPF(cpf: string): {
      name: string;
      email: string;
      lastGradeNotificationDate: string | null;
    } | undefined;
    removeStudent(cpf: string): boolean;
  };
  periodosAcademicos: Map<string, unknown>;
  services: {
    gradeNotificationSender: unknown;
  };
}

const cpfs: Record<string, string> = {
  'João Silva': '10100000001',
  'Maria Souza': '10100000002',
  'Pedro Alves': '10100000003',
  'Ana Costa': '10100000004',
  'Lucas Mendes': '10100000005',
  'Carla Dias': '10100000006'
};
const gradeEmailTag = '@grade-email';

let serverModule: GradeTestServer;
let httpServer: Server | undefined;
let api = '';
let classId = '';
let students = new Map<string, { cpf: string; email: string }>();
let lastResponse: GradeApiResponse | undefined;
let emailsBeforeUpdate = 0;
let lucasNotificationDate: string | null = null;

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function testSender(): RecordingSender {
  const sender = serverModule.services.gradeNotificationSender;
  assert(isRecordingSender(sender), 'Cucumber must use the test email sender');
  return sender;
}

function isRecordingSender(sender: unknown): sender is RecordingSender {
  return typeof sender === 'object' &&
    sender !== null &&
    'enviados' in sender &&
    Array.isArray(sender.enviados);
}

function student(name: string) {
  const person = serverModule.studentSet.findStudentByCPF(students.get(name)?.cpf ?? '');
  assert(person, `Student not found in test server: ${name}`);
  return person;
}

async function request(
  method: string,
  path: string,
  expectedStatus: number,
  body?: object
): Promise<Response> {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  assert.equal(response.status, expectedStatus, `${method} ${path}`);
  return response;
}

async function createCourse(topic: string): Promise<void> {
  await request('PUT', '/api/classes/email', 200, { emailDasTurmas: 'courses@example.test' });
  const response = await request('POST', '/api/classes', 201, {
    topic,
    semester: 1,
    year: 2099
  });
  classId = ((await response.json()) as GradeApiResponse).id ?? '';
  assert(classId, 'The test course should have an ID');
}

async function enrollStudent(name: string, email = `${cpfs[name]}@example.test`): Promise<void> {
  const cpf = cpfs[name];
  assert(cpf, `No test CPF configured for ${name}`);
  await request('POST', '/api/students', 201, { name, cpf, email });
  students.set(name, { cpf, email });
  await request('POST', `/api/classes/${encodeURIComponent(classId)}/enroll`, 201, {
    studentCPF: cpf
  });
}

async function recordGrade(name: string, grade: string, goal = 'Tests'): Promise<GradeApiResponse> {
  const cpf = students.get(name)?.cpf;
  assert(cpf, `Student is not enrolled in the scenario: ${name}`);
  const response = await request(
    'PUT',
    `/api/classes/${encodeURIComponent(classId)}/enrollments/${encodeURIComponent(cpf)}/evaluation`,
    200,
    { goal, grade }
  );
  return response.json() as Promise<GradeApiResponse>;
}

Before({ tags: gradeEmailTag }, async function () {
  process.env.NODE_ENV = 'test';
  serverModule = loadModule('../../../server/src/server') as GradeTestServer;

  serverModule.classes.getAllClasses().forEach(course =>
    serverModule.classes.removeClass(course.getClassId())
  );
  serverModule.studentSet.getAllStudents().forEach(person =>
    serverModule.studentSet.removeStudent(person.getCPF())
  );
  serverModule.periodosAcademicos.clear();
  testSender().enviados.length = 0;

  students = new Map();
  lastResponse = undefined;
  emailsBeforeUpdate = 0;
  lucasNotificationDate = null;

  httpServer = createServer(serverModule.app);
  await new Promise<void>((resolve, reject) => {
    httpServer!.once('error', reject);
    httpServer!.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address();
  assert(address && typeof address !== 'string');
  api = `http://127.0.0.1:${address.port}`;
});

After({ tags: gradeEmailTag }, async function () {
  if (httpServer) {
    await new Promise<void>(resolve => httpServer!.close(() => resolve()));
    httpServer = undefined;
  }
});

Given('student {string} is enrolled in {string}', async (name: string, topic: string) => {
  await createCourse(topic);
  await enrollStudent(name);
});

Given('students {string} and {string} are enrolled in {string}',
  async (first: string, second: string, topic: string) => {
    await createCourse(topic);
    await enrollStudent(first);
    await enrollStudent(second);
  }
);

Given('no grade notification has been sent to {string} today', (name: string) => {
  assert.notEqual(student(name).lastGradeNotificationDate, today());
  emailsBeforeUpdate = testSender().enviados.length;
});

Given('a grade update email has already been sent to {string} today', async (name: string) => {
  if (student(name).lastGradeNotificationDate !== today()) {
    await recordGrade(name, 'MA', 'Design');
  }
  assert.equal(student(name).lastGradeNotificationDate, today());
  assert(testSender().enviados.some(email => email.destinatario === student(name).email));
  emailsBeforeUpdate = testSender().enviados.length;
  if (name === 'Lucas Mendes') {
    lucasNotificationDate = student(name).lastGradeNotificationDate;
  }
});

Given('student {string} has no email address registered', async (name: string) => {
  const cpf = students.get(name)?.cpf;
  assert(cpf);
  await request('PUT', `/api/students/${encodeURIComponent(cpf)}`, 200, { name, email: '' });
  students.set(name, { cpf, email: '' });
  emailsBeforeUpdate = testSender().enviados.length;
});

Given('grade {string} was recorded for {string} today', async (grade: string, name: string) => {
  lastResponse = await recordGrade(name, grade);
  assert.equal(student(name).lastGradeNotificationDate, today());
  emailsBeforeUpdate = testSender().enviados.length;
});

When('the professor records grade {string} for {string} in {string}',
  async (grade: string, name: string, topic: string) => {
    assert.equal(topic, 'Software Engineering');
    lastResponse = await recordGrade(name, grade);
  }
);

When("the professor updates {string}'s grade in {string} to {string}",
  async (name: string, topic: string, grade: string) => {
    assert.equal(topic, 'Software Engineering');
    lastResponse = await recordGrade(name, grade);
  }
);

When("the professor changes {string}'s grade from {string} to {string} in {string}",
  async (name: string, previousGrade: string, grade: string, topic: string) => {
    assert.equal(topic, 'Software Engineering');
    assert(lastResponse?.evaluations?.some(evaluation =>
      evaluation.goal === 'Tests' && evaluation.grade === previousGrade
    ));
    lastResponse = await recordGrade(name, grade);
  }
);

Then('grade {string} is successfully stored in the system', (grade: string) => {
  assert(lastResponse?.evaluations?.some(evaluation =>
    evaluation.goal === 'Tests' && evaluation.grade === grade
  ));
});

Then("{string}'s grade is updated to {string} in the system",
  (name: string, grade: string) => {
    assert(lastResponse?.evaluations?.some(evaluation =>
      evaluation.goal === 'Tests' && evaluation.grade === grade
    ), `Expected ${name}'s grade to be ${grade}`);
  }
);

Then('a grade update email is sent to {string}', (name: string) => {
  const recipient = student(name).email;
  assert(testSender().enviados.slice(emailsBeforeUpdate)
    .some(email => email.destinatario === recipient));
});

Then('no additional grade update email is sent to {string}', (name: string) => {
  assert.equal(testSender().enviados.length, emailsBeforeUpdate);
  assert.equal(
    testSender().enviados.slice(emailsBeforeUpdate)
      .some(email => email.destinatario === student(name).email),
    false
  );
});

Then('no grade update email is sent', () => {
  assert.equal(testSender().enviados.length, emailsBeforeUpdate);
});

Then('the system records that a notification has already been sent to {string} today',
  (name: string) => {
    assert.equal(student(name).lastGradeNotificationDate, today());
  }
);

Then('the system displays an alert that the student has no email address', () => {
  assert.equal(lastResponse?.emailAlert, 'No email address registered for this student');
});

Then("{string}'s notification status remains unchanged", (name: string) => {
  assert.equal(student(name).lastGradeNotificationDate, lucasNotificationDate);
});
