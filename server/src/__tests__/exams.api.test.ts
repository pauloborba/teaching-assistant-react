
import request from 'supertest';
import { Express } from 'express';
import { newTestApp } from './support/newTestApp';

describe('API de provas', () => {
  let app: Express;

  const validQuestion = {
    subject: 'Requisitos',
    statement: 'O que é um requisito funcional?',
    alternatives: [
      { text: 'Descreve uma função do sistema', isTrue: true },
      { text: 'Descreve apenas desempenho', isTrue: false }
    ]
  };

  // Cada teste recebe uma aplicação com coleções vazias.
  beforeEach(() => {
    app = newTestApp();
  });

  // Função auxiliar para cadastrar uma questão pela API.
  const createQuestion = async (): Promise<string> => {
    const response = await request(app)
      .post('/api/questions')
      .send(validQuestion)
      .expect(201);

    return response.body.code;
  };

  test('GET retorna uma lista vazia inicialmente', async () => {
    const response = await request(app)
      .get('/api/exams')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  test('POST cadastra uma prova válida', async () => {
    const questionCode = await createQuestion();

    const examData = {
      name: 'Prova de Requisitos',
      questionCodes: [questionCode]
    };

    const response = await request(app)
      .post('/api/exams')
      .send(examData)
      .expect(201);

    expect(response.body).toMatchObject(examData);

    expect(response.body.code).toEqual(
      expect.any(String)
    );

    const list = await request(app)
      .get('/api/exams')
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Prova de Requisitos');
  });

  test('GET recupera uma prova com suas questões', async () => {
    const questionCode = await createQuestion();

    const created = await request(app)
      .post('/api/exams')
      .send({
        name: 'Prova de Requisitos',
        questionCodes: [questionCode]
      })
      .expect(201);

    const response = await request(app)
      .get(`/api/exams/${created.body.code}`)
      .expect(200);

    expect(response.body.name).toBe('Prova de Requisitos');

    expect(response.body.questionCodes).toEqual([
      questionCode
    ]);

    expect(response.body.questions).toHaveLength(1);

    expect(response.body.questions[0]).toMatchObject(
      validQuestion
    );

    expect(response.body.subjects).toEqual([
      'Requisitos'
    ]);
  });

  test('rejeita uma prova sem questões', async () => {
    const response = await request(app)
      .post('/api/exams')
      .send({
        name: 'Prova vazia',
        questionCodes: []
      })
      .expect(400);

    expect(response.body.error).toBe(
      'Não é possível criar uma prova sem questões'
    );
  });

  test('rejeita uma prova sem nome', async () => {
    const questionCode = await createQuestion();

    const response = await request(app)
      .post('/api/exams')
      .send({
        name: '',
        questionCodes: [questionCode]
      })
      .expect(400);

    expect(response.body.error).toBe(
      'É preciso definir o nome da prova'
    );
  });

  test('rejeita uma prova com nome repetido', async () => {
    const questionCode = await createQuestion();

    const examData = {
      name: 'Prova de Requisitos',
      questionCodes: [questionCode]
    };

    await request(app)
      .post('/api/exams')
      .send(examData)
      .expect(201);

    const response = await request(app)
      .post('/api/exams')
      .send(examData)
      .expect(400);

    expect(response.body.error).toBe(
      'Já existe uma prova com esse nome'
    );

    const list = await request(app)
      .get('/api/exams')
      .expect(200);

    expect(list.body).toHaveLength(1);
  });

  test('rejeita questões repetidas na mesma prova', async () => {
    const questionCode = await createQuestion();

    const response = await request(app)
      .post('/api/exams')
      .send({
        name: 'Prova de Requisitos',
        questionCodes: [questionCode, questionCode]
      })
      .expect(400);

    expect(response.body.error).toBe(
      'Uma questão não pode aparecer duas vezes na mesma prova'
    );
  });

  test('rejeita uma questão inexistente', async () => {
    const response = await request(app)
      .post('/api/exams')
      .send({
        name: 'Prova de Requisitos',
        questionCodes: ['q-inexistente']
      })
      .expect(400);

    expect(response.body.error).toBe(
      'Questão q-inexistente não encontrada'
    );
  });

  test('retorna 404 para prova inexistente', async () => {
    const response = await request(app)
      .get('/api/exams/prova-inexistente')
      .expect(404);

    expect(response.body.error).toBe(
      'Prova não encontrada'
    );
  });
});
