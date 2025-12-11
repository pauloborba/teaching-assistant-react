// @ts-nocheck
import request from 'supertest';
import app from '../../src/server';
import * as dataService from '../../src/services/dataService';

jest.mock('../../src/services/dataService');

describe('Service Tests: Responses Routes (submission)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Provide a real-like implementation for cleanCPF used by the route
    (dataService.cleanCPF as jest.Mock).mockImplementation((cpf: string) => String(cpf).replace(/[.-]/g, ''));
  });

  it('returns 401 when no Authorization header is present', async () => {
    const res = await request(app)
      .post('/api/exams/1/responses')
      .send({ studentCpf: '123.456.789-00', answers: [{ questionId: 1, answer: 'x' }] });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('returns 403 when token belongs to a professor', async () => {
    const res = await request(app)
      .post('/api/exams/1/responses')
      .set('Authorization', 'Bearer professor-token')
      .send({ studentCpf: '123.456.789-00', answers: [{ questionId: 1, answer: 'x' }] });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });

  it('returns 404 when exam is not found', async () => {
    (dataService.examsManager.getExamById as jest.Mock).mockReturnValue(undefined);
    (dataService.examsManager.getAllExams as jest.Mock).mockReturnValue([]);

    const res = await request(app)
      .post('/api/exams/999/responses')
      .set('Authorization', 'Bearer student-token')
      .send({ studentCpf: '123.456.789-00', answers: [{ questionId: 1, answer: 'x' }] });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Exam not found' });
  });

  it('returns 410 when exam is expired (isValid === false)', async () => {
    (dataService.examsManager.getExamById as jest.Mock).mockReturnValue({ id: 5, isValid: false });

    const res = await request(app)
      .post('/api/exams/5/responses')
      .set('Authorization', 'Bearer student-token')
      .send({ studentCpf: '123.456.789-00', answers: [{ questionId: 1, answer: 'x' }] });

    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: 'Exam submission period has ended.' });
  });

  it('returns 400 when payload is invalid (missing fields)', async () => {
    (dataService.examsManager.getExamById as jest.Mock).mockReturnValue({ id: 6, isValid: true });

    const res = await request(app)
      .post('/api/exams/6/responses')
      .set('Authorization', 'Bearer student-token')
      .send({ answers: [{ questionId: 1, answer: 'x' }] }); // missing studentCpf

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid request payload' });
  });

  it('returns 400 when any answer is empty', async () => {
    (dataService.examsManager.getExamById as jest.Mock).mockReturnValue({ id: 7, isValid: true });

    const res = await request(app)
      .post('/api/exams/7/responses')
      .set('Authorization', 'Bearer student-token')
      .send({ studentCpf: '123.456.789-00', answers: [{ questionId: 1, answer: '' }] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Please answer all questions before submitting.' });
  });

  it('submits a response successfully and calls data service helpers', async () => {
    (dataService.examsManager.getExamById as jest.Mock).mockReturnValue({ id: 8, isValid: true });
    (dataService.examsManager.getAllStudentExams as jest.Mock).mockReturnValue([]);
    const addSpy = (dataService.addStudentExam as jest.Mock).mockImplementation(() => {});
    const triggerSpy = (dataService.triggerSaveStudentsExams as jest.Mock).mockImplementation(() => {});

    const payload = { studentCpf: '123.456.789-00', answers: [{ questionId: 1, answer: 'Resposta' }] };

    const res = await request(app)
      .post('/api/exams/8/responses')
      .set('Authorization', 'Bearer student-token')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Response submitted successfully');
    expect(res.body).toHaveProperty('data');
    expect(addSpy).toHaveBeenCalled();
    expect(triggerSpy).toHaveBeenCalled();
    // studentCPF should be cleaned (dots/dashes removed)
    expect(res.body.data.studentCPF).toBe('12345678900');
    expect(res.body.data.examId).toBe(8);
  });

  it('returns 409 when student already submitted (data service throws)', async () => {
    (dataService.examsManager.getExamById as jest.Mock).mockReturnValue({ id: 9, isValid: true });
    (dataService.addStudentExam as jest.Mock).mockImplementation(() => { throw new Error('StudentAlreadySubmitted'); });

    const res = await request(app)
      .post('/api/exams/9/responses')
      .set('Authorization', 'Bearer student-token')
      .send({ studentCpf: '123.456.789-00', answers: [{ questionId: 1, answer: 'ok' }] });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: 'Você já respondeu essa prova' });
  });
});
