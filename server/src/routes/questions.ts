import { Router } from 'express';
import { Question } from '../models/Question';
import { QuestionBank } from '../models/QuestionBank';

export function questionRoutes(
  questionBank: QuestionBank,
  onQuestionsChanged: () => void
): Router {
    const router = Router();

    // GET /api/question
    router.get('/', (_req, res) => {
        const questions = questionBank.getAllQuestions();

        res.json(
            questions.map(question => question.toJSON())
        );
    });

    // POST /api/questions
    router.post('/', (req, res) => {
        const { subject, statement, alternatives } = req.body ?? {};

        const question = new Question(
            subject,
            statement,
            alternatives
        );

        const addedQuestion = questionBank.addQuestion(
            question,
            onQuestionsChanged
        );

        res.status(201).json(addedQuestion.toJSON());
    });

    return router;
}


