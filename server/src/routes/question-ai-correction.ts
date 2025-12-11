import { Router, Request, Response } from 'express';
import { AICorrectionRequest, AIModel } from '../types/AIModel';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';
import { IAIService } from '../services/ai/IAIService';
import { getQuestionCorrectAnswer, updateResponseAnswerScore, triggerSaveResponses } from '../services/dataService';
import { geminiConfig } from '../config';
import { validateAIModel, convertScoreToPercentage, getRateLimitTimeout, isRateLimitError } from '../utils/aiCorrectionHelpers';

const router = Router();

/**
 * POST /api/question-ai-correction
 * Question AI correction - corrige uma questão específica de uma resposta (examId + responseId)
 * Esta rota pode ser chamada diretamente ou via webhook do QStash
 */
router.post('/question-ai-correction', async (req: Request, res: Response) => {
  try {
    const { responseId, examId, model, questionId, questionText, studentAnswer, correctAnswer } = req.body;
  
    if (!responseId || !examId || !model || !questionId || !questionText || !studentAnswer || !correctAnswer) {
      return res.status(400).json({ 
        error: 'responseId, examId, model, questionId, questionText, studentAnswer e correctAnswer são obrigatórios' 
      });
    }

    try {
      validateAIModel(model);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    // Opcional: garantir que existe resposta correta armazenada
    const correctAnswerFallback = correctAnswer || getQuestionCorrectAnswer(Number(questionId));

    // Cria o serviço de IA
    const aiService: IAIService = AIServiceFactory.create({
      model: AIModel.GEMINI_2_5_FLASH,
      apiKey: geminiConfig.apiKey,
      timeout: geminiConfig.timeout,
      maxRetries: geminiConfig.maxRetries
    });

    // Valida configuração
    const isValid = await aiService.validateConfiguration();
    if (!isValid) {
      return res.status(500).json({ error: 'Configuração do serviço de IA é inválida' });
    }

    // Prepara requisição de correção
    const aiCorrectionRequest: AICorrectionRequest = {
      questionId: questionId,
      questionText: questionText,
      questionType: 'open',
      studentAnswer: studentAnswer,
      correctAnswer: correctAnswerFallback,
      context: 'Você é um professor corrigindo uma prova. Seja justo e preciso na avaliação.'
    };

    // Executa correção
    const aiCorrectionResponse = await aiService.correctAnswer(aiCorrectionRequest);  

    // Verifica se houve erro de quota/rate limit
    const isRateLimit = isRateLimitError(aiCorrectionResponse.feedback);
    
    // Se não for erro de rate limit, atualiza a nota
    if (!isRateLimit) {
      // Converte score de 0-10 para 0-100 (porcentagem)
      const percentageScore = convertScoreToPercentage(aiCorrectionResponse.score);

      // Atualiza a resposta com a pontuação (0% - 100%) que o aluno obteve na questão
      const updated = updateResponseAnswerScore(Number(responseId), Number(questionId), percentageScore);
      if (!updated) {
        return res.status(404).json({ error: 'Resposta não encontrada para atualizar a nota' });
      }

      // Salva as alterações
      triggerSaveResponses();
    } else {
      // Em caso de rate limit, não atualiza a nota mas ainda retorna a resposta
      console.log('Rate limit detectado - nota não será atualizada');
    }

    // Timeout de 2 minutos antes de retornar a resposta (para rate limiting do Gemini)
    // Em testes, pode ser configurado via variável de ambiente para acelerar
    const timeoutMs = getRateLimitTimeout();
    await new Promise(resolve => setTimeout(resolve, timeoutMs));

    // Retorna a resposta da API de correção
    res.json({
      message: isRateLimit 
        ? 'Question AI correction completed with rate limit error - grade not updated'
        : 'Question AI correction completed successfully',
      responseId: responseId,
      examId: examId,
      questionId: questionId,
      score: isRateLimit ? undefined : convertScoreToPercentage(aiCorrectionResponse.score),
      isCorrect: aiCorrectionResponse.isCorrect,
      feedback: aiCorrectionResponse.feedback,
      confidence: aiCorrectionResponse.confidence,
      rateLimitError: isRateLimit
    });
  } catch (error) {
    console.error('Error in question AI correction:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

