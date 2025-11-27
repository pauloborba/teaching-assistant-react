import { Router, Request, Response } from 'express';
import { exams, studentsExams, StudentExam, triggerSaveStudentsExams, cleanCPF, questions } from '../services/dataService';

const router = Router();

/**
 * GET /api/v1/exams/:examId
 * Return exam details
 */
router.get('/v1/exams/:examId', (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const exam = exams.find(e => String((e as any).id) === examId || (e as any).title === examId);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

/**
 * GET /api/v1/exams/:examId/questions
 * Return question objects for an exam
 */
router.get('/v1/exams/:examId/questions', (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const exam = exams.find(e => String((e as any).id) === examId || (e as any).title === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const qIds: number[] = (exam as any).questions || [];
    const examQuestions = questions.filter(q => qIds.includes((q as any).id));
    res.json(examQuestions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam questions' });
  }
});

/**
 * GET /api/v1/exams/:examId/responses
 * Return responses submitted for an exam (teachers/professors)
 */
router.get('/v1/exams/:examId/responses', (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const auth = (req.headers.authorization || '') as string;

    // Basic auth-role handling (no real JWT parsing here): require token and restrict to professor-like tokens
    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = auth.split(' ')[1] || '';
    if (!token.toLowerCase().includes('prof') && !token.toLowerCase().includes('teacher')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const exam = exams.find(e => String((e as any).id) === examId || (e as any).title === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const examIdNum = (exam as any).id;
    const responses = studentsExams.filter(se => se.examId === examIdNum);
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

/**
 * POST /api/v1/exams/:examId/responses
 * Submit student responses for an exam
 */
router.post('/v1/exams/:examId/responses', (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const auth = (req.headers.authorization || '') as string;

    // Basic auth-role handling (no real JWT parsing here): require token and forbid professor role
    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = auth.split(' ')[1] || '';
    if (token.toLowerCase().includes('prof') || token.toLowerCase().includes('professor')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const exam = exams.find(e => String((e as any).id) === examId || (e as any).title === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Treat isValid=false as closed/expired
    if ((exam as any).isValid === false) {
      return res.status(410).json({ error: 'Exam submission period has ended.' });
    }

    const { studentCpf, answers } = req.body as { studentCpf?: string; answers?: any[] };

    if (!studentCpf || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid request payload' });
    }

    // Validate all answers present and non-empty
    const incomplete = answers.some(a => a.answer === null || a.answer === undefined || String(a.answer).trim() === '');
    if (incomplete) {
      return res.status(400).json({ message: 'Please answer all questions before submitting.' });
    }

    // Persist student exam
    const nextId = studentsExams.length > 0 ? Math.max(...studentsExams.map(se => se.id)) + 1 : 1;
    const studentExam: StudentExam = {
      id: nextId,
      studentCPF: cleanCPF(studentCpf),
      examId: (exam as any).id,
      answers
    };

    studentsExams.push(studentExam);
    triggerSaveStudentsExams();

    return res.status(201).json({ message: 'Response submitted successfully', data: studentExam });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit responses' });
  }
});

export default router;
