import { AIServiceFactory } from '../../src/services/ai/AIServiceFactory';
import { AIModel, AIServiceConfig } from '../../src/types/AIModel';
import { GeminiService } from '../../src/services/ai/GeminiService';

jest.mock('../../src/services/ai/GeminiService');

describe('AIServiceFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar uma instância de GeminiService para GEMINI_2_5_FLASH', () => {
      const mockGeminiService = {
        getMetadata: jest.fn(),
        correctAnswer: jest.fn(),
        validateConfiguration: jest.fn()
      };

      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => 
        mockGeminiService as unknown as GeminiService
      );

      const config: AIServiceConfig = {
        model: AIModel.GEMINI_2_5_FLASH,
        apiKey: 'test-api-key'
      };

      const service = AIServiceFactory.create(config);

      expect(GeminiService).toHaveBeenCalledWith(config);
      expect(service).toBe(mockGeminiService);
    });

    it('deve lançar erro para modelo não suportado', () => {
      const config: AIServiceConfig = {
        model: 'Unsupported Model' as AIModel,
        apiKey: 'test-api-key'
      };

      expect(() => AIServiceFactory.create(config)).toThrow(
        'Unsupported AI model: Unsupported Model'
      );
      expect(GeminiService).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableModels', () => {
    it('deve retornar todos os modelos disponíveis', () => {
      const models = AIServiceFactory.getAvailableModels();
      expect(models).toContain(AIModel.GEMINI_2_5_FLASH);
      expect(Array.isArray(models)).toBe(true);
    });
  });
});

