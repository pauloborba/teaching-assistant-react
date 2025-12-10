import {
  validateAIModel,
  calculateEstimatedTime,
  convertScoreToPercentage,
  getRateLimitTimeout,
  isRateLimitError
} from '../../src/utils/aiCorrectionHelpers';
import { AIModel } from '../../src/types/AIModel';

describe('aiCorrectionHelpers', () => {
  describe('validateAIModel', () => {
    it('deve aceitar GEMINI_2_5_FLASH', () => {
      expect(() => validateAIModel(AIModel.GEMINI_2_5_FLASH)).not.toThrow();
    });

    it('deve lançar erro para modelo inválido', () => {
      expect(() => validateAIModel('Invalid Model')).toThrow(
        'Modelo inválido. Apenas Gemini 2.5 Flash é suportado'
      );
    });
  });

  describe('calculateEstimatedTime', () => {
    it('deve retornar "menos de 1 minuto" para 0 questões', () => {
      expect(calculateEstimatedTime(0)).toBe('menos de 1 minuto');
    });

    it('deve retornar "menos de 1 minuto" quando o cálculo resulta em menos de 1 minuto', () => {
      // A função usa Math.ceil, então qualquer valor < 60 segundos arredonda para 1 minuto
      // O único caso que retorna "menos de 1 minuto" é quando estimatedMinutes < 1
      // Isso só acontece com 0 questões ou valores muito pequenos
      expect(calculateEstimatedTime(0, 1)).toBe('menos de 1 minuto');
    });

    it('deve retornar "1 minuto" para exatamente 1 minuto', () => {
      // 1 questão * 60 segundos = 1 minuto
      expect(calculateEstimatedTime(1, 60)).toBe('1 minuto');
    });

    it('deve retornar "1 minuto" para valores que arredondam para 1 minuto', () => {
      // 2 questões * 30 segundos = 60 segundos = 1 minuto
      expect(calculateEstimatedTime(2, 30)).toBe('1 minuto');
    });

    it('deve retornar formato correto para múltiplos minutos', () => {
      // 5 questões * 122 segundos = 610 segundos = 10.16 minutos = 11 minutos (arredondado)
      expect(calculateEstimatedTime(5, 122)).toBe('11 minutos');
    });

    it('deve usar o valor padrão de 122 segundos por questão', () => {
      // 2 questões * 122 segundos padrão = 244 segundos = 5 minutos (arredondado)
      expect(calculateEstimatedTime(2)).toBe('5 minutos');
    });
  });

  describe('convertScoreToPercentage', () => {
    it('deve converter score 0 para 0%', () => {
      expect(convertScoreToPercentage(0)).toBe(0);
    });

    it('deve converter score 10 para 100%', () => {
      expect(convertScoreToPercentage(10)).toBe(100);
    });

    it('deve converter score 5 para 50%', () => {
      expect(convertScoreToPercentage(5)).toBe(50);
    });

    it('deve converter score 8.5 para 85%', () => {
      expect(convertScoreToPercentage(8.5)).toBe(85);
    });
  });

  describe('getRateLimitTimeout', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalTimeout = process.env.AI_CORRECTION_TEST_TIMEOUT_MS;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      if (originalTimeout) {
        process.env.AI_CORRECTION_TEST_TIMEOUT_MS = originalTimeout;
      } else {
        delete process.env.AI_CORRECTION_TEST_TIMEOUT_MS;
      }
    });

    it('deve retornar 120000ms (2 minutos) em produção', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_CORRECTION_TEST_TIMEOUT_MS;
      expect(getRateLimitTimeout()).toBe(120000);
    });

    it('deve retornar valor da variável de ambiente em modo teste', () => {
      process.env.NODE_ENV = 'test';
      process.env.AI_CORRECTION_TEST_TIMEOUT_MS = '500';
      expect(getRateLimitTimeout()).toBe(500);
    });

    it('deve usar valor padrão 100ms se variável não estiver definida em teste', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.AI_CORRECTION_TEST_TIMEOUT_MS;
      expect(getRateLimitTimeout()).toBe(100);
    });
  });

  describe('isRateLimitError', () => {
    it('deve retornar true para feedback com "quota"', () => {
      expect(isRateLimitError('Quota da API do Gemini excedida')).toBe(true);
      expect(isRateLimitError('quota excedida')).toBe(true);
      expect(isRateLimitError('QUOTA EXCEDIDA')).toBe(true);
    });

    it('deve retornar true para feedback com "rate limit"', () => {
      expect(isRateLimitError('Rate limit exceeded')).toBe(true);
      expect(isRateLimitError('rate limit error')).toBe(true);
      expect(isRateLimitError('RATE LIMIT')).toBe(true);
    });

    it('deve retornar true para feedback com "excedida"', () => {
      expect(isRateLimitError('Quota excedida')).toBe(true);
      expect(isRateLimitError('Limite excedida')).toBe(true);
    });

    it('deve retornar false para feedback normal', () => {
      expect(isRateLimitError('Resposta correta!')).toBe(false);
      expect(isRateLimitError('Resposta parcialmente correta')).toBe(false);
    });

    it('deve retornar false para feedback vazio ou undefined', () => {
      expect(isRateLimitError('')).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });

    it('deve detectar múltiplas palavras-chave no mesmo feedback', () => {
      expect(isRateLimitError('Quota excedida, rate limit atingido')).toBe(true);
    });
  });
});

