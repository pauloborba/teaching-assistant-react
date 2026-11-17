import { Given, DataTable } from '@cucumber/cucumber';
import expect from 'expect';
import {
  api, apiOk, classPath, classRef, cpfOf, createFreshClass, enrollmentOf, enrollmentPath, ensureStudent, isoDate,
  isoDateShiftedBy, storedSelfAssessment, submitSelfAssessment
} from './support/api';
import { EVALUATION_GOALS as GOALS } from '../types/Evaluation';

/**
 * Steps that establish, through the server API, the state a scenario starts
 * from: classes, enrolled students, self-assessment requests, the current
 * date and grades. They are shared by the GUI and the service scenarios.
 */

Given('the class {string} has only the following students:', async function (className: string, table: DataTable) {
  await createFreshClass(className);
  for (const row of table.hashes()) {
    await ensureStudent(row.student, row.email);
    await apiOk('POST', `${classPath(className)}/enroll`, { studentCPF: cpfOf(row.student) });
  }
});

Given('the system has no class {string}', async function (className: string) {
  await api('DELETE', classPath(className));
  const classes = await apiOk('GET', '/api/classes');
  expect(classes.body.find((c: any) => c.id === classRef(className).id)).toBeUndefined();
});

Given('the student {string} is not enrolled in the class {string}', async function (studentName: string, className: string) {
  await ensureStudent(studentName);
  expect(await enrollmentOf(className, studentName)).toBeUndefined();
});

Given('the class {string} has a self-assessment request with deadline {string}', async function (className: string, deadline: string) {
  await apiOk('POST', `${classPath(className)}/self-assessment-request`, { deadline: isoDate(deadline) });
});

Given('the class {string} has no self-assessment request', async function (className: string) {
  await api('DELETE', `${classPath(className)}/self-assessment-request`);
  const classes = await apiOk('GET', '/api/classes');
  const classData = classes.body.find((c: any) => c.id === classRef(className).id);
  expect(classData.selfAssessmentRequest).toBeNull();
});

Given('today is before the deadline {string}', async function (deadline: string) {
  await apiOk('PUT', '/api/test/clock', { today: isoDateShiftedBy(deadline, -1) });
});

Given('today is after the deadline {string}', async function (deadline: string) {
  await apiOk('PUT', '/api/test/clock', { today: isoDateShiftedBy(deadline, 1) });
});

// The classes of a scenario are created anew, so this checks the state rather than changing it
Given('the student {string} has no self-assessment grade in the class {string}', async function (studentName: string, className: string) {
  expect(await storedSelfAssessment(className, studentName)).toEqual({});
});

Given('the student {string} has the self-assessment grade {string} for the goal {string} in the class {string}',
  async function (studentName: string, grade: string, goal: string, className: string) {
    const grades = await storedSelfAssessment(className, studentName);
    await submitSelfAssessment(className, studentName, { ...grades, [goal]: grade });
  });

/** A self-assessment with a grade for each of the given goals. */
const gradingAll = (goals: readonly string[]) => Object.fromEntries(goals.map(goal => [goal, 'MA']));

Given('the student {string} has self-assessment grades for all the goals of the class {string}',
  async function (studentName: string, className: string) {
    await submitSelfAssessment(className, studentName, gradingAll(GOALS));
  });

Given('the student {string} has self-assessment grades for all the goals of the class {string} except {string}',
  async function (studentName: string, className: string, missingGoal: string) {
    await submitSelfAssessment(className, studentName, gradingAll(GOALS.filter(goal => goal !== missingGoal)));
  });

Given('the student {string} has the professor grade {string} for the goal {string} in the class {string}',
  async function (studentName: string, grade: string, goal: string, className: string) {
    await apiOk('PUT', `${enrollmentPath(className, studentName)}/evaluation`, { goal, grade });
  });
