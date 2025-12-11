import { AIServiceFactory } from '../../src/services/ai/AIServiceFactory';
import { AIModel, AIServiceConfig } from '../../src/types/AIModel';
import { GeminiService } from '../../src/services/ai/GeminiService';

jest.mock('../../src/services/ai/GeminiService');

describe('AIServiceFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar GeminiService para modelo válido e lançar erro para inválido', () => {
    const mockGeminiService = {
      getMetadata: jest.fn(),
      correctAnswer: jest.fn(),
      validateConfiguration: jest.fn()
    };

    (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => 
      mockGeminiService as unknown as GeminiService
    );

    const validConfig: AIServiceConfig = {
      model: AIModel.GEMINI_2_5_FLASH,
      apiKey: 'test-api-key'
    };

    const service = AIServiceFactory.create(validConfig);
    expect(GeminiService).toHaveBeenCalledWith(validConfig);
    expect(service).toBe(mockGeminiService);

    const invalidConfig: AIServiceConfig = {
      model: 'Unsupported Model' as AIModel,
      apiKey: 'test-api-key'
    };

    expect(() => AIServiceFactory.create(invalidConfig)).toThrow(
      'Unsupported AI model: Unsupported Model'
    );
  });
});

