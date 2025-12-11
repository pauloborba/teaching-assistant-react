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

  it('publishBatch deve publicar múltiplas mensagens e filtrar falhas', async () => {
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

    // Testa filtro de falhas
    mockEnqueueJSON
      .mockResolvedValueOnce({ messageId: 'msg-1' })
      .mockRejectedValueOnce(new Error('Erro na publicação'));

    const resultWithError = await qstashService.publishBatch(messages);
    expect(resultWithError).toEqual(['msg-1']);
  });
});

