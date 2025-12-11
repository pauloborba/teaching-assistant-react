import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { examsManager, questionsManager, responses } from '../../src/services/dataService';
import { AIModel } from '../../src/types/AIModel';
import { CreateQuestionInput } from '../../src/models/Questions';
import * as qstashServiceModule from '../../src/services/qstashService';

jest.mock('../../src/services/qstashService', () => ({
  qstashService: {
    isConfigured: jest.fn(),
    publishBatch: jest.fn(),
  },
}));

const qstashMock = qstashServiceModule.qstashService as jest.Mocked<typeof qstashServiceModule.qstashService>;

describe('POST /api/trigger-ai-correction (integração)', () => {
  const model = AIModel.GEMINI_2_5_FLASH;
  const app = createTestApp();

  const resetData = () => {
    examsManager.replaceAll([]);
    questionsManager.replaceAll([]);
    responses.length = 0;
    jest.clearAllMocks();
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
      classId: 'any-class',
      title: 'Exam',
      isValid: true,
      openQuestions: questionIds.length,
      closedQuestions: 0,
      questions: questionIds,
    });
  };

  const addResponse = (responseId: number, examId: number, answers: Array<{ questionId: number; answer: string }>) => {
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
    qstashMock.isConfigured.mockReturnValue(true);
    qstashMock.publishBatch.mockImplementation(async (messages) => messages.map((_, i) => `msg-${i + 1}`));
  });

  it('deve enfileirar correção de abertas por examId e retornar estimativa', async () => {
    const q1 = addOpenQuestion(1, 'Pergunta 1', 'Resposta certa 1');
    const q2 = addOpenQuestion(2, 'Pergunta 2', 'Resposta certa 2');
    addExamWithQuestions(1, [q1, q2]);
    addResponse(100, 1, [
      { questionId: q1, answer: 'resp A' },
      { questionId: q2, answer: 'resp B' },
    ]);
    addResponse(101, 1, [
      { questionId: q1, answer: 'resp C' },
      { questionId: q2, answer: 'resp D' },
    ]);

    const res = await request(app)
      .post('/api/trigger-ai-correction')
      .send({ examId: 1, model })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Correção iniciada com sucesso');
    expect(res.body.totalResponses).toBe(2);
    expect(res.body.totalOpenQuestions).toBe(4);
    expect(res.body.queuedMessages).toBe(4);
    expect(res.body.estimatedTime).toBeDefined();

    expect(qstashMock.publishBatch).toHaveBeenCalledTimes(1);
    const sent = qstashMock.publishBatch.mock.calls[0][0];
    expect(sent).toHaveLength(4);
    expect(sent[0]).toMatchObject({
      responseId: 100,
      examId: 1,
      questionId: q1,
      model,
      questionType: 'open',
    });
  });

  it('deve falhar se examId estiver ausente', async () => {
    const res = await request(app)
      .post('/api/trigger-ai-correction')
      .send({ model })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('examId e model são obrigatórios');
  });

  it('deve falhar se model for inválido', async () => {
    const q = addOpenQuestion(1, 'Pergunta', 'Resp');
    addExamWithQuestions(1, [q]);
    addResponse(100, 1, [{ questionId: q, answer: 'resp' }]);

    const res = await request(app)
      .post('/api/trigger-ai-correction')
      .send({ examId: 1, model: 'INVALID' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Modelo inválido. Apenas Gemini 2.5 Flash é suportado');
  });

  it('deve falhar se não houver respostas para o exame', async () => {
    const q = addOpenQuestion(1, 'Pergunta', 'Resp');
    addExamWithQuestions(1, [q]);

    const res = await request(app)
      .post('/api/trigger-ai-correction')
      .send({ examId: 1, model })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Nenhuma resposta encontrada para este exame');
  });

  it('deve falhar se não houver questões abertas ou respostas abertas', async () => {
    addExamWithQuestions(2, []);
    addResponse(200, 2, []); // sem respostas

    const res = await request(app)
      .post('/api/trigger-ai-correction')
      .send({ examId: 2, model })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Nenhuma questão aberta encontrada para este exame');
  });

  it('deve retornar erro 500 se QStash não estiver configurado', async () => {
    const q = addOpenQuestion(1, 'Pergunta', 'Resp');
    addExamWithQuestions(1, [q]);
    addResponse(100, 1, [{ questionId: q, answer: 'resp' }]);
    qstashMock.isConfigured.mockReturnValue(false);

    const res = await request(app)
      .post('/api/trigger-ai-correction')
      .send({ examId: 1, model })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('QStash não está configurado. Configure o QSTASH_TOKEN no arquivo .env');
  });
});

