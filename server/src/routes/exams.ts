import { Router, Request, Response } from "express";
import {
  getStudentsWithExamsForClass,
  getExamsForClass,
  addExam,
  triggerSaveExams,
  generateStudentExams,
  questions,
} from "../services/dataService";

const router = Router();

/**
 * GET /api/exams/students
 * Get students with exam information for a specific class and exam
 * Query parameters:
 *   - classId: The class ID (required)
 *   - examId: The exam ID (optional - if not provided, returns all exams in class)
 */
router.get("/students", (req: Request, res: Response) => {
  try {
    const { classId, examId } = req.query;

    // Validate classId is provided
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({
        error: "classId is required and must be a string",
      });
    }

    // Convert examId to number if provided
    let examIdNum: number | undefined;
    if (examId) {
      examIdNum = parseInt(examId as string, 10);
      if (isNaN(examIdNum)) {
        return res.status(400).json({
          error: "examId must be a valid number",
        });
      }
    }

    // Get students with exam information
    const studentsWithExams = getStudentsWithExamsForClass(classId, examIdNum);

    if (studentsWithExams.length === 0) {
      return res.status(200).json({
        message: "No students found for the given class and exam criteria",
        classId: classId,
        examId: examIdNum || "all",
        total: 0,
        data: [],
      });
    }

    // Transform data to table format with all required fields
    const tableData = studentsWithExams.map(studentData => {
      // Get the exam definition to retrieve question details
      const examDef = getExamsForClass(classId).find(
        (e) => e.id === studentData.examId
      );

      if (!examDef) {
        return null;
      }

      // Get ONLY the questions selected for THIS student
      const examQuestions = studentData.answers
        .map((a: { questionId: number; answer: any; }) => {
          const q = questions.find((q) => q.id === a.questionId);
          if (!q) return null;

          return {
            idQuestion: q.id,
            tipoQuestao: q.type === "open" ? "Aberta" : "Fechada",
            textoPergunta: q.question,
            respostaAluno: a.answer, // opcional: devolve a resposta
          };
        })
        .filter(Boolean);

      // Return table row format
      return {
        studentName: studentData.studentName,
        examID: studentData.examId,
        qtdAberta: examDef.openQuestions,
        qtdFechada: examDef.closedQuestions,
        grade: studentData.grade !== undefined ? studentData.grade : "Não corrigido",
        ativo: "Sim",
        details: examQuestions,
      };
    }).filter(Boolean); // Remove null entries

    res.status(200).json({
      message: "Students with exam information retrieved successfully",
      classId: classId,
      examId: examIdNum || "all",
      total: tableData.length,
      data: tableData,
    });
  } catch (error) {
    console.error("Error fetching students with exams:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/exams/class/:classId
 * Get all exams for a specific class
 */
router.get("/class/:classId", (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    const exams = getExamsForClass(classId);

    if (exams.length === 0) {
      return res.status(404).json({
        message: "No exams found for the given class",
        classId: classId,
        data: [],
      });
    }

    res.status(200).json({
      message: "Exams retrieved successfully",
      classId: classId,
      total: exams.length,
      data: exams,
    });
  } catch (error) {
    console.error("Error fetching exams by class:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/exams/:examId/generate
 * Generate randomized student exams with different questions for each student
 * Query parameters:
 *   - classId: The class ID (required)
 */
router.post("/:examId/generate", (req: Request, res: Response) => {
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

    // Generate student exams
    const generatedExams = generateStudentExams(examIdNum, classId);

    res.status(201).json({
      message: "Student exams generated successfully",
      examId: examIdNum,
      classId: classId,
      totalGenerated: generatedExams.length,
      data: generatedExams,
    });
  } catch (error) {
    console.error("Error generating student exams:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/exams
 * Create a new exam
 * Body parameters:
 *   - codigoProva: Exam code/ID (required, must be unique)
 *   - nomeProva: Exam name (required)
 *   - classId: Class ID (required)
 *   - tema: Exam topic/theme (required)
 *   - quantidadeAberta: Number of open questions (required, non-negative integer)
 *   - quantidadeFechada: Number of closed questions (required, non-negative integer)
 */
router.post("/", (req: Request, res: Response) => {
  try {
    const {
      codigoProva,
      nomeProva,
      classId,
      tema,
      quantidadeAberta,
      quantidadeFechada,
    } = req.body;

    // Validate required fields
    if (!codigoProva || typeof codigoProva !== "string") {
      return res.status(400).json({
        error: "codigoProva is required and must be a string",
      });
    }

    if (!nomeProva || typeof nomeProva !== "string") {
      return res.status(400).json({
        error: "nomeProva is required and must be a string",
      });
    }

    if (!classId || typeof classId !== "string") {
      return res.status(400).json({
        error: "classId is required and must be a string",
      });
    }

    if (!tema || typeof tema !== "string") {
      return res.status(400).json({
        error: "tema is required and must be a string",
      });
    }

    // Validate question quantities
    if (
      quantidadeAberta === undefined ||
      !Number.isInteger(quantidadeAberta) ||
      quantidadeAberta < 0
    ) {
      return res.status(400).json({
        error: "quantidadeAberta is required and must be a non-negative integer",
      });
    }

    if (
      quantidadeFechada === undefined ||
      !Number.isInteger(quantidadeFechada) ||
      quantidadeFechada < 0
    ) {
      return res.status(400).json({
        error: "quantidadeFechada is required and must be a non-negative integer",
      });
    }

    // Validate that at least one question type is required
    if (quantidadeAberta === 0 && quantidadeFechada === 0) {
      return res.status(400).json({
        error: "At least one question is required (quantidadeAberta or quantidadeFechada must be > 0)",
      });
    }

    // Check if exam code already exists
    const allExams = getExamsForClass(classId);
    if (allExams.some((exam) => exam.id.toString() === codigoProva)) {
      return res.status(409).json({
        error: "An exam with this codigoProva already exists in this class",
      });
    }

    // Generate unique ID (using timestamp + random number if needed)
    const examId = parseInt(codigoProva, 10) || Date.now();

    // Get questions by topic (tema)
    const questionsByTopic = questions.filter(q => q.topic === tema);
    
    if (questionsByTopic.length === 0) {
      return res.status(400).json({
        error: `No questions found for topic: ${tema}`,
      });
    }

    // Check if we have enough questions for the required quantities
    const openQuestionsAvailable = questionsByTopic.filter(q => q.type === 'open').length;
    const closedQuestionsAvailable = questionsByTopic.filter(q => q.type === 'closed').length;

    if (openQuestionsAvailable < quantidadeAberta) {
      return res.status(400).json({
        error: `Not enough open questions for topic "${tema}". Required: ${quantidadeAberta}, Available: ${openQuestionsAvailable}`,
      });
    }

    if (closedQuestionsAvailable < quantidadeFechada) {
      return res.status(400).json({
        error: `Not enough closed questions for topic "${tema}". Required: ${quantidadeFechada}, Available: ${closedQuestionsAvailable}`,
      });
    }

    // Create new exam object with questions from the topic
    const newExam = {
      id: examId,
      classId: classId,
      title: nomeProva,
      isValid: true,
      openQuestions: quantidadeAberta,
      closedQuestions: quantidadeFechada,
      questions: questionsByTopic.map(q => q.id), // All question IDs from this topic
    };

    // Add exam to the system
    addExam(newExam);
    triggerSaveExams();

    res.status(201).json({
      message: "Exam created successfully",
      data: newExam,
    });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
