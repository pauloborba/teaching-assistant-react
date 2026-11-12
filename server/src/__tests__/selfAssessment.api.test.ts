import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../app';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { InMemoryOnlyRepository } from '../persistence/AppStateRepository';
import { SettableClock } from '../services/Clock';
import { newTestApp } from './support/newTestApp';

/**
 * Service tests (not acceptance) of the self-assessment endpoints: status
 * codes, payload validation and the JSON the client relies on.
 */

const bruno = { name: 'Bruno Tavares', cpf: '123.456.789-01', email: 'bruno@cin.ufpe.br' };
const CLASS_PATH = '/api/classes/ESS-2026-2';
const REQUEST_PATH = `${CLASS_PATH}/self-assessment-request`;
const gradePath = (goal: string, cpf = bruno.cpf) =>
  `${CLASS_PATH}/enrollments/${cpf}/self-assessment/${encodeURIComponent(goal)}`;

let app: Express;
let clock: SettableClock;

/** A fresh application whose clock the test controls, with ESS (2026/2) and Bruno enrolled. */
async function setUp(enableTestRoutes = false) {
  clock = new SettableClock({ today: () => '2026-10-08' });
  app = createApp({
    students: new StudentSet(),
    classes: new Classes(),
    repository: new InMemoryOnlyRepository(),
    clock,
    testClock: enableTestRoutes ? clock : undefined
  });
  await request(app).post('/api/students').send(bruno).expect(201);
  await request(app).post('/api/classes').send({ topic: 'ESS', semester: 2, year: 2026 }).expect(201);
  await request(app).post(`${CLASS_PATH}/enroll`).send({ studentCPF: bruno.cpf }).expect(201);
}

describe('Self-assessment request endpoints', () => {
  beforeEach(() => setUp());

  test('POST creates the request, sent today, and the class shows it', async () => {
    const response = await request(app).post(REQUEST_PATH).send({ deadline: '2026-10-20' }).expect(201);
    expect(response.body).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    const classes = await request(app).get('/api/classes').expect(200);
    expect(classes.body[0].selfAssessmentRequest).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
  });

  test('POST rejects a deadline that is not a yyyy-mm-dd date', async () => {
    for (const deadline of [undefined, '20/10/2026', '2026-02-30', 20261020]) {
      const response = await request(app).post(REQUEST_PATH).send({ deadline }).expect(400);
      expect(response.body.error).toBe('Deadline must be a date in the format yyyy-mm-dd');
    }
  });

  test('DELETE removes the request', async () => {
    await request(app).post(REQUEST_PATH).send({ deadline: '2026-10-20' }).expect(201);
    await request(app).delete(REQUEST_PATH).expect(204);
    const classes = await request(app).get('/api/classes').expect(200);
    expect(classes.body[0].selfAssessmentRequest).toBeNull();
  });

  test('both report an unknown class as not found', async () => {
    const unknown = '/api/classes/Nope-2026-2/self-assessment-request';
    expect((await request(app).post(unknown).send({ deadline: '2026-10-20' }).expect(404)).body.error).toBe('Class not found');
    expect((await request(app).delete(unknown).expect(404)).body.error).toBe('Class not found');
  });
});

describe('Self-assessment grade endpoints', () => {
  beforeEach(async () => {
    await setUp();
    await request(app).post(REQUEST_PATH).send({ deadline: '2026-10-20' }).expect(201);
  });

  test('PUT stores a grade and returns the enrollment with it', async () => {
    const response = await request(app).put(gradePath('Configuration Management')).send({ grade: 'MPA' }).expect(200);
    expect(response.body.selfAssessments).toEqual([{ goal: 'Configuration Management', grade: 'MPA' }]);
    expect(response.body.evaluations).toEqual([]);
    const enrollments = await request(app).get(`${CLASS_PATH}/enrollments`).expect(200);
    expect(enrollments.body[0].selfAssessments).toEqual([{ goal: 'Configuration Management', grade: 'MPA' }]);
  });

  test('DELETE removes a grade', async () => {
    await request(app).put(gradePath('Tests')).send({ grade: 'MA' }).expect(200);
    const response = await request(app).delete(gradePath('Tests')).expect(200);
    expect(response.body.selfAssessments).toEqual([]);
  });

  test('rule violations are 400s and unknown class or student are 404s', async () => {
    const cases: [request.Test, number, string][] = [
      [request(app).put(gradePath('Tests')).send({ grade: 'XYZ' }), 400, 'Invalid grade. Must be MANA, MPA, or MA'],
      [request(app).put(gradePath('Tests')).send({}), 400, 'Invalid grade. Must be MANA, MPA, or MA'],
      [request(app).put(gradePath('Databases')).send({ grade: 'MA' }), 400, 'Databases is not a goal of the class'],
      [request(app).put(gradePath('Tests', '987.654.321-00')).send({ grade: 'MA' }), 404, 'Student not enrolled in this class'],
      [request(app).put(`/api/classes/Nope-2026-2/enrollments/${bruno.cpf}/self-assessment/Tests`).send({ grade: 'MA' }), 404, 'Class not found']
    ];
    for (const [sent, status, error] of cases) {
      const response = await sent.expect(status);
      expect(response.body).toEqual({ error });
    }
  });

  test('PUT is rejected after the deadline', async () => {
    clock.set('2026-10-21');
    const response = await request(app).put(gradePath('Tests')).send({ grade: 'MA' }).expect(400);
    expect(response.body.error).toBe('The self-assessment deadline 20/10/2026 has passed');
  });
});

describe('Test clock endpoint', () => {
  test('is not available unless the application is built with a test clock', async () => {
    app = newTestApp();
    await request(app).put('/api/test/clock').send({ today: '2026-10-19' }).expect(404);
  });

  test('fixes the date the server takes as today, and null goes back to the real date', async () => {
    await setUp(true);
    await request(app).put('/api/test/clock').send({ today: '2026-10-19' }).expect(204);
    expect(clock.today()).toBe('2026-10-19');
    const created = await request(app).post(REQUEST_PATH).send({ deadline: '2026-10-20' }).expect(201);
    expect(created.body.sentDate).toBe('2026-10-19');
    await request(app).put('/api/test/clock').send({ today: null }).expect(204);
    expect(clock.today()).toBe('2026-10-08');
  });

  test('rejects a date that is not yyyy-mm-dd', async () => {
    await setUp(true);
    const response = await request(app).put('/api/test/clock').send({ today: '19/10/2026' }).expect(400);
    expect(response.body.error).toBe('Today must be a date in the format yyyy-mm-dd, or null');
  });
});
