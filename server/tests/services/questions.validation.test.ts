// @ts-nocheck
import request from 'supertest';
import app from '../../src/server';
import * as dataService from '../../src/services/dataService';

describe('Service Tests: Question Routes Validation', () => {
  let createQuestionSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    createQuestionSpy = jest.spyOn(dataService, 'createQuestion');
  });

  afterEach(() => {
    createQuestionSpy.mockRestore();
  });

  it('rejects open questions without answer', async () => {
    const response = await request(app)
      .post('/api/questions')
      .send({
        question: 'Explique TDD',
        topic: 'Testes',
        type: 'open'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Open questions require an answer');
    expect(createQuestionSpy).not.toHaveBeenCalled();
  });

  it('rejects closed questions without options array', async () => {
    const response = await request(app)
      .post('/api/questions')
      .send({
        question: 'Qual opção é correta?',
        topic: 'Metodologias',
        type: 'closed',
        options: 'invalid'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Options must be an array');
    expect(createQuestionSpy).not.toHaveBeenCalled();
  });

  it('rejects closed questions when no option is marked as correct', async () => {
    const response = await request(app)
      .post('/api/questions')
      .send({
        question: 'Qual item descreve XP?',
        topic: 'Processos',
        type: 'closed',
        options: [
          { option: 'Pair Programming', isCorrect: false },
          { option: 'Refactoring', isCorrect: false }
        ]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('At least one option must be marked as correct');
    expect(createQuestionSpy).not.toHaveBeenCalled();
  });
});
