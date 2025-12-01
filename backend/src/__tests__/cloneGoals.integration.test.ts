import request from 'supertest';
import { app } from '../server';
import * as fs from 'fs';
import * as path from 'path';

const testDataFile = path.resolve('./data/app-data.test.json');

describe('Clone goals integration', () => {
  beforeEach(() => {
    // Ensure a clean data file for each test
    if (fs.existsSync(testDataFile)) fs.unlinkSync(testDataFile);
  });

  afterEach(() => {
    if (fs.existsSync(testDataFile)) fs.unlinkSync(testDataFile);
  });

  test('should clone goals from one class to another with new IDs', async () => {
    // Create source and destination classes
    const sourceRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'SourceTopic', semester: 1, year: 2025 })
      .expect(201);

    const destRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'DestTopic', semester: 1, year: 2025 })
      .expect(201);

    const sourceId = sourceRes.body.id; // topic-year-semester
    const destId = destRes.body.id;

    // Add goals to source
    const g1 = await request(app)
      .post(`/api/classes/${sourceId}/goals`)
      .send({ description: 'Goal A', weight: 30 })
      .expect(201);

    const g2 = await request(app)
      .post(`/api/classes/${sourceId}/goals`)
      .send({ description: 'Goal B', weight: 70 })
      .expect(201);

    // Ensure destination has no goals
    const destBefore = await request(app).get(`/api/classes/${destId}/goals`).expect(200);
    expect(Array.isArray(destBefore.body)).toBe(true);
    expect(destBefore.body.length).toBe(0);

    // Clone goals
    const cloneRes = await request(app)
      .post(`/api/classes/${sourceId}/clone-goals/${destId}`)
      .expect(200);

    expect(cloneRes.body.clonedGoalsCount).toBe(2);

    // Verify destination goals
    const destAfter = await request(app).get(`/api/classes/${destId}/goals`).expect(200);
    expect(destAfter.body.length).toBe(2);

    // IDs should differ compared to source
    const srcGoals = await request(app).get(`/api/classes/${sourceId}/goals`).expect(200);

    expect(srcGoals.body.length).toBe(2);

    for (let i = 0; i < srcGoals.body.length; i++) {
      const s = srcGoals.body[i];
      const d = destAfter.body[i];
      expect(s.description).toEqual(d.description);
      expect(s.weight).toEqual(d.weight);
      expect(s.id).not.toEqual(d.id);
      // cloned createdAt preserved
      expect(s.createdAt).toEqual(d.createdAt);
    }
  });

  test('should return 404 when source class does not exist', async () => {
    // ensure dest created
    const destRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'DestTopic2', semester: 1, year: 2025 })
      .expect(201);

    const destId = destRes.body.id;

    await request(app)
      .post(`/api/classes/nonexistent/clone-goals/${destId}`)
      .expect(404);
  });

  test('should return 404 when destination class does not exist', async () => {
    // create source class
    const sourceRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'SourceTopic2', semester: 1, year: 2025 })
      .expect(201);

    const sourceId = sourceRes.body.id;

    await request(app)
      .post(`/api/classes/${sourceId}/clone-goals/nonexistent-dest`)
      .expect(404);
  });

  // CENÁRIO GHERKIN: Clone fails when source has no goals
  test('should return 400 when source class has no goals', async () => {
    // Create turmas origem e destino
    const sourceRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'EmptySource', semester: 1, year: 2025 })
      .expect(201);

    const destRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'EmptyDest', semester: 1, year: 2025 })
      .expect(201);

    const sourceId = sourceRes.body.id;
    const destId = destRes.body.id;

    // NÃO adicionar metas na origem - este é o ponto chave do teste

    // Tentar clonar de turma vazia
    const cloneRes = await request(app)
      .post(`/api/classes/${sourceId}/clone-goals/${destId}`)
      .expect(400);

    expect(cloneRes.body).toHaveProperty('error');
    expect(cloneRes.body).toHaveProperty('code', 'NO_SOURCE_GOALS');
    expect(cloneRes.body.error).toMatch(/no goals/i);

    // Verificar que destino continua vazio
    const destGoals = await request(app)
      .get(`/api/classes/${destId}/goals`)
      .expect(200);

    expect(destGoals.body.length).toBe(0);
  });

  // CENÁRIO GHERKIN: Clone should not overwrite existing destination goals
  test('should return 409 when destination class already has goals', async () => {
    // Criar turmas
    const sourceRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'SourceWithGoals', semester: 1, year: 2025 })
      .expect(201);

    const destRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'DestWithGoals', semester: 1, year: 2025 })
      .expect(201);

    const sourceId = sourceRes.body.id;
    const destId = destRes.body.id;

    // Adicionar metas na origem
    await request(app)
      .post(`/api/classes/${sourceId}/goals`)
      .send({ description: 'Source Goal 1', weight: 50 })
      .expect(201);

    await request(app)
      .post(`/api/classes/${sourceId}/goals`)
      .send({ description: 'Source Goal 2', weight: 50 })
      .expect(201);

    // Adicionar meta no destino (IMPORTANTE - cenário chave)
    await request(app)
      .post(`/api/classes/${destId}/goals`)
      .send({ description: 'Existing Dest Goal', weight: 30 })
      .expect(201);

    // Tentar clonar (deve falhar)
    const cloneRes = await request(app)
      .post(`/api/classes/${sourceId}/clone-goals/${destId}`)
      .expect(409);

    expect(cloneRes.body).toHaveProperty('error');
    expect(cloneRes.body).toHaveProperty('code', 'DEST_HAS_GOALS');
    expect(cloneRes.body.error).toMatch(/already has goals/i);

    // Verificar que metas do destino não foram alteradas
    const destGoals = await request(app)
      .get(`/api/classes/${destId}/goals`)
      .expect(200);

    expect(destGoals.body.length).toBe(1);
    expect(destGoals.body[0].description).toBe('Existing Dest Goal');
  });

  // Teste adicional: Preservar peso total
  test('should preserve total weight when cloning goals', async () => {
    // Criar turmas origem e destino
    const sourceRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'WeightSource', semester: 1, year: 2025 })
      .expect(201);

    const destRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'WeightDest', semester: 1, year: 2025 })
      .expect(201);

    const sourceId = sourceRes.body.id;
    const destId = destRes.body.id;

    // Adicionar metas com peso total = 100
    await request(app)
      .post(`/api/classes/${sourceId}/goals`)
      .send({ description: 'Goal 1', weight: 40 })
      .expect(201);

    await request(app)
      .post(`/api/classes/${sourceId}/goals`)
      .send({ description: 'Goal 2', weight: 60 })
      .expect(201);

    // Clonar
    await request(app)
      .post(`/api/classes/${sourceId}/clone-goals/${destId}`)
      .expect(200);

    // Verificar peso total no destino
    const destGoals = await request(app).get(`/api/classes/${destId}/goals`).expect(200);
    const totalWeight = destGoals.body.reduce((sum: number, g: any) => sum + g.weight, 0);
    expect(totalWeight).toBe(100);
  });
});
