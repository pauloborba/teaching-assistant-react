import { Router, Request, Response } from 'express';
import {
  getAllQuestions,
  getQuestionById,
  getQuestionsByTopic,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../services/dataService';
import {
  CreateQuestionInput,
  UpdateQuestionInput,
} from '../models/Questions';

const router = Router();

const sendBadRequest = (res: Response, message: string) => res.status(400).json({ error: message });

const getNumericIdFromParams = (rawId: string | undefined): number | null => {
  if (typeof rawId !== 'string') {
    return null;
  }

  const parsed = Number(rawId);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseClosedOptions = (options: unknown): Array<{ option: string; isCorrect: boolean }> => {
  if (!Array.isArray(options)) {
    throw new Error('Options must be an array');
  }

  let hasCorrect = false;

  const parsed = options.map((opt, index) => {
    if (typeof opt !== 'object' || opt === null) {
      throw new Error(`Option at index ${index} must be an object`);
    }

    const optionText = (opt as any).option;
    const optionIsCorrect = (opt as any).isCorrect;

    if (typeof optionText !== 'string') {
      throw new Error(`Option text at index ${index} must be a string`);
    }

    if (Boolean(optionIsCorrect)) {
      hasCorrect = true;
    }

    return {
      option: optionText,
      isCorrect: Boolean(optionIsCorrect),
    };
  });

  if (!hasCorrect) {
    throw new Error('At least one option must be marked as correct');
  }

  return parsed;
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { topic } = req.query;

    if (topic && typeof topic === 'string') {
      const questions = getQuestionsByTopic(topic);
      return res.status(200).json({ data: questions, total: questions.length });
    }

    const questions = getAllQuestions();
    return res.status(200).json({ data: questions, total: questions.length });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = getNumericIdFromParams(req.params.id);
    if (id === null) {
      return sendBadRequest(res, 'Question id must be a number');
    }

    const question = getQuestionById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    return res.status(200).json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { question, topic, type, answer, options } = req.body;

    if (!question || typeof question !== 'string') {
      return sendBadRequest(res, 'Question text is required');
    }

    if (!topic || typeof topic !== 'string') {
      return sendBadRequest(res, 'Topic is required');
    }

    if (type !== 'open' && type !== 'closed') {
      return sendBadRequest(res, "Type must be either 'open' or 'closed'");
    }

    let payload: CreateQuestionInput;

    if (type === 'open') {
      if (!answer || typeof answer !== 'string') {
        return sendBadRequest(res, 'Open questions require an answer');
      }

      payload = {
        question,
        topic,
        type: 'open',
        answer,
      };
    } else {
      try {
        const parsedOptions = parseClosedOptions(options);
        payload = {
          question,
          topic,
          type: 'closed',
          options: parsedOptions,
        };
      } catch (optionError) {
        return sendBadRequest(
          res,
          optionError instanceof Error ? optionError.message : 'Invalid options payload',
        );
      }
    }

    const createdQuestion = createQuestion(payload);
    return res.status(201).json(createdQuestion);
  } catch (error) {
    console.error('Error creating question:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create question',
    });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = getNumericIdFromParams(req.params.id);
    if (id === null) {
      return sendBadRequest(res, 'Question id must be a number');
    }

    const { question, topic, type, answer, options } = req.body;

    const payload: UpdateQuestionInput = {};

    if (question !== undefined) {
      if (typeof question !== 'string') {
        return sendBadRequest(res, 'Question text must be a string');
      }
      payload.question = question;
    }

    if (topic !== undefined) {
      if (typeof topic !== 'string') {
        return sendBadRequest(res, 'Topic must be a string');
      }
      payload.topic = topic;
    }

    if (type !== undefined) {
      if (type !== 'open' && type !== 'closed') {
        return sendBadRequest(res, "Type must be either 'open' or 'closed'");
      }
      payload.type = type;
    }

    if (answer !== undefined) {
      if (typeof answer !== 'string') {
        return sendBadRequest(res, 'Answer must be a string');
      }
      payload.answer = answer;
    }

    if (options !== undefined) {
      try {
        payload.options = parseClosedOptions(options);
      } catch (optionError) {
        return sendBadRequest(
          res,
          optionError instanceof Error ? optionError.message : 'Invalid options payload',
        );
      }
    }

    const updatedQuestion = updateQuestion(id, payload);

    if (!updatedQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    return res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update question',
    });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = getNumericIdFromParams(req.params.id);
    if (id === null) {
      return sendBadRequest(res, 'Question id must be a number');
    }

    const removed = deleteQuestion(id);
    if (!removed) {
      return res.status(404).json({ error: 'Question not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting question:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
