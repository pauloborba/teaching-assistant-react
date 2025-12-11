import request from 'supertest';
import { app, scripts } from '../server';

describe('Server API - Scripts (create/edit)', () => {
  beforeEach(() => {
    // reset in-memory scripts between tests
    scripts.getAllScripts().length = 0;
  });

  test('POST /api/scripts creates a script with tasks', async () => {
    const payload = {
      title: 'Script A',
      description: 'Desc A',
      tasks: [
        { id: 't1', statement: 'Task 1' },
        { id: 't2', statement: 'Task 2' }
      ]
    };

    const res = await request(app).post('/api/scripts/').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Script A');
    expect(res.body.description).toBe('Desc A');
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks[0]).toEqual({ id: 't1', statement: 'Task 1' });
    expect(res.body.tasks[1]).toEqual({ id: 't2', statement: 'Task 2' });
  });

  test('POST /api/scripts rejects missing or empty tasks', async () => {
    const resMissing = await request(app).post('/api/scripts/').send({
      title: 'No Tasks',
      description: 'Desc',
      tasks: []
    });
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error).toBe('Script must have at least one task');

    const resUndefined = await request(app).post('/api/scripts/').send({
      title: 'No Tasks 2',
      description: 'Desc'
    });
    expect(resUndefined.status).toBe(400);
    expect(resUndefined.body.error).toBe('Script must have at least one task');
  });

  test('POST /api/scripts rejects duplicate title', async () => {
    const payload = {
      title: 'Duplicate',
      description: 'First',
      tasks: [{ id: 't1', statement: 'Task 1' }]
    };

    const first = await request(app).post('/api/scripts/').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/scripts/').send({
      title: 'Duplicate',
      description: 'Second',
      tasks: [{ id: 't2', statement: 'Task 2' }]
    });

    expect(second.status).toBe(400);
    expect(second.body.error).toBe('Script with this title already exists');
  });

  test('PUT /api/scripts/:id updates title, description and tasks', async () => {
    const createRes = await request(app).post('/api/scripts/').send({
      title: 'Initial',
      description: 'Old',
      tasks: [{ id: 't1', statement: 'Old Task' }]
    });

    const id = createRes.body.id;
    expect(id).toBeDefined();

    const updateRes = await request(app).put(`/api/scripts/${id}`).send({
      title: 'Updated',
      description: 'New Desc',
      tasks: [{ id: 't2', statement: 'New Task' }]
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Updated');
    expect(updateRes.body.description).toBe('New Desc');
    expect(updateRes.body.tasks).toHaveLength(1);
    expect(updateRes.body.tasks[0]).toEqual({ id: 't2', statement: 'New Task' });
  });

  test('PUT /api/scripts/:id returns 404 when script not found', async () => {
    const res = await request(app).put('/api/scripts/non-existent').send({
      title: 'X'
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Script not found');
  });
});
