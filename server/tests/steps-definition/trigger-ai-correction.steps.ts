import { defineFeature, loadFeature } from 'jest-cucumber';
import request, { Response } from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { examsManager, questionsManager, responses } from '../../src/services/dataService';
import { CreateQuestionInput } from '../../src/models/Questions';
import { AIModel } from '../../src/types/AIModel';
import * as qstashServiceModule from '../../src/services/qstashService';

jest.mock('../../src/services/qstashService', () => ({
  qstashService: {
    isConfigured: jest.fn(),
    publishBatch: jest.fn(),
  },
}));

const feature = loadFeature('./tests/features/trigger-ai-correction.feature');

defineFeature(feature, (test) => {
  const app = createTestApp();
  let httpResponse: Response;

  const qstashMock = qstashServiceModule.qstashService as jest.Mocked<typeof qstashServiceModule.qstashService>;

  const resetData = () => {
    examsManager.replaceAll([]);
    questionsManager.replaceAll([]);
    responses.length = 0;
    jest.clearAllMocks();
    qstashMock.isConfigured.mockReturnValue(true);
    qstashMock.publishBatch.mockImplementation(async (messages) =>
      messages.map((_, index) => `msg-id-${index + 1}`)
    );
  };

  const addOpenQuestion = (id: number, question: string, answer: string): number => {
    const q: CreateQuestionInput = { question, topic: 'TOPIC', type: 'open', answer };
    const created = questionsManager.addQuestion(q);
    (created as any).id = id;
    return id;
  };

  const addExamWithQuestions = (examId: number, questionIds: number[]) => {
    examsManager.addExam({
      id: examId,
      classId: 'class-1',
      title: `Exam ${examId}`,
      isValid: true,
      openQuestions: questionIds.length,
      closedQuestions: 0,
      questions: questionIds,
    });
  };

  const addResponse = (
    responseId: number,
    examId: number,
    answers: Array<{ questionId: number; answer: string }>
  ) => {
    responses.push({
      id: responseId,
      studentCPF: '00000000000',
      examId,
      answers,
      timestamp: new Date().toISOString(),
    });
  };

  beforeEach(() => {
    resetData();
  });

  test('Iniciar correção AI com sucesso', ({ given, and, when, then }) => {
    given(/^existe um exame com id "(.*)" contendo questões abertas e respostas registradas$/, (examId: string) => {
      const q1 = addOpenQuestion(1, 'Pergunta 1', 'Resposta correta 1');
      const q2 = addOpenQuestion(2, 'Pergunta 2', 'Resposta correta 2');
      addExamWithQuestions(Number(examId), [q1, q2]);
      addResponse(100, Number(examId), [
        { questionId: q1, answer: 'Resposta A' },
        { questionId: q2, answer: 'Resposta B' },
      ]);
      addResponse(101, Number(examId), [
        { questionId: q1, answer: 'Resposta C' },
        { questionId: q2, answer: 'Resposta D' },
      ]);
    });

    and(/^o QStash está configurado corretamente$/, () => {
      qstashMock.isConfigured.mockReturnValue(true);
    });

    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo examId "(.*)" e model "(.*)"$/,
      async (_method: string, endpoint: string, examId: string, model: string) => {
        httpResponse = await request(app)
          .post(endpoint)
          .send({ examId: Number(examId), model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter message "(.*)"$/, (expectedMessage: string) => {
      expect(httpResponse.body).toHaveProperty('message', expectedMessage);
    });

    and(/^o JSON da resposta deve conter estimatedTime$/, () => {
      expect(httpResponse.body).toHaveProperty('estimatedTime');
      expect(typeof httpResponse.body.estimatedTime).toBe('string');
    });

    and(/^o JSON da resposta deve conter totalResponses maior que 0$/, () => {
      expect(httpResponse.body).toHaveProperty('totalResponses');
      expect(httpResponse.body.totalResponses).toBeGreaterThan(0);
    });

    and(/^o JSON da resposta deve conter totalOpenQuestions maior que 0$/, () => {
      expect(httpResponse.body).toHaveProperty('totalOpenQuestions');
      expect(httpResponse.body.totalOpenQuestions).toBeGreaterThan(0);
    });

    and(/^o JSON da resposta deve conter queuedMessages maior que 0$/, () => {
      expect(httpResponse.body).toHaveProperty('queuedMessages');
      expect(httpResponse.body.queuedMessages).toBeGreaterThan(0);
    });
  });

  test('Falhar ao iniciar correção quando examId não é fornecido', ({ when, then, and }) => {
    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo apenas model "(.*)"$/,
      async (_method: string, endpoint: string, model: string) => {
        httpResponse = await request(app).post(endpoint).send({ model }).set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(httpResponse.body).toHaveProperty('error', expectedError);
    });
  });

  test('Falhar ao iniciar correção quando model não é fornecido', ({ when, then, and }) => {
    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo apenas examId "(.*)"$/,
      async (_method: string, endpoint: string, examId: string) => {
        httpResponse = await request(app)
          .post(endpoint)
          .send({ examId: Number(examId) })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(httpResponse.body).toHaveProperty('error', expectedError);
    });
  });

  test('Falhar ao iniciar correção quando model é inválido', ({ given, when, then, and }) => {
    given(/^existe um exame com id "(.*)" contendo questões abertas e respostas registradas$/, (examId: string) => {
      const q1 = addOpenQuestion(1, 'Pergunta 1', 'Resposta correta 1');
      addExamWithQuestions(Number(examId), [q1]);
      addResponse(300, Number(examId), [{ questionId: q1, answer: 'Resposta A' }]);
    });

    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo examId "(.*)" e model "(.*)"$/,
      async (_method: string, endpoint: string, examId: string, model: string) => {
        httpResponse = await request(app)
          .post(endpoint)
          .send({ examId: Number(examId), model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(httpResponse.body).toHaveProperty('error', expectedError);
    });
  });

  test('Falhar ao iniciar correção quando não existem respostas para o exame', ({ given, when, then, and }) => {
    given(/^não existem respostas registradas para o exame de id "(.*)"$/, (examId: string) => {
      const q1 = addOpenQuestion(1, 'Pergunta 1', 'Resposta correta 1');
      addExamWithQuestions(Number(examId), [q1]);
      // Nenhuma resposta adicionada
    });

    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo examId "(.*)" e model "(.*)"$/,
      async (_method: string, endpoint: string, examId: string, model: string) => {
        httpResponse = await request(app)
          .post(endpoint)
          .send({ examId: Number(examId), model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(httpResponse.body).toHaveProperty('error', expectedError);
    });
  });

  test('Falhar ao iniciar correção quando QStash não está configurado', ({ given, and, when, then }) => {
    given(/^existe um exame com id "(.*)" contendo questões abertas e respostas registradas$/, (examId: string) => {
      const q1 = addOpenQuestion(1, 'Pergunta 1', 'Resposta correta 1');
      addExamWithQuestions(Number(examId), [q1]);
      addResponse(400, Number(examId), [{ questionId: q1, answer: 'Resposta A' }]);
    });

    and(/^o QStash não está configurado$/, () => {
      qstashMock.isConfigured.mockReturnValue(false);
    });

    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo examId "(.*)" e model "(.*)"$/,
      async (_method: string, endpoint: string, examId: string, model: string) => {
        httpResponse = await request(app)
          .post(endpoint)
          .send({ examId: Number(examId), model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(httpResponse.body).toHaveProperty('error');
      expect(httpResponse.body.error).toContain(expectedError);
    });
  });

  test('Falhar ao iniciar correção quando não existem questões abertas', ({ given, and, when, then }) => {
    given(/^existe um exame com id "(.*)" sem questões abertas ou sem respostas abertas$/, (examId: string) => {
      // Cria exame sem questões abertas (e consequentemente sem respostas válidas)
      addExamWithQuestions(Number(examId), []);
      // Adiciona resposta sem questões abertas para manter consistência
      addResponse(500, Number(examId), []);
    });

    and(/^o QStash está configurado corretamente$/, () => {
      qstashMock.isConfigured.mockReturnValue(true);
    });

    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo examId "(.*)" e model "(.*)"$/,
      async (_method: string, endpoint: string, examId: string, model: string) => {
        httpResponse = await request(app)
          .post(endpoint)
          .send({ examId: Number(examId), model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(httpResponse.body).toHaveProperty('error', expectedError);
    });
  });

  test('Falhar ao iniciar correção quando ocorre erro ao enviar mensagens para QStash', ({ given, and, when, then }) => {
    given(/^existe um exame com id "(.*)" contendo questões abertas e respostas registradas$/, (examId: string) => {
      const q1 = addOpenQuestion(1, 'Pergunta 1', 'Resposta correta 1');
      addExamWithQuestions(Number(examId), [q1]);
      addResponse(600, Number(examId), [{ questionId: q1, answer: 'Resposta A' }]);
    });

    and(/^o QStash está configurado corretamente$/, () => {
      qstashMock.isConfigured.mockReturnValue(true);
    });

    and(/^o QStash falha ao processar publishBatch$/, () => {
      qstashMock.publishBatch.mockRejectedValue(new Error('Erro ao enviar mensagens para QStash'));
    });

    when(
      /^uma requisição "(.*)" for enviada para "(.*)" com body contendo examId "(.*)" e model "(.*)"$/,
      async (_method: string, endpoint: string, examId: string, model: string) => {
        httpResponse = await request(app)
          .post(endpoint)
          .send({ examId: Number(examId), model })
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(httpResponse.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(httpResponse.body).toHaveProperty('error', expectedError);
    });

    and(/^o JSON da resposta deve conter details$/, () => {
      expect(httpResponse.body).toHaveProperty('details');
    });
  });
});


