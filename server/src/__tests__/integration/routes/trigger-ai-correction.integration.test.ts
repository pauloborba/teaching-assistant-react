import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../../helpers/test-app';
import { examSet, studentExamSet, questionSet } from '../../../services/dataService';
import { Exam } from '../../../models/Exam';
import { StudentExam } from '../../../models/StudentExam';
import { Question } from '../../../models/Question';
import { QuestionOption } from '../../../models/QuestionOption';
import { StudentAnswer } from '../../../models/StudentAnswer';
import { AIModel } from '../../../types/AIModel';
import * as qstashServiceModule from '../../../services/qstashService';

// Mock do QStash Service
jest.mock('../../../services/qstashService', () => ({
  qstashService: {
    isConfigured: jest.fn(),
    publishBatch: jest.fn(),
  },
}));

describe('POST /api/trigger-ai-correction - Teste de Integração', () => {
  let app: Express;
  const mockedQStashService = qstashServiceModule.qstashService as jest.Mocked<typeof qstashServiceModule.qstashService>;
  const classId = 'Engenharia de Software e Sistemas-2025-1';
  const model = AIModel.GEMINI_2_5_FLASH;

  beforeEach(() => {
    app = createTestApp();
    
    // Limpa dados de teste
    examSet.getAllExams().forEach(exam => examSet.removeExam(exam.getId()));
    studentExamSet.getAllStudentExams().forEach(se => studentExamSet.removeStudentExam(se.getId()));
    questionSet.getAllQuestions().forEach(q => questionSet.removeQuestion(q.getId()));

    // Configura mock do QStash
    mockedQStashService.isConfigured.mockReturnValue(true);
    mockedQStashService.publishBatch.mockImplementation(async (messages) => {
      // Retorna um ID para cada mensagem enviada
      return messages.map((_, index) => `msg-id-${index + 1}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('quando todos os componentes estão integrados corretamente', () => {
    it('deve buscar exames, studentExams e questões e enviar para QStash', async () => {
      // Arrange: Cria dados de teste integrando múltiplos componentes
      // 1. Cria questões abertas
      const question1 = new Question(
        1,
        'Explique o conceito de arquitetura de software',
        'Arquitetura',
        'open',
        undefined,
        'Arquitetura de software é a estrutura fundamental de um sistema...'
      );
      const question2 = new Question(
        2,
        'Descreva os princípios SOLID',
        'Princípios',
        'open',
        undefined,
        'SOLID são cinco princípios de design orientado a objetos...'
      );
      questionSet.addQuestion(question1);
      questionSet.addQuestion(question2);

      // 2. Cria exame para a classe
      const exam = new Exam(
        1,
        classId,
        'Prova de Arquitetura de Software',
        true,
        2, // openQuestions
        0, // closedQuestions
        [1, 2] // question IDs
      );
      examSet.addExam(exam);

      // 3. Cria StudentExam com respostas dos alunos
      const studentAnswers1 = [
        new StudentAnswer(1, 'Arquitetura de software define a estrutura e organização de um sistema', 0),
        new StudentAnswer(2, 'SOLID são princípios que ajudam no design de código', 0),
      ];
      const studentExam = new StudentExam(1, '12345678900', 1, studentAnswers1);
      studentExamSet.addStudentExam(studentExam);

      // Act: Faz requisição ao endpoint
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        })
        .set('Content-Type', 'application/json');

      // Assert: Verifica integração entre componentes
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Correção iniciada com sucesso');
      expect(response.body.totalStudentExams).toBe(1);
      expect(response.body.totalOpenQuestions).toBe(2);
      expect(response.body.queuedMessages).toBe(2);

      // Verifica que QStash foi chamado com dados corretos
      expect(mockedQStashService.publishBatch).toHaveBeenCalledTimes(1);
      const messagesSent = mockedQStashService.publishBatch.mock.calls[0][0];
      
      expect(messagesSent).toHaveLength(2);
      expect(messagesSent[0]).toMatchObject({
        studentExamId: 1,
        questionId: 1,
        questionText: 'Explique o conceito de arquitetura de software',
        studentAnswer: 'Arquitetura de software define a estrutura e organização de um sistema',
        correctAnswer: 'Arquitetura de software é a estrutura fundamental de um sistema...',
        model: model,
        questionType: 'open',
      });
    });

    it('deve calcular tempo estimado corretamente integrando examSet e studentExamSet', async () => {
      // Arrange: Cria múltiplos estudantes e questões
      const question1 = new Question(
        10,
        'O que é REST?',
        'APIs',
        'open',
        undefined,
        'REST é um estilo arquitetural para sistemas distribuídos'
      );
      const question2 = new Question(
        11,
        'Explique o padrão MVC',
        'Padrões',
        'open',
        undefined,
        'MVC separa a aplicação em Model, View e Controller'
      );
      questionSet.addQuestion(question1);
      questionSet.addQuestion(question2);

      const exam = new Exam(2, classId, 'Prova de Padrões de Projeto', true, 2, 0, [10, 11]);
      examSet.addExam(exam);

      // Cria dois exames de estudantes diferentes
      const studentExam1 = new StudentExam(2, '11111111111', 2, [
        new StudentAnswer(10, 'REST é um protocolo de comunicação', 0),
        new StudentAnswer(11, 'MVC é um padrão de arquitetura', 0),
      ]);
      const studentExam2 = new StudentExam(3, '22222222222', 2, [
        new StudentAnswer(10, 'RESTful API', 0),
        new StudentAnswer(11, 'Model View Controller', 0),
      ]);
      studentExamSet.addStudentExam(studentExam1);
      studentExamSet.addStudentExam(studentExam2);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica cálculo integrado
      // 2 questões abertas × 2 estudantes = 4 questões
      // 4 questões × 62 segundos = 248 segundos = ~5 minutos
      expect(response.status).toBe(200);
      expect(response.body.totalOpenQuestions).toBe(4);
      expect(response.body.totalStudentExams).toBe(2);
      expect(response.body.estimatedTime).toMatch(/minutos/);
      expect(response.body.queuedMessages).toBe(4);
    });

    it('deve filtrar apenas questões abertas integrando questionSet e examSet', async () => {
      // Arrange: Cria questões abertas e fechadas
      const openQuestion = new Question(
        20,
        'Explique testes de integração',
        'Testes',
        'open',
        undefined,
        'Testes de integração verificam a interação entre componentes'
      );
      const closedQuestion = new Question(
        21,
        'Qual é a melhor prática para versionamento de API?',
        'APIs',
        'closed',
        [
          QuestionOption.fromJSON({ id: 1, option: 'Versionamento por URL', isCorrect: true }),
          QuestionOption.fromJSON({ id: 2, option: 'Sem versionamento', isCorrect: false }),
        ],
        undefined
      );
      questionSet.addQuestion(openQuestion);
      questionSet.addQuestion(closedQuestion);

      const exam = new Exam(3, classId, 'Prova Mista', true, 1, 1, [20, 21]);
      examSet.addExam(exam);

      const studentExam = new StudentExam(4, '33333333333', 3, [
        new StudentAnswer(20, 'Testes que verificam múltiplos componentes juntos', 0),
        new StudentAnswer(21, 'Versionamento por URL', 0),
      ]);
      studentExamSet.addStudentExam(studentExam);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica que apenas questões abertas foram enviadas
      expect(response.status).toBe(200);
      expect(response.body.totalOpenQuestions).toBe(1);
      
      const messagesSent = mockedQStashService.publishBatch.mock.calls[0][0];
      expect(messagesSent).toHaveLength(1);
      expect(messagesSent[0].questionId).toBe(20); // Apenas questão aberta
      expect(messagesSent[0].questionType).toBe('open');
    });

    it('deve retornar erro quando QStash não está configurado', async () => {
      // Arrange
      mockedQStashService.isConfigured.mockReturnValue(false);

      const exam = new Exam(99, classId, 'Prova Teste', true, 1, 0, []);
      examSet.addExam(exam);

      const studentExam = new StudentExam(99, '99999999999', 99, []);
      studentExamSet.addStudentExam(studentExam);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica integração com QStash
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('QStash não está configurado');
      expect(mockedQStashService.publishBatch).not.toHaveBeenCalled();
    });

    it('deve processar múltiplos exames da mesma classe corretamente', async () => {
      // Arrange: Cria dois exames diferentes para a mesma classe
      const question1 = new Question(30, 'Questão 1', 'Tópico 1', 'open', undefined, 'Resposta 1');
      const question2 = new Question(31, 'Questão 2', 'Tópico 2', 'open', undefined, 'Resposta 2');
      questionSet.addQuestion(question1);
      questionSet.addQuestion(question2);

      const exam1 = new Exam(10, classId, 'Prova Parcial 1', true, 1, 0, [30]);
      const exam2 = new Exam(11, classId, 'Prova Parcial 2', true, 1, 0, [31]);
      examSet.addExam(exam1);
      examSet.addExam(exam2);

      const studentExam1 = new StudentExam(10, '11111111111', 10, [
        new StudentAnswer(30, 'Resposta aluno 1', 0),
      ]);
      const studentExam2 = new StudentExam(11, '11111111111', 11, [
        new StudentAnswer(31, 'Resposta aluno 2', 0),
      ]);
      studentExamSet.addStudentExam(studentExam1);
      studentExamSet.addStudentExam(studentExam2);

      // Act
      const response = await request(app)
        .post('/api/trigger-ai-correction')
        .send({
          classId: classId,
          model: model,
        });

      // Assert: Verifica que processou ambos os exames
      expect(response.status).toBe(200);
      expect(response.body.totalStudentExams).toBe(2);
      expect(response.body.totalOpenQuestions).toBe(2);
      expect(response.body.queuedMessages).toBe(2);
    });
  });
});

