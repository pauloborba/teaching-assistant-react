import request from 'supertest';
import { Express } from 'express';
import { newTestApp } from './support/newTestApp';

// Exercita o backend real com Supertest, sem mocks de HTTP
// e sem utilizar os JSONs permanentes da aplicação.
const question = {
  subject: 'Gerência de configuração',
  statement: 'Quais comandos podem dar conflito textual?',
  alternatives: [
    { text: 'merge', isTrue: true },
    { text: 'stash', isTrue: true },
    { text: 'pull', isTrue: true },
    { text: 'log', isTrue: false }
  ]
};

describe('Contrato de questões e provas', () => {
  let app: Express;

  beforeEach(() => {
    app = newTestApp();
  });

  const listQuestions = async () => {
    const response = await request(app).get('/api/questions').expect(200);
    return response.body;
  };

  const listExams = async () => {
    const response = await request(app).get('/api/exams').expect(200);
    return response.body;
  };

  test('rejeita questão duplicada mesmo com alternativas em outra ordem', async () => {
    const original = await request(app).post('/api/questions')
      .send(question).expect(201);

    await request(app).post('/api/questions').send({
      ...question,
      alternatives: [...question.alternatives].reverse()
    }).expect(400);

    expect(await listQuestions()).toEqual([original.body]);
  });

  test('aceita mesmo enunciado com alternativas diferentes', async () => {
    const original = await request(app).post('/api/questions')
      .send(question).expect(201);
    const created = await request(app).post('/api/questions').send({
      ...question,
      alternatives: question.alternatives.slice(1)
    }).expect(201);

    expect(created.body.code).not.toBe(original.body.code);
    expect(created.body.alternatives).toEqual(question.alternatives.slice(1));
    expect(await listQuestions()).toHaveLength(2);
    expect(await listQuestions()).toEqual(expect.arrayContaining([
      original.body, created.body
    ]));
  });

  test('cadastra nova questão sem alterar as anteriores', async () => {
    const original = await request(app).post('/api/questions')
      .send(question).expect(201);
    const another = {
      ...question,
      statement: 'Quais comandos não podem dar conflito textual?',
      alternatives: [
        { text: 'log', isTrue: true },
        { text: 'init', isTrue: true },
        { text: 'config', isTrue: true }
      ]
    };
    const created = await request(app).post('/api/questions')
      .send(another).expect(201);

    expect(created.body).toMatchObject(another);
    expect(created.body.code).not.toBe(original.body.code);
    const list = await listQuestions();
    expect(list).toHaveLength(2);
    expect(list).toEqual(expect.arrayContaining([original.body, created.body]));
  });

  const invalidCases: Array<{ label: string; patch: Record<string, unknown>; message: string }> = [
    { label: 'assunto vazio', patch: { subject: '  ' }, message: 'É preciso definir o assunto da questão' },
    { label: 'enunciado vazio', patch: { statement: '  ' }, message: 'É preciso definir o enunciado da questão' },
    { label: 'sem alternativas', patch: { alternatives: [] }, message: 'É preciso adicionar alternativas para a questão' },
    { label: 'classificação não booleana', patch: { alternatives: [{ text: 'merge', isTrue: 'true' }] }, message: 'Alternativa inválida' },
    { label: 'alternativa vazia', patch: { alternatives: [{ text: '  ', isTrue: true }] }, message: 'Alternativa inválida' }
  ];

  test.each(invalidCases)('rejeita $label sem modificar questões existentes', async ({ patch, message }) => {
    const original = await request(app).post('/api/questions')
      .send(question).expect(201);

    const response = await request(app).post('/api/questions')
      .send({ ...question, ...patch }).expect(400);

    expect(response.body.error).toBe(message);
    expect(await listQuestions()).toEqual([original.body]);
  });

  test('consulta prova completa com questões na ordem escolhida e assuntos únicos', async () => {
    const a = await request(app).post('/api/questions').send(question).expect(201);
    const b = await request(app).post('/api/questions').send({
      ...question, statement: 'O que faz git log?'
    }).expect(201);
    const c = await request(app).post('/api/questions').send({
      ...question, subject: 'Requisitos', statement: 'O que é um requisito funcional?'
    }).expect(201);

    const codes = [c.body.code, b.body.code, a.body.code];
    const exam = await request(app).post('/api/exams').send({
      name: 'Prova mista', questionCodes: codes
    }).expect(201);
    const detail = await request(app).get(`/api/exams/${exam.body.code}`).expect(200);

    expect(detail.body).toEqual({
      ...exam.body,
      questionCodes: codes,
      questions: [c.body, b.body, a.body],
      subjects: ['Requisitos', 'Gerência de configuração']
    });
  });

  test('preserva a prova original após tentativa de reutilizar seu nome com outras questões', async () => {
    const a = await request(app).post('/api/questions').send(question).expect(201);
    const b = await request(app).post('/api/questions').send({
      ...question, statement: 'O que faz git log?'
    }).expect(201);
    const original = await request(app).post('/api/exams').send({
      name: 'Prova de Git', questionCodes: [a.body.code]
    }).expect(201);

    await request(app).post('/api/exams').send({
      name: 'Prova de Git', questionCodes: [b.body.code]
    }).expect(400);

    expect(await listExams()).toEqual([original.body]);
    const detail = await request(app).get(`/api/exams/${original.body.code}`).expect(200);
    expect(detail.body.questions).toEqual([a.body]);
  });

  test('permite reutilizar uma questão em provas distintas e conserva ambas', async () => {
    const q = await request(app).post('/api/questions').send(question).expect(201);
    const a = await request(app).post('/api/exams').send({
      name: 'Prova A', questionCodes: [q.body.code]
    }).expect(201);
    const b = await request(app).post('/api/exams').send({
      name: 'Prova B', questionCodes: [q.body.code]
    }).expect(201);

    expect(a.body.code).not.toBe(b.body.code);
    const list = await listExams();
    expect(list).toHaveLength(2);
    expect(list).toEqual(expect.arrayContaining([a.body, b.body]));
  });
});
