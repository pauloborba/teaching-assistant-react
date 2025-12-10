import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { examsManager, questionsManager, responses } from '../../src/services/dataService';
import { CreateQuestionInput } from '../../src/models/Questions';
import { AIModel } from '../../src/types/AIModel';
import * as aiServiceFactory from '../../src/services/ai/AIServiceFactory';

jest.mock('../../src/services/ai/AIServiceFactory');

const mockedFactory = aiServiceFactory as jest.Mocked<typeof aiServiceFactory>;

describe('POST /api/question-ai-correction (integração)', () => {
  const app = createTestApp();

  beforeEach(() => {
    // Configura timeout curto para testes (100ms em vez de 120s = 2 minutos)
    process.env.NODE_ENV = 'test';
    process.env.AI_CORRECTION_TEST_TIMEOUT_MS = '100';
  });

  afterEach(() => {
    delete process.env.AI_CORRECTION_TEST_TIMEOUT_MS;
    jest.clearAllMocks();
  });

  const resetData = () => {
    examsManager.replaceAll([]);
    questionsManager.replaceAll([]);
    responses.length = 0;
    jest.clearAllMocks();
  };

  beforeEach(() => {
    resetData();
  });

  const addOpenQuestion = (id: number, answer: string) => {
    const q: CreateQuestionInput = { question: `Q${id}`, topic: 'T', type: 'open', answer };
    const created = questionsManager.addQuestion(q);
    (created as any).id = id;
  };

  const addExam = (examId: number, questionIds: number[]) => {
    examsManager.addExam({
      id: examId,
      classId: 'c1',
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
      studentCPF: '123',
      examId,
      answers,
      timestamp: new Date().toISOString(),
    });
  };

  it('deve atualizar apenas a nota da resposta (sem alterar o texto)', async () => {
    addOpenQuestion(1, 'gabarito');
    addExam(10, [1]);
    addResponse(500, 10, [{ questionId: 1, answer: 'resposta original' }]);

    (aiServiceFactory.AIServiceFactory.create as jest.Mock).mockReturnValue({
      getMetadata: jest.fn(),
      validateConfiguration: jest.fn().mockResolvedValue(true),
      correctAnswer: jest.fn().mockResolvedValue({ isCorrect: true, score: 8, feedback: 'ok', confidence: 0.8 }),
    } as any);

    // Com NODE_ENV=test e AI_CORRECTION_TEST_TIMEOUT_MS=100, o timeout será de apenas 100ms
    const res = await request(app)
      .post('/api/question-ai-correction')
      .send({
        responseId: 500,
        examId: 10,
        model: AIModel.GEMINI_2_5_FLASH,
        questionId: 1,
        questionText: 'Q1',
        studentAnswer: 'resposta original',
        correctAnswer: 'gabarito',
      });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(80);

    const updated = responses.find((r) => r.id === 500);
    expect(updated?.answers[0].grade).toBe(80);
    expect(updated?.answers[0].answer).toBe('resposta original'); // texto preservado
  });

  it('deve falhar se faltar campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/question-ai-correction')
      .send({
        responseId: 1,
        model: AIModel.GEMINI_2_5_FLASH,
      });
    expect(res.status).toBe(400);
  });
});

