import { Router, Request, Response } from 'express';
import { AIModel } from '../types/AIModel';
import { examsManager, getOpenQuestionsForExam, getResponsesByExamId, getQuestionCorrectAnswer } from '../services/dataService';
import { qstashService, QStashMessage } from '../services/qstashService';
import { validateAIModel, calculateEstimatedTime } from '../utils/aiCorrectionHelpers';

const router = Router();

/**
 * POST /api/trigger-ai-correction
 * Trigger AI correction for all responses of an exam (open questions)
 */
router.post('/trigger-ai-correction', async (req: Request, res: Response) => {
  try {
    const { examId, model } = req.body;

    if (!examId || !model) {
      return res.status(400).json({ error: 'examId e model são obrigatórios' });
    }

    try {
      validateAIModel(model);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    // Valida exame
    const exam = examsManager.getExamById(Number(examId));
    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' });
    }

    // Buscar respostas por examId
    const examResponses = getResponsesByExamId(Number(examId));
    if (examResponses.length === 0) {
      return res.status(404).json({ error: 'Nenhuma resposta encontrada para este exame' });
    }

    // Questões abertas do exame
    const openQuestions = getOpenQuestionsForExam(Number(examId));
    if (openQuestions.length === 0) {
      return res.status(400).json({ error: 'Nenhuma questão aberta encontrada para este exame' });
    }

    // Monta mensagens para enfileirar
    const messagesToQueue: QStashMessage[] = [];

    for (const response of examResponses) {
      for (const question of openQuestions) {
        const studentAnswer = response.answers?.find((a: any) => a.questionId === question.id);
        if (!studentAnswer || !studentAnswer.answer) continue;

        const correctAnswer = getQuestionCorrectAnswer(question.id);

        messagesToQueue.push({
          responseId: response.id,
          examId: Number(examId),
          questionId: question.id,
          questionText: question.question,
          studentAnswer: studentAnswer.answer,
          correctAnswer: correctAnswer,
          model: model,
          questionType: 'open'
        });
      }
    }

    if (messagesToQueue.length === 0) {
      return res.status(400).json({ error: 'Nenhuma resposta aberta encontrada para correção' });
    }

    // Calcular tempo estimado de conclusão
    // Cada correção leva aproximadamente: 2 segundos de processamento + 120 segundos de timeout = 122 segundos
    const totalOpenQuestions = messagesToQueue.length;
    const estimatedTime = calculateEstimatedTime(totalOpenQuestions);

    // Valida se QStash está configurado
    if (!qstashService.isConfigured()) {
      return res.status(500).json({ 
        error: 'QStash não está configurado. Configure o QSTASH_TOKEN no arquivo .env' 
      });
    }

    // Envia mensagens para QStash
    let queuedMessages = 0;
    let qstashErrors: string[] = [];

    try {
      const messageIds = await qstashService.publishBatch(messagesToQueue);
      queuedMessages = messageIds.length;
      
      if (messageIds.length < messagesToQueue.length) {
        qstashErrors.push(`${messagesToQueue.length - messageIds.length} mensagens falharam ao serem enfileiradas`);
      }
    } catch (error) {
      return res.status(500).json({ 
        error: 'Erro ao enviar mensagens para QStash',
        details: (error as Error).message
      });
    }

    // Retorna que a correção foi iniciada e o tempo estimado de conclusão
    res.json({
      message: 'Correção iniciada com sucesso',
      estimatedTime: estimatedTime,
      totalResponses: examResponses.length,
      totalOpenQuestions: totalOpenQuestions,
      queuedMessages: queuedMessages,
      errors: qstashErrors.length > 0 ? qstashErrors : undefined
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

