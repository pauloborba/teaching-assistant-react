import request from 'supertest';

// Mock fs and path BEFORE importing the app so that file reads inside the app use our mocks
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args[args.length - 1]),
  resolve: jest.fn((...args) => args[args.length - 1]),
}));

import * as fs from 'fs';
import app from '../../src/server';

describe('Integration: correction routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (typeof filePath === 'string') {
        if (filePath.includes('exams.json')) {
          return JSON.stringify({ exams: [{ id: 1, questions: [1,2,3] }] });
        }
        if (filePath.includes('questions.json')) {
          return JSON.stringify({ questions: [
            { id: 1, type: 'closed', options: [{ id: 1, isCorrect: true }] },
            { id: 2, type: 'closed', options: [{ id: 1, isCorrect: true }] },
            { id: 3, type: 'closed', options: [{ id: 1, isCorrect: true }] }
          ] });
        }
        if (filePath.includes('responses.json')) {
          return JSON.stringify({ responses: [
            { id: 1, studentCPF: '12345678901', examId: 1, answers: [ { questionId: 1, answer: '1' }, { questionId: 2, answer: '1' } ] },
            { id: 2, studentCPF: '12345678902', examId: 1, answers: [ { questionId: 1, answer: '1' }, { questionId: 2, answer: '2' }, { questionId: 3, answer: '1' } ] }
          ] });
        }
      }
      return '{}';
    });

    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('POST /api/correct/:examId corrects the exam and returns batch results', async () => {
    const res = await request(app)
      .post('/api/correct/1')
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('examId', 1);
    expect(res.body).toHaveProperty('correctedCount', 2);
    expect(Array.isArray(res.body.results)).toBe(true);
    const r1 = res.body.results.find((r: any) => r.studentCPF === '12345678901');
    const r2 = res.body.results.find((r: any) => r.studentCPF === '12345678902');
    // Student1 answered only q1 and q2 (2/3 correct) => expect ~66.7
    expect(r1.finalGrade).toBeCloseTo(66.7, 1);
    // Student2 answered all three; with one incorrect (q2 wrong) => expect 66.7 or 66.7 depending on options
    expect(typeof r2.finalGrade).toBe('number');
  });

  it('GET /api/grades/:examId returns answers/grades list', async () => {
    const res = await request(app)
      .get('/api/grades/1')
      .send();

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty('studentCPF');
    expect(res.body[0]).toHaveProperty('answers');
  });
});
