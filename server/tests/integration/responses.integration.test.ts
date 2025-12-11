import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { examsManager, responses } from '../../src/services/dataService';
import * as dataService from '../../src/services/dataService';

describe('Integration: Responses submission flow', () => {
  const app = createTestApp();

  const reset = () => {
    examsManager.replaceAll([]);
    responses.length = 0;
    jest.clearAllMocks();
  };

  beforeEach(() => {
    reset();
    // Avoid file persistence side-effects (no-op)
    jest.spyOn(dataService, 'triggerSaveStudentsExams').mockImplementation(() => {});
    jest.spyOn(dataService, 'triggerSaveResponses').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a valid submission and stores it', async () => {
    examsManager.addExam({
      id: 1000,
      classId: 'cls-1',
      title: 'Integração Test',
      isValid: true,
      openQuestions: 0,
      closedQuestions: 0,
      questions: [],
    });

    const payload = {
      studentCpf: '123.456.789-00',
      answers: [{ questionId: 1, answer: 'Alguma resposta' }],
    };

    const res = await request(app)
      .post('/api/exams/1000/responses')
      .set('Authorization', 'Bearer student-token')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Response submitted successfully');
    expect(res.body).toHaveProperty('data');
    // studentCPF should be cleaned
    expect(res.body.data.studentCPF).toBe('12345678900');
    expect(res.body.data.examId).toBe(1000);

    // persisted in exams manager and responses array
    const allStudentExams = examsManager.getAllStudentExams();
    expect(allStudentExams).toHaveLength(1);
    expect(allStudentExams[0].studentCPF).toBe('12345678900');

    expect(responses).toHaveLength(1);
    expect(responses[0].studentCPF).toBe('12345678900');
  });

  it('returns 409 when the same student submits twice', async () => {
    examsManager.addExam({ id: 2000, classId: 'c', title: 'DupTest', isValid: true, openQuestions: 0, closedQuestions: 0, questions: [] });

    const payload = { studentCpf: '111.222.333-44', answers: [{ questionId: 1, answer: 'ok' }] };

    const first = await request(app).post('/api/exams/2000/responses').set('Authorization', 'Bearer student-token').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/exams/2000/responses').set('Authorization', 'Bearer student-token').send(payload);
    expect(second.status).toBe(409);
    expect(second.body).toEqual({ message: 'Você já respondeu essa prova' });
  });

  it('returns 400 for incomplete answers', async () => {
    examsManager.addExam({ id: 3000, classId: 'c', title: 'IncompleteTest', isValid: true, openQuestions: 0, closedQuestions: 0, questions: [] });

    const payload = { studentCpf: '000.000.000-00', answers: [{ questionId: 1, answer: '' }] };

    const res = await request(app).post('/api/exams/3000/responses').set('Authorization', 'Bearer student-token').send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Please answer all questions before submitting.' });
  });

  it('returns 410 when exam is closed (isValid === false)', async () => {
    examsManager.addExam({ id: 4000, classId: 'c', title: 'Closed', isValid: false, openQuestions: 0, closedQuestions: 0, questions: [] });

    const payload = { studentCpf: '999.999.999-99', answers: [{ questionId: 1, answer: 'x' }] };

    const res = await request(app).post('/api/exams/4000/responses').set('Authorization', 'Bearer student-token').send(payload);
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: 'Exam submission period has ended.' });
  });
});
