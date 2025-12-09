import request from 'supertest';
import app from '../../src/server';
import { questionsManager, triggerSaveQuestions } from '../../src/services/dataService';
import * as dataService from '../../src/services/dataService';

describe('Integration: Question Routes', () => {
  const originalSnapshot = questionsManager.getAllQuestions();
  let saveSpy: jest.SpyInstance;

  beforeEach(() => {
    questionsManager.replaceAll([]);
    saveSpy = jest.spyOn(dataService, 'triggerSaveQuestions').mockImplementation(() => {});
  });

  afterEach(() => {
    saveSpy.mockRestore();
  });

  afterAll(() => {
    questionsManager.replaceAll(originalSnapshot);
  });

  it('creates an open question and exposes it via GET /api/questions', async () => {
    const payload = {
      question: ' Explique TDD em poucas palavras ',
      topic: 'Práticas Ágeis',
      type: 'open' as const,
      answer: ' Red, Green, Refactor '
    };

    const createResponse = await request(app).post('/api/questions').send(payload);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.question).toBe('Explique TDD em poucas palavras');
    expect(createResponse.body.answer).toBe('Red, Green, Refactor');

    const listResponse = await request(app).get('/api/questions');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(1);
    expect(listResponse.body.data[0].question).toBe('Explique TDD em poucas palavras');
    expect(listResponse.body.data[0].answer).toBe('Red, Green, Refactor');
  });

  it('filters questions by topic when topic query param is provided', async () => {
    await request(app).post('/api/questions').send({
      question: 'O que é refatoração?',
      topic: 'Engenharia de Software',
      type: 'open',
      answer: 'Melhorar código sem mudar comportamento'
    });

    await request(app).post('/api/questions').send({
      question: 'Defina mocks em testes',
      topic: 'Testes',
      type: 'open',
      answer: 'Objetos falsos para isolar dependências'
    });

    const filtered = await request(app)
      .get('/api/questions')
      .query({ topic: 'Testes' });

    expect(filtered.status).toBe(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.data[0].topic).toBe('Testes');
    expect(filtered.body.data[0].question).toContain('mocks');
  });
});
