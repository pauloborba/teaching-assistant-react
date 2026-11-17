import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../app';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { InMemoryOnlyRepository } from '../persistence/AppStateRepository';
import { SettableClock } from '../services/Clock';

/**
 * Service tests (not acceptance) of the discrepancy endpoints: status codes,
 * payload validation and the JSON the client relies on.
 */

const carlos = { name: 'Carlos Lima', cpf: '111.111.111-11', email: 'carlos@cin.ufpe.br' };
const beatriz = { name: 'Beatriz Souza', cpf: '222.222.222-22', email: 'beatriz@cin.ufpe.br' };
const maria = { name: 'Maria Alves', cpf: '333.333.333-33', email: 'maria@cin.ufpe.br' };
const CLASS_PATH = '/api/classes/ESS-2026-2';
const DISCREPANCIES_PATH = `${CLASS_PATH}/discrepancies`;
const THRESHOLD_PATH = `${CLASS_PATH}/discrepancy-threshold`;

let app: Express;
let saves: number;

/** A fresh application with ESS (2026/2). */
async function setUp() {
  saves = 0;
  app = createApp({
    students: new StudentSet(),
    classes: new Classes(),
    repository: { load: () => undefined, save: () => { saves++; } },
    clock: new SettableClock({ today: () => '2026-10-08' })
  });
  await request(app).post('/api/classes').send({ topic: 'ESS', semester: 2, year: 2026 }).expect(201);
}

async function enroll(student: typeof carlos, professor: Record<string, string>, self: Record<string, string>) {
  await request(app).post('/api/students').send(student).expect(201);
  await request(app).post(`${CLASS_PATH}/enroll`).send({ studentCPF: student.cpf }).expect(201);
  for (const [goal, grade] of Object.entries(professor)) {
    await request(app).put(`${CLASS_PATH}/enrollments/${student.cpf}/evaluation`).send({ goal, grade }).expect(200);
  }
  if (Object.keys(self).length > 0) {
    await request(app).put(`${CLASS_PATH}/enrollments/${student.cpf}/self-assessment`).send({ grades: self }).expect(200);
  }
}

describe('GET /api/classes/:classId/discrepancies', () => {
  beforeEach(setUp);

  test('returns the discrepancies, the students that could not be computed and the percentage', async () => {
    await request(app).put(THRESHOLD_PATH).send({ threshold: 1 }).expect(200);
    await enroll(beatriz, { Requirements: 'MA', Tests: 'MPA' }, { Requirements: 'MA', Tests: 'MPA' });
    await enroll(carlos, { Requirements: 'MANA', Tests: 'MANA' }, { Requirements: 'MA', Tests: 'MA' });
    await enroll(maria, {}, { Requirements: 'MA' });

    const response = await request(app).get(DISCREPANCIES_PATH).expect(200);
    expect(response.body).toEqual({
      discrepancyThreshold: 1,
      students: [
        { student: carlos, discrepancy: 4, discrepant: true },
        { student: beatriz, discrepancy: 0, discrepant: false }
      ],
      uncomputable: [{ student: maria, missing: 'professor grades' }],
      discrepantCount: 1,
      computableCount: 2,
      discrepantPercentage: 50
    });
  });

  test('uses the default threshold of 2 until it is changed', async () => {
    await enroll(carlos, { Requirements: 'MANA', Tests: 'MPA' }, { Requirements: 'MPA', Tests: 'MA' });
    const response = await request(app).get(DISCREPANCIES_PATH).expect(200);
    expect(response.body.discrepancyThreshold).toBe(2);
    expect(response.body.students).toEqual([{ student: carlos, discrepancy: 2, discrepant: false }]);
  });

  test('does not change the grades nor ask for the state to be saved', async () => {
    await enroll(carlos, { Requirements: 'MANA' }, { Requirements: 'MA' });
    await new Promise(resolve => setImmediate(resolve));
    const before = (await request(app).get('/api/classes').expect(200)).body;
    const savesBefore = saves;
    await request(app).get(DISCREPANCIES_PATH).expect(200);
    await new Promise(resolve => setImmediate(resolve));
    expect((await request(app).get('/api/classes').expect(200)).body).toEqual(before);
    expect(saves).toBe(savesBefore);
  });

  test('reports an unknown class as not found', async () => {
    const response = await request(app).get('/api/classes/ESS-2030-1/discrepancies').expect(404);
    expect(response.body).toEqual({ error: 'Class not found' });
  });
});

describe('PUT /api/classes/:classId/discrepancy-threshold', () => {
  beforeEach(setUp);

  test('changes the threshold, which the class then shows and the discrepancies use', async () => {
    await enroll(carlos, { Requirements: 'MPA', Tests: 'MPA' }, { Requirements: 'MA', Tests: 'MA' });
    expect((await request(app).get(DISCREPANCIES_PATH)).body.discrepantCount).toBe(0);

    const response = await request(app).put(THRESHOLD_PATH).send({ threshold: 1 }).expect(200);
    expect(response.body).toEqual({ discrepancyThreshold: 1 });
    expect((await request(app).get('/api/classes')).body[0].discrepancyThreshold).toBe(1);
    expect((await request(app).get(DISCREPANCIES_PATH)).body.discrepantCount).toBe(1);
  });

  test('accepts the two ends of the range, 0 and 2', async () => {
    await request(app).put(THRESHOLD_PATH).send({ threshold: 0 }).expect(200);
    expect((await request(app).get('/api/classes')).body[0].discrepancyThreshold).toBe(0);
    await request(app).put(THRESHOLD_PATH).send({ threshold: 2 }).expect(200);
    expect((await request(app).get('/api/classes')).body[0].discrepancyThreshold).toBe(2);
  });

  test('asks for the state to be saved only when the threshold changes', async () => {
    const savesBefore = saves;
    await request(app).put(THRESHOLD_PATH).send({ threshold: -1 }).expect(400);
    await new Promise(resolve => setImmediate(resolve));
    expect(saves).toBe(savesBefore);
    await request(app).put(THRESHOLD_PATH).send({ threshold: 1 }).expect(200);
    await new Promise(resolve => setImmediate(resolve));
    expect(saves).toBe(savesBefore + 1);
  });

  test('rejects a threshold that is not a non-negative integer, keeping the one the class has', async () => {
    await request(app).put(THRESHOLD_PATH).send({ threshold: 1 }).expect(200);
    for (const body of [{ threshold: -1 }, { threshold: 1.5 }, { threshold: '2' }, { threshold: null }, {}]) {
      const response = await request(app).put(THRESHOLD_PATH).send(body).expect(400);
      expect(response.body).toEqual({ error: 'The threshold must be a non-negative integer' });
    }
    expect((await request(app).get('/api/classes')).body[0].discrepancyThreshold).toBe(1);
  });

  test('rejects a threshold above 2, keeping the one the class has, and saves nothing', async () => {
    await request(app).put(THRESHOLD_PATH).send({ threshold: 1 }).expect(200);
    await new Promise(resolve => setImmediate(resolve));
    const savesBefore = saves;
    for (const threshold of [3, 12, 100]) {
      const response = await request(app).put(THRESHOLD_PATH).send({ threshold }).expect(400);
      expect(response.body).toEqual({ error: 'The threshold must be at most 2' });
    }
    await new Promise(resolve => setImmediate(resolve));
    expect(saves).toBe(savesBefore);
    expect((await request(app).get('/api/classes')).body[0].discrepancyThreshold).toBe(1);
  });

  test('reports an unknown class as not found', async () => {
    const response = await request(app).put('/api/classes/ESS-2030-1/discrepancy-threshold').send({ threshold: 1 }).expect(404);
    expect(response.body).toEqual({ error: 'Class not found' });
  });
});
