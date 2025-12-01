import request from 'supertest';
import { app, resetServerState } from '../server';
import * as fs from 'fs';
import * as path from 'path';

const testDataFile = path.resolve('./data/app-data.test.json');

describe('Simple Test', () => {
  beforeEach(() => {
    if (fs.existsSync(testDataFile)) fs.unlinkSync(testDataFile);
    resetServerState();
  });

  afterAll(() => {
    if (fs.existsSync(testDataFile)) fs.unlinkSync(testDataFile);
  });

  test('enroll student', async () => {
    const s = await request(app)
      .post('/api/students')
      .send({ name: 'Test', cpf: '99999999999', email: 'test@test.com' })
      .expect(201);

    const c = await request(app)
      .post('/api/classes')
      .send({ topic: 'Test', semester: 1, year: 2025 })
      .expect(201);

    await request(app)
      .post(`/api/classes/${c.body.id}/enroll`)
      .send({ studentCPF: s.body.cpf })
      .expect(201);
  });
});
