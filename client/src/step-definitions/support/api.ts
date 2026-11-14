import { After } from '@cucumber/cucumber';

/**
 * Access to the server API shared by the step definitions: the requests, the
 * test data derived from the scenarios, and the cleanup of everything a
 * scenario created, so that each scenario runs independently of the others.
 *
 * The acceptance tests expect the server started with `npm run
 * dev:acceptance` (server directory): it keeps its data in a separate file
 * and exposes the test route that sets the date the server takes as today.
 */

/** Where the server started for the acceptance tests listens; SERVER_URL changes it when port 3005 is taken. */
export const serverUrl = process.env.SERVER_URL || 'http://localhost:3005';

export interface ApiResponse {
  status: number;
  body: any;
}

/** Sends a request to the server and returns its status and parsed body. */
export async function api(method: string, path: string, body?: unknown): Promise<ApiResponse> {
  const response = await fetch(`${serverUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

/** Like {@link api}, but fails the step when the server does not accept the request. */
export async function apiOk(method: string, path: string, body?: unknown): Promise<ApiResponse> {
  const response = await api(method, path, body);
  if (response.status >= 400) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Test data named in the scenarios
// ---------------------------------------------------------------------------

export interface ClassRef {
  topic: string;
  year: number;
  semester: number;
  id: string;
}

/** A class as named in the scenarios, e.g. "ESS (2026/2)": topic ESS, year 2026, semester 2. */
export function classRef(name: string): ClassRef {
  const match = /^(.+) \((\d{4})\/(\d)\)$/.exec(name);
  if (!match) {
    throw new Error(`Class name "${name}" is not in the form "Topic (year/semester)"`);
  }
  const [, topic, year, semester] = match;
  return { topic, year: Number(year), semester: Number(semester), id: `${topic}-${year}-${semester}` };
}

export const classPath = (name: string) => `/api/classes/${encodeURIComponent(classRef(name).id)}`;

/**
 * The CPF of a student named in the scenarios. The scenarios identify
 * students by name only, so the CPF is derived from the name: always the
 * same for the same name, and different for the names used together.
 */
export function cpfOf(name: string): string {
  let hash = 7;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_000_000;
  }
  const digits = `90${String(hash).padStart(9, '0')}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** An email for a student named in the scenarios that gives none. */
export const emailOf = (name: string) =>
  `${name.toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '.')}@cin.ufpe.br`;

export const enrollmentPath = (className: string, studentName: string) =>
  `${classPath(className)}/enrollments/${cpfOf(studentName)}`;

export const selfAssessmentPath = (className: string, studentName: string, goal: string) =>
  `${enrollmentPath(className, studentName)}/self-assessment/${encodeURIComponent(goal)}`;

/** Dates are written dd/mm/yyyy in the scenarios and yyyy-mm-dd in the API. */
export function isoDate(scenarioDate: string): string {
  const [day, month, year] = scenarioDate.split('/');
  return `${year}-${month}-${day}`;
}

/** The ISO date a number of days away from the given scenario date. */
export function isoDateShiftedBy(scenarioDate: string, days: number): string {
  const date = new Date(`${isoDate(scenarioDate)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// State created by a scenario, removed after it
// ---------------------------------------------------------------------------

const createdClasses = new Set<string>();
const createdStudents = new Set<string>();

/** The discrepancy threshold each class of the scenario was given, by class name. */
const thresholds = new Map<string, number>();

/**
 * Gives the class a discrepancy threshold, and remembers it for the rest of
 * the scenario: a scenario states the threshold before the students of the
 * class, and the step that sets the students up creates the class again.
 */
export async function setThreshold(className: string, threshold: number): Promise<void> {
  await apiOk('PUT', `${classPath(className)}/discrepancy-threshold`, { threshold });
  thresholds.set(className, threshold);
}

/** Creates the class, replacing any class with the same name left by a previous run. */
export async function createFreshClass(name: string): Promise<void> {
  const { topic, year, semester } = classRef(name);
  await api('DELETE', classPath(name));
  await apiOk('POST', '/api/classes', { topic, year, semester });
  createdClasses.add(name);
  const threshold = thresholds.get(name);
  if (threshold !== undefined) {
    await apiOk('PUT', `${classPath(name)}/discrepancy-threshold`, { threshold });
  }
}

/** Creates the class unless it already exists. */
export async function ensureClass(name: string): Promise<void> {
  const { topic, year, semester, id } = classRef(name);
  const classes = await apiOk('GET', '/api/classes');
  if (!classes.body.some((c: any) => c.id === id)) {
    await apiOk('POST', '/api/classes', { topic, year, semester });
  }
  createdClasses.add(name);
}

/**
 * Lets the students of the class register their self-assessment grades: fixes
 * today's date and, when the class has no self-assessment request, makes one
 * whose deadline is still ahead. For scenarios that only need the grades to
 * exist, not the request or the date.
 */
export async function openSelfAssessment(className: string): Promise<void> {
  await apiOk('PUT', '/api/test/clock', { today: '2026-01-15' });
  const classes = await apiOk('GET', '/api/classes');
  const classData = classes.body.find((c: any) => c.id === classRef(className).id);
  if (!classData.selfAssessmentRequest) {
    await apiOk('POST', `${classPath(className)}/self-assessment-request`, { deadline: '2026-12-31' });
  }
}

/** Registers the student, unless it is already registered. */
export async function ensureStudent(name: string, email = emailOf(name)): Promise<void> {
  const existing = await api('GET', `/api/students/${cpfOf(name)}`);
  if (existing.status !== 200) {
    await apiOk('POST', '/api/students', { name, cpf: cpfOf(name), email });
  }
  createdStudents.add(name);
}

/** The enrollment of the student in the class, or undefined when not enrolled. */
export async function enrollmentOf(className: string, studentName: string): Promise<any | undefined> {
  const enrollments = await apiOk('GET', `${classPath(className)}/enrollments`);
  return enrollments.body.find((e: any) => e.student.cpf === cpfOf(studentName));
}

/** The response to the last request a When step sent to the server. */
let lastResponse: ApiResponse | undefined;

export const rememberResponse = (response: ApiResponse) => {
  lastResponse = response;
};

export function requireLastResponse(): ApiResponse {
  if (!lastResponse) {
    throw new Error('No request was sent to the server in this scenario');
  }
  return lastResponse;
}

After(async function () {
  for (const name of Array.from(createdClasses)) {
    await api('DELETE', classPath(name));
  }
  for (const name of Array.from(createdStudents)) {
    await api('DELETE', `/api/students/${cpfOf(name)}`);
  }
  createdClasses.clear();
  createdStudents.clear();
  thresholds.clear();
  lastResponse = undefined;
  // Back to the real date, in case the scenario fixed one
  await api('PUT', '/api/test/clock', { today: null });
});
