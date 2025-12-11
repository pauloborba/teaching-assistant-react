import {
  validateAIModel,
  calculateEstimatedTime,
  isRateLimitError
} from '../../src/utils/aiCorrectionHelpers';
import { AIModel } from '../../src/types/AIModel';

describe('aiCorrectionHelpers', () => {
  it('validateAIModel deve aceitar modelo válido e rejeitar inválido', () => {
    expect(() => validateAIModel(AIModel.GEMINI_2_5_FLASH)).not.toThrow();
    expect(() => validateAIModel('Invalid Model')).toThrow(
      'Modelo inválido. Apenas Gemini 2.5 Flash é suportado'
    );
  });

  it('calculateEstimatedTime deve formatar tempo corretamente', () => {
    expect(calculateEstimatedTime(0)).toBe('menos de 1 minuto');
    expect(calculateEstimatedTime(1, 60)).toBe('1 minuto');
    expect(calculateEstimatedTime(5, 122)).toBe('11 minutos');
  });

  it('isRateLimitError deve detectar erros de quota/rate limit', () => {
    expect(isRateLimitError('Quota da API do Gemini excedida')).toBe(true);
    expect(isRateLimitError('Rate limit exceeded')).toBe(true);
    expect(isRateLimitError('Resposta correta!')).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });
});

