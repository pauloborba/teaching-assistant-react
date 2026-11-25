import { Router } from 'express';
import { Exam } from '../models/Exam';
import { ExamBank } from '../models/ExamBank';
import { notFound } from './HttpError';

export function examRoutes(
    examBank: ExamBank,
    onExamsChanged: () => void
): Router {
    const router = Router();

    // GET /api/exams
    // Consulta todas as provas cadastradas
    router.get('/', (_req, res) => {
        const exams = examBank.getAllExams();

        res.json(exams.map(exam => exam.toJSON()));
    });

    // POST /api/exams
    // Cadastra uma nova prova
    router.post('/', (req, res) => {
        const { name, questionCodes } = req.body ?? {};

        const exam = new Exam(name, questionCodes);
        
        const addedExam = examBank.addExam(
            exam,
            onExamsChanged
        );
        
        res.status(201).json(addedExam.toJSON());
    });

    // GET /api/exams/:code
    // Consulta uma prova específica
    router.get('/:code', (req, res) => {
        const { code } = req.params;
        
        const exam = examBank.findExamByCode(code);

        if (!exam) {
            throw notFound('Prova não encontrada');
        }

        const questions = examBank.getQuestionsForExam(code);
        const subjects = examBank.getSubjectsForExam(code);

        res.json({
            ...exam.toJSON(),
            questions: questions.map(question => question.toJSON()),
            subjects
        });
    });

    return router;
}