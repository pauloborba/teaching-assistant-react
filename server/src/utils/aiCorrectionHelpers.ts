import { AIModel } from '../types/AIModel';
import { QStashMessage } from '../services/qstashService';

/**
 * Valida se o modelo de IA é suportado
 */
export function validateAIModel(model: string): void {
  if (model !== AIModel.GEMINI_2_5_FLASH) {
    throw new Error('Modelo inválido. Apenas Gemini 2.5 Flash é suportado');
  }
}

/**
 * Calcula e formata o tempo estimado de conclusão da correção
 * @param totalQuestions Número total de questões a serem corrigidas
 * @param secondsPerQuestion Segundos por questão (padrão: 122 = 2s processamento + 120s timeout)
 * @returns String formatada do tempo estimado (ex: "5 minutos", "1 minuto", "menos de 1 minuto")
 */
export function calculateEstimatedTime(totalQuestions: number, secondsPerQuestion: number = 122): string {
  const estimatedSeconds = totalQuestions * secondsPerQuestion;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
  
  if (estimatedMinutes < 1) {
    return 'menos de 1 minuto';
  } else if (estimatedMinutes === 1) {
    return '1 minuto';
  } else {
    return `${estimatedMinutes} minutos`;
  }
}

/**
 * Converte score de 0-10 para 0-100 (porcentagem)
 */
export function convertScoreToPercentage(score: number): number {
  return (score / 10) * 100;
}

/**
 * Obtém o timeout para rate limiting do Gemini
 * Em testes, usa valor configurável via variável de ambiente
 */
export function getRateLimitTimeout(): number {
  if (process.env.NODE_ENV === 'test') {
    return parseInt(process.env.AI_CORRECTION_TEST_TIMEOUT_MS || '100', 10);
  }
  return 120000; // 120 segundos = 2 minutos em produção
}

/**
 * Verifica se o feedback indica problema de quota/rate limit
 * @param feedback Texto do feedback da correção
 * @returns true se o feedback indica problema de quota/rate limit
 */
export function isRateLimitError(feedback?: string): boolean {
  if (!feedback) return false;
  const lowerFeedback = feedback.toLowerCase();
  return lowerFeedback.includes('quota') || 
         lowerFeedback.includes('rate limit') ||
         lowerFeedback.includes('excedida');
}

/**
 * Valida campos obrigatórios do request
 */
export function validateRequiredFields(fields: Record<string, any>, fieldNames: string[]): void {
  const missingFields = fieldNames.filter(field => !fields[field]);
  if (missingFields.length > 0) {
    throw new Error(`${missingFields.join(', ')} ${missingFields.length === 1 ? 'é' : 'são'} obrigatório${missingFields.length === 1 ? '' : 's'}`);
  }
}

