import { QStashService, QStashMessage } from '../../src/services/qstashService';
import { Client } from '@upstash/qstash';

// Mock do módulo @upstash/qstash
jest.mock('@upstash/qstash', () => {
  const mockEnqueueJSON = jest.fn();
  const mockQueue = jest.fn(() => ({
    enqueueJSON: mockEnqueueJSON
  }));

  return {
    Client: jest.fn().mockImplementation(() => ({
      queue: mockQueue
    }))
  };
});

// Mock do config
jest.mock('../../src/config', () => ({
  qstashConfig: {
    token: 'test-token',
    queueName: 'test-queue',
    webhookUrl: 'http://localhost:3005/api/question-ai-correction',
    baseUrl: 'https://qstash.upstash.io'
  }
}));

describe('QStashService', () => {
  let qstashService: QStashService;
  let mockEnqueueJSON: jest.Mock;
  let mockQueue: jest.Mock;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Silencia console.error durante os testes
    originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Obtém referências aos mocks
    const qstashModule = require('@upstash/qstash');
    mockEnqueueJSON = jest.fn();
    mockQueue = jest.fn(() => ({
      enqueueJSON: mockEnqueueJSON
    }));
    qstashModule.Client.mockImplementation(() => ({
      queue: mockQueue
    }));

    qstashService = new QStashService({
      token: 'test-token',
      queueName: 'test-queue'
    });
  });

  afterEach(() => {
    // Restaura console.error após os testes
    console.error = originalConsoleError;
  });

  describe('publish', () => {
    it('deve publicar uma mensagem com sucesso', async () => {
      const messageId = 'msg-123';
      mockEnqueueJSON.mockResolvedValue({ messageId });

      const message: QStashMessage = {
        responseId: 1,
        examId: 10,
        questionId: 5,
        questionText: 'O que é TDD?',
        studentAnswer: 'Test-Driven Development',
        correctAnswer: 'Test-Driven Development é uma metodologia...',
        model: 'Gemini 2.5 Flash',
        questionType: 'open'
      };

      const result = await qstashService.publish(message);

      expect(result).toBe(messageId);
      expect(mockEnqueueJSON).toHaveBeenCalled();
    });
  });

  describe('publishBatch', () => {
    it('deve publicar múltiplas mensagens com sucesso', async () => {
      const messageIds = ['msg-1', 'msg-2'];
      mockEnqueueJSON
        .mockResolvedValueOnce({ messageId: messageIds[0] })
        .mockResolvedValueOnce({ messageId: messageIds[1] });

      const messages: QStashMessage[] = [
        {
          responseId: 1,
          examId: 10,
          questionId: 5,
          questionText: 'Questão 1',
          studentAnswer: 'Resposta 1',
          correctAnswer: 'Correta 1',
          model: 'Gemini 2.5 Flash'
        },
        {
          responseId: 1,
          examId: 10,
          questionId: 6,
          questionText: 'Questão 2',
          studentAnswer: 'Resposta 2',
          correctAnswer: 'Correta 2',
          model: 'Gemini 2.5 Flash'
        }
      ];

      const result = await qstashService.publishBatch(messages);

      expect(result).toEqual(messageIds);
      expect(mockEnqueueJSON).toHaveBeenCalledTimes(2);
    });

    it('deve filtrar mensagens que falharam e retornar apenas as bem-sucedidas', async () => {
      mockEnqueueJSON
        .mockResolvedValueOnce({ messageId: 'msg-1' })
        .mockRejectedValueOnce(new Error('Erro na publicação'));

      const messages: QStashMessage[] = [
        {
          responseId: 1,
          examId: 10,
          questionId: 5,
          questionText: 'Questão 1',
          studentAnswer: 'Resposta 1',
          correctAnswer: 'Correta 1',
          model: 'Gemini 2.5 Flash'
        },
        {
          responseId: 1,
          examId: 10,
          questionId: 6,
          questionText: 'Questão 2',
          studentAnswer: 'Resposta 2',
          correctAnswer: 'Correta 2',
          model: 'Gemini 2.5 Flash'
        }
      ];

      const result = await qstashService.publishBatch(messages);

      expect(result).toEqual(['msg-1']);
      expect(result).toHaveLength(1);
    });
  });
});

