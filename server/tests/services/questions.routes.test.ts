// @ts-nocheck
import request from 'supertest';
import app from '../../src/server';
import * as dataService from '../../src/services/dataService';

describe('Service Tests: Question Routes', () => {
  const mockedCreateQuestion = dataService.createQuestion as jest.MockedFunction<typeof dataService.createQuestion>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an open question when payload is valid', async () => {
    const createdQuestion = {
      id: 101,
      question: 'O que é TDD?',
      topic: 'Engenharia de Software',
      type: 'open' as const,
      answer: 'Test-Driven Development'
    };

    mockedCreateQuestion.mockReturnValue(createdQuestion);

    const response = await request(app)
      .post('/api/questions')
      .send({
        question: 'O que é TDD?',
        topic: 'Engenharia de Software',
        type: 'open',
        answer: 'Test-Driven Development'
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(createdQuestion);
    expect(mockedCreateQuestion).toHaveBeenCalledWith({
      question: 'O que é TDD?',
      topic: 'Engenharia de Software',
      type: 'open',
      answer: 'Test-Driven Development'
    });
  });

  it('should validate required fields before touching the data service', async () => {
    const response = await request(app)
      .post('/api/questions')
      .send({
        question: 'Questão sem tópico',
        type: 'open',
        answer: 'N/A'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Topic is required' });
    expect(mockedCreateQuestion).not.toHaveBeenCalled();
  });

  it('should normalize closed question options and forward to the data service', async () => {
    const closedPayload = {
      question: 'Quais são as etapas do TDD?',
      topic: 'Metodologias',
      type: 'closed' as const,
      options: [
        { option: 'Red, Green, Refactor', isCorrect: true },
        { option: 'Codar sem testes', isCorrect: false }
      ]
    };

    mockedCreateQuestion.mockReturnValue({ id: 202, ...closedPayload });

    const response = await request(app)
      .post('/api/questions')
      .send({
        question: closedPayload.question,
        topic: closedPayload.topic,
        type: 'closed',
        options: [
          { option: 'Red, Green, Refactor', isCorrect: true },
          { option: 'Codar sem testes', isCorrect: false }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 202, ...closedPayload });
    expect(mockedCreateQuestion).toHaveBeenCalledWith(closedPayload);
  });
});
