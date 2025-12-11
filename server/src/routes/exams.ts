import { Router, Request, Response } from "express";
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { Readable } from 'stream';

import {
  getStudentsWithExamsForClass,
  getExamsForClass,
  addExam,
  getNextExamId,
  triggerSaveExams,
  generateStudentExams,
  getQuestionById,
  addExamGeneration,
  getGenerationsForExam,
  ExamGenerationRecord,
  ExamVersionMap,
  shuffleArray,
  getQuestionsByIds,
  QuestionRecord,
  deleteExam,
  getExamById,
  examsManager,
  triggerSaveStudentsExams,
  getNextGenerationId,
  cleanCPF,
  addStudentExam,
  questions,
  classes,
} from "../services/dataService";
import { Correction } from "../models/Correction";

const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
};

const formatDateExtended = (dateString: string) => {
  if (!dateString) return '___ de _________________ de ______';

  try {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

const router = Router();

/**
 * Gera o documento PDF (Visual)
 */
const generateExamPDF = (
  className: string,
  teacherName: string,
  examTitle: string,
  versionNumber: number,
  questions: QuestionRecord[],
  isGabarito: boolean,
  dateString: string
): InstanceType<typeof PDFDocument> => {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  const FONT_REGULAR = 'Times-Roman';
  const FONT_BOLD = 'Times-Bold';

  doc.font(FONT_REGULAR);

  doc.fontSize(16);
  doc.text(className, { align: 'center' });
  doc.text(examTitle, { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(12);
  doc.text(teacherName, { align: 'center' });
  doc.text('Centro de Informática', { align: 'center' });
  doc.text('Universidade Federal de Pernambuco', { align: 'center' });
  doc.moveDown(0.5);

  doc.text(dateString, { align: 'center' });
  doc.moveDown(2);

  if (!isGabarito) {
    doc.font(FONT_BOLD).fontSize(11);
    doc.text(
      'Em cada questão fechada, marque as alternativas corretas com um "X". Todas as questões têm o mesmo peso.',
      { align: 'justify' }
    );
    doc.moveDown(2);
  } else {
    doc.font(FONT_BOLD).fontSize(14).text('GABARITO OFICIAL', { align: 'center', underline: true });
    doc.moveDown(2);
  }

  doc.font(FONT_REGULAR).fontSize(12);

  questions.forEach((q, index) => {
    if (doc.y > 650) doc.addPage();

    doc.font(FONT_BOLD).text(`Questão ${index + 1}.`, { continued: true });
    doc.font(FONT_REGULAR).text(` ${q.question}`, { align: 'justify' });
    doc.moveDown(0.5);

    if (q.type === 'closed' && q.options) {
      q.options.forEach((opt, idx) => {
        if (doc.y > 720) doc.addPage();

        const letra = String.fromCharCode(65 + idx);
        const isRight = isGabarito && opt.isCorrect;

        if (isRight) {
          doc.font(FONT_BOLD).text(`(X) ${letra}) ${opt.option}`);
          doc.font(FONT_REGULAR);
        } else {
          doc.text(`( ) ${letra}) ${opt.option}`);
        }
      });
      doc.moveDown(1.5);
    } else {
      if (isGabarito) {
        doc.font(FONT_BOLD).text('Resposta Esperada:', { underline: true });
        doc.font(FONT_REGULAR).text(q.answer || 'Sem resposta cadastrada.');
        doc.moveDown(1.5);
      } else {
        if (doc.y > 600) doc.addPage();

        doc.moveDown(0.5);
        doc.font(FONT_BOLD).text('Resposta:');
        doc.moveDown(0.2);

        const linhas = 5;
        for (let l = 0; l < linhas; l++) {
          doc.font(FONT_REGULAR).text('__________________________________________________________________________');
          doc.moveDown(0.3);
        }
        doc.moveDown(1.5);
      }
    }
  });

  if (!isGabarito) {
    if (doc.y > 700) doc.addPage();

    doc.moveDown(2);
    doc.font(FONT_BOLD).fontSize(12);
    doc.text('Aluno(a): _______________________________________________________________', { align: 'center' });
  }

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);

    const oldBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const bottom = doc.page.height - 30;
    const right = doc.page.width - 50;

    doc.font(FONT_REGULAR).fontSize(10);
    const text = `Tipo de Prova: ${versionNumber}`;
    const width = doc.widthOfString(text);

    doc.text(text, right - width, bottom, {
      lineBreak: false
    });

    doc.page.margins.bottom = oldBottomMargin;
  }

  return doc;
};

const createRandomizedVersion = (questionsPool: QuestionRecord[]): QuestionRecord[] => {
  const deepCopyQuestions: QuestionRecord[] = JSON.parse(JSON.stringify(questionsPool));
  
  const shuffledQuestions = shuffleArray(deepCopyQuestions);

  shuffledQuestions.forEach(q => {
    if (q.type === 'closed' && q.options && q.options.length > 0) {
      q.options = shuffleArray(q.options);
    }
  });

  return shuffledQuestions;
};

const mapVersionAnswers = (versionIndex: number, questions: QuestionRecord[]): ExamVersionMap => {
  return {
    versionNumber: versionIndex,
    questions: questions.map((q, idx) => {
      let rightAnswerLabel = '';
      
      if (q.type === 'closed' && q.options) {
        const indexCorreta = q.options.findIndex(opt => opt.isCorrect);
        const ASCII_OFFSET_A = 65; 
        rightAnswerLabel = indexCorreta >= 0 ? String.fromCharCode(ASCII_OFFSET_A + indexCorreta) : '?';
      } else {
        rightAnswerLabel = q.answer || 'Dissertativa';
      }

      return {
        numero: idx + 1,
        questionId: q.id,
        type: q.type,
        rightAnswer: rightAnswerLabel
      };
    })
  };
};

const handleGetExamZIP = async (req: Request, res: Response) => {
  try {
    const { id: examIdParam } = req.params;
    const { classId: targetClassId, date: examDate } = req.query;
    
    const MIN_COPIES = 1;
    const copiesRequested = parseInt(req.query.quantity as string, 10);
    const examDateString = examDate as string;

    if (isNaN(copiesRequested) || copiesRequested < MIN_COPIES) {
        return res.status(400).json({ error: 'Quantidade inválida.' });
    }
    if (!targetClassId || typeof targetClassId !== 'string') {
        return res.status(400).json({ error: 'classId é obrigatório.' });
    }

    if (examDateString && !isValidDate(examDateString)) {
        return res.status(400).json({ error: 'Data inválida. Use o formato YYYY-MM-DD.' });
    }

    const allExamsInClass = getExamsForClass(targetClassId);
    const examIdNumber = parseInt(examIdParam, 10);
    const examDefinition = allExamsInClass.find(e => e.id === examIdNumber);

    if (!examDefinition) return res.status(404).json({ error: 'Prova não encontrada.' });
    if (!examDefinition.questions || examDefinition.questions.length === 0) {
      return res.status(400).json({ error: 'Esta prova não possui questões vinculadas.' });
    }

    const INSTITUTION_NAME = "Engenharia de Software e Sistemas";
    const TEACHER_NAME = "Paulo Borba";
    const formattedDateString = formatDateExtended(examDate as string);

    const batchGenerationId = getNextGenerationId();
    const generationTimestamp = new Date();
    
    const newGenerationRecord: ExamGenerationRecord = {
      id: batchGenerationId,
      examId: examIdNumber,
      classId: targetClassId,
      timestamp: generationTimestamp.toISOString(),
      description: `Lote gerado em ${generationTimestamp.toLocaleString('pt-BR')} (${copiesRequested} provas)`,
      versions: []
    };

    const downloadFileName = `Lote_${batchGenerationId}_${examDefinition.title}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    const MAX_COMPRESSION_LEVEL = 9;
    const archive = archiver('zip', { zlib: { level: MAX_COMPRESSION_LEVEL } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    const originalQuestionsPool = getQuestionsByIds(examDefinition.questions);

    for (let currentVersionIndex = 1; currentVersionIndex <= copiesRequested; currentVersionIndex++) {

      const randomizedQuestions = createRandomizedVersion(originalQuestionsPool);

      const examPdfDoc = generateExamPDF(
        INSTITUTION_NAME,
        TEACHER_NAME,
        examDefinition.title,
        currentVersionIndex,
        randomizedQuestions,
        false, 
        formattedDateString
      );
      archive.append(examPdfDoc as unknown as Readable, { name: `Provas/Prova_Tipo_${currentVersionIndex}.pdf` });
      examPdfDoc.end();

      const answerKeyPdfDoc = generateExamPDF(
        INSTITUTION_NAME,
        TEACHER_NAME,
        examDefinition.title,
        currentVersionIndex,
        randomizedQuestions,
        true,
        formattedDateString
      );
      archive.append(answerKeyPdfDoc as unknown as Readable, { name: `Gabaritos/Gabarito_Tipo_${currentVersionIndex}.pdf` });
      answerKeyPdfDoc.end();

      const versionMapEntry = mapVersionAnswers(currentVersionIndex, randomizedQuestions);
      newGenerationRecord.versions.push(versionMapEntry);
    }

    addExamGeneration(newGenerationRecord);
    archive.finalize();

  } catch (error: any) {
    console.error('Erro na rota ZIP:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message || 'Erro interno.' });
  }
};

const handleGetGenerations = (req: Request, res: Response) => {
  const { id } = req.params;
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ error: 'classId required' });
  const generations = getGenerationsForExam(parseInt(id, 10), classId as string);
  generations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(generations);
};

const handleGetDataVersion = (req: Request, res: Response) => {
  const { id, versionNumber } = req.params;
  const { classId } = req.query;

  if (!classId) return res.status(400).json({ error: 'classId required' });

  const examIdNum = parseInt(id, 10);
  const versionNum = parseInt(versionNumber, 10);

  if (isNaN(examIdNum) || isNaN(versionNum)) {
    return res.status(400).json({ error: 'Invalid ID or version number' });
  }

  const generations = getGenerationsForExam(examIdNum, classId as string);

  if (generations.length === 0) {
    return res.status(404).json({ error: 'No generations found for this exam' });
  }

  // Sort by timestamp descending (newest first)
  generations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestGeneration = generations[0];

  const versionData = latestGeneration.versions.find(v => v.versionNumber === versionNum);

  if (!versionData) {
    return res.status(404).json({ error: 'Version not found in the latest generation' });
  }

  res.json({
    versionNumber: versionData.versionNumber,
    questions: versionData.questions
  });
};

router.get("/students", (req: Request, res: Response) => {
  try {
    const { classId, examId } = req.query;
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({ error: "classId is required and must be a string" });
    }

    let examIdNum: number | undefined;
    if (examId) {
      examIdNum = parseInt(examId as string, 10);
      if (isNaN(examIdNum)) {
        return res.status(400).json({ error: "examId must be a valid number" });
      }
    }

    const studentsWithExams = getStudentsWithExamsForClass(classId, examIdNum);

    if (studentsWithExams.length === 0) {
      return res.status(200).json({
        message: "No students found",
        classId: classId,
        examId: examIdNum || "all",
        total: 0,
        data: [],
      });
    }

    const tableData = studentsWithExams.map(studentData => {
      const examDef = getExamsForClass(classId).find(e => e.id === studentData.examId);
      if (!examDef) return null;

      const examQuestions = studentData.answers
        .map((a: { questionId: number; answer: any; }) => {
          const q = getQuestionById(a.questionId);
          if (!q) return null;
          return {
            idQuestion: q.id,
            tipoQuestao: q.type === "open" ? "Aberta" : "Fechada",
            textoPergunta: q.question,
            respostaAluno: a.answer,
          };
        })
        .filter(Boolean);

      const finalGrade = Correction.getGrade(studentData.studentCPF, studentData.examId);
      // Return table row format
      return {
        cpf: studentData.studentCPF,
        studentName: studentData.studentName,
        examID: studentData.examId,
        qtdAberta: examDef.openQuestions,
        qtdFechada: examDef.closedQuestions,
        grade_closed: finalGrade !== null ? finalGrade : "Não corrigido",
        ativo: "Sim",
        details: examQuestions,
      };
    }).filter(Boolean);

    res.status(200).json({
      message: "Success",
      classId: classId,
      examId: examIdNum || "all",
      total: tableData.length,
      data: tableData,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/class/:classId", (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const exams = getExamsForClass(classId);
    if (exams.length === 0) {
      return res.status(404).json({ message: "No exams found", classId, data: [] });
    }
    res.status(200).json({ message: "Success", classId, total: exams.length, data: exams });
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:examId/generate", (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { classId } = req.query;
    if (!examId) return res.status(400).json({ error: "examId required" });

    const examIdNum = parseInt(examId, 10);
    if (isNaN(examIdNum)) return res.status(400).json({ error: "Invalid examId" });
    if (!classId || typeof classId !== "string") return res.status(400).json({ error: "classId required" });

    const generatedExams = generateStudentExams(examIdNum, classId);
    res.status(201).json({ message: "Generated", examId: examIdNum, classId, totalGenerated: generatedExams.length, data: generatedExams });
  } catch (error) {
    console.error("Error generating:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/:id/zip', handleGetExamZIP);
router.get('/:id/generations', handleGetGenerations);
router.get('/:id/versions/:versionNumber', handleGetDataVersion);

/**
 * POST /api/exams
 * Create a new exam
 * Body parameters:
 *   - nomeProva: Exam name (required)
 *   - classId: Class ID (required)
 *   - quantidadeAberta: Number of open questions (required, non-negative integer)
 *   - quantidadeFechada: Number of closed questions (required, non-negative integer)
 *   - questionIds: Array of question IDs to include in the exam (required)
 */
const validateCreateExamPayload = (payload: any) => {
  const {
    nomeProva,
    classId,
    quantidadeAberta,
    quantidadeFechada,
    questionIds,
  } = payload;

  const errors: string[] = [];

  // Basic Type Validation
  if (!nomeProva || typeof nomeProva !== "string") errors.push("nomeProva is required and must be a string");
  if (!classId || typeof classId !== "string") errors.push("classId is required and must be a string");

  if (!classes.findClassById(classId)) {
    errors.push(`Turma ${classId} não encontrada`);
  }

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    errors.push("questionIds is required and must be a non-empty array");
  }

  if (quantidadeAberta === undefined || !Number.isInteger(quantidadeAberta) || quantidadeAberta < 0) {
    errors.push("quantidadeAberta is required and must be a non-negative integer");
  }

  if (quantidadeFechada === undefined || !Number.isInteger(quantidadeFechada) || quantidadeFechada < 0) {
    errors.push("quantidadeFechada is required and must be a non-negative integer");
  }

  if (errors.length > 0) return { isValid: false, errors };

  // Logic Validation
  if (quantidadeAberta === 0 && quantidadeFechada === 0) {
    return { isValid: false, errors: ["At least one question is required (quantidadeAberta or quantidadeFechada must be > 0)"] };
  }

  const questionsFound = getQuestionsByIds(questionIds);
  if (questionsFound.length !== questionIds.length) {
    return { isValid: false, errors: ["Some question IDs do not exist"] };
  }

  const openQuestionsProvided = questionsFound.filter((q: any) => q.type === 'open').length;
  const closedQuestionsProvided = questionsFound.filter((q: any) => q.type === 'closed').length;

  if (openQuestionsProvided < quantidadeAberta) {
    errors.push(`Not enough open questions in questionIds. Required: ${quantidadeAberta}, Provided: ${openQuestionsProvided}`);
  }

  if (closedQuestionsProvided < quantidadeFechada) {
    errors.push(`Not enough closed questions in questionIds. Required: ${quantidadeFechada}, Provided: ${closedQuestionsProvided}`);
  }

  return { isValid: errors.length === 0, errors };
};

router.post("/", (req: Request, res: Response) => {
  try {
    const validation = validateCreateExamPayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    const {
      nomeProva,
      classId,
      quantidadeAberta,
      quantidadeFechada,
      questionIds,
    } = req.body;

    // Generate sequential ID using nextId counter to prevent reuse
    const examId = getNextExamId();

    // Create new exam object
    const newExam = {
      id: examId,
      classId: classId,
      title: nomeProva,
      isValid: true,
      openQuestions: quantidadeAberta,
      closedQuestions: quantidadeFechada,
      questions: questionIds,
    };

    addExam(newExam);
    triggerSaveExams();

    res.status(201).json({ message: "Exam created", data: newExam });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/exams/:examId
 * Delete an exam from a class by its ID
 * Query parameters:
 *   - classId: The class ID (required) - validates the exam belongs to this class
 */
router.delete("/:examId", (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { classId } = req.query;

    // Validate examId
    if (!examId) {
      return res.status(400).json({
        error: "examId is required",
      });
    }

    const examIdNum = parseInt(examId, 10);
    if (isNaN(examIdNum)) {
      return res.status(400).json({
        error: "examId must be a valid number",
      });
    }

    // Validate classId
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({
        error: "classId is required and must be a string",
      });
    }

    // Check if exam exists
    const exam = getExamById(examIdNum);
    if (!exam) {
      return res.status(404).json({
        error: `Prova ${examIdNum} não encontrada`,
      });
    }

    // Verify the exam belongs to the specified class
    if (exam.classId !== classId) {
      return res.status(403).json({
        error: `Exam ${examIdNum} does not belong to class ${classId}`,
      });
    }

    // Delete the exam (this also deletes associated student exams)
    const deleted = deleteExam(examIdNum);

    if (!deleted) {
      return res.status(500).json({
        error: "Failed to delete exam",
      });
    }

    // Persist changes to both files
    triggerSaveExams();
    triggerSaveStudentsExams();

    res.status(200).json({
      message: "Exam deleted successfully",
      examId: examIdNum,
      classId: classId,
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get('/:examId', (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const examIdNum = parseInt(examId, 10);
    let exam: any | undefined;
    if (!isNaN(examIdNum)) {
      exam = examsManager.getExamById(examIdNum);
    }
    if (!exam) {
      // fallback: search by title
      exam = examsManager.getAllExams().find(e => e.title === examId || String(e.id) === examId);
    }

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
router.get('/:examId/questions', (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const examIdNum = parseInt(examId, 10);
    let exam: any | undefined;
    if (!isNaN(examIdNum)) {
      exam = examsManager.getExamById(examIdNum);
    }
    if (!exam) {
      exam = examsManager.getAllExams().find(e => e.title === examId || String(e.id) === examId);
    }
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
router.get('/:examId/responses', (req: Request, res: Response) => {
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

    const examIdNumParsed = parseInt(examId, 10);
    let exam: any | undefined;
    if (!isNaN(examIdNumParsed)) {
      exam = examsManager.getExamById(examIdNumParsed);
    }
    if (!exam) {
      exam = examsManager.getAllExams().find(e => e.title === examId || String(e.id) === examId);
    }
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const examIdNum = (exam as any).id;
    const allStudentExams = examsManager.getAllStudentExams ? examsManager.getAllStudentExams() : [];
    const responses = allStudentExams.filter((se: any) => se.examId === examIdNum);
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

/**
 * POST /api/v1/exams/:examId/responses
 * Submit student responses for an exam
 */
router.post('/:examId/responses', (req: Request, res: Response) => {
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

    const examIdNumParsed = parseInt(examId, 10);
    let exam: any | undefined;
    if (!isNaN(examIdNumParsed)) {
      exam = examsManager.getExamById(examIdNumParsed);
    }
    if (!exam) {
      exam = examsManager.getAllExams().find(e => e.title === examId || String(e.id) === examId);
    }
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

    // Persist student exam using examsManager helpers
    const allStudentExams = examsManager.getAllStudentExams ? examsManager.getAllStudentExams() : [];
    const nextId = allStudentExams.length > 0 ? Math.max(...allStudentExams.map((se: any) => se.id)) + 1 : 1;

    const studentExam = {
      id: nextId,
      studentCPF: cleanCPF(studentCpf),
      examId: (exam as any).id,
      answers,
    };

    try {
      addStudentExam(studentExam as any);
      triggerSaveStudentsExams();

      return res.status(201).json({ message: 'Response submitted successfully', data: studentExam });
    } catch (err) {
      if (err instanceof Error && err.message === 'StudentAlreadySubmitted') {
        return res.status(409).json({ message: 'Você já respondeu essa prova' });
      }
      console.error('Error submitting responses:', err);
      return res.status(500).json({ error: 'Failed to submit responses' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit responses' });
  }
});

export default router;
